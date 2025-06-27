  'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Users, Briefcase, CheckCircle, AlertCircle, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useData } from '@/contexts/DataContext';

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

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'clients': return 'Clients';
      case 'workers': return 'Workers';
      case 'tasks': return 'Tasks';
      default: return type;
    }
  };
  
  return (
    <div className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
      uploadState.isUploaded 
        ? 'border-green-300 bg-green-50' 
        : isDragging 
        ? 'border-blue-400 bg-blue-50' 
        : 'border-gray-300 hover:border-gray-400'
    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
    onDragLeave={() => setIsDragging(false)}
    onDrop={handleDrop}
    >
      <div className="text-center">
        <Icon className={`mx-auto h-12 w-12 mb-4 ${
          uploadState.isUploaded ? 'text-green-500' : 'text-gray-400'
        }`} />
        
        {uploadState.isUploaded ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">{uploadState.file?.name}</span>
            </div>
            <p className="text-sm text-green-600">{uploadState.data.length} records loaded</p>
            <button
              onClick={() => onRemove(fileType)}
              className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">{getFileTypeLabel(fileType)}</h3>
            <p className="text-sm text-gray-600">
              Drop your {fileType} file here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports CSV, XLSX, XLS files
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
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isLoading ? 'Processing...' : 'Choose File'}
            </label>
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
            setIsLoading(false);
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets: {[key: string]: any[]} = {};
        
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
        });
        
        setSheetsData(sheets);
        setAvailableSheets(workbook.SheetNames);
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
    <div className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-400 bg-blue-50' : uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <FileText className={`mx-auto h-16 w-16 mb-4 ${uploadedFile ? 'text-green-500' : 'text-gray-400'}`} />
        
        {uploadedFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">{uploadedFile.name}</span>
            </div>
            <p className="text-sm text-green-600">{availableSheets.length} sheet(s) found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-gray-900">Upload Single File with Multiple Sheets</h3>
            <p className="text-gray-600">
              Drop your Excel/CSV file here containing all three datasets
            </p>
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
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              <Upload className="h-5 w-5 mr-2" />
              {isLoading ? 'Processing...' : 'Choose File'}
            </label>
          </div>
        )}
      </div>

      {availableSheets.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="text-lg font-medium mb-4">Map Sheets to Data Types</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['clients', 'workers', 'tasks'] as const).map((entityType) => (
              <div key={entityType} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 capitalize">
                  {entityType} Sheet
                </label>
                <select
                  value={sheetMappings[entityType]}
                  onChange={(e) => handleMappingChange(entityType, e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select sheet...</option>
                  {availableSheets.map(sheet => (
                    <option key={sheet} value={sheet}>
                      {sheet} ({sheetsData[sheet]?.length || 0} records)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          
          {canLoadData && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadData}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
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

  // Check if data is already loaded from localStorage
  useEffect(() => {
    if (data.isDataLoaded) {
      // If data exists, navigate to validation page
      router.push('/validate');
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Alchemist</h1>
          <p className="text-lg text-gray-600 mb-8">
            Transform your messy spreadsheets into clean, validated data
          </p>
          
          {/* Clear Data Button */}
          {data.isDataLoaded && (
            <div className="mb-6">
              <button
                onClick={() => {
                  clearData();
                  setFileStates({
                    clients: { file: null, data: [], isUploaded: false },
                    workers: { file: null, data: [], isUploaded: false },
                    tasks: { file: null, data: [], isUploaded: false }
                  });
                }}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All Data & Start Over
              </button>
            </div>
          )}
          
          {/* Upload Method Selector */}
          <div className="flex justify-center space-x-1 mb-8">
            <button
              onClick={() => setUploadMethod('individual')}
              className={`px-6 py-3 text-sm font-medium rounded-l-lg ${
                uploadMethod === 'individual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Individual Files
            </button>
            <button
              onClick={() => setUploadMethod('single')}
              className={`px-6 py-3 text-sm font-medium rounded-r-lg ${
                uploadMethod === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Single File (Multiple Sheets)
            </button>
          </div>
        </div>

        {uploadMethod === 'individual' ? (
          <div className="space-y-8">
            {/* Individual File Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Upload Progress</h3>
                  <span className="text-sm text-gray-500">
                    {Object.values(fileStates).filter(f => f.isUploaded).length}/3 files uploaded
                  </span>
                </div>
                
                <div className="space-y-2 mb-6">
                  {Object.entries(fileStates).map(([type, state]) => (
                    <div key={type} className="flex items-center space-x-3">
                      {state.isUploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className={`capitalize ${state.isUploaded ? 'text-green-700' : 'text-gray-500'}`}>
                        {type} {state.isUploaded ? `(${state.data.length} records)` : '- Not uploaded'}
                      </span>
                    </div>
                  ))}
                </div>

                {allFilesUploaded && (
                  <div className="text-center">
                    <button
                      onClick={handleContinue}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <ArrowRight className="h-5 w-5 mr-2" />
                      Continue to Validation
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