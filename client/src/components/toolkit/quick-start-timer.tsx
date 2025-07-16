import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Play, Pause, Square, Timer, CheckCircle, ArrowRight, Clock, Volume2, Repeat, X, Minimize2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function QuickStartTimer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // All state variables
  const [task, setTask] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState("25");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState("");
  const [customTime, setCustomTime] = useState({ hours: 0, minutes: 25 });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [selectedAlarmSound] = useState("chime");

  const timerOptions = [
    { value: "10", label: "10 min" },
    { value: "20", label: "20 min" },
    { value: "25", label: "25 min" },
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min" },
    { value: "60", label: "60 min" },
    { value: "custom", label: "Custom Time" },
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

  // Helper function to create digital chime alarm sound
  const createAlarmSound = useCallback(() => {
    console.log("Creating alarm sound...");
    
    // Use Web Audio API for reliable digital chime
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playDigitalChime(audioContext);
        });
      } else {
        playDigitalChime(audioContext);
      }
      
      function playDigitalChime(context: AudioContext) {
        console.log("Playing digital chime with Web Audio API...");
        
        // Create a pleasant digital chime sound
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Set frequency to 800Hz for soft chime
        oscillator.frequency.setValueAtTime(800, context.currentTime);
        oscillator.type = 'triangle'; // Triangle wave for softer sound
        
        // Create gentle envelope
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.1); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.2); // Slow decay
        
        // Start and stop the oscillator
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 1.2);
        
        oscillator.onended = () => {
          context.close();
          console.log("Digital chime completed successfully");
        };
      }
    } catch (e) {
      console.log("Web Audio API failed:", e);
      // Fallback to simple beep
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.5);
        
        console.log("Fallback beep played");
      } catch (fallbackError) {
        console.log("All audio methods failed:", fallbackError);
      }
    }
  }, []);

  // Helper function to stop alarm
  const stopAlarm = useCallback(() => {
    console.log("=== STOP ALARM CALLED ===");
    if (alarmIntervalRef.current) {
      console.log("Clearing alarm interval");
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
      console.log("Alarm interval cleared");
    } else {
      console.log("No alarm interval to clear");
    }
  }, []);

  // Helper function to start alarm
  const startAlarm = useCallback(() => {
    console.log("=== START ALARM CALLED ===");
    
    if (alarmIntervalRef.current) {
      console.log("Clearing existing alarm interval");
      clearInterval(alarmIntervalRef.current);
    }
    
    console.log("Playing initial alarm sound...");
    try {
      createAlarmSound();
    } catch (e) {
      console.log("First alarm sound failed, retrying...", e);
    }
    
    console.log("Setting up repeating alarm interval...");
    alarmIntervalRef.current = setInterval(() => {
      console.log("Repeating alarm sound...");
      try {
        createAlarmSound();
      } catch (e) {
        console.log("Alarm sound failed during repeat", e);
      }
    }, 800);
    
    setTimeout(() => {
      console.log("Stopping alarm after 5 seconds");
      stopAlarm();
    }, 5000);
  }, [createAlarmSound, stopAlarm]);

  // Handle session complete
  const handleSessionComplete = useCallback(() => {
    console.log("=== SESSION COMPLETE ===");
    console.log("Timer has finished, starting alarm...");
    
    const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (completedMinutes > 0) {
      logFocusMutation.mutate({ 
        minutes: completedMinutes, 
        taskDescription: currentTask 
      });
    }

    console.log("Calling startAlarm()...");
    startAlarm();

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("Your Focus Timer is up!", {
        body: "Time to wrap up or take a break. How did it go?",
        icon: "/favicon.ico",
        tag: "focus-timer",
        requireInteraction: true,
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        stopAlarm();
      };
    } else if (notificationPermission === "denied") {
      toast({
        title: "Your Focus Timer is up!",
        description: "Time to wrap up or take a break. How did it go?",
        duration: 10000,
      });
    }

    setTimeout(() => {
      setShowCompleteDialog(true);
    }, 100);
    
    if (repeatMode) {
      setTimeout(() => {
        setShowCompleteDialog(false);
        const minutes = selectedMinutes === "custom" ? 
          (customTime.hours * 60 + customTime.minutes) : 
          parseInt(selectedMinutes);
        const seconds = minutes * 60;
        setTimeLeft(seconds);
        setTotalTime(seconds);
        setIsRunning(true);
        
        toast({
          title: "Timer Restarted",
          description: `Starting another ${minutes} minute focus session`,
        });
      }, 3000);
    }
  }, [totalTime, timeLeft, currentTask, logFocusMutation, notificationPermission, repeatMode, selectedMinutes, customTime, startAlarm, stopAlarm, toast]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            console.log("Timer reached 0, stopping and completing session");
            setIsRunning(false);
            handleSessionComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleSessionComplete]);

  // Initialize notification permissions
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, []);

  // Handle selection change for custom time
  useEffect(() => {
    if (selectedMinutes === "custom") {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
    }
  }, [selectedMinutes]);

  const handleStart = () => {
    if (!task.trim()) {
      toast({
        title: "Task Required",
        description: "Please enter a task to focus on.",
        variant: "destructive",
      });
      return;
    }

    let minutes;
    if (selectedMinutes === "custom") {
      minutes = customTime.hours * 60 + customTime.minutes;
      if (minutes <= 0) {
        toast({
          title: "Invalid Time",
          description: "Please set a valid time duration.",
          variant: "destructive",
        });
        return;
      }
    } else {
      minutes = parseInt(selectedMinutes);
    }

    const seconds = minutes * 60;
    setCurrentTask(task);
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setIsRunning(true);
    setIsFloatingVisible(true);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audioContext.close();
    } catch (e) {
      // Silent initialization failure
    }
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
    
    stopAlarm();
    setIsRunning(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setTask("");
    setIsFloatingVisible(false);
  };

  const handleMarkComplete = () => {
    stopAlarm();
    setShowCompleteDialog(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setTask("");
    setIsFloatingVisible(false);
    
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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Quick Focus Timer
          </CardTitle>
          <CardDescription>
            Start a focused work session with the Pomodoro technique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">What will you focus on?</label>
            <Input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g., Write blog post, Review emails..."
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration</label>
            <Select value={selectedMinutes} onValueChange={setSelectedMinutes}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {timerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomInput && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-md">
              <label className="text-sm font-medium">Custom Duration</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={customTime.hours}
                  onChange={(e) => setCustomTime(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                  className="w-16"
                />
                <span className="text-sm">hours</span>
                <Input
                  type="number"
                  min="1"
                  max="59"
                  value={customTime.minutes}
                  onChange={(e) => setCustomTime(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                  className="w-16"
                />
                <span className="text-sm">minutes</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              <span className="text-sm">Repeat mode</span>
            </div>
            <Switch
              checked={repeatMode}
              onCheckedChange={setRepeatMode}
            />
          </div>

          <Button 
            onClick={handleStart} 
            className="w-full" 
            disabled={isRunning || !task.trim()}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Focus Session
          </Button>
        </CardContent>
      </Card>

      {/* Floating Timer */}
      {isFloatingVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-80 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  {currentTask}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFloatingMinimized(!isFloatingMinimized)}
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStop}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {!isFloatingMinimized && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</div>
                  </div>
                  <Progress value={progressPercentage} className="w-full" />
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isRunning ? handlePause : handleStart}
                    >
                      {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStop}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Focus Session Complete!
            </DialogTitle>
            <DialogDescription>
              Great work! You've completed your focus session. How did it go?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-700">
                Task: <span className="font-medium">{currentTask}</span>
              </div>
              <div className="text-sm text-green-700">
                Duration: <span className="font-medium">{Math.floor(totalTime / 60)} minutes</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleMarkComplete} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </Button>
              <Button variant="outline" onClick={handleOpenFullSystem} className="flex-1">
                <ArrowRight className="w-4 h-4 mr-2" />
                Open Daily Focus
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={stopAlarm}
              className="w-full"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Stop Alarm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}