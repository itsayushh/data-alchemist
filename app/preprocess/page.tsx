"use client"

import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  FileText,
  Users,
  Briefcase,
  Edit3,
  Save,
  X,
  Database,
  CheckSquare,
  AlertCircle,
  Brain,
  Wand2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useData } from '@/contexts/DataContext'
import { getIntelligentHeaderMapping } from '@/lib/gemini'

interface HeaderMapping {
  original: string
  suggested: string
  isValid: boolean
  confidence: number
}

interface EntityHeaderCheck {
  entity: 'clients' | 'workers' | 'tasks'
  headers: HeaderMapping[]
  hasIssues: boolean
  recordCount: number
}

const EXPECTED_HEADERS = {
  clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
  workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
  tasks: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
}

export default function PreprocessPage() {
  const router = useRouter()
  const { data, setClients, setWorkers, setTasks } = useData()
  const [isLoading, setIsLoading] = useState(true)
  const [headerChecks, setHeaderChecks] = useState<EntityHeaderCheck[]>([])
  const [editingHeader, setEditingHeader] = useState<{ entity: string; index: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUsingAI, setIsUsingAI] = useState(false)

  useEffect(() => {
    if (!data.isDataLoaded) {
      router.push('/')
      return
    }
    performHeaderCheck()
  }, [data.isDataLoaded, router])

  const headersMatch = (currentHeaders: string[], expectedHeaders: string[]): boolean => {
    if (currentHeaders.length !== expectedHeaders.length) return false
    
    const normalizedCurrent = currentHeaders.map(h => h.toLowerCase().trim())
    const normalizedExpected = expectedHeaders.map(h => h.toLowerCase())
    
    return normalizedExpected.every(expected => 
      normalizedCurrent.includes(expected)
    )
  }

  const performHeaderCheck = async () => {
    setIsLoading(true)
    
    const checks: EntityHeaderCheck[] = []
    const entities: Array<{ key: 'clients' | 'workers' | 'tasks'; data: any[] }> = [
      { key: 'clients', data: data.clients },
      { key: 'workers', data: data.workers },
      { key: 'tasks', data: data.tasks }
    ]

    for (const { key, data: entityData } of entities) {
      if (entityData.length === 0) continue

      const headers = Object.keys(entityData[0] || {})
      const expectedHeaders = EXPECTED_HEADERS[key]
      
      if (headersMatch(headers, expectedHeaders)) {
        // Headers match perfectly
        const headerMappings: HeaderMapping[] = headers.map(header => ({
          original: header,
          suggested: header,
          isValid: true,
          confidence: 1.0
        }))
        
        checks.push({
          entity: key,
          headers: headerMappings,
          hasIssues: false,
          recordCount: entityData.length
        })
      } else {
        // Headers need AI mapping
        try {
          const aiMappings = await getIntelligentHeaderMapping(headers, key, entityData.slice(0, 3))
          
          const headerMappings: HeaderMapping[] = aiMappings.map(mapping => ({
            original: mapping.original,
            suggested: mapping.suggested,
            isValid: mapping.confidence >= 0.8,
            confidence: mapping.confidence
          }))

          checks.push({
            entity: key,
            headers: headerMappings,
            hasIssues: headerMappings.some(h => !h.isValid),
            recordCount: entityData.length
          })
        } catch (error) {
          console.error(`Error processing ${key}:`, error)
          
          // Simple fallback - map to expected headers in order
          const headerMappings: HeaderMapping[] = headers.map((header, index) => ({
            original: header,
            suggested: expectedHeaders[index] || header,
            isValid: false,
            confidence: 0.5
          }))

          checks.push({
            entity: key,
            headers: headerMappings,
            hasIssues: true,
            recordCount: entityData.length
          })
        }
      }
    }

    setHeaderChecks(checks)
    setIsLoading(false)
  }

  const handleHeaderEdit = (entity: string, index: number, newValue: string) => {
    setHeaderChecks(prev => prev.map(check => {
      if (check.entity === entity as any) {
        const updatedHeaders = [...check.headers]
        updatedHeaders[index] = {
          ...updatedHeaders[index],
          suggested: newValue,
          isValid: true,
          confidence: 1.0
        }
        return {
          ...check,
          headers: updatedHeaders,
          hasIssues: updatedHeaders.some(h => !h.isValid)
        }
      }
      return check
    }))
  }

  const startEdit = (entity: string, index: number, currentValue: string) => {
    setEditingHeader({ entity, index })
    setEditValue(currentValue)
  }

  const saveEdit = () => {
    if (editingHeader) {
      handleHeaderEdit(editingHeader.entity, editingHeader.index, editValue)
      setEditingHeader(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingHeader(null)
    setEditValue('')
  }

  const applyMappings = async () => {
    setIsProcessing(true)
    
    // Apply header mappings to actual data
    for (const check of headerChecks) {
      const entityData = data[check.entity]
      if (entityData.length === 0) continue

      const newData = entityData.map((row: any) => {
        const newRow: any = {}
        
        for (const mapping of check.headers) {
          if (row.hasOwnProperty(mapping.original)) {
            newRow[mapping.suggested] = row[mapping.original]
          }
        }
        
        return newRow
      })

      if (check.entity === 'clients') setClients(newData)
      if (check.entity === 'workers') setWorkers(newData)
      if (check.entity === 'tasks') setTasks(newData)
    }

    setIsProcessing(false)
    router.push('/validate')
  }

  const performAIRemapping = async () => {
    setIsUsingAI(true)
    
    try {
      const updatedChecks = [...headerChecks]
      
      for (let i = 0; i < updatedChecks.length; i++) {
        const check = updatedChecks[i]
        const entityData = data[check.entity]
        
        if (entityData.length === 0) continue
        
        const headers = check.headers.map(h => h.original)
        const expectedHeaders = EXPECTED_HEADERS[check.entity]
        
        if (!headersMatch(headers, expectedHeaders)) {
          const aiMappings = await getIntelligentHeaderMapping(headers, check.entity, entityData.slice(0, 3))
          
          const newHeaderMappings: HeaderMapping[] = aiMappings.map(mapping => ({
            original: mapping.original,
            suggested: mapping.suggested,
            isValid: mapping.confidence >= 0.8,
            confidence: mapping.confidence
          }))
          
          updatedChecks[i] = {
            ...check,
            headers: newHeaderMappings,
            hasIssues: newHeaderMappings.some(h => !h.isValid)
          }
        }
      }
      
      setHeaderChecks(updatedChecks)
    } catch (error) {
      console.error('AI Re-mapping failed:', error)
    } finally {
      setIsUsingAI(false)
    }
  }

  const hasAnyIssues = headerChecks.some(check => check.hasIssues)
  const allResolved = headerChecks.length > 0 && !hasAnyIssues

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'clients': return Users
      case 'workers': return Briefcase  
      case 'tasks': return FileText
      default: return Database
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analyzing Headers</h2>
            <p className="text-muted-foreground">Processing your data structure...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between mb-8">
            <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Header Mapping</h1>
          <p className="text-muted-foreground">Review and adjust column mappings for your data</p>
            </div>
          <div className="flex items-center justify-between">
          <button
            onClick={applyMappings}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span>{isProcessing ? 'Processing...' : 'Apply Mappings'}</span>
            {!isProcessing && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
        </div>
        

        {/* Status Bar */}
        <div className="mb-6 p-4 bg-card border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {allResolved ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : hasAnyIssues ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Database className="h-5 w-5 text-blue-500" />
              )}
              <div>
                <h3 className="font-medium text-foreground">
                  {allResolved ? 'All Headers Mapped' : hasAnyIssues ? 'Issues Detected' : 'Headers Processed'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {headerChecks.reduce((sum, check) => sum + check.recordCount, 0).toLocaleString()} total records
                </p>
              </div>
            </div>
            <button
              onClick={performAIRemapping}
              disabled={isUsingAI}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isUsingAI ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span>{isUsingAI ? 'Re-mapping...' : 'AI Re-map'}</span>
            </button>
          </div>
        </div>

        {/* Entity Cards */}
        <div className="space-y-4 mb-8">
          {headerChecks.map((check) => {
            const Icon = getEntityIcon(check.entity)
            
            return (
              <div key={check.entity} className="bg-card border rounded-lg">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium text-foreground capitalize">{check.entity}</h3>
                        <p className="text-sm text-muted-foreground">{check.recordCount.toLocaleString()} records</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {check.hasIssues ? (
                        <span className="flex items-center space-x-1 text-sm text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Needs Review</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Ready</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {check.headers.map((header, index) => (
                      <div key={index} className={`p-3 rounded-md border ${
                        header.isValid 
                          ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' 
                          : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                      }`}>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Original</label>
                            <div className="text-sm font-mono bg-muted/50 px-2 py-1 rounded text-foreground">
                              {header.original}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs text-muted-foreground">Mapped To</label>
                            {editingHeader?.entity === check.entity && editingHeader?.index === index ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1 px-2 py-1 text-sm border rounded bg-background"
                                  autoFocus
                                />
                                <button
                                  onClick={saveEdit}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                >
                                  <Save className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <div className="flex-1 text-sm font-mono bg-muted/50 px-2 py-1 rounded text-foreground">
                                  {header.suggested}
                                </div>
                                <button
                                  onClick={() => startEdit(check.entity, index, header.suggested)}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                              header.isValid 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                            }`}>
                              {header.isValid ? <CheckSquare className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              <span>{header.isValid ? 'Valid' : 'Review'}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(header.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}