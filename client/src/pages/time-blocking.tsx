import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import TimeBlockingPlanner from "@/components/workflow/time-blocking-planner";

// Helper function to generate month keys
const getCurrentMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-M${String(month).padStart(2, '0')}`;
};

const defaultTimeBlockingData = {
  colourTags: [
    { id: 'tag-1', label: 'Email Marketing', colour: '#3B82F6', selected: true },
    { id: 'tag-2', label: 'Content Creation', colour: '#10B981', selected: false },
    { id: 'tag-3', label: 'Filming', colour: '#8B5CF6', selected: false },
    { id: 'tag-4', label: 'Editing', colour: '#F59E0B', selected: false },
    { id: 'tag-5', label: 'Planning', colour: '#EF4444', selected: false },
    { id: 'tag-6', label: 'Product Development', colour: '#14B8A6', selected: false },
    { id: 'tag-7', label: 'Creative Time', colour: '#EC4899', selected: false }
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
        const response = await fetch(`/api/time-blocking-events?start=${startStr}&end=${endStr}`, {
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
        const allBlocks = events.map((event: any) => ({
          id: event.id, // Use the database UUID
          title: event.title,
          startTime: event.startTime,
          duration: 1,
          colour: event.color,
          colourTagId: event.categoryId,
          day: event.date,
          monthKey: getCurrentMonthKey(new Date(event.date))
        }));
        
        // Load color categories from calendar for compatibility
        let allColorKeys = defaultTimeBlockingData.colourTags;
        try {
          const colorResponse = await fetch(`/api/calendar-v3/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`);
          if (colorResponse.ok) {
            const calendarData = await colorResponse.json();
            if (calendarData.colorKeys && calendarData.colorKeys.length > 0) {
              // Filter business categories only
              const businessCategories = ['Email Marketing', 'Content Creation', 'Filming', 'Editing', 'Planning', 'Product Development', 'Creative Time'];
              allColorKeys = calendarData.colorKeys.filter((key: any) => 
                businessCategories.includes(key.label)
              );
            }
          }
        } catch (error) {
          console.log('Using default color categories');
        }
        
        // Update state with loaded data
        const colourTags = allColorKeys.map((key: any) => ({
          id: key.id,
          label: key.label,
          colour: key.colour || key.color,
          selected: key.id === 'tag-1' // First tag selected by default
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

  // New save function using events API (immediate saves as requested)
  const handleSave = async (data: any) => {
    // This function will handle individual event operations
    // The actual saving will be done in the TimeBlockingPlanner component
    // using the new events API with immediate save on every change
    console.log('💾 Save triggered - handled by TimeBlockingPlanner component');
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
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-8">
            <BackToDashboard />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Blocking Planner</h1>
            <p className="text-gray-600">Optimise your schedule for peak productivity</p>
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