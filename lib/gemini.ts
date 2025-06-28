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
