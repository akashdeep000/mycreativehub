import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Play, Pause, Square, Timer, CheckCircle, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function QuickStartTimer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [task, setTask] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState("25");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState("");

  const timerOptions = [
    { value: "10", label: "10 min" },
    { value: "20", label: "20 min" },
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min" },
    { value: "60", label: "60 min" },
  ];

  // Log focus session mutation
  const logFocusMutation = useMutation({
    mutationFn: async ({ minutes, taskDescription }: { minutes: number; taskDescription: string }) => {
      await apiRequest("POST", "/api/focus/log", { 
        minutes, 
        sessionType: "focus",
        taskDescription 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsRunning(false);
            handleSessionComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Browser notification permission and sending
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleSessionComplete = () => {
    const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (completedMinutes > 0) {
      logFocusMutation.mutate({ 
        minutes: completedMinutes, 
        taskDescription: currentTask 
      });
    }

    // Try to send browser notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("Time's up!", {
        body: "How did it go?",
        icon: "/favicon.ico"
      });
    }

    setShowCompleteDialog(true);
  };

  const handleStart = () => {
    if (!task.trim()) {
      toast({
        title: "Task Required",
        description: "Please enter a task to focus on.",
        variant: "destructive",
      });
      return;
    }

    const minutes = parseInt(selectedMinutes);
    const seconds = minutes * 60;
    setCurrentTask(task);
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (completedMinutes > 0) {
      logFocusMutation.mutate({ 
        minutes: completedMinutes, 
        taskDescription: currentTask 
      });
    }
    
    setIsRunning(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setTask("");
  };

  const handleMarkComplete = () => {
    setShowCompleteDialog(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setTask("");
    
    toast({
      title: "Task Completed!",
      description: "Great work! Your progress has been logged.",
    });
  };

  const handleOpenFullSystem = () => {
    setShowCompleteDialog(false);
    setLocation("/daily-focus");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return (
    <>
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Quick Start Prioritisation Boost
              </CardTitle>
              <CardDescription className="text-gray-600">
                Focus on one task with a timer
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isRunning && timeLeft === 0 ? (
            <>
              <div className="space-y-3">
                <Input
                  placeholder="What's one thing you can make progress on right now?"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="border-purple-200 focus:border-purple-400 bg-white"
                />
                
                <div className="flex items-center gap-3">
                  <Select value={selectedMinutes} onValueChange={setSelectedMinutes}>
                    <SelectTrigger className="w-32 border-purple-200 focus:border-purple-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={handleStart}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Focus
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-purple-200">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/daily-focus")}
                  className="w-full border-purple-200 hover:bg-purple-50"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Take me to my full prioritisation system
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Want to plan your full day? Head here to sort out your Must / Should / Could list.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {formatTime(timeLeft)}
                </div>
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {currentTask}
                </Badge>
              </div>
              
              <Progress value={progressPercentage} className="h-2" />
              
              <div className="flex justify-center gap-2">
                {isRunning ? (
                  <Button 
                    onClick={handlePause}
                    variant="outline"
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setIsRunning(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                
                <Button 
                  onClick={handleStop}
                  variant="outline"
                  className="border-red-200 hover:bg-red-50 text-red-600"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Time's up!
            </DialogTitle>
            <DialogDescription>
              How did it go? You focused on: "{currentTask}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              onClick={handleMarkComplete}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Task Complete
            </Button>
            
            <Button 
              onClick={handleOpenFullSystem}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Open Full Prioritisation Framework
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}