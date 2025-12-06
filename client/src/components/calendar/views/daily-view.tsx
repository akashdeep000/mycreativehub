import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Plus, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarEntry, ColorKey, getEntryDisplayTitle } from '../calendar-types';
import { cn } from '@/lib/utils';

// Configuration
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PIXELS_PER_HOUR = 64; // Standard height (multiple of 4)
const GRID_COLOR = "border-gray-100";
const TIME_LABEL_WIDTH = "w-16";

interface DailyViewProps {
  date: Date;
  entries: CalendarEntry[];
  colorKeys: ColorKey[];
  onClose: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onAddEntry: (date: number, hour?: number) => void;
  onUpdateEntry: (entryId: string, updates: Partial<CalendarEntry>) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onDeleteAll: () => void;
  enableDragAndDrop?: boolean;
  calendarType?: 'content' | 'time_blocking';
  isLoading?: boolean;
}

export default function DailyView({
  date,
  entries,
  colorKeys,
  onClose,
  onPrevDay,
  onNextDay,
  onAddEntry,
  onUpdateEntry,
  onEntryClick,
  onDeleteEntry,
  onDeleteAll,
  enableDragAndDrop = false,
  calendarType = 'content',
  isLoading = false
}: DailyViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  
  // Local state for drag operations to prevent excessive updates
  const [activeDragState, setActiveDragState] = useState<{
    id: string;
    startTime: Date;
    endTime: Date;
  } | null>(null);

  // Scroll to 7 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * PIXELS_PER_HOUR;
    }
    
    // Update current time every minute
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Formatters
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNumber = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });

  // Calculate layout for overlapping events
  const getLayoutEvents = (entries: CalendarEntry[]) => {
    // 1. Sort events by start time, then duration (longer first)
    const sortedEvents = [...entries].sort((a, b) => {
      const startA = new Date(a.startTime).getTime();
      const startB = new Date(b.startTime).getTime();
      if (startA !== startB) return startA - startB;
      
      const endA = new Date(a.endTime).getTime();
      const endB = new Date(b.endTime).getTime();
      return (endB - startB) - (endA - startA);
    });

    // 2. Group overlapping events
    const columns: CalendarEntry[][] = [];
    const eventPositions = new Map<string, { colIndex: number, totalCols: number }>();

    sortedEvents.forEach(event => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();

      // Find the first column where this event fits
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastEventInCol = col[col.length - 1];
        const lastEventEnd = new Date(lastEventInCol.endTime).getTime();

        if (eventStart >= lastEventEnd) {
          col.push(event);
          eventPositions.set(event.id, { colIndex: i, totalCols: 1 }); // totalCols will be updated later
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
        eventPositions.set(event.id, { colIndex: columns.length - 1, totalCols: 1 });
      }
    });

    // 3. Determine total columns for each group of overlapping events
    // This is a simplified approach. For perfect Google Calendar layout, we need a more complex graph coloring algorithm.
    // But this "packing" approach works well for most cases.
    
    // We need to find groups of columns that overlap with each other
    // For now, let's just use the column index and total columns count from the packing
    
    return { sortedEvents, eventPositions, totalColumns: columns.length };
  };

  const { eventPositions } = getLayoutEvents(entries.filter(e => !e.isAllDay));

  // Calculate position for an entry
  const getEntryStyle = (entry: CalendarEntry) => {
    // Use active drag state if this entry is being dragged
    const isDragging = activeDragState?.id === entry.id;
    const effectiveStartTime = isDragging ? activeDragState.startTime : new Date(entry.startTime);
    const effectiveEndTime = isDragging ? activeDragState.endTime : new Date(entry.endTime);
    
    // Extract time from Date object
    const startDate = new Date(effectiveStartTime);
    const endDate = new Date(effectiveEndTime);
    
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const top = (startHours * PIXELS_PER_HOUR) + ((startMinutes / 60) * PIXELS_PER_HOUR);
    
    // Calculate duration
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const height = Math.max(durationHours * PIXELS_PER_HOUR, 30); // Minimum 30px height
    
    // Calculate horizontal position
    const pos = eventPositions.get(entry.id) || { colIndex: 0, totalCols: 1 };
    
    // Re-calculating overlaps specifically for this event to determine width sharing
    const concurrentEvents = entries.filter(e => !e.isAllDay && areOverlapping(entry, e));
    const totalConcurrent = concurrentEvents.length;
    const myIndex = concurrentEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).findIndex(e => e.id === entry.id);
    
    const width = `calc((100% - 5.5rem) / ${totalConcurrent})`;
    const left = `calc(4.5rem + ((100% - 5.5rem) / ${totalConcurrent}) * ${myIndex})`;

    return {
      top: `${top}px`,
      height: `${height}px`,
      left,
      width
    };
  };

  const areOverlapping = (a: CalendarEntry, b: CalendarEntry) => {
    const startA = new Date(a.startTime).getTime();
    const endA = new Date(a.endTime).getTime();
    const startB = new Date(b.startTime).getTime();
    const endB = new Date(b.endTime).getTime();
    return startA < endB && endA > startB;
  };

  // Current time indicator position
  const getCurrentTimeTop = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours * PIXELS_PER_HOUR) + ((minutes / 60) * PIXELS_PER_HOUR);
  };

  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col h-[800px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Premium Header */}
      {/* Premium Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{monthName} {date.getFullYear()}</span>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold tracking-tight", isToday ? "text-blue-600" : "text-gray-900")}>
                {dayName}
              </span>
              <span className={cn("text-3xl font-light", isToday ? "text-blue-600" : "text-gray-400")}>
                {dayNumber}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onDeleteAll && entries.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-red-50 hover:text-red-600"
                  title="Clear all events"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all events?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all events for this day. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDeleteAll?.()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
            <Button variant="ghost" size="icon" onClick={onPrevDay} className="h-8 w-8 hover:bg-white hover:shadow-sm">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNextDay} className="h-8 w-8 hover:bg-white hover:shadow-sm">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col overflow-hidden animate-pulse">
          {/* All Day Skeleton */}
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex gap-4">
            <div className={cn(TIME_LABEL_WIDTH, "text-right pt-1.5")}>
              <div className="h-3 w-8 bg-gray-200 rounded ml-auto"></div>
            </div>
            <div className="flex-1 flex gap-2">
              <div className="h-8 w-24 bg-gray-200 rounded"></div>
              <div className="h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
          
          {/* Hourly Grid Skeleton */}
          <div className="flex-1 overflow-hidden relative bg-white">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex h-16 border-b border-gray-100">
                <div className={cn(TIME_LABEL_WIDTH, "border-r border-gray-100")}></div>
                <div className="flex-1 p-2">
                  {i % 3 === 0 && (
                    <div className="h-full w-full bg-gray-50 rounded border border-gray-100"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* All Day Section */}
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex gap-4">
        <div className={cn(TIME_LABEL_WIDTH, "text-right text-xs font-medium text-gray-400 pt-1.5")}>
          All Day
        </div>
        <div className="flex-1 flex flex-wrap gap-2">
          {entries.filter(e => e.isAllDay).map(entry => {
            const colorKey = colorKeys.find(k => k.id === entry.colorKeyId);
            const baseColor = colorKey?.color || '#3B82F6';
            
            const isOptimistic = entry.id.toString().startsWith('temp-');
            
            return (
              <div
                key={entry.id}
                className={`relative group transition-transform duration-200 ${isOptimistic ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:scale-[1.02]'}`}
                onClick={(e) => {
                  // Open editor
                  e.stopPropagation();
                  if (!isOptimistic) onEntryClick(entry);
                }}
              >
                <div 
                  className="px-2 py-1 rounded-md text-xs font-semibold shadow-sm border border-transparent flex items-center gap-1"
                  style={{ 
                    backgroundColor: baseColor,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                >
                  <span>{getEntryDisplayTitle(entry, colorKeys)}</span>
                  
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/20 rounded transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOptimistic) onDeleteEntry(entry.id);
                    }}
                    title="Delete event"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {/* Add Button for All Day */}
          <button 
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            onClick={() => {
              if (calendarType === 'time_blocking') {
                onAddEntry(date.getDate()); // Undefined hour -> defaults to not all-day in UnifiedCalendar
              } else {
                onAddEntry(date.getDate(), -1); // -1 for all day
              }
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Hourly Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white scroll-smooth">
        {/* Time Grid Lines */}
        {HOURS.map((hour) => (
          <div 
            key={hour} 
            className="flex relative group"
            style={{ height: `${PIXELS_PER_HOUR}px` }}
            onMouseEnter={() => setHoveredHour(hour)}
            onMouseLeave={() => setHoveredHour(null)}
            onClick={() => onAddEntry(date.getDate(), hour)}
          >
            {/* Time Label */}
            <div className={cn(TIME_LABEL_WIDTH, "text-right pr-4 text-xs font-medium text-gray-400 -mt-2.5 select-none relative z-10")}>
              {hour === 0 ? '' : (
                <span>
                  {hour > 12 ? hour - 12 : hour === 0 || hour === 12 ? 12 : hour}
                  <span className="text-[10px] ml-0.5">{hour >= 12 ? 'PM' : 'AM'}</span>
                </span>
              )}
            </div>
            
            {/* Grid Line */}
            <div className={cn("flex-1 border-b relative", GRID_COLOR)}>
               {/* Vertical Grid Line (Left Border) */}
               <div className={cn("absolute left-0 top-0 bottom-0 w-px bg-gray-100")} />
               
               {/* Half-hour marker (subtle) */}
               {/* <div className="absolute top-1/2 left-0 right-0 border-t border-dotted border-gray-50" /> */}

               {/* Hover "Add" Indicator */}
               {hoveredHour === hour && (
                 <div className="absolute inset-0 bg-blue-50/30 flex items-center pl-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                   <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                     <Plus className="w-3 h-3" /> Add event
                   </span>
                 </div>
               )}
            </div>
          </div>
        ))}

        {/* Current Time Indicator */}
        {isToday && (
          <div 
            className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
            style={{ top: `${getCurrentTimeTop()}px` }}
          >
            <div className={cn(TIME_LABEL_WIDTH, "text-right pr-2")}>
               <span className="text-[10px] font-bold text-red-500 bg-white px-1 rounded">
                 {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
               </span>
            </div>
            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shadow-sm ring-2 ring-white" />
            <div className="flex-1 h-px bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
          </div>
        )}

        {/* Events */}
        {entries.filter(e => !e.isAllDay).map(entry => {
          const colorKey = colorKeys.find(k => k.id === entry.colorKeyId);
          const style = getEntryStyle(entry);
          const baseColor = colorKey?.color || '#3B82F6';
          const displayTitle = getEntryDisplayTitle(entry, colorKeys);
          const isSmall = parseFloat(style.height) < 45;
          
          const isOptimistic = entry.id.toString().startsWith('temp-');
          
          return (
            <div
              key={entry.id}
              className={`@container absolute z-20 rounded-lg px-2.5 py-1 text-xs border-l-4 shadow-sm transition-all duration-200 group overflow-hidden
                ${isOptimistic 
                  ? 'opacity-70 cursor-wait' 
                  : 'cursor-pointer hover:shadow-lg hover:z-30 hover:scale-[1.01]'
                }
              `}
              style={{
                ...style,
                backgroundColor: calendarType === 'time_blocking' 
                  ? (colorKey?.color || '#3B82F6') 
                  : (entry.completed ? '#f3f4f6' : `${baseColor}15`),
                borderColor: calendarType === 'time_blocking'
                  ? 'transparent'
                  : (entry.completed ? '#9ca3af' : baseColor),
                color: calendarType === 'time_blocking' ? '#ffffff' : '#1f2937',
                position: 'absolute'
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isDraggingRef.current) {
                  isDraggingRef.current = false;
                  return;
                }
                if (!isOptimistic) onEntryClick(entry);
              }}
              onMouseDown={(e) => {
                if (isOptimistic) return;
                
                // Only start drag if not clicking resize handle or other controls
                if ((e.target as HTMLElement).closest('.cursor-ns-resize') || 
                    (e.target as HTMLElement).closest('button') ||
                    (e.target as HTMLElement).closest('.rounded-full')) {
                  return;
                }
                
                e.preventDefault();
                isDraggingRef.current = false;
                const startY = e.clientY;
                const startTop = parseFloat(style.top);
                const startTime = new Date(entry.startTime).getTime();
                const durationMs = new Date(entry.endTime).getTime() - startTime;
                
                // Initialize drag state
                setActiveDragState({
                  id: entry.id,
                  startTime: new Date(entry.startTime),
                  endTime: new Date(entry.endTime)
                });
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  isDraggingRef.current = true;
                  const deltaY = moveEvent.clientY - startY;
                  const newTop = Math.max(0, startTop + deltaY);
                  
                  // Calculate new start time based on top position
                  const hours = newTop / PIXELS_PER_HOUR;
                  const timeMs = hours * 60 * 60 * 1000;
                  
                  // Create new start date (relative to day start)
                  const dayStart = new Date(entry.startTime);
                  dayStart.setHours(0, 0, 0, 0);
                  const newStartTime = new Date(dayStart.getTime() + timeMs);
                  
                  // Round to nearest 15 minutes
                  const minutes = newStartTime.getMinutes();
                  const roundedMinutes = Math.round(minutes / 15) * 15;
                  newStartTime.setMinutes(roundedMinutes, 0, 0);
                  
                  const newEndTime = new Date(newStartTime.getTime() + durationMs);
                  
                  // Update local state immediately
                  setActiveDragState({
                    id: entry.id,
                    startTime: newStartTime,
                    endTime: newEndTime
                  });
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  
                  // Commit changes
                  setActiveDragState((currentState) => {
                    if (currentState) {
                      onUpdateEntry(entry.id, { 
                        startTime: currentState.startTime,
                        endTime: currentState.endTime
                      });
                    }
                    return null;
                  });
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onTouchStart={(e) => {
                if (isOptimistic) return;
                
                // Only start drag if not clicking resize handle or other controls
                if ((e.target as HTMLElement).closest('.cursor-ns-resize') || 
                    (e.target as HTMLElement).closest('button') ||
                    (e.target as HTMLElement).closest('.rounded-full')) {
                  return;
                }
                
                // Don't prevent default immediately to allow tap, but we might need it for drag
                // However, for dragging we usually want to prevent scroll
                // e.preventDefault(); 
                
                isDraggingRef.current = false;
                const touch = e.touches[0];
                const startY = touch.clientY;
                const startTop = parseFloat(style.top);
                const startTime = new Date(entry.startTime).getTime();
                const durationMs = new Date(entry.endTime).getTime() - startTime;
                
                // Initialize drag state
                setActiveDragState({
                  id: entry.id,
                  startTime: new Date(entry.startTime),
                  endTime: new Date(entry.endTime)
                });
                
                const handleTouchMove = (moveEvent: TouchEvent) => {
                  // Prevent scrolling while dragging
                  if (moveEvent.cancelable) moveEvent.preventDefault();
                  
                  isDraggingRef.current = true;
                  const moveTouch = moveEvent.touches[0];
                  const deltaY = moveTouch.clientY - startY;
                  const newTop = Math.max(0, startTop + deltaY);
                  
                  // Calculate new start time based on top position
                  const hours = newTop / PIXELS_PER_HOUR;
                  const timeMs = hours * 60 * 60 * 1000;
                  
                  // Create new start date (relative to day start)
                  const dayStart = new Date(entry.startTime);
                  dayStart.setHours(0, 0, 0, 0);
                  const newStartTime = new Date(dayStart.getTime() + timeMs);
                  
                  // Round to nearest 15 minutes
                  const minutes = newStartTime.getMinutes();
                  const roundedMinutes = Math.round(minutes / 15) * 15;
                  newStartTime.setMinutes(roundedMinutes, 0, 0);
                  
                  const newEndTime = new Date(newStartTime.getTime() + durationMs);
                  
                  // Update local state immediately
                  setActiveDragState({
                    id: entry.id,
                    startTime: newStartTime,
                    endTime: newEndTime
                  });
                };
                
                const handleTouchEnd = () => {
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                  
                  // Commit changes
                  setActiveDragState((currentState) => {
                    if (currentState) {
                      onUpdateEntry(entry.id, { 
                        startTime: currentState.startTime,
                        endTime: currentState.endTime
                      });
                    }
                    return null;
                  });
                };
                
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd);
              }}
            >
              {/* Title and Time Row */}
              <div className={cn("flex items-start justify-between gap-2", isSmall ? "flex-row items-center h-full" : "flex-col mb-1")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {/* Completion Toggle */}
                    <div
                      className={`
                        w-3.5 h-3.5 rounded-full flex-shrink-0 cursor-pointer transition-all duration-200 relative ring-1 ring-offset-1 hover:scale-110
                        ${calendarType === 'time_blocking' ? 'rounded border ring-0 ring-offset-0' : ''}
                      `}
                      style={{ 
                        backgroundColor: calendarType === 'time_blocking'
                          ? (entry.completed ? 'rgba(255,255,255,0.3)' : '#ffffff')
                          : (entry.completed ? '#9ca3af' : baseColor),
                        borderColor: calendarType === 'time_blocking'
                          ? (entry.completed ? 'rgba(255,255,255,0.5)' : '#d1d5db')
                          : undefined,
                        borderWidth: calendarType === 'time_blocking' ? '1px' : '0px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isOptimistic) onUpdateEntry(entry.id, { completed: !entry.completed });
                      }}
                      title={isOptimistic ? "Saving..." : (entry.completed ? "Mark as incomplete" : "Mark as complete")}
                    >
                      {entry.completed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {calendarType === 'time_blocking' ? (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <span className={cn(
                      "font-semibold truncate flex-1",
                      entry.completed 
                        ? "text-gray-500 line-through" 
                        : (calendarType === 'time_blocking' ? "text-white" : "text-gray-900")
                    )}>
                      {displayTitle}
                    </span>
                    
                    {/* Time Display for Small Events - inline if width > 200px */}
                    {isSmall && (
                      <div className={`@[200px]:flex hidden items-center gap-1 ml-1 min-w-0 ${calendarType === 'time_blocking' ? 'text-white/80' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[10px] whitespace-nowrap truncate">
                          {new Date(activeDragState?.id === entry.id ? activeDragState.startTime : entry.startTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit'
                          })}
                          {' - '}
                          {new Date(activeDragState?.id === entry.id ? activeDragState.endTime : entry.endTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Time Display for Medium/Large Events (height >= 45px) */}
                  {!isSmall && (
                    <div className={`flex items-center gap-1 mt-0.5 ml-5 ${calendarType === 'time_blocking' ? 'text-white/80' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3" />
                      <span className="text-[11px]">
                        {new Date(activeDragState?.id === entry.id ? activeDragState.startTime : entry.startTime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit'
                        })}
                        {' - '}
                        {new Date(activeDragState?.id === entry.id ? activeDragState.endTime : entry.endTime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  
                  {/* Inline Description - Dual Render Strategy */}
                  {!isSmall && entry.description && (
                    <>
                      {/* Normal Width (>150px) - Assumes 1 line for time */}
                      {(() => {
                        const totalHeight = parseFloat(style.height);
                        const usedHeight = 38; // ~20px title + ~18px time row
                        const availableHeight = totalHeight - usedHeight;
                        const lineHeight = 16;
                        
                        if (availableHeight < lineHeight) return null;
                        const maxLines = Math.floor(availableHeight / lineHeight);
                        
                        return (
                          <div className="@[150px]:block hidden">
                            <div 
                              className={`ml-5 mt-1 text-[11px] ${calendarType === 'time_blocking' ? 'text-white/90' : 'text-gray-600'}`}
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: maxLines,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {entry.description}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Narrow Width (<150px) - Assumes 2 lines for time (+20px used) */}
                      {(() => {
                        const totalHeight = parseFloat(style.height);
                        const usedHeight = 58; // 38 + 20px compensation for wrapped time
                        const availableHeight = totalHeight - usedHeight;
                        const lineHeight = 16;
                        
                        if (availableHeight < lineHeight) return null;
                        const maxLines = Math.floor(availableHeight / lineHeight);
                        
                        return (
                          <div className="@[150px]:hidden block">
                            <div 
                              className={`ml-5 mt-1 text-[11px] ${calendarType === 'time_blocking' ? 'text-white/90' : 'text-gray-600'}`}
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: maxLines,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {entry.description}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
              
              {/* Resize Handle */}
              {!isOptimistic && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-30"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const startY = e.clientY;
                  const startHeight = parseFloat(style.height);
                  const startTime = new Date(entry.startTime).getTime();
                  
                  // Initialize drag state
                  setActiveDragState({
                    id: entry.id,
                    startTime: new Date(entry.startTime),
                    endTime: new Date(entry.endTime)
                  });
                  
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    isDraggingRef.current = true;
                    const deltaY = moveEvent.clientY - startY;
                    const newHeight = Math.max(30, startHeight + deltaY); // Minimum 30px
                    
                    // Calculate new end time based on height
                    const durationHours = newHeight / PIXELS_PER_HOUR;
                    const durationMs = durationHours * 60 * 60 * 1000;
                    const newEndTime = new Date(startTime + durationMs);
                    
                    // Round to nearest 15 minutes
                    const minutes = newEndTime.getMinutes();
                    const roundedMinutes = Math.round(minutes / 15) * 15;
                    newEndTime.setMinutes(roundedMinutes, 0, 0);
                    
                    // Update local state immediately
                    setActiveDragState({
                      id: entry.id,
                      startTime: new Date(startTime),
                      endTime: newEndTime
                    });
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    
                    // Commit changes
                    setActiveDragState((currentState) => {
                      if (currentState) {
                        onUpdateEntry(entry.id, { 
                          endTime: currentState.endTime
                        });
                      }
                      return null;
                    });
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  // e.preventDefault(); // Don't prevent default here to allow initial touch? Actually for resize handle we probably want to capture immediately
                  
                  const touch = e.touches[0];
                  const startY = touch.clientY;
                  const startHeight = parseFloat(style.height);
                  const startTime = new Date(entry.startTime).getTime();
                  
                  // Initialize drag state
                  setActiveDragState({
                    id: entry.id,
                    startTime: new Date(entry.startTime),
                    endTime: new Date(entry.endTime)
                  });
                  
                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    if (moveEvent.cancelable) moveEvent.preventDefault();
                    
                    isDraggingRef.current = true;
                    const moveTouch = moveEvent.touches[0];
                    const deltaY = moveTouch.clientY - startY;
                    const newHeight = Math.max(30, startHeight + deltaY); // Minimum 30px
                    
                    // Calculate new end time based on height
                    const durationHours = newHeight / PIXELS_PER_HOUR;
                    const durationMs = durationHours * 60 * 60 * 1000;
                    const newEndTime = new Date(startTime + durationMs);
                    
                    // Round to nearest 15 minutes
                    const minutes = newEndTime.getMinutes();
                    const roundedMinutes = Math.round(minutes / 15) * 15;
                    newEndTime.setMinutes(roundedMinutes, 0, 0);
                    
                    // Update local state immediately
                    setActiveDragState({
                      id: entry.id,
                      startTime: new Date(startTime),
                      endTime: newEndTime
                    });
                  };
                  
                  const handleTouchEnd = () => {
                    document.removeEventListener('touchmove', handleTouchMove);
                    document.removeEventListener('touchend', handleTouchEnd);
                    
                    // Commit changes
                    setActiveDragState((currentState) => {
                      if (currentState) {
                        onUpdateEntry(entry.id, { 
                          endTime: currentState.endTime
                        });
                      }
                      return null;
                    });
                  };
                  
                  document.addEventListener('touchmove', handleTouchMove, { passive: false });
                  document.addEventListener('touchend', handleTouchEnd);
                }}
              />
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}