import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FocusTimerProps {
  onComplete?: () => void;
}

export default function FocusTimer({ onComplete }: FocusTimerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [sessionType, setSessionType] = useState<"focus" | "break">("focus");

  // Log focus session mutation
  const logFocusMutation = useMutation({
    mutationFn: async ({ minutes, type }: { minutes: number; type: string }) => {
      const response = await fetch("/api/focus/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minutes, sessionType: type }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to log focus session");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate stats to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      
      toast({
        title: "Focus session completed!",
        description: `Great work! Your stats have been updated.`,
      });
      
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log focus session",
        variant: "destructive",
      });
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

  const handleSessionComplete = () => {
    const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
    if (completedMinutes > 0) {
      logFocusMutation.mutate({ 
        minutes: completedMinutes, 
        type: sessionType 
      });
    }

    toast({
      title: `${sessionType === "focus" ? "Focus" : "Break"} session complete!`,
      description: `You completed ${completedMinutes} minutes of ${sessionType} time.`,
    });
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    if (timeLeft < totalTime) {
      const completedMinutes = Math.floor((totalTime - timeLeft) / 60);
      if (completedMinutes > 0) {
        logFocusMutation.mutate({ 
          minutes: completedMinutes, 
          type: sessionType 
        });
      }
    }
    
    setIsRunning(false);
    setTimeLeft(totalTime);
  };

  const handlePresetChange = (minutes: number, type: "focus" | "break") => {
    if (!isRunning) {
      const seconds = minutes * 60;
      setTimeLeft(seconds);
      setTotalTime(seconds);
      setSessionType(type);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Timer className="w-5 h-5" />
          Focus Timer
        </CardTitle>
        <CardDescription>
          Stay focused and track your productivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time Display */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-gray-800 mb-2">
            {formatTime(timeLeft)}
          </div>
          <Progress value={progress} className="w-full h-3" />
        </div>

        {/* Session Type Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={sessionType === "focus" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange(25, "focus")}
            disabled={isRunning}
            className={sessionType === "focus" ? "bg-[#f46454] hover:bg-[#e53e3e]" : ""}
          >
            Focus (25min)
          </Button>
          <Button
            variant={sessionType === "break" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange(5, "break")}
            disabled={isRunning}
            className={sessionType === "break" ? "bg-[#b9e6e0] hover:bg-[#a0d3cc] text-gray-800" : ""}
          >
            Break (5min)
          </Button>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-2">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534]"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              size="lg"
              variant="outline"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          
          <Button
            onClick={handleStop}
            size="lg"
            variant="outline"
            disabled={timeLeft === totalTime}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>

        {/* Current Session Info */}
        <div className="text-center text-sm text-gray-600">
          Current: {sessionType === "focus" ? "Focus Session" : "Break Time"}
        </div>
      </CardContent>
    </Card>
  );
}