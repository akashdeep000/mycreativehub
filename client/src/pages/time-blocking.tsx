import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import TimeBlockingPlanner from "@/components/workflow/time-blocking-planner";
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';

// Helper function to generate month keys
const getCurrentMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-M${String(month).padStart(2, '0')}`;
};

const defaultTimeBlockingData = {
  colourTags: [
    { id: 'tb-1', label: 'Deep Work', colour: '#3B82F6', selected: true },
    { id: 'tb-2', label: 'Filming', colour: '#10B981', selected: false },
    { id: 'tb-3', label: 'Editing', colour: '#8B5CF6', selected: false },
    { id: 'tb-4', label: 'Email Marketing', colour: '#F59E0B', selected: false },
    { id: 'tb-5', label: 'Social Scheduling', colour: '#EF4444', selected: false },
    { id: 'tb-6', label: 'Listing Work', colour: '#14B8A6', selected: false },
    { id: 'tb-7', label: 'Admin/Ops', colour: '#EC4899', selected: false },
    { id: 'tb-8', label: 'Finance', colour: '#6366F1', selected: false },
    { id: 'tb-9', label: 'Product Dev', colour: '#F97316', selected: false },
    { id: 'tb-10', label: 'Packing/Shipping', colour: '#8B5CF6', selected: false },
    { id: 'tb-11', label: 'Creation Time', colour: '#A855F7', selected: false }
  ],
  weeklyView: {
    blocks: []
  },
  monthlyView: {
    blocks: [],
    selectedMonth: new Date().toISOString().substring(0, 7)
  }
};

export default function TimeBlocking() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [blockSaveStatus, setBlockSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Calculate date range for loading events (current month + adjacent months)
  const getDateRange = () => {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
    return {
      startStr: startDate.toISOString().split('T')[0],
      endStr: endDate.toISOString().split('T')[0]
    };
  };

  // Load time blocking events with React Query (auto-refetches on mount!)
  const { startStr, endStr } = getDateRange();
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/time-blocking-events', startStr, endStr],
    queryFn: async () => {
      console.log('🔄 Loading time blocking events from database...');
      const response = await apiRequest(`/api/time-blocking-events?startDate=${startStr}&endDate=${endStr}`);
      const events = await response.json();
      console.log(`✅ Loaded ${events.length} time blocking events from database`);
      return events;
    },
    staleTime: 0, // Always refetch to get latest from DB
    refetchOnMount: true, // KEY FIX: Always get fresh data when returning to page
    enabled: isAuthenticated && !!user, // Only run when authenticated
  });

  // Load color keys with React Query
  const { data: colorKeysData } = useQuery({
    queryKey: ['/api/time-blocking-color-keys'],
    queryFn: async () => {
      console.log('🔄 Loading time blocking color keys...');
      const response = await apiRequest('/api/time-blocking-color-keys');
      const data = await response.json();
      console.log(`✅ Loaded ${data.colorKeys?.length || 0} time blocking color keys`);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    enabled: isAuthenticated && !!user,
  });

  // Convert loaded data to time blocking format
  const timeBlockingData = {
    colourTags: colorKeysData?.colorKeys?.map((key: any, index: number) => ({
      id: key.id,
      label: key.label,
      colour: key.color,
      selected: index === 0
    })) || defaultTimeBlockingData.colourTags,
    weeklyView: { blocks: [] },
    monthlyView: {
      blocks: eventsData?.map((event: any) => {
        const startDateTime = new Date(event.startTime);
        const dateStr = startDateTime.toISOString().split('T')[0];
        const timeStr = startDateTime.toISOString().split('T')[1].substring(0, 5);
        return {
          id: event.id,
          title: event.title,
          startTime: timeStr,
          duration: 1,
          colour: event.color,
          colourTagId: event.colorKeyId,
          day: dateStr,
          monthKey: getCurrentMonthKey(startDateTime)
        };
      }) || [],
      selectedMonth: new Date().toISOString().substring(0, 7)
    }
  };
  
  // Redirect to login if not authenticated
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

  // Save function - color keys are now handled by TimeBlockingPlanner component directly
  // This function is kept for compatibility but doesn't save color keys anymore
  const handleSave = async (data: any) => {
    try {
      // Color keys are saved immediately by TimeBlockingPlanner component
      // DO NOT save them here to avoid race conditions with stale data
      console.log('💾 Save triggered - color keys handled by TimeBlockingPlanner component');
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  };

  // Callback for TimeBlockingPlanner to update save status
  const handleBlockSaved = () => {
    setBlockSaveStatus('saved');
    setTimeout(() => setBlockSaveStatus('idle'), 2000); // Show for 2 seconds
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-gray-600">Loading your time blocking planner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 max-w-full overflow-x-hidden">
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          <div className="mb-8">
            <div className="mb-2">
              {/* Mobile: Simple back arrow using browser history */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/streamline-workflow')}
                className="text-gray-600 hover:text-gray-800 lg:hidden mt-16"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              {/* Desktop: Keep existing navigation buttons */}
              <div className="hidden lg:flex lg:flex-wrap lg:gap-2">
                <BackToDashboard />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation('/streamline-workflow')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Streamline Your Workflow
                </Button>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              Time Blocking Planner
              {blockSaveStatus === 'saved' && (
                <span className="text-sm text-green-600 flex items-center gap-1 ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </h1>
            <p className="text-gray-600">Colour-code your tasks and block focused time to get them done.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
            <TimeBlockingPlanner
              templateId={1}
              initialData={timeBlockingData}
              onSave={handleSave}
              onBlockSaved={handleBlockSaved}
              key={`timeblocking-${JSON.stringify(timeBlockingData).substring(0, 50)}`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}