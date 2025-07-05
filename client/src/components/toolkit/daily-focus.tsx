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
import { Edit, Plus, Timer, Play } from "lucide-react";
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
    must: { color: "red", label: "MUST DO" },
    should: { color: "yellow", label: "SHOULD DO" },
    could: { color: "green", label: "COULD DO" },
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
    <Card className="border-pink-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif">Today's Focus</CardTitle>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Timer className="w-4 h-4 mr-1" />
                  Focus
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <FocusTimer onComplete={() => {
                  // Refresh stats after focus session
                  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                }} />
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsAddingTask(true)}
              className="text-pink-600 hover:text-pink-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-pink-600 hover:text-pink-700"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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

        <div className="space-y-6">
          {(Object.entries(priorityConfig) as [keyof typeof priorityConfig, typeof priorityConfig[keyof typeof priorityConfig]][]).map(([priority, config]) => (
            <div key={priority}>
              <h4 className={`text-sm font-semibold text-${config.color}-600 mb-3 flex items-center`}>
                <div className={`w-3 h-3 bg-${config.color}-500 rounded-full mr-2`}></div>
                {config.label}
              </h4>
              <div className="space-y-2">
                {tasksByPriority[priority].length > 0 ? (
                  tasksByPriority[priority].map((task) => (
                    <div key={task.id} className="flex items-center space-x-3">
                      <Checkbox
                        checked={Boolean(task.completed)}
                        onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                        className={`data-[state=checked]:bg-${config.color}-500 data-[state=checked]:border-${config.color}-500`}
                      />
                      <span className={`text-gray-700 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.task}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm italic">No {priority} tasks yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
