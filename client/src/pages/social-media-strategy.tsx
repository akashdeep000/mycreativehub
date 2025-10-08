import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Target, 
  Plus, 
  Trash2,
  Pencil,
  ArrowLeft,
  Home
} from "lucide-react";

interface ContentPillar {
  id: string;
  name: string;
  description: string;
  goals: string;
  cta: string;
}

interface SocialMediaStrategy {
  id?: number;
  userId?: string;
  contentGoals: string;
  pillars: ContentPillar[];
  updatedAt?: string;
}

export default function SocialMediaStrategy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState<ContentPillar | null>(null);
  
  // Form state for dialog
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    goals: "",
    cta: ""
  });

  const { data: existingStrategy, isLoading } = useQuery<SocialMediaStrategy>({
    queryKey: ['/api/social-media-strategy'],
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (newPillars: ContentPillar[]) => {
      return await apiRequest('/api/social-media-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentGoals: "",
          pillars: newPillars
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/social-media-strategy'] });
      toast({
        title: "Saved",
        description: "Your content pillar has been saved successfully.",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('401') || error.message?.includes('403')) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Save failed",
        description: "Unable to save your changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (existingStrategy?.pillars !== undefined) {
      setPillars(existingStrategy.pillars);
    }
  }, [existingStrategy]);

  const openAddDialog = () => {
    setEditingPillar(null);
    setFormData({
      name: "",
      description: "",
      goals: "",
      cta: ""
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (pillar: ContentPillar) => {
    setEditingPillar(pillar);
    setFormData({
      name: pillar.name,
      description: pillar.description,
      goals: pillar.goals,
      cta: pillar.cta
    });
    setIsDialogOpen(true);
  };

  const handleSavePillar = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a pillar name",
        variant: "destructive",
      });
      return;
    }

    let newPillars: ContentPillar[];
    
    if (editingPillar) {
      // Update existing pillar
      newPillars = pillars.map(p => 
        p.id === editingPillar.id 
          ? { ...editingPillar, ...formData }
          : p
      );
    } else {
      // Add new pillar
      const newPillar: ContentPillar = {
        id: Date.now().toString(),
        ...formData
      };
      newPillars = [...pillars, newPillar];
    }

    setPillars(newPillars);
    saveMutation.mutate(newPillars);
    setIsDialogOpen(false);
  };

  const handleDeletePillar = (id: string) => {
    const newPillars = pillars.filter(p => p.id !== id);
    setPillars(newPillars);
    saveMutation.mutate(newPillars);
    toast({
      title: "Deleted",
      description: "Content pillar has been deleted.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Loading your strategy...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            data-testid="button-back"
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            data-testid="button-dashboard"
            onClick={() => setLocation('/dashboard')}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Main Dashboard
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-8 h-8 text-pink-500" />
            My Social Media Strategy
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Define your content pillars to guide your social media strategy
          </p>
        </div>

        {/* Content Pillars Grid */}
        {pillars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-center mb-6">
              <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Content Pillars Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Get started by adding your first content pillar
              </p>
            </div>
            <Button
              data-testid="button-add-first-pillar"
              onClick={openAddDialog}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Content Pillar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <Button
                data-testid="button-add-pillar"
                onClick={openAddDialog}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Pillar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pillars.map((pillar) => (
                <Card 
                  key={pillar.id} 
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                      {pillar.name}
                    </h3>
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        data-testid={`button-edit-pillar-${pillar.id}`}
                        onClick={() => openEditDialog(pillar)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`button-delete-pillar-${pillar.id}`}
                        onClick={() => handleDeletePillar(pillar.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {pillar.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {pillar.description}
                    </p>
                  )}

                  {pillar.goals && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goals:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {pillar.goals}
                      </p>
                    </div>
                  )}

                  {pillar.cta && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Call to Action:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {pillar.cta}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Add/Edit Pillar Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                {editingPillar ? 'Edit Content Pillar' : 'Add Content Pillar'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="pillar-name" className="text-gray-700 dark:text-gray-300">
                  Content Pillar Name *
                </Label>
                <Input
                  id="pillar-name"
                  data-testid="input-dialog-pillar-name"
                  placeholder="e.g., Education, Inspiration, Behind the Scenes"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="pillar-description" className="text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="pillar-description"
                  data-testid="textarea-dialog-pillar-description"
                  placeholder="What is this pillar about?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="pillar-goals" className="text-gray-700 dark:text-gray-300">
                  Goals
                </Label>
                <Textarea
                  id="pillar-goals"
                  data-testid="textarea-dialog-pillar-goals"
                  placeholder="What do you want to achieve with this pillar?"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  rows={3}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="pillar-cta" className="text-gray-700 dark:text-gray-300">
                  Call to Action
                </Label>
                <Input
                  id="pillar-cta"
                  data-testid="input-dialog-pillar-cta"
                  placeholder="What action do you want people to take?"
                  value={formData.cta}
                  onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                data-testid="button-cancel-pillar"
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                data-testid="button-save-pillar"
                onClick={handleSavePillar}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                Save Pillar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
