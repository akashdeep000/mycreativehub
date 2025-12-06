import { useState, useEffect } from 'react';
import { 
  CalendarEntry, 
  ColorKey, 
  DayData, 
  CalendarView, 
  MonthGoals, 
  sortEntriesByTime,
  getSmartDefaultTimes,
  getAllDayEventTimes
} from './calendar-types';
import ColorKeyManager from './color-key-manager';
import CalendarEntryCard from './calendar-entry-card';
import MonthlyView from './views/monthly-view';
import DailyView from './views/daily-view';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UnifiedCalendarProps {
  calendarType: 'content' | 'time_blocking';
  
  // Data
  year: number;
  month: number;
  colorKeys: ColorKey[];
  days: Array<{
    date: number | string;
    entries: CalendarEntry[];
    dayNotes?: string;
  }>;
  monthGoals?: string;
  
  // Callbacks
  onAddEntry: (date: number | string, colorKeyId: string, entryData?: Partial<CalendarEntry>) => void;
  onUpdateEntry: (entryId: string, updates: Partial<CalendarEntry>) => void;
  onDeleteEntry: (date: number | string, entryId: string) => void;
  onToggleComplete: (entryId: string) => void;
  onMoveEntry?: (entryId: string, newDate: number) => void;
  
  // Navigation
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  
  // Color key management
  onAddColorKey: (label: string, color: string) => void;
  onUpdateColorKey: (keyId: string, updates: Partial<ColorKey>) => void;
  onDeleteColorKey: (keyId: string) => void;
  
  // Month goals (optional)
  onUpdateMonthGoals?: (goals: string) => void;
  
  // Day notes (optional)
  onUpdateDayNotes?: (date: number | string, notes: string) => void;
  
  // Media upload (content calendar only)
  onUploadMedia?: (date: number, file: File) => void;
  onDeleteMedia?: (date: number, mediaPath: string) => void;
  

  // Save status
  eventSaveStatus?: 'idle' | 'saving' | 'saved';
  keySaveStatus?: 'idle' | 'saving' | 'saved';
  
  // Loading state
  isLoading?: boolean;
  
  // Feature flags
  features?: {
    showHourlyGrid?: boolean;        // Time blocking only
    enableMediaUpload?: boolean;     // Content calendar only
    enableMonthGoals?: boolean;      // Both
    enableDayNotes?: boolean;        // Both
    enableWeeklyView?: boolean;      // Both (future)
    enableDailyView?: boolean;       // Both (future)
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor,
  DragEndEvent,
  DragStartEvent,
  pointerWithin
} from '@dnd-kit/core';

import EventEditorDialog from './event-editor-dialog';

export default function UnifiedCalendar(props: UnifiedCalendarProps) {
  const [selectedColorKeyId, setSelectedColorKeyId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedColorKeyId) return
    setSelectedColorKeyId(props.colorKeys.find(k => k.isDefault)?.id || null);
  },[props.colorKeys])
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | undefined>(undefined);
  const [editorDate, setEditorDate] = useState<Date>(new Date());

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Enable click events by requiring movement
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // Extract date from droppable ID (format: "day-YEAR-MONTH-DATE")
      const overId = over.id as string;
      if (overId.startsWith('day-')) {
        const parts = overId.split('-');
        if (parts.length === 4) {
          const newDate = parseInt(parts[3]);
          if (!isNaN(newDate)) {
            props.onMoveEntry?.(active.id as string, newDate);
          }
        }
      }
    }
  };
  
  // Process days data: Auto-sort entries if time_blocking
  const processedDays = props.days.map(day => {
    if (props.calendarType === 'time_blocking') {
      return {
        ...day,
        entries: sortEntriesByTime(day.entries)
      };
    }
    return day;
  });

  // View state
  const [view, setView] = useState<'month' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Handle day click to switch to daily view
  const handleDayClick = (dayNumber: number) => {
    const date = new Date(props.year, props.month - 1, dayNumber);
    setSelectedDate(date);
    setView('day');
  };

  // Handle navigation in daily view
  const handlePrevDay = () => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() - 1);
      setSelectedDate(newDate);
      
      // If month changes, notify parent
      if (newDate.getMonth() !== props.month - 1) {
        props.onPrevMonth?.();
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + 1);
      setSelectedDate(newDate);
      
      // If month changes, notify parent
      if (newDate.getMonth() !== props.month - 1) {
        props.onNextMonth?.();
      }
    }
  };

  // Editor Handlers
  const openAddEditor = (date: number, hour?: number) => {
    // If a color key is selected and no specific hour, auto-create all-day event
    // BUT for time_blocking, we want to open the editor to allow setting time range
    if (selectedColorKeyId && hour === undefined && props.calendarType !== 'time_blocking') {
      const newDate = new Date(props.year, props.month - 1, date);
      const { startTime, endTime } = getAllDayEventTimes(newDate);
      
      // Find color key label to use as default title
      const colorKey = props.colorKeys.find(k => k.id === selectedColorKeyId);
      const defaultTitle = colorKey?.label || 'New Event';
      
      props.onAddEntry(date, selectedColorKeyId, {
        title: defaultTitle,
        description: '',
        startTime,
        endTime,
        isAllDay: true,
        colorKeyId: selectedColorKeyId,
        type: props.calendarType,
        completed: false
      });
      return;
    }
    
    // Otherwise open the editor dialog normally
    const newDate = new Date(props.year, props.month - 1, date);
    setEditorDate(newDate);
    
    // Initialize editing entry
    let initialEntry: Partial<CalendarEntry> = {
      colorKeyId: selectedColorKeyId || undefined
    };
    
    // If hour provided, set default time
    if (hour !== undefined && hour >= 0) {
      const startTime = new Date(newDate);
      startTime.setHours(hour, 0, 0, 0);
      
      const endTime = new Date(newDate);
      endTime.setHours(hour + 1, 0, 0, 0);
      
      initialEntry = {
        ...initialEntry,
        startTime,
        endTime,
        isAllDay: false
      };
    } else if (hour === -1) {
       // All day
       initialEntry = {
         ...initialEntry,
         isAllDay: true
       };
    } else {
       // Generic add (no specific hour) - use smart defaults
       const { defaultStart, defaultEnd } = getSmartDefaultTimes(newDate);
       const [startH, startM] = defaultStart.split(':').map(Number);
       const [endH, endM] = defaultEnd.split(':').map(Number);
       
       const startTime = new Date(newDate);
       startTime.setHours(startH, startM, 0, 0);
       
       const endTime = new Date(newDate);
       endTime.setHours(endH, endM, 0, 0);
       
       initialEntry = {
         ...initialEntry,
         startTime,
         endTime,
         isAllDay: false
       };
    }
    
    setEditingEntry(initialEntry as CalendarEntry);
    setIsEditorOpen(true);
  };

  const openEditEditor = (entry: CalendarEntry, date: number) => {
    const newDate = new Date(props.year, props.month - 1, date);
    setEditorDate(newDate);
    setEditingEntry(entry);
    setIsEditorOpen(true);
  };

  const handleSaveEntry = (entryData: Partial<CalendarEntry>) => {
    if (editingEntry?.id) {
      // Update existing
      props.onUpdateEntry(editingEntry.id, entryData);
    } else {
      // Create new
      // We need to pass colorKeyId and date. The dialog ensures colorKeyId is present.
      // The parent onAddEntry expects (date, colorKeyId). 
      // But we also have title, time, notes etc.
      // We might need to update the parent callback signature or handle it differently.
      // For now, let's assume onAddEntry creates a basic entry, and we immediately update it.
      // OR better: The parent should probably accept a full entry object for creation.
      
      // Since the current prop is `onAddEntry: (date: number | string, colorKeyId: string) => void`,
      // we can't pass the full object directly. 
      // Workaround: Call add, then we'll need a way to update the newly created entry.
      // This is tricky without the ID. 
      
      // Ideally, onAddEntry should return the ID or accept the full object.
      // Let's modify the prop signature in a future refactor.
      // For now, let's assume we can only add basic entries via this flow 
      // OR we hack it by calling onAddEntry and hoping the parent handles it.
      
      // Actually, let's check how `onAddEntry` is implemented in the parent.
      // It likely makes a backend call.
      
      if (entryData.colorKeyId) {
         // We'll use a custom event or modify the prop if possible.
         // For this step, let's just call the existing prop and log a todo.
         props.onAddEntry(editorDate.getDate(), entryData.colorKeyId, entryData);
         
         // NOTE: This will create an empty entry. We lose title/time/notes.
         // We need to fix the parent `onAddEntry` to accept data.
         // I will add a TODO for the user or try to fix it if I can see the parent.
      }
    }
    setIsEditorOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Month Goals Section (if enabled) */}
      {view === 'month' && props.features?.enableMonthGoals && (
        <div className="bg-white rounded-lg shadow-md border-0 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Goals for {MONTH_NAMES[props.month - 1]} {props.year}
          </h3>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            placeholder="What do you want to achieve this month?"
            value={props.monthGoals || ''}
            onChange={(e) => props.onUpdateMonthGoals?.(e.target.value)}
          />
        </div>
      )}
      
      <div className="space-y-6">
        {/* Color Key Manager - Top Section */}
        <ColorKeyManager
          colorKeys={props.colorKeys}
          selectedKeyId={selectedColorKeyId}
          onSelect={setSelectedColorKeyId}
          onUpdate={props.onUpdateColorKey}
          onDelete={props.onDeleteColorKey}
          onAdd={props.onAddColorKey}
          saveStatus={props.keySaveStatus}
        />

        {/* Main Calendar Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="flex flex-row items-center justify-between p-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-baseline gap-2">
                  {MONTH_NAMES[props.month - 1]} 
                  <span className="text-xl text-gray-400 font-light">{props.year}</span>
                </h2>
              </div>
              <p className="text-gray-500 text-sm font-medium mt-1">
                {props.calendarType === 'time_blocking' 
                  ? "Manage your time and tasks" 
                  : "Manage your content and schedule"
                }
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={props.onPrevMonth}
                  className="h-8 w-8 hover:bg-white hover:shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </Button>
                
                <div className="h-4 w-px bg-gray-200 mx-1" />
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={props.onNextMonth}
                  className="h-8 w-8 hover:bg-white hover:shadow-sm"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </Button>
              </div>

              {/* Event Save Status Indicator - Fixed height to prevent flicker */}
              <div className="h-6 flex items-center justify-end">
                {props.eventSaveStatus === 'saving' && (
                  <span className="text-xs text-gray-500 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-gray-100 shadow-sm animate-in fade-in duration-200">
                    <span className="inline-block w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                    Saving...
                  </span>
                )}
                {props.eventSaveStatus === 'saved' && (
                  <span className="text-xs text-green-600 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-green-100 shadow-sm animate-in fade-in duration-200">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
              </div>
            </div>
          </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        {view === 'month' ? (
          <MonthlyView
            year={props.year}
            month={props.month}
            days={props.days}
            colorKeys={props.colorKeys}
            selectedColorKeyId={selectedColorKeyId}
            onDayClick={openAddEditor}
            onDateClick={(date) => {
              // Switch to daily view for this date
              const newDate = new Date(props.year, props.month - 1, date);
              setSelectedDate(newDate);
              setView('day');
            }}
            onEntryClick={(entry) => {
              const d = new Date(entry.startTime);
              openEditEditor(entry, d.getDate());
            }}
            onToggleComplete={(entryId) => {
              props.onToggleComplete?.(entryId);
            }}
            onDeleteEntry={(entryId) => {
              props.onDeleteEntry?.(0, entryId);
            }}
            onUpdateTitle={(entryId, newTitle) => {
              props.onUpdateEntry?.(entryId, { title: newTitle });
            }}
            enableCompletion={true}
            enableDragAndDrop={true}
            isLoading={props.isLoading}
          />
        ) : (
          <DailyView
            date={selectedDate!}
            entries={processedDays.find(d => d.date === selectedDate?.getDate())?.entries || []}
            colorKeys={props.colorKeys}
            calendarType={props.calendarType}
            onClose={() => setView('month')}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
            onAddEntry={(date, hour) => openAddEditor(date, hour)}
            onUpdateEntry={props.onUpdateEntry}
            onEntryClick={(entry) => {
              openEditEditor(entry, selectedDate!.getDate());
            }}
            onDeleteEntry={(entryId) => {
              props.onDeleteEntry?.(selectedDate!.getDate(), entryId);
            }}
            enableDragAndDrop={true}
            isLoading={props.isLoading}
          />
        )}
        
        <DragOverlay>
          {activeId ? (
            <div className="opacity-80 rotate-3 cursor-grabbing pointer-events-none">
               {/* Simplified drag preview */}
               <div className="bg-white border rounded shadow-lg p-2 text-sm font-medium">
                 Moving entry...
               </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
        </div>
      </div>

      <EventEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEntry}
        onDelete={(entryId) => {
          if (editingEntry) {
            props.onDeleteEntry(editorDate.getDate(), entryId);
          }
        }}
        initialDate={editorDate}
        initialEntry={editingEntry}
        colorKeys={props.colorKeys}
      />
    </div>
  );
}
