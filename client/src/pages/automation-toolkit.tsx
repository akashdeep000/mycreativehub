import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
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

// Simple prompt interface
interface Prompt {
  id?: string;
  trigger: string;
  automatedReply: string;
  openingDM: string;
  buttonTitle: string;
  dmWithLink: string;
  linkTitle: string;
  linkUrl: string;
  followUpDM: string;
}

// Create empty prompt
const createEmptyPrompt = (): Prompt => ({
  trigger: '',
  automatedReply: '',
  openingDM: '',
  buttonTitle: '',
  dmWithLink: '',
  linkTitle: '',
  linkUrl: '',
  followUpDM: ''
});

// Debounce utility
function useSimpleDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AutomationToolkit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Simple state
  const [prompts, setPrompts] = useState<Prompt[]>([createEmptyPrompt()]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedVersion, setLastSavedVersion] = useState('');
  const [lastEditedIndex, setLastEditedIndex] = useState<number | null>(0);

  // Load prompts from server
  const { data: serverPrompts, isLoading: isLoadingPrompts } = useQuery({
    queryKey: ['/api/automation/prompts'],
    enabled: isAuthenticated && !isLoading,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Initialize with server data - load ALL saved prompts
  useEffect(() => {
    if (serverPrompts && Array.isArray(serverPrompts) && serverPrompts.length > 0) {
      // Load ALL saved prompts so user doesn't lose data
      setPrompts(serverPrompts);
    } else if (serverPrompts && Array.isArray(serverPrompts) && serverPrompts.length === 0) {
      setPrompts([createEmptyPrompt()]);
    }
  }, [serverPrompts]);

  // Simple debounced save
  const debouncedPrompts = useSimpleDebounce(prompts, 2000);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (prompt: Prompt): Promise<Prompt> => {
      if (prompt.id) {
        // Update existing
        const response = await apiRequest(`/api/automation/prompt/${prompt.id}`, {
          method: 'PATCH',
          body: JSON.stringify(prompt),
        });
        return response.json();
      } else {
        // Create new
        const response = await apiRequest('/api/automation/prompt', {
          method: 'POST',
          body: JSON.stringify(prompt),
        });
        return response.json();
      }
    },
    onSuccess: (savedPrompt: Prompt, originalPrompt: Prompt) => {
      // Update the prompt with the server ID
      setPrompts(current => 
        current.map(p => 
          p === originalPrompt ? { ...savedPrompt } : p
        )
      );
      setHasChanges(false);
      setIsSaving(false);
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive"
      });
      setIsSaving(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/automation/prompt/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/prompts'] });
      toast({
        title: "Deleted",
        description: "Row removed successfully."
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed", 
        description: "Could not delete row. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Auto-save when debounced prompts change - only save the last edited row
  useEffect(() => {
    if (hasChanges && lastEditedIndex !== null && !isSaving && debouncedPrompts.length > 0) {
      const promptToSave = debouncedPrompts[lastEditedIndex];
      
      // Only save if at least one field has content
      const hasContent = promptToSave && (
        promptToSave.trigger || promptToSave.automatedReply || promptToSave.openingDM || 
        promptToSave.buttonTitle || promptToSave.dmWithLink || promptToSave.linkTitle || 
        promptToSave.linkUrl || promptToSave.followUpDM
      );

      if (hasContent) {
        const currentVersion = JSON.stringify(promptToSave);
        
        // Skip if this is the same as last saved version
        if (currentVersion === lastSavedVersion) {
          return;
        }
        
        setIsSaving(true);
        setLastSavedVersion(currentVersion);
        saveMutation.mutate(promptToSave);
      }
    }
  }, [debouncedPrompts, hasChanges, isSaving, lastSavedVersion, lastEditedIndex]);

  // Update prompt field
  const updatePrompt = useCallback((index: number, field: keyof Prompt, value: string) => {
    setLastEditedIndex(index);
    setPrompts(current => {
      const newPrompts = [...current];
      newPrompts[index] = { ...newPrompts[index], [field]: value };
      return newPrompts;
    });
    setHasChanges(true);
  }, []);

  // Add new row
  const addPrompt = useCallback(() => {
    setPrompts(current => [...current, createEmptyPrompt()]);
  }, []);

  // Delete row
  const deletePrompt = useCallback((index: number) => {
    const prompt = prompts[index];
    
    if (prompt.id) {
      // Delete from server
      deleteMutation.mutate(prompt.id);
    }
    
    // Remove from local state
    setPrompts(current => {
      const newPrompts = current.filter((_, i) => i !== index);
      // Always keep at least one row
      return newPrompts.length === 0 ? [createEmptyPrompt()] : newPrompts;
    });
  }, [prompts, deleteMutation]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard."
    });
  }, [toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading || isLoadingPrompts) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <MobileNav />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64">
        <MobileNav />
        
        <main className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation('/streamline-workflow')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              data-testid="button-back-streamline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Streamline Your Workflow
            </Button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Conversation Flow Cheat Sheet
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Build automated conversation flows for social media engagement
              </p>
            </div>
          </div>

          {/* Save Status */}
          {hasChanges && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {isSaving ? "Saving changes..." : "Changes will be saved automatically"}
                </span>
              </div>
            </div>
          )}

          {/* Conversation Flow Table */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation Flow Mapping</CardTitle>
              <CardDescription>
                Plan your automated conversation sequences with precise trigger points and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-9 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Trigger Word or Phrase
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Automated Replies
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      The Opening DM
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Clickable Button Title
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      DM with Link
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Link Title
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Link You Will Send
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Follow Up DM
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Actions
                    </div>
                  </div>

                  {/* Table Rows */}
                  {prompts.map((prompt, index) => (
                    <div key={index} className="group relative">
                      <div className="grid grid-cols-9 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                        
                        {/* Trigger */}
                        <div className="relative">
                          <Textarea
                            placeholder="Keyword..."
                            value={prompt.trigger}
                            onChange={(e) => updatePrompt(index, 'trigger', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-trigger-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.trigger)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-trigger-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Automated Reply */}
                        <div className="relative">
                          <Textarea
                            placeholder="First automatic response..."
                            value={prompt.automatedReply}
                            onChange={(e) => updatePrompt(index, 'automatedReply', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-automated-reply-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.automatedReply)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-automated-reply-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Opening DM */}
                        <div className="relative">
                          <Textarea
                            placeholder="Your opening DM to a follower that commented on your keyword..."
                            value={prompt.openingDM}
                            onChange={(e) => updatePrompt(index, 'openingDM', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-opening-dm-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.openingDM)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-opening-dm-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Button Title */}
                        <div className="relative">
                          <Textarea
                            placeholder="Get them to click for link..."
                            value={prompt.buttonTitle}
                            onChange={(e) => updatePrompt(index, 'buttonTitle', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-button-title-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.buttonTitle)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-button-title-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* DM with Link */}
                        <div className="relative">
                          <Textarea
                            placeholder="DM you send just above in link..."
                            value={prompt.dmWithLink}
                            onChange={(e) => updatePrompt(index, 'dmWithLink', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-dm-with-link-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.dmWithLink)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-dm-with-link-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Link Title */}
                        <div className="relative">
                          <Textarea
                            placeholder="Link title..."
                            value={prompt.linkTitle}
                            onChange={(e) => updatePrompt(index, 'linkTitle', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-link-title-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.linkTitle)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-link-title-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Link URL */}
                        <div className="relative">
                          <Textarea
                            placeholder="https://..."
                            value={prompt.linkUrl}
                            onChange={(e) => updatePrompt(index, 'linkUrl', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-link-url-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.linkUrl)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-link-url-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Follow Up DM */}
                        <div className="relative">
                          <Textarea
                            placeholder="Follow up message..."
                            value={prompt.followUpDM}
                            onChange={(e) => updatePrompt(index, 'followUpDM', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-follow-up-dm-${index}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt.followUpDM)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-copy-follow-up-dm-${index}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Delete Button - 9th Column */}
                        <div className="flex justify-center items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePrompt(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            data-testid={`button-delete-row-${index}`}
                            title="Delete this row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Row Button */}
                  <Button
                    onClick={addPrompt}
                    variant="outline"
                    className="w-full mt-4"
                    data-testid="button-add-row"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Row
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}