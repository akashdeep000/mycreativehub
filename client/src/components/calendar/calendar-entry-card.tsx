import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarEntry, ColorKey, getEntryDisplayTitle } from '../calendar/calendar-types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalendarEntryCardProps {
  entry: CalendarEntry;
  colorKey?: ColorKey;
  variant?: 'content' | 'time_blocking';
  enableCompletion?: boolean;
  enableDrag?: boolean;
  
  // Callbacks
  onToggleComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdateTitle?: (newTitle: string) => void;
}

export default function CalendarEntryCard({
  entry,
  colorKey,
  variant = 'content',
  enableCompletion = true,
  enableDrag = false,
  onToggleComplete,
  onEdit,
  onDelete,
  onUpdateTitle
}: CalendarEntryCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(entry.title || colorKey?.label || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Update local state when entry changes
  useEffect(() => {
    if (!isEditingTitle) {
      setEditedTitle(entry.title || colorKey?.label || '');
    }
  }, [entry.title, colorKey?.label, isEditingTitle]);
  
  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);
  
  const handleTitleSave = () => {
    // If title is empty, revert to default label or keep empty? 
    // User wants default to be color key label.
    const newTitle = editedTitle.trim() || colorKey?.label || '';
    
    if (newTitle !== entry.title) {
      onUpdateTitle?.(newTitle);
    }
    setIsEditingTitle(false);
  };
  
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(entry.title || colorKey?.label || '');
      setIsEditingTitle(false);
    }
  };

  const displayText = entry.title || colorKey?.label || 'Untitled';
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entry },
    disabled: !enableDrag
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  } : undefined;
  
  const isOptimistic = entry.id.toString().startsWith('temp-');
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={enableDrag && !isOptimistic ? setNodeRef : undefined}
          style={{
            ...style,
            backgroundColor: variant === 'time_blocking' && !isDragging 
              ? (colorKey?.color || '#3B82F6') 
              : undefined
          }}
          {...(enableDrag && !isOptimistic ? attributes : {})}
          {...(enableDrag && !isOptimistic ? listeners : {})}
          className={`
            group/card relative flex flex-col @[120px]:flex-row @[120px]:items-center gap-0.5 @[120px]:gap-1 px-1 py-1 @[120px]:px-1.5 rounded-lg border transition-all duration-200 hover:z-[9999]
            ${isDragging ? 'ring-2 ring-blue-500 bg-blue-50 z-50 shadow-xl scale-105' : 'hover:shadow-md hover:-translate-y-0.5'}
            ${variant === 'time_blocking' 
              ? `border-transparent text-white shadow-sm ${entry.completed ? 'opacity-75 grayscale-[0.5]' : ''}`
              : entry.completed ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-100 shadow-sm'
            }
            ${isOptimistic ? 'opacity-70 cursor-wait' : ''}
          `}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        >
          {/* Header Row (Icons + Actions for State 3) */}
          <div className="flex items-center justify-between w-full @[120px]:w-auto">
            
            {/* Icons Group */}
            <div className="flex flex-col @[45px]:flex-row items-center gap-0.5 @[45px]:gap-1">
              {/* Drag handle */}
              {enableDrag && !isOptimistic && (
                <div className={`cursor-grab active:cursor-grabbing ${variant === 'time_blocking' ? 'text-white/50 hover:text-white' : 'text-gray-300 hover:text-gray-500'}`}>
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              )}
              
              {isOptimistic && (
                 <div className="animate-pulse">
                   <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                 </div>
              )}
              
              {/* Color Indicator (Content) or Checkbox (Time Blocking) */}
              {enableCompletion && (
                variant === 'time_blocking' ? (
                  <div
                    className={`
                      w-3.5 h-3.5 rounded border flex items-center justify-center cursor-pointer transition-all duration-200
                      ${entry.completed 
                        ? 'bg-white/30 border-white/50 text-white' 
                        : 'bg-white border-gray-300 hover:border-gray-400'
                      }
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete?.();
                    }}
                    title={entry.completed ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {entry.completed && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div
                    className={`
                      w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer transition-all duration-200 relative
                      ${entry.completed ? 'ring-2 ring-gray-200' : 'hover:scale-110'}
                    `}
                    style={{ backgroundColor: entry.completed ? '#9CA3AF' : (colorKey?.color || '#3B82F6') }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete?.();
                    }}
                    title={entry.completed ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {entry.completed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Actions (State 3: 72px-120px) - Visible on hover */}
            <div className={`hidden @[72px]:group-hover/card:flex @[120px]:group-hover/card:hidden items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md px-1 shadow-sm border border-gray-100 ml-auto ${isOptimistic ? '!hidden' : ''}`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors rounded hover:bg-gray-100"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Title Area */}
          <div className="flex-1 min-w-0 w-full">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="w-full px-1 py-0.5 text-xs font-medium text-gray-700 bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder={colorKey?.label || 'Event title'}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className={`
                  text-xs font-medium leading-tight overflow-hidden px-1 py-0.5 rounded transition-colors
                  line-clamp-1
                  ${entry.completed ? (variant === 'time_blocking' ? 'text-gray-200 line-through' : 'text-gray-400 line-through') : (variant === 'time_blocking' ? 'text-white' : 'text-gray-700')}
                  @[72px]:cursor-text @[72px]:hover:bg-black/5
                `}
                onClick={(e) => {
                  // Only allow inline editing when edit buttons exist (≥72px)
                  // For <72px, let the click propagate to open the edit dialog
                  const target = e.currentTarget;
                  const containerWidth = target.closest('[class*="group/card"]')?.getBoundingClientRect().width || 0;
                  if (containerWidth >= 72) {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }
                }}
                title="Click to edit title"
              >
                {displayText}
              </div>
            )}
            
            {/* Time display for time blocking events on larger widths */}
            {variant === 'time_blocking' && !entry.isAllDay && (
              <div className="hidden @[120px]:block text-[10px] pl-1 text-white/80">
                {new Date(entry.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(entry.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Actions (State 4: >120px) - Absolute positioned overlay, hidden when editing */}
          {!isEditingTitle && (
            <div className="hidden @[120px]:flex absolute right-1 top-1/2 -translate-y-1/2 items-center gap-1 bg-white/90 backdrop-blur-sm rounded shadow-sm border border-gray-100 px-1 py-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors rounded hover:bg-gray-100"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-0.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            </div>
          )}
        </div>
      </TooltipTrigger>
      
      <TooltipContent 
        className="bg-gray-900/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl border-none max-w-[200px] break-words"
        side="top"
        align="start"
      >
        {/* Time/All-Day Indicator */}
        <div className="font-semibold text-blue-200 mb-1">
          {entry.isAllDay ? (
            "All Day"
          ) : (
            `${new Date(entry.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(entry.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          )}
        </div>

        {/* Description */}
        {entry.description && (
          <>
            <p className="font-medium mb-0.5 text-gray-300">Description</p>
            {entry.description}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
