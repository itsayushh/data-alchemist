// services/geminiService.ts
'use server'
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


  const dataSchema = {
    clients: {
      fields: {
        ClientID: "string - unique identifier",
        ClientName: "string - name of the client",
        PriorityLevel: "number (1-5) - priority level, 5 is highest",
        RequestedTaskIDs: "string - comma-separated task IDs",
        GroupTag: "string - client group",
        AttributesJSON: "string - JSON metadata"
      }
    },
    workers: {
      fields: {
        WorkerID: "string - unique identifier",
        WorkerName: "string - name of the worker",
        Skills: "string - comma-separated skills",
        AvailableSlots: "string - array of available phase numbers",
        MaxLoadPerPhase: "number - maximum tasks per phase",
        WorkerGroup: "string - worker group",
        QualificationLevel: "number (1-5) - skill level"
      }
    },
    tasks: {
      fields: {
        TaskID: "string - unique identifier",
        TaskName: "string - name of the task",
        Category: "string - task category",
        Duration: "number - duration in phases (≥1)",
        RequiredSkills: "string - comma-separated required skills",
        PreferredPhases: "string - array or range of preferred phases",
        MaxConcurrent: "number - maximum concurrent assignments"
      }
    }
  };


export async function getFilterFromPrompt(prompt: string): Promise<Record<string, any>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  const query = `
You are a data query analyzer. Convert natural language queries to structured filter criteria.

DATA SCHEMA:
${JSON.stringify(dataSchema, null, 2)}

AVAILABLE OPERATORS:
- "=", "!=", ">", ">=", "<", "<=": for numbers and strings
- "contains": check if array/list contains value
- "includes": check if string includes substring
- "in": check if value is in array
- "hasAny": check if any items in comma-separated list match
- "hasAll": check if all items in comma-separated list match

QUERY: "${prompt}"

Return ONLY a JSON object with this structure:
{
  "entity": "clients|workers|tasks",
  "filters": [
    {
      "field": "fieldName",
      "operator": "operatorName", 
      "value": "value",
      "logicalOperator": "AND|OR" (optional, defaults to AND)
    }
  ],
  "sortBy": "fieldName" (optional),
  "sortOrder": "asc|desc" (optional),
  "limit": number (optional)
}

Examples:
- "high priority clients" → {"entity": "clients", "filters": [{"field": "PriorityLevel", "operator": ">=", "value": 4}]}
- "tasks with duration more than 2 phases" → {"entity": "tasks", "filters": [{"field": "Duration", "operator": ">", "value": 2}]}
- "workers with JavaScript skills" → {"entity": "workers", "filters": [{"field": "Skills", "operator": "includes", "value": "JavaScript"}]}
`

try {
    const result = await model.generateContent(query);
  const response = await result.response;

      if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }
      const generatedText = response.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      return JSON.parse(jsonMatch[0]);
} catch (error) {
    console.error('Error analyzing query with Gemini:', error);
    throw error;
}
}

export async function fixValidationErrors(validationErrors: any[], dataContext: any): Promise<any> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  const query = `
You are a data validation expert. Given validation errors and data context, provide automated fixes.

DATA CONTEXT:
${JSON.stringify(dataContext, null, 2)}

VALIDATION ERRORS:
${JSON.stringify(validationErrors, null, 2)}

For each error, analyze the context and suggest the most appropriate fix. Return a JSON object with this structure:
{
  "fixes": [
    {
      "entity": "clients|workers|tasks",
      "row": number,
      "column": "fieldName",
      "originalValue": "current value",
      "suggestedValue": "fixed value",
      "reason": "explanation of why this fix is recommended",
      "confidence": "high|medium|low"
    }
  ],
  "summary": {
    "totalFixes": number,
    "highConfidenceFixes": number,
    "warnings": ["any warnings about fixes that need manual review"]
  }
}

Focus on:
1. Range corrections (e.g., priority levels 1-5)
2. Format standardization (e.g., proper JSON, array formats)
3. Reference validation (e.g., valid task IDs)
4. Data consistency (e.g., skill matching, phase alignment)
5. Business logic compliance

Provide conservative, safe fixes that maintain data integrity.
`;

  try {
    const result = await model.generateContent(query);
    const response = await result.response;
    
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const generatedText = response.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error fixing validation with Gemini:', error);
    throw error;
  }
}

export async function createRuleFromNaturalLanguage(prompt: string, dataContext: any): Promise<any> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  const query = `
You are a business rule creation expert. Convert natural language descriptions into structured business rules.

DATA CONTEXT:
${JSON.stringify(dataContext, null, 2)}

AVAILABLE RULE TYPES:
1. coRun: Tasks that must execute simultaneously
2. slotRestriction: Minimum resource requirements for groups  
3. loadLimit: Maximum workload limits for worker groups
4. phaseWindow: Restrict task execution to specific phases

USER REQUEST: "${prompt}"

Analyze the request and return a JSON object with this structure:
{
  "isValid": boolean,
  "ruleType": "coRun|slotRestriction|loadLimit|phaseWindow",
  "rule": {
    "name": "descriptive rule name",
    "description": "detailed description of what this rule does",
    // Rule-specific fields based on type:
    
    // For coRun:
    "tasks": ["task1", "task2"], // actual task IDs from data
    
    // For slotRestriction:
    "groupType": "client|worker",
    "groupId": "actual group ID from data",
    "minCommonSlots": number,
    
    // For loadLimit:
    "workerGroup": "actual worker group from data",
    "maxSlotsPerPhase": number,
    
    // For phaseWindow:
    "taskId": "actual task ID from data",
    "allowedPhases": [phase numbers]
  },
  "validation": {
    "errors": ["any validation issues"],
    "warnings": ["any concerns or suggestions"],
    "confidence": "high|medium|low"
  },
  "explanation": "detailed explanation of how the natural language was interpreted"
}

Examples:
- "Frontend and backend tasks should run together" → coRun rule with relevant task IDs
- "Enterprise clients need at least 3 common time slots" → slotRestriction rule
- "Backend team can't handle more than 2 tasks per phase" → loadLimit rule
- "UI tasks should only run in phases 2-4" → phaseWindow rule

Use actual IDs and values from the provided data context. If the request cannot be fulfilled with available data, set isValid to false and explain why.
`;

  try {
    const result = await model.generateContent(query);
    const response = await result.response;
    
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const generatedText = response.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error creating rule with Gemini:', error);
    throw error;
  }
}

export async function generateDataModification(prompt: string, dataContext: any): Promise<any> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  const query = `
You are a data modification expert. Convert natural language requests into structured data modification operations.

DATA SCHEMA:
${JSON.stringify(dataSchema, null, 2)}

CURRENT DATA CONTEXT:
${JSON.stringify(dataContext, null, 2)}

AVAILABLE MODIFICATION TYPES:
1. "update": Modify existing records based on criteria
2. "add": Create new records  
3. "delete": Remove records based on criteria
4. "bulk_update": Modify multiple records with same changes
5. "conditional_update": Update records only if conditions are met

USER REQUEST: "${prompt}"

Return ONLY a JSON object with this structure:
{
  "isValid": boolean,
  "modificationType": "update|add|delete|bulk_update|conditional_update",
  "entity": "clients|workers|tasks",
  "operations": [
    {
      "action": "update|add|delete",
      "target": {
        // For updates/deletes: criteria to select records  
        "filters": [
          {
            "field": "fieldName",
            "operator": "=|!=|>|>=|<|<=|contains|includes|in",
            "value": "value"
          }
        ],
        // For adds: specify "new" 
        "type": "existing|new"
      },
      "changes": {
        // Field-value pairs for updates/adds
        "fieldName": "newValue"
      },
      "reason": "explanation for this operation",
      "affectedCount": "estimated number of records affected"
    }
  ],
  "validation": {
    "errors": ["any validation issues"],
    "warnings": ["potential concerns or side effects"],
    "confidence": "high|medium|low",
    "suggestedReview": boolean
  },
  "summary": {
    "description": "human-readable summary of what will be changed",
    "totalAffected": "estimated total records affected",
    "riskLevel": "low|medium|high"
  },
  "explanation": "detailed explanation of how the request was interpreted"
}

EXAMPLES:
- "Increase priority level of all Enterprise clients by 1" → bulk_update operation
- "Add a new worker named John with JavaScript skills" → add operation  
- "Remove all tasks with duration less than 1" → delete operation
- "Update client ABC123 to priority level 5" → update operation
- "Set all Frontend workers to have max 3 slots per phase" → conditional_update operation

IMPORTANT GUIDELINES:
1. Always validate field values against schema constraints
2. Use actual IDs and values from the provided data context
3. Estimate realistic affected record counts
4. Flag high-risk operations (bulk deletes, priority changes, etc.)
5. Suggest manual review for operations affecting >50% of records
6. Preserve data integrity and business logic
7. If the request is ambiguous or cannot be safely executed, set isValid to false

Focus on safety, accuracy, and maintaining data consistency.
`;

  try {
    const result = await model.generateContent(query);
    const response = await result.response;
    
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const generatedText = response.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating data modification with Gemini:', error);
    throw error;
  }
}

export async function generateRuleSuggestions(dataContext: any): Promise<any> {

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  // Create a minimal data summary for the API call
  const minimalContext = {
    summary: dataContext.summary,
    sampleData: {
      clientGroups: dataContext.summary?.clientGroups || [],
      workerGroups: dataContext.summary?.workerGroups || [],
      taskCategories: dataContext.summary?.taskCategories || [],
      skills: dataContext.summary?.skillsAvailable?.slice(0, 10) || [], // Limit to top 10 skills
      priorityLevels: dataContext.summary?.priorityLevels || []
    }
  };
  
  const query = `
Analyze this data and suggest exactly 5 concise business rules:

DATA: ${JSON.stringify(minimalContext, null, 0)}

RULE TYPES: coRun, slotRestriction, loadLimit, phaseWindow

Return ONLY this JSON structure:
{
  "suggestions": [
    {
      "prompt": "brief rule description (max 10 words)",
      "category": "rule type",
      "priority": "high|medium|low"
    }
  ],
  "dataInsights": {
    "totalClients": ${dataContext.summary?.totalClients || 0},
    "totalWorkers": ${dataContext.summary?.totalWorkers || 0},
    "totalTasks": ${dataContext.summary?.totalTasks || 0},
    "commonSkills": [${dataContext.summary?.skillsAvailable?.slice(0, 3).map((s: string) => `"${s}"`).join(',') || ''}],
    "priorityDistribution": "brief summary",
    "taskCategoryDistribution": "brief summary"
  }
}

Requirements:
- Exactly 5 suggestions
- Each prompt under 10 words
- Use actual data values
- Diverse rule types
- No explanations or reasoning
`;

  try {
    const result = await model.generateContent(query);
    const response = await result.response;
    
    if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const generatedText = response.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }
    
    const result_data = JSON.parse(jsonMatch[0]);
    return result_data;
  } catch (error) {
    console.error('Error generating rule suggestions with Gemini:', error);
    throw error;
  }
}
