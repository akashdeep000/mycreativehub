import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit, Plus, Timer, Play, CheckCircle, Clock, Lightbulb, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import FocusTimer from "./focus-timer";
import type { DailyFocusTask } from "@shared/schema";

export default function DailyFocus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newTask, setNewTask] = useState({ task: "", priority: "must" });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [inlineInputs, setInlineInputs] = useState<{[key: string]: string}>({});
  const [showInputs, setShowInputs] = useState<{[key: string]: boolean}>({});

  const today = new Date().toISOString().split('T')[0];

  const { data: tasks = [], isLoading } = useQuery<DailyFocusTask[]>({
    queryKey: ["/api/daily-focus", today],
    retry: false,
    onSuccess: (data) => {
      console.log('Tasks fetched from API:', data);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      await apiRequest("PATCH", `/api/daily-focus/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: { task: string; priority: string }) => {
      console.log('Mutation function called with:', taskData);
      await apiRequest("POST", "/api/daily-focus", {
        ...taskData,
        date: new Date().toISOString(),
      });
      console.log('API request completed successfully');
      return taskData; // Return the task data for use in onSuccess
    },
    onSuccess: (taskData) => {
      console.log('Mutation onSuccess called with:', taskData);
      // Force refetch of tasks instead of just invalidating
      queryClient.refetchQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setNewTask({ task: "", priority: "must" });
      setIsAddingTask(false);
      // Clear the specific inline input for this priority
      console.log('Clearing input for priority:', taskData.priority);
      setInlineInputs(prev => ({ ...prev, [taskData.priority]: "" }));
      // Show success message
      toast({
        title: "Task added!",
        description: `Added "${taskData.task}" to your ${taskData.priority} do list`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    },
  });

  const clearDailyTasksMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/daily-focus/${today}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Success",
        description: "Daily checklist cleared successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to clear daily checklist",
        variant: "destructive",
      });
    },
  });

  const handleTaskToggle = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, completed });
  };

  const handleInlineTaskSubmit = (priority: string, task: string) => {
    console.log('handleInlineTaskSubmit called with:', { priority, task });
    if (task.trim()) {
      console.log('Task is valid, calling mutation...');
      addTaskMutation.mutate({ 
        task: task.trim(), 
        priority: priority as "must" | "should" | "could" 
      });
      // Don't clear the input here - let the mutation's onSuccess handle it
    } else {
      console.log('Task is empty, not submitting');
    }
  };

  const handleInputChange = (priority: string, value: string) => {
    setInlineInputs(prev => ({ ...prev, [priority]: value }));
  };

  const handleAddTask = () => {
    if (newTask.task.trim()) {
      addTaskMutation.mutate(newTask);
    }
  };

  const tasksByPriority = {
    must: tasks.filter(t => t.priority === "must"),
    should: tasks.filter(t => t.priority === "should"),
    could: tasks.filter(t => t.priority === "could"),
  };
  
  console.log('Current tasks:', tasks);
  console.log('Tasks by priority:', tasksByPriority);

  const priorityConfig = {
    must: { 
      label: "Must Do Today", 
      icon: CheckCircle,
      bgColor: "bg-white", 
      borderColor: "border-t-[#ff2e23]",
      textColor: "text-black",
      iconColor: "text-[#ff2e23]",
      checkboxColor: "data-[state=checked]:bg-[#ff2e23] data-[state=checked]:border-[#ff2e23]",
      placeholder: "+ Add a task"
    },
    should: { 
      label: "Should Do", 
      icon: Clock,
      bgColor: "bg-white", 
      borderColor: "border-t-[#3cd473]",
      textColor: "text-black",
      iconColor: "text-[#3cd473]",
      checkboxColor: "data-[state=checked]:bg-[#3cd473] data-[state=checked]:border-[#3cd473]",
      placeholder: "+ Add a task"
    },
    could: { 
      label: "Could Do", 
      icon: Lightbulb,
      bgColor: "bg-white", 
      borderColor: "border-t-[#f97f25]",
      textColor: "text-black",
      iconColor: "text-[#f97f25]",
      checkboxColor: "data-[state=checked]:bg-[#f97f25] data-[state=checked]:border-[#f97f25]",
      placeholder: "+ Add a task"
    }
  };

  if (isLoading) {
    return (
      <Card className="border-pink-100">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-6">
      {/* Simple header */}
      <div className="mb-4">
        <h2 className="text-2xl font-serif font-semibold text-gray-800">Today's Focus</h2>
      </div>

      {/* Add task form */}
        {isAddingTask && (
          <div className="mb-6 p-4 bg-pink-50 rounded-lg">
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Enter new task..."
                value={newTask.task}
                onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTask.task.trim()) {
                      handleAddTask();
                    }
                  }
                }}
              />
              <div className="flex gap-2">
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="must">Must Do</option>
                  <option value="should">Should Do</option>
                  <option value="could">Could Do</option>
                </select>
                <Button size="sm" onClick={handleAddTask} disabled={addTaskMutation.isPending}>
                  Add Task
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingTask(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* Soft background container with three task cards */}
      <div className="bg-pink-50 rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(priorityConfig) as [keyof typeof priorityConfig, typeof priorityConfig[keyof typeof priorityConfig]][]).map(([priority, config]) => (
            <Card 
              key={priority} 
              className={`${config.bgColor} ${config.borderColor} border-t-4 shadow-xl rounded-lg`}
            >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <config.icon className={`w-5 h-5 ${config.iconColor}`} />
                <span className="text-sm font-bold text-black">
                  {config.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Existing tasks */}
                {tasksByPriority[priority].map((task) => (
                  <div key={task.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={Boolean(task.completed)}
                      onChange={(e) => handleTaskToggle(task.id, e.target.checked)}
                      className="w-4 h-4 cursor-pointer rounded border-gray-300 focus:ring-2 focus:ring-offset-2"
                      style={{
                        accentColor: priority === 'must' ? '#ff2e23' : priority === 'should' ? '#3cd473' : '#f97f25',
                        pointerEvents: 'auto',
                        zIndex: 10
                      }}
                    />
                    <span className={`${config.textColor} ${task.completed ? 'line-through opacity-70' : ''} text-sm flex-1 cursor-pointer`}
                          onClick={() => handleTaskToggle(task.id, !task.completed)}>
                      {task.task}
                    </span>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* TODO: Add delete functionality */}}
                        className="ml-auto text-red-500 hover:text-red-700 p-1 h-auto"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}

                {/* Inline task input */}
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 flex items-center justify-center">
                    {inlineInputs[priority] ? (
                      <div className="w-3 h-3 border border-gray-300 rounded opacity-50"></div>
                    ) : (
                      <Edit3 className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={config.placeholder}
                    value={inlineInputs[priority] || ""}
                    onChange={(e) => handleInputChange(priority, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const task = inlineInputs[priority] || "";
                        console.log('Enter pressed, task:', task, 'priority:', priority);
                        if (task.trim()) {
                          console.log('Submitting task:', task.trim());
                          handleInlineTaskSubmit(priority, task);
                        }
                      }
                    }}
                    className="flex-1 p-2 text-sm border-none bg-transparent text-black placeholder-gray-500 italic focus:outline-none focus:ring-0 focus:not-italic focus:border-b-2 focus:border-gray-300 border-b border-transparent transition-all"
                  />
                </div>

                {/* Add more button - shown only when there are tasks */}
                {tasksByPriority[priority].length > 0 && showInputs[priority] && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInputs(prev => ({ ...prev, [priority]: true }))}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add another task
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
        
        {/* Clear Today's Checklist Button */}
        {(tasks.length > 0) && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to clear today\'s checklist? This will remove all tasks but keep your completion stats.')) {
                  clearDailyTasksMutation.mutate();
                }
              }}
              disabled={clearDailyTasksMutation.isPending}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 hover:border-red-400 text-sm"
            >
              {clearDailyTasksMutation.isPending ? 'Clearing...' : 'Clear Today\'s Checklist'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
