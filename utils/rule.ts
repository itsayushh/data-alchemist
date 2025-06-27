// types/rules.ts
export interface BaseRule {
  id: string;
  type: string;
  name: string;
  description?: string;
}

export interface CoRunRule extends BaseRule {
  type: 'coRun';
  tasks: string[];
}

export interface SlotRestrictionRule extends BaseRule {
  type: 'slotRestriction';
  groupType: 'client' | 'worker';
  groupId: string;
  minCommonSlots: number;
}

export interface LoadLimitRule extends BaseRule {
  type: 'loadLimit';
  workerGroup: string;
  maxSlotsPerPhase: number;
}

export interface PhaseWindowRule extends BaseRule {
  type: 'phaseWindow';
  taskId: string;
  allowedPhases: number[];
}

export interface PatternMatchRule extends BaseRule {
  type: 'patternMatch';
  regex: string;
  template: string;
  parameters: Record<string, any>;
}

export interface PrecedenceOverrideRule extends BaseRule {
  type: 'precedenceOverride';
  globalRules: string[];
  specificRules: string[];
  priority: number;
}

export type Rule = CoRunRule | SlotRestrictionRule | LoadLimitRule | 
                   PhaseWindowRule | PatternMatchRule | PrecedenceOverrideRule;

// utils/ruleUtils.ts
export class RuleValidator {
  static validateCoRunRule(rule: CoRunRule, availableTasks: string[]): string[] {
    const errors: string[] = [];
    
    if (rule.tasks.length < 2) {
      errors.push('Co-run rule must have at least 2 tasks');
    }
    
    rule.tasks.forEach(taskId => {
      if (!availableTasks.includes(taskId)) {
        errors.push(`Task ${taskId} does not exist`);
      }
    });
    
    return errors;
  }
  
  static validateSlotRestrictionRule(rule: SlotRestrictionRule): string[] {
    const errors: string[] = [];
    
    if (rule.minCommonSlots < 1) {
      errors.push('Minimum common slots must be at least 1');
    }
    
    if (!rule.groupId.trim()) {
      errors.push('Group ID is required');
    }
    
    return errors;
  }
  
  static validateLoadLimitRule(rule: LoadLimitRule): string[] {
    const errors: string[] = [];
    
    if (rule.maxSlotsPerPhase < 1) {
      errors.push('Max slots per phase must be at least 1');
    }
    
    if (!rule.workerGroup.trim()) {
      errors.push('Worker group is required');
    }
    
    return errors;
  }
  
  static validatePhaseWindowRule(rule: PhaseWindowRule, availableTasks: string[]): string[] {
    const errors: string[] = [];
    
    if (!availableTasks.includes(rule.taskId)) {
      errors.push(`Task ${rule.taskId} does not exist`);
    }
    
    if (rule.allowedPhases.length === 0) {
      errors.push('At least one allowed phase is required');
    }
    
    rule.allowedPhases.forEach(phase => {
      if (phase < 1 || phase > 10) { // Assuming max 10 phases
        errors.push(`Phase ${phase} is out of valid range (1-10)`);
      }
    });
    
    return errors;
  }
  
  static validatePatternMatchRule(rule: PatternMatchRule): string[] {
    const errors: string[] = [];
    
    try {
      new RegExp(rule.regex);
    } catch (e) {
      errors.push('Invalid regex pattern');
    }
    
    if (!rule.template.trim()) {
      errors.push('Template is required');
    }
    
    return errors;
  }
  
  static validatePrecedenceOverrideRule(rule: PrecedenceOverrideRule): string[] {
    const errors: string[] = [];
    
    if (rule.globalRules.length === 0 && rule.specificRules.length === 0) {
      errors.push('At least one global or specific rule is required');
    }
    
    if (rule.priority < 1) {
      errors.push('Priority must be at least 1');
    }
    
    return errors;
  }
}

export class RuleManager {
  private rules: Rule[] = [];
  
  addRule(rule: Rule): void {
    this.rules.push(rule);
  }
  
  updateRule(id: string, updatedRule: Rule): void {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.rules[index] = updatedRule;
    }
  }
  
  deleteRule(id: string): void {
    this.rules = this.rules.filter(rule => rule.id !== id);
  }
  
  getRules(): Rule[] {
    return [...this.rules];
  }
  
  getRule(id: string): Rule | undefined {
    return this.rules.find(rule => rule.id === id);
  }
  
  validateAllRules(availableTasks: string[]): Record<string, string[]> {
    const validationResults: Record<string, string[]> = {};
    
    this.rules.forEach(rule => {
      let errors: string[] = [];
      
      switch (rule.type) {
        case 'coRun':
          errors = RuleValidator.validateCoRunRule(rule as CoRunRule, availableTasks);
          break;
        case 'slotRestriction':
          errors = RuleValidator.validateSlotRestrictionRule(rule as SlotRestrictionRule);
          break;
        case 'loadLimit':
          errors = RuleValidator.validateLoadLimitRule(rule as LoadLimitRule);
          break;
        case 'phaseWindow':
          errors = RuleValidator.validatePhaseWindowRule(rule as PhaseWindowRule, availableTasks);
          break;
        case 'patternMatch':
          errors = RuleValidator.validatePatternMatchRule(rule as PatternMatchRule);
          break;
        case 'precedenceOverride':
          errors = RuleValidator.validatePrecedenceOverrideRule(rule as PrecedenceOverrideRule);
          break;
      }
      
      if (errors.length > 0) {
        validationResults[rule.id] = errors;
      }
    });
    
    return validationResults;
  }
  
  exportRulesConfig(): string {
    const config = {
      rules: this.rules,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        totalRules: this.rules.length
      }
    };
    
    return JSON.stringify(config, null, 2);
  }
  
  generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const ruleTemplates = {
  coRun: (): Partial<CoRunRule> => ({
    type: 'coRun',
    tasks: [],
    name: 'Co-run Tasks',
    description: 'Tasks that must run together'
  }),
  
  slotRestriction: (): Partial<SlotRestrictionRule> => ({
    type: 'slotRestriction',
    groupType: 'client',
    groupId: '',
    minCommonSlots: 1,
    name: 'Slot Restriction',
    description: 'Minimum common slots for group'
  }),
  
  loadLimit: (): Partial<LoadLimitRule> => ({
    type: 'loadLimit',
    workerGroup: '',
    maxSlotsPerPhase: 1,
    name: 'Load Limit',
    description: 'Maximum slots per phase for worker group'
  }),
  
  phaseWindow: (): Partial<PhaseWindowRule> => ({
    type: 'phaseWindow',
    taskId: '',
    allowedPhases: [],
    name: 'Phase Window',
    description: 'Allowed phases for task execution'
  }),
  
  patternMatch: (): Partial<PatternMatchRule> => ({
    type: 'patternMatch',
    regex: '',
    template: '',
    parameters: {},
    name: 'Pattern Match',
    description: 'Rule based on pattern matching'
  }),
  
  precedenceOverride: (): Partial<PrecedenceOverrideRule> => ({
    type: 'precedenceOverride',
    globalRules: [],
    specificRules: [],
    priority: 1,
    name: 'Precedence Override',
    description: 'Override rule precedence'
  })
};