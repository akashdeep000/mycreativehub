import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle,
  GripVertical,
  AlertCircle 
} from 'lucide-react';

import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { WorkflowTemplateInstance } from '@shared/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SOPStep {
  id: string;
  text: string;
  completed: boolean;
}

interface SOP {
  id: string;
  title: string;
  steps: SOPStep[];
  createdAt: Date;
  updatedAt: Date;
}

export default function SOPEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const sopId = params.id;
  const [sop, setSop] = useState<SOP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch templates
  const { data: templates, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["/api/workflow-templates"],
    queryFn: async () => {
      const res = await fetch(`/api/workflow-templates?templateType=sop-builder`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json() as Promise<WorkflowTemplateInstance[]>;
    },
  });

  // Get the templateId for "sop-builder"
  const templateId = templates?.find((t) => t.templateType === "sop-builder")?.id;

  // Fetch template data (SOPs)
  const { data: tempateData, isLoading: isTempateDataLoading } = useQuery({
    queryKey: [`/api/workflow-templates/${templateId}`],
    queryFn: async () => {
      if (!templateId) return null;
      const res = await fetch(`/api/workflow-templates/${templateId}`);
      if (!res.ok) throw new Error('Failed to fetch SOP');
      const data = await res.json();
      return data;
    },
    enabled: !!templateId,
  });

  const sopsData = tempateData?.data.sops as SOP[];
  const isSopLoading = isTempateDataLoading || !sopsData;

  // Set SOP in local state - only on initial load, don't update from server while editing
  useEffect(() => {
    if (sopsData && sopId && !sop) {
      const foundSOP = sopsData.find(s => s.id === sopId) || null;
      setSop(foundSOP);
      setIsLoading(false);
    } else if (sopsData && !sopId && !sop) {
      setIsLoading(false);
    }
  }, [sopsData, sopId]);

  // Auto-resize textareas on component mount and when SOP changes
  useEffect(() => {
    if (sop) {
      const resizeTextareas = () => {
        const textareas = document.querySelectorAll('.auto-resize-textarea');
        textareas.forEach((textarea) => {
          const element = textarea as HTMLTextAreaElement;
          if (element.value) {
            element.style.height = 'auto';
            element.style.height = element.scrollHeight + 'px';
          }
        });
      };

      setTimeout(resizeTextareas, 50);
      setTimeout(resizeTextareas, 200);
      setTimeout(resizeTextareas, 500);

      const handleResize = () => resizeTextareas();
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
    }
  }, [sop]);

  // --- Update SOP via API ---
  const updateMutation = useMutation({
    mutationFn: async ({ updatedSOP, allSOPs }: { updatedSOP: SOP; allSOPs: SOP[] }) => {
      if (!templateId) {
        throw new Error('Template ID not available');
      }

      const updatedSOPs = allSOPs.map(s => 
        s.id === updatedSOP.id ? updatedSOP : s
      );

      return apiRequest(`/api/workflow-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { 
            sops: updatedSOPs,
            lastModified: new Date().toISOString()
          } 
        }),
      });
    },
    onSuccess: () => {
      // Invalidate the queries so the hub page gets fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-templates'] });
      queryClient.invalidateQueries({ queryKey: [`/api/workflow-templates/${templateId}`]});
    },
    onError: () => {
      // toast({
      //   title: 'Save Failed',
      //   description: 'Failed to save SOP changes.',
      //   variant: 'destructive',
      // });
    },
  });

  // --- Debounced save ---
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sopsDataRef = useRef<SOP[] | null>(null);
  const pendingSaveRef = useRef<SOP | null>(null);

  // Keep sopsData in a ref to avoid stale closure
  useEffect(() => {
    if (sopsData) {
      sopsDataRef.current = sopsData;
    }
  }, [sopsData]);

  const debouncedSave = useCallback((updatedSOP: SOP) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Store the pending save
    pendingSaveRef.current = updatedSOP;

    timeoutRef.current = setTimeout(() => {
      if (sopsDataRef.current && pendingSaveRef.current) {
        updateMutation.mutate({ 
          updatedSOP: { ...pendingSaveRef.current, updatedAt: new Date() },
          allSOPs: sopsDataRef.current 
        });
        pendingSaveRef.current = null;
      }
    }, 600);
  }, [updateMutation]);

  // Force save on unmount if there's a pending save
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingSaveRef.current && sopsDataRef.current) {
        // Immediate save on unmount
        updateMutation.mutate({ 
          updatedSOP: { ...pendingSaveRef.current, updatedAt: new Date() },
          allSOPs: sopsDataRef.current 
        });
      }
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);



  const updateSOPTitle = (newTitle: string) => {
    if (sop) {
      const updatedSOP = { ...sop, title: newTitle };
      setSop(updatedSOP);
      debouncedSave(updatedSOP);
    }
  };

  const updateStepText = (stepId: string, newText: string) => {
    if (sop) {
      const updatedSOP = {
        ...sop,
        steps: sop.steps.map(step => 
          step.id === stepId ? { ...step, text: newText } : step
        )
      };
      setSop(updatedSOP);
      debouncedSave(updatedSOP);
    }
  };

  const toggleStepCompletion = (stepId: string) => {
    if (sop) {
      const updatedSOP = {
        ...sop,
        steps: sop.steps.map(step => 
          step.id === stepId ? { ...step, completed: !step.completed } : step
        )
      };
      setSop(updatedSOP);
      debouncedSave(updatedSOP);
    }
  };

  const addNewStep = () => {
    if (sop) {
      const newStep: SOPStep = {
        id: `step-${Date.now()}`,
        text: '',
        completed: false,
      };
      const updatedSOP = {
        ...sop,
        steps: [...sop.steps, newStep]
      };
      setSop(updatedSOP);
      debouncedSave(updatedSOP);
    }
  };

  const removeStep = (stepId: string) => {
    if (sop) {
      const updatedSOP = {
        ...sop,
        steps: sop.steps.filter(step => step.id !== stepId)
      };
      setSop(updatedSOP);
      debouncedSave(updatedSOP);
    }
  };

  const getCompletionStats = () => {
    if (!sop) return { completed: 0, total: 0, percentage: 0 };
    const completed = sop.steps.filter(step => step.completed).length;
    const total = sop.steps.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  if (isLoading || isSopLoading || isTemplatesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">SOP Not Found</h2>
            <p className="text-gray-600 mb-6">The SOP you're looking for doesn't exist.</p>
            <Link href="/sop-builder-hub">
              <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white">
                Back to SOP Builder
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 max-w-full overflow-x-hidden">
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
        {/* Header */}
        <div className="mb-8">
          {/* Mobile Navigation - Single Back Arrow */}
          <div className="flex items-center gap-3 mb-4 lg:hidden mt-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/sop-builder-hub")}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop Navigation - Full Buttons */}
          <div className="hidden lg:flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Main Dashboard
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/sop-builder-hub")}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to SOP Builder Hub
            </Button>
          </div>
          <div className="text-sm text-gray-600 text-center">
            {stats.completed}/{stats.total} steps completed
          </div>
        </div>

        {/* SOP Title */}
        <div className="mb-8 text-center">
          <textarea
            value={sop.title}
            onChange={(e) => updateSOPTitle(e.target.value)}
            className="text-7xl font-bold border-none bg-transparent p-0 focus:ring-0 text-gray-900 text-center resize-none w-full"
            style={{ fontSize: '1.5rem', lineHeight: '1.2' }}
            placeholder="SOP Title"
            rows={1}
          />
        </div>

        {/* SOP Content */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* Steps List */}
            <div className="space-y-4">
              {sop.steps.filter(step => !step.text.includes('Execute launch week')).map((step, index) => (
                <div key={step.id} className="p-4 border rounded-lg bg-white">
                  {/* Desktop Layout */}
                  <div className="hidden lg:flex items-start gap-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <span className="text-sm font-medium text-gray-500 min-w-[60px]">
                        Step {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <Textarea
                        value={step.text}
                        onChange={(e) => {
                          updateStepText(step.id, e.target.value);
                          setTimeout(() => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }, 0);
                        }}
                        ref={(textarea) => {
                          if (textarea && step.text) {
                            setTimeout(() => {
                              textarea.style.height = 'auto';
                              textarea.style.height = textarea.scrollHeight + 'px';
                            }, 50);
                          }
                        }}
                        placeholder="Write your Step by Step process here..."
                        className="min-h-[60px] resize-none overflow-y-auto auto-resize-textarea text-gray-900"
                        rows={1}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={step.completed}
                        onCheckedChange={() => toggleStepCompletion(step.id)}
                        className="data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600"
                      />
                      <span className="text-sm text-gray-600">Completed</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="lg:hidden space-y-3">
                    {/* Step Number */}
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <span className="text-sm font-medium text-gray-500">
                        Step {index + 1}
                      </span>
                    </div>

                    {/* Completion Status and Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={step.completed}
                          onCheckedChange={() => toggleStepCompletion(step.id)}
                          className="data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600"
                        />
                        <span className="text-sm text-gray-600">Completed</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Full-width Text Input */}
                    <div className="w-full">
                      <Textarea
                        value={step.text}
                        onChange={(e) => {
                          updateStepText(step.id, e.target.value);
                          setTimeout(() => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }, 0);
                        }}
                        ref={(textarea) => {
                          if (textarea && step.text) {
                            setTimeout(() => {
                              textarea.style.height = 'auto';
                              textarea.style.height = textarea.scrollHeight + 'px';
                            }, 50);
                          }
                        }}
                        placeholder="Write your Step by Step process here..."
                        className="min-h-[80px] w-full resize-none overflow-y-auto text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Step Button */}
            <div className="mt-6">
              <Button
                onClick={addNewStep}
                variant="outline"
                className="w-full border-2 border-dashed border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Step
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Progress Summary</h3>
                <p className="text-gray-600">
                  {stats.completed} of {stats.total} steps completed ({Math.round(stats.percentage)}%)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {stats.completed === stats.total && stats.total > 0 ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <Circle className="h-8 w-8 text-gray-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </main>
      </div>
    </div>
  );
}