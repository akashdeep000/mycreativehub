import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { routeMap } from "@/lib/navigation";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import ToolkitCard from "@/components/toolkit/toolkit-card";
import DailyFocus from "@/components/toolkit/daily-focus";
import StatsCard from "@/components/toolkit/stats-card";
import QuickStartTimer from "@/components/toolkit/quick-start-timer";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { User, UserStats } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/stats"],
    retry: false,
    enabled: !!user, // Only run when user is authenticated
  });

  const { data: toolkitModules = [] } = useQuery<any[]>({
    queryKey: ["/api/toolkit-modules"],
    retry: false,
    enabled: !!user, // Only run when user is authenticated
  });

  // Redirect to login if not authenticated - with improved logic
  useEffect(() => {
    // Only redirect if we're definitely not loading and definitely not authenticated
    // Also check if there's a token in localStorage - if there is, don't redirect yet
    const token = localStorage.getItem('authToken');
    if (!isLoading && !isAuthenticated && !token) {
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
    <div className="min-h-screen bg-white">
      <Sidebar />
      
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-3xl lg:text-4xl font-serif font-semibold text-gray-800 mb-2">
            Hey {user?.firstName || "Creative"}!
          </h2>
          <p className="text-gray-600 text-lg">Ready to build your creative empire today?</p>
        </div>

        {/* Today's Focus */}
        <div className="mb-8">
          <DailyFocus />
        </div>

        {/* Monthly Stats Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-semibold text-gray-800">
              Your Stats for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Tasks Completed"
            value={stats?.completedTasks || 0}
            subtitle="This Week"
            colour="green"
            icon="check"
          />
          <StatsCard
            title="Focus Hours"
            value={((stats?.focusHours || 0) / 60).toFixed(1)}
            subtitle="Focus Time"
            colour="purple"
            icon="clock"
          />
          <StatsCard
            title="Days You Showed Up"
            value={stats?.daysShowedUp || 0}
            subtitle="This month"
            colour="pink"
            icon="heart"
          />
          </div>
        </div>

        {/* Quick Start Timer */}
        <div className="mb-8">
          <QuickStartTimer />
        </div>

        {/* Main Toolkit Sections */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h3 className="text-2xl font-serif font-semibold text-gray-800 mb-6">Your Creative Toolkit</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {(toolkitModules as any[]).map((module: any) => (
              <ToolkitCard key={module.id} module={{
                ...module,
                href: routeMap[module.name] || "/",
                lastUsed: "New"
              }} />
            ))}
          </div>
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
