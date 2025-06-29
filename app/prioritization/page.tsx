'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ArrowUpDown, Save, RotateCcw, Plus, Trash2, Download, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { createConsolidatedRulesConfig, exportConsolidatedRulesConfig, importConsolidatedRulesConfig } from '@/utils/consolidated-rules';

const PRESET_PROFILES = {
  balanced: {
    name: 'Balanced',
    description: 'Equal consideration for all criteria',
    weights: { PriorityLevel: 33, Fairness: 33, Fulfillment: 34 }
  },
  fulfillment: {
    name: 'Maximize Fulfillment',
    description: 'Prioritize completing as many tasks as possible',
    weights: { PriorityLevel: 20, Fairness: 20, Fulfillment: 60 }
  },
  fairness: {
    name: 'Fair Distribution',
    description: 'Ensure equitable workload distribution',
    weights: { PriorityLevel: 25, Fairness: 60, Fulfillment: 15 }
  },
  priority: {
    name: 'Priority First',
    description: 'Focus on high-priority tasks first',
    weights: { PriorityLevel: 60, Fairness: 25, Fulfillment: 15 }
  }
};

interface DragDropItem {
  id: string;
  name: string;
  weight: number;
}

export default function PrioritizationPage() {
  const { data, setPrioritizationConfig } = useData();
  const [activeTab, setActiveTab] = useState<'sliders' | 'ranking' | 'matrix' | 'profiles'>('sliders');
  const [weights, setWeights] = useState(data.prioritizationConfig.weights);
  const [rankingOrder, setRankingOrder] = useState<DragDropItem[]>([
    { id: 'PriorityLevel', name: 'Priority Level', weight: weights.PriorityLevel },
    { id: 'Fairness', name: 'Fairness', weight: weights.Fairness },
    { id: 'Fulfillment', name: 'Task Fulfillment', weight: weights.Fulfillment }
  ]);
  const [selectedProfile, setSelectedProfile] = useState(data.prioritizationConfig.selectedProfile);
  const [customProfileName, setCustomProfileName] = useState('');
  const [pairwiseMatrix, setPairwiseMatrix] = useState<Record<string, Record<string, number>>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const criteria = ['PriorityLevel', 'Fairness', 'Fulfillment'];
  const criteriaNames = {
    PriorityLevel: 'Priority Level',
    Fairness: 'Fairness',
    Fulfillment: 'Task Fulfillment'
  };

  // Initialize pairwise matrix
  useEffect(() => {
    const matrix: Record<string, Record<string, number>> = {};
    criteria.forEach(c1 => {
      matrix[c1] = {};
      criteria.forEach(c2 => {
        if (c1 === c2) {
          matrix[c1][c2] = 1;
        } else {
          matrix[c1][c2] = data.prioritizationConfig.pairwiseMatrix?.[c1]?.[c2] || 1;
        }
      });
    });
    setPairwiseMatrix(matrix);
  }, []);

  const handleWeightChange = (criterion: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [criterion]: value };
    
    // Ensure weights sum to 100
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total !== 100) {
      const diff = 100 - total;
      const otherCriteria = Object.keys(newWeights).filter(k => k !== criterion) as (keyof typeof weights)[];
      const adjustment = diff / otherCriteria.length;
      
      otherCriteria.forEach(key => {
        newWeights[key] = Math.max(0, Math.min(100, newWeights[key] + adjustment));
      });
    }
    
    setWeights(newWeights);
    updateRankingWeights(newWeights);
  };

  const updateRankingWeights = (newWeights: typeof weights) => {
    setRankingOrder(prev => prev.map(item => ({
      ...item,
      weight: newWeights[item.id as keyof typeof weights]
    })));
  };

  const handleRankingReorder = (fromIndex: number, toIndex: number) => {
    const newOrder = [...rankingOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    
    // Assign weights based on ranking (1st = 50%, 2nd = 30%, 3rd = 20%)
    const rankWeights = [50, 30, 20];
    const updatedOrder = newOrder.map((item, index) => ({
      ...item,
      weight: rankWeights[index] || 0
    }));
    
    setRankingOrder(updatedOrder);
    
    // Update main weights
    const newWeights = { ...weights };
    updatedOrder.forEach(item => {
      newWeights[item.id as keyof typeof weights] = item.weight;
    });
    setWeights(newWeights);
  };

  const handleMatrixChange = (row: string, col: string, value: number) => {
    const newMatrix = { ...pairwiseMatrix };
    newMatrix[row][col] = value;
    newMatrix[col][row] = 1 / value; // Reciprocal
    setPairwiseMatrix(newMatrix);
    
    // Calculate weights from matrix using simple averaging
    const calculatedWeights = calculateWeightsFromMatrix(newMatrix);
    setWeights(calculatedWeights);
    updateRankingWeights(calculatedWeights);
  };

  const calculateWeightsFromMatrix = (matrix: Record<string, Record<string, number>>) => {
    const sums = criteria.map(c1 => 
      criteria.reduce((sum, c2) => sum + matrix[c1][c2], 0)
    );
    const total = sums.reduce((sum, s) => sum + s, 0);
    
    return {
      PriorityLevel: Math.round((sums[0] / total) * 100),
      Fairness: Math.round((sums[1] / total) * 100),
      Fulfillment: Math.round((sums[2] / total) * 100)
    };
  };

  const applyPresetProfile = (profileKey: string) => {
    const profile = PRESET_PROFILES[profileKey as keyof typeof PRESET_PROFILES];
    if (profile) {
      setWeights(profile.weights);
      setSelectedProfile(profileKey);
      updateRankingWeights(profile.weights);
    }
  };

  const saveCustomProfile = () => {
    if (customProfileName.trim()) {
      const newConfig = {
        ...data.prioritizationConfig,
        customProfiles: {
          ...data.prioritizationConfig.customProfiles,
          [customProfileName]: { ...weights }
        }
      };
      setPrioritizationConfig(newConfig);
      setCustomProfileName('');
    }
  };

  const saveConfiguration = () => {
    const newConfig = {
      weights,
      rankingOrder: rankingOrder.map(item => item.id),
      selectedProfile,
      customProfiles: data.prioritizationConfig.customProfiles,
      pairwiseMatrix
    };
    setPrioritizationConfig(newConfig);
  };

  const resetToDefaults = () => {
    const defaultWeights = { PriorityLevel: 40, Fairness: 35, Fulfillment: 25 };
    setWeights(defaultWeights);
    setSelectedProfile('balanced');
    updateRankingWeights(defaultWeights);
  };

  const exportConfiguration = () => {
    // Create consolidated rules.json with prioritization config
    const consolidatedConfig = createConsolidatedRulesConfig(
      {
        clients: data.clients.length,
        workers: data.workers.length,
        tasks: data.tasks.length
      },
      data.isDataLoaded,
      data.rules,
      {
        weights,
        rankingOrder: rankingOrder.map(item => item.id),
        selectedProfile,
        customProfiles: data.prioritizationConfig.customProfiles,
        pairwiseMatrix
      },
      activeTab
    );
    
    exportConsolidatedRulesConfig(consolidatedConfig);
  };

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = importConsolidatedRulesConfig(e.target?.result as string);
        
        if (!result.success) {
          alert(result.error || 'Error importing configuration');
          return;
        }
        
        if (result.prioritization) {
          const config = result.prioritization;
          if (config.weights) {
            setWeights(config.weights);
            updateRankingWeights(config.weights);
          }
          if (config.selectedProfile) setSelectedProfile(config.selectedProfile);
          if (config.pairwiseMatrix) setPairwiseMatrix(config.pairwiseMatrix);
          if (config.customProfiles) {
            const newConfig = {
              ...data.prioritizationConfig,
              customProfiles: config.customProfiles
            };
            setPrioritizationConfig(newConfig);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prioritization & Weights</h1>
          <p className="text-muted-foreground mt-2">
            Configure the relative importance of different criteria for resource allocation.<br />
            <span className="text-sm">Configuration is saved as part of the consolidated rules.json file.</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="w-4 h-4 mr-2" />
            Export Rules.json
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={importConfiguration}
            className="hidden"
            id="import-config"
          />
          <Button variant="outline" onClick={() => document.getElementById('import-config')?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import Rules.json
          </Button>
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveConfiguration}>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Current Weights Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-primary">{value}%</div>
                <div className="text-sm text-muted-foreground">
                  {criteriaNames[key as keyof typeof criteriaNames]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sliders">Sliders</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="matrix">Pairwise Matrix</TabsTrigger>
          <TabsTrigger value="profiles">Preset Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="sliders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weight Assignment</CardTitle>
              <CardDescription>
                Use sliders to assign relative weights to each criterion. Weights automatically adjust to sum to 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`slider-${key}`}>
                      {criteriaNames[key as keyof typeof criteriaNames]}
                    </Label>
                    <Badge variant="secondary">{value}%</Badge>
                  </div>
                  <Slider
                    id={`slider-${key}`}
                    min={0}
                    max={100}
                    step={1}
                    value={[value]}
                    onValueChange={(values: number[]) => handleWeightChange(key as keyof typeof weights, values[0])}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Drag & Drop Ranking</CardTitle>
              <CardDescription>
                Drag criteria to reorder them by importance. Higher-ranked criteria receive more weight.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rankingOrder.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex !== null) {
                        handleRankingReorder(draggedIndex, index);
                        setDraggedIndex(null);
                      }
                    }}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-move hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <Badge variant="outline">{item.weight}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pairwise Comparison Matrix</CardTitle>
              <CardDescription>
                Compare criteria pairwise using the Analytic Hierarchy Process. Values greater than 1 indicate the row criterion is more important than the column criterion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left"></th>
                      {criteria.map(col => (
                        <th key={col} className="p-2 text-center text-sm font-medium">
                          {criteriaNames[col as keyof typeof criteriaNames]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map(row => (
                      <tr key={row}>
                        <td className="p-2 font-medium text-sm">
                          {criteriaNames[row as keyof typeof criteriaNames]}
                        </td>
                        {criteria.map(col => (
                          <td key={col} className="p-2 text-center">
                            {row === col ? (
                              <div className="w-16 h-8 bg-muted rounded flex items-center justify-center text-sm">
                                1.0
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min="0.1"
                                max="9"
                                step="0.1"
                                value={pairwiseMatrix[row]?.[col] || 1}
                                onChange={(e) => handleMatrixChange(row, col, parseFloat(e.target.value) || 1)}
                                className="w-16 h-8 text-center text-sm"
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Scale:</strong> 1 = Equal importance, 3 = Moderate importance, 5 = Strong importance, 7 = Very strong importance, 9 = Extreme importance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(PRESET_PROFILES).map(([key, profile]) => (
              <Card key={key} className={`cursor-pointer transition-colors ${selectedProfile === key ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{profile.name}</CardTitle>
                    {selectedProfile === key && <Badge>Active</Badge>}
                  </div>
                  <CardDescription>{profile.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(profile.weights).map(([criterion, weight]) => (
                      <div key={criterion} className="flex justify-between text-sm">
                        <span>{criteriaNames[criterion as keyof typeof criteriaNames]}</span>
                        <span className="font-medium">{weight}%</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <Button 
                    variant={selectedProfile === key ? "secondary" : "outline"} 
                    className="w-full"
                    onClick={() => applyPresetProfile(key)}
                  >
                    {selectedProfile === key ? 'Currently Active' : 'Apply Profile'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Profiles */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Profiles</CardTitle>
              <CardDescription>Save your current configuration as a custom profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter profile name"
                  value={customProfileName}
                  onChange={(e) => setCustomProfileName(e.target.value)}
                />
                <Button onClick={saveCustomProfile} disabled={!customProfileName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </div>
              
              {Object.keys(data.prioritizationConfig.customProfiles).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Saved Custom Profiles</h4>
                  {Object.entries(data.prioritizationConfig.customProfiles).map(([name, profileWeights]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setWeights(profileWeights);
                            updateRankingWeights(profileWeights);
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const newProfiles = { ...data.prioritizationConfig.customProfiles };
                            delete newProfiles[name];
                            setPrioritizationConfig({
                              ...data.prioritizationConfig,
                              customProfiles: newProfiles
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
