'use client'
import React, { useState } from 'react';
import { Search, Database, Filter, AlertCircle, CheckCircle, Loader2, Edit3, Plus, Trash2, Eye, Play } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { getFilterFromPrompt, generateDataModification } from '@/lib/gemini';
import { executeQuery } from '@/utils/csv-query';
import { DataModificationPlan, executeDataModification, previewModification, validateModificationPlan } from '@/utils/data-modification';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">AI Data Management</h1>
          <p className="text-muted-foreground">Query and modify your data using natural language</p>
        </div>

        {/* Search Interface */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-primary" />
            <h2 className="font-medium text-foreground">Search Data</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter your query in natural language..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sampleQuery, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(sampleQuery)}
                  className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-md"
                >
                  {sampleQuery}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Query Intent Display */}
        {queryIntent && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Query Analysis</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Entity: </span>
                <span className="font-medium text-foreground">{queryIntent.entity}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Filters: </span>
                {queryIntent.filters.map((filter, index) => (
                  <span key={index} className="inline-block bg-muted px-2 py-1 rounded text-xs mr-1">
                    {filter.field} {filter.operator} "{filter.value}"
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}  

        {/* Results Display */}
        {results.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </span>
              </div>
            </div>
            
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    {results.length > 0 && Object.keys(results[0]).map(key => (
                      <th key={key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, index) => (
                    <tr key={index} className="border-t border-border hover:bg-muted/30">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-sm text-foreground border-r border-border last:border-r-0">
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
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit3 className="w-4 h-4 text-primary" />
            <h2 className="font-medium text-foreground">Modify Data</h2>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <textarea
                placeholder="Describe your data modification..."
                value={modificationQuery}
                onChange={(e) => setModificationQuery(e.target.value)}
                className="w-full p-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none h-24"
              />
              <div className="absolute right-3 bottom-3 flex gap-2">
                <button
                  onClick={handleModificationAnalysis}
                  disabled={modificationLoading || !modificationQuery.trim()}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                >
                  {modificationLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Analyze
                </button>
                {modificationPlan && (
                  <button
                    onClick={handleExecuteModification}
                    disabled={modificationLoading}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Execute
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {sampleModifications.map((sampleMod, index) => (
                <button
                  key={index}
                  onClick={() => setModificationQuery(sampleMod)}
                  className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-md"
                >
                  {sampleMod}
                </button>
              ))}
            </div>

            {/* Modification Plan Display */}
            {modificationPlan && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Modification Plan</span>
                </div>
                <pre className="text-xs text-foreground bg-background p-3 rounded border overflow-auto">
                  {JSON.stringify(modificationPlan, null, 2)}
                </pre>
              </div>
            )}

            {/* Preview Data Display */}
            {previewData && (
              <div className="bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Preview Changes</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">+{previewData.estimatedChanges.added}</div>
                    <div className="text-xs text-green-600">Added</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">~{previewData.estimatedChanges.updated}</div>
                    <div className="text-xs text-blue-600">Updated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">-{previewData.estimatedChanges.deleted}</div>
                    <div className="text-xs text-red-600">Deleted</div>
                  </div>
                </div>

                {previewData.warnings.length > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-400">Warnings</span>
                    </div>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      {previewData.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewData.affectedRecords.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                      Affected Records ({previewData.affectedRecords.length})
                    </div>
                    <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            {previewData.affectedRecords.length > 0 && Object.keys(previewData.affectedRecords[0]).map((key: string) => (
                              <th key={key} className="px-2 py-1 text-left font-medium text-muted-foreground border-r border-border last:border-r-0">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.affectedRecords.map((row: any, index: number) => (
                            <tr key={index} className="border-t border-border">
                              {Object.values(row).map((value: any, cellIndex: number) => (
                                <td key={cellIndex} className="px-2 py-1 text-foreground border-r border-border last:border-r-0">
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

                <div className="flex gap-3">
                  <button
                    onClick={handleExecuteModification}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Execute
                  </button>
                  <button
                    onClick={() => {
                      setModificationPlan(null);
                      setPreviewData(null);
                    }}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Modification Error Display */}
            {modificationError && (
              <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Error: {modificationError}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Overview */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-medium text-foreground">Data Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Clients</div>
                  <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">{data.clients.length}</div>
                </div>
                <Database className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-600 dark:text-green-400">Workers</div>
                  <div className="text-lg font-semibold text-green-700 dark:text-green-300">{data.workers.length}</div>
                </div>
                <Database className="w-5 h-5 text-green-500" />
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Tasks</div>
                  <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">{data.tasks.length}</div>
                </div>
                <Database className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDataManagement;