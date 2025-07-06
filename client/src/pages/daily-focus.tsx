import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import DailyFocus from "@/components/toolkit/daily-focus";
import FocusTimer from "@/components/toolkit/focus-timer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Target, Timer, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function DailyFocusPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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
            <Target className="text-white text-2xl" />
          </div>
          <p className="text-gray-600">Loading your prioritisation framework...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-rose-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation("/")}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="text-white text-2xl" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Daily Prioritisation Framework
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Plan your full day with the Must / Should / Could system and dedicated focus blocks.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              
              {/* Daily Tasks Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Today's Priority Tasks
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Organise your tasks by Must / Should / Could priority levels
                    </p>
                  </div>
                </div>
                
                <DailyFocus />
              </div>

              {/* Focus Block Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Timer className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Focused Work Session
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Use the Pomodoro technique for deep focus work
                    </p>
                  </div>
                </div>
                
                <div className="max-w-md mx-auto">
                  <FocusTimer />
                </div>
              </div>

              {/* Tips Section */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">
                    Daily Prioritisation Tips
                  </CardTitle>
                  <CardDescription className="text-blue-600">
                    Make the most of your structured day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-blue-700">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p><strong>Must tasks:</strong> Critical items that absolutely need to be done today</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p><strong>Should tasks:</strong> Important tasks that would make a significant difference</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p><strong>Could tasks:</strong> Nice-to-have items for when you have extra time</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p><strong>Focus blocks:</strong> Use 25-minute sessions with 5-minute breaks for optimal concentration</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}