'use client'
import React, { useState } from 'react';
import { Search, Database, Filter, AlertCircle, CheckCircle, Loader2, Edit3, Plus, Trash2, Eye, Play } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { getFilterFromPrompt, generateDataModification } from '@/lib/gemini';
import { executeQuery } from '@/utils/csv-query';
import { DataModificationPlan, executeDataModification, previewModification, validateModificationPlan } from '@/utils/data-modification';

interface FilterCriteria {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface QueryIntent {
  entity: 'clients' | 'workers' | 'tasks';
  filters: FilterCriteria[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

const AIDataManagement = () => {
  // Data retrieval state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queryIntent, setQueryIntent] = useState<QueryIntent | null>(null);
  
  // Data modification state
  const [modificationQuery, setModificationQuery] = useState('');
  const [modificationPlan, setModificationPlan] = useState<DataModificationPlan | null>(null);
  const [modificationLoading, setModificationLoading] = useState(false);
  const [modificationError, setModificationError] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'retrieval' | 'modification'>('retrieval');
  
  const { data, applyDataModification } = useData();

  const handleSearch = async () => {

    setLoading(true);
    setError('');
    setResults([]);
    setQueryIntent(null);

    try {
      const intent = await getFilterFromPrompt(query);
      setQueryIntent(intent as QueryIntent);
      
      const searchResults = executeQuery(intent as QueryIntent,data);
      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Data modification functions
  const handleModificationAnalysis = async () => {
    setModificationLoading(true);
    setModificationError('');
    setModificationPlan(null);
    setPreviewData(null);

    try {
      const plan = await generateDataModification(modificationQuery, data);
      setModificationPlan(plan as DataModificationPlan);
      
      // Generate preview
      const preview = previewModification(plan as DataModificationPlan, data);
      setPreviewData(preview);
    } catch (err) {
      setModificationError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setModificationLoading(false);
    }
  };

  const handleExecuteModification = async () => {
    if (!modificationPlan) return;

    // Validate the plan
    const validationErrors = validateModificationPlan(modificationPlan, data);
    if (validationErrors.length > 0) {
      setModificationError(`Validation failed: ${validationErrors.join(', ')}`);
      return;
    }

    try {
      const result = executeDataModification(modificationPlan, data);
      
      if (result.success) {
        // Apply the changes to the data context
        applyDataModification(result.modifiedData);
        
        // Show success message
        alert(`Modification successful! Added: ${result.changes.added}, Updated: ${result.changes.updated}, Deleted: ${result.changes.deleted}`);
        
        // Clear the modification state
        setModificationPlan(null);
        setPreviewData(null);
        setModificationQuery('');
      } else {
        setModificationError(`Modification failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setModificationError(err instanceof Error ? err.message : 'An error occurred during modification');
    }
  };

  const sampleQueries = [
    "high priority clients",
    "workers with JavaScript skills",
    "tasks with duration more than 2 phases",
    "clients in Enterprise group",
    "workers available in phase 2",
    "tasks requiring Python skills",
    "clients with priority level 5",
    "workers in Frontend group"
  ];

  const sampleModifications = [
    "Increase priority level of all Enterprise clients by 1",
    "Add a new worker named John with JavaScript and Python skills",
    "Update all Frontend workers to have max 3 slots per phase",
    "Remove tasks with duration less than 1 phase",
    "Set all UI tasks to run only in phases 2-4",
    "Change client ABC123 priority to level 5",
    "Add React skill to all Frontend workers",
    "Delete all completed tasks"
  ];

  return (

    <div className="flex flex-col mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Natural Language Data Retrieval</h1>
        <p className="text-foreground/50">Search your data using plain English with Gemini AI</p>
      </div>

      {/* Search Interface */}
      <div className="bg-secondary rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/70 w-5 h-5" />
              <input
                type="text"
                placeholder="e.g., 'high priority clients' or 'workers with JavaScript skills'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-foreground rounded-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/70 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>Search</span>
            </button>
          </div>

          {/* Sample Queries */}
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">Try these sample queries:</p>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sampleQuery, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(sampleQuery)}
                  className="px-3 py-1 text-sm bg-accent text-foreground rounded-full transition-colors"
                >
                  {sampleQuery}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Query Intent Display */}
      {queryIntent && (
        <div className="bg-accent border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Filter className="w-5 h-5 text-accent-foreground" />
            <span className="font-medium text-accent-foreground">Query Analysis</span>
          </div>
          <div className="text-sm text-accent-foreground">
            <p><strong>Entity:</strong> {queryIntent.entity}</p>
            <p><strong>Filters:</strong></p>
            <ul className="ml-4 space-y-1">
              {queryIntent.filters.map((filter, index) => (
                <li key={index}>
                  {filter.field} {filter.operator} "{filter.value}"
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}  

      {/* Results Display */}
      {results.length > 0 && (
        <div className="bg-muted rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-muted">
                  {results.length > 0 && Object.keys(results[0]).map(key => (
                    <th key={key} className="border px-4 py-2 text-left font-medium text-foreground">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-muted'}>
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Modification Interface */}
      <div className="bg-secondary rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Edit3 className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-800">Data Modification</span>
        </div>
        <div className="space-y-4">
          {/* Modification Query Input */}
          <div className="relative">
            <textarea
              placeholder="Describe the modification, e.g., 'Add a new client named John Doe'"
              value={modificationQuery}
              onChange={(e) => setModificationQuery(e.target.value)}
              className="w-full p-4 border border-foreground rounded-lg resize-none h-24"
            />
            <div className="absolute right-3 top-3 flex space-x-2">
              <button
                onClick={handleModificationAnalysis}
                disabled={modificationLoading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {modificationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                <span>Analyze</span>
              </button>
              <button
                onClick={handleExecuteModification}
                disabled={modificationLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {modificationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                <span>Execute</span>
              </button>
            </div>
          </div>

          {/* Modification Plan Display */}
          {modificationPlan && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="font-medium text-blue-800 mb-2">Modification Plan</div>
              <pre className="text-sm text-blue-700 whitespace-pre-wrap">{JSON.stringify(modificationPlan, null, 2)}</pre>
            </div>
          )}

          {/* Preview Data Display */}
          {previewData && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="font-medium text-green-800 mb-4">Preview Changes</div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">+{previewData.estimatedChanges.added}</div>
                  <div className="text-sm text-green-800">Added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">~{previewData.estimatedChanges.updated}</div>
                  <div className="text-sm text-blue-800">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">-{previewData.estimatedChanges.deleted}</div>
                  <div className="text-sm text-red-800">Deleted</div>
                </div>
              </div>

              {previewData.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-800 mb-1">Warnings:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {previewData.warnings.map((warning: string, index: number) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {previewData.affectedRecords.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-800 mb-2">Affected Records ({previewData.affectedRecords.length}):</h4>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-muted">
                          {previewData.affectedRecords.length > 0 && Object.keys(previewData.affectedRecords[0]).map((key: string) => (
                            <th key={key} className="border px-4 py-2 text-left font-medium text-foreground">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.affectedRecords.map((row: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-muted'}>
                            {Object.values(row).map((value: any, cellIndex: number) => (
                              <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 flex space-x-4">
                <button
                  onClick={handleExecuteModification}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Modification</span>
                </button>
                <button
                  onClick={() => {
                    setModificationPlan(null);
                    setPreviewData(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Modification Error Display */}
          {modificationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Error</span>
              </div>
              <p className="text-red-700 mt-1">{modificationError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Data Overview */}
      <div className="bg-secondary rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-800">Available Data</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-800">Clients</div>
            <div className="text-blue-600">{data.clients.length} records</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="font-medium text-green-800">Workers</div>
            <div className="text-green-600">{data.workers.length} records</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="font-medium text-purple-800">Tasks</div>
            <div className="text-purple-600">{data.tasks.length} records</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDataManagement;