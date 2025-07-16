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
    must: tasks?.filter?.((task: DailyFocusTask) => task.priority === "must") || [],
    should: tasks?.filter?.((task: DailyFocusTask) => task.priority === "should") || [],
    could: tasks?.filter?.((task: DailyFocusTask) => task.priority === "could") || [],
  };

  console.log('Tasks by priority:', tasksByPriority);

  const addTaskMutation = useMutation({
    mutationFn: async ({ task, priority }: { task: string; priority: "must" | "should" | "could" }) => {
      console.log('Creating task:', { task, priority });
      const response = await apiRequest("/api/daily-focus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    onMutate: async ({ task, priority }) => {
      // Cancel any outgoing refetches to prevent optimistic updates from being overwritten
      await queryClient.cancelQueries({ queryKey: ["/api/daily-focus", today] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/daily-focus", today]);
      
      // Optimistically update with new task
      const optimisticTask = {
        id: Date.now(), // temporary ID
        task,
        priority,
        completed: false,
        date: new Date().toISOString(),
        userId: "temp",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      queryClient.setQueryData(["/api/daily-focus", today], (old: any) => {
        return old ? [...old, optimisticTask] : [optimisticTask];
      });
      
      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      console.error('Error creating task:', error);
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/daily-focus", today], context.previousTasks);
      }
      
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
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      await apiRequest(`/api/daily-focus/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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

  const clearPriorityTasksMutation = useMutation({
    mutationFn: async (priority: "must" | "should" | "could") => {
      // Get all tasks for this priority
      const tasksToDelete = tasksByPriority[priority];
      
      // Delete each task individually
      for (const task of tasksToDelete) {
        await apiRequest(`/api/daily-focus/${task.id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    },
    onSuccess: (_, priority) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Success",
        description: `${priority === "must" ? "Must do" : priority === "should" ? "Should do" : "Could do"} tasks cleared successfully`,
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
        description: "Failed to clear tasks",
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

  const handleClearPriorityTasks = (priority: "must" | "should" | "could") => {
    clearPriorityTasksMutation.mutate(priority);
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest(`/api/daily-focus/${taskId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/daily-focus", today] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/daily-focus", today]);

      // Optimistically update to remove the task
      queryClient.setQueryData(["/api/daily-focus", today], (old: any) => {
        if (!old) return old;
        return old.filter((task: any) => task.id !== taskId);
      });

      // Return a context with the previous data
      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      // If the mutation fails, use the context to roll back
      queryClient.setQueryData(["/api/daily-focus", today], context?.previousTasks);
      
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
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus", today] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
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

  // Handle error by showing empty task lists instead of error state
  if (error) {
    console.error("Error loading tasks:", error);
    // Don't return error state, let the component render normally with empty tasks
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
                <span className={`flex-1 ${task.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                  {task.task}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 text-lg font-bold leading-none ml-2"
                  disabled={deleteTaskMutation.isPending}
                  title="Delete task"
                >
                  ×
                </button>
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
            {tasksByPriority.must.length > 0 && (
              <button
                onClick={() => handleClearPriorityTasks("must")}
                className="text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
                disabled={clearPriorityTasksMutation.isPending}
              >
                Clear List
              </button>
            )}
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
                <span className={`flex-1 ${task.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                  {task.task}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 text-lg font-bold leading-none ml-2"
                  disabled={deleteTaskMutation.isPending}
                  title="Delete task"
                >
                  ×
                </button>
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
            {tasksByPriority.should.length > 0 && (
              <button
                onClick={() => handleClearPriorityTasks("should")}
                className="text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
                disabled={clearPriorityTasksMutation.isPending}
              >
                Clear List
              </button>
            )}
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
                <span className={`flex-1 ${task.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                  {task.task}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 text-lg font-bold leading-none ml-2"
                  disabled={deleteTaskMutation.isPending}
                  title="Delete task"
                >
                  ×
                </button>
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
            {tasksByPriority.could.length > 0 && (
              <button
                onClick={() => handleClearPriorityTasks("could")}
                className="text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
                disabled={clearPriorityTasksMutation.isPending}
              >
                Clear List
              </button>
            )}
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