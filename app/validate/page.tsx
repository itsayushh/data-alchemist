'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Users, Briefcase, CheckCircle, AlertCircle, Download, AlertTriangle, Info, ArrowLeft, Filter, Search, RefreshCw, Eye, EyeOff, ChevronDown, ChevronRight, Zap, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import RuleInput from '../../components/rule-input';
import { useData } from '@/contexts/DataContext';

import { 
  validateDataSet, 
  ValidationResult, 
  ValidationError, 
  DataSet,
  getErrorCategory,
} from '../../utils/validation';
import { Rule } from '../../utils/rule';
import { ModernDataTable } from '@/components/data-table';

// Enhanced Professional Validation Panel Component
const ValidationPanel = ({ 
  validationResult, 
  onApplyFix,
  onApplyAllFixes
}: { 
  validationResult: ValidationResult | null;
  onApplyFix: (entity: string, index: number, field: string, value: any) => void;
  onApplyAllFixes: () => void;
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['CRITICAL']));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showFixes, setShowFixes] = useState(false);

  if (!validationResult) {
    return (
      <div className="bg-white border rounded-lg shadow-sm h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">Validation</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No data to validate</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, errors, warnings, fixes } = validationResult;
  const allIssues = [...errors, ...warnings];
  
  // Filter logic
  const filteredIssues = allIssues.filter(issue => {
    const matchesSearch = searchTerm === '' || 
      issue.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });
  
  // Group by category
  const groupedIssues = filteredIssues.reduce((acc, issue) => {
    const category = getErrorCategory(issue.type);
    if (!acc[category]) acc[category] = [];
    acc[category].push(issue);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const sortedCategories = Object.keys(groupedIssues).sort((a, b) => {
    const priorityA = a === 'CRITICAL' ? 3 : a === 'DATA_INTEGRITY' ? 2 : 1;
    const priorityB = b === 'CRITICAL' ? 3 : b === 'DATA_INTEGRITY' ? 2 : 1;
    return priorityB - priorityA;
  });

  const getStatusColor = () => {
    if (validationResult.isValid) return 'text-green-600';
    if (summary.totalErrors > 0) return 'text-red-600';
    return 'text-amber-600';
  };

  const getStatusBg = () => {
    if (validationResult.isValid) return 'bg-green-50';
    if (summary.totalErrors > 0) return 'bg-red-50';
    return 'bg-amber-50';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CRITICAL':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'DATA_INTEGRITY':
        return <AlertTriangle className="h-3 w-3 text-amber-500" />;
      default:
        return <AlertTriangle className="h-3 w-3 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm h-full flex flex-col">
      {/* Compact Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Validation</h3>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${
              validationResult.isValid ? 'bg-green-500' : 
              summary.totalErrors > 0 ? 'bg-red-500' : 'bg-amber-500'
            }`}></div>
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {validationResult.isValid ? 'Valid' : 
               summary.totalErrors > 0 ? 'Issues' : 'Warnings'}
            </span>
          </div>
        </div>
        
        {/* Compact Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            {summary.totalErrors > 0 && (
              <span className="flex items-center text-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                {summary.totalErrors}
              </span>
            )}
            {summary.totalWarnings > 0 && (
              <span className="flex items-center text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {summary.totalWarnings}
              </span>
            )}
          </div>
          <span className="text-gray-500">
            {summary.entityCounts.clients + summary.entityCounts.workers + summary.entityCounts.tasks} records
          </span>
        </div>
      </div>

      {/* Quick Fixes */}
      {fixes.length > 0 && (
        <div className="p-3 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">
                {fixes.length} Auto-fixes Available
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFixes(!showFixes)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showFixes ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={onApplyAllFixes}
                className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Apply All
              </button>
            </div>
          </div>
          
          {showFixes && (
            <div className="mt-3 space-y-2">
              {fixes.map((fix, index) => (
                <div key={index} className="bg-white rounded border p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {fix.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fix.entity} • Row {fix.row + 1} • {fix.column}
                      </p>
                    </div>
                    <button
                      onClick={() => onApplyFix(fix.entity, fix.row, fix.column, fix.value)}
                      className="text-blue-600 hover:text-blue-800 ml-2"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact Search & Filter */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Issues</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto">
        {sortedCategories.length > 0 ? (
          <div className="p-3 space-y-2">
            {sortedCategories.map((category) => {
              const categoryIssues = groupedIssues[category];
              const isExpanded = expandedCategories.has(category);
              
              return (
                <div key={category} className="border rounded">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedCategories);
                      if (newExpanded.has(category)) {
                        newExpanded.delete(category);
                      } else {
                        newExpanded.add(category);
                      }
                      setExpandedCategories(newExpanded);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category)}
                      <span className="text-sm font-medium text-gray-900">
                        {category.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {categoryIssues.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t bg-gray-50">
                      <div className="p-2 space-y-1">
                        {categoryIssues.map((issue, index) => (
                          <div
                            key={index}
                            className="bg-white rounded p-2 border text-xs"
                          >
                            <div className="flex items-start space-x-2">
                              {issue.severity === 'error' ? (
                                <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 leading-tight">
                                  {issue.message}
                                </p>
                                {(issue.row !== undefined || issue.column) && (
                                  <p className="text-gray-500 mt-1">
                                    {issue.entity} • Row {(issue.row || 0) + 1}
                                    {issue.column && ` • ${issue.column}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">All Clear!</p>
              <p className="text-xs text-gray-500">No validation issues found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
export default function ValidatePage() {
  const router = useRouter();
  const { data, setClients, setWorkers, setTasks, setRules, clearData } = useData();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'workers' | 'tasks' | 'rules'>('clients');
  const [isValidating, setIsValidating] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect to upload page if no data is loaded
  useEffect(() => {
    if (!data.isDataLoaded) {
      router.push('/');
      return;
    }
    
    // Run initial validation
    runValidation();
  }, [data.isDataLoaded, router]);

  // Auto-validate when data changes
  useEffect(() => {
    if (data.isDataLoaded) {
      // Clear existing timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      
      // Set new timeout for validation
      validationTimeoutRef.current = setTimeout(() => {
        runValidation();
      }, 300); // Debounce validation by 300ms
    }
    
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [data.clients, data.workers, data.tasks, data.rules]);

  const runValidation = useCallback(async () => {
    if (!data.isDataLoaded) return;
    
    setIsValidating(true);
    
    // Simulate async validation for better UX
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dataToValidate: DataSet = {
      clients: data.clients,
      workers: data.workers,
      tasks: data.tasks
    };
    
    const result = validateDataSet(dataToValidate);
    setValidationResult(result);
    setIsValidating(false);
    return result;
  }, [data.isDataLoaded, data.clients, data.workers, data.tasks]);

  const handleEdit = useCallback((type: string, index: number, field: string, value: any) => {
    const updatedData = [...(data[type as keyof typeof data] as any[])];
    updatedData[index] = { ...updatedData[index], [field]: value };
    
    if (type === 'clients') setClients(updatedData);
    if (type === 'workers') setWorkers(updatedData);
    if (type === 'tasks') setTasks(updatedData);
    
    // Validation will be triggered automatically by useEffect
  }, [data, setClients, setWorkers, setTasks]);

  const handleApplyFix = useCallback((entity: string, index: number, field: string, value: any) => {
    handleEdit(entity, index, field, value);
  }, [handleEdit]);

  const handleApplyAllFixes = useCallback(() => {
    if (!validationResult?.fixes) return;
    
    // Group fixes by entity type to batch updates
    const fixesByEntity = validationResult.fixes.reduce((acc, fix) => {
      if (!acc[fix.entity]) acc[fix.entity] = [];
      acc[fix.entity].push(fix);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Apply all fixes for each entity type
    Object.entries(fixesByEntity).forEach(([entityType, fixes]) => {
      const currentData = [...(data[entityType as keyof typeof data] as any[])];
      
      // Apply all fixes to the data
      fixes.forEach(fix => {
        if (currentData[fix.row]) {
          currentData[fix.row] = { ...currentData[fix.row], [fix.column]: fix.value };
        }
      });
      
      // Update the state with all fixes applied
      if (entityType === 'clients') setClients(currentData);
      if (entityType === 'workers') setWorkers(currentData);
      if (entityType === 'tasks') setTasks(currentData);
    });
    
    // Validation will be triggered automatically by useEffect
  }, [validationResult, data, setClients, setWorkers, setTasks]);

  const handleRulesChange = useCallback((rules: Rule[]) => {
    setRules(rules);
    // Validation will be triggered automatically by useEffect
  }, [setRules]);

  const handleExport = () => {
    if (!validationResult?.isValid) {
      alert('Please fix all validation errors before exporting.');
      return;
    }
    
    // Create and download CSV files
    const csvData = {
      clients: Papa.unparse(data.clients),
      workers: Papa.unparse(data.workers),
      tasks: Papa.unparse(data.tasks)
    };
    
    // Download each CSV file
    Object.entries(csvData).forEach(([type, csv]) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_cleaned.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
    
    // Create and download rules.json
    const rulesConfig = {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      entities: {
        clients: data.clients.length,
        workers: data.workers.length, 
        tasks: data.tasks.length
      },
      validationPassed: true,
      rules: data.rules,
      metadata: {
        totalRules: data.rules.length,
        ruleTypes: [...new Set(data.rules.map(rule => rule.type))]
      }
    };
    
    const rulesBlob = new Blob([JSON.stringify(rulesConfig, null, 2)], { type: 'application/json' });
    const rulesUrl = window.URL.createObjectURL(rulesBlob);
    const rulesLink = document.createElement('a');
    rulesLink.href = rulesUrl;
    rulesLink.download = 'rules.json';
    rulesLink.click();
    window.URL.revokeObjectURL(rulesUrl);
  };

  const handleBackToUpload = () => {
    clearData();
    router.push('/');
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'clients': return <Users className="h-4 w-4" />;
      case 'workers': return <Users className="h-4 w-4" />;
      case 'tasks': return <Briefcase className="h-4 w-4" />;
      case 'rules': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!data.isDataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading data validation...</p>
          <p className="text-gray-500 text-sm mt-1">Please wait while we prepare your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[100%] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToUpload}
                className="inline-flex items-center px-3 py-2 border shadow-lg text-sm font-medium rounded-md text-foreground bg-secondary hover:bg-accent hover:text-accent-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Data Validation & Quality Control</h1>
                <p className="mt-1 text-sm text-foreground/90">
                  Review, validate, and clean your data before processing
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={runValidation}
                disabled={isValidating}
                className="inline-flex items-center px-3 py-2 border shadow-lg text-sm font-medium rounded-md text-foreground bg-secondary hover:bg-accent hover:text-accent-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating...' : 'Re-validate'}
              </button>
              <button
                onClick={handleExport}
                disabled={!validationResult?.isValid}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  validationResult?.isValid
                    ? 'bg-primary hover:bg-primary/80'
                    : 'bg-foreground/50 cursor-not-allowed'
                }`}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Clean Data
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Validation Panel - Left Side */}
          <div className="lg:col-span-1">
            <ValidationPanel 
              validationResult={validationResult} 
              onApplyFix={handleApplyFix}
              onApplyAllFixes={handleApplyAllFixes}
            />
          </div>
          
          {/* Data Table - Right Side */}
          <div className="lg:col-span-3">
            <div className="bg-background border rounded-xl shadow-sm">
              {/* Tabs Header */}
              <div className="border-b bg-muted rounded-t-xl ">
                <nav className="flex space-x-8 px-6">
                  {(['clients', 'workers', 'tasks', 'rules'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-accent-foreground hover:border-primary'
                      }`}
                    >
                      {getTabIcon(tab)}
                      <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                      <span className="ml-2 bg-secondary text-secondary-foreground p-2 rounded-full text-xs">
                        {data[tab].length}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* Tab Content */}
              <div className="p-0 ">
                {activeTab === 'rules' ? (
                  <RuleInput
                    availableTasks={data.tasks.map((task: any) => task.TaskID || task.TaskName || 'Unknown')}
                    availableWorkers={data.workers.map((worker: any) => worker.WorkerID || worker.WorkerName || 'Unknown')}
                    availableClients={data.clients.map((client: any) => client.ClientID || client.ClientName || 'Unknown')}
                    initialRules={data.rules}
                    onRulesChange={handleRulesChange}
                  />
                ) : (
                  data[activeTab]?.length > 0 ? (
                    <ModernDataTable
                      data={data[activeTab]}
                      type={activeTab}
                      onEdit={(index, field, value) => handleEdit(activeTab, index, field, value)}
                      validationResult={validationResult}
                      title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {getTabIcon(activeTab)}
                      </div>
                      <p className="text-gray-500 text-sm">No {activeTab} data available</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}