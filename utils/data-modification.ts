// utils/data-modification.ts
import { Client, Worker, Task } from './data-validation';
import { DataState } from '@/contexts/DataContext';

export interface ModificationOperation {
  action: 'update' | 'add' | 'delete';
  target: {
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    type: 'existing' | 'new';
  };
  changes?: Record<string, any>;
  reason: string;
  affectedCount: string;
}

export interface DataModificationPlan {
  isValid: boolean;
  modificationType: 'update' | 'add' | 'delete' | 'bulk_update' | 'conditional_update';
  entity: 'clients' | 'workers' | 'tasks';
  operations: ModificationOperation[];
  validation: {
    errors: string[];
    warnings: string[];
    confidence: 'high' | 'medium' | 'low';
    suggestedReview: boolean;
  };
  summary: {
    description: string;
    totalAffected: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  explanation: string;
}

export interface ModificationResult {
  success: boolean;
  modifiedData: {
    clients?: Client[];
    workers?: Worker[];
    tasks?: Task[];
  };
  changes: {
    added: number;
    updated: number;
    deleted: number;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Execute a data modification plan on the provided data
 */
export function executeDataModification(
  plan: DataModificationPlan,
  currentData: DataState
): ModificationResult {
  const result: ModificationResult = {
    success: false,
    modifiedData: {},
    changes: { added: 0, updated: 0, deleted: 0 },
    errors: [],
    warnings: []
  };

  if (!plan.isValid) {
    result.errors.push('Modification plan is not valid');
    return result;
  }

  try {
    // Get the appropriate data array
    let dataArray: any[];
    switch (plan.entity) {
      case 'clients':
        dataArray = [...currentData.clients];
        break;
      case 'workers':
        dataArray = [...currentData.workers];
        break;
      case 'tasks':
        dataArray = [...currentData.tasks];
        break;
      default:
        result.errors.push(`Unknown entity: ${plan.entity}`);
        return result;
    }

    // Execute each operation
    for (const operation of plan.operations) {
      try {
        switch (operation.action) {
          case 'add':
            const newRecord = createNewRecord(plan.entity, operation.changes || {});
            if (newRecord) {
              dataArray.push(newRecord);
              result.changes.added++;
            }
            break;

          case 'update':
            const updatedCount = updateRecords(dataArray, operation);
            result.changes.updated += updatedCount;
            break;

          case 'delete':
            const deletedCount = deleteRecords(dataArray, operation);
            result.changes.deleted += deletedCount;
            // Remove deleted records from array
            for (let i = dataArray.length - 1; i >= 0; i--) {
              if (matchesFilters(dataArray[i], operation.target.filters || [])) {
                dataArray.splice(i, 1);
              }
            }
            break;
        }
      } catch (opError) {
        result.errors.push(`Operation failed: ${opError}`);
      }
    }

    // Set the modified data
    result.modifiedData[plan.entity] = dataArray;
    result.success = result.errors.length === 0;

    // Add warnings from the plan
    result.warnings = [...plan.validation.warnings];

  } catch (error) {
    result.errors.push(`Execution failed: ${error}`);
  }

  return result;
}

/**
 * Create a new record for the specified entity
 */
function createNewRecord(entity: string, changes: Record<string, any>): any {
  const baseRecord = getBaseRecord(entity);
  return { ...baseRecord, ...changes };
}

/**
 * Get base/default record structure for entity
 */
function getBaseRecord(entity: string): any {
  switch (entity) {
    case 'clients':
      return {
        ClientID: generateId('client'),
        ClientName: '',
        PriorityLevel: 1,
        RequestedTaskIDs: '',
        GroupTag: '',
        AttributesJSON: '{}'
      };
    case 'workers':
      return {
        WorkerID: generateId('worker'),
        WorkerName: '',
        Skills: '',
        AvailableSlots: '',
        MaxLoadPerPhase: 1,
        WorkerGroup: '',
        QualificationLevel: 1
      };
    case 'tasks':
      return {
        TaskID: generateId('task'),
        TaskName: '',
        Category: '',
        Duration: 1,
        RequiredSkills: '',
        PreferredPhases: '',
        MaxConcurrent: 1
      };
    default:
      return {};
  }
}

/**
 * Generate a unique ID for new records
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Update records that match the operation criteria
 */
function updateRecords(dataArray: any[], operation: ModificationOperation): number {
  let count = 0;
  
  for (const record of dataArray) {
    if (matchesFilters(record, operation.target.filters || [])) {
      // Apply changes
      Object.assign(record, operation.changes || {});
      count++;
    }
  }
  
  return count;
}

/**
 * Count records that would be deleted (for tracking)
 */
function deleteRecords(dataArray: any[], operation: ModificationOperation): number {
  let count = 0;
  
  for (const record of dataArray) {
    if (matchesFilters(record, operation.target.filters || [])) {
      count++;
    }
  }
  
  return count;
}

/**
 * Check if a record matches the provided filters
 */
function matchesFilters(record: any, filters: Array<{ field: string; operator: string; value: any }>): boolean {
  return filters.every(filter => {
    const fieldValue = record[filter.field];
    
    switch (filter.operator) {
      case '=':
        return fieldValue == filter.value;
      case '!=':
        return fieldValue != filter.value;
      case '>':
        return Number(fieldValue) > Number(filter.value);
      case '>=':
        return Number(fieldValue) >= Number(filter.value);
      case '<':
        return Number(fieldValue) < Number(filter.value);
      case '<=':
        return Number(fieldValue) <= Number(filter.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'includes':
        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'hasAny':
        const recordItems = String(fieldValue).split(',').map(s => s.trim());
        const filterItems = String(filter.value).split(',').map(s => s.trim());
        return filterItems.some(item => recordItems.includes(item));
      case 'hasAll':
        const recordItems2 = String(fieldValue).split(',').map(s => s.trim());
        const filterItems2 = String(filter.value).split(',').map(s => s.trim());
        return filterItems2.every(item => recordItems2.includes(item));
      default:
        return false;
    }
  });
}

/**
 * Validate a modification plan before execution
 */
export function validateModificationPlan(plan: DataModificationPlan, currentData: DataState): string[] {
  const errors: string[] = [];

  if (!plan.isValid) {
    errors.push('Plan is marked as invalid');
  }

  // Validate entity exists
  if (!['clients', 'workers', 'tasks'].includes(plan.entity)) {
    errors.push(`Invalid entity: ${plan.entity}`);
  }

  // Validate operations
  for (const operation of plan.operations) {
    if (!['add', 'update', 'delete'].includes(operation.action)) {
      errors.push(`Invalid action: ${operation.action}`);
    }

    // Validate field names exist in schema
    if (operation.changes) {
      const validFields = getValidFields(plan.entity);
      for (const field of Object.keys(operation.changes)) {
        if (!validFields.includes(field)) {
          errors.push(`Invalid field for ${plan.entity}: ${field}`);
        }
      }
    }
  }

  return errors;
}

/**
 * Get valid field names for an entity
 */
function getValidFields(entity: string): string[] {
  switch (entity) {
    case 'clients':
      return ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
    case 'workers':
      return ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
    case 'tasks':
      return ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];
    default:
      return [];
  }
}

/**
 * Preview what would be affected by a modification plan without executing it
 */
export function previewModification(plan: DataModificationPlan, currentData: DataState): {
  entity: string;
  estimatedChanges: { added: number; updated: number; deleted: number };
  affectedRecords: any[];
  warnings: string[];
} {
  const preview = {
    entity: plan.entity,
    estimatedChanges: { added: 0, updated: 0, deleted: 0 },
    affectedRecords: [] as any[],
    warnings: [] as string[]
  };

  // Get the appropriate data array
  let dataArray: any[];
  switch (plan.entity) {
    case 'clients':
      dataArray = currentData.clients;
      break;
    case 'workers':
      dataArray = currentData.workers;
      break;
    case 'tasks':
      dataArray = currentData.tasks;
      break;
    default:
      return preview;
  }

  // Analyze each operation
  for (const operation of plan.operations) {
    switch (operation.action) {
      case 'add':
        preview.estimatedChanges.added++;
        break;

      case 'update':
      case 'delete':
        const affected = dataArray.filter(record => 
          matchesFilters(record, operation.target.filters || [])
        );
        
        if (operation.action === 'update') {
          preview.estimatedChanges.updated += affected.length;
        } else {
          preview.estimatedChanges.deleted += affected.length;
        }
        
        preview.affectedRecords.push(...affected);
        break;
    }
  }

  // Add warnings for high-impact operations
  const totalRecords = dataArray.length;
  const totalAffected = preview.estimatedChanges.updated + preview.estimatedChanges.deleted;
  
  if (totalAffected > totalRecords * 0.5) {
    preview.warnings.push(`This operation will affect ${totalAffected} out of ${totalRecords} records (>${Math.round(totalAffected/totalRecords*100)}%)`);
  }
  
  if (preview.estimatedChanges.deleted > 0) {
    preview.warnings.push(`${preview.estimatedChanges.deleted} records will be permanently deleted`);
  }

  return preview;
}
