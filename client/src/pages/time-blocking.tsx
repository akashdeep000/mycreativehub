import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import TimeBlockingPlanner from "@/components/workflow/time-blocking-planner";

// Default data for the standalone time blocking page
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

  // Remove workflow templates dependency - now using calendar API directly

  // Load existing data from calendar API (load multiple months to capture all data)
  useEffect(() => {
    const loadTimeBlockingData = async () => {
      try {
        const allBlocks: any[] = [];
        const allColorKeys: any[] = [];
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Load data for current month and adjacent months to capture all user data
        const monthsToLoad = [
          { year: currentYear, month: currentMonth - 1 === 0 ? 12 : currentMonth - 1, yearOffset: currentMonth - 1 === 0 ? -1 : 0 },
          { year: currentYear, month: currentMonth, yearOffset: 0 },
          { year: currentYear, month: currentMonth + 1 === 13 ? 1 : currentMonth + 1, yearOffset: currentMonth + 1 === 13 ? 1 : 0 }
        ];
        
        for (const monthInfo of monthsToLoad) {
          const year = monthInfo.year + monthInfo.yearOffset;
          const month = monthInfo.month;
          
          try {
            // Use the same method as other API calls in the app
            const response = await fetch(`/api/calendar-v3/${year}/${month}`);
            if (response.ok) {
              const calendarData = await response.json();
              console.log(`✅ Loaded calendar data for ${year}-${month}:`, calendarData);
              
              // Collect blocks from this month
              if (calendarData.days && Array.isArray(calendarData.days)) {
                calendarData.days.forEach((day: any) => {
                  if (day.entries && Array.isArray(day.entries)) {
                    day.entries.forEach((entry: any) => {
                      // Generate proper weekKey for weekly view compatibility
                      const blockDate = new Date(day.date);
                      const firstDayOfYear = new Date(blockDate.getFullYear(), 0, 1);
                      const pastDaysOfYear = (blockDate.getTime() - firstDayOfYear.getTime()) / 86400000;
                      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                      
                      allBlocks.push({
                        id: entry.id,
                        title: entry.label,
                        startTime: entry.time,
                        duration: 1,
                        colour: entry.color,
                        colourTagId: entry.colorKeyId,
                        day: day.date,
                        monthKey: `${year}-M${String(month).padStart(2, '0')}`,
                        weekKey: `${blockDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`
                      });
                    });
                  }
                });
              }
              
              // Collect color keys (avoid duplicates and filter out unwanted content categories)
              const unwantedCategories = ['Reel', 'Carousel', 'Photo', 'Promo', 'Story'];
              if (calendarData.colorKeys && Array.isArray(calendarData.colorKeys)) {
                calendarData.colorKeys.forEach((key: any) => {
                  // Skip unwanted content categories and avoid duplicates
                  if (!unwantedCategories.includes(key.label) && 
                      !allColorKeys.find(existing => existing.id === key.id)) {
                    allColorKeys.push(key);
                  }
                });
              }
            }
          } catch (error) {
            console.log(`Failed to load data for ${year}-${month}:`, error);
          }
        }
        
        // If we have any data, update the state
        if (allBlocks.length > 0 || allColorKeys.length > 0) {
          const colourTags = allColorKeys.map((key: any) => ({
            id: key.id,
            label: key.label,
            colour: key.color || key.colour, // Handle both property names
            selected: false
          }));
          
          // Use collected blocks or fall back to defaults
          const finalColorTags = colourTags.length > 0 ? colourTags : defaultTimeBlockingData.colourTags;
          
          const timeBlockData = {
            monthlyView: {
              blocks: allBlocks,
              selectedMonth: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
            },
            weeklyView: {
              blocks: allBlocks // CRITICAL FIX: Weekly view should use the same blocks
            },
            colourTags: finalColorTags
          };
          
          setTimeBlockingData(prev => ({
            ...prev,
            ...timeBlockData
          }));
          
          console.log(`Time blocking data loaded successfully - Found ${allBlocks.length} blocks across multiple months`);
        } else {
          console.log('No existing time blocking data found, using defaults');
          setTimeBlockingData(defaultTimeBlockingData);
        }
      } catch (error) {
        console.error('Failed to load time blocking data:', error);
        setTimeBlockingData(defaultTimeBlockingData);
      }
    };
    
    if (isAuthenticated && !isLoading) {
      loadTimeBlockingData();
    }
  }, [isAuthenticated, isLoading]);

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

  // Save function for the time blocking planner
  const handleSave = async (data: any) => {
    try {
      console.log('🔄 Saving time blocking data using new events API');
      
      // Save color tags to calendar v3 for compatibility
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const colorTagsOnlyData = {
        userId: data.userId || user?.id,
        year,
        month,
        colorKeys: data.colourTags || [],
        days: [] // No blocks in calendar - using events table now
      };
      
      // Save color tags
      await fetch('/api/calendar-v3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(colorTagsOnlyData)
      });
      
      console.log('✅ Color tags saved successfully');
    } catch (error) {
      console.error('❌ Error saving color tags:', error);
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