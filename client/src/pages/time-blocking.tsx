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
    blocks: [
      { id: "block-1", title: "Newsletter Content", startTime: "09:00", duration: 2, colour: "#3B82F6", colourTagId: "tag-1", day: "Monday" },
      { id: "block-2", title: "Blog Post Writing", startTime: "11:00", duration: 1, colour: "#10B981", colourTagId: "tag-2", day: "Monday" },
      { id: "block-3", title: "Instagram Reels", startTime: "14:00", duration: 2, colour: "#8B5CF6", colourTagId: "tag-3", day: "Monday" },
      { id: "block-4", title: "Video Editing", startTime: "09:00", duration: 1, colour: "#F59E0B", colourTagId: "tag-4", day: "Tuesday" },
      { id: "block-5", title: "Weekly Review", startTime: "10:00", duration: 2, colour: "#EF4444", colourTagId: "tag-5", day: "Tuesday" },
      { id: "block-6", title: "Course Development", startTime: "09:00", duration: 3, colour: "#14B8A6", colourTagId: "tag-6", day: "Wednesday" },
      { id: "block-7", title: "Brainstorming Session", startTime: "13:00", duration: 1, colour: "#EC4899", colourTagId: "tag-7", day: "Wednesday" }
    ]
  },
  monthlyView: {
    blocks: [
      { 
        id: "month-1", 
        title: "Product Launch Planning", 
        startTime: "10:00", 
        duration: 1, 
        colour: "#EF4444", 
        colourTagId: "tag-5",
        day: new Date().toISOString().split('T')[0]
      },
      { 
        id: "month-2", 
        title: "Content Filming Day", 
        startTime: "09:00", 
        duration: 4, 
        colour: "#8B5CF6", 
        colourTagId: "tag-3",
        day: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      }
    ],
    selectedMonth: new Date().toISOString().substring(0, 7)
  }
};

export default function TimeBlocking() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [timeBlockingData, setTimeBlockingData] = useState(defaultTimeBlockingData);

  // Fetch the user's time blocking template if it exists
  const { data: templates } = useQuery({
    queryKey: ["/api/workflow-templates"],
    enabled: !!user,
  });

  // Load user's existing time blocking data if available
  useEffect(() => {
    if (templates && Array.isArray(templates)) {
      const timeBlockingTemplate = templates.find((t: any) => t.templateType === 'time-blocking');
      if (timeBlockingTemplate && timeBlockingTemplate.data) {
        setTimeBlockingData(prev => ({
          ...prev,
          ...timeBlockingTemplate.data
        }));
      }
    }
  }, [templates]);

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
    if (!templates || !Array.isArray(templates)) return;
    
    const timeBlockingTemplate = templates.find((t: any) => t.templateType === 'time-blocking');
    if (timeBlockingTemplate) {
      try {
        await fetch(`/api/workflow-templates/${timeBlockingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
      } catch (error) {
        console.error('Failed to save time blocking data:', error);
      }
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
            <p className="text-gray-600">
              Optimize your schedule for peak productivity
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
            <TimeBlockingPlanner
              templateId={1}
              initialData={timeBlockingData}
              onSave={handleSave}
            />
          </div>
        </main>
      </div>
    </div>
  );
}