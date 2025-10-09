import { useState, useEffect, useCallback, useRef } from "react";
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
  Trash2,
  AlertTriangle
} from "lucide-react";

// Single row interface (keeping same structure for UI compatibility)
interface CheatSheetRow {
  trigger: string;
  automatedReply: string;
  openingDM: string;
  buttonTitle: string;
  dmWithLink: string;
  linkTitle: string;
  linkUrl: string;
  followUpDM: string;
}

// Document interface matching backend schema
interface CheatSheetDoc {
  id: string;
  version: number;
  rows: CheatSheetRow[];
  updatedAt: string;
}

// Create empty row
const createEmptyRow = (): CheatSheetRow => ({
  trigger: '',
  automatedReply: '',
  openingDM: '',
  buttonTitle: '',
  dmWithLink: '',
  linkTitle: '',
  linkUrl: '',
  followUpDM: ''
});

// Debounce hook for autosave
function useDebounce<T>(value: T, delay: number): T {
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
  
  // Document state (single document per user)
  const [document, setDocument] = useState<CheatSheetDoc | null>(null);
  const [rows, setRows] = useState<CheatSheetRow[]>([createEmptyRow()]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<CheatSheetDoc | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  
  // Track if user has made any edits to distinguish from initial load
  const hasUserEdited = useRef(false);
  
  // Refs for save-on-unmount (to avoid running cleanup on every keystroke)
  const rowsRef = useRef(rows);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const documentRef = useRef(document);
  const saveMutationRef = useRef<any>(null);

  // Load document from server
  const { data: serverDoc, isLoading: isLoadingDoc, error: loadError } = useQuery({
    queryKey: ['/api/automation/cheatsheet'],
    enabled: isAuthenticated && !isLoading,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) return false;
      return failureCount < 3;
    },
  });

  // Initialize document state when loaded from server
  useEffect(() => {
    if (serverDoc && typeof serverDoc === 'object' && 'rows' in serverDoc && !hasUserEdited.current) {
      const doc = serverDoc as CheatSheetDoc;
      setDocument(doc);
      setRows(doc.rows.length > 0 ? doc.rows : [createEmptyRow()]);
      setHasUnsavedChanges(false);
      setSaveError(null);
      setConflictData(null);
    }
  }, [serverDoc]);

  // Save mutation with optimistic versioning and conflict resolution
  const saveMutation = useMutation({
    mutationFn: async (rowsToSave: CheatSheetRow[]): Promise<CheatSheetDoc> => {
      // Don't save if document hasn't loaded yet - prevents version 0 conflicts
      if (!document) {
        throw new Error('Document not loaded yet');
      }
      
      const currentVersion = document.version;
      
      const response = await apiRequest('/api/automation/cheatsheet', {
        method: 'PUT',
        body: JSON.stringify({
          version: currentVersion,
          rows: rowsToSave
        }),
      });

      if (response.status === 409) {
        // Version conflict - get the conflict data and implement retry logic
        const conflictResponse = await response.json();
        throw new Error(JSON.stringify({
          type: 'conflict',
          conflict: conflictResponse.conflict
        }));
      }

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      return response.json();
    },
    onSuccess: (savedDoc: CheatSheetDoc) => {
      // Update local document state with server version
      setDocument(savedDoc);
      setHasUnsavedChanges(false);
      setIsSaving(false);
      setSaveError(null);
      setConflictData(null);
      
      // Show "Saved ✓" state for 2 seconds
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      
      // Invalidate the query to ensure consistency
      queryClient.setQueryData(['/api/automation/cheatsheet'], savedDoc);
    },
    onError: async (error: Error) => {
      setIsSaving(false);
      
      // Check for authentication errors first (server returns 401/403 when not logged in)
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Unauthorized') || error.message.includes('No token')) {
        setSaveError('❌ Not logged in - changes will NOT save!');
        setHasUnsavedChanges(false); // Clear unsaved flag to stop retry loop
        toast({
          title: "❌ Not Logged In",
          description: "You must be logged in to save changes. Please log in first!",
          variant: "destructive",
          duration: 10000
        });
        return;
      }
      
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.type === 'conflict') {
          // Implement automatic conflict resolution as requested
          console.log('Version conflict detected, attempting automatic resolution...');
          
          // Re-fetch latest document from server
          const freshDoc = await queryClient.fetchQuery({
            queryKey: ['/api/automation/cheatsheet'],
            retry: false
          }) as CheatSheetDoc;
          
          if (freshDoc) {
            // Update document state with fresh data
            setDocument(freshDoc);
            
            // Merge user's pending changes with fresh document
            // In this case, we'll use the user's current rows (last-write-wins approach for simplicity)
            // More sophisticated merging could be implemented if needed
            
            // Retry the save with the new version
            setTimeout(() => {
              setIsSaving(true);
              saveMutation.mutate(rows);
            }, 100);
            
            return; // Don't show error, we're auto-retrying
          }
          
          // Fallback: show conflict UI if auto-resolution fails
          setConflictData(errorData.conflict);
          setSaveError('Document was updated elsewhere. Auto-retry failed.');
          toast({
            title: "Sync Conflict", 
            description: "Document updated elsewhere. Please refresh the page.",
            variant: "destructive"
          });
          return;
        }
      } catch {
        // Not a conflict error, handle as regular error
      }
      
      setSaveError('Failed to save changes. Will retry automatically.');
      toast({
        title: "Save Failed",
        description: "Could not save changes. Will retry automatically.",
        variant: "destructive"
      });
    }
  });

  // Keep refs updated with latest values (for save-on-unmount)
  useEffect(() => {
    rowsRef.current = rows;
    hasUnsavedChangesRef.current = hasUnsavedChanges;
    documentRef.current = document;
    saveMutationRef.current = saveMutation;
  }, [rows, hasUnsavedChanges, document, saveMutation]);

  // Autosave on every keystroke (no debounce)
  useEffect(() => {
    // Wait for document to load before attempting saves
    if (hasUnsavedChanges && hasUserEdited.current && !isSaving && !conflictData && document) {
      // Check if any row has content
      const hasContent = rows.some(row => 
        Object.values(row).some(value => value.trim().length > 0)
      );

      if (hasContent) {
        setIsSaving(true);
        setSaveError(null);
        saveMutation.mutate(rows);
      }
    }
  }, [rows, hasUnsavedChanges, isSaving, conflictData, document]);

  // Save immediately on unmount if there are unsaved changes (prevents lost edits when navigating away)
  useEffect(() => {
    return () => {
      // Cleanup function only runs on ACTUAL unmount (empty dependency array)
      // Use refs to get latest values without triggering this effect on every keystroke
      if (hasUnsavedChangesRef.current && hasUserEdited.current && documentRef.current) {
        // Check if any row has content
        const hasContent = rowsRef.current.some(row => 
          Object.values(row).some(value => value.trim().length > 0)
        );
        
        if (hasContent) {
          // Use synchronous fetch with keepalive to ensure save completes even after unmount
          const token = localStorage.getItem('token');
          if (token) {
            fetch('/api/automation/cheatsheet', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                version: documentRef.current.version,
                rows: rowsRef.current
              }),
              keepalive: true // Ensures request completes even if page unloads
            }).catch(() => {
              // Silently fail - user is navigating away anyway
            });
          }
        }
      }
    };
  }, []); // Empty array = cleanup only runs on actual unmount

  // Update row field
  const updateRow = useCallback((index: number, field: keyof CheatSheetRow, value: string) => {
    hasUserEdited.current = true;
    setRows(current => {
      const newRows = [...current];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
    setHasUnsavedChanges(true);
    setSaveError(null);
    setJustSaved(false); // Clear saved state when user starts editing
  }, []);

  // Add new row
  const addRow = useCallback(() => {
    hasUserEdited.current = true;
    setRows(current => [...current, createEmptyRow()]);
    setHasUnsavedChanges(true);
  }, []);

  // Delete row
  const deleteRow = useCallback((index: number) => {
    hasUserEdited.current = true;
    setRows(current => {
      const newRows = current.filter((_, i) => i !== index);
      // Always keep at least one row
      return newRows.length === 0 ? [createEmptyRow()] : newRows;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Resolve conflict by accepting server version
  const acceptServerVersion = useCallback(() => {
    if (conflictData) {
      setDocument(conflictData);
      setRows(conflictData.rows.length > 0 ? conflictData.rows : [createEmptyRow()]);
      setHasUnsavedChanges(false);
      setConflictData(null);
      setSaveError(null);
      hasUserEdited.current = false;
      
      queryClient.setQueryData(['/api/automation/cheatsheet'], conflictData);
      
      toast({
        title: "Conflict Resolved",
        description: "Document updated with latest version from server.",
      });
    }
  }, [conflictData]);

  // Resolve conflict by keeping local version
  const keepLocalVersion = useCallback(() => {
    if (conflictData) {
      // Update our document to match server version, then immediately save local changes
      setDocument(conflictData);
      setConflictData(null);
      setSaveError(null);
      setIsSaving(true);
      
      // Save current local rows with new server version
      saveMutation.mutate(rows);
    }
  }, [conflictData, rows]);

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

  if (isLoading || isLoadingDoc) {
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

  if (loadError) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <MobileNav />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">Failed to load cheat sheet. Please refresh the page.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64">
        <MobileNav />
        
        <main className="p-6">
          {/* Mobile Back Arrow - visible only on mobile, positioned below banner */}
          <div className="lg:hidden pt-12 mb-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/streamline-workflow')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 p-2"
              data-testid="button-back-mobile"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop Navigation - hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main Dashboard
            </Button>
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
              <h1 className="text-2xl font-serif font-semibold text-gray-900 dark:text-gray-100">
                Automation System
              </h1>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Build automated conversation flows for social media engagement
              </p>
            </div>
          </div>

          {/* Conflict Resolution Banner */}
          {conflictData && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Sync Conflict Detected
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Your document was updated in another window or device. Choose how to resolve:
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={acceptServerVersion}
                      className="bg-white dark:bg-gray-800"
                      data-testid="button-accept-server"
                    >
                      Use Server Version
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={keepLocalVersion}
                      className="bg-white dark:bg-gray-800"
                      data-testid="button-keep-local"
                    >
                      Keep My Changes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Status - Always visible to prevent layout shift */}
          {!conflictData && (
            <div className={`mb-4 p-3 border rounded-lg transition-colors ${
              saveError 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                : justSaved
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : (hasUnsavedChanges || isSaving)
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-2 h-5">
                {saveError ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {saveError}
                    </span>
                  </>
                ) : justSaved ? (
                  <>
                    <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Saved ✓
                    </span>
                  </>
                ) : isSaving ? (
                  <>
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Saving changes...
                    </span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Changes will be saved automatically
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    All changes saved
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Document Version Info */}
          {document && (
            <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Document version: {document.version} • Last updated: {new Date(document.updatedAt).toLocaleString()}
            </div>
          )}

          {/* ManyChat Button */}
          <div className="mb-6">
            <a
              href="https://manychat.partnerlinks.io/n6ui2n91rh1n"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-8 rounded-xl text-xl font-semibold"
              >
                Automate with ManyChat
              </Button>
            </a>
          </div>

          {/* Conversation Flow Table */}
          <Card>
            <CardHeader>
              <CardTitle>ManyChat Conversation Flow (copy & paste)</CardTitle>
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
                  {rows.map((row, index) => (
                    <div key={index} className="group relative">
                      <div className="grid grid-cols-9 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                        
                        {/* Trigger */}
                        <div className="relative">
                          <Textarea
                            placeholder="Keyword..."
                            value={row.trigger}
                            onChange={(e) => updateRow(index, 'trigger', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-trigger-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.trigger)}
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
                            value={row.automatedReply}
                            onChange={(e) => updateRow(index, 'automatedReply', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-automated-reply-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.automatedReply)}
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
                            value={row.openingDM}
                            onChange={(e) => updateRow(index, 'openingDM', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-opening-dm-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.openingDM)}
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
                            value={row.buttonTitle}
                            onChange={(e) => updateRow(index, 'buttonTitle', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-button-title-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.buttonTitle)}
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
                            value={row.dmWithLink}
                            onChange={(e) => updateRow(index, 'dmWithLink', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-dm-with-link-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.dmWithLink)}
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
                            value={row.linkTitle}
                            onChange={(e) => updateRow(index, 'linkTitle', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-link-title-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.linkTitle)}
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
                            value={row.linkUrl}
                            onChange={(e) => updateRow(index, 'linkUrl', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-link-url-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.linkUrl)}
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
                            value={row.followUpDM}
                            onChange={(e) => updateRow(index, 'followUpDM', e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid={`input-follow-up-dm-${index}`}
                            disabled={!!conflictData}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(row.followUpDM)}
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
                            onClick={() => deleteRow(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            data-testid={`button-delete-row-${index}`}
                            title="Delete this row"
                            disabled={!!conflictData}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Row Button */}
                  <Button
                    onClick={addRow}
                    variant="outline"
                    className="w-full mt-4"
                    data-testid="button-add-row"
                    disabled={!!conflictData}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Prompt
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