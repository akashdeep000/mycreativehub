import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DailyFocusTask {
  id: number;
  task: string;
  priority: "must" | "should" | "could";
  completed: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface TasksByPriority {
  must: DailyFocusTask[];
  should: DailyFocusTask[];
  could: DailyFocusTask[];
}

function isUnauthorizedError(error: any): boolean {
  return error.status === 401 || error.message?.includes("Unauthorized");
}

export default function DailyFocus() {
  const [taskInputs, setTaskInputs] = useState({
    must: "",
    should: "",
    could: "",
  });
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  console.log('Today date for API calls:', today);

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/daily-focus", today],
    queryFn: async () => {
      console.log('Fetching tasks for date:', today);
      const response = await apiRequest(`/api/daily-focus/${today}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
      });
      console.log('Tasks fetched from API:', response);
      console.log('Response type:', typeof response);
      console.log('Is array:', Array.isArray(response));
      // Force return as array - the backend returns an array but React Query might be caching {}
      if (Array.isArray(response)) {
        return response;
      } else {
        console.warn('API returned non-array response:', response);
        return [];
      }
    },
    // Force refetch on every visit to ensure fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 0, // Don't cache at all
  });

  console.log('Current tasks:', tasks);

  const tasksByPriority: TasksByPriority = {
    must: tasks.filter?.((task: DailyFocusTask) => task.priority === "must") || [],
    should: tasks.filter?.((task: DailyFocusTask) => task.priority === "should") || [],
    could: tasks.filter?.((task: DailyFocusTask) => task.priority === "could") || [],
  };

  console.log('Tasks by priority:', tasksByPriority);

  const addTaskMutation = useMutation({
    mutationFn: async ({ task, priority }: { task: string; priority: "must" | "should" | "could" }) => {
      console.log('Creating task:', { task, priority });
      const response = await apiRequest("/api/daily-focus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          task,
          priority,
          date: new Date().toISOString(),
        }),
      });
      console.log('Task created:', response);
      return response;
    },
    onSuccess: async () => {
      // Clear cache completely and force refetch
      queryClient.removeQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Force immediate refetch
      await refetch();
    },
    onError: (error) => {
      console.error('Error creating task:', error);
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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      await apiRequest(`/api/daily-focus/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ completed }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.refetchQueries({ queryKey: ["/api/daily-focus", today] });
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

  const clearDailyTasksMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/daily-focus/${today}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.refetchQueries({ queryKey: ["/api/daily-focus", today] });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, priority: "must" | "should" | "could") => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const task = taskInputs[priority].trim();
      console.log('Enter pressed, task:', task, 'priority:', priority);
      
      if (task) {
        console.log('Submitting task:', task);
        // Add the task
        addTaskMutation.mutate({ task, priority });
        // Clear the input field immediately
        setTaskInputs(prev => ({ ...prev, [priority]: "" }));
      }
    }
  };

  const handleClearDailyTasks = () => {
    clearDailyTasksMutation.mutate();
    setShowClearConfirmation(false);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <h3 className="font-medium">Must Do Today</h3>
          </div>
          <div className="text-center text-gray-500">Loading...</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="font-medium">Should Do</h3>
          </div>
          <div className="text-center text-gray-500">Loading...</div>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <h3 className="font-medium">Could Do</h3>
          </div>
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center text-red-600">Error loading tasks</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-center text-red-600">Error loading tasks</div>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center text-red-600">Error loading tasks</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Must Do Today Card */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <h3 className="font-medium">Must Do Today</h3>
          </div>
          <div className="space-y-2">
            {tasksByPriority.must.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                />
                <span className={task.completed ? "line-through text-gray-500" : "text-gray-700"}>
                  {task.task}
                </span>
              </div>
            ))}
            <form onSubmit={(e) => e.preventDefault()}>
              <Input
                placeholder="+ Add a task"
                value={taskInputs.must}
                onChange={(e) => setTaskInputs(prev => ({ ...prev, must: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, "must")}
                className="border-red-300 focus:border-red-500"
              />
            </form>
          </div>
        </div>

        {/* Should Do Card */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="font-medium">Should Do</h3>
          </div>
          <div className="space-y-2">
            {tasksByPriority.should.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                />
                <span className={task.completed ? "line-through text-gray-500" : "text-gray-700"}>
                  {task.task}
                </span>
              </div>
            ))}
            <form onSubmit={(e) => e.preventDefault()}>
              <Input
                placeholder="+ Add a task"
                value={taskInputs.should}
                onChange={(e) => setTaskInputs(prev => ({ ...prev, should: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, "should")}
                className="border-green-300 focus:border-green-500"
              />
            </form>
          </div>
        </div>

        {/* Could Do Card */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <h3 className="font-medium">Could Do</h3>
          </div>
          <div className="space-y-2">
            {tasksByPriority.could.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                />
                <span className={task.completed ? "line-through text-gray-500" : "text-gray-700"}>
                  {task.task}
                </span>
              </div>
            ))}
            <form onSubmit={(e) => e.preventDefault()}>
              <Input
                placeholder="+ Add a task"
                value={taskInputs.could}
                onChange={(e) => setTaskInputs(prev => ({ ...prev, could: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, "could")}
                className="border-yellow-300 focus:border-yellow-500"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Clear Today's Checklist?</h3>
            <p className="text-gray-600 mb-6">
              This will remove all tasks from today's checklist. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowClearConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearDailyTasks}
                className="bg-red-500 hover:bg-red-600"
              >
                Clear Checklist
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}