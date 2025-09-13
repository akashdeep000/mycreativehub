import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
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
  const sopId = params.id;
  const [sop, setSop] = useState<SOP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (sopId) {
      const savedSOPs = localStorage.getItem('sop-builder-sops');
      if (savedSOPs) {
        const sops: SOP[] = JSON.parse(savedSOPs);
        const foundSOP = sops.find(s => s.id === sopId);
        if (foundSOP) {
          setSop(foundSOP);
        }
      }
    }
    setIsLoading(false);
  }, [sopId]);

  const saveSOPToStorage = (updatedSOP: SOP) => {
    const savedSOPs = localStorage.getItem('sop-builder-sops');
    if (savedSOPs) {
      const sops: SOP[] = JSON.parse(savedSOPs);
      const updatedSOPs = sops.map(s => 
        s.id === updatedSOP.id ? { ...updatedSOP, updatedAt: new Date() } : s
      );
      localStorage.setItem('sop-builder-sops', JSON.stringify(updatedSOPs));
      setSop({ ...updatedSOP, updatedAt: new Date() });
    }
  };

  const updateSOPTitle = (newTitle: string) => {
    if (sop) {
      const updatedSOP = { ...sop, title: newTitle };
      saveSOPToStorage(updatedSOP);
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
      saveSOPToStorage(updatedSOP);
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
      saveSOPToStorage(updatedSOP);
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
      saveSOPToStorage(updatedSOP);
    }
  };

  const removeStep = (stepId: string) => {
    if (sop) {
      const updatedSOP = {
        ...sop,
        steps: sop.steps.filter(step => step.id !== stepId)
      };
      saveSOPToStorage(updatedSOP);
    }
  };

  

  const getCompletionStats = () => {
    if (!sop) return { completed: 0, total: 0, percentage: 0 };
    const completed = sop.steps.filter(step => step.completed).length;
    const total = sop.steps.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  if (isLoading) {
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
        <main className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          {/* Mobile Navigation - Single Back Arrow */}
          <div className="flex items-center gap-3 mb-4 lg:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Desktop Navigation - Full Buttons */}
          <div className="hidden lg:flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = "/"}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Main Dashboard
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = "/sop-builder-hub"}
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
              {sop.steps.map((step, index) => (
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
                        onChange={(e) => updateStepText(step.id, e.target.value)}
                        placeholder={`Example: ${
                          index === 0 ? 'Create lead magnet' :
                          index === 1 ? 'Test email sequences' :
                          index === 2 ? 'Launch email campaign' :
                          index === 3 ? 'Set up landing page' :
                          index === 4 ? 'Configure email automation' :
                          index === 5 ? 'Add one simple rule\nIf purchased {Product} → Exit the sales funnel (so buyers stop getting pitches).' :
                          index === 6 ? 'Quick test (always)\nAdd yourself to the trigger → make sure each email lands, links work, mobile looks good.' :
                          index === 7 ? 'Turn it on\nSwitch the automation ON. Promote lead magnet/product to get signups.' :
                          index === 8 ? 'Tips: Keep it simple to improve\nIf opens are low → try a stronger subject on the next email.\nIf clicks are low → move the CTA higher and make it clearer.\nIf someone buys → confirm they stop the sales funnel.' :
                          'Add your step here'
                        }`}
                        className="min-h-[60px] resize-none"
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
                        onChange={(e) => updateStepText(step.id, e.target.value)}
                        placeholder={`Example: ${
                          index === 0 ? 'Create lead magnet' :
                          index === 1 ? 'Test email sequences' :
                          index === 2 ? 'Launch email campaign' :
                          index === 3 ? 'Set up landing page' :
                          index === 4 ? 'Configure email automation' :
                          index === 5 ? 'Add one simple rule\nIf purchased {Product} → Exit the sales funnel (so buyers stop getting pitches).' :
                          index === 6 ? 'Quick test (always)\nAdd yourself to the trigger → make sure each email lands, links work, mobile looks good.' :
                          index === 7 ? 'Turn it on\nSwitch the automation ON. Promote lead magnet/product to get signups.' :
                          index === 8 ? 'Tips: Keep it simple to improve\nIf opens are low → try a stronger subject on the next email.\nIf clicks are low → move the CTA higher and make it clearer.\nIf someone buys → confirm they stop the sales funnel.' :
                          'Add your step here'
                        }`}
                        className="min-h-[80px] w-full resize-none overflow-y-auto"
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