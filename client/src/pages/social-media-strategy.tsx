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
  version: number;
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
  
  // Track if we've loaded initial data
  const hasLoadedInitialData = useRef(false);
  
  // Server state (source of truth from DB)
  const [serverStrategy, setServerStrategy] = useState<SocialMediaStrategy>({
    version: 0,
    contentGoals: "",
    pillars: [
      { id: "1", title: "", cta: "" },
      { id: "2", title: "", cta: "" },
      { id: "3", title: "", cta: "" }
    ]
  });
  
  // Local draft state (for inputs while editing)
  const [draftContentGoals, setDraftContentGoals] = useState("");
  const [draftPillars, setDraftPillars] = useState<ContentPillar[]>([
    { id: "1", title: "", cta: "" },
    { id: "2", title: "", cta: "" },
    { id: "3", title: "", cta: "" }
  ]);
  
  // Track which fields are being edited (prevent server overwrites)
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [editingPillarField, setEditingPillarField] = useState<string | null>(null);
  
  // Track save request ID to prevent race conditions from out-of-order responses
  const saveRequestIdRef = useRef(0);
  const latestCompletedSaveIdRef = useRef(0);
  const pendingSaveCountRef = useRef(0);
  const queuedSaveRef = useRef<{ goals: string; pillars: ContentPillar[]; version: number } | null>(null);
  
  const [conflictData, setConflictData] = useState<SocialMediaStrategy | null>(null);

  // Fetch existing strategy - disable refetchOnWindowFocus to prevent overwrites while editing
  const { data: existingStrategy, isLoading } = useQuery<SocialMediaStrategy>({
    queryKey: ['/api/social-media-strategy'],
    enabled: !!user,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Don't refetch when user focuses window while editing
  });

  // Save strategy mutation with conflict handling
  const saveMutation = useMutation({
    mutationFn: async (strategyData: SocialMediaStrategy): Promise<SocialMediaStrategy> => {
      console.log('Saving social media strategy:', {
        version: strategyData.version,
        hasContentGoals: !!strategyData.contentGoals,
        pillarsCount: strategyData.pillars.length
      });
      
      const response = await apiRequest('/api/social-media-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      });
      
      if (response.status === 409) {
        // Version conflict - get the conflict data
        const conflictResponse = await response.json();
        throw new Error(JSON.stringify({
          type: 'conflict',
          conflict: conflictResponse.conflict
        }));
      }
      
      if (!response.ok) {
        throw new Error('Failed to save strategy');
      }
      
      return response.json();
    },
    onSuccess: (savedStrategy: SocialMediaStrategy, variables: any) => {
      // Extract save ID from mutation variables (not from server response)
      const thisSaveId = variables._saveId;
      
      console.log('Saved social media strategy ✓, new version:', savedStrategy.version, 'saveId:', thisSaveId);
      
      // Only process this response if it's the most recent save request
      // This prevents stale responses from overwriting newer user edits
      if (thisSaveId && thisSaveId < saveRequestIdRef.current) {
        console.log('Ignoring stale save response (newer save pending)', {
          thisSaveId,
          latestSaveId: saveRequestIdRef.current
        });
        // Decrement counter even for stale responses to prevent leaks
        pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
        return;
      }
      
      // Track this as the latest completed save
      if (thisSaveId) {
        latestCompletedSaveIdRef.current = thisSaveId;
      }
      
      // Update server state (but NOT draft if user is editing)
      setServerStrategy(savedStrategy);
      
      // Check if this is the ONLY pending save (counter === 1) before updating drafts
      // If counter > 1, there are more saves queued, so don't overwrite user's draft
      const isLastPendingSave = pendingSaveCountRef.current === 1;
      
      // Only update draft if NOT currently editing AND this is the last pending save
      // This prevents overwriting user's in-progress typing
      if (!isEditingGoals && isLastPendingSave) {
        setDraftContentGoals(savedStrategy.contentGoals);
      }
      
      // Update pillars if not editing any pillar field AND this is the last pending save
      if (!editingPillarField && isLastPendingSave) {
        setDraftPillars(savedStrategy.pillars);
      }
      
      // Decrement pending save counter AFTER checking and updating drafts
      pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
      
      setConflictData(null);
      
      // Update cache directly with server response
      queryClient.setQueryData(['/api/social-media-strategy'], savedStrategy);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      // Process queued save if one exists
      if (queuedSaveRef.current) {
        console.log('Processing queued save');
        const queued = queuedSaveRef.current;
        queuedSaveRef.current = null;
        
        // Use server's version for the queued save
        setTimeout(() => {
          debouncedSave(queued.goals, queued.pillars, savedStrategy.version);
        }, 0);
      }
    },
    onError: async (error: any) => {
      // Decrement pending save counter
      pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
      
      setSaveStatus('idle');
      
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
      
      // Check for version conflict
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.type === 'conflict') {
          console.log('Version conflict detected, refetching latest data...');
          
          // Refetch the latest data from server
          const freshStrategy = await queryClient.fetchQuery({
            queryKey: ['/api/social-media-strategy'],
            retry: false
          }) as SocialMediaStrategy;
          
          if (freshStrategy) {
            console.log('Got fresh strategy from server, version:', freshStrategy.version);
            
            // Update server state
            setServerStrategy(freshStrategy);
            
            // Check if this was the only pending save before updating drafts
            const wasLastPendingSave = pendingSaveCountRef.current === 0;
            
            // Only update drafts if NOT currently editing AND this was the last pending save
            if (!isEditingGoals && wasLastPendingSave) {
              setDraftContentGoals(freshStrategy.contentGoals);
            }
            if (!editingPillarField && wasLastPendingSave) {
              setDraftPillars(freshStrategy.pillars);
            }
            
            setConflictData(freshStrategy);
            
            toast({
              title: "Data Updated Elsewhere",
              description: "The strategy was updated in another tab. Your current edits are preserved. Review before saving.",
              variant: "destructive",
              duration: 5000
            });
          }
          
          return;
        }
      } catch (parseError) {
        // Not a JSON error, fall through to generic error
      }
      
      toast({
        title: "Error",
        description: "Failed to save strategy. Please try again.",
        variant: "destructive",
      });
      
      // Process queued save if one exists (even after error)
      if (queuedSaveRef.current) {
        console.log('Processing queued save after error');
        const queued = queuedSaveRef.current;
        queuedSaveRef.current = null;
        
        // Retry with queued data
        setTimeout(() => {
          debouncedSave(queued.goals, queued.pillars, queued.version);
        }, 0);
      }
    },
  });

  // Load existing strategy from fresh database fetch
  useEffect(() => {
    if (isLoading) return;
    
    if (!hasLoadedInitialData.current) {
      hasLoadedInitialData.current = true;
      
      if (existingStrategy) {
        console.log('Loading existing strategy from DB, version:', existingStrategy.version);
        
        const loadedStrategy = {
          version: existingStrategy.version || 1,
          contentGoals: existingStrategy.contentGoals || "",
          pillars: existingStrategy.pillars || [
            { id: "1", title: "", cta: "" },
            { id: "2", title: "", cta: "" },
            { id: "3", title: "", cta: "" }
          ],
          id: existingStrategy.id,
          userId: existingStrategy.userId,
          updatedAt: existingStrategy.updatedAt
        };
        
        // Initialize both server and draft state
        setServerStrategy(loadedStrategy);
        setDraftContentGoals(loadedStrategy.contentGoals);
        setDraftPillars(loadedStrategy.pillars);
        setConflictData(null);
      }
    }
  }, [existingStrategy, isLoading]);

  // Debounced auto-save - accepts current state as arguments to avoid stale closures
  const { debounced: debouncedSave, flush: flushSave } = useDebounce((
    goals: string, 
    pillars: ContentPillar[], 
    version: number
  ) => {
    if (!user) return;

    if (!hasLoadedInitialData.current) return;
    
    if (conflictData) {
      console.log('Skipping save due to unresolved conflict');
      return;
    }
    
    // If a save is already in flight, queue this save for later
    if (pendingSaveCountRef.current > 0) {
      console.log('Save already pending - queueing this save');
      queuedSaveRef.current = { goals, pillars, version };
      return;
    }

    // Use passed arguments (latest state) for saving
    const hasContent = goals.trim() || 
                      pillars.some(p => p.title.trim() || p.cta.trim());
    
    if (hasContent) {
      console.log('Saving strategy with goals:', goals.substring(0, 50), 'pillars:', pillars.length);
      
      // Increment and capture save request ID
      saveRequestIdRef.current += 1;
      const thisSaveId = saveRequestIdRef.current;
      
      // Increment pending save counter
      pendingSaveCountRef.current += 1;
      
      setSaveStatus('saving');
      
      saveMutation.mutate({
        version: version,
        contentGoals: goals,
        pillars: pillars,
        _saveId: thisSaveId // Pass save ID through mutation context
      } as any);
    }
  }, 500);

  // Refs to hold latest state for stable event listeners
  const draftContentGoalsRef = useRef(draftContentGoals);
  const draftPillarsRef = useRef(draftPillars);
  const serverStrategyVersionRef = useRef(serverStrategy.version);
  
  // Keep refs up to date
  useEffect(() => {
    draftContentGoalsRef.current = draftContentGoals;
    draftPillarsRef.current = draftPillars;
    serverStrategyVersionRef.current = serverStrategy.version;
  });

  // Flush pending saves on unmount or visibility change
  // Use stable listeners with refs to avoid re-running on every draft change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Use refs to get current state
        flushSave(draftContentGoalsRef.current, draftPillarsRef.current, serverStrategyVersionRef.current);
      }
    };

    const handleBeforeUnload = () => {
      // Use refs to get current state
      flushSave(draftContentGoalsRef.current, draftPillarsRef.current, serverStrategyVersionRef.current);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Flush on unmount using latest refs
      flushSave(draftContentGoalsRef.current, draftPillarsRef.current, serverStrategyVersionRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushSave]); // Only re-run if flushSave changes

  // Track changes and trigger debounced save
  const lastSavedRef = useRef<string>('');

  // Create stable string representations for comparison
  const contentGoalsString = draftContentGoals;
  const pillarsString = draftPillars.map(p => `${p.id}:${p.title}:${p.cta}`).join('|');
  const combinedString = `${contentGoalsString}||${pillarsString}`;

  useEffect(() => {
    if (combinedString === lastSavedRef.current) return;

    lastSavedRef.current = combinedString;
    // Pass current state as arguments to avoid stale closure
    debouncedSave(draftContentGoals, draftPillars, serverStrategy.version);
  }, [combinedString, debouncedSave, draftContentGoals, draftPillars, serverStrategy.version]);

  // Content Goals handlers
  const updateContentGoals = (goals: string) => {
    setDraftContentGoals(goals);
  };

  const handleGoalsFocus = () => {
    setIsEditingGoals(true);
  };

  const handleGoalsBlur = () => {
    console.log('Blur event (goals) - flushing pending save with current state');
    // Flush with current state to ensure latest value is saved
    flushSave(draftContentGoals, draftPillars, serverStrategy.version);
    // Clear editing state after a brief delay to allow save to complete
    setTimeout(() => setIsEditingGoals(false), 50);
  };

  // Pillar handlers
  const updatePillar = (id: string, field: 'title' | 'cta', value: string) => {
    setDraftPillars(prev =>
      prev.map(pillar =>
        pillar.id === id ? { ...pillar, [field]: value } : pillar
      )
    );
  };

  const handlePillarFocus = (pillarId: string, field: 'title' | 'cta') => {
    setEditingPillarField(`${pillarId}-${field}`);
  };

  const handlePillarBlur = (e: React.FocusEvent) => {
    console.log('Blur event (pillar) - flushing pending save with current state');
    // Flush with current state to ensure latest value is saved
    flushSave(draftContentGoals, draftPillars, serverStrategy.version);
    
    // Only clear editing state if not moving to another pillar input
    // Check if the new focused element is also a pillar input
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isStillEditingPillar = activeElement?.id?.includes('pillar-');
      
      if (!isStillEditingPillar) {
        setEditingPillarField(null);
      }
    }, 0);
  };

  const addPillar = () => {
    const newId = Date.now().toString();
    const newPillars = [...draftPillars, { id: newId, title: "", cta: "" }];
    setDraftPillars(newPillars);
    // Set editing state to prevent server overwrites during conflict resolution
    setEditingPillarField(`${newId}-title`);
    // Immediately flush the save with the new pillar
    flushSave(draftContentGoals, newPillars, serverStrategy.version);
    // Clear editing state after a brief delay
    setTimeout(() => setEditingPillarField(null), 100);
  };

  const removePillar = (id: string) => {
    const newPillars = draftPillars.filter(pillar => pillar.id !== id);
    setDraftPillars(newPillars);
    // Immediately flush the save with the removed pillar
    flushSave(draftContentGoals, newPillars, serverStrategy.version);
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
                  value={draftContentGoals}
                  onChange={(e) => updateContentGoals(e.target.value)}
                  onFocus={handleGoalsFocus}
                  onBlur={handleGoalsBlur}
                  placeholder="Grow email list, drive product visibility, build brand trust..."
                  className="min-h-[100px] resize-none"
                  data-testid="textarea-content-goals"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Pillars Section */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  Content Pillars
                </CardTitle>
                <Button
                  onClick={addPillar}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  data-testid="button-add-pillar"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pillar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {draftPillars.length === 0 ? (
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
                  {draftPillars.map((pillar, index) => (
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
                          data-testid={`button-remove-pillar-${index}`}
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
                          onFocus={() => handlePillarFocus(pillar.id, 'title')}
                          onBlur={handlePillarBlur}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          placeholder="e.g., Behind the Scenes"
                          className="mt-1"
                          data-testid={`input-pillar-title-${index}`}
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
                          onFocus={() => handlePillarFocus(pillar.id, 'cta')}
                          onBlur={handlePillarBlur}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          placeholder="e.g., Shop, Newsletter, Podcast..."
                          className="mt-1"
                          data-testid={`input-pillar-cta-${index}`}
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
