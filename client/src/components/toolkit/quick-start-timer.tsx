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
  const audioContextRef = useRef<AudioContext | null>(null);
  
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
  const [worker, setWorker] = useState<Worker | null>(null);

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
    
    // Use pre-initialized audio context or create new one
    let audioContext = audioContextRef.current;
    
    try {
      // Create audio context if not available
      if (!audioContext) {
        console.log("Creating new audio context...");
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContext();
        audioContextRef.current = audioContext;
      }
      
      console.log("Audio context state:", audioContext.state);
      
      const playSound = () => {
        console.log("Playing soft digital chime...");
        
        // Create oscillator and gain node
        const oscillator = audioContext!.createOscillator();
        const gainNode = audioContext!.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext!.destination);
        
        // Configure sound - soft 800Hz triangle wave
        oscillator.frequency.setValueAtTime(800, audioContext!.currentTime);
        oscillator.type = 'triangle';
        
        // Volume envelope - start at 0, ramp up, then fade out
        gainNode.gain.setValueAtTime(0, audioContext!.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext!.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext!.currentTime + 0.8);
        
        // Play the sound
        oscillator.start(audioContext!.currentTime);
        oscillator.stop(audioContext!.currentTime + 0.8);
        
        console.log("Digital chime started successfully");
        
        // Clean up when done
        oscillator.onended = () => {
          console.log("Digital chime completed");
        };
      };
      
      // Resume audio context if suspended, then play
      if (audioContext.state === 'suspended') {
        console.log("Resuming suspended audio context...");
        audioContext.resume().then(() => {
          console.log("Audio context resumed");
          playSound();
        }).catch(e => {
          console.log("Failed to resume audio context:", e);
        });
      } else {
        playSound();
      }
      
    } catch (e) {
      console.log("Web Audio API failed:", e);
      
      // Fallback: Try to create a simple beep using data URL
      try {
        console.log("Trying fallback audio method...");
        const audio = new Audio();
        
        // Create a simple beep tone as data URL
        const sampleRate = 44100;
        const duration = 0.3;
        const frequency = 800;
        const samples = sampleRate * duration;
        const buffer = new ArrayBuffer(44 + samples * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples * 2, true);
        
        // Generate tone
        for (let i = 0; i < samples; i++) {
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1 * (1 - i / samples);
          view.setInt16(44 + i * 2, sample * 32767, true);
        }
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        audio.src = url;
        audio.play().then(() => {
          console.log("Fallback beep played successfully");
          URL.revokeObjectURL(url);
        }).catch(err => {
          console.log("Fallback audio failed:", err);
        });
        
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
      console.log("Stopping alarm after 5 chimes");
      stopAlarm();
    }, 4000);
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

    // Enhanced notification system for cross-tab/cross-app visibility
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("🎯 Focus Timer Complete!", {
        body: `"${currentTask}" session finished. Time to wrap up or take a break!`,
        icon: "/favicon.ico",
        tag: "focus-timer",
        requireInteraction: true,
        silent: false, // Allow sound
        vibrate: [200, 100, 200], // Vibration pattern for mobile
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
        stopAlarm();
        setShowCompleteDialog(true);
      };

      // Auto-close notification after 30 seconds
      setTimeout(() => {
        notification.close();
      }, 30000);
    } else if (notificationPermission === "denied") {
      toast({
        title: "🎯 Focus Timer Complete!",
        description: `"${currentTask}" session finished. Time to wrap up or take a break!`,
        duration: 15000,
      });
    }

    // Also play alarm sound even if tab is not focused
    if (document.hidden) {
      console.log("Tab is hidden, playing background alarm");
      // Play alarm sound with higher volume for background
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkdCDWH0fTNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkdCDWH0fTNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkdCDWH0fTNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmkdCDWH0fTNeSsFJHfH8N2QQAoUXrTp66hVFA==');
        audio.volume = 0.3;
        audio.play().catch(e => console.log("Background audio failed:", e));
      } catch (e) {
        console.log("Background audio setup failed:", e);
      }
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

  // Web Worker already handles timing, but we keep localStorage sync for persistence
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      // Update localStorage for cross-tab persistence
      const timerData = {
        startTime: Date.now() - (totalTime - timeLeft) * 1000,
        totalTime,
        task: currentTask,
        isRunning: true
      };
      localStorage.setItem('persistent-timer', JSON.stringify(timerData));
    } else if (!isRunning) {
      localStorage.removeItem('persistent-timer');
    }
  }, [isRunning, timeLeft, totalTime, currentTask]);

  // Listen for page visibility changes to maintain timer across tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible - sync with localStorage
        console.log("Page became visible, syncing timer state");
        const savedTimer = localStorage.getItem('persistent-timer');
        if (savedTimer) {
          try {
            const timerData = JSON.parse(savedTimer);
            const now = Date.now();
            const elapsed = now - timerData.startTime;
            const remainingTime = timerData.totalTime - Math.floor(elapsed / 1000);
            
            if (remainingTime > 0 && timerData.isRunning) {
              console.log("Restoring timer state:", { remainingTime, task: timerData.task });
              setTimeLeft(remainingTime);
              setCurrentTask(timerData.task);
              setTotalTime(timerData.totalTime);
              setIsRunning(true);
              setIsFloatingVisible(true);
              setTask(timerData.task);
            } else if (remainingTime <= 0 && timerData.isRunning) {
              console.log("Timer completed while tab was hidden");
              setIsRunning(false);
              setShowCompleteDialog(true);
              setCurrentTask(timerData.task);
              setIsFloatingVisible(true);
              localStorage.removeItem('persistent-timer');
            }
          } catch (e) {
            console.log("Error restoring timer on visibility change:", e);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setTask]);

  // Save timer state to localStorage for persistence across page reloads
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const timerData = {
        task: currentTask,
        totalTime,
        startTime: Date.now() - (totalTime - timeLeft) * 1000,
        isRunning: true
      };
      localStorage.setItem('persistent-timer', JSON.stringify(timerData));
    } else {
      localStorage.removeItem('persistent-timer');
    }
  }, [isRunning, timeLeft, totalTime, currentTask]);

  // Initialize Web Worker for background timer
  useEffect(() => {
    if (typeof window !== "undefined" && window.Worker) {
      try {
        const timerWorker = new Worker('/timer-worker.js');
        setWorker(timerWorker);
        
        // Handle worker messages
        timerWorker.onmessage = function(e) {
          const { type, data } = e.data;
          console.log('Main thread received:', type, data);
          
          switch (type) {
            case 'TIMER_UPDATE':
              setTimeLeft(data.remaining);
              setCurrentTask(data.task);
              setTotalTime(data.totalTime);
              setIsRunning(data.isRunning);
              setIsFloatingVisible(true);
              break;
              
            case 'TIMER_COMPLETE':
              console.log("Timer completed in background worker");
              setIsRunning(false);
              setTimeLeft(0);
              setCurrentTask(data.task);
              setShowCompleteDialog(true);
              setIsFloatingVisible(true);
              localStorage.removeItem('persistent-timer');
              break;
              
            case 'TIMER_STOPPED':
              setIsRunning(false);
              setIsFloatingVisible(false);
              localStorage.removeItem('persistent-timer');
              break;
              
            case 'WORKER_READY':
              console.log("Timer worker is ready");
              break;
          }
        };
        
        // Check for existing timer state
        timerWorker.postMessage({ type: 'GET_STATUS' });
        
        return () => {
          timerWorker.terminate();
        };
      } catch (e) {
        console.log("Could not create timer worker:", e);
      }
    }
  }, []); // Remove handleSessionComplete from dependencies


  // Initialize notification permissions and restore persistent timer
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    // Restore persistent timer state from localStorage
    const savedTimer = localStorage.getItem('persistent-timer');
    if (savedTimer) {
      try {
        const timerData = JSON.parse(savedTimer);
        const now = Date.now();
        const elapsed = now - timerData.startTime;
        const remainingTime = timerData.totalTime - Math.floor(elapsed / 1000);
        
        if (remainingTime > 0 && timerData.isRunning) {
          setCurrentTask(timerData.task);
          setTimeLeft(remainingTime);
          setTotalTime(timerData.totalTime);
          setIsRunning(true);
          setIsFloatingVisible(true);
          setTask(timerData.task);
        } else if (remainingTime <= 0 && timerData.isRunning) {
          // Timer finished while away - show completion
          setShowCompleteDialog(true);
          setCurrentTask(timerData.task);
          setIsFloatingVisible(true);
          localStorage.removeItem('persistent-timer');
        }
      } catch (e) {
        console.log("Error restoring timer state:", e);
        localStorage.removeItem('persistent-timer');
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

    // Initialize audio context with user interaction
    try {
      if (!audioContextRef.current) {
        console.log("Initializing audio context...");
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        console.log("Audio context initialized:", audioContextRef.current.state);
      }
    } catch (e) {
      console.log("Failed to initialize audio context:", e);
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
    
    // Start the background worker timer
    if (worker) {
      worker.postMessage({
        type: 'START_TIMER',
        data: {
          totalTime: seconds,
          task: task
        }
      });
    }
    
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
    
    // Stop the background worker timer
    if (worker) {
      worker.postMessage({ type: 'STOP_TIMER' });
    }
    
    stopAlarm();
    setIsRunning(false);
    setTimeLeft(0);
    setTotalTime(0);
    setCurrentTask("");
    setTask("");
    setIsFloatingVisible(false);
    setShowCompleteDialog(false);
  };

  const handleMarkComplete = () => {
    // Stop the background worker timer
    if (worker) {
      worker.postMessage({ type: 'STOP_TIMER' });
    }
    
    stopAlarm();
    setShowCompleteDialog(false);
    setIsRunning(false);
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
          {/* Show input fields only when timer is NOT running */}
          {!isRunning && (
            <>
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

                      className="w-16 no-spinners"
                    />
                    <span className="text-sm">hours</span>
                    <Input
                      type="number"
                      min="1"
                      max="59"
                      value={customTime.minutes}
                      onChange={(e) => setCustomTime(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}

                      className="w-16 no-spinners"
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
            </>
          )}

          {/* Timer countdown display when running */}
          {isRunning && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Currently focusing on:</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600">Running</span>
                </div>
              </div>
              <p className="text-sm text-gray-800 mb-3 font-medium">{currentTask}</p>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(timeLeft)}
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handlePause}
                    disabled={!isRunning}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleStop}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

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

      {/* Persistent Floating Timer - Enhanced for cross-tab visibility */}
      {isFloatingVisible && (
        <div 
          className="fixed bottom-4 right-4 z-[9999]"
          style={{
            position: 'fixed',
            zIndex: 2147483647, // Maximum z-index for always-on-top
            pointerEvents: 'auto'
          }}
        >
          <Card className="w-80 shadow-2xl border-2 border-blue-200 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                  <Timer className="w-4 h-4 text-blue-600" />
                  <span className="truncate max-w-48">{currentTask}</span>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFloatingMinimized(!isFloatingMinimized)}
                    className="h-6 w-6 p-0"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStop}
                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {!isFloatingMinimized && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-blue-600">{formatTime(timeLeft)}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Math.floor(((totalTime - timeLeft) / totalTime) * 100)}% complete
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isRunning ? handlePause : handleStart}
                      className="border-blue-300 hover:bg-blue-50"
                    >
                      {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStop}
                      className="border-red-300 hover:bg-red-50 text-red-600"
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
              onClick={() => {
                stopAlarm();
                setShowCompleteDialog(false);
              }}
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