// utils/validation.ts

export interface ValidationError {
  type: string;
  message: string;
  row?: number;
  column?: string;
  severity: 'error' | 'warning';
  entity?: string;
  value?: any;
  suggestion?: string;
  suggestedValue?: any;
}

export interface ValidationFix {
  type: string;
  message: string;
  entity: string;
  row: number;
  column: string;
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  fixes: ValidationFix[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalErrors: number;
    entityCounts: {
      clients: number;
      workers: number;
      tasks: number;
    };
  };
}

export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string;
  GroupTag: string;
  AttributesJSON: string;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string;
  AvailableSlots: string;
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: number;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string;
  PreferredPhases: string;
  MaxConcurrent: number;
}

export interface DataSet {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
}

export class AdvancedValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private fixes: ValidationFix[]=[];
  
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  private addError(error: Omit<ValidationError, 'severity'>): void {
    this.errors.push({ ...error, severity: 'error' });
  }

  private addWarning(warning: Omit<ValidationError, 'severity'>): void {
    this.warnings.push({ ...warning, severity: 'warning' });
  }

  private addFix(fix: ValidationFix): void {
    this.fixes.push(fix);
  }

  private parseArray(value: string, fieldName: string, row: number, entity: string): number[] {
    if (!value || value.trim() === '') return [];
    
    try {
      // Handle different array formats: [1,2,3], "1,2,3", "1-3"
      let cleanValue = value.trim();
      
      // Remove brackets if present
      if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
        cleanValue = cleanValue.slice(1, -1);
      }
      
      // Handle range format (e.g., "1-3")
      if (cleanValue.includes('-') && !cleanValue.includes(',')) {
        const parts = cleanValue.split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0].trim());
          const end = parseInt(parts[1].trim());
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          }
        }
      }
      
      // Handle comma-separated values
      return cleanValue.split(',')
        .map(item => {
          const num = parseInt(item.trim());
          if (isNaN(num)) {
            this.addError({
              type: 'malformed_array',
              message: `Invalid number "${item.trim()}" in ${fieldName}`,
              row,
              column: fieldName,
              entity,
              value: item.trim(),
              suggestion: 'Use only numbers separated by commas or ranges like "1-3"'
            });
            return NaN; // Skip invalid numbers
          }
          return num;
        })
        .filter(num => !isNaN(num));
    } catch (error) {
      this.addError({
        type: 'malformed_array',
        message: `Cannot parse ${fieldName}: ${value}`,
        row,
        column: fieldName,
        entity,
        value,
        suggestion: 'Use format like [1,2,3] or "1,2,3" or "1-3"'
      });
      return [];
    }
  }

  private parseSkills(value: string): string[] {
    if (!value || value.trim() === '') return [];
    return value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }

  private validateJSON(jsonString: string, row: number, entity: string): boolean {
    if (!jsonString || jsonString.trim() === '') return true;
    
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      this.addError({
        type: 'invalid_json',
        message: 'Invalid JSON format in AttributesJSON',
        row,
        column: 'AttributesJSON',
        entity,
        value: jsonString,
        suggestion: 'Ensure JSON is properly formatted with quotes around keys and values'
      });
      return false;
    }
  }

  // Core Validation Methods
  private validateRequiredFields(data: DataSet): void {
    // Validate clients
    data.clients.forEach((client, index) => {
      if (!client.ClientID?.trim()) {
        this.addError({
          type: 'missing_required',
          message: 'ClientID is required',
          row: index,
          column: 'ClientID',
          entity: 'clients',
          suggestion: 'Provide a unique identifier for each client'
        });
      }
      if (!client.ClientName?.trim()) {
        this.addWarning({
          type: 'missing_optional',
          message: 'ClientName is empty',
          row: index,
          column: 'ClientName',
          entity: 'clients'
        });
      }
    });

    // Validate workers
    data.workers.forEach((worker, index) => {
      if (!worker.WorkerID?.trim()) {
        this.addError({
          type: 'missing_required',
          message: 'WorkerID is required',
          row: index,
          column: 'WorkerID',
          entity: 'workers',
          suggestion: 'Provide a unique identifier for each worker'
        });
      }
      if (!worker.WorkerName?.trim()) {
        this.addWarning({
          type: 'missing_optional',
          message: 'WorkerName is empty',
          row: index,
          column: 'WorkerName',
          entity: 'workers'
        });
      }
    });

    // Validate tasks
    data.tasks.forEach((task, index) => {
      if (!task.TaskID?.trim()) {
        this.addError({
          type: 'missing_required',
          message: 'TaskID is required',
          row: index,
          column: 'TaskID',
          entity: 'tasks',
          suggestion: 'Provide a unique identifier for each task'
        });
      }
      if (!task.TaskName?.trim()) {
        this.addWarning({
          type: 'missing_optional',
          message: 'TaskName is empty',
          row: index,
          column: 'TaskName',
          entity: 'tasks'
        });
      }
    });
  }

  private validateDuplicateIDs(data: DataSet): void {
    // Check duplicate ClientIDs
    const clientIds = new Map<string, number[]>();
    data.clients.forEach((client, index) => {
      if (client.ClientID) {
        if (!clientIds.has(client.ClientID)) {
          clientIds.set(client.ClientID, []);
        }
        clientIds.get(client.ClientID)!.push(index);
      }
    });

    clientIds.forEach((indices, id) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          this.addError({
            type: 'duplicate_id',
            message: `Duplicate ClientID: ${id}`,
            row: index,
            column: 'ClientID',
            entity: 'clients',
            value: id,
            suggestion: 'Each ClientID must be unique across all clients'
          });
        });
      }
    });

    // Check duplicate WorkerIDs
    const workerIds = new Map<string, number[]>();
    data.workers.forEach((worker, index) => {
      if (worker.WorkerID) {
        if (!workerIds.has(worker.WorkerID)) {
          workerIds.set(worker.WorkerID, []);
        }
        workerIds.get(worker.WorkerID)!.push(index);
      }
    });

    workerIds.forEach((indices, id) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          this.addError({
            type: 'duplicate_id',
            message: `Duplicate WorkerID: ${id}`,
            row: index,
            column: 'WorkerID',
            entity: 'workers',
            value: id,
            suggestion: 'Each WorkerID must be unique across all workers'
          });
        });
      }
    });

    // Check duplicate TaskIDs
    const taskIds = new Map<string, number[]>();
    data.tasks.forEach((task, index) => {
      if (task.TaskID) {
        if (!taskIds.has(task.TaskID)) {
          taskIds.set(task.TaskID, []);
        }
        taskIds.get(task.TaskID)!.push(index);
      }
    });

    taskIds.forEach((indices, id) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          this.addError({
            type: 'duplicate_id',
            message: `Duplicate TaskID: ${id}`,
            row: index,
            column: 'TaskID',
            entity: 'tasks',
            value: id,
            suggestion: 'Each TaskID must be unique across all tasks'
          });
        });
      }
    });
  }

  private validateRangeValues(data: DataSet): void {
    // Validate client priority levels
    data.clients.forEach((client, index) => {
      if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        this.addError({
          type: 'out_of_range',
          message: 'PriorityLevel must be between 1-5',
          row: index,
          column: 'PriorityLevel',
          entity: 'clients',
          value: client.PriorityLevel,
          suggestion: 'Use values 1 (lowest) to 5 (highest priority)',
          suggestedValue: client.PriorityLevel > 5 ? 5 : 1
        });
        this.addFix({
          type: 'range',
          message: `PriorityLevel value adjusted to ${client.PriorityLevel > 5 ? 5 : 1}`,
          row: index,
          column: 'PriorityLevel',
          entity: 'clients',
          value: client.PriorityLevel > 5 ? 5 : 1,
        });
      }
    });


    // Validate task durations
    data.tasks.forEach((task, index) => {
      if (task.Duration < 1) {
        this.addError({
          type: 'out_of_range',
          message: 'Duration must be >= 1',
          row: index,
          column: 'Duration',
          entity: 'tasks',
          value: task.Duration,
          suggestion: 'Duration represents number of phases and must be at least 1',
          suggestedValue: 1
        });
        this.addFix({
          type: 'range',
          message: `Duration value adjusted to 1`,
          row: index,
          column: 'Duration',
          entity: 'tasks',
          value: 1,
        });
      }
      if (task.Duration > 10) {
        this.addWarning({
          type: 'unusual_value',
          message: 'Duration seems unusually high',
          row: index,
          column: 'Duration',
          entity: 'tasks',
          value: task.Duration
        });
      }
    });

    // Validate worker max load per phase
    data.workers.forEach((worker, index) => {
      if (worker.MaxLoadPerPhase < 1) {
        this.addError({
          type: 'out_of_range',
          message: 'MaxLoadPerPhase must be >= 1',
          row: index,
          column: 'MaxLoadPerPhase',
          entity: 'workers',
          value: worker.MaxLoadPerPhase,
          suggestion: 'Each worker must be able to handle at least 1 task per phase',
          suggestedValue: 1
        });
        this.addFix({
          type: 'range',
          message: `MaxLoadPerPhase value adjusted to 1`,
          row: index,
          column: 'MaxLoadPerPhase',
          entity: 'workers',
          value: 1,
        });
      }
      if (worker.MaxLoadPerPhase > 20) {
        this.addWarning({
          type: 'unusual_value',
          message: 'MaxLoadPerPhase seems unusually high',
          row: index,
          column: 'MaxLoadPerPhase',
          entity: 'workers',
          value: worker.MaxLoadPerPhase
        });
      }
    });
  }

  private validateMalformedLists(data: DataSet): void {
     data.workers.forEach((worker, index) => {
    const originalValue = worker.AvailableSlots;
    const parsed = this.parseArray(originalValue, 'AvailableSlots', index, 'workers');
    const cleanedString = parsed.join(',');

    // Normalize input (remove brackets and whitespace)
    let normalizedOriginal = originalValue?.trim() ?? '';
    if (normalizedOriginal.startsWith('[') && normalizedOriginal.endsWith(']')) {
      normalizedOriginal = normalizedOriginal.slice(1, -1);
    }

    normalizedOriginal = normalizedOriginal.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .join(',');

    // If cleaned version differs from original input
    if (normalizedOriginal !== cleanedString) {
      this.addFix({
        type: 'malformed_array',
        message: `Cleaned malformed AvailableSlots: "${originalValue}" → "${cleanedString}"`,
        entity: 'workers',
        row: index,
        column: 'AvailableSlots',
        value: '[' +parsed.join(',') + ']',
      });
    }
  });

    data.tasks.forEach((task, index) => {
      task.PreferredPhases =  '[' +this.parseArray(task.PreferredPhases, 'PreferredPhases', index, 'tasks').toString() + ']';
    });
  }

  private validateJSONFile(data: DataSet): void {
    data.clients.forEach((client, index) => {
      this.validateJSON(client.AttributesJSON, index, 'clients');
    });
  }

  private validateReferences(data: DataSet): void {
    const taskIds = new Set(data.tasks.map(task => task.TaskID));
    
    // Validate client requested task IDs
    data.clients.forEach((client, index) => {
      if (client.RequestedTaskIDs) {
        const requestedIds = client.RequestedTaskIDs.split(',').map(id => id.trim());
        requestedIds.forEach(taskId => {
          if (taskId && !taskIds.has(taskId)) {
            this.addError({
              type: 'unknown_reference',
              message: `Requested TaskID "${taskId}" does not exist`,
              row: index,
              column: 'RequestedTaskIDs',
              entity: 'clients',
              value: taskId,
              suggestion: 'Ensure all requested TaskIDs exist in the tasks dataset',
              suggestedValue: requestedIds.filter(id => taskIds.has(id)).join(', ')
            });
          }
        });
      }
    });
  }

  private validateSkillCoverage(data: DataSet): void {
    const allWorkerSkills = new Set<string>();
    
    // Collect all worker skills
    data.workers.forEach(worker => {
      const skills = this.parseSkills(worker.Skills);
      skills.forEach(skill => allWorkerSkills.add(skill.toLowerCase()));
    });

    // Check if all required skills are covered
    data.tasks.forEach((task, index) => {
      const requiredSkills = this.parseSkills(task.RequiredSkills);
      requiredSkills.forEach(skill => {
        if (!allWorkerSkills.has(skill.toLowerCase())) {
          this.addError({
            type: 'skill_coverage',
            message: `Required skill "${skill}" is not available in any worker`,
            row: index,
            column: 'RequiredSkills',
            entity: 'tasks',
            value: skill,
            suggestion: 'Add this skill to at least one worker or remove from task requirements'
          });
        }
      });
    });
  }

  private validateWorkerOverload(data: DataSet): void {
    data.workers.forEach((worker, index) => {
      const availableSlots = this.parseArray(worker.AvailableSlots, 'AvailableSlots', index, 'workers');
      
      if (availableSlots.length < worker.MaxLoadPerPhase && availableSlots.length > 0) {
        this.addError({
          type: 'worker_overload',
          message: `Worker has ${availableSlots.length} available slots but MaxLoadPerPhase is ${worker.MaxLoadPerPhase}`,
          row: index,
          column: 'MaxLoadPerPhase',
          entity: 'workers',
          value: worker.MaxLoadPerPhase,
          suggestion: `Reduce MaxLoadPerPhase to ${availableSlots.length} or increase available slots`,
          suggestedValue: availableSlots.length
        });
        this.addFix({
          type: 'range',
          message: `MaxLoadPerPhase value adjusted to ${availableSlots.length}`,
          row: index,
          column: 'MaxLoadPerPhase',
          entity: 'workers',
          value: availableSlots.length,
        });
      }
    });
  }

  private validateMaxConcurrency(data: DataSet): void {
    data.tasks.forEach((task, index) => {
      const requiredSkills = this.parseSkills(task.RequiredSkills);
      
      // Count qualified workers for this task
      const qualifiedWorkers = data.workers.filter(worker => {
        const workerSkills = this.parseSkills(worker.Skills);
        return requiredSkills.every(reqSkill => 
          workerSkills.some(workerSkill => 
            workerSkill.toLowerCase() === reqSkill.toLowerCase()
          )
        );
      });

      if (task.MaxConcurrent > qualifiedWorkers.length) {
        this.addError({
          type: 'max_concurrency_infeasible',
          message: `MaxConcurrent (${task.MaxConcurrent}) exceeds qualified workers (${qualifiedWorkers.length})`,
          row: index,
          column: 'MaxConcurrent',
          entity: 'tasks',
          value: task.MaxConcurrent,
          suggestion: `Reduce MaxConcurrent to ${qualifiedWorkers.length} or add more qualified workers`,
          suggestedValue: qualifiedWorkers.length
        });
        this.addFix({
          type: 'range',
          message: `MaxConcurrent value adjusted to ${qualifiedWorkers.length}`,
          row: index,
          column: 'MaxConcurrent',
          entity: 'tasks',
          value: qualifiedWorkers.length,
        });
      }
    });
  }
  private validatePhaseSlotSaturation(data: DataSet): void {
    // Phase-slot saturation: sum of task durations per Phase ≤ total worker slots (as per PDF requirement)
    const phaseCapacity = new Map<number, number>();
    const phaseDemand = new Map<number, number>();

    // Calculate total worker slots per phase
    data.workers.forEach(worker => {
      const availableSlots = this.parseArray(worker.AvailableSlots, 'AvailableSlots', -1, 'workers');
      availableSlots.forEach(phase => {
        phaseCapacity.set(phase, (phaseCapacity.get(phase) || 0) + worker.MaxLoadPerPhase);
      });
    });

    // Calculate demand per phase from tasks
    data.tasks.forEach((task, index) => {
      const preferredPhases = this.parseArray(task.PreferredPhases, 'PreferredPhases', index, 'tasks');
      if (preferredPhases.length === 0) {
        // If no preferred phases, assume it could run in any phase that has capacity
        Array.from(phaseCapacity.keys()).forEach(phase => {
          phaseDemand.set(phase, (phaseDemand.get(phase) || 0) + task.Duration);
        });
      } else {
        preferredPhases.forEach(phase => {
          phaseDemand.set(phase, (phaseDemand.get(phase) || 0) + task.Duration);
        });
      }
    });

    // Check for phase saturation
    phaseDemand.forEach((demand, phase) => {
      const capacity = phaseCapacity.get(phase) || 0;
      if (demand > capacity) {
        this.addError({
          type: 'phase_slot_saturation',
          message: `Phase ${phase} is oversaturated: demand (${demand}) exceeds capacity (${capacity})`,
          entity: 'general',
          value: { phase, demand, capacity },
          suggestion: `Add more workers to phase ${phase} or reduce task durations for this phase`
        });
      }
    });
  }


  private validatePhaseConsistency(data: DataSet): void {
    const allPhases = new Set<number>();
    
    // Collect all phases from workers and tasks
    data.workers.forEach(worker => {
      const slots = this.parseArray(worker.AvailableSlots, 'AvailableSlots', -1, 'workers');
      slots.forEach(phase => allPhases.add(phase));
    });

    data.tasks.forEach(task => {
      const phases = this.parseArray(task.PreferredPhases, 'PreferredPhases', -1, 'tasks');
      phases.forEach(phase => allPhases.add(phase));
    });

    // Validate phase ranges
    const sortedPhases = Array.from(allPhases).sort((a, b) => a - b);
    if (sortedPhases.length > 0) {
      const minPhase = sortedPhases[0];
      const maxPhase = sortedPhases[sortedPhases.length - 1];
      
      if (minPhase < 1) {
        this.addWarning({
          type: 'phase_range',
          message: `Phases should typically start from 1, found phase ${minPhase}`,
          entity: 'general'
        });
      }
      
      if (maxPhase > 20) {
        this.addWarning({
          type: 'phase_range',
          message: `Very high phase number detected: ${maxPhase}. Consider reviewing phase numbering.`,
          entity: 'general'
        });
      }
    }
  }

  private validateBusinessLogic(data: DataSet): void {
    // Check for tasks with no preferred phases
    data.tasks.forEach((task, index) => {
      const preferredPhases = this.parseArray(task.PreferredPhases, 'PreferredPhases', index, 'tasks');
      if (preferredPhases.length === 0 && task.PreferredPhases?.trim()) {
        this.addWarning({
          type: 'no_preferred_phases',
          message: 'Task has no valid preferred phases',
          row: index,
          column: 'PreferredPhases',
          entity: 'tasks',
          suggestion: 'Consider specifying preferred phases or leave empty for any phase'
        });
      }
    });

    // Check for workers with no skills
    data.workers.forEach((worker, index) => {
      const skills = this.parseSkills(worker.Skills);
      if (skills.length === 0) {
        this.addWarning({
          type: 'no_skills',
          message: 'Worker has no skills listed',
          row: index,
          column: 'Skills',
          entity: 'workers',
          suggestion: 'Add relevant skills to enable task assignment'
        });
      }
    });

    // Check for clients with no requested tasks
    data.clients.forEach((client, index) => {
      if (!client.RequestedTaskIDs?.trim()) {
        this.addWarning({
          type: 'no_requested_tasks',
          message: 'Client has no requested tasks',
          row: index,
          column: 'RequestedTaskIDs',
          entity: 'clients',
          suggestion: 'Specify tasks this client needs completed'
        });
      }
    });
  }

  public validate(data: DataSet): ValidationResult {
    // Reset errors and warnings
    this.errors = [];
    this.warnings = [];

    // Run all validation checks
    this.validateRequiredFields(data);
    this.validateDuplicateIDs(data);
    this.validateRangeValues(data);
    this.validateMalformedLists(data);
    this.validateJSONFile(data);
    this.validateReferences(data);
    this.validateSkillCoverage(data);
    this.validateWorkerOverload(data);
    this.validateMaxConcurrency(data);
    this.validatePhaseSlotSaturation(data);  
    this.validatePhaseConsistency(data);
    this.validateBusinessLogic(data);

    const allErrors = [...this.errors, ...this.warnings];
    const criticalErrors = this.errors.filter(e => 
      ['missing_required', 'duplicate_id', 'unknown_reference', 'skill_coverage'].includes(e.type)
    ).length;

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      fixes: this.fixes,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        criticalErrors,
        entityCounts: {
          clients: data.clients.length,
          workers: data.workers.length,
          tasks: data.tasks.length
        }
      }
    };
  }

  // Utility method to get validation suggestions
  public getValidationSuggestions(data: DataSet): string[] {
    const suggestions: string[] = [];
    
    if (data.clients.length === 0) {
      suggestions.push("Upload client data to define who needs work done");
    }
    if (data.workers.length === 0) {
      suggestions.push("Upload worker data to define available resources");
    }
    if (data.tasks.length === 0) {
      suggestions.push("Upload task data to define work requirements");
    }
    
    // Add more contextual suggestions based on data patterns
    const hasHighPriorityClients = data.clients.some(c => c.PriorityLevel >= 4);
    const hasLowCapacityWorkers = data.workers.some(w => w.MaxLoadPerPhase <= 1);
    
    if (hasHighPriorityClients && hasLowCapacityWorkers) {
      suggestions.push("Consider increasing worker capacity for high-priority client demands");
    }
    
    return suggestions;
  }
}

// Export convenience function
export function validateDataSet(data: DataSet): ValidationResult {
  const validator = new AdvancedValidator();
  return validator.validate(data);
}

// Export function to validate individual entity types
export function validateClients(clients: Client[]): ValidationError[] {
  const validator = new AdvancedValidator();
  const result = validator.validate({ clients, workers: [], tasks: [] });
  return result.errors.filter(e => e.entity === 'clients');
}

export function validateWorkers(workers: Worker[]): ValidationError[] {
  const validator = new AdvancedValidator();
  const result = validator.validate({ clients: [], workers, tasks: [] });
  return result.errors.filter(e => e.entity === 'workers');
}

export function validateTasks(tasks: Task[]): ValidationError[] {
  const validator = new AdvancedValidator();
  const result = validator.validate({ clients: [], workers: [], tasks });
  return result.errors.filter(e => e.entity === 'tasks');
}

// Error type categorization for UI display
export const ERROR_CATEGORIES = {
  CRITICAL: ['missing_required', 'duplicate_id', 'unknown_reference'],
  DATA_INTEGRITY: ['malformed_array', 'invalid_json', 'out_of_range'],
  BUSINESS_LOGIC: ['skill_coverage', 'worker_overload', 'max_concurrency_infeasible'],
  WARNINGS: ['unusual_value', 'no_skills', 'no_requested_tasks', 'phase_range']
} as const;

// Helper function to get error category
export function getErrorCategory(errorType: string): keyof typeof ERROR_CATEGORIES | 'OTHER' {
  for (const [category, types] of Object.entries(ERROR_CATEGORIES)) {
    if (types.includes(errorType)) {
      return category as keyof typeof ERROR_CATEGORIES;
    }
  }
  return 'OTHER';
}

// Helper function to get error priority (higher number = more critical)
export function getErrorPriority(errorType: string): number {
  const category = getErrorCategory(errorType);
  switch (category) {
    case 'CRITICAL': return 4;
    case 'DATA_INTEGRITY': return 3;
    case 'BUSINESS_LOGIC': return 2;
    case 'WARNINGS': return 1;
    default: return 0;
  }
}