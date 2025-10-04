import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useDebounce } from "@/hooks/use-debounce";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Smartphone
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface ContentPillar {
  id: string;
  title: string;
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
  
  // Save status for user feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Track if we've loaded initial data from cache (prevent circular updates)
  const hasLoadedInitialData = useRef(false);
  
  const [strategy, setStrategy] = useState<SocialMediaStrategy>({
    contentGoals: "",
    pillars: [
      { id: "1", title: "", cta: "" },
      { id: "2", title: "", cta: "" },
      { id: "3", title: "", cta: "" }
    ]
  });

  // Fetch existing strategy - ALWAYS fetch fresh from database on mount
  const { data: existingStrategy, isLoading, dataUpdatedAt } = useQuery<SocialMediaStrategy>({
    queryKey: ['/api/social-media-strategy'],
    enabled: !!user,
    retry: false,
    staleTime: 0, // Always fetch fresh data from database
    refetchOnMount: true, // CRITICAL: Always refetch on mount to prevent stale cache overwrites
  });

  // Save strategy mutation
  const saveMutation = useMutation({
    mutationFn: async (strategyData: SocialMediaStrategy) => {
      return await apiRequest('/api/social-media-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      });
    },
    onSuccess: (data) => {
      // Update cache directly with server response (no refetch = no race condition)
      queryClient.setQueryData(['/api/social-media-strategy'], data);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save strategy. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing strategy from fresh database fetch (prevent circular updates)
  useEffect(() => {
    // CRITICAL: Wait until loading is done before hydrating state
    if (isLoading) return;
    
    // Mark as loaded once loading finishes, even if there's no data
    if (!hasLoadedInitialData.current) {
      hasLoadedInitialData.current = true;
      
      // Only hydrate if there's actual data from the database
      if (existingStrategy) {
        setStrategy({
          contentGoals: existingStrategy.contentGoals || "",
          pillars: existingStrategy.pillars || [
            { id: "1", title: "", cta: "" },
            { id: "2", title: "", cta: "" },
            { id: "3", title: "", cta: "" }
          ],
          id: existingStrategy.id,
          userId: existingStrategy.userId,
          updatedAt: existingStrategy.updatedAt
        });
      }
    }
    // After initial load, local state is the source of truth (ignore subsequent fetches)
  }, [existingStrategy, isLoading]);

  // Debounced auto-save - saves 1 second after user stops typing
  const { debounced: debouncedSave, flush: flushSave } = useDebounce(() => {
    if (!user) return;

    // CRITICAL: Don't auto-save until initial data has loaded (prevents overwriting with empty state)
    if (!hasLoadedInitialData.current) return;

    // Only save if there's actual content (not just empty structure)
    const hasContent = strategy.contentGoals.trim() || 
                      strategy.pillars.some(p => p.title.trim() || p.cta.trim());
    
    if (hasContent) {
      setSaveStatus('saving');
      
      saveMutation.mutate({
        contentGoals: strategy.contentGoals,
        pillars: strategy.pillars
      });
    }
  }, 1000);

  // Flush pending saves on unmount or visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    const handleBeforeUnload = () => {
      flushSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      flushSave();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushSave]);

  // Track changes and trigger debounced save
  const lastSavedRef = useRef<string>('');

  // Create stable string representations for comparison
  const contentGoalsString = strategy.contentGoals;
  const pillarsString = strategy.pillars.map(p => `${p.id}:${p.title}:${p.cta}`).join('|');
  const combinedString = `${contentGoalsString}||${pillarsString}`;

  useEffect(() => {
    // Skip if no change from last saved state
    if (combinedString === lastSavedRef.current) return;

    // Update tracking ref and trigger debounced save
    lastSavedRef.current = combinedString;
    debouncedSave();
  }, [combinedString, debouncedSave]);

  const updateContentGoals = (goals: string) => {
    setStrategy(prev => ({ ...prev, contentGoals: goals }));
  };

  const updatePillar = (id: string, field: 'title' | 'cta', value: string) => {
    setStrategy(prev => ({
      ...prev,
      pillars: prev.pillars.map(pillar =>
        pillar.id === id ? { ...pillar, [field]: value } : pillar
      )
    }));
  };

  const addPillar = () => {
    const newId = Date.now().toString();
    setStrategy(prev => ({
      ...prev,
      pillars: [...prev.pillars, { id: newId, title: "", cta: "" }]
    }));
  };

  const removePillar = (id: string) => {
    setStrategy(prev => ({
      ...prev,
      pillars: prev.pillars.filter(pillar => pillar.id !== id)
    }));
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading your strategy...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          {/* Mobile Navigation - Single Back Arrow */}
          <div className="flex items-center gap-3 mb-4 lg:hidden mt-16">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/content")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Desktop Navigation - Full Buttons */}
          <div className="hidden lg:flex items-center gap-4 mb-4">
            <BackToDashboard />
            <Link href="/content-planning">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content Planning
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">My Social Media Strategy</h1>
              <p className="text-gray-600">Define your content goals and organise your content pillars</p>
            </div>
          </div>
        </div>

        {/* Instruction Section */}
        <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="text-gray-700">
              <p className="font-medium mb-2">Use this section to organise your content strategy.</p>
              <p className="text-sm">
                Define your goals, segment your content pillars, and write your call-to-actions.
              </p>
              <p className="text-sm mt-2 text-gray-600">
                <em>(Does Pillar One send people to your shop? Does Pillar Two guide them to your email list? Does Pillar Three send them to your YouTube channel?)</em>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-4xl space-y-8">
          {/* Content Goals Section */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  Content Goals
                </div>
                {/* Save indicator next to title */}
                <div className="text-sm">
                  {saveStatus === 'saving' && (
                    <span className="text-gray-500">Saving...</span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-green-600">✓ Saved</span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content-goals" className="text-gray-700">
                  What's the purpose behind your content? What do you want it to achieve?
                </Label>
                <Textarea
                  id="content-goals"
                  value={strategy.contentGoals}
                  onChange={(e) => updateContentGoals(e.target.value)}
                  placeholder="Grow email list, drive product visibility, build brand trust..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Pillars Section */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  Content Pillars
                </CardTitle>
                <Button
                  onClick={addPillar}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pillar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {strategy.pillars.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No content pillars yet. Add your first pillar to get started!</p>
                  <Button
                    onClick={addPillar}
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Pillar
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {strategy.pillars.map((pillar, index) => (
                  <Card key={pillar.id} className="shadow-md border-0 bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">
                          Pillar {index + 1}
                        </h3>
                        <Button
                          onClick={() => removePillar(pillar.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor={`pillar-title-${pillar.id}`} className="text-sm text-gray-600">
                          Pillar Name
                        </Label>
                        <Input
                          id={`pillar-title-${pillar.id}`}
                          value={pillar.title}
                          onChange={(e) => updatePillar(pillar.id, 'title', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          placeholder="e.g., Behind the Scenes"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`pillar-cta-${pillar.id}`} className="text-sm text-gray-600">
                          Call-to-Action (where do you want this pillar to send people?)
                        </Label>
                        <Input
                          id={`pillar-cta-${pillar.id}`}
                          value={pillar.cta}
                          onChange={(e) => updatePillar(pillar.id, 'cta', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          placeholder="e.g., Shop, Newsletter, Podcast..."
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}