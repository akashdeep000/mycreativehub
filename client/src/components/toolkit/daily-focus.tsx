import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Edit2, Target } from "lucide-react";

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
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  
  // State for handling composition events and preventing duplicate saves
  const [isComposing, setIsComposing] = useState(false);
  const [savingStates, setSavingStates] = useState({
    must: false,
    should: false,
    could: false,
  });
  const [lastSavedValues, setLastSavedValues] = useState({
    must: "",
    should: "",
    could: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/daily-focus"],
    queryFn: async () => {
      console.log('Fetching all daily focus tasks for user');
      const response = await apiRequest(`/api/daily-focus`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      console.log('Tasks fetched from API:', data);
      console.log('Response type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      // Force return as array - the backend returns an array but React Query might be caching {}
      if (Array.isArray(data)) {
        return data;
      } else {
        console.warn('API returned non-array response:', data);
        return [];
      }
    },
    // Normal caching behavior since tasks persist
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
      const data = await response.json();
      console.log('Task created:', data);
      return data;
    },
    onMutate: async ({ task, priority }) => {
      // Cancel any outgoing refetches to prevent optimistic updates from being overwritten
      await queryClient.cancelQueries({ queryKey: ["/api/daily-focus"] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/daily-focus"]);
      
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
      
      queryClient.setQueryData(["/api/daily-focus"], (old: any) => {
        return old ? [...old, optimisticTask] : [optimisticTask];
      });
      
      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      console.error('Error creating task:', error);
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/daily-focus"], context.previousTasks);
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
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      console.log('Updating task:', { id, completed });
      const response = await apiRequest(`/api/daily-focus/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
      });
      const data = await response.json();
      console.log('Task updated successfully:', data);
      return data;
    },
    onMutate: async ({ id, completed }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/daily-focus"] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/daily-focus"]);

      // Optimistically update the task
      queryClient.setQueryData(["/api/daily-focus"], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === id ? { ...task, completed } : task
        );
      });

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/daily-focus"], context.previousTasks);
      }
      
      console.error('Error updating task:', error);
      console.error('Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        tokenExists: !!localStorage.getItem('token'),
        tokenLength: localStorage.getItem('token')?.length || 0
      });
      
      if (isUnauthorizedError(error)) {
        console.log('Detected unauthorized error - redirecting to login');
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
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
    },
  });

  const clearDailyTasksMutation = useMutation({
    mutationFn: async () => {
      console.log('Clearing all daily tasks');
      const response = await apiRequest(`/api/daily-focus/clear-all`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      console.log('All daily tasks cleared successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      queryClient.refetchQueries({ queryKey: ["/api/daily-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Success",
        description: "All daily tasks cleared successfully",
      });
    },
    onError: (error) => {
      console.error('Error clearing daily tasks:', error);
      console.error('Clear daily tasks error details:', {
        message: error?.message,
        name: error?.name,
        tokenExists: !!localStorage.getItem('token'),
        tokenLength: localStorage.getItem('token')?.length || 0,

      });
      
      if (isUnauthorizedError(error)) {
        console.log('Detected unauthorized error during clear - redirecting to login');
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
      console.log(`Clearing ${priority} tasks:`, tasksToDelete);
      
      // Delete each task individually with error handling
      const deleteResults = await Promise.allSettled(
        tasksToDelete.map(async (task) => {
          console.log(`Deleting ${priority} task:`, task.id);
          try {
            const response = await apiRequest(`/api/daily-focus/${task.id}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
            });
            
            if (!response.ok) {
              if (response.status === 404) {
                console.log(`Task ${task.id} already deleted, skipping`);
                return { success: true, taskId: task.id };
              }
              throw new Error(`Failed to delete task ${task.id}: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Task ${task.id} deleted:`, data);
            return { success: true, taskId: task.id };
          } catch (error) {
            console.error(`Error deleting task ${task.id}:`, error);
            return { success: false, taskId: task.id, error };
          }
        })
      );
      
      const successCount = deleteResults.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      console.log(`${successCount} out of ${tasksToDelete.length} ${priority} tasks cleared successfully`);
      return { deletedCount: successCount };
    },
    onSuccess: (_, priority) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({
        title: "Success",
        description: `${priority === "must" ? "Must do" : priority === "should" ? "Should do" : "Could do"} tasks cleared successfully`,
      });
    },
    onError: (error, priority) => {
      console.error(`Error clearing ${priority} tasks:`, error);
      console.error('Clear priority tasks error details:', {
        priority,
        message: error?.message,
        name: error?.name,
        tokenExists: !!localStorage.getItem('token'),
        tokenLength: localStorage.getItem('token')?.length || 0,
        tasksToDelete: tasksByPriority[priority]?.length || 0
      });
      
      if (isUnauthorizedError(error)) {
        console.log('Detected unauthorized error during priority clear - redirecting to login');
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

  // Enhanced function to save a task with duplicate prevention
  const saveTaskIfValid = async (priority: "must" | "should" | "could", source: "enter" | "blur" = "blur") => {
    const task = taskInputs[priority].trim();
    
    // Don't save if already saving, empty, or unchanged from last successful save
    if (savingStates[priority] || !task || task === lastSavedValues[priority]) {
      return;
    }

    // Don't save during composition (IME input)
    if (isComposing && source === "enter") {
      return;
    }

    // Set saving state to prevent duplicates
    setSavingStates(prev => ({ ...prev, [priority]: true }));
    
    try {
      console.log(`Saving task via ${source}:`, task, 'priority:', priority);
      
      // Add the task
      await addTaskMutation.mutateAsync({ task, priority });
      
      // Clear input only after successful save
      setTaskInputs(prev => ({ ...prev, [priority]: "" }));
      
      // Reset lastSavedValues after clearing input to allow new entries
      setLastSavedValues(prev => ({ ...prev, [priority]: "" }));
      
      // Show success feedback
      toast({ 
        title: "Task added ✓", 
        description: `Added to ${priority === "must" ? "Must Do" : priority === "should" ? "Should Do" : "Could Do"}`,
        duration: 2000 
      });
      
    } catch (error) {
      console.error('Error saving task:', error);
      // Error is already handled by the mutation
    } finally {
      // Reset saving state
      setSavingStates(prev => ({ ...prev, [priority]: false }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, priority: "must" | "should" | "could") => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Use the enhanced save function that prevents duplicates
      saveTaskIfValid(priority, "enter");
    }
  };

  // Handle blur events for saving tasks when clicking away
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, priority: "must" | "should" | "could") => {
    // Don't save during composition
    if (isComposing) {
      return;
    }
    
    // Add a delay to allow for potential Enter key press to complete first
    setTimeout(() => {
      // Check again if we're still not saving to avoid race conditions
      if (!savingStates[priority]) {
        saveTaskIfValid(priority, "blur");
      }
    }, 100);
  };

  // Handle composition events for IME input (Chinese, Japanese, Korean, etc.)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Remove autosave on unmount to prevent infinite loops
  // The blur functionality handles saving when users navigate away

  const handleClearDailyTasks = () => {
    clearDailyTasksMutation.mutate();
    setShowClearConfirmation(false);
  };

  const handleClearPriorityTasks = (priority: "must" | "should" | "could") => {
    clearPriorityTasksMutation.mutate(priority);
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      console.log('Deleting task:', taskId);
      const response = await apiRequest(`/api/daily-focus/${taskId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      console.log('Task deleted successfully:', data);
      return data;
    },
    onMutate: async (taskId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/daily-focus"] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/daily-focus"]);

      // Optimistically update to remove the task
      queryClient.setQueryData(["/api/daily-focus"], (old: any) => {
        if (!old) return old;
        return old.filter((task: any) => task.id !== taskId);
      });

      // Return a context with the previous data
      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      // If the mutation fails, use the context to roll back
      queryClient.setQueryData(["/api/daily-focus"], context?.previousTasks);
      
      console.error('Error deleting task:', error);
      console.error('Delete error details:', {
        taskId,
        message: error?.message,
        name: error?.name,
        tokenExists: !!localStorage.getItem('token'),
        tokenLength: localStorage.getItem('token')?.length || 0
      });
      
      if (isUnauthorizedError(error)) {
        console.log('Detected unauthorized error during delete - redirecting to login');
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
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    },
  });

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const editTaskMutation = useMutation({
    mutationFn: async ({ taskId, newText }: { taskId: number; newText: string }) => {
      console.log('Editing task:', taskId, 'with text:', newText);
      const response = await apiRequest(`/api/daily-focus/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task: newText }),
      });
      const data = await response.json();
      console.log('Task edited successfully:', data);
      return data;
    },
    onMutate: async ({ taskId, newText }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/daily-focus"] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(["/api/daily-focus"]);

      // Optimistically update the task
      queryClient.setQueryData(["/api/daily-focus"], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === taskId ? { ...task, task: newText } : task
        );
      });

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
      setEditingTaskId(null);
      setEditingTaskText("");
    },
    onError: (error, { taskId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/daily-focus"], context.previousTasks);
      }
      
      console.error('Error editing task:', error);
      
      if (isUnauthorizedError(error)) {
        console.log('Detected unauthorized error - redirecting to login');
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
        description: "Failed to edit task",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/daily-focus"] });
    },
  });

  const handleEditTask = (taskId: number, currentText: string) => {
    setEditingTaskId(taskId);
    setEditingTaskText(currentText);
  };

  const handleSaveEdit = (taskId: number) => {
    if (editingTaskText.trim()) {
      editTaskMutation.mutate({ taskId, newText: editingTaskText.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText("");
  };

  const handleEditBlur = (e: React.FocusEvent, taskId: number) => {
    // Don't cancel edit if clicking on edit or delete button
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (relatedTarget.closest('button') || relatedTarget.tagName === 'BUTTON')) {
      return;
    }
    handleCancelEdit();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, taskId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit(taskId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
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
      {/* Title and Pro Tip Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-gray-800">Today's Focus</h2>
        </div>
        <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-medium">Pro Tip:</span> Set yourself up for success! Add your tasks the night before so you can start your workday with clarity.
        </p>
      </div>

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
                {editingTaskId === task.id ? (
                  <Input
                    value={editingTaskText}
                    onChange={(e) => setEditingTaskText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                    onBlur={(e) => handleEditBlur(e, task.id)}
                    className="flex-1 border-red-300 focus:border-red-500"
                    autoFocus
                  />
                ) : (
                  <span className={`flex-1 ${task.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                    {task.task}
                  </span>
                )}
                <button
                  onClick={() => handleEditTask(task.id, task.task)}
                  className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1"
                  disabled={editTaskMutation.isPending}
                  title="Edit task"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 text-lg font-bold leading-none"
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
                onBlur={(e) => handleBlur(e, "must")}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
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
                {editingTaskId === task.id ? (
                  <Input
                    value={editingTaskText}
                    onChange={(e) => setEditingTaskText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                    onBlur={(e) => handleEditBlur(e, task.id)}
                    className="flex-1 border-green-300 focus:border-green-500"
                    autoFocus
                  />
                ) : (
                  <span className={`flex-1 ${task.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                    {task.task}
                  </span>
                )}
                <button
                  onClick={() => handleEditTask(task.id, task.task)}
                  className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1"
                  disabled={editTaskMutation.isPending}
                  title="Edit task"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 text-lg font-bold leading-none"
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
                onBlur={(e) => handleBlur(e, "should")}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
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
                {editingTaskId === task.id ? (
                  <Input
                    value={editingTaskText}
                    onChange={(e) => setEditingTaskText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                    onBlur={(e) => handleEditBlur(e, task.id)}
                    className="flex-1 border-yellow-300 focus:border-yellow-500"
                    autoFocus
                  />
                ) : (
                  <span className={`flex-1 ${task.completed ? "line-through text-gray-500" : "text-gray-700"}`}>
                    {task.task}
                  </span>
                )}
                <button
                  onClick={() => handleEditTask(task.id, task.task)}
                  className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-1"
                  disabled={editTaskMutation.isPending}
                  title="Edit task"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 text-lg font-bold leading-none"
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
                onBlur={(e) => handleBlur(e, "could")}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
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