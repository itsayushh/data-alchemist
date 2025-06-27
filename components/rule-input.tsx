'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Settings,
  Copy,
  Download
} from 'lucide-react';
import {
  Rule,
  CoRunRule,
  SlotRestrictionRule,
  LoadLimitRule,
  PhaseWindowRule,
  PatternMatchRule,
  PrecedenceOverrideRule,
  RuleManager,
  RuleValidator,
  ruleTemplates
} from '../utils/rule';

interface RuleInputProps {
  availableTasks: string[];
  availableWorkers: string[];
  availableClients: string[];
  onRulesChange?: (rules: Rule[]) => void;
  initialRules?: Rule[];
}

interface ValidationErrors {
  [ruleId: string]: string[];
}

const RuleInput: React.FC<RuleInputProps> = ({
  availableTasks = [],
  availableWorkers = [],
  availableClients = [],
  onRulesChange,
  initialRules = []
}) => {
  const [ruleManager] = useState(() => {
    const manager = new RuleManager();
    initialRules.forEach(rule => manager.addRule(rule));
    return manager;
  });
  
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<string>('coRun');

  useEffect(() => {
    validateAllRules();
  }, [rules, availableTasks]);

  useEffect(() => {
    onRulesChange?.(rules);
  }, [rules, onRulesChange]);

  const validateAllRules = () => {
    const errors = ruleManager.validateAllRules(availableTasks);
    setValidationErrors(errors);
  };

  const updateRules = () => {
    const updatedRules = ruleManager.getRules();
    setRules(updatedRules);
    validateAllRules();
  };

  const handleAddRule = (ruleType: string) => {
    const template = ruleTemplates[ruleType as keyof typeof ruleTemplates]();
    const newRule: Rule = {
      ...template,
      id: ruleManager.generateRuleId(),
      type: ruleType,
      name: template.name || `New ${ruleType} Rule`,
    } as Rule;
    
    ruleManager.addRule(newRule);
    updateRules();
    setEditingRule(newRule.id);
    setExpandedRules(prev => new Set([...prev, newRule.id]));
    setShowAddForm(false);
  };

  const handleUpdateRule = (id: string, updatedRule: Rule) => {
    ruleManager.updateRule(id, updatedRule);
    updateRules();
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    ruleManager.deleteRule(id);
    updateRules();
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const toggleExpanded = (ruleId: string) => {
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };

  const handleExportRules = () => {
    const config = ruleManager.exportRulesConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRuleTypeColor = (type: string) => {
    const colors = {
      coRun: 'bg-blue-100 text-blue-800 border-blue-200',
      slotRestriction: 'bg-green-100 text-green-800 border-green-200',
      loadLimit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      phaseWindow: 'bg-purple-100 text-purple-800 border-purple-200',
      patternMatch: 'bg-pink-100 text-pink-800 border-pink-200',
      precedenceOverride: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type as keyof typeof colors] || colors.coRun;
  };

  return (
    <div className="bg-muted rounded-lg shadow-sm border border-neutral-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Rule Configuration</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </button>
          <button
            onClick={handleExportRules}
            className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-background rounded-lg border">
          <h3 className="text-lg font-medium mb-3">Add New Rule</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.keys(ruleTemplates).map(type => (
              <button
                key={type}
                onClick={() => handleAddRule(type)}
                className={`p-3 rounded-lg border-2 border-dashed transition-colors hover:border-accent-foreground hover:bg-accent ${
                  selectedRuleType === type ? 'border-accent-foreground bg-accent' : 'border-gray-300'
                }`}
              >
                <div className="text-sm font-medium capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-xs text-foreground/50 mt-1">
                  {ruleTemplates[type as keyof typeof ruleTemplates]().description}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 text-foreground/50 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 text-foreground/50" />
            <p>No rules configured yet.</p>
            <p className="text-sm">Click "Add Rule" to get started.</p>
          </div>
        ) : (
          rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              isExpanded={expandedRules.has(rule.id)}
              isEditing={editingRule === rule.id}
              validationErrors={validationErrors[rule.id] || []}
              availableTasks={availableTasks}
              availableWorkers={availableWorkers}
              availableClients={availableClients}
              onToggleExpanded={() => toggleExpanded(rule.id)}
              onEdit={() => setEditingRule(rule.id)}
              onSave={(updatedRule) => handleUpdateRule(rule.id, updatedRule)}
              onCancel={() => setEditingRule(null)}
              onDelete={() => handleDeleteRule(rule.id)}
              getRuleTypeColor={getRuleTypeColor}
            />
          ))
        )}
      </div>

      {/* Summary */}
      {rules.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Total Rules: {rules.length}</span>
            <span>
              Errors: {Object.keys(validationErrors).length} | 
              Valid: {rules.length - Object.keys(validationErrors).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface RuleCardProps {
  rule: Rule;
  isExpanded: boolean;
  isEditing: boolean;
  validationErrors: string[];
  availableTasks: string[];
  availableWorkers: string[];
  availableClients: string[];
  onToggleExpanded: () => void;
  onEdit: () => void;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
  onDelete: () => void;
  getRuleTypeColor: (type: string) => string;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  isExpanded,
  isEditing,
  validationErrors,
  availableTasks,
  availableWorkers,
  availableClients,
  onToggleExpanded,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  getRuleTypeColor
}) => {
  const [editedRule, setEditedRule] = useState<Rule>(rule);

  useEffect(() => {
    setEditedRule(rule);
  }, [rule]);

  const handleSave = () => {
    onSave(editedRule);
  };

  return (
    <div className={`border rounded-lg ${validationErrors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      {/* Rule Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={onToggleExpanded} className="text-gray-500 hover:text-gray-700">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getRuleTypeColor(rule.type)}`}>
              {rule.type}
            </span>
            <div>
              <h3 className="font-medium text-gray-900">{rule.name}</h3>
              {rule.description && <p className="text-sm text-gray-600">{rule.description}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {validationErrors.length > 0 ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {!isEditing ? (
              <>
                <button onClick={onEdit} className="p-1 text-gray-500 hover:text-blue-600">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSave} className="p-1 text-gray-500 hover:text-green-600">
                  <Save className="h-4 w-4" />
                </button>
                <button onClick={onCancel} className="p-1 text-gray-500 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
            <div className="text-sm text-red-800">
              <div className="font-medium">Validation Errors:</div>
              <ul className="list-disc list-inside mt-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Rule Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {isEditing ? (
            <RuleEditor
              rule={editedRule}
              onChange={setEditedRule}
              availableTasks={availableTasks}
              availableWorkers={availableWorkers}
              availableClients={availableClients}
            />
          ) : (
            <RuleDisplay rule={rule} />
          )}
        </div>
      )}
    </div>
  );
};

interface RuleEditorProps {
  rule: Rule;
  onChange: (rule: Rule) => void;
  availableTasks: string[];
  availableWorkers: string[];
  availableClients: string[];
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  rule,
  onChange,
  availableTasks,
  availableWorkers,
  availableClients
}) => {
  const updateRule = (updates: Partial<Rule>) => {
    onChange({ ...rule, ...updates } as Rule);
  };

  const renderRuleSpecificFields = () => {
    switch (rule.type) {
      case 'coRun':
        const coRunRule = rule as CoRunRule;
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tasks</label>
              <div className="space-y-2">
                {availableTasks.map(task => (
                  <label key={task} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={coRunRule.tasks.includes(task)}
                      onChange={(e) => {
                        const tasks = e.target.checked
                          ? [...coRunRule.tasks, task]
                          : coRunRule.tasks.filter(t => t !== task);
                        updateRule({ tasks });
                      }}
                      className="mr-2"
                    />
                    {task}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'slotRestriction':
        const slotRule = rule as SlotRestrictionRule;
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Type</label>
              <select
                value={slotRule.groupType}
                onChange={(e) => updateRule({ groupType: e.target.value as 'client' | 'worker' })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="client">Client</option>
                <option value="worker">Worker</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group ID</label>
              <select
                value={slotRule.groupId}
                onChange={(e) => updateRule({ groupId: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select {slotRule.groupType}</option>
                {(slotRule.groupType === 'client' ? availableClients : availableWorkers).map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Common Slots</label>
              <input
                type="number"
                min="1"
                value={slotRule.minCommonSlots}
                onChange={(e) => updateRule({ minCommonSlots: parseInt(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        );

      case 'loadLimit':
        const loadRule = rule as LoadLimitRule;
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Worker Group</label>
              <select
                value={loadRule.workerGroup}
                onChange={(e) => updateRule({ workerGroup: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select worker</option>
                {availableWorkers.map(worker => (
                  <option key={worker} value={worker}>{worker}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Slots Per Phase</label>
              <input
                type="number"
                min="1"
                value={loadRule.maxSlotsPerPhase}
                onChange={(e) => updateRule({ maxSlotsPerPhase: parseInt(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        );

      case 'phaseWindow':
        const phaseRule = rule as PhaseWindowRule;
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
              <select
                value={phaseRule.taskId}
                onChange={(e) => updateRule({ taskId: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select task</option>
                {availableTasks.map(task => (
                  <option key={task} value={task}>{task}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Phases</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(phase => (
                  <label key={phase} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={phaseRule.allowedPhases.includes(phase)}
                      onChange={(e) => {
                        const phases = e.target.checked
                          ? [...phaseRule.allowedPhases, phase]
                          : phaseRule.allowedPhases.filter(p => p !== phase);
                        updateRule({ allowedPhases: phases });
                      }}
                      className="mr-1"
                    />
                    {phase}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'patternMatch':
        const patternRule = rule as PatternMatchRule;
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Regex Pattern</label>
              <input
                type="text"
                value={patternRule.regex}
                onChange={(e) => updateRule({ regex: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md font-mono"
                placeholder="^[A-Z]+\d+$"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <input
                type="text"
                value={patternRule.template}
                onChange={(e) => updateRule({ template: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Template string"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parameters (JSON)</label>
              <textarea
                value={JSON.stringify(patternRule.parameters, null, 2)}
                onChange={(e) => {
                  try {
                    const parameters = JSON.parse(e.target.value);
                    updateRule({ parameters });
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md font-mono"
                rows={3}
                placeholder='{"key": "value"}'
              />
            </div>
          </div>
        );

      case 'precedenceOverride':
        const precedenceRule = rule as PrecedenceOverrideRule;
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Global Rules</label>
              <textarea
                value={precedenceRule.globalRules.join('\n')}
                onChange={(e) => updateRule({ globalRules: e.target.value.split('\n').filter(r => r.trim()) })}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter rule IDs, one per line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specific Rules</label>
              <textarea
                value={precedenceRule.specificRules.join('\n')}
                onChange={(e) => updateRule({ specificRules: e.target.value.split('\n').filter(r => r.trim()) })}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter rule IDs, one per line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <input
                type="number"
                min="1"
                value={precedenceRule.priority}
                onChange={(e) => updateRule({ priority: parseInt(e.target.value) })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        );

      default:
        return <div>Unknown rule type</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            value={rule.name}
            onChange={(e) => updateRule({ name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input
            type="text"
            value={rule.description || ''}
            onChange={(e) => updateRule({ description: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      {renderRuleSpecificFields()}
    </div>
  );
};

interface RuleDisplayProps {
  rule: Rule;
}

const RuleDisplay: React.FC<RuleDisplayProps> = ({ rule }) => {
  const renderRuleDetails = () => {
    switch (rule.type) {
      case 'coRun':
        const coRunRule = rule as CoRunRule;
        return (
          <div>
            <strong>Tasks:</strong> {coRunRule.tasks.join(', ') || 'None selected'}
          </div>
        );

      case 'slotRestriction':
        const slotRule = rule as SlotRestrictionRule;
        return (
          <div className="space-y-1">
            <div><strong>Group Type:</strong> {slotRule.groupType}</div>
            <div><strong>Group ID:</strong> {slotRule.groupId || 'Not specified'}</div>
            <div><strong>Min Common Slots:</strong> {slotRule.minCommonSlots}</div>
          </div>
        );

      case 'loadLimit':
        const loadRule = rule as LoadLimitRule;
        return (
          <div className="space-y-1">
            <div><strong>Worker Group:</strong> {loadRule.workerGroup || 'Not specified'}</div>
            <div><strong>Max Slots Per Phase:</strong> {loadRule.maxSlotsPerPhase}</div>
          </div>
        );

      case 'phaseWindow':
        const phaseRule = rule as PhaseWindowRule;
        return (
          <div className="space-y-1">
            <div><strong>Task:</strong> {phaseRule.taskId || 'Not specified'}</div>
            <div><strong>Allowed Phases:</strong> {phaseRule.allowedPhases.join(', ') || 'None selected'}</div>
          </div>
        );

      case 'patternMatch':
        const patternRule = rule as PatternMatchRule;
        return (
          <div className="space-y-1">
            <div><strong>Regex:</strong> <code className="bg-gray-100 px-1 rounded">{patternRule.regex || 'Not specified'}</code></div>
            <div><strong>Template:</strong> {patternRule.template || 'Not specified'}</div>
            <div><strong>Parameters:</strong> <code className="bg-gray-100 px-1 rounded">{JSON.stringify(patternRule.parameters)}</code></div>
          </div>
        );

      case 'precedenceOverride':
        const precedenceRule = rule as PrecedenceOverrideRule;
        return (
          <div className="space-y-1">
            <div><strong>Global Rules:</strong> {precedenceRule.globalRules.join(', ') || 'None'}</div>
            <div><strong>Specific Rules:</strong> {precedenceRule.specificRules.join(', ') || 'None'}</div>
            <div><strong>Priority:</strong> {precedenceRule.priority}</div>
          </div>
        );

      default:
        return <div>Unknown rule type</div>;
    }
  };

  return (
    <div className="space-y-2">
      {renderRuleDetails()}
    </div>
  );
};

export default RuleInput;
