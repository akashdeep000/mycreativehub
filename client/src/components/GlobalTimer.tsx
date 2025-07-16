import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, X, Play, Pause, Square, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GlobalTimerProps {
  isVisible: boolean;
  onClose: () => void;
  timeLeft: number;
  totalTime: number;
  currentTask: string;
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onComplete: () => void;
}

export default function GlobalTimer({
  isVisible,
  onClose,
  timeLeft,
  totalTime,
  currentTask,
  isRunning,
  onPause,
  onResume,
  onStop,
  onComplete
}: GlobalTimerProps) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Initialize audio context and notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Request notification permission
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
      
      // Initialize audio context
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.log("Audio context not supported");
      }
    }
  }, []);

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && totalTime > 0 && currentTask && isVisible) {
      console.log("Timer completed - triggering completion");
      setShowCompleteDialog(true);
      playAlarmSound();
      showNotification();
      onComplete();
    }
  }, [timeLeft, totalTime, currentTask, isVisible, onComplete]);

  const playAlarmSound = useCallback(() => {
    console.log("=== TIMER ALARM TRIGGERED ===");
    
    const playDigitalChime = async () => {
      try {
        // Create or get audio context
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioContext = audioContextRef.current;
        console.log("Audio context state:", audioContext.state);
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          console.log("Resuming suspended audio context");
          await audioContext.resume();
        }
        
        // Create digital chime sound function
        const createChime = (frequency: number, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(frequency, startTime);
          
          // Volume envelope - soft fade in and out
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        // Play 5 chimes with 800Hz frequency
        const now = audioContext.currentTime;
        console.log("Playing 5 digital chimes at 800Hz");
        for (let i = 0; i < 5; i++) {
          createChime(800, now + i * 0.8, 0.6);
        }
        
        console.log("Digital chime sequence started successfully");
        
      } catch (error) {
        console.log("Web Audio API failed, trying fallback:", error);
        playFallbackAlarm();
      }
    };
    
    const playFallbackAlarm = () => {
      try {
        // Create a simple beep sound as fallback
        const beepSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+L2xnkpBSl+zPLZgTIGJHzU9U3fOgzZjnLZPNKcEYLmIZAFNGjPCZ3rUgQNBCJVKKUJkEFhIOKQBJZaSA6zWVbRTgpEBQSGPCqGKTARFAFKjAQBELUYz1a2b1bR3+7XW1vD0ZpHCBJMCDhEAIvAAgOBfBCoGGWGtRjyXHvs9YTIiEIAI1gGDgQAQ4YrAXRLCAIgpQP/');
        beepSound.volume = 0.3;
        
        // Play the beep 5 times
        let playCount = 0;
        const playBeep = () => {
          if (playCount < 5) {
            beepSound.currentTime = 0;
            beepSound.play().then(() => {
              playCount++;
              console.log(`Fallback beep ${playCount}/5 played`);
              setTimeout(playBeep, 800);
            }).catch(err => {
              console.log("Fallback beep failed:", err);
            });
          }
        };
        
        playBeep();
        
      } catch (fallbackError) {
        console.log("All audio methods failed:", fallbackError);
      }
    };
    
    // Start the alarm
    playDigitalChime();
    
  }, []);

  const showNotification = useCallback(() => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const notification = new Notification('Timer Complete!', {
        body: `"${currentTask}" session finished`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'timer-complete',
        requireInteraction: true
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto-close after 30 seconds
      notificationTimeoutRef.current = setTimeout(() => {
        notification.close();
      }, 30000);
    }
  }, [currentTask, notificationPermission]);

  const logFocusMutation = useMutation({
    mutationFn: async (data: { minutes: number; taskDescription: string }) => {
      return await apiRequest("/api/focus/log", {
        method: "POST",
        body: {
          minutes: data.minutes,
          sessionType: "focus",
          taskDescription: data.taskDescription
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const handleMarkComplete = () => {
    const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (completedMinutes > 0) {
      logFocusMutation.mutate({ 
        minutes: completedMinutes, 
        taskDescription: currentTask 
      });
    }
    
    stopAlarm();
    setShowCompleteDialog(false);
    onStop();
    
    toast({
      title: "Task Completed!",
      description: "Great work! Your progress has been logged.",
    });
  };

  const stopAlarm = () => {
    // Stop any audio oscillators or alarm sounds
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleStopAlarm = () => {
    stopAlarm();
    setShowCompleteDialog(false);
    onStop();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Timer */}
      <div className={`fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-300 ${
        isMinimized ? 'p-2 min-w-[160px]' : 'p-4 min-w-[280px]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-sm">Focus Timer</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {isMinimized ? (
          /* Minimized View */
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
              {formatTime(timeLeft)}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        ) : (
          /* Maximized View */
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {currentTask}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="flex justify-center gap-2">
              {isRunning ? (
                <Button
                  onClick={onPause}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={onResume}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              
              <Button
                onClick={onStop}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Timer Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <p className="text-gray-600 dark:text-gray-400">
              Great work on "<span className="font-medium">{currentTask}</span>"!
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleMarkComplete} className="flex-1">
                Mark Complete
              </Button>
              <Button onClick={handleStopAlarm} variant="outline" className="flex-1">
                Stop Alarm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}