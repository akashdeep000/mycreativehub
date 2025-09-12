import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit3, Trash2, Download, TrendingUp, Calendar, CheckCircle2, FileText, Lightbulb } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface GrowthPlan {
  id: string;
  productName: string;
  launchDate: string;
  keyInsights: string;
  whatWentWell: string;
  whatNeedsImprovement: string;
  newIdeas: string;
  teamNotes?: string;
  isCompleted: boolean;
  createdAt: string;
}

export default function LaunchGrowthPlan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [growthPlans, setGrowthPlans] = useState<GrowthPlan[]>(() => {
    const saved = localStorage.getItem('launchGrowthPlans');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GrowthPlan | null>(null);
  const [formData, setFormData] = useState({
    productName: '',
    launchDate: '',
    keyInsights: '',
    whatWentWell: '',
    whatNeedsImprovement: '',
    newIdeas: '',
    teamNotes: '',
    isCompleted: false
  });

  useEffect(() => {
    localStorage.setItem('launchGrowthPlans', JSON.stringify(growthPlans));
  }, [growthPlans]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const resetForm = () => {
    setFormData({
      productName: '',
      launchDate: '',
      keyInsights: '',
      whatWentWell: '',
      whatNeedsImprovement: '',
      newIdeas: '',
      teamNotes: '',
      isCompleted: false
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingPlan(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (plan: GrowthPlan) => {
    setFormData({
      productName: plan.productName,
      launchDate: plan.launchDate,
      keyInsights: plan.keyInsights,
      whatWentWell: plan.whatWentWell,
      whatNeedsImprovement: plan.whatNeedsImprovement,
      newIdeas: plan.newIdeas,
      teamNotes: plan.teamNotes || '',
      isCompleted: plan.isCompleted
    });
    setEditingPlan(plan);
    setIsAddModalOpen(true);
  };

  const savePlan = () => {
    if (!formData.productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name for your growth plan",
        variant: "destructive",
      });
      return;
    }

    if (editingPlan) {
      // Update existing plan
      const updatedPlans = growthPlans.map(plan =>
        plan.id === editingPlan.id
          ? { ...plan, ...formData }
          : plan
      );
      setGrowthPlans(updatedPlans);
      toast({
        title: "Growth Plan Updated",
        description: `Updated plan for ${formData.productName}`,
      });
    } else {
      // Create new plan
      const newPlan: GrowthPlan = {
        id: generateId(),
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setGrowthPlans([...growthPlans, newPlan]);
      toast({
        title: "Growth Plan Created",
        description: `Created new plan for ${formData.productName}`,
      });
    }

    setIsAddModalOpen(false);
    resetForm();
    setEditingPlan(null);
  };

  const deletePlan = (id: string) => {
    const planToDelete = growthPlans.find(p => p.id === id);
    setGrowthPlans(growthPlans.filter(p => p.id !== id));
    toast({
      title: "Growth Plan Deleted",
      description: `Deleted plan for ${planToDelete?.productName}`,
    });
  };

  const toggleCompleted = (id: string) => {
    const updatedPlans = growthPlans.map(plan =>
      plan.id === id
        ? { ...plan, isCompleted: !plan.isCompleted }
        : plan
    );
    setGrowthPlans(updatedPlans);
    
    const plan = updatedPlans.find(p => p.id === id);
    toast({
      title: plan?.isCompleted ? "Plan Completed" : "Plan Unmarked",
      description: plan?.isCompleted 
        ? "Great! Your insights have been captured for next time." 
        : "Plan marked as incomplete",
    });
  };

  const exportSelectedPlans = async () => {
    const completedPlans = growthPlans.filter(plan => plan.isCompleted);
    
    if (completedPlans.length === 0) {
      toast({
        title: "No Completed Plans",
        description: "Please complete at least one growth plan to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Launch Growth Plans', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      for (let i = 0; i < completedPlans.length; i++) {
        const plan = completedPlans[i];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        // Plan header
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${plan.productName} - ${plan.launchDate}`, 20, yPosition);
        yPosition += 15;

        // Plan content
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const fields = [
          { label: 'Key Insights:', content: plan.keyInsights },
          { label: 'What Went Well:', content: plan.whatWentWell },
          { label: 'What Needs Improvement:', content: plan.whatNeedsImprovement },
          { label: 'New Ideas to Try:', content: plan.newIdeas },
          { label: 'Team Notes:', content: plan.teamNotes || 'N/A' }
        ];

        for (const field of fields) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(field.label, 20, yPosition);
          yPosition += 7;
          
          pdf.setFont('helvetica', 'normal');
          const splitContent = pdf.splitTextToSize(field.content || 'N/A', pageWidth - 40);
          pdf.text(splitContent, 20, yPosition);
          yPosition += splitContent.length * 5 + 5;
        }

        yPosition += 10;
      }

      pdf.save('launch-growth-plans.pdf');
      toast({
        title: "Export Successful",
        description: `Exported ${completedPlans.length} completed growth plans`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="mb-4">
                {/* Mobile Navigation - Single Back Arrow */}
                <div className="flex items-center gap-3 lg:hidden">
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
                <div className="hidden lg:flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => window.location.href = '/'}
                    className=""
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Main Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation('/launch')}
                    className=""
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Product Launch
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Launch Growth Plan</h1>
                  <p className="text-gray-600 mt-2">
                    Capture key insights and plan improvements for your next launch
                  </p>
                </div>
              </div>
            </div>
          </div>



          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">
                {growthPlans.length} growth plans • {growthPlans.filter(p => p.isCompleted).length} completed
              </span>
            </div>
          </div>

          {/* Growth Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {growthPlans.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Growth Plans Yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first growth plan to capture insights from your launch
                </p>
                <Button onClick={openAddModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Growth Plan
                </Button>
              </div>
            ) : (
              growthPlans.map((plan) => (
                <Card key={plan.id} className={`h-fit ${plan.isCompleted ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-gray-900 mb-1">{plan.productName}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {plan.launchDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(plan)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePlan(plan.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Key Insights</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{plan.keyInsights || 'No insights recorded'}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">What Went Well</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{plan.whatWentWell || 'No notes recorded'}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Needs Improvement</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{plan.whatNeedsImprovement || 'No improvements noted'}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`completed-${plan.id}`}
                          checked={plan.isCompleted}
                          onCheckedChange={() => toggleCompleted(plan.id)}
                        />
                        <label
                          htmlFor={`completed-${plan.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I've updated my next launch plan with these learnings
                        </label>
                      </div>
                      {plan.isCompleted && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Add New Growth Plan Button - shown when there are existing plans */}
          {growthPlans.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add New Growth Plan
              </Button>
            </div>
          )}

          {/* Add/Edit Modal */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? 'Edit Growth Plan' : 'New Growth Plan'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collection Name *
                    </label>
                    <Input
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Launch Date
                    </label>
                    <Input
                      type="date"
                      value={formData.launchDate}
                      onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What Went Well (Repeat)
                  </label>
                  <Textarea
                    value={formData.whatWentWell}
                    onChange={(e) => setFormData({ ...formData, whatWentWell: e.target.value })}
                    placeholder="What strategies or tactics worked well and should be repeated?"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What Needs Improvement (Adjust or Drop)
                  </label>
                  <Textarea
                    value={formData.whatNeedsImprovement}
                    onChange={(e) => setFormData({ ...formData, whatNeedsImprovement: e.target.value })}
                    placeholder="What didn't work as expected and needs to be changed?"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Ideas to Try Next Time
                  </label>
                  <Textarea
                    value={formData.newIdeas}
                    onChange={(e) => setFormData({ ...formData, newIdeas: e.target.value })}
                    placeholder="What new strategies or approaches do you want to test?"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Notes or Feedback (Optional)
                  </label>
                  <Textarea
                    value={formData.teamNotes}
                    onChange={(e) => setFormData({ ...formData, teamNotes: e.target.value })}
                    placeholder="Any additional notes from team members or collaborators?"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="completed"
                    checked={formData.isCompleted}
                    onCheckedChange={(checked) => setFormData({ ...formData, isCompleted: !!checked })}
                  />
                  <label
                    htmlFor="completed"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I've updated my next launch plan with these learnings
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                    setEditingPlan(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={savePlan}>
                  {editingPlan ? 'Update Plan' : 'Save Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Tips Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="w-5 h-5" />
                Growth Planning Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
                  <ul className="space-y-1">
                    <li>• Complete your growth plan within 1-2 weeks of launch</li>
                    <li>• Be specific and actionable in your insights</li>
                    <li>• Include both positive and negative feedback</li>
                    <li>• Review previous plans before your next launch</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}