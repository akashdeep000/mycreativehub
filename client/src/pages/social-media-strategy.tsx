import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Plus, 
  Trash2,
  Check,
  Loader2
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
  
  const [contentGoals, setContentGoals] = useState("");
  const [pillars, setPillars] = useState<ContentPillar[]>([
    { id: "1", name: "", description: "", goals: "", cta: "" },
    { id: "2", name: "", description: "", goals: "", cta: "" },
    { id: "3", name: "", description: "", goals: "", cta: "" }
  ]);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  const { data: existingStrategy, isLoading } = useQuery<SocialMediaStrategy>({
    queryKey: ['/api/social-media-strategy'],
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (strategyData: SocialMediaStrategy) => {
      console.log("🔵 MUTATION FUNCTION CALLED with data:", strategyData);
      
      const response = await apiRequest('/api/social-media-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      });
      
      console.log("🟢 MUTATION RESPONSE received:", response.status);
      
      if (!response.ok) {
        throw new Error('Failed to save strategy');
      }
      
      return response.json();
    },
    onMutate: (data) => {
      console.log("🟡 onMutate triggered with:", data);
      setSaveStatus('saving');
    },
    onSuccess: (data) => {
      console.log("🟢 onSuccess triggered with:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/social-media-strategy'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    },
    onError: (error: any) => {
      console.log("🔴 onError triggered:", error);
      setSaveStatus('idle');
      
      if (isUnauthorizedError(error)) {
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
    if (existingStrategy && !hasLoadedInitialData) {
      setContentGoals(existingStrategy.contentGoals || "");
      setPillars(existingStrategy.pillars || [
        { id: "1", name: "", description: "", goals: "", cta: "" },
        { id: "2", name: "", description: "", goals: "", cta: "" },
        { id: "3", name: "", description: "", goals: "", cta: "" }
      ]);
      setHasLoadedInitialData(true);
    }
  }, [existingStrategy, hasLoadedInitialData]);

  const saveStrategy = (newGoals: string, newPillars: ContentPillar[]) => {
    console.log("💾 saveStrategy called with:", { newGoals, newPillars, userExists: !!user });
    if (!user) {
      console.log("❌ No user, not saving");
      return;
    }
    
    console.log("✅ Calling saveMutation.mutate()");
    saveMutation.mutate({
      contentGoals: newGoals,
      pillars: newPillars
    });
  };

  const updateContentGoals = (goals: string) => {
    setContentGoals(goals);
    saveStrategy(goals, pillars);
  };

  const updatePillar = (id: string, field: keyof ContentPillar, value: string) => {
    const newPillars = pillars.map(pillar =>
      pillar.id === id ? { ...pillar, [field]: value } : pillar
    );
    setPillars(newPillars);
    saveStrategy(contentGoals, newPillars);
  };

  const addPillar = () => {
    const newId = Date.now().toString();
    const newPillars = [...pillars, { id: newId, name: "", description: "", goals: "", cta: "" }];
    setPillars(newPillars);
    saveStrategy(contentGoals, newPillars);
  };

  const removePillar = (id: string) => {
    if (pillars.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "You need at least one content pillar",
        variant: "destructive",
      });
      return;
    }
    
    const newPillars = pillars.filter(pillar => pillar.id !== id);
    setPillars(newPillars);
    saveStrategy(contentGoals, newPillars);
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-8 h-8 text-pink-500" />
              Social Media Strategy
            </h1>
            
            {/* Save indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Define your content strategy and pillars
          </p>
        </div>

        {/* Content Goals Section */}
        <Card className="mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">Content Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              data-testid="textarea-content-goals"
              placeholder="What are your overall content goals? (e.g., educate, inspire, convert)"
              value={contentGoals}
              onChange={(e) => updateContentGoals(e.target.value)}
              rows={4}
              className="w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </CardContent>
        </Card>

        {/* Content Pillars Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Content Pillars</h2>
            <Button
              data-testid="button-add-pillar"
              onClick={addPillar}
              size="sm"
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Pillar
            </Button>
          </div>

          <div className="space-y-4">
            {pillars.map((pillar, index) => (
              <Card key={pillar.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-gray-900 dark:text-white">
                      Pillar {index + 1}
                    </CardTitle>
                    <Button
                      data-testid={`button-delete-pillar-${pillar.id}`}
                      onClick={() => removePillar(pillar.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pillar Name */}
                  <div>
                    <Label htmlFor={`pillar-${pillar.id}-name`} className="text-gray-700 dark:text-gray-300">
                      Name
                    </Label>
                    <Input
                      id={`pillar-${pillar.id}-name`}
                      data-testid={`input-pillar-name-${pillar.id}`}
                      placeholder="Pillar name (e.g., Education, Inspiration, Behind the Scenes)"
                      value={pillar.name}
                      onChange={(e) => updatePillar(pillar.id, 'name', e.target.value)}
                      className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Pillar Description */}
                  <div>
                    <Label htmlFor={`pillar-${pillar.id}-description`} className="text-gray-700 dark:text-gray-300">
                      Description
                    </Label>
                    <Textarea
                      id={`pillar-${pillar.id}-description`}
                      data-testid={`textarea-pillar-description-${pillar.id}`}
                      placeholder="What is this pillar about?"
                      value={pillar.description}
                      onChange={(e) => updatePillar(pillar.id, 'description', e.target.value)}
                      rows={2}
                      className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Pillar Goals */}
                  <div>
                    <Label htmlFor={`pillar-${pillar.id}-goals`} className="text-gray-700 dark:text-gray-300">
                      Goals
                    </Label>
                    <Textarea
                      id={`pillar-${pillar.id}-goals`}
                      data-testid={`textarea-pillar-goals-${pillar.id}`}
                      placeholder="What do you want to achieve with this pillar?"
                      value={pillar.goals}
                      onChange={(e) => updatePillar(pillar.id, 'goals', e.target.value)}
                      rows={2}
                      className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Pillar CTA */}
                  <div>
                    <Label htmlFor={`pillar-${pillar.id}-cta`} className="text-gray-700 dark:text-gray-300">
                      Call to Action
                    </Label>
                    <Input
                      id={`pillar-${pillar.id}-cta`}
                      data-testid={`input-pillar-cta-${pillar.id}`}
                      placeholder="What action do you want people to take?"
                      value={pillar.cta}
                      onChange={(e) => updatePillar(pillar.id, 'cta', e.target.value)}
                      className="mt-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
