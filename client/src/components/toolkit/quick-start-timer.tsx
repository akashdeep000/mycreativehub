import { useState, useEffect, useRef } from "react";
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
  
  const [task, setTask] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState("25");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState("");
  
  // New state for custom time and features
  const [customTime, setCustomTime] = useState({ hours: 0, minutes: 25 });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isFloatingVisible, setIsFloatingVisible] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [selectedAlarmSound, setSelectedAlarmSound] = useState("beep");

  const timerOptions = [
    { value: "10", label: "10 min" },
    { value: "20", label: "20 min" },
    { value: "25", label: "25 min" },
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min" },
    { value: "60", label: "60 min" },
    { value: "custom", label: "Custom Time" },
  ];

  const alarmSounds = [
    { value: "beep", label: "Classic Beep", description: "Simple beep sound" },
    { value: "chime", label: "Digital Chime", description: "Pleasant chime tone" },
    { value: "buzz", label: "Buzz Alert", description: "Urgent buzzing sound" },
    { value: "bell", label: "Bell Ring", description: "Traditional bell sound" },
    { value: "alarm", label: "Alarm Clock", description: "Classic alarm clock sound" },
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

  // Initialize notification permissions
  useEffect(() => {
    // Request notification permissions
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    // Cleanup function to clear alarm interval
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

  // Helper functions to create different alarm sounds using Web Audio API
  const createAlarmSound = (soundType: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure different sounds
      switch (soundType) {
        case "beep":
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
          
        case "chime":
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2); // E5
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.4); // G5
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.6);
          break;
          
        case "buzz":
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
          
        case "bell":
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.8);
          break;
          
        case "alarm":
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
      }
      
      oscillator.onended = () => {
        audioContext.close();
      };
      
      console.log(`${soundType} sound played successfully`);
    } catch (e) {
      console.log(`${soundType} sound creation failed:`, e);
    }
  };

  // Helper function to play selected alarm sound
  const playAlarmSound = () => {
    createAlarmSound(selectedAlarmSound);
  };

  // Helper function to start alarm (repeating for 5 seconds)
  const startAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
    }
    
    playAlarmSound(); // Play immediately
    
    // Set up repeating alarm
    alarmIntervalRef.current = setInterval(() => {
      playAlarmSound();
    }, 800); // Play every 800ms for alarm clock effect
    
    // Stop alarm after 5 seconds
    setTimeout(() => {
      stopAlarm();
    }, 5000);
  };

  // Helper function to stop alarm
  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  const handleSessionComplete = () => {
    const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (completedMinutes > 0) {
      logFocusMutation.mutate({ 
        minutes: completedMinutes, 
        taskDescription: currentTask 
      });
    }

    // Start alarm clock sound (repeating for 5 seconds)
    startAlarm();

    // Send enhanced browser notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("Your Focus Timer is up!", {
        body: "Time to wrap up or take a break. How did it go?",
        icon: "/favicon.ico",
        tag: "focus-timer", // Prevents duplicate notifications
        requireInteraction: true, // Keeps notification visible until user interacts
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        stopAlarm(); // Stop alarm when notification is clicked
      };
    } else if (notificationPermission === "denied") {
      // Fallback for denied permissions
      toast({
        title: "Your Focus Timer is up!",
        description: "Time to wrap up or take a break. How did it go?",
        duration: 10000, // Longer duration for visibility
      });
    }

    setShowCompleteDialog(true);
    
    // Auto-restart if repeat mode is enabled
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
      }, 3000); // 3 second delay before restarting
    }
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

    // Calculate minutes based on selection
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
    
    stopAlarm(); // Stop any playing alarm
    setIsRunning(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setTask("");
    setIsFloatingVisible(false);
  };

  const handleMarkComplete = () => {
    stopAlarm(); // Stop any playing alarm
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
                
                <div className="space-y-3">
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

                  {/* Custom Time Input */}
                  {showCustomInput && (
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={customTime.hours}
                          onChange={(e) => setCustomTime(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                          className="w-16 text-center border-purple-200 focus:border-purple-400"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-500">hours</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={customTime.minutes}
                          onChange={(e) => setCustomTime(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                          className="w-16 text-center border-purple-200 focus:border-purple-400"
                          placeholder="25"
                        />
                        <span className="text-sm text-gray-500">minutes</span>
                      </div>
                    </div>
                  )}

                  {/* Repeat Mode Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="repeat-mode"
                      checked={repeatMode}
                      onCheckedChange={setRepeatMode}
                    />
                    <label htmlFor="repeat-mode" className="text-sm text-gray-600 cursor-pointer">
                      <Repeat className="w-4 h-4 inline mr-1" />
                      Auto-repeat sessions
                    </label>
                  </div>

                  {/* Notification Status */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Volume2 className="w-3 h-3" />
                    {notificationPermission === "granted" ? (
                      <span className="text-green-600">✓ Notifications enabled</span>
                    ) : notificationPermission === "denied" ? (
                      <span className="text-red-600">✗ Notifications blocked (will use toast alerts)</span>
                    ) : (
                      <span className="text-yellow-600">⚠ Click to enable notifications</span>
                    )}
                  </div>

                  {/* Alarm Sound Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Choose Alarm Sound</label>
                    <Select value={selectedAlarmSound} onValueChange={(value) => {
                      setSelectedAlarmSound(value);
                      // Play the selected sound immediately
                      createAlarmSound(value);
                    }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select alarm sound" />
                      </SelectTrigger>
                      <SelectContent>
                        {alarmSounds.map((sound) => (
                          <SelectItem key={sound.value} value={sound.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{sound.label}</span>
                              <span className="text-xs text-gray-500">{sound.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
              onClick={stopAlarm}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Alarm
            </Button>
            
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

      {/* Floating Timer Widget */}
      {isFloatingVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg shadow-lg transition-all duration-300 ${
            isFloatingMinimized ? 'p-2' : 'p-4'
          }`}>
            {isFloatingMinimized ? (
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                <span className="text-sm font-semibold">{formatTime(timeLeft)}</span>
                <Button
                  onClick={() => setIsFloatingMinimized(false)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  <Play className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm font-semibold">Focus Timer</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => setIsFloatingMinimized(true)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={handleStop}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
                  <div className="text-xs opacity-80 truncate max-w-[200px]">{currentTask}</div>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-white h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                
                <div className="flex justify-center gap-2">
                  {isRunning ? (
                    <Button
                      onClick={handlePause}
                      size="sm"
                      variant="ghost"
                      className="h-8 text-white hover:bg-white/20"
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setIsRunning(true)}
                      size="sm"
                      variant="ghost"
                      className="h-8 text-white hover:bg-white/20"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}