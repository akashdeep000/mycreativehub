import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useDebounce } from "@/hooks/use-debounce";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Copy, 
  Zap,
  MessageSquare,
  Plus,
  Trash2
} from "lucide-react";

// Prompt interface - exactly 8 fields as specified
interface Prompt {
  id?: string;
  trigger: string;                // Trigger Word or Phrase
  automatedReply: string;         // Automated Replies  
  openingDM: string;              // The Opening DM
  buttonTitle: string;            // Clickable Button Title (matches schema)
  dmWithLink: string;             // DM with Link
  linkTitle: string;              // Link Title
  linkUrl: string;                // Link You Will Send
  followUpDM: string;             // Follow Up DM
}

// Placeholder row data
const createPlaceholderPrompt = (): Prompt => ({
  trigger: '',
  automatedReply: '',
  openingDM: '',
  buttonTitle: '',
  dmWithLink: '',
  linkTitle: '',
  linkUrl: '',
  followUpDM: ''
});

export default function AutomationToolkit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // State for prompts
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load prompts from API
  const { data: promptsData, isLoading: isDataLoading } = useQuery({
    queryKey: ['/api/automation/prompts'],
    enabled: isAuthenticated && !isLoading,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update state when data loads
  useEffect(() => {
    if (promptsData && Array.isArray(promptsData)) {
      setPrompts(promptsData);
    }
  }, [promptsData]);

  // Create new prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async (prompt: Omit<Prompt, 'id'>) => {
      const response = await apiRequest('/api/automation/prompt', {
        method: 'POST',
        body: JSON.stringify(prompt),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/prompts'] });
      setSavingStatus(prev => ({ ...prev, 'new': 'saved' }));
      toast({
        title: "Saved!",
        description: "New prompt created successfully.",
      });
    },
    onError: () => {
      setSavingStatus(prev => ({ ...prev, 'new': 'error' }));
      toast({
        title: "Save Failed",
        description: "Unable to create prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Prompt> }) => {
      const response = await apiRequest(`/api/automation/prompt/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return { response, id };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/prompts'] });
      setSavingStatus(prev => ({ ...prev, [variables.id]: 'saved' }));
    },
    onError: (error, variables) => {
      setSavingStatus(prev => ({ ...prev, [variables.id]: 'error' }));
      toast({
        title: "Save Failed",
        description: "Unable to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/automation/prompt/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/prompts'] });
      toast({
        title: "Deleted!",
        description: "Prompt deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Unable to delete prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update state immediately, save with debounce
  const updateFieldValue = useCallback((promptId: string | undefined, field: keyof Prompt, value: string) => {
    // Update UI state immediately
    if (promptId) {
      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId ? { ...prompt, [field]: value } : prompt
      ));
    }
  }, []);

  // Debounced save function (only handles API calls)
  const debouncedSave = useCallback(
    useDebounce((promptId: string | undefined, field: keyof Prompt, value: string) => {
      // For placeholder row, create new prompt when user starts typing
      if (!promptId) {
        const newPrompt = {
          ...createPlaceholderPrompt(),
          [field]: value
        };
        
        setSavingStatus(prev => ({ ...prev, 'new': 'saving' }));
        createPromptMutation.mutate(newPrompt);
        return;
      }

      // Update existing prompt via API
      setSavingStatus(prev => ({ ...prev, [promptId]: 'saving' }));
      updatePromptMutation.mutate({ id: promptId, data: { [field]: value } });
    }, 500),
    [createPromptMutation, updatePromptMutation]
  );

  // Combined field change handler
  const handleFieldChange = useCallback((promptId: string | undefined, field: keyof Prompt, value: string) => {
    // Update UI immediately
    updateFieldValue(promptId, field, value);
    // Save with debounce
    debouncedSave(promptId, field, value);
  }, [updateFieldValue, debouncedSave]);

  // Add new prompt
  const addNewPrompt = () => {
    const newPrompt = createPlaceholderPrompt();
    setSavingStatus(prev => ({ ...prev, 'new': 'saving' }));
    createPromptMutation.mutate(newPrompt);
  };

  // Delete prompt
  const deletePrompt = (id: string) => {
    deletePromptMutation.mutate(id);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Authentication redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Fix horizontal scrolling - prevent trackpad gestures from triggering browser navigation
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // If scrolling horizontally, prevent browser navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.stopPropagation();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Prevent browser navigation on touch gestures within scroll area
      e.stopPropagation();
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Allow horizontal scrolling, prevent browser navigation
      e.stopPropagation();
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      scrollContainer.removeEventListener('touchstart', handleTouchStart);
      scrollContainer.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  if (isLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="text-white text-2xl" />
          </div>
          <p className="text-gray-600">Loading automation toolkit...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show prompts or single placeholder row if empty
  // Ensure all fields are strings (not null) to prevent React warnings
  const safePrompts = prompts.map(prompt => ({
    ...prompt,
    trigger: prompt.trigger || '',
    automatedReply: prompt.automatedReply || '',
    openingDM: prompt.openingDM || '',
    buttonTitle: prompt.buttonTitle || '',
    dmWithLink: prompt.dmWithLink || '',
    linkTitle: prompt.linkTitle || '',
    linkUrl: prompt.linkUrl || '',
    followUpDM: prompt.followUpDM || ''
  }));
  
  const displayPrompts = safePrompts.length > 0 ? safePrompts : [createPlaceholderPrompt()];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            {/* Mobile: Simple back arrow */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/streamline-workflow')}
              className="text-gray-600 hover:text-gray-800 lg:hidden mt-16"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            {/* Desktop: Navigation buttons */}
            <div className="hidden lg:flex lg:items-center lg:gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/dashboard")}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Main Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/streamline-workflow")}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Streamline Workflow
              </Button>
            </div>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="text-white text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Automation System Toolkit
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Complete conversation flow cheat sheet - edit any cell and copy directly to ManyChat
            </p>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* ManyChat Affiliate Button */}
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Automate with ManyChat
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Click here to start building your automation (affiliate link)
                    </p>
                  </div>
                </div>
                <a
                  href="https://manychat.partnerlinks.io/n6ui2n91rh1n"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Start Now
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </CardContent>
          </Card>
          
          {/* Conversation Flow Cheat Sheet */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Conversation Flow Cheat Sheet</CardTitle>
                    <CardDescription>
                      Edit any cell to automatically save. Add rows and delete as needed.
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={addNewPrompt}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-add-new-prompt"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Prompt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto"
                style={{
                  overscrollBehaviorX: 'contain',
                  touchAction: 'pan-x pan-y',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div className="min-w-[1400px] border border-gray-200 rounded-lg">
                  
                  {/* Table Header */}
                  <div className="bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-9 gap-px">
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        Trigger Word or Phrase
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        Automated Replies
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        The Opening DM
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        Clickable Button Title
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        DM with Link
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        Link Title
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        Link You Will Send
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                        Follow Up DM
                      </div>
                      <div className="bg-white p-3 font-semibold text-sm text-gray-900 text-center">
                        Actions
                      </div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="bg-white">
                    {displayPrompts.map((prompt, index) => {
                      const promptId = prompt.id || 'placeholder';
                      const isPlaceholder = !prompt.id;
                      const status = savingStatus[promptId];
                      
                      return (
                        <div key={promptId} className={`grid grid-cols-9 gap-px ${index !== displayPrompts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          
                          {/* Trigger Word or Phrase */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.trigger, "Trigger word")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-trigger"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              {status === 'saving' && <span className="text-xs text-blue-500">Saving...</span>}
                              {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}
                              {status === 'error' && <span className="text-xs text-red-500">Error</span>}
                            </div>
                            <Textarea
                              value={prompt.trigger}
                              onChange={(e) => handleFieldChange(prompt.id, 'trigger', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="Keyword…"
                              data-testid="input-trigger"
                            />
                          </div>

                          {/* Automated Replies */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.automatedReply, "Automated reply")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-automated-reply"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.automatedReply}
                              onChange={(e) => handleFieldChange(prompt.id, 'automatedReply', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="First automatic response…"
                              data-testid="input-automated-reply"
                            />
                          </div>

                          {/* The Opening DM */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.openingDM, "Opening DM")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-opening-dm"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.openingDM}
                              onChange={(e) => handleFieldChange(prompt.id, 'openingDM', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="Your opening DM to a follower that commented on your keyword…"
                              data-testid="input-opening-dm"
                            />
                          </div>

                          {/* Clickable Button Title */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.buttonTitle, "Button title")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-clickable-button-title"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.buttonTitle}
                              onChange={(e) => handleFieldChange(prompt.id, 'buttonTitle', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="Get them to click for link…"
                              data-testid="input-clickable-button-title"
                            />
                          </div>

                          {/* DM with Link */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.dmWithLink, "DM with link")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-dm-with-link"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.dmWithLink}
                              onChange={(e) => handleFieldChange(prompt.id, 'dmWithLink', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="DM you send just above the link…"
                              data-testid="input-dm-with-link"
                            />
                          </div>

                          {/* Link Title */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.linkTitle, "Link title")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-link-title"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.linkTitle}
                              onChange={(e) => handleFieldChange(prompt.id, 'linkTitle', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="Button text for links…"
                              data-testid="input-link-title"
                            />
                          </div>

                          {/* Link You Will Send */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.linkUrl, "Link URL")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-link-url"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.linkUrl}
                              onChange={(e) => handleFieldChange(prompt.id, 'linkUrl', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="Link URL…"
                              data-testid="input-link-url"
                            />
                          </div>

                          {/* Follow Up DM */}
                          <div className="p-3 border-r border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(prompt.followUpDM, "Follow up DM")}
                                className="text-xs h-6 px-2"
                                data-testid="button-copy-follow-up-dm"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Textarea
                              value={prompt.followUpDM}
                              onChange={(e) => handleFieldChange(prompt.id, 'followUpDM', e.target.value)}
                              className="min-h-16 text-sm resize-none"
                              placeholder="Nurture message…"
                              data-testid="input-follow-up-dm"
                            />
                          </div>

                          {/* Actions */}
                          <div className="p-3 flex items-center justify-center">
                            {!isPlaceholder && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deletePrompt(prompt.id!)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-prompt-${prompt.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}