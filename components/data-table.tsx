import { ValidationResult } from '@/utils/data-validation';
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
import { Select, SelectContent, SelectItem, SelectValue } from './ui/select';
import { SelectTrigger } from '@radix-ui/react-select';

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
  minWidth?: string;
  maxWidth?: string;
  priority: number; // For responsive hiding
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

  // Calculate optimal column widths based on content
  const calculateColumnWidth = (column: Column, values: any[]): string => {
    if (column.width) return column.width;
    
    // Sample content to estimate width
    const sampleValues = values.slice(0, Math.min(100, values.length));
    const maxLength = Math.max(
      column.label.length,
      ...sampleValues.map(val => String(val || '').length)
    );
    
    // Base width calculations by type
    switch (column.type) {
      case 'number':
        return `${Math.max(80, Math.min(120, maxLength * 8 + 40))}px`;
      case 'date':
        return `${Math.max(120, Math.min(160, maxLength * 8 + 40))}px`;
      case 'email':
        return `${Math.max(180, Math.min(250, maxLength * 7 + 40))}px`;
      case 'phone':
        return `${Math.max(130, Math.min(170, maxLength * 8 + 40))}px`;
      default:
        // Text fields - dynamic based on content
        if (maxLength < 10) return `${Math.max(100, maxLength * 10 + 40)}px`;
        if (maxLength < 20) return `${Math.max(140, maxLength * 8 + 40)}px`;
        if (maxLength < 40) return `${Math.max(200, maxLength * 6 + 40)}px`;
        return `${Math.min(300, maxLength * 5 + 40)}px`;
    }
  };

  // Auto-detect column types and create column definitions with dynamic sizing
  const columns: Column[] = useMemo(() => {
    if (data.length === 0) return [];
    
    const sampleRow = data[0];
    return Object.keys(sampleRow).map((key, index) => {
      const values = data.map(row => row[key]);
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
      
      // Calculate priority for responsive behavior
      const priority = (() => {
        if (['id', 'name', 'title'].includes(key.toLowerCase())) return 1;
        if (['email', 'phone', 'status'].includes(key.toLowerCase())) return 2;
        if (type === 'number') return 3;
        return 4;
      })();
      
      return {
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        type,
        sortable: true,
        filterable: true,
        width: calculateColumnWidth({ key, label: '', type, sortable: true, filterable: true, priority } as Column, values),
        minWidth: type === 'number' ? '80px' : '100px',
        maxWidth: type === 'text' ? '300px' : undefined,
        priority
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
      return 'border-2 border-red-300';
    } else if (issues.some(issue => issue.severity === 'warning')) {
      return 'border-2 border-yellow-400';
    }
    
    return '';
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

  // Get cell input type and props based on column type
  const getCellInputProps = (column: Column, value: any) => {
    const baseProps = {
      value: value ?? '',
      className: `w-full h-full border-0 text-foreground/90 rounded px-2 py-1 text-sm bg-transparent focus:bg-background focus:ring-1 focus:ring-primary resize-none`,
    };

    switch (column.type) {
      case 'number':
        return {
          ...baseProps,
          type: 'number',
          className: `${baseProps.className} text-right`,
        };
      case 'email':
        return {
          ...baseProps,
          type: 'email',
        };
      case 'date':
        return {
          ...baseProps,
          type: 'date',
        };
      default:
        // For text content that might be long, use textarea
        const isLongText = String(value || '').length > 50;
        if (isLongText) {
          return {
            ...baseProps,
            as: 'textarea',
            rows: 1,
            className: `${baseProps.className} min-h-[2rem] overflow-hidden`,
          };
        }
        return baseProps;
    }
  };

  const visibleColumns = columns.filter(col => !hiddenColumns.has(col.key));

  if (data.length === 0) {
    return (
      <div className="bg-background rounded-lg shadow-sm border border-border p-8 text-center">
        <div className="text-muted-foreground">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No Data Available</h3>
          <p className="text-sm">Upload a file to see your data in this modern table view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {processedData.length} of {data.length} records
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Global Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search all columns..."
                value={globalSearch}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-background"
              />
              {globalSearch && (
                <button
                  onClick={() => handleGlobalSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
            
            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Column Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {columns.map(column => (
                <div key={column.key} className="space-y-2">
                  <label className="text-xs font-medium text-foreground flex items-center justify-between">
                    {column.label}
                    <button
                      onClick={() => toggleColumn(column.key)}
                      className="text-muted-foreground hover:text-foreground"
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
                      className="w-full px-3 py-1 text-sm border border-border rounded focus:ring-1 focus:ring-primary focus:border-primary bg-background"
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
        <table className="w-full divide-y divide-border" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-muted/30">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-r border-border/50"
                style={{ width: '60px', minWidth: '60px' }}
              >
                #
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider border-r border-border/50 last:border-r-0"
                  style={{ 
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth 
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span className="truncate">{column.label}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
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
          <tbody className="bg-background divide-y divide-border">
            {paginatedData.map((row, index) => {
              const actualIndex = startIndex + index;
              
              return (
                <tr 
                  key={actualIndex} 
                  className="hover:bg-muted/20 group"
                  style={{ height: '3rem' }}
                >
                  <td className="px-4 py-2 text-sm text-muted-foreground border-r border-border/30 group-hover:border-border/50">
                    <div className="flex items-center h-full">
                      {startIndex + index + 1}
                    </div>
                  </td>
                  {visibleColumns.map((column) => {
                    const cellClass = getCellClassName(index, column.key);
                    const tooltip = getCellTooltip(index, column.key);
                    const validationIcon = getValidationIcon(index, column.key);
                    const inputProps = getCellInputProps(column, row[column.key]);
                    
                    return (
                      <td 
                        key={column.key} 
                        className={`px-2 py-1 border-r border-border/30 group-hover:border-border/50 last:border-r-0 `}
                        title={tooltip}
                      >
                        <div className="relative h-full flex items-center ">
                          {inputProps.value === 'textarea' ? (
                            <textarea
                              {...inputProps}
                              onChange={(e) => onEdit(actualIndex, column.key, e.target.value)}
                              className={`${inputProps.className} ${cellClass}`}
                            />
                          ) : (
                            <input
                              {...inputProps}
                              onChange={(e) => onEdit(actualIndex, column.key, e.target.value)}
                              className={`${inputProps.className} ${cellClass}`}
                            />
                          )}
                          {validationIcon && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex-shrink-0">
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
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
              // className="border border-border rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-background"
            >
              <SelectTrigger className="border border-border rounded px-3 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-background">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
               <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-foreground">per page</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, processedData.length)} of {processedData.length} results
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 border border-border rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 border border-border rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="text-muted-foreground">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === totalPages
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
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
            className="p-2 border border-border rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 border border-border rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};