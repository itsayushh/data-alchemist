"use client"
import type React from "react"
import { useState } from "react"
import {
  Plus,
  Download,
  AlertCircle,
  Check,
  Edit2,
  Trash2,
  Search,
  FileText,
  Zap,
  Shield,
  Clock,
  Target,
  TrendingUp,
  X,
  Sparkles,
} from "lucide-react"
import { useData } from "@/contexts/DataContext"
import type { Rule, CoRunRule, SlotRestrictionRule, LoadLimitRule, PhaseWindowRule } from "@/utils/rule"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createRuleFromNaturalLanguage, generateRuleSuggestions } from "@/lib/gemini"
import { 
  generateCacheKey, 
  getCachedSuggestions, 
  setCachedSuggestions, 
  clearAllCaches,
  isCacheValid 
} from "@/lib/client-cache"

const RuleInputUI: React.FC = () => {
  // Get data from context instead of stub data
  const { data, setRules: setContextRules } = useData()
  const { clients, workers, tasks, rules } = data
  const [activeRuleType, setActiveRuleType] = useState<string>("")
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({})
  const [editingRule, setEditingRule] = useState<string | null>(null)

  // AI rule creation state
  const [aiRulePrompt, setAiRulePrompt] = useState("")
  const [isCreatingAIRule, setIsCreatingAIRule] = useState(false)
  const [aiRuleResult, setAiRuleResult] = useState<any>(null)
  const [showAIRuleCreator, setShowAIRuleCreator] = useState(false)
  const [ruleSuggestions, setRuleSuggestions] = useState<any>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Form states for different rule types
  const [coRunForm, setCoRunForm] = useState<{ name: string; tasks: string[]; description: string }>({
    name: "",
    tasks: [],
    description: "",
  })
  const [slotRestrictionForm, setSlotRestrictionForm] = useState({
    name: "",
    groupType: "client" as "client" | "worker",
    groupId: "",
    minCommonSlots: 1,
    description: "",
  })
  const [loadLimitForm, setLoadLimitForm] = useState({
    name: "",
    workerGroup: "",
    maxSlotsPerPhase: 1,
    description: "",
  })
  const [phaseWindowForm, setPhaseWindowForm] = useState<{
    name: string
    taskId: string
    allowedPhases: number[]
    description: string
  }>({
    name: "",
    taskId: "",
    allowedPhases: [],
    description: "",
  })
  const [patternMatchForm, setPatternMatchForm] = useState({
    name: "",
    regex: "",
    template: "",
    parameters: {},
    description: "",
  })
  const [precedenceForm, setPrecedenceForm] = useState<{
    name: string
    priority: number
    globalRules: string[]
    specificRules: string[]
    description: string
  }>({
    name: "",
    priority: 1,
    globalRules: [],
    specificRules: [],
    description: "",
  })

  // Add state to track cache status
  const [isCacheHit, setIsCacheHit] = useState(false)

  const ruleTypes = [
    { key: "coRun", label: "Co-Run Rules", description: "Tasks that must execute together", icon: Zap, color: "slate" },
    {
      key: "slotRestriction",
      label: "Slot Restriction",
      description: "Minimum common slots for groups",
      icon: Shield,
      color: "slate",
    },
    {
      key: "loadLimit",
      label: "Load Limit",
      description: "Maximum slots per phase for worker groups",
      icon: Target,
      color: "slate",
    },
    {
      key: "phaseWindow",
      label: "Phase Window",
      description: "Allowed phases for specific tasks",
      icon: Clock,
      color: "slate",
    },
    {
      key: "patternMatch",
      label: "Pattern Match",
      description: "Rules based on regex patterns",
      icon: Search,
      color: "slate",
    },
    {
      key: "precedenceOverride",
      label: "Precedence Override",
      description: "Priority order for rule application",
      icon: TrendingUp,
      color: "slate",
    },
  ]

  const generateId = () => "rule_" + Math.random().toString(36).substr(2, 9)

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const addRule = (type: string) => {
    const id = generateId()
    let newRule: Rule

    switch (type) {
      case "coRun":
        newRule = { id, type: "coRun", ...coRunForm, tasks: coRunForm.tasks.filter(Boolean) }
        setCoRunForm({ name: "", tasks: [], description: "" })
        break
      case "slotRestriction":
        newRule = { id, type: "slotRestriction", ...slotRestrictionForm }
        setSlotRestrictionForm({ name: "", groupType: "client", groupId: "", minCommonSlots: 1, description: "" })
        break
      case "loadLimit":
        newRule = { id, type: "loadLimit", ...loadLimitForm }
        setLoadLimitForm({ name: "", workerGroup: "", maxSlotsPerPhase: 1, description: "" })
        break
      case "phaseWindow":
        newRule = {
          id,
          type: "phaseWindow",
          ...phaseWindowForm,
          allowedPhases: phaseWindowForm.allowedPhases.filter(Boolean),
        }
        setPhaseWindowForm({ name: "", taskId: "", allowedPhases: [], description: "" })
        break
      case "patternMatch":
        newRule = { id, type: "patternMatch", ...patternMatchForm }
        setPatternMatchForm({ name: "", regex: "", template: "", parameters: {}, description: "" })
        break
      case "precedenceOverride":
        newRule = { id, type: "precedenceOverride", ...precedenceForm }
        setPrecedenceForm({ name: "", priority: 1, globalRules: [], specificRules: [], description: "" })
        break
      default:
        return
    }

    setContextRules([...rules, newRule])
    setActiveRuleType("")
  }

  const deleteRule = (id: string) => {
    setContextRules(rules.filter((rule) => rule.id !== id))
  }

  const handleAIRuleCreation = async () => {
    if (!aiRulePrompt.trim()) return

    setIsCreatingAIRule(true)
    setAiRuleResult(null)

    try {
      const dataContext = {
        clients: data.clients,
        workers: data.workers,
        tasks: data.tasks,
        availableTaskIds: data.tasks.map((t) => t.TaskID),
        availableClientGroups: [...new Set(data.clients.map((c) => c.GroupTag))],
        availableWorkerGroups: [...new Set(data.workers.map((w) => w.WorkerGroup))],
        existingRules: rules.map((r) => ({ id: r.id, name: r.name, type: r.type })),
      }

      const result = await createRuleFromNaturalLanguage(aiRulePrompt, dataContext)
      setAiRuleResult(result)

      if (result.isValid && result.rule) {
        // Automatically create the rule if it's valid
        const newRule: Rule = {
          id: generateId(),
          type: result.ruleType,
          ...result.rule,
        }
        setContextRules([...rules, newRule])

        // Clear the form
        setAiRulePrompt("")
        setShowAIRuleCreator(false)
        setAiRuleResult(null)
      }
    } catch (error) {
      console.error("AI rule creation error:", error)
      setAiRuleResult({
        isValid: false,
        validation: {
          errors: ["Failed to process your request. Please try again."],
          warnings: [],
          confidence: "low",
        },
        explanation: "There was an error communicating with the AI service.",
      })
    } finally {
      setIsCreatingAIRule(false)
    }
  }

  const exportRulesConfig = () => {
    const config = {
      rules,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRules: rules.length,
        ruleTypes: [...new Set(rules.map((r) => r.type))],
      },
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "rules-config.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getRuleIcon = (type: string) => {
    const ruleType = ruleTypes.find((rt) => rt.key === type)
    if (ruleType) {
      const IconComponent = ruleType.icon
      return <IconComponent size={16} className="text-muted-foreground" />
    }
    return <FileText size={16} className="text-muted-foreground" />
  }

  const getRuleColor = (type: string) => {
    const ruleType = ruleTypes.find((rt) => rt.key === type)
    return ruleType?.color || "slate"
  }

  const loadRuleSuggestions = async (forceRefresh = false) => {
    if (!forceRefresh && (ruleSuggestions || isLoadingSuggestions)) return
    
    // Check if we have sufficient data to generate meaningful suggestions
    if (data.clients.length === 0 || data.workers.length === 0 || data.tasks.length === 0) {
      setRuleSuggestions({
        suggestions: [],
        dataInsights: {
          totalClients: data.clients.length,
          totalWorkers: data.workers.length,
          totalTasks: data.tasks.length,
          commonSkills: [],
          priorityDistribution: "No data available",
          taskCategoryDistribution: "No data available"
        }
      })
      return
    }
    
    // Create a minimal data context to reduce API payload
    const dataContext = {
      summary: {
        totalClients: data.clients.length,
        totalWorkers: data.workers.length,
        totalTasks: data.tasks.length,
        clientGroups: [...new Set(data.clients.map(c => c.GroupTag))].slice(0, 5), // Limit to 5
        workerGroups: [...new Set(data.workers.map(w => w.WorkerGroup))].slice(0, 5), // Limit to 5
        taskCategories: [...new Set(data.tasks.map(t => t.Category))].slice(0, 5), // Limit to 5
        skillsAvailable: [...new Set(data.workers.flatMap(w => w.Skills.split(',').map(s => s.trim())))].slice(0, 8), // Limit to 8
        priorityLevels: [...new Set(data.clients.map(c => c.PriorityLevel))]
      }
    }
    
    const cacheKey = generateCacheKey(dataContext)
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedResult = getCachedSuggestions(cacheKey)
      if (cachedResult) {
        setRuleSuggestions(cachedResult)
        setIsCacheHit(true) // Indicate cache hit
        return
      }
    }
    
    // Clear cache if force refresh
    if (forceRefresh) {
      clearAllCaches()
    }
    
    setIsLoadingSuggestions(true)
    try {
      const suggestions = await generateRuleSuggestions(dataContext)
      
      // Cache the result
      setCachedSuggestions(cacheKey, suggestions)
      
      setRuleSuggestions(suggestions)
      setIsCacheHit(false) // Indicate fresh data
    } catch (error) {
      console.error('Failed to load rule suggestions:', error)
      setRuleSuggestions({
        suggestions: [],
        dataInsights: {
          totalClients: data.clients.length,
          totalWorkers: data.workers.length,
          totalTasks: data.tasks.length,
          commonSkills: [],
          priorityDistribution: "Unable to analyze",
          taskCategoryDistribution: "Unable to analyze"
        }
      })
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  return (
    <div className="min-h-screen bg-background w-full">
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Rule Configuration Management</h1>
              <p className="text-muted-foreground">Configure business rules for resource allocation and task scheduling</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-card px-4 py-2 rounded-lg shadow-sm border border-border">
                <span className="text-sm text-muted-foreground">Active Rules: </span>
                <span className="font-medium text-card-foreground">{rules.length}</span>
              </div>
              <button
                onClick={exportRulesConfig}
                disabled={rules.length === 0}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-medium"
              >
                <Download size={18} />
                Export Configuration
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="bg-secondary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-accent-foreground">AI Rule Creator</h3>
                  <p className="text-sm text-gray-600">Describe your rule in plain English and let AI create it for you</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAIRuleCreator(!showAIRuleCreator)
                  if (!showAIRuleCreator) {
                    loadRuleSuggestions()
                  }
                }}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {showAIRuleCreator ? 'Hide AI Creator' : 'Try AI Creator'}
              </Button>
            </div>

            {showAIRuleCreator && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt" className="text-sm font-semibold text-gray-700">Describe your rule</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="ai-prompt"
                      placeholder="e.g., 'Frontend and backend tasks should run together' or 'Backend team can't handle more than 2 tasks per phase' or 'Enterprise clients need at least 3 common time slots'"
                      value={aiRulePrompt}
                      onChange={(e) => setAiRulePrompt(e.target.value)}
                      rows={3}
                      className="w-full pl-5 pr-4 py-3 border border-foreground rounded-lg"
                    />
                    <Button
                      onClick={handleAIRuleCreation}
                      disabled={!aiRulePrompt.trim() || isCreatingAIRule}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    >
                      {isCreatingAIRule ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Create Rule
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Recommended rules based on data */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">
                      {isLoadingSuggestions ? 'Analyzing your data...' : 'Recommended rules for your data:'}
                      {ruleSuggestions && !isLoadingSuggestions && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          isCacheHit 
                            ? 'text-green-600 bg-green-50' 
                            : 'text-blue-600 bg-blue-50'
                        }`}>
                          {isCacheHit ? '✓ Cached (cost-free)' : '✨ Fresh from AI'}
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      {ruleSuggestions?.dataInsights && (
                        <div className="text-xs text-gray-500">
                          Based on {ruleSuggestions.dataInsights.totalTasks} tasks, {ruleSuggestions.dataInsights.totalWorkers} workers, {ruleSuggestions.dataInsights.totalClients} clients
                        </div>
                      )}
                      {ruleSuggestions && !isLoadingSuggestions && (
                        <button
                          onClick={() => {
                            setRuleSuggestions(null)
                            loadRuleSuggestions(true) // Force refresh
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
                          title="Refresh suggestions (uses API call)"
                        >
                          ↻ Refresh
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isLoadingSuggestions ? (
                    <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                      <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-gray-600">Analyzing your data to generate personalized suggestions...</span>
                    </div>
                  ) : ruleSuggestions?.suggestions?.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ruleSuggestions.suggestions.map((suggestion: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setAiRulePrompt(suggestion.prompt)}
                            className={`text-xs px-3 py-2 border rounded-lg hover:bg-gray-50 text-left transition-colors ${
                              suggestion.priority === 'high' 
                                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                : suggestion.priority === 'medium'
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            <div className="font-medium text-sm">{suggestion.prompt}</div>
                            <div className="text-xs opacity-75 mt-1 flex items-center justify-between">
                              <span>{suggestion.category}</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                                suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {suggestion.priority}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {ruleSuggestions.dataInsights && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">
                          <strong>Data overview:</strong> {ruleSuggestions.dataInsights.commonSkills?.length > 0 && 
                            `Skills: ${ruleSuggestions.dataInsights.commonSkills.join(', ')} • `}
                          Priority: {ruleSuggestions.dataInsights.priorityDistribution} • 
                          Categories: {ruleSuggestions.dataInsights.taskCategoryDistribution}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-800">
                        {data.clients.length === 0 || data.workers.length === 0 || data.tasks.length === 0 
                          ? 'Please upload your data (clients, workers, and tasks) to get personalized rule suggestions.'
                          : 'Unable to generate suggestions from your data. Try creating rules manually below.'}
                      </div>
                      {(data.clients.length === 0 || data.workers.length === 0 || data.tasks.length === 0) && (
                        <div className="text-xs text-yellow-700 mt-2">
                          Missing: {[
                            data.clients.length === 0 ? 'Clients' : null,
                            data.workers.length === 0 ? 'Workers' : null,
                            data.tasks.length === 0 ? 'Tasks' : null
                          ].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Result Display */}
                {aiRuleResult && (
                  <div className={`p-4 rounded-lg border ${
                    aiRuleResult.isValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {aiRuleResult.isValid ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-medium text-sm ${
                        aiRuleResult.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {aiRuleResult.isValid ? 'Rule Created Successfully!' : 'Could Not Create Rule'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Confidence: {aiRuleResult.validation?.confidence || 'unknown'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      {aiRuleResult.explanation}
                    </p>

                    {aiRuleResult.isValid && aiRuleResult.rule && (
                      <div className="bg-white p-3 rounded border space-y-2">
                        <div className="font-medium text-sm">Rule Details:</div>
                        <div className="text-xs space-y-1">
                          <div><strong>Type:</strong> {aiRuleResult.ruleType}</div>
                          <div><strong>Name:</strong> {aiRuleResult.rule.name}</div>
                          <div><strong>Description:</strong> {aiRuleResult.rule.description}</div>
                        </div>
                      </div>
                    )}

                    {aiRuleResult.validation?.errors?.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-sm text-red-800 mb-1">Issues:</div>
                        <ul className="text-xs text-red-700 space-y-1">
                          {aiRuleResult.validation.errors.map((error: string, idx: number) => (
                            <li key={idx}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiRuleResult.validation?.warnings?.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-sm text-amber-800 mb-1">Warnings:</div>
                        <ul className="text-xs text-amber-700 space-y-1">
                          {aiRuleResult.validation.warnings.map((warning: string, idx: number) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rule Creation Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-secondary rounded-lg shadow-sm border">
              <div className="p-6 border-b ">
                <h2 className="text-lg font-medium text-card-foreground mb-4">Create New Rule</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ruleTypes.map((type) => (
                    <button
                      key={type.key}
                      onClick={() => setActiveRuleType(activeRuleType === type.key ? "" : type.key)}
                      className={`p-4 rounded-lg border-dotted text-left transition-all border-foreground border-2 ${
                        activeRuleType === type.key
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "hover:border-border/80 hover:bg-accent hover:text-accent-foreground "
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground">{getRuleIcon(type.key)}</span>
                        <span className="font-medium text-sm text-card-foreground">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rule Forms */}
              {activeRuleType && (
                <div className="p-6 bg-muted/30">
                  {activeRuleType === 'coRun' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                        <Zap size={20} className="text-muted-foreground" />
                        <h3 className="font-medium text-card-foreground">Co-Run Rules Configuration</h3>
                      </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="corun-name">Rule Name</Label>
                              <Input
                                id="corun-name"
                                placeholder="e.g., Frontend Components Co-execution"
                                value={coRunForm.name}
                                onChange={(e) => setCoRunForm(prev => ({ ...prev, name: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tasks</Label>
                              <Select
                                value={coRunForm.tasks[0] || ''}
                                onValueChange={(value) => setCoRunForm(prev => ({
                                  ...prev,
                                  tasks: prev.tasks.includes(value) ? prev.tasks : [...prev.tasks, value]
                                }))}
                                autoComplete="on"
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tasks" />
                                </SelectTrigger>
                                <SelectContent>
                                  {data.tasks.map((task: any) => (
                                    <SelectItem key={task.TaskID} value={task.TaskID}>
                                      {task.TaskID} - {task.TaskName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {coRunForm.tasks.length > 0 && (
                            <div className="space-y-2">
                              <Label>Selected Tasks</Label>
                              <div className="flex flex-wrap gap-2">
                                {coRunForm.tasks.map(taskId => {
                                  const task = data.tasks.find((t: any) => t.TaskID === taskId);
                                  return (
                                    <Badge key={taskId} variant="secondary" className="gap-1">
                                      {task?.TaskName || taskId}
                                      <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => setCoRunForm(prev => ({
                                          ...prev,
                                          tasks: prev.tasks.filter(t => t !== taskId)
                                        }))}
                                      />
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="corun-desc">Description (Optional)</Label>
                            <Textarea
                              id="corun-desc"
                              placeholder="Describe the co-execution requirement..."
                              value={coRunForm.description}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCoRunForm(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={() => addRule('coRun')}
                            disabled={!coRunForm.name || coRunForm.tasks.length < 2}
                            className="w-full"
                          >
                            Create Co-execution Rule
                          </Button>
                        </div>
                      )}


                  {activeRuleType === "slotRestriction" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield size={20} className="text-muted-foreground" />
                        <h3 className="font-medium text-card-foreground">Slot Restriction Rule Configuration</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-card-foreground mb-2">Rule Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Enterprise Client Slots"
                            value={slotRestrictionForm.name}
                            onChange={(e) => setSlotRestrictionForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Group Type</label>
                          <select
                            value={slotRestrictionForm.groupType}
                            onChange={(e) =>
                              setSlotRestrictionForm((prev) => ({
                                ...prev,
                                groupType: e.target.value as "client" | "worker",
                                groupId: "", // Reset group ID when type changes
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          >
                            <option value="client">Client Group</option>
                            <option value="worker">Worker Group</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
                          <select
                            value={slotRestrictionForm.groupId}
                            onChange={(e) => setSlotRestrictionForm((prev) => ({ ...prev, groupId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          >
                            <option value="">Select {slotRestrictionForm.groupType} group</option>
                            {slotRestrictionForm.groupType === "client"
                              ? [...new Set(clients.map((c) => c.GroupTag))].map((group) => (
                                  <option key={group} value={group}>
                                    {group}
                                  </option>
                                ))
                              : [...new Set(workers.map((w) => w.WorkerGroup))].map((group) => (
                                  <option key={group} value={group}>
                                    {group}
                                  </option>
                                ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-card-foreground mb-2">Min Common Slots</label>
                          <input
                            type="number"
                            min="1"
                            value={slotRestrictionForm.minCommonSlots}
                            onChange={(e) =>
                              setSlotRestrictionForm((prev) => ({
                                ...prev,
                                minCommonSlots: Number.parseInt(e.target.value) || 1,
                              }))
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-card-foreground mb-2">Description (Optional)</label>
                          <input
                            type="text"
                            placeholder="Describe the slot restriction..."
                            value={slotRestrictionForm.description}
                            onChange={(e) =>
                              setSlotRestrictionForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => addRule("slotRestriction")}
                        disabled={!slotRestrictionForm.name || !slotRestrictionForm.groupId}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <Plus size={16} />
                        Add Slot Restriction
                      </button>
                    </div>
                  )}

                  {activeRuleType === "loadLimit" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Target size={20} className="text-muted-foreground" />
                        <h3 className="font-medium text-card-foreground">Load Limit Rule Configuration</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Backend Team Load Limit"
                            value={loadLimitForm.name}
                            onChange={(e) => setLoadLimitForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Worker Group</label>
                          <select
                            value={loadLimitForm.workerGroup}
                            onChange={(e) => setLoadLimitForm((prev) => ({ ...prev, workerGroup: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          >
                            <option value="">Select Worker Group</option>
                            {[...new Set(workers.map((w) => w.WorkerGroup))].map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-card-foreground mb-2">Max Slots Per Phase</label>
                          <input
                            type="number"
                            min="1"
                            value={loadLimitForm.maxSlotsPerPhase}
                            onChange={(e) =>
                              setLoadLimitForm((prev) => ({
                                ...prev,
                                maxSlotsPerPhase: Number.parseInt(e.target.value) || 1,
                              }))
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">Description (Optional)</label>
                        <input
                          type="text"
                          placeholder="Describe the load limit..."
                          value={loadLimitForm.description}
                          onChange={(e) => setLoadLimitForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                        />
                      </div>
                      <button
                        onClick={() => addRule("loadLimit")}
                        disabled={!loadLimitForm.name || !loadLimitForm.workerGroup}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <Plus size={16} />
                        Add Load Limit
                      </button>
                    </div>
                  )}

                  {activeRuleType === "phaseWindow" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Clock size={20} className="text-gray-600" />
                        <h3 className="font-medium text-gray-900">Phase Window Rule Configuration</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                          <input
                            type="text"
                            placeholder="e.g., UI Development Phase Window"
                            value={phaseWindowForm.name}
                            onChange={(e) => setPhaseWindowForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                          <select
                            value={phaseWindowForm.taskId}
                            onChange={(e) => setPhaseWindowForm((prev) => ({ ...prev, taskId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          >
                            <option value="">Select Task</option>
                            {tasks.map((task) => (
                              <option key={task.TaskID} value={task.TaskID}>
                                {task.TaskID} - {task.TaskName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Phases</label>
                        <div className="flex flex-wrap gap-3">
                          {[1, 2, 3, 4, 5].map((phase) => (
                            <label key={phase} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={phaseWindowForm.allowedPhases.includes(phase)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPhaseWindowForm((prev) => ({
                                      ...prev,
                                      allowedPhases: [...prev.allowedPhases, phase],
                                    }))
                                  } else {
                                    setPhaseWindowForm((prev) => ({
                                      ...prev,
                                      allowedPhases: prev.allowedPhases.filter((p) => p !== phase),
                                    }))
                                  }
                                }}
                                className="rounded text-gray-900 focus:ring-gray-900"
                              />
                              <span className="text-sm text-gray-700">Phase {phase}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                        <input
                          type="text"
                          placeholder="Describe the phase window..."
                          value={phaseWindowForm.description}
                          onChange={(e) => setPhaseWindowForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                        />
                      </div>
                      <button
                        onClick={() => addRule("phaseWindow")}
                        disabled={
                          !phaseWindowForm.name || !phaseWindowForm.taskId || phaseWindowForm.allowedPhases.length === 0
                        }
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <Plus size={16} />
                        Add Phase Window
                      </button>
                    </div>
                  )}

                  {activeRuleType === "patternMatch" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Search size={20} className="text-gray-600" />
                        <h3 className="font-medium text-gray-900">Pattern Match Rule Configuration</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Task Priority Pattern"
                            value={patternMatchForm.name}
                            onChange={(e) => setPatternMatchForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Regex Pattern</label>
                          <input
                            type="text"
                            placeholder="e.g., ^T[0-9]{3}$"
                            value={patternMatchForm.regex}
                            onChange={(e) => setPatternMatchForm((prev) => ({ ...prev, regex: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                          <input
                            type="text"
                            placeholder="e.g., priority_boost"
                            value={patternMatchForm.template}
                            onChange={(e) => setPatternMatchForm((prev) => ({ ...prev, template: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Parameters (JSON)</label>
                          <input
                            type="text"
                            placeholder='{"boost": 1.5}'
                            value={JSON.stringify(patternMatchForm.parameters)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value || "{}")
                                setPatternMatchForm((prev) => ({ ...prev, parameters: parsed }))
                              } catch (err) {
                                // Invalid JSON, ignore
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          placeholder="Describe the pattern matching rule..."
                          value={patternMatchForm.description}
                          onChange={(e) => setPatternMatchForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          rows={2}
                        />
                      </div>
                      <button
                        onClick={() => addRule("patternMatch")}
                        disabled={!patternMatchForm.name || !patternMatchForm.regex}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <Plus size={16} />
                        Add Pattern Rule
                      </button>
                    </div>
                  )}

                  {activeRuleType === "precedenceOverride" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={20} className="text-gray-600" />
                        <h3 className="font-medium text-gray-900">Precedence Override Rule Configuration</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Critical Task Priority"
                            value={precedenceForm.name}
                            onChange={(e) => setPrecedenceForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={precedenceForm.priority}
                            onChange={(e) =>
                              setPrecedenceForm((prev) => ({
                                ...prev,
                                priority: Number.parseInt(e.target.value) || 1,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Global Rules</label>
                        <textarea
                          placeholder="Enter global rule IDs (one per line)..."
                          value={precedenceForm.globalRules.join("\n")}
                          onChange={(e) =>
                            setPrecedenceForm((prev) => ({
                              ...prev,
                              globalRules: e.target.value.split("\n").filter(Boolean),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Specific Rules</label>
                        <textarea
                          placeholder="Enter specific rule IDs (one per line)..."
                          value={precedenceForm.specificRules.join("\n")}
                          onChange={(e) =>
                            setPrecedenceForm((prev) => ({
                              ...prev,
                              specificRules: e.target.value.split("\n").filter(Boolean),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <input
                          type="text"
                          placeholder="Describe the precedence rule..."
                          value={precedenceForm.description}
                          onChange={(e) => setPrecedenceForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                        />
                      </div>
                      <button
                        onClick={() => addRule("precedenceOverride")}
                        disabled={!precedenceForm.name}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <Plus size={16} />
                        Add Precedence Rule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Rules Panel */}
          <div className="space-y-6">
            <div className="bg-secondary rounded-lg shadow-sm border border-border">
              <div className="p-6 border-b border-foreground/30">
                <h2 className="text-lg font-medium text-foreground">Active Rules</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {rules.length === 0
                    ? "No rules configured"
                    : `${rules.length} rule${rules.length > 1 ? "s" : ""} configured`}
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {rules.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <AlertCircle size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                    <p className="font-medium">No rules configured</p>
                    <p className="text-sm">Select a rule type to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {rules.map((rule) => (
                      <div key={rule.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{getRuleIcon(rule.type)}</span>
                            <div>
                              <h4 className="font-medium text-card-foreground">{rule.name}</h4>
                              <p className="text-xs text-muted-foreground capitalize">
                                {rule.type.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                              className="p-1 text-muted-foreground hover:text-card-foreground transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Rule Details */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          {rule.type === "coRun" && (
                            <div>
                              <span className="font-medium">Tasks: </span>
                              {(rule as CoRunRule).tasks.join(", ")}
                            </div>
                          )}
                          {rule.type === "slotRestriction" && (
                            <div>
                              <span className="font-medium">Group: </span>
                              {(rule as SlotRestrictionRule).groupType} - {(rule as SlotRestrictionRule).groupId}
                              <br />
                              <span className="font-medium">Min Slots: </span>
                              {(rule as SlotRestrictionRule).minCommonSlots}
                            </div>
                          )}
                          {rule.type === "loadLimit" && (
                            <div>
                              <span className="font-medium">Group: </span>
                              {(rule as LoadLimitRule).workerGroup}
                              <br />
                              <span className="font-medium">Max Slots: </span>
                              {(rule as LoadLimitRule).maxSlotsPerPhase}
                            </div>
                          )}
                          {rule.type === "phaseWindow" && (
                            <div>
                              <span className="font-medium">Task: </span>
                              {(rule as PhaseWindowRule).taskId}
                              <br />
                              <span className="font-medium">Phases: </span>
                              {(rule as PhaseWindowRule).allowedPhases.join(", ")}
                            </div>
                          )}
                          {rule.description && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">{rule.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        

        {/* Rule Validation Status */}
        {rules.length > 0 && (
          <div className="mt-8 bg-card rounded-lg border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-accent rounded-full">
                <Check size={16} className="text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-card-foreground">Configuration Ready</h3>
                <p className="text-sm text-muted-foreground">
                  {rules.length} rule{rules.length > 1 ? "s" : ""} configured and ready for export
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={exportRulesConfig}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
              >
                <Download size={18} />
                Export Configuration
              </button>
              <div className="text-sm text-muted-foreground">
                Export includes all {rules.length} configured rules with metadata
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RuleInputUI
