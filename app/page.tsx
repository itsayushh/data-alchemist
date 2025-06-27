  // app/page.tsx
  'use client';

  import React, { useState, useCallback } from 'react';
  import { Upload, FileText, Users, Briefcase, CheckCircle, AlertCircle, Download, AlertTriangle, Info, X } from 'lucide-react';
  import * as XLSX from 'xlsx';
  import Papa from 'papaparse';
  import RuleInput from '../components/rule-input';

  import { 
    validateDataSet, 
    ValidationResult, 
    ValidationError, 
    Client, 
    Worker, 
    Task, 
    DataSet,
    getErrorCategory,
  } from '../utils/validation';
  import { Rule } from '../utils/rule';
  import { ModernDataTable } from '@/components/data-table';

  interface DataState {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    rules: Rule[];
    validationResult: ValidationResult | null;
    isLoading: boolean;
  }

  // Enhanced Validation Panel Component
  const ValidationPanel = ({ validationResult }: { validationResult: ValidationResult | null }) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['CRITICAL']));
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    if (!validationResult) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Results</h3>
          <div className="text-gray-500 text-center py-8">
            Upload data files to see validation results
          </div>
        </div>
      );
    }

    const { summary, errors, warnings } = validationResult;
    const allIssues = showOnlyErrors ? errors : [...errors, ...warnings];
    
    // Group errors by category
    const groupedIssues = allIssues.reduce((acc, issue) => {
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
          return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        default:
          return <Info className="h-4 w-4 text-blue-500" />;
      }
    };

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'CRITICAL':
          return 'border-red-200 bg-red-50';
        case 'DATA_INTEGRITY':
          return 'border-orange-200 bg-orange-50';
        case 'BUSINESS_LOGIC':
          return 'border-blue-200 bg-blue-50';
        case 'WARNINGS':
          return 'border-yellow-200 bg-yellow-50';
        default:
          return 'border-gray-200 bg-gray-50';
      }
    };

    return (
      <div className="bg-muted rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-foreground">Validation Results</h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
                className="mr-2 rounded"
              />
              Show only errors
            </label>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">Data Health</p>
                <p className="text-lg font-semibold text-green-700">
                  {validationResult.isValid ? 'Valid' : 'Invalid'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-red-600">Errors</p>
                <p className="text-lg font-semibold text-red-700">{summary.totalErrors}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm text-yellow-600">Warnings</p>
                <p className="text-lg font-semibold text-yellow-700">{summary.totalWarnings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Total Records</p>
                <p className="text-lg font-semibold text-blue-700">
                  {summary.entityCounts.clients + summary.entityCounts.workers + summary.entityCounts.tasks}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Issues by Category */}
        {sortedCategories.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedCategories.map((category) => {
              const categoryIssues = groupedIssues[category];
              const isExpanded = expandedCategories.has(category);
              
              return (
                <div key={category} className={`border rounded-lg ${getCategoryColor(category)}`}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-opacity-80"
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {category.replace('_', ' ')} ({categoryIssues.length})
                      </span>
                    </div>
                    <div className="transform transition-transform">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                      {categoryIssues.map((issue, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-md p-3 border text-sm"
                        >
                          <div className="flex items-start space-x-2">
                            {getIconForSeverity(issue.severity)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {issue.message}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {issue.entity}
                                </span>
                              </div>
                              
                              {(issue.row !== undefined || issue.column) && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {issue.row !== undefined && `Row ${issue.row + 1}`}
                                  {issue.row !== undefined && issue.column && ', '}
                                  {issue.column && `Column: ${issue.column}`}
                                  {issue.value !== undefined && (
                                    <span className="ml-2 font-mono bg-gray-100 px-1 rounded">
                                      "{String(issue.value)}"
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {issue.suggestion && (
                                <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                  💡 {issue.suggestion}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-900 font-medium">All validations passed!</p>
            <p className="text-gray-600 text-sm">Your data is ready for processing.</p>
          </div>
        )}
      </div>
    );
  };

  const FileUpload = ({ 
    onFileUpload, 
    fileType, 
    icon: Icon,
    isLoading 
  }: {
    onFileUpload: (data: any[], type: string) => void;
    fileType: string;
    icon: any;
    isLoading: boolean;
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    
    const handleFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (file.name.endsWith('.csv')) {
          Papa.parse(data as string, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
              // Clean headers by trimming whitespace
              const cleanedData = results.data.map((row: any) => {
                const cleanRow: any = {};
                Object.keys(row).forEach(key => {
                  const cleanKey = key.trim();
                  cleanRow[cleanKey] = row[key];
                });
                return cleanRow;
              });
              onFileUpload(cleanedData, fileType);
            }
          });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Clean headers by trimming whitespace
          const cleanedData = jsonData.map((row: any) => {
            const cleanRow: any = {};
            Object.keys(row).forEach(key => {
              const cleanKey = key.trim();
              cleanRow[cleanKey] = row[key];
            });
            return cleanRow;
          });
          
          onFileUpload(cleanedData, fileType);
        }
      };
      reader.readAsBinaryString(file);
    };
    
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && !isLoading) {
        handleFile(files[0]);
      }
    };
    
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && !isLoading) {
        handleFile(files[0]);
      }
    };
    
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-accent-foreground bg-accent' : 'border-foreground/50 hover:border-foreground/80'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Icon className="mx-auto h-8 w-8 text-foreground/50 mb-2" />
        <p className="text-sm text-foreground mb-2">
          Upload {fileType} file (CSV or XLSX)
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          id={`file-${fileType}`}
          disabled={isLoading}
        />
        <label
          htmlFor={`file-${fileType}`}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-secondary-foreground ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer'
          }`}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isLoading ? 'Processing...' : 'Choose File'}
        </label>
      </div>
    );
  };

  // Main Component
  export default function DataAlchemist() {
    const [data, setData] = useState<DataState>({
      clients: [],
      workers: [],
      tasks: [],
      rules: [],
      validationResult: null,
      isLoading: false
    });
    
    const [activeTab, setActiveTab] = useState<'clients' | 'workers' | 'tasks' | 'rules'>('clients');
    
    const runValidation = useCallback((newData: Partial<DataState>) => {
      const dataToValidate: DataSet = {
        clients: newData.clients || data.clients,
        workers: newData.workers || data.workers,
        tasks: newData.tasks || data.tasks
      };
      
      const validationResult = validateDataSet(dataToValidate);
      return validationResult;
    }, [data]);
    
    const handleFileUpload = useCallback((fileData: any[], type: string) => {
      setData(prev => ({ ...prev, isLoading: true }));
      
      // Simulate processing delay for better UX
      setTimeout(() => {
        const newData = { ...data, [type]: fileData };
        const validationResult = runValidation(newData);
        
        setData({
          ...newData,
          validationResult,
          isLoading: false
        });
      }, 500);
    }, [data, runValidation]);
    
    const handleEdit = useCallback((type: string, index: number, field: string, value: any) => {
      setData(prev => {
        const newData = { ...prev };
        const entityData = [...newData[type as keyof DataState] as any[]];
        entityData[index] = { ...entityData[index], [field]: value };
        newData[type as keyof DataState] = entityData as any;
        
        const validationResult = runValidation(newData);
        
        return {
          ...newData,
          validationResult
        };
      });
    }, [runValidation]);

    const handleRulesChange = useCallback((rules: Rule[]) => {
      setData(prev => ({
        ...prev,
        rules
      }));
    }, []);
    
    const handleExport = () => {
      if (!data.validationResult?.isValid) {
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
    
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[80%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Data Alchemist</h1>
            <p className="mt-2 text-foreground">
              Transform your messy spreadsheets into clean, validated data with AI-powered insights
            </p>
          </div>
          
          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <FileUpload
              onFileUpload={handleFileUpload}
              fileType="clients"
              icon={Users}
              isLoading={data.isLoading}
            />
            <FileUpload
              onFileUpload={handleFileUpload}
              fileType="workers"
              icon={Briefcase}
              isLoading={data.isLoading}
            />
            <FileUpload
              onFileUpload={handleFileUpload}
              fileType="tasks"
              icon={FileText}
              isLoading={data.isLoading}
            />
          </div>
          
          {/* Enhanced Validation Panel */}
          <div className="mb-8">
            <ValidationPanel validationResult={data.validationResult} />
          </div>
          
          {/* Data Tabs and Rules */}
          <div className="bg-muted p-2 mb-8">
            <div className="">
              <nav className="-mb-px flex space-x-8">
                {(['clients', 'workers', 'tasks', 'rules'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-accent-foreground text-accent-foreground'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    // disabled={data[tab].length === 0}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} ({data[tab].length})
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'rules' ? (
                <RuleInput
                  availableTasks={data.tasks.map(task => task.TaskID || task.TaskName || 'Unknown')}
                  availableWorkers={data.workers.map(worker => worker.WorkerID || worker.WorkerName || 'Unknown')}
                  availableClients={data.clients.map(client => client.ClientID || client.ClientName || 'Unknown')}
                  initialRules={data.rules}
                  onRulesChange={handleRulesChange}
                />
              ) : (
                data[activeTab]?.length > 0 && (
                  <ModernDataTable
                    data={data[activeTab]}
                    type={activeTab}
                    onEdit={(index, field, value) => handleEdit(activeTab, index, field, value)}
                    validationResult={data.validationResult}
                    title= {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  />
                )
              )}
            </div>
          </div>
          
          {/* Export Button */}
          {data.validationResult && (data.clients.length > 0 || data.workers.length > 0 || data.tasks.length > 0) && (
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleExport}
                disabled={!data.validationResult.isValid}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                  data.validationResult.isValid
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Download className="h-5 w-5 mr-2" />
                Export Clean Data
                {!data.validationResult.isValid && (
                  <span className="ml-2 text-xs">(Fix errors first)</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }