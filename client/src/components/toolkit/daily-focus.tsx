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
import { Edit, Plus, Timer, Play, CheckCircle, Clock, Lightbulb } from "lucide-react";
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

  const today = new Date().toISOString().split('T')[0];

  const { data: tasks = [], isLoading } = useQuery<DailyFocusTask[]>({
    queryKey: ["/api/daily-focus", today],
    retry: false,
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
      await apiRequest("POST", "/api/daily-focus", {
        ...taskData,
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setNewTask({ task: "", priority: "must" });
      setIsAddingTask(false);
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

  const handleTaskToggle = (id: number, completed: boolean) => {
    updateTaskMutation.mutate({ id, completed });
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

  const priorityConfig = {
    must: { 
      label: "Must Do Today", 
      icon: CheckCircle,
      bgColor: "bg-[#ffd4cb]", 
      borderColor: "border-[#ffd4cb]",
      textColor: "text-gray-700",
      iconColor: "text-gray-600",
      checkboxColor: "data-[state=checked]:bg-[#ea580c] data-[state=checked]:border-[#ea580c]",
      badgeBg: "bg-[#f46454]",
      badgeText: "text-white"
    },
    should: { 
      label: "Should Do", 
      icon: Clock,
      bgColor: "bg-[#fff7e5]", 
      borderColor: "border-[#fff7e5]",
      textColor: "text-gray-700",
      iconColor: "text-gray-600",
      checkboxColor: "data-[state=checked]:bg-[#b45309] data-[state=checked]:border-[#b45309]",
      badgeBg: "bg-[#d97706]",
      badgeText: "text-white"
    },
    could: { 
      label: "Could Do", 
      icon: Lightbulb,
      bgColor: "bg-[#b9e6e0]", 
      borderColor: "border-[#b9e6e0]",
      textColor: "text-gray-700",
      iconColor: "text-gray-600",
      checkboxColor: "data-[state=checked]:bg-[#047857] data-[state=checked]:border-[#047857]",
      badgeBg: "bg-[#047857]",
      badgeText: "text-white"
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
      {/* Header with action buttons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-serif font-semibold text-gray-800">Today's Focus</h2>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Timer className="w-4 h-4 mr-1" />
                Focus
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <FocusTimer onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
              }} />
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsAddingTask(true)}
            className="text-pink-600 border-pink-200 hover:bg-pink-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Add task form */}
        {isAddingTask && (
          <div className="mb-6 p-4 bg-pink-50 rounded-lg">
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Enter new task..."
                value={newTask.task}
                onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
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

      {/* White container with three task cards */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(priorityConfig) as [keyof typeof priorityConfig, typeof priorityConfig[keyof typeof priorityConfig]][]).map(([priority, config]) => (
            <Card 
              key={priority} 
              className={`${config.bgColor} ${config.borderColor} border-2 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1`}
            >
            <CardHeader className="pb-3">
              <div className="flex justify-center">
                <div className={`${config.badgeBg} ${config.badgeText} px-4 py-2 rounded-full shadow-sm flex items-center space-x-2 font-bold text-sm`}>
                  <config.icon className={`w-4 h-4`} />
                  <span>{config.label}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {tasksByPriority[priority].length > 0 ? (
                  tasksByPriority[priority].map((task) => (
                    <div key={task.id} className="flex items-center space-x-3">
                      <Checkbox
                        checked={Boolean(task.completed)}
                        onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                        className={config.checkboxColor}
                      />
                      <span className={`text-gray-700 ${task.completed ? 'line-through text-gray-500' : ''} text-sm`}>
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
                  ))
                ) : (
                  <p className="text-gray-400 text-sm italic py-4 text-center">
                    No {priority === 'must' ? 'must do' : priority === 'should' ? 'should do' : 'could do'} tasks yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
