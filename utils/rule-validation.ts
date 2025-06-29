// utils/businessRuleValidation.ts

import { DataSet, Client, Worker, Task } from './data-validation';

export interface BusinessRule {
  id: string;
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  parameters: Record<string, any>;
  createdAt: Date;
}

export interface CoRunRule extends BusinessRule {
  type: 'coRun';
  parameters: {
    taskIds: string[];
    mustRunTogether: boolean;
  };
}

export interface SlotRestrictionRule extends BusinessRule {
  type: 'slotRestriction';
  parameters: {
    clientGroup?: string;
    workerGroup?: string;
    minCommonSlots: number;
    phases?: number[];
  };
}

export interface LoadLimitRule extends BusinessRule {
  type: 'loadLimit';
  parameters: {
    workerGroup: string;
    maxSlotsPerPhase: number;
    phases?: number[];
  };
}

export interface PhaseWindowRule extends BusinessRule {
  type: 'phaseWindow';
  parameters: {
    taskId: string;
    allowedPhases: number[];
    restrictedPhases?: number[];
  };
}

export interface PatternMatchRule extends BusinessRule {
  type: 'patternMatch';
  parameters: {
    pattern: string;
    field: string;
    entity: 'clients' | 'workers' | 'tasks';
    action: 'include' | 'exclude' | 'prioritize';
    actionValue?: any;
  };
}

export interface PrecedenceOverrideRule extends BusinessRule {
  type: 'precedenceOverride';
  parameters: {
    globalRuleId: string;
    specificConditions: Record<string, any>;
    overrideAction: string;
    overrideValue: any;
  };
}

export interface RuleValidationError {
  ruleId: string;
  ruleName: string;
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  affectedEntities: Array<{
    entity: string;
    id: string;
    field?: string;
  }>;
  suggestion?: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  warnings: RuleValidationError[];
  applicableRules: BusinessRule[];
  conflictingRules: Array<{
    rule1: BusinessRule;
    rule2: BusinessRule;
    conflictType: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export class BusinessRuleValidator {
  private errors: RuleValidationError[] = [];
  private warnings: RuleValidationError[] = [];

  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  private addError(error: Omit<RuleValidationError, 'severity'>): void {
    this.errors.push({ ...error, severity: 'error' });
  }

  private addWarning(warning: Omit<RuleValidationError, 'severity'>): void {
    this.warnings.push({ ...warning, severity: 'warning' });
  }

  private parseArray(value: string): number[] {
    if (!value || value.trim() === '') return [];
    
    try {
      let cleanValue = value.trim();
      
      if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
        cleanValue = cleanValue.slice(1, -1);
      }
      
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
      
      return cleanValue.split(',')
        .map(item => parseInt(item.trim()))
        .filter(num => !isNaN(num));
    } catch (error) {
      return [];
    }
  }

  private validateCoRunRule(rule: CoRunRule, data: DataSet): void {
    const { taskIds, mustRunTogether } = rule.parameters;
    
    if (!taskIds || taskIds.length < 2) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'invalid_corun_tasks',
        message: 'Co-run rule must specify at least 2 tasks',
        affectedEntities: [],
        suggestion: 'Add more tasks to create a valid co-run group'
      });
      return;
    }

    // Check if all tasks exist
    const existingTaskIds = new Set(data.tasks.map(t => t.TaskID));
    const missingTasks = taskIds.filter(id => !existingTaskIds.has(id));
    
    if (missingTasks.length > 0) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_corun_tasks',
        message: `Co-run rule references non-existent tasks: ${missingTasks.join(', ')}`,
        affectedEntities: missingTasks.map(id => ({ entity: 'tasks', id })),
        suggestion: 'Remove non-existent task IDs or ensure all referenced tasks are uploaded'
      });
    }

    // Check for circular dependencies (basic check)
    this.detectCircularCoRun(rule, data);
  }

  private detectCircularCoRun(rule: CoRunRule, data: DataSet): void {
    // Simple circular dependency detection
    // In a real implementation, this would be more sophisticated
    const { taskIds } = rule.parameters;
    
    // Check if any task appears in multiple co-run rules (potential conflict)
    // This is a simplified check - full implementation would need rule context
    taskIds.forEach(taskId => {
      const task = data.tasks.find(t => t.TaskID === taskId);
      if (task) {
        // Check for basic conflicts with task preferences
        const preferredPhases = this.parseArray(task.PreferredPhases);
        if (preferredPhases.length > 0) {
          // Validate that co-run tasks have compatible phase preferences
          const incompatibleTasks = taskIds.filter(otherTaskId => {
            if (otherTaskId === taskId) return false;
            const otherTask = data.tasks.find(t => t.TaskID === otherTaskId);
            if (!otherTask) return false;
            
            const otherPreferredPhases = this.parseArray(otherTask.PreferredPhases);
            if (otherPreferredPhases.length === 0) return false;
            
            // Check if there's any overlap in preferred phases
            const hasOverlap = preferredPhases.some(phase => 
              otherPreferredPhases.includes(phase)
            );
            return !hasOverlap;
          });

          if (incompatibleTasks.length > 0) {
            this.addWarning({
              ruleId: rule.id,
              ruleName: rule.name,
              type: 'corun_phase_conflict',
              message: `Tasks in co-run group have incompatible phase preferences`,
              affectedEntities: [taskId, ...incompatibleTasks].map(id => ({ entity: 'tasks', id })),
              suggestion: 'Review phase preferences for co-run tasks to ensure compatibility'
            });
          }
        }
      }
    });
  }

  private validateSlotRestrictionRule(rule: SlotRestrictionRule, data: DataSet): void {
    const { clientGroup, workerGroup, minCommonSlots, phases } = rule.parameters;

    if (!clientGroup && !workerGroup) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_restriction_target',
        message: 'Slot restriction rule must specify either clientGroup or workerGroup',
        affectedEntities: [],
        suggestion: 'Specify which group this restriction applies to'
      });
      return;
    }

    if (minCommonSlots < 1) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'invalid_min_slots',
        message: 'Minimum common slots must be at least 1',
        affectedEntities: [],
        suggestion: 'Set minCommonSlots to a positive value'
      });
    }

    // Validate groups exist
    if (clientGroup) {
      const hasMatchingClients = data.clients.some(c => c.GroupTag === clientGroup);
      if (!hasMatchingClients) {
        this.addError({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'missing_client_group',
          message: `No clients found with GroupTag: ${clientGroup}`,
          affectedEntities: [{ entity: 'clients', id: clientGroup }],
          suggestion: 'Ensure the client group exists or update the rule'
        });
      }
    }

    if (workerGroup) {
      const hasMatchingWorkers = data.workers.some(w => w.WorkerGroup === workerGroup);
      if (!hasMatchingWorkers) {
        this.addError({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'missing_worker_group',
          message: `No workers found with WorkerGroup: ${workerGroup}`,
          affectedEntities: [{ entity: 'workers', id: workerGroup }],
          suggestion: 'Ensure the worker group exists or update the rule'
        });
      }
    }

    // Validate phases if specified
    if (phases && phases.length > 0) {
      const invalidPhases = phases.filter(p => p < 1 || p > 50);
      if (invalidPhases.length > 0) {
        this.addWarning({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'unusual_phases',
          message: `Unusual phase numbers specified: ${invalidPhases.join(', ')}`,
          affectedEntities: [],
          suggestion: 'Verify phase numbers are correct'
        });
      }
    }
  }

  private validateLoadLimitRule(rule: LoadLimitRule, data: DataSet): void {
    const { workerGroup, maxSlotsPerPhase, phases } = rule.parameters;

    if (!workerGroup) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_worker_group',
        message: 'Load limit rule must specify a worker group',
        affectedEntities: [],
        suggestion: 'Specify which worker group this limit applies to'
      });
      return;
    }

    if (maxSlotsPerPhase < 1) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'invalid_max_slots',
        message: 'Maximum slots per phase must be at least 1',
        affectedEntities: [],
        suggestion: 'Set maxSlotsPerPhase to a positive value'
      });
    }

    // Check if worker group exists
    const matchingWorkers = data.workers.filter(w => w.WorkerGroup === workerGroup);
    if (matchingWorkers.length === 0) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_worker_group',
        message: `No workers found with WorkerGroup: ${workerGroup}`,
        affectedEntities: [{ entity: 'workers', id: workerGroup }],
        suggestion: 'Ensure the worker group exists or update the rule'
      });
      return;
    }

    // Check if the limit is reasonable for the group
    const totalGroupCapacity = matchingWorkers.reduce((sum, worker) => 
      sum + worker.MaxLoadPerPhase, 0
    );

    if (maxSlotsPerPhase > totalGroupCapacity) {
      this.addWarning({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'excessive_load_limit',
        message: `Load limit (${maxSlotsPerPhase}) exceeds total group capacity (${totalGroupCapacity})`,
        affectedEntities: matchingWorkers.map(w => ({ entity: 'workers', id: w.WorkerID })),
        suggestion: `Consider reducing limit to ${totalGroupCapacity} or below`
      });
    }
  }

  private validatePhaseWindowRule(rule: PhaseWindowRule, data: DataSet): void {
    const { taskId, allowedPhases, restrictedPhases } = rule.parameters;

    if (!taskId) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_task_id',
        message: 'Phase window rule must specify a task ID',
        affectedEntities: [],
        suggestion: 'Specify which task this phase window applies to'
      });
      return;
    }

    // Check if task exists
    const task = data.tasks.find(t => t.TaskID === taskId);
    if (!task) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_task',
        message: `Task not found: ${taskId}`,
        affectedEntities: [{ entity: 'tasks', id: taskId }],
        suggestion: 'Ensure the task exists or update the rule'
      });
      return;
    }

    if (!allowedPhases || allowedPhases.length === 0) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'no_allowed_phases',
        message: 'Phase window rule must specify at least one allowed phase',
        affectedEntities: [{ entity: 'tasks', id: taskId }],
        suggestion: 'Add allowed phases for this task'
      });
    }

    // Check for conflicts with task's preferred phases
    const taskPreferredPhases = this.parseArray(task.PreferredPhases);
    if (taskPreferredPhases.length > 0) {
      const hasConflict = !allowedPhases.some(phase => 
        taskPreferredPhases.includes(phase)
      );

      if (hasConflict) {
        this.addWarning({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'phase_preference_conflict',
          message: `Phase window conflicts with task's preferred phases`,
          affectedEntities: [{ entity: 'tasks', id: taskId, field: 'PreferredPhases' }],
          suggestion: 'Align phase window with task preferences or update task preferences'
        });
      }
    }

    // Check for conflicts between allowed and restricted phases
    if (restrictedPhases && restrictedPhases.length > 0) {
      const conflicts = allowedPhases.filter(phase => 
        restrictedPhases.includes(phase)
      );

      if (conflicts.length > 0) {
        this.addError({
          ruleId: rule.id,
          ruleName: rule.name,
          type: 'conflicting_phases',
          message: `Phases cannot be both allowed and restricted: ${conflicts.join(', ')}`,
          affectedEntities: [{ entity: 'tasks', id: taskId }],
          suggestion: 'Remove conflicts between allowed and restricted phases'
        });
      }
    }
  }

  private validatePatternMatchRule(rule: PatternMatchRule, data: DataSet): void {
    const { pattern, field, entity, action } = rule.parameters;

    if (!pattern) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_pattern',
        message: 'Pattern match rule must specify a pattern',
        affectedEntities: [],
        suggestion: 'Add a valid regex pattern or search string'
      });
      return;
    }

    // Validate regex pattern
    try {
      new RegExp(pattern);
    } catch (error) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'invalid_pattern',
        message: `Invalid regex pattern: ${pattern}`,
        affectedEntities: [],
        suggestion: 'Fix the regex pattern or use a simple text match'
      });
      return;
    }

    // Validate field exists in the specified entity
    const validFields: Record<string, string[]> = {
      clients: ['ClientID', 'ClientName', 'GroupTag', 'AttributesJSON'],
      workers: ['WorkerID', 'WorkerName', 'Skills', 'WorkerGroup'],
      tasks: ['TaskID', 'TaskName', 'Category', 'RequiredSkills']
    };

    if (!validFields[entity]?.includes(field)) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'invalid_field',
        message: `Field '${field}' is not valid for entity '${entity}'`,
        affectedEntities: [],
        suggestion: `Use one of: ${validFields[entity]?.join(', ') || 'No valid fields'}`
      });
    }

    // Test pattern against actual data
    const testData = data[entity] as any[];
    const matchCount = testData.filter(item => {
      const fieldValue = item[field];
      if (!fieldValue) return false;
      return new RegExp(pattern, 'i').test(fieldValue.toString());
    }).length;

    if (matchCount === 0) {
      this.addWarning({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'no_pattern_matches',
        message: `Pattern '${pattern}' matches no items in ${entity}.${field}`,
        affectedEntities: [],
        suggestion: 'Review the pattern or check if the target data exists'
      });
    }
  }

  private validatePrecedenceOverrideRule(rule: PrecedenceOverrideRule, data: DataSet): void {
    const { globalRuleId, specificConditions, overrideAction } = rule.parameters;

    if (!globalRuleId) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_global_rule',
        message: 'Precedence override must reference a global rule',
        affectedEntities: [],
        suggestion: 'Specify which global rule this override applies to'
      });
    }

    if (!specificConditions || Object.keys(specificConditions).length === 0) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_conditions',
        message: 'Precedence override must specify conditions',
        affectedEntities: [],
        suggestion: 'Add conditions that trigger this override'
      });
    }

    if (!overrideAction) {
      this.addError({
        ruleId: rule.id,
        ruleName: rule.name,
        type: 'missing_override_action',
        message: 'Precedence override must specify an action',
        affectedEntities: [],
        suggestion: 'Define what action to take when conditions are met'
      });
    }
  }

  private detectRuleConflicts(rules: BusinessRule[]): Array<{
    rule1: BusinessRule;
    rule2: BusinessRule;
    conflictType: string;
    severity: 'high' | 'medium' | 'low';
  }> {
    const conflicts: Array<{
      rule1: BusinessRule;
      rule2: BusinessRule;
      conflictType: string;
      severity: 'high' | 'medium' | 'low';
    }> = [];

    // Check for conflicting co-run rules
    const coRunRules = rules.filter(r => r.type === 'coRun') as CoRunRule[];
    for (let i = 0; i < coRunRules.length; i++) {
      for (let j = i + 1; j < coRunRules.length; j++) {
        const rule1 = coRunRules[i];
        const rule2 = coRunRules[j];
        
        const commonTasks = rule1.parameters.taskIds.filter(id => 
          rule2.parameters.taskIds.includes(id)
        );

        if (commonTasks.length > 0) {
          conflicts.push({
            rule1,
            rule2,
            conflictType: 'overlapping_corun_tasks',
            severity: 'medium'
          });
        }
      }
    }

    // Check for conflicting phase window rules
    const phaseWindowRules = rules.filter(r => r.type === 'phaseWindow') as PhaseWindowRule[];
    const taskPhaseRules = new Map<string, PhaseWindowRule[]>();
    
    phaseWindowRules.forEach(rule => {
      const taskId = rule.parameters.taskId;
      if (!taskPhaseRules.has(taskId)) {
        taskPhaseRules.set(taskId, []);
      }
      taskPhaseRules.get(taskId)!.push(rule);
    });

    taskPhaseRules.forEach(rulesForTask => {
      if (rulesForTask.length > 1) {
        for (let i = 0; i < rulesForTask.length; i++) {
          for (let j = i + 1; j < rulesForTask.length; j++) {
            conflicts.push({
              rule1: rulesForTask[i],
              rule2: rulesForTask[j],
              conflictType: 'multiple_phase_windows_same_task',
              severity: 'high'
            });
          }
        }
      }
    });

    return conflicts;
  }

  public validateRules(rules: BusinessRule[], data: DataSet): RuleValidationResult {
    this.errors = [];
    this.warnings = [];

    // Filter only active rules
    const activeRules = rules.filter(rule => rule.isActive);

    // Validate each rule based on its type
    activeRules.forEach(rule => {
      switch (rule.type) {
        case 'coRun':
          this.validateCoRunRule(rule as CoRunRule, data);
          break;
        case 'slotRestriction':
          this.validateSlotRestrictionRule(rule as SlotRestrictionRule, data);
          break;
        case 'loadLimit':
          this.validateLoadLimitRule(rule as LoadLimitRule, data);
          break;
        case 'phaseWindow':
          this.validatePhaseWindowRule(rule as PhaseWindowRule, data);
          break;
        case 'patternMatch':
          this.validatePatternMatchRule(rule as PatternMatchRule, data);
          break;
        case 'precedenceOverride':
          this.validatePrecedenceOverrideRule(rule as PrecedenceOverrideRule, data);
          break;
      }
    });

    // Detect conflicts between rules
    const conflictingRules = this.detectRuleConflicts(activeRules);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      applicableRules: activeRules,
      conflictingRules
    };
  }

  // Helper method to generate rule suggestions based on data patterns
  public generateRuleSuggestions(data: DataSet): Array<{
    type: BusinessRule['type'];
    name: string;
    description: string;
    confidence: number;
    parameters: Record<string, any>;
  }> {
    const suggestions: Array<{
      type: BusinessRule['type'];
      name: string;
      description: string;
      confidence: number;
      parameters: Record<string, any>;
    }> = [];

    // Suggest co-run rules for tasks with similar skills
    const tasksBySkills = new Map<string, Task[]>();
    data.tasks.forEach(task => {
      const skills = task.RequiredSkills.split(',').map(s => s.trim().toLowerCase());
      const skillKey = skills.sort().join(',');
      if (!tasksBySkills.has(skillKey)) {
        tasksBySkills.set(skillKey, []);
      }
      tasksBySkills.get(skillKey)!.push(task);
    });

    tasksBySkills.forEach((tasks, skillKey) => {
      if (tasks.length > 1 && skillKey) {
        suggestions.push({
          type: 'coRun',
          name: `Co-run tasks with ${skillKey} skills`,
          description: `Tasks ${tasks.map(t => t.TaskID).join(', ')} require similar skills`,
          confidence: 0.7,
          parameters: {
            taskIds: tasks.map(t => t.TaskID),
            mustRunTogether: false
          }
        });
      }
    });

    // Suggest load limits for overloaded worker groups
    const workerGroupLoads = new Map<string, { workers: Worker[], totalCapacity: number }>();
    data.workers.forEach(worker => {
      if (!workerGroupLoads.has(worker.WorkerGroup)) {
        workerGroupLoads.set(worker.WorkerGroup, { workers: [], totalCapacity: 0 });
      }
      const group = workerGroupLoads.get(worker.WorkerGroup)!;
      group.workers.push(worker);
      group.totalCapacity += worker.MaxLoadPerPhase;
    });

    workerGroupLoads.forEach((groupData, groupName) => {
      const avgCapacity = groupData.totalCapacity / groupData.workers.length;
      if (avgCapacity > 5) { // High average capacity
        suggestions.push({
          type: 'loadLimit',
          name: `Limit load for ${groupName} group`,
          description: `${groupName} group has high capacity (avg: ${avgCapacity.toFixed(1)})`,
          confidence: 0.6,
          parameters: {
            workerGroup: groupName,
            maxSlotsPerPhase: Math.ceil(avgCapacity * 0.8) // 80% of capacity
          }
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}

// Export convenience function
export function validateBusinessRules(rules: BusinessRule[], data: DataSet): RuleValidationResult {
  const validator = new BusinessRuleValidator();
  return validator.validateRules(rules, data);
}

// Helper function to create a new rule
export function createBusinessRule(
  type: BusinessRule['type'],
  name: string,
  parameters: Record<string, any>,
  priority: number = 1
): BusinessRule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    name,
    description: `Auto-generated ${type} rule`,
    isActive: true,
    priority,
    parameters,
    createdAt: new Date()
  };
}

// Export rule templates for UI
export const RULE_TEMPLATES = {
  coRun: {
    name: 'Co-run Tasks',
    description: 'Ensure specific tasks run together or in sequence',
    parameters: {
      taskIds: [],
      mustRunTogether: true
    }
  },
  slotRestriction: {
    name: 'Slot Restriction',
    description: 'Restrict slot usage for specific groups',
    parameters: {
      clientGroup: '',
      workerGroup: '',
      minCommonSlots: 1
    }
  },
  loadLimit: {
    name: 'Load Limit',
    description: 'Limit maximum workload for worker groups',
    parameters: {
      workerGroup: '',
      maxSlotsPerPhase: 5
    }
  },
  phaseWindow: {
    name: 'Phase Window',
    description: 'Restrict tasks to specific phases',
    parameters: {
      taskId: '',
      allowedPhases: []
    }
  },
  patternMatch: {
    name: 'Pattern Match',
    description: 'Apply rules based on data patterns',
    parameters: {
      pattern: '',
      field: '',
      entity: 'tasks',
      action: 'include'
    }
  },
  precedenceOverride: {
    name: 'Precedence Override',
    description: 'Override global rules with specific conditions',
    parameters: {
      globalRuleId: '',
      specificConditions: {},
      overrideAction: '',
      overrideValue: null
    }
  }
} as const;