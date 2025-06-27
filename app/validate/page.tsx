'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileText, Users, Briefcase, CheckCircle, AlertCircle, Download, AlertTriangle, Info, ArrowLeft, Filter, Search, RefreshCw, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
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
const ValidationPanel = ({ validationResult }: { validationResult: ValidationResult | null }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['CRITICAL']));
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  if (!validationResult) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-full">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Validation Results</h3>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-500">No Data</span>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No validation results available</p>
          <p className="text-gray-400 text-xs mt-1">Upload data to see validation status</p>
        </div>
      </div>
    );
  }

  const { summary, errors, warnings } = validationResult;
  const allIssues = showOnlyErrors ? errors : [...errors, ...warnings];
  
  // Filter issues based on search and severity
  const filteredIssues = allIssues.filter(issue => {
    const matchesSearch = searchTerm === '' || 
      issue.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.entity ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    
    return matchesSearch && matchesSeverity;
  });
  
  // Group filtered issues by category
  const groupedIssues = filteredIssues.reduce((acc, issue) => {
    const category = getErrorCategory(issue.type);
    if (!acc[category]) acc[category] = [];
    acc[category].push(issue);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  // Sort categories by priority
  const sortedCategories = Object.keys(groupedIssues).sort((a, b) => {
    const priorityA = a === 'CRITICAL' ? 4 : a === 'DATA_INTEGRITY' ? 3 : a === 'BUSINESS_LOGIC' ? 2 : 1;
    const priorityB = b === 'CRITICAL' ? 4 : b === 'DATA_INTEGRITY' ? 3 : b === 'BUSINESS_LOGIC' ? 2 : 1;
    return priorityB - priorityA;
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getIconForSeverity = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'CRITICAL':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'DATA_INTEGRITY':
        return 'border-amber-200 bg-amber-50 hover:bg-amber-100';
      case 'BUSINESS_LOGIC':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'WARNINGS':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'DATA_INTEGRITY':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'BUSINESS_LOGIC':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthStatus = () => {
    if (validationResult.isValid) {
      return { status: 'Healthy', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle };
    }
    if (summary.totalErrors > 0) {
      return { status: 'Critical Issues', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle };
    }
    return { status: 'Warnings', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle };
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Validation Dashboard</h3>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${validationResult.isValid ? 'bg-green-500' : summary.totalErrors > 0 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
            <span className={`text-sm font-medium ${healthStatus.color}`}>{healthStatus.status}</span>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`${healthStatus.bg} ${healthStatus.border} border rounded-lg p-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</p>
                <p className={`text-sm font-semibold ${healthStatus.color}`}>{healthStatus.status}</p>
              </div>
              <HealthIcon className={`h-5 w-5 ${healthStatus.color.replace('text-', 'text-').replace('-600', '-500')}`} />
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Records</p>
                <p className="text-sm font-semibold text-gray-900">
                  {summary.entityCounts.clients + summary.entityCounts.workers + summary.entityCounts.tasks}
                </p>
              </div>
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Errors</p>
                <p className="text-sm font-semibold text-red-700">{summary.totalErrors}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Warnings</p>
                <p className="text-sm font-semibold text-amber-700">{summary.totalWarnings}</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-col space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
            </select>
            
            <button
              onClick={() => setShowOnlyErrors(!showOnlyErrors)}
              className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                showOnlyErrors 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <Filter className="h-3 w-3 mr-1" />
              {showOnlyErrors ? 'Errors Only' : 'All Issues'}
            </button>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-hidden">
        {sortedCategories.length > 0 ? (
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-3">
              {sortedCategories.map((category) => {
                const categoryIssues = groupedIssues[category];
                const isExpanded = expandedCategories.has(category);
                
                return (
                  <div key={category} className={`border rounded-lg overflow-hidden ${getCategoryStyles(category)}`}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(category)}
                        <div>
                          <span className="font-medium text-gray-900 text-sm">
                            {category.replace('_', ' ')}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 bg-white bg-opacity-50 px-2 py-0.5 rounded-full">
                            {categoryIssues.length}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-white">
                        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                          {categoryIssues.map((issue, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-start space-x-3">
                                {getIconForSeverity(issue.severity)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {issue.message}
                                    </p>
                                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border">
                                      {issue.entity}
                                    </span>
                                  </div>
                                  
                                  {(issue.row !== undefined || issue.column) && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                                      {issue.row !== undefined && (
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                          Row {issue.row + 1}
                                        </span>
                                      )}
                                      {issue.column && (
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                          {issue.column}
                                        </span>
                                      )}
                                      {issue.value !== undefined && (
                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                                          "{String(issue.value)}"
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {issue.suggestion && (
                                    <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                                      <div className="flex items-start space-x-1">
                                        <span className="text-blue-500">💡</span>
                                        <span>{issue.suggestion}</span>
                                      </div>
                                    </div>
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
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-gray-900 font-medium text-sm">All validations passed!</p>
              <p className="text-gray-500 text-xs mt-1">Your data is ready for processing</p>
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

  // Redirect to upload page if no data is loaded
  useEffect(() => {
    if (!data.isDataLoaded) {
      router.push('/');
      return;
    }
    
    // Run initial validation
    runValidation();
  }, [data.isDataLoaded, router]);

  const runValidation = useCallback(async () => {
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
  }, [data,data.clients, data.workers, data.tasks]);

  const handleEdit = useCallback((type: string, index: number, field: string, value: any) => {
    const updatedData = [...(data[type as keyof typeof data] as any[])];
    updatedData[index] = { ...updatedData[index], [field]: value };
    
    if (type === 'clients') setClients(updatedData);
    if (type === 'workers') setWorkers(updatedData);
    if (type === 'tasks') setTasks(updatedData);
    
    setTimeout(() => runValidation(), 500);
  }, [data, setClients, setWorkers, setTasks]);

  const handleRulesChange = useCallback((rules: Rule[]) => {
    setRules(rules);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[100%] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToUpload}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Validation & Quality Control</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Review, validate, and clean your data before processing
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={runValidation}
                disabled={isValidating}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating...' : 'Re-validate'}
              </button>
              <button
                onClick={handleExport}
                disabled={!validationResult?.isValid}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  validationResult?.isValid
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-gray-400 cursor-not-allowed'
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
            <ValidationPanel validationResult={validationResult} />
          </div>
          
          {/* Data Table - Right Side */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              {/* Tabs Header */}
              <div className="border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <nav className="flex space-x-8 px-6">
                  {(['clients', 'workers', 'tasks', 'rules'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {getTabIcon(tab)}
                      <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                      <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {data[tab].length}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
              
              {/* Tab Content */}
              <div className="p-6">
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