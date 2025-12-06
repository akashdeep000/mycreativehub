import type { CalendarEntry, ColorKey, DayData } from '../calendar-types';
import DayCell from './day-cell';

interface MonthlyViewProps {
  year: number;
  month: number;
  days: DayData[];
  colorKeys: ColorKey[];
  selectedColorKeyId?: string | null;
  
  onDayClick: (date: number) => void;
  onDateClick?: (date: number) => void; // Navigate to daily view
  onEntryClick: (entry: CalendarEntry) => void;
  onToggleComplete: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateTitle?: (entryId: string, newTitle: string) => void;
  
  enableCompletion?: boolean;
  enableDragAndDrop?: boolean;
}

export default function MonthlyView({
  year,
  month,
  days,
  colorKeys,
  selectedColorKeyId,
  onDayClick,
  onDateClick,
  onEntryClick,
  onToggleComplete,
  onDeleteEntry,
  onUpdateTitle,
  enableCompletion = true,
  enableDragAndDrop = false,
  isLoading = false
}: MonthlyViewProps & { isLoading?: boolean }) {
  
  // Calculate calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
  
  // Build calendar grid (42 cells = 6 weeks)
  const calendarCells: Array<{
    dayNumber: number;
    isCurrentMonth: boolean;
    actualDate: Date;
  }> = [];
  
  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      dayNumber: daysInPrevMonth - i,
      isCurrentMonth: false,
      actualDate: new Date(year, month - 2, daysInPrevMonth - i)
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: true,
      actualDate: new Date(year, month - 1, i)
    });
  }
  
  // Next month days (fill to end of week)
  const totalCellsSoFar = calendarCells.length;
  const remainingCells = 7 - (totalCellsSoFar % 7);
  if (remainingCells < 7) {
    for (let i = 1; i <= remainingCells; i++) {
      calendarCells.push({
        dayNumber: i,
        isCurrentMonth: false,
        actualDate: new Date(year, month, i)
      });
    }
  }
  
  // Fill up to 42 cells if needed (6 rows)
  while (calendarCells.length < 42) {
    const lastCell = calendarCells[calendarCells.length - 1];
    const nextDate = new Date(lastCell.actualDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    calendarCells.push({
      dayNumber: nextDate.getDate(),
      isCurrentMonth: false,
      actualDate: nextDate
    });
  }
  
  // Get day data
  const getDayData = (dayNumber: number): DayData | undefined => {
    return days.find(d => {
      // Handle both number and string dates
      const dayDate = typeof d.date === 'string' ? parseInt(d.date) : d.date;
      return dayDate === dayNumber;
    });
  };
  
  return (
    <div className="p-6">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 bg-gray-200 gap-px border border-gray-200 rounded-xl shadow-sm relative z-10">
        {isLoading ? (
          // Skeleton Loading State
          Array.from({ length: 42 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="bg-white min-h-[120px] p-2 animate-pulse">
              <div className="flex justify-end mb-2">
                <div className="w-6 h-6 rounded-full bg-gray-100"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : (
          // Actual Calendar Cells
          calendarCells.map((cell, index) => {
            const dayData = cell.isCurrentMonth ? getDayData(cell.dayNumber) : undefined;
            
            // Sort entries: All-day first (by creation time), then timed (by start time)
            const sortedEntries = dayData?.entries ? [...dayData.entries].sort((a, b) => {
              // All-day events first
              if (a.isAllDay && !b.isAllDay) return -1;
              if (!a.isAllDay && b.isAllDay) return 1;
              
              // If both are all-day, sort by creation time (oldest first)
              if (a.isAllDay && b.isAllDay) {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateA - dateB;
              }
              
              // Then by start time for non-all-day events
              return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            }) : [];
            
            // Determine corner position
            let cornerPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | undefined;
            if (index === 0) cornerPosition = 'top-left';
            else if (index === 6) cornerPosition = 'top-right';
            else if (index === 35) cornerPosition = 'bottom-left'; // 6th row start
            else if (index === 41) cornerPosition = 'bottom-right'; // 6th row end
            
            return (
              <div key={index} className="@container h-full overflow-visible">
                <DayCell
                  date={cell.dayNumber}
                  month={cell.actualDate.getMonth() + 1}
                  year={cell.actualDate.getFullYear()}
                  isCurrentMonth={cell.isCurrentMonth}
                  entries={sortedEntries}
                  colorKeys={colorKeys}
                  selectedColorKeyId={selectedColorKeyId}
                  mediaUrls={dayData?.mediaUrls}
                  onDayClick={onDayClick}
                  onDateHeaderClick={onDateClick}
                  onEntryClick={onEntryClick}
                  onToggleComplete={onToggleComplete}
                  onDeleteEntry={onDeleteEntry}
                  onUpdateTitle={onUpdateTitle}
                  enableCompletion={enableCompletion}
                  enableDragAndDrop={enableDragAndDrop}
                  cornerPosition={cornerPosition}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
