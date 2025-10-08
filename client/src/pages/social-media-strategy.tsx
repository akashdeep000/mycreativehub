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
  ArrowLeft,
  Home,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";

interface ContentPillar {
  id: string;
  title: string;
  description: string;
  goals: string;
  cta: string;
}

interface SocialMediaStrategy {
  id?: number;
  userId?: string;
  contentGoals?: string;
  pillars: ContentPillar[];
  updatedAt?: string;
}

export default function SocialMediaStrategy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
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
          contentGoals: existingStrategy?.contentGoals || "",
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Please log in to view your strategy.</div>
          </div>
        </div>
      </div>
    );
  }

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

  const handleOpenDialog = () => {
    setFormData({
      title: "",
      description: "",
      goals: "",
      cta: ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a content pillar title",
        variant: "destructive",
      });
      return;
    }

    const newPillar: ContentPillar = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      goals: formData.goals,
      cta: formData.cta
    };

    const newPillars = [...pillars, newPillar];
    setPillars(newPillars);
    saveMutation.mutate(newPillars);
    setIsDialogOpen(false);
  };

  const handleDelete = (pillarId: string) => {
    const updatedPillars = pillars.filter(p => p.id !== pillarId);
    setPillars(updatedPillars);
    saveMutation.mutate(updatedPillars);
    toast({
      title: "Deleted",
      description: "Content pillar has been deleted.",
    });
  };

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

        {/* Content Area */}
        {pillars.length === 0 ? (
          // Empty State
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
              data-testid="button-add-new-pillar"
              onClick={handleOpenDialog}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Content Pillar
            </Button>
          </div>
        ) : (
          // Pillars Display
          <>
            <div className="flex justify-end mb-6">
              <Button
                data-testid="button-add-pillar"
                onClick={handleOpenDialog}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Content Pillar
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {pillars.map((pillar) => (
                <Card 
                  key={pillar.id}
                  data-testid={`card-pillar-${pillar.id}`}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-6"
                >
                  {/* Title with action icons */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pillar.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`button-edit-${pillar.id}`}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        data-testid={`button-delete-${pillar.id}`}
                        onClick={() => handleDelete(pillar.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Compact field display */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {pillar.description || 'No description recorded'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Content Pillar Goals
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {pillar.goals || 'No goals recorded'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Call-to-Action
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {pillar.cta || 'No call-to-action recorded'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Add Content Pillar Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                Add New Content Pillar
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="pillar-title" className="text-gray-700 dark:text-gray-300">
                  Content Pillar Theme
                </Label>
                <Input
                  id="pillar-title"
                  data-testid="input-pillar-title"
                  placeholder="e.g., Education, Inspiration, Behind the Scenes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="pillar-description" className="text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="pillar-description"
                  data-testid="textarea-pillar-description"
                  placeholder="What is this pillar about?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="pillar-goals" className="text-gray-700 dark:text-gray-300">
                  Content Pillar Goals
                </Label>
                <Textarea
                  id="pillar-goals"
                  data-testid="textarea-pillar-goals"
                  placeholder="What do you want to achieve with this pillar?"
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  rows={3}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <Label htmlFor="pillar-cta" className="text-gray-700 dark:text-gray-300">
                  Call-to-Action
                </Label>
                <Input
                  id="pillar-cta"
                  data-testid="input-pillar-cta"
                  placeholder="What action do you want people to take?"
                  value={formData.cta}
                  onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                data-testid="button-cancel"
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                data-testid="button-save"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save Pillar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
