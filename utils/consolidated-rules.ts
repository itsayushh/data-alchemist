import { Rule } from './rule';
import { Priorities, PrioritizationConfig } from '@/contexts/DataContext';

export interface ConsolidatedRulesConfig {
  version: string;
  generatedAt: string;
  entities: {
    clients: number;
    workers: number;
    tasks: number;
  };
  validationPassed: boolean;
  rules: Rule[];
  prioritization: {
    weights: Priorities;
    rankingOrder: string[];
    selectedProfile: string;
    customProfiles: Record<string, Priorities>;
    pairwiseMatrix?: Record<string, Record<string, number>>;
  };
  metadata: {
    totalRules: number;
    ruleTypes: string[];
    prioritizationMethod?: string;
    lastUpdated: string;
  };
}

export const createConsolidatedRulesConfig = (
  entities: { clients: number; workers: number; tasks: number },
  validationPassed: boolean,
  rules: Rule[],
  prioritizationConfig: PrioritizationConfig,
  activeMethod?: string
): ConsolidatedRulesConfig => {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    entities,
    validationPassed,
    rules,
    prioritization: {
      weights: prioritizationConfig.weights,
      rankingOrder: prioritizationConfig.rankingOrder,
      selectedProfile: prioritizationConfig.selectedProfile,
      customProfiles: prioritizationConfig.customProfiles,
      pairwiseMatrix: prioritizationConfig.pairwiseMatrix
    },
    metadata: {
      totalRules: rules.length,
      ruleTypes: [...new Set(rules.map(rule => rule.type))],
      prioritizationMethod: activeMethod,
      lastUpdated: new Date().toISOString()
    }
  };
};

export const exportConsolidatedRulesConfig = (config: ConsolidatedRulesConfig) => {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rules.json';
  a.click();
  URL.revokeObjectURL(url);
};

export const importConsolidatedRulesConfig = (
  fileContent: string
): {
  rules?: Rule[];
  prioritization?: PrioritizationConfig;
  success: boolean;
  error?: string;
} => {
  try {
    const config = JSON.parse(fileContent) as ConsolidatedRulesConfig;
    
    // Validate the structure
    if (!config.version || !config.rules || !config.prioritization) {
      return {
        success: false,
        error: 'Invalid rules.json format. Missing required fields.'
      };
    }
    
    return {
      rules: config.rules,
      prioritization: {
        weights: config.prioritization.weights,
        rankingOrder: config.prioritization.rankingOrder,
        selectedProfile: config.prioritization.selectedProfile,
        customProfiles: config.prioritization.customProfiles || {},
        pairwiseMatrix: config.prioritization.pairwiseMatrix
      },
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse rules.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
