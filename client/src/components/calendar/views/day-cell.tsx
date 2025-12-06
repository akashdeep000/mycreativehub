import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CalendarEntry, ColorKey } from '../calendar-types';
import CalendarEntryCard from '../calendar-entry-card';

interface DayCellProps {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  entries: CalendarEntry[];
  colorKeys: ColorKey[];
  dayNotes?: string;
  mediaUrls?: string[];
  selectedColorKeyId?: string | null;
  
  // Callbacks
  onDayClick: (date: number) => void;
  onDateHeaderClick?: (date: number) => void; // New: Navigate to daily view
  onEntryClick: (entry: CalendarEntry) => void;
  onToggleComplete: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateTitle?: (entryId: string, newTitle: string) => void;
  
  // Corner position for rounding
  cornerPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  // Feature flags
  showMedia?: boolean;
  showNotes?: boolean;
  enableCompletion?: boolean;
  enableDragAndDrop?: boolean;
}

export default function DayCell({
  date,
  month,
  year,
  isCurrentMonth,
  entries,
  colorKeys,
  dayNotes,
  mediaUrls = [],
  selectedColorKeyId,
  onDayClick,
  onDateHeaderClick,
  onEntryClick,
  onToggleComplete,
  onDeleteEntry,
  onUpdateTitle,
  showMedia = false,
  showNotes = false,
  enableCompletion,
  enableDragAndDrop,
  cornerPosition,
}: DayCellProps) {
  
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  
  // Configure droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${year}-${month}-${date}`,
    data: { date, month, year },
    disabled: !enableDragAndDrop || !isCurrentMonth
  });
  
  const isToday = new Date().toDateString() === new Date(year, month - 1, date).toDateString();

  // Determine rounding classes based on corner position
  const roundingClasses = [
    cornerPosition === 'top-left' && 'rounded-tl-xl',
    cornerPosition === 'top-right' && 'rounded-tr-xl',
    cornerPosition === 'bottom-left' && 'rounded-bl-xl',
    cornerPosition === 'bottom-right' && 'rounded-br-xl',
  ].filter(Boolean).join(' ');

  // Only apply overflow-hidden on corner cells to clip date header but allow tooltips on other cells
  const overflowClass = cornerPosition ? 'overflow-hidden' : '';

  return (
    <div
      ref={enableDragAndDrop && isCurrentMonth ? setNodeRef : undefined}
      className={`
        h-full min-h-[100px] @[150px]:min-h-[140px] p-1.5 @[150px]:p-3 flex flex-col relative transition-all duration-200 group
        ${roundingClasses}
        ${overflowClass}
        ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/30'}
        ${isOver ? 'bg-blue-50/50 ring-2 ring-blue-400 ring-inset z-20' : ''}
      `}
    >
      {/* Date Header - Click to navigate to daily view */}
      <div 
        className={`
          flex items-center justify-between mb-1 @[150px]:mb-2 -mx-1.5 -mt-1.5 @[150px]:-mx-3 @[150px]:-mt-3 px-1.5 py-1.5 @[150px]:px-3 @[150px]:py-2.5 transition-all duration-200
          ${isCurrentMonth 
            ? 'cursor-pointer hover:bg-gray-100/80' 
            : ''
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (isCurrentMonth && onDateHeaderClick) {
            onDateHeaderClick(date);
          }
        }}
        title={isCurrentMonth ? "View full day schedule" : ""}
      >
        <span 
          className={`
            text-xs @[150px]:text-sm font-semibold w-6 h-6 @[150px]:w-8 @[150px]:h-8 flex items-center justify-center rounded-full transition-all duration-200
            ${isToday 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
              : isCurrentMonth 
                ? 'text-gray-800 group-hover:bg-gray-200' 
                : 'text-gray-400'
            }
          `}
        >
          {date}
        </span>
        
        {/* View Details Hint */}
        {isCurrentMonth && (
          <div className="hidden @[45px]:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden @[110px]:inline text-xs font-medium text-gray-600">
              View day
            </span>
          </div>
        )}
      </div>
      
      {/* Content Area - Click to add entry */}
      <div
        className={`
          flex-1 flex flex-col transition-all duration-150
          ${isCurrentMonth && selectedColorKeyId
            ? 'cursor-pointer hover:bg-gray-50 rounded-lg -mx-1 px-1 py-0.5' 
            : ''
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (isCurrentMonth && selectedColorKeyId) {
            onDayClick(date);
          }
        }}
        title={isCurrentMonth && selectedColorKeyId ? "Click to add event" : ""}
      >
        {/* Media preview (if enabled) */}
        {showMedia && mediaUrls.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {mediaUrls.slice(0, 3).map((url, i) => (
              <img
                key={i}
                src={url}
                className="w-12 h-12 object-cover rounded"
                alt={`Media ${i + 1}`}
              />
            ))}
            {mediaUrls.length > 3 && (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                +{mediaUrls.length - 3}
              </div>
            )}
          </div>
        )}
        
        {/* Entries */}
        <div className="space-y-1 flex-1">
          {entries.map((entry) => {
            const colorKey = colorKeys.find(k => k.id === entry.colorKeyId);
            return (
              <div key={entry.id} className="@container">
                <CalendarEntryCard
                  entry={entry}
                  colorKey={colorKey}
                  variant={entry.type === 'time_blocking' ? 'time_blocking' : 'content'}
                  enableCompletion={enableCompletion}
                  enableDrag={enableDragAndDrop}
                  onToggleComplete={() => onToggleComplete(entry.id)}
                  onEdit={() => onEntryClick(entry)}
                  onDelete={() => onDeleteEntry(entry.id)}
                  onUpdateTitle={(newTitle) => onUpdateTitle?.(entry.id, newTitle)}
                />
              </div>
            );
          })}
        </div>
        
        {/* Add Entry Hint (when empty and color key selected) */}
        {isCurrentMonth && entries.length === 0 && selectedColorKeyId && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50px] gap-1.5 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden @[85px]:inline text-xs font-medium text-gray-500">
              Click to add
            </span>
          </div>
        )}
        
        {/* Day notes (if enabled) - Show on hover */}
        {showNotes && dayNotes && (
          <div className="mt-2 pt-2 border-t border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-gray-600 italic line-clamp-2">
              {dayNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
