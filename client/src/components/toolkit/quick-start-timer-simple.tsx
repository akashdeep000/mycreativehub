import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Play, Timer, Clock } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";

export default function QuickStartTimer() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isRunning, timeLeft, totalTime, currentTask, isVisible, startTimer } = useTimer();
  
  const [task, setTask] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState("25");
  const [customTime, setCustomTime] = useState({ hours: 0, minutes: 25 });
  const [showCustomInput, setShowCustomInput] = useState(false);

  const timerOptions = [
    { value: "10", label: "10 min" },
    { value: "20", label: "20 min" },
    { value: "25", label: "25 min" },
    { value: "30", label: "30 min" },
    { value: "45", label: "45 min" },
    { value: "60", label: "60 min" },
    { value: "custom", label: "Custom Time" },
  ];

  const handleStart = () => {
    if (!task.trim()) {
      toast({
        title: "Task Required",
        description: "Please enter a task description.",
        variant: "destructive",
      });
      return;
    }

    let minutes: number;
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
    startTimer(task, seconds);
    setTask("");
    
    toast({
      title: "Timer Started",
      description: `Focus session started for ${minutes} minutes`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="size-10 aspect-square shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 !rounded-lg flex items-center justify-center"
              data-testid="quick-timer-icon-SQUARE"
            >
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Focus Timer</CardTitle>
              <CardDescription>
                Use this timer to focus on one task at a time. Working within a set time frame boosts productivity and helps you actually finish the task.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            Popular
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show current timer status if running */}
        {isVisible && isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Timer Running</span>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-900">
                {formatTime(timeLeft)}
              </div>
            </div>
            <div className="text-sm text-blue-700 mb-3 truncate">
              {currentTask}
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-blue-600 mt-2">
              Timer continues running across all pages
            </div>
          </div>
        )}

        {/* Timer setup form - hidden when timer is running */}
        {!isRunning && (
          <>
            <div className="space-y-2">
              <label htmlFor="task" className="text-sm font-medium">
                What are you working on?
              </label>
              <Input
                id="task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g., Write blog post, Review designs..."
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="duration" className="text-sm font-medium">
                Duration
              </label>
              <Select value={selectedMinutes} onValueChange={(value) => {
                setSelectedMinutes(value);
                setShowCustomInput(value === "custom");
              }}>
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor="hours" className="text-sm text-gray-600">
                    Hours
                  </label>
                  <Input
                    id="hours"
                    type="number"
                    min="0"
                    max="23"
                    value={customTime.hours}
                    onChange={(e) =>
                      setCustomTime({ ...customTime, hours: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="minutes" className="text-sm text-gray-600">
                    Minutes
                  </label>
                  <Input
                    id="minutes"
                    type="number"
                    min="1"
                    max="59"
                    value={customTime.minutes}
                    onChange={(e) =>
                      setCustomTime({ ...customTime, minutes: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleStart}
              className="w-full"
              disabled={!task.trim()}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Focus Session
            </Button>
            
            <div className="text-xs text-gray-600 mt-2">
              <strong>Note:</strong> The floating timer will stay visible as you navigate the portal. If the dashboard is minimised, the timer will continue running and the sound alarm will play when time is up.
            </div>
          </>
        )}


      </CardContent>
    </Card>
  );
}