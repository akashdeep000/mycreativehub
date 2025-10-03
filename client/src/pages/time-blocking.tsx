import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
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
  const [timeBlockingData, setTimeBlockingData] = useState(defaultTimeBlockingData);

  // Load existing events using the new events API (with real persistence)
  useEffect(() => {
    const loadTimeBlockingEvents = async () => {
      try {
        console.log('🔄 Loading time blocking events from database...');
        
        // Calculate range for current month (load current and adjacent months for full view)
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        // Load events from the new events API
        const response = await fetch(`/api/time-blocking-events?startDate=${startStr}&endDate=${endStr}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-store' // Prevent stale cache as requested
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load events: ${response.status}`);
        }
        
        const events = await response.json();
        console.log(`✅ Loaded ${events.length} time blocking events from database`);
        
        // Convert events to time blocks format
        const allBlocks = events.map((event: any) => {
          // Extract date and time from the timestamp using UTC to avoid timezone issues
          const startDateTime = new Date(event.startTime);
          const dateStr = startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = startDateTime.toISOString().split('T')[1].substring(0, 5); // HH:mm from UTC
          
          return {
            id: event.id, // Use the database UUID
            title: event.title,
            startTime: timeStr, // Just the time portion (HH:mm)
            duration: 1,
            colour: event.color,
            colourTagId: event.colorKeyId, // Fixed field name
            day: dateStr, // Date in YYYY-MM-DD format
            monthKey: getCurrentMonthKey(startDateTime)
          };
        });
        
        // Load time blocking color keys from dedicated API
        let allColorKeys = [];
        try {
          console.log('🔄 Loading time blocking color keys...');
          const colorResponse = await fetch('/api/time-blocking-color-keys', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-store'
            }
          });
          
          if (colorResponse.ok) {
            const data = await colorResponse.json();
            allColorKeys = data.colorKeys || [];
            console.log(`✅ Loaded ${allColorKeys.length} time blocking color keys`);
          }
        } catch (error) {
          console.log('Using default time blocking color categories');
        }
        
        // Update state with loaded data
        const colourTags = allColorKeys.map((key: any, index: number) => ({
          id: key.id,
          label: key.label,
          colour: key.color,
          selected: index === 0 // First tag selected by default
        }));
        
        setTimeBlockingData({
          colourTags: colourTags.length > 0 ? colourTags : defaultTimeBlockingData.colourTags,
          weeklyView: { blocks: [] }, // Legacy - keep empty
          monthlyView: {
            blocks: allBlocks,
            selectedMonth: new Date().toISOString().substring(0, 7)
          }
        });
        
        console.log(`✅ Initialized time blocking data: ${allBlocks.length} blocks, ${colourTags.length} categories`);
      } catch (error) {
        console.error('❌ Failed to load time blocking events:', error);
        toast({
          title: "Load Error",
          description: "Failed to load your saved events. Using defaults.",
          variant: "destructive"
        });
        // Fall back to defaults
        setTimeBlockingData(defaultTimeBlockingData);
      }
    };
    
    if (isAuthenticated && user) {
      loadTimeBlockingEvents();
    }
  }, [isAuthenticated, user, toast]);
  
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
            </h1>
            <p className="text-gray-600">Colour-code your tasks and block focused time to get them done.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
            <TimeBlockingPlanner
              templateId={1}
              initialData={timeBlockingData}
              onSave={handleSave}
              key={`timeblocking-${JSON.stringify(timeBlockingData).substring(0, 50)}`}
            />
          </div>
        </main>
      </div>
    </div>
  );
}