import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CalendarEntry, ColorKey, MediaItem } from '../calendar-types';
import CalendarEntryCard from '../calendar-entry-card';
import MediaLightbox from '../media-lightbox';



interface MediaItemProps {
  url: string;
  onClick: () => void;
}

function MediaItem({ url, onClick }: MediaItemProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      className="relative w-full aspect-video rounded-md overflow-hidden border border-gray-200 bg-gray-50 group/media cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      ) : (
        <img
          src={url}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          alt="Event media"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
      
      {!isLoading && !hasError && (
        <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors pointer-events-none" />
      )}
    </div>
  );
}

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
  // showMedia = false,
  showNotes = false,
  enableCompletion,
  enableDragAndDrop,
  cornerPosition,
}: DayCellProps) {
  
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleMediaClick = (url: string) => {
    // Construct a temporary MediaItem from the URL
    // Since we only have the URL here, we'll make a best guess for other fields
    const fileName = url.split('/').pop() || 'Media';
    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
    
    const item: MediaItem = {
      id: 0, // Temporary ID
      eventId: '', // Not needed for display
      mediaType: isVideo ? 'video' : 'image',
      fileName: fileName,
      fileSize: 0, // Unknown
      objectPath: url,
      displayOrder: 0,
      createdAt: new Date().toISOString()
    };
    
    setSelectedMedia(item);
    setIsLightboxOpen(true);
  };
  
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
      onClick={(e) => {
          e.stopPropagation();
          if (isCurrentMonth && selectedColorKeyId) {
            onDayClick(date);
          }
      }}
      className={`
        h-[250px] p-1.5 @[150px]:p-3 flex flex-col relative transition-all duration-200 group
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
        {/* View Details Hint */}
        {isCurrentMonth && (
          <div className="hidden @[45px]:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mr-auto">
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden @[110px]:inline text-xs font-medium text-gray-600">
              View day
            </span>
          </div>
        )}

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
      </div>
      
      {/* Content Area - Click to add entry */}
      <div
        className={`
          flex-1 flex flex-col transition-all duration-150 overflow-y-auto
          ${isCurrentMonth && selectedColorKeyId
            ? 'cursor-pointer hover:bg-gray-50 rounded-lg -mx-1 px-1 py-0.5' 
            : ''
          }
        `}
        title={isCurrentMonth && selectedColorKeyId ? "Click to add event" : ""}
      >
        
        {/* Entries */}
        <div className="space-y-1 flex-1">
          {entries.slice(0, 3).map((entry) => {
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
          
          {entries.length > 3 && (
            <div 
              className="text-xs text-gray-500 font-medium pl-1 hover:text-blue-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrentMonth && onDateHeaderClick) {
                  onDateHeaderClick(date);
                }
              }}
            >
              + {entries.length - 3} more
            </div>
          )}
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

        {/* Media preview (at bottom) */}
        {mediaUrls && mediaUrls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-2">
            {mediaUrls.map((url, i) => (
              <MediaItem 
                key={i} 
                url={url} 
                onClick={() => handleMediaClick(url)}
              />
            ))}
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


      <MediaLightbox
        item={selectedMedia}
        isOpen={isLightboxOpen}
        onClose={() => {
          setIsLightboxOpen(false);
          setSelectedMedia(null);
        }}
      />
    </div>
  );
}
