import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import ToolkitCard from "@/components/toolkit/toolkit-card";
import DailyFocus from "@/components/toolkit/daily-focus";
import RecentActivity from "@/components/toolkit/recent-activity";
import StatsCard from "@/components/toolkit/stats-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const toolkitModules = [
  {
    id: 1,
    name: "Content Planning",
    description: "Monthly calendars, batch planning, and content workflows",
    icon: "calendar-check",
    color: "blue",
    templateCount: 12,
    lastUsed: "2 days ago",
    href: "/content-planning"
  },
  {
    id: 2,
    name: "Time Blocking",
    description: "Daily planners, focus sessions, and productivity trackers",
    icon: "stopwatch",
    color: "orange",
    templateCount: 8,
    lastUsed: "today",
    href: "/time-blocking"
  },
  {
    id: 3,
    name: "Finance Tracker",
    description: "Revenue goals, expense tracking, and profit analysis",
    icon: "chart-pie",
    color: "green",
    templateCount: 6,
    lastUsed: "yesterday",
    href: "/finance-tracker"
  },
  {
    id: 4,
    name: "Inspiration Hub",
    description: "Mood boards, color palettes, and creative references",
    icon: "lightbulb",
    color: "purple",
    templateCount: 0,
    lastUsed: "24 saved items",
    href: "/inspiration-hub"
  },
  {
    id: 5,
    name: "Email Systems",
    description: "Templates, sequences, and automation workflows",
    icon: "envelope",
    color: "indigo",
    templateCount: 15,
    lastUsed: "3 days ago",
    href: "/email-systems"
  },
  {
    id: 6,
    name: "Affiliate Marketing",
    description: "Partner programs, commission tracking, and strategies",
    icon: "handshake",
    color: "pink",
    templateCount: 0,
    lastUsed: "Premium feature",
    href: "/affiliate-marketing"
  }
];

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    retry: false,
  });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-gray-600">Loading your creative workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-rose-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-gray-800 mb-2">
            Good morning, {user?.firstName || "Creative"}
          </h2>
          <p className="text-gray-600 text-lg">Ready to build your creative empire today?</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Tasks Completed"
            value={stats?.completedTasks || 0}
            subtitle="This Week"
            color="green"
            icon="check"
          />
          <StatsCard
            title="Focus Hours"
            value={((stats?.focusHours || 0) / 60).toFixed(1)}
            subtitle="Focus Time"
            color="purple"
            icon="clock"
          />
          <StatsCard
            title="Day Streak"
            value={stats?.streakDays || 0}
            subtitle="Days in a Row"
            color="pink"
            icon="heart"
          />
        </div>

        {/* Main Toolkit Sections */}
        <div className="mb-8">
          <h3 className="text-2xl font-serif font-semibold text-gray-800 mb-6">Your Creative Toolkit</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolkitModules.map((module) => (
              <ToolkitCard key={module.id} module={module} />
            ))}
          </div>
        </div>

        {/* Today's Focus and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DailyFocus />
          <RecentActivity />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Button 
          size="icon"
          className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}
