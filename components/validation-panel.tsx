"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Search,
  Bot,
  Wrench,
  ChevronDown,
  ChevronRight,
  Check,
  Zap,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getErrorCategory, ValidationError, ValidationResult } from "@/utils/data-validation"

const ValidationPanel = ({
    validationResult,
    onApplyFix,
    onApplyAllFixes,
    onAIFix,
    isAIFixLoading,
    aiSuggestedFixes,
    showAISuggestions,
    onApplyAIFix,
    onApplyAllAIFixes,
    onHideAISuggestions
}: {
    validationResult: ValidationResult | null;
    onApplyFix: (entity: string, index: number, field: string, value: any) => void;
    onApplyAllFixes: () => void;
    onAIFix: () => void;
    isAIFixLoading: boolean;
    aiSuggestedFixes: any[];
    showAISuggestions: boolean;
    onApplyAIFix: (fix: any) => void;
    onApplyAllAIFixes: () => void;
    onHideAISuggestions: () => void;
}) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['CRITICAL']));
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
    const [hiddenAISuggestions, setHiddenAISuggestions] = useState<any[]>([]);
    const [showAISuggestionsLocal, setShowAISuggestionsLocal] = useState(showAISuggestions);

    // Sync local state with prop and handle temporary storage
    useEffect(() => {
        if (showAISuggestions && !showAISuggestionsLocal) {
            // Show AI suggestions (restore from hidden if any)
            setShowAISuggestionsLocal(true);
        } else if (!showAISuggestions && showAISuggestionsLocal) {
            // Hide AI suggestions but store them temporarily
            if (aiSuggestedFixes.length > 0) {
                setHiddenAISuggestions(aiSuggestedFixes);
            }
            setShowAISuggestionsLocal(false);
        }
    }, [showAISuggestions, showAISuggestionsLocal, aiSuggestedFixes]);

    const restoreAISuggestions = () => {
        if (hiddenAISuggestions.length > 0) {
            setShowAISuggestionsLocal(true);
        }
    };

    if (!validationResult) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Validation
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                            <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No data to validate</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { summary, errors, warnings, fixes } = validationResult;
    const allIssues = [...errors, ...warnings];

    // Filter logic
    const filteredIssues = allIssues.filter(issue => {
        const matchesSearch = searchTerm === '' ||
            issue.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
        return matchesSearch && matchesSeverity;
    });

    // Group by category
    const groupedIssues = filteredIssues.reduce((acc, issue) => {
        const category = getErrorCategory(issue.type);
        if (!acc[category]) acc[category] = [];
        acc[category].push(issue);
        return acc;
    }, {} as Record<string, ValidationError[]>);

    const sortedCategories = Object.keys(groupedIssues).sort((a, b) => {
        const priorityA = a === 'CRITICAL' ? 3 : a === 'DATA_INTEGRITY' ? 2 : 1;
        const priorityB = b === 'CRITICAL' ? 3 : b === 'DATA_INTEGRITY' ? 2 : 1;
        return priorityB - priorityA;
    });

    const getStatusColor = () => {
        if (validationResult.isValid) return 'text-green-600 dark:text-green-400';
        if (summary.totalErrors > 0) return 'text-destructive';
        return 'text-amber-600 dark:text-amber-400';
    };

    const getStatusBg = () => {
        if (validationResult.isValid) return 'bg-green-50 dark:bg-green-950/20';
        if (summary.totalErrors > 0) return 'bg-destructive/10';
        return 'bg-amber-50 dark:bg-amber-950/20';
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'CRITICAL':
                return <AlertCircle className="h-3 w-3 text-destructive" />;
            case 'DATA_INTEGRITY':
                return <AlertTriangle className="h-3 w-3 text-amber-500" />;
            default:
                return <AlertTriangle className="h-3 w-3 text-primary" />;
        }
    };

    const formatSuggestedValue = (value: any) => {
        if (value === null || value === undefined) return 'Empty';
        if (typeof value === 'string' && value.trim() === '') return 'Empty';
        if (typeof value === 'string') return `"${value}"`;
        return String(value);
    };

    return (
        <Card className="h-full flex flex-col p-0 gap-0">
            {/* Header with Status */}
            <CardHeader className="p-3 bg-muted">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Validation
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                            validationResult.isValid ? 'bg-green-500' :
                            summary.totalErrors > 0 ? 'bg-destructive' : 'bg-amber-500'
                        }`} />
                        <Badge variant={validationResult.isValid ? 'secondary' : summary.totalErrors > 0 ? 'destructive' : 'secondary'} className="text-xs">
                            {validationResult.isValid ? 'Valid' :
                             summary.totalErrors > 0 ? 'Issues' : 'Warnings'}
                        </Badge>
                    </div>
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        {summary.totalErrors > 0 && (
                            <span className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                {summary.totalErrors} errors
                            </span>
                        )}
                        {summary.totalWarnings > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                {summary.totalWarnings} warnings
                            </span>
                        )}
                    </div>
                    <span>
                        {summary.entityCounts.clients + summary.entityCounts.workers + summary.entityCounts.tasks} records
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-0 p-0">
                {/* Quick Fixes Section - Now with Clear Visual Separation */}
                <div className="border-b-2 border-primary/20 bg-secondary">
                    <div className="p-4 bg-background">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-semibold text-base">Quick Fixes</h3>
                        </div>
                        
                        <Tabs defaultValue="normal" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="normal" className="flex items-center gap-2">
                                    <Settings className="h-3 w-3" />
                                    Normal Fixes
                                    {fixes.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                                            {fixes.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" />
                                    AI Fixes
                                    {(aiSuggestedFixes.length > 0 || hiddenAISuggestions.length > 0) && (
                                        <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                                            {showAISuggestionsLocal ? aiSuggestedFixes.length : hiddenAISuggestions.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            {/* Normal Fixes Tab */}
                            <TabsContent value="normal" className="space-y-3 mt-0">
                                {fixes.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                {fixes.length} automatic fix{fixes.length > 1 ? 'es' : ''} available
                                            </p>
                                            <Button 
                                                onClick={onApplyAllFixes}
                                                size="sm"
                                                className="h-7"
                                            >
                                                <Check className="h-3 w-3 mr-1" />
                                                Apply All
                                            </Button>
                                        </div>
                                        <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                                            {fixes.map((fix, index) => (
                                                <Card key={index} className="p-3 bg-background/80">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium leading-tight mb-1">
                                                                {fix.message}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {fix.entity} • Row {fix.row + 1} • {fix.column}
                                                            </p>
                                                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">Change to:</span>
                                                                    <code className="text-green-600 dark:text-green-400 font-mono">
                                                                        {formatSuggestedValue(fix.value)}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => onApplyFix(fix.entity, fix.row, fix.column, fix.value)}
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No automatic fixes available</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Try AI fixes for intelligent suggestions
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* AI Fixes Tab */}
                            <TabsContent value="ai" className="space-y-3 mt-0">
                                {isAIFixLoading ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary" />
                                            <span className="text-sm text-muted-foreground animate-pulse">
                                                AI is analyzing your data...
                                            </span>
                                        </div>
                                        {/* Loading skeleton */}
                                        <div className="space-y-2">
                                            {[1, 2].map((i) => (
                                                <Card key={i} className="p-3 bg-background/80">
                                                    <div className="animate-pulse space-y-2">
                                                        <div className="h-4 bg-muted rounded w-3/4" />
                                                        <div className="h-3 bg-muted rounded w-1/2" />
                                                        <div className="h-8 bg-muted rounded" />
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ) : showAISuggestionsLocal && aiSuggestedFixes.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                {aiSuggestedFixes.length} AI suggestion{aiSuggestedFixes.length > 1 ? 's' : ''} available
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    onClick={onHideAISuggestions}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7"
                                                >
                                                    <EyeOff className="h-3 w-3 mr-1" />
                                                    Hide
                                                </Button>
                                                <Button 
                                                    onClick={onApplyAllAIFixes}
                                                    size="sm"
                                                    className="h-7"
                                                >
                                                    <Sparkles className="h-3 w-3 mr-1" />
                                                    Apply All
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                                            {aiSuggestedFixes.map((fix, index) => (
                                                <Card key={index} className="p-3 border-primary/30 bg-background/80">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {fix.entity}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Row {fix.row + 1} • {fix.column}
                                                                </span>
                                                                <Badge 
                                                                    variant={fix.confidence === 'high' ? 'default' : 
                                                                            fix.confidence === 'medium' ? 'secondary' : 'outline'}
                                                                    className="text-xs"
                                                                >
                                                                    {fix.confidence} confidence
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm mb-2">{fix.reason}</p>
                                                            <div className="p-2 bg-muted rounded text-xs space-y-1">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">From:</span>
                                                                    <code className="text-destructive font-mono">
                                                                        {typeof fix.originalValue === 'string' && fix.originalValue.trim() === '' 
                                                                            ? '<empty>' : String(fix.originalValue)}
                                                                    </code>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-muted-foreground">To:</span>
                                                                    <code className="text-green-600 dark:text-green-400 font-mono">
                                                                        {String(fix.suggestedValue)}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => onApplyAIFix(fix)}
                                                            size="sm"
                                                            className="h-7 px-2"
                                                        >
                                                            <Check className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ) : hiddenAISuggestions.length > 0 ? (
                                    <div className="text-center py-6">
                                        <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">AI suggestions are hidden</p>
                                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                                            {hiddenAISuggestions.length} suggestion{hiddenAISuggestions.length > 1 ? 's' : ''} available
                                        </p>
                                        <Button 
                                            onClick={restoreAISuggestions}
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Eye className="h-3 w-3 mr-1" />
                                            Show Suggestions
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="flex items-center justify-center gap-2 mb-3">
                                            <Sparkles className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">No AI suggestions yet</p>
                                        <Button 
                                            onClick={onAIFix}
                                            disabled={isAIFixLoading || (summary.totalErrors === 0 && summary.totalWarnings === 0)}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <Zap className="h-3 w-3" />
                                            Generate AI Fixes
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Issues Section - Now with Clear Visual Separation */}
                <div className="flex-1 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-semibold text-base">Validation Issues</h3>
                        </div>

                        {/* Search & Filter */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search issues..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedSeverity}
                                    onChange={(e) => setSelectedSeverity(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-input bg-muted rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
                                >
                                    <option value="all">All Issues</option>
                                    <option value="error">Errors Only</option>
                                    <option value="warning">Warnings Only</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Issues List */}
                    <div className="flex-1 overflow-hidden p-4 bg-background">
                        {sortedCategories.length > 0 ? (
                            <div className="space-y-2 h-full overflow-y-auto">
                                {sortedCategories.map((category) => {
                                    const categoryIssues = groupedIssues[category];
                                    const isExpanded = expandedCategories.has(category);

                                    return (
                                        <div key={category} className="overflow-hidden bg-muted border rounded-lg ">
                                            <button
                                                onClick={() => {
                                                    const newExpanded = new Set(expandedCategories);
                                                    if (newExpanded.has(category)) {
                                                        newExpanded.delete(category);
                                                    } else {
                                                        newExpanded.add(category);
                                                    }
                                                    setExpandedCategories(newExpanded);
                                                }}
                                                className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getCategoryIcon(category)}
                                                    <span className="font-medium">
                                                        {category.replace('_', ' ')}
                                                    </span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {categoryIssues.length}
                                                    </Badge>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t bg-muted/60 max-h-[35vh] overflow-auto">
                                                    <div className="p-3 space-y-2 overflow-auto">
                                                        {categoryIssues.map((issue, index) => (
                                                            <Card key={index} className="p-3 bg-background rounded-lg">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-start gap-3 flex-1">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-medium text-sm leading-tight mb-1">
                                                                                {issue.message}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                                {issue.entity} • Row {(issue.row || 0) + 1}
                                                                                {issue.column && ` • ${issue.column}`}
                                                                            </p>
                                                                            {issue.suggestedValue !== undefined && (
                                                                                <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                                                                                    <div className="font-medium text-green-800 dark:text-green-400 mb-1">
                                                                                        Suggested Fix:
                                                                                    </div>
                                                                                    <code className="text-green-700 dark:text-green-300 font-mono">
                                                                                        → {formatSuggestedValue(issue.suggestedValue)}
                                                                                    </code>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {issue.suggestedValue !== undefined && issue.entity && issue.column && (
                                                                        <Button
                                                                            onClick={() => onApplyFix(issue.entity!, issue.row || 0, issue.column!, issue.suggestedValue)}
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 px-2"
                                                                        >
                                                                            <Check className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center py-12">
                                <div className="text-center">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                    <p className="font-medium text-sm mb-1">All Clear!</p>
                                    <p className="text-xs text-muted-foreground">No validation issues found</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ValidationPanel
