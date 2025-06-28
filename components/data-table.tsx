
import { ValidationResult } from '@/utils/validation';
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  X, 
  Eye, 
  EyeOff,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Types
interface ValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  entity?: string;
  row?: number;
  column?: string;
  value?: any;
  suggestion?: string;
}


interface ModernDataTableProps {
  data: any[];
  type: string;
  onEdit: (index: number, field: string, value: any) => void;
  validationResult: ValidationResult | null;
  title?: string;
}

interface Column {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone';
  sortable: boolean;
  filterable: boolean;
  width?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  [key: string]: string;
}

export const ModernDataTable: React.FC<ModernDataTableProps> = ({
  data,
  type,
  onEdit,
  validationResult,
  title = 'Data Table'
}) => {
  // State management
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);


  // Auto-detect column types and create column definitions
  const columns: Column[] = useMemo(() => {
    if (data.length === 0) return [];
    
    const sampleRow = data[0];
    return Object.keys(sampleRow).map(key => {
      const value = sampleRow[key];
      let type: Column['type'] = 'text';
      
      // Auto-detect column type
      if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'string') {
        if (value.includes('@')) type = 'email';
        else if (/^\d{4}-\d{2}-\d{2}/.test(value)) type = 'date';
        else if (/^\+?[\d\s\-\(\)]+$/.test(value)) type = 'phone';
      }
      
      return {
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        type,
        sortable: true,
        filterable: true,
        width: type === 'number' ? '120px' : undefined
      };
    });
  }, [data]);

  // Get validation issues for cells
  const getValidationIssues = (rowIndex: number, column: string): ValidationError[] => {
    if (!validationResult) return [];
    
    const allIssues = [...validationResult.errors, ...validationResult.warnings];
    return allIssues.filter(issue => 
      issue.entity === type && 
      issue.row === rowIndex && 
      issue.column === column
    );
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filteredData = [...data];

    // Apply global search
    if (globalSearch) {
      filteredData = filteredData.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(globalSearch.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        filteredData = filteredData.filter(row =>
          String(row[key]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortConfig) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  }, [data, globalSearch, filters, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = processedData.slice(startIndex, endIndex);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [processedData.length]);

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleFilter = (key: string, value: string) => {
    setFilters(current => ({
      ...current,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleGlobalSearch = (value: string) => {
    setGlobalSearch(value);
    setCurrentPage(1);
  };

  const toggleColumn = (key: string) => {
    setHiddenColumns(current => {
      const newSet = new Set(current);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };



  const getCellClassName = (rowIndex: number, column: string) => {
    const issues = getValidationIssues(startIndex + rowIndex, column);
    
    if (issues.some(issue => issue.severity === 'error')) {
      return 'border-red-500';
    } else if (issues.some(issue => issue.severity === 'warning')) {
      return 'border-yellow-500';
    }
    
    return 'border-neutral-200';
  };

  const getCellTooltip = (rowIndex: number, column: string) => {
    const issues = getValidationIssues(startIndex + rowIndex, column);
    return issues.map(issue => issue.message).join('; ');
  };

  const getValidationIcon = (rowIndex: number, column: string) => {
    const issues = getValidationIssues(startIndex + rowIndex, column);
    if (issues.length === 0) return null;
    
    const hasError = issues.some(issue => issue.severity === 'error');
    const hasWarning = issues.some(issue => issue.severity === 'warning');
    
    if (hasError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (hasWarning) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.key));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
        <div className="text-neutral-500">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
          <h3 className="text-lg font-medium mb-2">No Data Available</h3>
          <p className="text-sm">Upload a file to see your data in this modern table view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted border">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-foreground">
              {processedData.length} of {data.length} records
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Global Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground" />
              <input
                type="text"
                placeholder="Search all columns..."
                value={globalSearch}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {globalSearch && (
                <button
                  onClick={() => handleGlobalSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border ${
                showFilters 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'border-neutral-300 text-neutral-500 hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
            
            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg border border-neutral-300 text-neutral-500 hover:bg-accent hover:text-accent-foreground"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Column Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {columns.map(column => (
                <div key={column.key} className="space-y-2">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    {column.label}
                    <button
                      onClick={() => toggleColumn(column.key)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      {hiddenColumns.has(column.key) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </label>
                  {column.filterable && (
                    <input
                      type="text"
                      placeholder={`Filter ${column.label}...`}
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilter(column.key, e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-neutral-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-forground uppercase tracking-wider">
                #
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-semibold text-forground uppercase"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="text-foreground hover:text-accent-foreground"
                      >
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <div className="flex flex-col">
                            <ChevronUp className="h-3 w-3 -mb-1" />
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-foreground/20">
            {paginatedData.map((row, index) => {
              const actualIndex = startIndex + index;
              
              return (
                <tr 
                  key={actualIndex} 
                  className="hover:bg-foreground/5"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {startIndex + index + 1}
                  </td>
                  {visibleColumns.map((column) => {
                    const cellClass = getCellClassName(index, column.key);
                    const tooltip = getCellTooltip(index, column.key);
                    const validationIcon = getValidationIcon(index, column.key);
                    
                    return (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <input
                              type="text"
                              value={row[column.key] || ''}
                              onChange={(e) => onEdit(actualIndex, column.key, e.target.value)}
                              className={`w-full border rounded p-2 text-sm bg-foreground/3 ${cellClass.replace('focus:ring-blue-500 focus:border-blue-500', 'focus:ring-primary focus:border-primary')}`}
                            />
                          {validationIcon && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              {validationIcon}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with Pagination */}
      <div className="px-6 py-4 border-t border-muted flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-foreground">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-forground/10 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-foreground">per page</span>
          </div>
          
          <div className="text-sm text-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, processedData.length)} of {processedData.length} results
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 border border-neutral-300 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 border border-neutral-300 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === page
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="text-neutral-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === totalPages
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-neutral-100'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 border border-neutral-300 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 border border-neutral-300 rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Demo component to show the table in action
// const TableDemo = () => {
//   // Sample data for demonstration
//   const [sampleData] = useState([
//     { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890', salary: 75000, department: 'Engineering', joinDate: '2023-01-15' },
//     { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', salary: 82000, department: 'Marketing', joinDate: '2023-02-20' },
//     { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', salary: 68000, department: 'Sales', joinDate: '2023-03-10' },
//     { id: 4, name: 'Alice Brown', email: 'alice@example.com', phone: '+1234567893', salary: 91000, department: 'Engineering', joinDate: '2023-01-25' },
//     { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', phone: '+1234567894', salary: 77000, department: 'HR', joinDate: '2023-04-05' },
//     { id: 6, name: 'Diana Prince', email: 'diana@example.com', phone: '+1234567895', salary: 89000, department: 'Engineering', joinDate: '2023-02-15' },
//     { id: 7, name: 'Edward Norton', email: 'edward@example.com', phone: '+1234567896', salary: 73000, department: 'Marketing', joinDate: '2023-03-20' },
//     { id: 8, name: 'Fiona Green', email: 'fiona@example.com', phone: '+1234567897', salary: 71000, department: 'Sales', joinDate: '2023-04-10' },
//     { id: 9, name: 'George Miller', email: 'george@example.com', phone: '+1234567898', salary: 85000, department: 'Engineering', joinDate: '2023-01-30' },
//     { id: 10, name: 'Helen Davis', email: 'helen@example.com', phone: '+1234567899', salary: 79000, department: 'HR', joinDate: '2023-03-25' },
//   ]);

//   // Sample validation result
//   const [validationResult] = useState({
//     isValid: false,
//     errors: [
//       {
//         type: 'INVALID_EMAIL',
//         message: 'Invalid email format',
//         severity: 'error' as const,
//         entity: 'employees',
//         row: 2,
//         column: 'email',
//         value: 'jane@example.com',
//         suggestion: 'Check email format'
//       }
//     ],
//     warnings: [
//       {
//         type: 'LOW_SALARY',
//         message: 'Salary below market average',
//         severity: 'warning' as const,
//         entity: 'employees',
//         row: 2,
//         column: 'salary',
//         value: 68000,
//         suggestion: 'Consider salary adjustment'
//       }
//     ],
//     summary: {
//       totalErrors: 1,
//       totalWarnings: 1,
//       entityCounts: {
//         clients: 0,
//         workers: 10,
//         tasks: 0
//       }
//     }
//   });

//   const handleEdit = (index: number, field: string, value: any) => {
//     console.log(`Editing row ${index}, field ${field}, new value:`, value);
//     // In a real app, this would update the data
//   };

//   return (
//     <div className="p-8 bg-gray-50 min-h-screen">
//       <div className="max-w-7xl mx-auto">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">Modern Data Table</h1>
//           <p className="text-gray-600">
//             A feature-rich data table with sorting, searching, filtering, pagination, and validation feedback.
//           </p>
//         </div>
        
//         <ModernDataTable
//           data={sampleData}
//           type="employees"
//           onEdit={handleEdit}
//           validationResult={validationResult}
//           title="Employee Data"
//         />
//       </div>
//     </div>
//   );
// };

// export default TableDemo;