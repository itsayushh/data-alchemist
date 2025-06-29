'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Users, Briefcase, CheckCircle, AlertCircle, ArrowRight, RefreshCw, Trash2, Sparkles, Database, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useData } from '@/contexts/DataContext';
import { clear } from 'console';
import { clearAllCaches } from '@/lib/client-cache';

interface FileUploadState {
  clients: { file: File | null; data: any[]; isUploaded: boolean };
  workers: { file: File | null; data: any[]; isUploaded: boolean };
  tasks: { file: File | null; data: any[]; isUploaded: boolean };
}

const FileUploadCard = ({ 
  fileType, 
  icon: Icon, 
  uploadState, 
  onFileUpload, 
  onRemove,
  isLoading 
}: {
  fileType: 'clients' | 'workers' | 'tasks';
  icon: any;
  uploadState: FileUploadState[keyof FileUploadState];
  onFileUpload: (file: File, type: string) => void;
  onRemove: (type: string) => void;
  isLoading: boolean;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFile = (file: File) => {
    onFileUpload(file, fileType);
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

  const getFileTypeConfig = (type: string) => {
    switch (type) {
      case 'clients':
        return {
          label: 'Clients',
          description: 'Upload your client database',
          color: 'blue'
        };
      case 'workers':
        return {
          label: 'Workers',
          description: 'Upload your worker database',
          color: 'green'
        };
      case 'tasks':
        return {
          label: 'Tasks',
          description: 'Upload your task database',
          color: 'purple'
        };
      default:
        return { label: type, description: '', color: 'gray' };
    }
  };

  const config = getFileTypeConfig(fileType);
  
  return (
    <div className={`
      relative group rounded-xl transition-all duration-300 border-2 border-dashed
      ${uploadState.isUploaded 
        ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
        : isDragging 
        ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg scale-105' 
        : 'border-border hover:border-primary/50 bg-card hover:shadow-md'
      }
      ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
    onDragLeave={() => setIsDragging(false)}
    onDrop={handleDrop}
    >
      <div className="p-8 text-center">
        <div className={`
          mx-auto mb-6 p-4 rounded-full inline-flex items-center justify-center
          ${uploadState.isUploaded 
            ? 'bg-green-100 text-green-600' 
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
          } transition-colors duration-200
        `}>
          <Icon className="h-8 w-8" />
        </div>
        
        {uploadState.isUploaded ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium truncate max-w-40" title={uploadState.file?.name}>
                {uploadState.file?.name}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-green-700 font-medium">
                {uploadState.data.length.toLocaleString()} records loaded
              </div>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => onRemove(fileType)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg 
                    text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 
                    transition-colors duration-200"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{config.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
            </div>
            
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                Supports CSV, XLSX, XLS files
              </div>
              
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
                className={`
                  inline-flex items-center px-6 py-3 text-sm font-medium rounded-lg 
                  transition-all duration-200 min-w-32
                  ${isLoading
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md cursor-pointer'
                  }
                `}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : 'Choose File'}
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MultiFileUpload = ({
  onComplete,
  isLoading,
  setIsLoading
}: {
  onComplete: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sheetsData, setSheetsData] = useState<{[key: string]: any[]}>({});
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [sheetMappings, setSheetMappings] = useState<{
    clients: string;
    workers: string;
    tasks: string;
  }>({
    clients: '',
    workers: '',
    tasks: ''
  });

  const { setClients, setWorkers, setTasks } = useData();

  // Intelligent sheet detection
  const detectSheetType = (sheetName: string): 'clients' | 'workers' | 'tasks' | null => {
    const name = sheetName.toLowerCase();
    
    // Client detection
    if (name.includes('client') || name.includes('customer') || name.includes('company')) {
      return 'clients';
    }
    
    // Worker detection
    if (name.includes('worker') || name.includes('employee') || name.includes('staff') || 
        name.includes('team') || name.includes('personnel') || name.includes('user')) {
      return 'workers';
    }
    
    // Task detection
    if (name.includes('task') || name.includes('project') || name.includes('job') || 
        name.includes('work') || name.includes('assignment') || name.includes('activity')) {
      return 'tasks';
    }
    
    return null;
  };

  const handleFile = (file: File) => {
    setIsLoading(true);
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      
      if (file.name.endsWith('.csv')) {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            const cleanedData = results.data.map((row: any) => {
              const cleanRow: any = {};
              Object.keys(row).forEach(key => {
                const cleanKey = key.trim();
                cleanRow[cleanKey] = row[key];
              });
              return cleanRow;
            });
            
            setSheetsData({ 'Sheet1': cleanedData });
            setAvailableSheets(['Sheet1']);
            
            // Auto-detect for single sheet
            const detectedType = detectSheetType(file.name);
            if (detectedType) {
              setSheetMappings(prev => ({
                ...prev,
                [detectedType]: 'Sheet1'
              }));
            }
            
            setIsLoading(false);
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets: {[key: string]: any[]} = {};
        const detectedMappings: {[key: string]: string} = {};
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const cleanedData = jsonData.map((row: any) => {
            const cleanRow: any = {};
            Object.keys(row).forEach(key => {
              const cleanKey = key.trim();
              cleanRow[cleanKey] = row[key];
            });
            return cleanRow;
          });
          
          sheets[sheetName] = cleanedData;
          
          // Auto-detect sheet type
          const detectedType = detectSheetType(sheetName);
          if (detectedType && !detectedMappings[detectedType]) {
            detectedMappings[detectedType] = sheetName;
          }
        });
        
        setSheetsData(sheets);
        setAvailableSheets(workbook.SheetNames);
        
        // Apply detected mappings
        setSheetMappings(prev => ({
          ...prev,
          ...detectedMappings
        }));
        
        setIsLoading(false);
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

  const handleMappingChange = (entityType: 'clients' | 'workers' | 'tasks', sheetName: string) => {
    setSheetMappings(prev => ({
      ...prev,
      [entityType]: sheetName
    }));
  };

  const handleLoadData = () => {
    if (sheetMappings.clients && sheetMappings.workers && sheetMappings.tasks) {
      setClients(sheetsData[sheetMappings.clients] || []);
      setWorkers(sheetsData[sheetMappings.workers] || []);
      setTasks(sheetsData[sheetMappings.tasks] || []);
      onComplete();
    }
  };

  const canLoadData = sheetMappings.clients && sheetMappings.workers && sheetMappings.tasks;

  return (
    <div className="space-y-8">
      <div
        className={`
          relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300
          ${isDragging 
            ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-xl scale-105' 
            : uploadedFile 
            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg' 
            : 'border-border hover:border-primary/50 bg-card hover:shadow-lg'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="relative">
          <div className={`
            mx-auto mb-6 p-6 rounded-full inline-flex items-center justify-center
            ${uploadedFile 
              ? 'bg-green-100 text-green-600' 
              : 'bg-primary/10 text-primary'
            } transition-colors duration-200
          `}>
            <FileSpreadsheet className="h-12 w-12" />
          </div>
          
          {uploadedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-green-800 font-semibold text-lg">{uploadedFile.name}</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <Database className="h-4 w-4" />
                <span>{availableSheets.length} sheet(s) detected</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Single File Upload
                </h3>
                <p className="text-muted-foreground text-lg mb-2">
                  Upload one Excel file containing all your data sheets
                </p>
                <p className="text-sm text-muted-foreground">
                  We'll automatically detect and map your sheets
                </p>
              </div>
              
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="multi-file-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="multi-file-upload"
                className={`
                  inline-flex items-center px-8 py-4 text-base font-semibold rounded-xl
                  transition-all duration-200 shadow-lg hover:shadow-xl
                  ${isLoading
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 cursor-pointer'
                  }
                `}
              >
                <Upload className="h-5 w-5 mr-3" />
                {isLoading ? 'Processing...' : 'Choose File'}
              </label>
            </div>
          )}
        </div>
      </div>

      {availableSheets.length > 0 && (
        <div className="bg-card rounded-2xl border shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h4 className="text-xl font-semibold text-foreground">Smart Sheet Mapping</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['clients', 'workers', 'tasks'] as const).map((entityType) => {
              const icons = { clients: Users, workers: Briefcase, tasks: FileText };
              const Icon = icons[entityType];
              const colors = { 
                clients: 'blue', 
                workers: 'green', 
                tasks: 'purple' 
              };
              
              return (
                <div key={entityType} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <label className="text-sm font-semibold text-foreground capitalize">
                      {entityType} Data
                    </label>
                  </div>
                  <select
                    value={sheetMappings[entityType]}
                    onChange={(e) => handleMappingChange(entityType, e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground 
                      focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select sheet...</option>
                    {availableSheets.map(sheet => (
                      <option key={sheet} value={sheet}>
                        {sheet} ({sheetsData[sheet]?.length.toLocaleString() || 0} records)
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          
          {canLoadData && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadData}
                className="inline-flex items-center px-8 py-4 text-base font-semibold rounded-xl
                  bg-green-600 text-white hover:bg-green-700 transition-all duration-200 
                  shadow-lg hover:shadow-xl hover:scale-105"
              >
                <ArrowRight className="h-5 w-5 mr-3" />
                Load Data & Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function UploadPage() {
  const router = useRouter();
  const { data, setClients, setWorkers, setTasks, clearData } = useData();
  const [uploadMethod, setUploadMethod] = useState<'individual' | 'single'>('individual');
  const [isLoading, setIsLoading] = useState(false);
  
  const [fileStates, setFileStates] = useState<FileUploadState>({
    clients: { file: null, data: [], isUploaded: false },
    workers: { file: null, data: [], isUploaded: false },
    tasks: { file: null, data: [], isUploaded: false }
  });

  // Check if data is already loaded
  useEffect(() => {
    if (data.isDataLoaded) {
      router.push('/validate');
    }else {
      clearAllCaches(); // Clear any cached data on initial load
    }
  }, [data.isDataLoaded, router]);

  const handleFileUpload = (file: File, type: string) => {
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      
      if (file.name.endsWith('.csv')) {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            const cleanedData = results.data.map((row: any) => {
              const cleanRow: any = {};
              Object.keys(row).forEach(key => {
                const cleanKey = key.trim();
                cleanRow[cleanKey] = row[key];
              });
              return cleanRow;
            });
            
            setFileStates(prev => ({
              ...prev,
              [type]: { file, data: cleanedData, isUploaded: true }
            }));
            
            // Update global context
            if (type === 'clients') setClients(cleanedData);
            if (type === 'workers') setWorkers(cleanedData);
            if (type === 'tasks') setTasks(cleanedData);
            
            setIsLoading(false);
            router.push('/validate');
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const cleanedData = jsonData.map((row: any) => {
          const cleanRow: any = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanRow[cleanKey] = row[key];
          });
          return cleanRow;
        });
        
        setFileStates(prev => ({
          ...prev,
          [type]: { file, data: cleanedData, isUploaded: true }
        }));
        
        // Update global context
        if (type === 'clients') setClients(cleanedData);
        if (type === 'workers') setWorkers(cleanedData);
        if (type === 'tasks') setTasks(cleanedData);
        
        setIsLoading(false);
        router.push('/validate');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleRemoveFile = (type: string) => {
    setFileStates(prev => ({
      ...prev,
      [type]: { file: null, data: [], isUploaded: false }
    }));
    
    // Update global context
    if (type === 'clients') setClients([]);
    if (type === 'workers') setWorkers([]);
    if (type === 'tasks') setTasks([]);
  };

  const handleContinue = () => {
    router.push('/validate');
  };

  const handleSingleFileComplete = () => {
    router.push('/validate');
  };

  const allFilesUploaded = fileStates.clients.isUploaded && fileStates.workers.isUploaded && fileStates.tasks.isUploaded;

  return (
    <div className="min-h-screen bg-background w-full">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Data Alchemist
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your messy spreadsheets into clean, validated data with intelligent processing
          </p>
          
          {/* Clear Data Button */}
          {data.isDataLoaded && (
            <div className="mb-8">
              <button
                onClick={() => {
                  clearData();
                  setFileStates({
                    clients: { file: null, data: [], isUploaded: false },
                    workers: { file: null, data: [], isUploaded: false },
                    tasks: { file: null, data: [], isUploaded: false }
                  });
                }}
                className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-xl
                  text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 
                  transition-all duration-200 hover:shadow-md"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All Data & Start Over
              </button>
            </div>
          )}
          
          {/* Upload Method Selector */}
          <div className="inline-flex bg-muted p-1 rounded-xl mb-10">
            <button
              onClick={() => setUploadMethod('individual')}
              className={`px-8 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                uploadMethod === 'individual'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Individual Files
            </button>
            <button
              onClick={() => setUploadMethod('single')}
              className={`px-8 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                uploadMethod === 'single'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Single File (Multiple Sheets)
            </button>
          </div>
        </div>

        {uploadMethod === 'individual' ? (
          <div className="space-y-10">
            {/* Individual File Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FileUploadCard
                fileType="clients"
                icon={Users}
                uploadState={fileStates.clients}
                onFileUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isLoading={isLoading}
              />
              <FileUploadCard
                fileType="workers"
                icon={Briefcase}
                uploadState={fileStates.workers}
                onFileUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isLoading={isLoading}
              />
              <FileUploadCard
                fileType="tasks"
                icon={FileText}
                uploadState={fileStates.tasks}
                onFileUpload={handleFileUpload}
                onRemove={handleRemoveFile}
                isLoading={isLoading}
              />
            </div>

            {/* Progress and Continue Button */}
            {(fileStates.clients.isUploaded || fileStates.workers.isUploaded || fileStates.tasks.isUploaded) && (
              <div className="bg-card rounded-2xl border shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-foreground">Upload Progress</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(Object.values(fileStates).filter(f => f.isUploaded).length / 3) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {Object.values(fileStates).filter(f => f.isUploaded).length}/3
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {Object.entries(fileStates).map(([type, state]) => (
                    <div key={type} className={`
                      flex items-center space-x-3 p-4 rounded-xl border transition-all duration-200
                      ${state.isUploaded 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-muted/50 border-border'
                      }
                    `}>
                      {state.isUploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <span className={`capitalize font-medium ${
                          state.isUploaded ? 'text-green-800' : 'text-muted-foreground'
                        }`}>
                          {type}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {state.isUploaded ? `${state.data.length.toLocaleString()} records` : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {allFilesUploaded && (
                  <div className="text-center">
                    <button
                      onClick={handleContinue}
                      className="inline-flex items-center px-8 py-4 text-base font-semibold rounded-xl
                        bg-green-600 text-white hover:bg-green-700 transition-all duration-200 
                        shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <MultiFileUpload 
            onComplete={handleSingleFileComplete} 
            isLoading={isLoading} 
            setIsLoading={setIsLoading} 
          />
        )}
      </div>
    </div>
  );
}

          