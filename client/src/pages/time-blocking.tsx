import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ArrowLeft, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import UnifiedCalendar from '@/components/calendar/unified-calendar';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { useAuth } from '@/hooks/useAuth';

import { CalendarEntry, ColorKey } from '@/components/calendar/calendar-types';

interface CalendarDay {
  date: number;
  entries: CalendarEntry[];
}

export default function TimeBlocking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventSaveStatus, setEventSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [keySaveStatus, setKeySaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isReady, setIsReady] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Migration Logic
  const { mutate: migrate, isPending: isMigrating } = useMutation({
    mutationFn: async () => {
      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await apiRequest('/api/calendar/migrate', {
        method: 'POST',
        body: JSON.stringify({ timezoneOffset })
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (user) {
        localStorage.setItem(`migration_completed_${user.id}`, 'true');
        setIsReady(true);
        queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
        queryClient.invalidateQueries({ queryKey: ['/api/calendar/keys'] });
        toast({ title: "Migration Complete", description: "Your calendar has been updated." });
      }
    }
  });

  useEffect(() => {
    if (user) {
      const hasMigrated = localStorage.getItem(`migration_completed_${user.id}`);
      if (hasMigrated) {
        setIsReady(true);
      } else {
        migrate();
      }
    }
  }, [user, migrate]);

  // Calculate start and end of month for fetching
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch Color Keys
  const { data: colorKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ['/api/calendar/keys', 'time_blocking'],
    queryFn: async () => {
      const response = await apiRequest('/api/calendar/keys?type=time_blocking');
      return response.json();
    },
    enabled: !!user && isReady
  });

  // Fetch Events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['/api/calendar/events', 'time_blocking', startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: async () => {
      const response = await apiRequest(`/api/calendar/events?type=time_blocking&start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`);
      return response.json();
    },
    enabled: !!user && isReady
  });

  // Fetch Month Goals
  const { data: monthGoalsData, isLoading: isLoadingGoals } = useQuery({
    queryKey: ['/api/calendar/goals', year, month],
    queryFn: async () => {
      const response = await apiRequest(`/api/calendar/goals?year=${year}&month=${month}`);
      return response.json();
    }
  });

  const updateMonthGoalsMutation = useMutation({
    mutationFn: async (goals: string) => {
      const response = await apiRequest('/api/calendar/goals', {
        method: 'POST',
        body: JSON.stringify({ year, month, goals }),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/goals', year, month] });
    }
  });

  // Transform events to days format
  const days: CalendarDay[] = [];
  const daysMap = new Map<number, CalendarEntry[]>();

  if (Array.isArray(events)) {
    events.forEach((event: any) => {
      // Parse date strings to Date objects
      const startTime = new Date(event.startTime);
      const date = startTime.getDate();
      
      if (!daysMap.has(date)) {
        daysMap.set(date, []);
      }
      
      // Map backend event to frontend CalendarEntry with Date objects
      const entry: CalendarEntry = {
        id: event.id,
        userId: event.userId,
        title: event.title,
        description: event.description || '',
        colorKeyId: event.colorKeyId,
        startTime: startTime,
        endTime: new Date(event.endTime),
        isAllDay: event.isAllDay,
        type: event.type,
        completed: event.completed,
        completedAt: event.completedAt ? new Date(event.completedAt) : null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };
      daysMap.get(date)?.push(entry);
    });
  }

  // Convert map to array
  daysMap.forEach((entries, date) => {
    days.push({ date, entries });
  });

  // Mutations
  const queryKey = ['/api/calendar/events', 'time_blocking', startOfMonth.toISOString(), endOfMonth.toISOString()];

  const createEventMutation = useMutation({
    mutationFn: async (event: any) => {
      setEventSaveStatus('saving');
      const response = await apiRequest('/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        // Create optimistic event with temporary ID
        const optimisticEvent = {
          ...newEvent,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Ensure dates are strings for consistency with API response before parsing
          startTime: new Date(newEvent.startTime).toISOString(),
          endTime: new Date(newEvent.endTime).toISOString(),
        };
        return [...old, optimisticEvent];
      });
      
      return { previousEvents };
    },
    onSuccess: () => {
      setEventSaveStatus('saved');
      setTimeout(() => setEventSaveStatus('idle'), 2000);
    },
    onError: (err, newEvent, context) => {
      setEventSaveStatus('idle');
      queryClient.setQueryData(queryKey, context?.previousEvents);
      toast({ title: "Failed to create event", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      setEventSaveStatus('saving');
      const response = await apiRequest(`/api/calendar/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        return old.map(event => {
          if (event.id === id) {
            // Merge updates, handling date conversions
            const updatedEvent = { ...event, ...updates };
            if (updates.startTime) updatedEvent.startTime = new Date(updates.startTime).toISOString();
            if (updates.endTime) updatedEvent.endTime = new Date(updates.endTime).toISOString();
            if (updates.completedAt) updatedEvent.completedAt = new Date(updates.completedAt).toISOString();
            return updatedEvent;
          }
          return event;
        });
      });
      
      return { previousEvents };
    },
    onSuccess: () => {
      setEventSaveStatus('saved');
      setTimeout(() => setEventSaveStatus('idle'), 2000);
    },
    onError: (err, variables, context) => {
      setEventSaveStatus('idle');
      queryClient.setQueryData(queryKey, context?.previousEvents);
      toast({ title: "Failed to update event", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      setEventSaveStatus('saving');
      await apiRequest(`/api/calendar/events/${id}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        return old.filter(event => event.id !== id);
      });
      
      return { previousEvents };
    },
    onSuccess: () => {
      setEventSaveStatus('saved');
      setTimeout(() => setEventSaveStatus('idle'), 2000);
    },
    onError: (err, id, context) => {
      setEventSaveStatus('idle');
      queryClient.setQueryData(queryKey, context?.previousEvents);
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const deleteEventsByRangeMutation = useMutation({
    mutationFn: async ({ start, end }: { start: string, end: string }) => {
      setEventSaveStatus('saving');
      await apiRequest(`/api/calendar/events?type=time_blocking&start=${start}&end=${end}`, {
        method: 'DELETE',
      });
    },
    onMutate: async ({ start, end }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEvents = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any[] = []) => {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        return old.filter(event => {
          const eventStart = new Date(event.startTime).getTime();
          return eventStart < startTime || eventStart > endTime;
        });
      });
      
      return { previousEvents };
    },
    onSuccess: () => {
      setEventSaveStatus('saved');
      setTimeout(() => setEventSaveStatus('idle'), 2000);
      toast({ title: "Events cleared", variant: "default" });
    },
    onError: (err, variables, context) => {
      setEventSaveStatus('idle');
      queryClient.setQueryData(queryKey, context?.previousEvents);
      toast({ title: "Failed to clear events", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const createKeyMutation = useMutation({
    mutationFn: async (key: any) => {
      setKeySaveStatus('saving');
      const response = await apiRequest('/api/calendar/keys', {
        method: 'POST',
        body: JSON.stringify(key),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onMutate: async (newKey) => {
      await queryClient.cancelQueries({ queryKey: ['/api/calendar/keys', 'time_blocking'] });
      const previousKeys = queryClient.getQueryData(['/api/calendar/keys', 'time_blocking']);
      
      queryClient.setQueryData(['/api/calendar/keys', 'time_blocking'], (old: any[] = []) => {
        return [...old, { ...newKey, id: `temp-${Date.now()}` }];
      });
      
      return { previousKeys };
    },
    onError: (err, newKey, context) => {
      setKeySaveStatus('idle');
      queryClient.setQueryData(['/api/calendar/keys', 'time_blocking'], context?.previousKeys);
      toast({ title: "Failed to create tag", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/keys', 'time_blocking'] });
    },
    onSuccess: () => {
      setKeySaveStatus('saved');
      setTimeout(() => setKeySaveStatus('idle'), 2000);
      toast({ title: "Tag created", variant: "default" });
    }
  });

  const updateKeyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      setKeySaveStatus('saving');
      const response = await apiRequest(`/api/calendar/keys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/calendar/keys', 'time_blocking'] });
      const previousKeys = queryClient.getQueryData(['/api/calendar/keys', 'time_blocking']);
      
      queryClient.setQueryData(['/api/calendar/keys', 'time_blocking'], (old: any[] = []) => {
        return old.map(key => key.id === id ? { ...key, ...updates } : key);
      });
      
      return { previousKeys };
    },
    onError: (err, variables, context) => {
      setKeySaveStatus('idle');
      queryClient.setQueryData(['/api/calendar/keys', 'time_blocking'], context?.previousKeys);
      toast({ title: "Failed to update tag", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/keys', 'time_blocking'] });
    },
    onSuccess: () => {
      setKeySaveStatus('saved');
      setTimeout(() => setKeySaveStatus('idle'), 2000);
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      setKeySaveStatus('saving');
      await apiRequest(`/api/calendar/keys/${id}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['/api/calendar/keys', 'time_blocking'] });
      const previousKeys = queryClient.getQueryData(['/api/calendar/keys', 'time_blocking']);
      
      queryClient.setQueryData(['/api/calendar/keys', 'time_blocking'], (old: any[] = []) => {
        return old.filter(key => key.id !== id);
      });
      
      return { previousKeys };
    },
    onError: (err, id, context) => {
      setKeySaveStatus('idle');
      queryClient.setQueryData(['/api/calendar/keys', 'time_blocking'], context?.previousKeys);
      toast({ title: "Failed to delete tag", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/keys', 'time_blocking'] });
    },
    onSuccess: () => {
      setKeySaveStatus('saved');
      setTimeout(() => setKeySaveStatus('idle'), 2000);
      toast({ title: "Tag deleted", variant: "default" });
    }
  });

  // Handlers
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const addCalendarEntry = (date: number | string, colorKeyId: string, entryData?: Partial<CalendarEntry>) => {
    const dateNum = Number(date);
    const eventDate = new Date(year, month - 1, dateNum);
    
    // Parse times from entryData if provided
    let startTime = entryData?.startTime ? new Date(entryData.startTime) : new Date(eventDate);
    let endTime = entryData?.endTime ? new Date(entryData.endTime) : new Date(eventDate);
    
    // Set default times if not from entryData
    if (!entryData?.startTime) {
      startTime.setHours(9, 0, 0, 0);
    }
    if (!entryData?.endTime) {
      endTime.setHours(10, 0, 0, 0);
    }

    // Use color key label as default title if not provided
    const colorKey = colorKeys.find((k: ColorKey) => k.id === colorKeyId);
    const title = entryData?.title || colorKey?.label || 'New Event';

    createEventMutation.mutate({
      title: title,
      description: entryData?.description || '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isAllDay: entryData?.isAllDay || false,
      colorKeyId,
      type: 'time_blocking',
      completed: false
    });
  };

  const updateEntry = (entryId: string, updates: Partial<CalendarEntry>) => {
    // Map frontend updates to backend fields (serialize Dates to ISO strings)
    const backendUpdates: any = {};
    if (updates.title !== undefined) backendUpdates.title = updates.title;
    if (updates.description !== undefined) backendUpdates.description = updates.description;
    if (updates.completed !== undefined) {
      backendUpdates.completed = updates.completed;
      backendUpdates.completedAt = updates.completed ? new Date().toISOString() : null;
    }
    if (updates.colorKeyId !== undefined) backendUpdates.colorKeyId = updates.colorKeyId;
    if (updates.startTime !== undefined) backendUpdates.startTime = updates.startTime.toISOString();
    if (updates.endTime !== undefined) backendUpdates.endTime = updates.endTime.toISOString();
    if (updates.isAllDay !== undefined) backendUpdates.isAllDay = updates.isAllDay;
    
    updateEventMutation.mutate({ id: entryId, updates: backendUpdates });
  };

  const deleteEntry = (date: number | string, entryId: string) => {
    deleteEventMutation.mutate(entryId);
  };

  const deleteAllEntries = (date: number | string) => {
    const dateNum = Number(date);
    const startOfDay = new Date(year, month - 1, dateNum, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, dateNum, 23, 59, 59, 999);
    
    deleteEventsByRangeMutation.mutate({
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    });
  };

  const deleteAllMonthEntries = (year: number, month: number) => {
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    deleteEventsByRangeMutation.mutate({
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString()
    });
  };

  const toggleEntryCompletion = (entryId: string) => {
    // Find entry to get current status
    const entry = events.find((e: any) => e.id === entryId);
    if (entry) {
      updateEntry(entryId, { completed: !entry.completed });
    }
  };

  const moveEntry = (entryId: string, newDate: number) => {
    const entry = events.find((e: any) => e.id === entryId);
    if (!entry) return;

    const currentStart = new Date(entry.startTime);
    const currentEnd = new Date(entry.endTime);
    
    const newStart = new Date(year, month - 1, newDate, currentStart.getHours(), currentStart.getMinutes());
    const newEnd = new Date(year, month - 1, newDate, currentEnd.getHours(), currentEnd.getMinutes());

    updateEventMutation.mutate({
      id: entryId,
      updates: {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString()
      }
    });
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-3 mb-6 lg:hidden mt-16">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/streamline-workflow")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="hidden lg:flex items-center gap-3 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = '/streamline-workflow'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Streamline Your Workflow
            </Button>
          </div>

          {/* Header */}
          <div className="flex justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                <Calendar className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-serif font-semibold text-gray-900">
                  Time Blocking Planner
                </h1>
                <p className="text-gray-600 mt-1 text-base">
                  Colour-code your tasks and block focused time to get them done.
                </p>
              </div>
            </div>
          </div>

          {/* Unified Calendar Component */}
          <UnifiedCalendar
            calendarType="time_blocking"
            year={year}
            month={month}
            colorKeys={colorKeys}
            days={days}
            monthGoals={monthGoalsData?.goals || ''}
            
            // Navigation
            onPrevMonth={() => navigateMonth('prev')}
            onNextMonth={() => navigateMonth('next')}
            
            // Callbacks
            onAddEntry={addCalendarEntry}
            onUpdateEntry={updateEntry}
            onDeleteEntry={deleteEntry}
            onDeleteAllEntries={deleteAllEntries}
            onDeleteMonthEntries={deleteAllMonthEntries}
            onToggleComplete={toggleEntryCompletion}
            onMoveEntry={moveEntry}
            
            // Color Key Management
            onAddColorKey={(label, color) => {
              createKeyMutation.mutate({
                label,
                color,
                type: 'time_blocking',
                userId: 'user_id_placeholder' // Handled by backend
              });
            }}
            onUpdateColorKey={(keyId, updates) => updateKeyMutation.mutate({ id: keyId, updates })}
            onDeleteColorKey={(keyId) => deleteKeyMutation.mutate(keyId)}
            
            // Month Goals
            onUpdateMonthGoals={(goals) => {
              updateMonthGoalsMutation.mutate(goals);
            }}
            
            // Save status
            eventSaveStatus={eventSaveStatus}
            keySaveStatus={keySaveStatus}
            
            // Loading state
            isLoadingKeys={isLoadingKeys || isMigrating}
            isLoadingEvents={isLoadingEvents || isMigrating}
            
            // Features
            features={{
              enableMonthGoals: false,
              enableDayNotes: true,
              enableMediaUpload: false,
              enableWeeklyView: true,
              enableDailyView: true,
              showHourlyGrid: true
            }}
          />
        </div>
      </div>
    </div>
  );
}