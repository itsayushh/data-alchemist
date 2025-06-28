import { useData } from "@/contexts/DataContext";

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

export const executeQuery = (intent: QueryIntent): any[] => {
    let reData: any[] = [];
    const {data} = useData();   
    
    switch (intent.entity) {
      case 'clients':
        reData = [...data.clients];
        break;
      case 'workers':
        reData = [...data.workers];
        break;
      case 'tasks':
        reData = [...data.tasks];
        break;
    }

    // Apply filters
    const filteredData = reData.filter(item => {
      return intent.filters.every(filter => {
        const fieldValue = item[filter.field as keyof typeof item];
        
        switch (filter.operator) {
          case '=':
            return fieldValue == filter.value;
          case '!=':
            return fieldValue != filter.value;
          case '>':
            return Number(fieldValue) > Number(filter.value);
          case '>=':
            return Number(fieldValue) >= Number(filter.value);
          case '<':
            return Number(fieldValue) < Number(filter.value);
          case '<=':
            return Number(fieldValue) <= Number(filter.value);
          case 'contains':
            try {
              const arrayValue = JSON.parse(fieldValue as string);
              return Array.isArray(arrayValue) && arrayValue.includes(filter.value);
            } catch {
              return false;
            }
          case 'includes':
            return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(fieldValue);
          case 'hasAny':
            const itemSkills = String(fieldValue).split(',').map(s => s.trim());
            const requiredSkills = String(filter.value).split(',').map(s => s.trim());
            return requiredSkills.some(skill => itemSkills.includes(skill));
          case 'hasAll':
            const itemSkillsAll = String(fieldValue).split(',').map(s => s.trim());
            const requiredSkillsAll = String(filter.value).split(',').map(s => s.trim());
            return requiredSkillsAll.every(skill => itemSkillsAll.includes(skill));
          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (intent.sortBy) {
      filteredData.sort((a, b) => {
        const aVal = a[intent.sortBy!];
        const bVal = b[intent.sortBy!];
        const modifier = intent.sortOrder === 'desc' ? -1 : 1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * modifier;
        }
        return String(aVal).localeCompare(String(bVal)) * modifier;
      });
    }

    // Apply limit
    if (intent.limit) {
      return filteredData.slice(0, intent.limit);
    }

    return filteredData;
  };