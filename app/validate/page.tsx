'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Users, Briefcase, CheckCircle, AlertCircle, Download, AlertTriangle, Info, ArrowLeft, Filter, Search, RefreshCw, Eye, EyeOff, ChevronDown, ChevronRight, Zap, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useData } from '@/contexts/DataContext';

import {
    validateDataSet,
    ValidationResult,
    ValidationError,
    DataSet,
    getErrorCategory,
} from '../../utils/data-validation';
import { Rule } from '../../utils/rule';
import { ModernDataTable } from '@/components/data-table';
import { fixValidationErrors } from '../../lib/gemini';
import ValidationPanel from '@/components/validation-panel';
import { createConsolidatedRulesConfig, exportConsolidatedRulesConfig } from '@/utils/consolidated-rules';

// Main Component
export default function ValidatePage() {
    const router = useRouter();
    const { data, setClients, setWorkers, setTasks, setRules, clearData } = useData();
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [activeTab, setActiveTab] = useState<'clients' | 'workers' | 'tasks' | 'rules'>('clients');
    const [isValidating, setIsValidating] = useState(false);
    const [isAIFixLoading, setIsAIFixLoading] = useState(false);
    const [aiSuggestedFixes, setAiSuggestedFixes] = useState<any[]>([]);
    const [showAISuggestions, setShowAISuggestions] = useState(false);
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Redirect to upload page if no data is loaded
    useEffect(() => {
        if (!data.isDataLoaded) {
            router.push('/');
            return;
        }

        // Run initial validation
        runValidation();
    }, [data.isDataLoaded, router]);

    // Auto-validate when data changes
    useEffect(() => {
        if (data.isDataLoaded) {
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
            validationTimeoutRef.current = setTimeout(() => {
                runValidation();
            }, 300); 
        }
        return () => {
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
        };
    }, [data.clients, data.workers, data.tasks, data.rules]);

    const runValidation = useCallback(async () => {
        if (!data.isDataLoaded) return;

        setIsValidating(true);

        // Simulate async validation for better UX
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataToValidate: DataSet = {
            clients: data.clients,
            workers: data.workers,
            tasks: data.tasks
        };

        const result = validateDataSet(dataToValidate);
        setValidationResult(result);
        setIsValidating(false);
        return result;
    }, [data.isDataLoaded, data.clients, data.workers, data.tasks]);

    const handleEdit = useCallback((type: string, index: number, field: string, value: any) => {
        const updatedData = [...(data[type as keyof typeof data] as any[])];
        updatedData[index] = { ...updatedData[index], [field]: value };

        if (type === 'clients') setClients(updatedData);
        if (type === 'workers') setWorkers(updatedData);
        if (type === 'tasks') setTasks(updatedData);

        // Validation will be triggered automatically by useEffect
    }, [data, setClients, setWorkers, setTasks]);

    const handleApplyFix = useCallback((entity: string, index: number, field: string, value: any) => {
        handleEdit(entity, index, field, value);
    }, [handleEdit]);

    const handleApplyAllFixes = useCallback(() => {
        if (!validationResult?.fixes) return;

        // Group fixes by entity type to batch updates
        const fixesByEntity = validationResult.fixes.reduce((acc, fix) => {
            if (!acc[fix.entity]) acc[fix.entity] = [];
            acc[fix.entity].push(fix);
            return acc;
        }, {} as Record<string, any[]>);

        // Apply all fixes for each entity type
        Object.entries(fixesByEntity).forEach(([entityType, fixes]) => {
            const currentData = [...(data[entityType as keyof typeof data] as any[])];

            // Apply all fixes to the data
            fixes.forEach(fix => {
                if (currentData[fix.row]) {
                    currentData[fix.row] = { ...currentData[fix.row], [fix.column]: fix.value };
                }
            });

            // Update the state with all fixes applied
            if (entityType === 'clients') setClients(currentData);
            if (entityType === 'workers') setWorkers(currentData);
            if (entityType === 'tasks') setTasks(currentData);
        });

        // Validation will be triggered automatically by useEffect
    }, [validationResult, data, setClients, setWorkers, setTasks]);

    const handleAIFix = useCallback(async () => {
        if (!validationResult) return;
        
        const allErrors = [...validationResult.errors, ...validationResult.warnings];
        if (allErrors.length === 0) return;

        setIsAIFixLoading(true);
        setAiSuggestedFixes([]);
        setShowAISuggestions(false);
        
        try {
            const dataContext = {
                clients: data.clients,
                workers: data.workers,
                tasks: data.tasks,
                availableTaskIds: data.tasks.map(t => t.TaskID),
                availableClientGroups: [...new Set(data.clients.map(c => c.GroupTag))],
                availableWorkerGroups: [...new Set(data.workers.map(w => w.WorkerGroup))]
            };

            // Simulate loading for better UX
            await new Promise(resolve => setTimeout(resolve, 1500));

            const aiResult = await fixValidationErrors(allErrors, dataContext);
            
            if (aiResult.fixes && aiResult.fixes.length > 0) {
                setAiSuggestedFixes(aiResult.fixes);
                setShowAISuggestions(true);
            } else {
                alert('AI could not generate any fixes for the current validation errors.');
            }
        } catch (error) {
            console.error('AI fix error:', error);
            alert('Failed to generate AI fixes. Please try manual fixes or check your connection.');
        } finally {
            setIsAIFixLoading(false);
        }
    }, [validationResult, data]);

    const handleApplyAIFix = useCallback((fix: any) => {
        const entityType = fix.entity;
        const currentData = [...(data[entityType as keyof typeof data] as any[])];

        if (currentData[fix.row]) {
            currentData[fix.row] = { ...currentData[fix.row], [fix.column]: fix.suggestedValue };
        }

        if (entityType === 'clients') setClients(currentData);
        if (entityType === 'workers') setWorkers(currentData);
        if (entityType === 'tasks') setTasks(currentData);

        // Remove the applied fix from suggestions
        setAiSuggestedFixes(prev => prev.filter(f => 
            !(f.entity === fix.entity && f.row === fix.row && f.column === fix.column)
        ));
    }, [data, setClients, setWorkers, setTasks]);

    const handleApplyAllAIFixes = useCallback(() => {
        if (aiSuggestedFixes.length === 0) return;

        // Group fixes by entity type to batch updates
        const fixesByEntity = aiSuggestedFixes.reduce((acc: any, fix: any) => {
            if (!acc[fix.entity]) acc[fix.entity] = [];
            acc[fix.entity].push(fix);
            return acc;
        }, {});

        Object.entries(fixesByEntity).forEach(([entityType, fixes]: [string, any]) => {
            const currentData = [...(data[entityType as keyof typeof data] as any[])];

            fixes.forEach((fix: any) => {
                if (currentData[fix.row]) {
                    currentData[fix.row] = { ...currentData[fix.row], [fix.column]: fix.suggestedValue };
                }
            });

            if (entityType === 'clients') setClients(currentData);
            if (entityType === 'workers') setWorkers(currentData);
            if (entityType === 'tasks') setTasks(currentData);
        });

        // Clear all suggestions
        setAiSuggestedFixes([]);
        setShowAISuggestions(false);

        alert(`Applied ${aiSuggestedFixes.length} AI fixes successfully!`);
    }, [aiSuggestedFixes, data, setClients, setWorkers, setTasks]);

    const handleHideAISuggestions = useCallback(() => {
        setShowAISuggestions(false);
    }, []);

    const handleRulesChange = useCallback((rules: Rule[]) => {
        setRules(rules);
        // Validation will be triggered automatically by useEffect
    }, [setRules]);

    const handleExport = () => {
        if (!validationResult?.isValid) {
            alert('Please fix all validation errors before exporting.');
            return;
        }

        // Create and download CSV files
        const csvData = {
            clients: Papa.unparse(data.clients),
            workers: Papa.unparse(data.workers),
            tasks: Papa.unparse(data.tasks)
        };

        // Download each CSV file
        Object.entries(csvData).forEach(([type, csv]) => {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_cleaned.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        });

        // Create and download rules.json
        const rulesConfig = createConsolidatedRulesConfig(
            {
                clients: data.clients.length,
                workers: data.workers.length,
                tasks: data.tasks.length
            },
            true,
            data.rules,
            data.prioritizationConfig
        );

        exportConsolidatedRulesConfig(rulesConfig);
    };


    const getTabIcon = (tab: string) => {
        switch (tab) {
            case 'clients': return <Users className="h-4 w-4" />;
            case 'workers': return <Users className="h-4 w-4" />;
            case 'tasks': return <Briefcase className="h-4 w-4" />;
            case 'rules': return <FileText className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    if (!data.isDataLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading data validation...</p>
                    <p className="text-gray-500 text-sm mt-1">Please wait while we prepare your data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[100%] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                        <ValidationPanel
                            validationResult={validationResult}
                            onApplyFix={handleApplyFix}
                            onApplyAllFixes={handleApplyAllFixes}
                            onAIFix={handleAIFix}
                            isAIFixLoading={isAIFixLoading}
                            aiSuggestedFixes={aiSuggestedFixes}
                            showAISuggestions={showAISuggestions}
                            onApplyAIFix={handleApplyAIFix}
                            onApplyAllAIFixes={handleApplyAllAIFixes}
                            onHideAISuggestions={handleHideAISuggestions}
                        />
                    </div>

                    {/* Data Table - Right Side */}
                    <div className="lg:col-span-3">
                        <div className="bg-background border rounded-lg shadow-sm">
                            {/* Tabs Header */}
                            <div className="border-b bg-muted rounded-t-xl ">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex space-x-1">
                                        {(['clients', 'workers', 'tasks'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                                                    activeTab === tab
                                                        ? 'bg-accent text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                                }`}
                                            >
                                                {getTabIcon(tab)}
                                                {tab}
                                                <span className="ml-1 text-xs bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded">
                                                    {(data[tab] as any[]).length}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={runValidation}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-foreground/10 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            {isValidating ? 'Validating...' : 'Re-validate Data'}
                                        </button>
                                        <button
                                            onClick={handleExport}
                                            disabled={!validationResult?.isValid}
                                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                        >
                                            <Download className="h-4 w-4" />
                                            Export Clean Data
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Data Content */}
                            <div className="p-0 ">
                                {(
                                    <ModernDataTable
                                        data={data[activeTab] as any[]}
                                        type={activeTab}
                                        onEdit={(index, field, value) => handleEdit(activeTab, index, field, value)}
                                        validationResult={validationResult}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}