'use client'
import React, { useState } from 'react';
import { Search, Database, Filter, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { getFilterFromPrompt } from '@/lib/gemini';
import { executeQuery } from '@/utils/csv-query';

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

const NLDataRetrieval = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queryIntent, setQueryIntent] = useState<QueryIntent | null>(null);
  const {data} = useData();

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

  return (

    <div className="flex flex-col mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Natural Language Data Retrieval</h1>
        <p className="text-gray-600">Search your data using plain English with Gemini AI</p>
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="e.g., 'high priority clients' or 'workers with JavaScript skills'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              <span>Search</span>
            </button>
          </div>

          {/* Sample Queries */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Try these sample queries:</p>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((sampleQuery, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(sampleQuery)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">Query Analysis</span>
          </div>
          <div className="text-sm text-blue-700">
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  {results.length > 0 && Object.keys(results[0]).map(key => (
                    <th key={key} className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-900">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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

      {/* Data Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
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

export default NLDataRetrieval;