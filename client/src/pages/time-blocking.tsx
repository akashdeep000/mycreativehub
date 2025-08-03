import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Calendar, Timer, Target, BarChart3 } from "lucide-react";

export default function TimeBlocking() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const templates = [
    {
      id: 1,
      name: "Daily Time Blocks",
      description: "Structure your day with focused time blocks for maximum productivity",
      icon: Clock,
      color: "orange",
      lastUsed: "Today",
      isPopular: true
    },
    {
      id: 2,
      name: "Weekly Schedule",
      description: "Plan your entire week with this comprehensive scheduling template",
      icon: Calendar,
      color: "blue",
      lastUsed: "2 days ago",
      isPopular: true
    },
    {
      id: 3,
      name: "Pomodoro Tracker",
      description: "Track your focus sessions using the Pomodoro Technique",
      icon: Timer,
      color: "red",
      lastUsed: "Yesterday",
      isPopular: false
    },
    {
      id: 4,
      name: "Goal Setting Planner",
      description: "Break down your goals into actionable time blocks",
      icon: Target,
      color: "green",
      lastUsed: "1 week ago",
      isPopular: false
    },
    {
      id: 5,
      name: "Time Audit Sheet",
      description: "Track how you spend your time to identify improvement areas",
      icon: BarChart3,
      color: "purple",
      lastUsed: "3 days ago",
      isPopular: true
    }
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-rose-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Time Blocking</h1>
              <p className="text-gray-600">Optimize your schedule for peak productivity</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                8 Templates
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              New Time Block
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="border-pink-100 hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br from-${template.color}-400 to-${template.color}-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <template.icon className="w-5 h-5 text-white" />
                  </div>
                  {template.isPopular && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-serif">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Last used: {template.lastUsed}</span>
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Time Blocking Tips */}
        <Card className="mt-8 border-pink-100 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4">
              Time Blocking Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🎯 Start Small</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Begin with 2-3 time blocks per day. Once you get comfortable, gradually add more structure.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">⏰ Include Buffer Time</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Always add 10-15 minutes between blocks to account for transitions and unexpected delays.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🔄 Be Flexible</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Your schedule should serve you, not the other way around. Adjust blocks as needed.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📊 Track Your Energy</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Schedule your most important work during your peak energy hours for better results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
}
