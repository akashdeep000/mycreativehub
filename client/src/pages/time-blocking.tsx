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
                      allBlocks.push({
                        id: entry.id,
                        title: entry.label,
                        startTime: entry.time,
                        duration: 1,
                        colour: entry.color,
                        colourTagId: entry.colorKeyId,
                        day: day.date,
                        monthKey: `${year}-M${String(month).padStart(2, '0')}`
                      });
                    });
                  }
                });
              }
              
              // Collect color keys (avoid duplicates)
              if (calendarData.colorKeys && Array.isArray(calendarData.colorKeys)) {
                calendarData.colorKeys.forEach((key: any) => {
                  if (!allColorKeys.find(existing => existing.id === key.id)) {
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
            colour: key.color,
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
              blocks: [] // For now, focus on monthly view
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
      // Convert time blocking data to calendar v3 format
      const convertTimeBlockingToCalendarV3 = (timeBlockData: any) => {
        const calendarData: any = {};
        
        // Process monthly view blocks
        if (timeBlockData.monthlyView?.blocks) {
          timeBlockData.monthlyView.blocks.forEach((block: any) => {
            const blockDate = new Date(block.day);
            const year = blockDate.getFullYear();
            const month = blockDate.getMonth() + 1;
            const dateStr = block.day;
            
            const monthKey = `${year}-${month}`;
            
            if (!calendarData[monthKey]) {
              calendarData[monthKey] = {
                year,
                month,
                colorKeys: timeBlockData.colourTags || [],
                days: []
              };
            }
            
            // Find or create day entry
            let dayEntry = calendarData[monthKey].days.find((d: any) => d.date === dateStr);
            if (!dayEntry) {
              dayEntry = { date: dateStr, entries: [] };
              calendarData[monthKey].days.push(dayEntry);
            }
            
            // Add time block as calendar entry
            dayEntry.entries.push({
              id: block.id,
              colorKeyId: block.colourTagId || block.id,
              label: block.title,
              color: block.colour,
              notes: '',
              time: block.startTime
            });
          });
        }
        
        return calendarData;
      };
      
      const calendarData = convertTimeBlockingToCalendarV3(data);
      
      // Save each month's data separately with proper authentication
      let savedCount = 0;
      for (const monthKey in calendarData) {
        const monthData = calendarData[monthKey];
        console.log(`💾 Saving time blocks for ${monthKey}:`, {
          blocks: monthData.days?.length || 0,
          colorKeys: monthData.colorKeys?.length || 0
        });
        
        const response = await fetch('/api/calendar-v3', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include', // Include session cookies for authentication
          body: JSON.stringify(monthData)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save data for ${monthKey}: ${response.status}`);
        }
        
        savedCount++;
        console.log(`✅ Successfully saved ${monthKey}`);
      }
      
      console.log(`🎉 Time blocking data saved successfully! (${savedCount} months saved)`);
      
      // Show success toast to user
      toast({
        title: "Saved ✓",
        description: `Your time blocks have been saved successfully.`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to save time blocking data:', error);
      toast({
        title: "Save Error",
        description: "Failed to save your time blocks. Please try again.",
        variant: "destructive",
      });
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