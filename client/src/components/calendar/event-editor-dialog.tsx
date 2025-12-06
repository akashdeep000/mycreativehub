import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlignLeft, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { CalendarEntry, ColorKey, getEntryDisplayTitle, getSmartDefaultTimes, getToggleOffDefaultTimes, getAllDayEventTimes } from './calendar-types';
import { cn } from '@/lib/utils';

interface EventEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<CalendarEntry>) => void;
  onDelete?: (entryId: string) => void;
  initialDate?: Date;
  initialEntry?: CalendarEntry;
  colorKeys: ColorKey[];
}

export default function EventEditorDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  initialEntry,
  colorKeys
}: EventEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [selectedColorKeyId, setSelectedColorKeyId] = useState<string>('');
  const [completed, setCompleted] = useState(false);

  // Initialize state when dialog opens or props change
  useEffect(() => {
    if (isOpen) {
      const { defaultStart, defaultEnd } = getSmartDefaultTimes(initialDate);

      if (initialEntry) {
        setTitle(initialEntry.title || '');
        setIsAllDay(initialEntry.isAllDay || false);
        setCompleted(initialEntry.completed || false);
        
        // Extract time from Date objects if they exist
        if (initialEntry.startTime && initialEntry.endTime) {
          const start = new Date(initialEntry.startTime);
          const end = new Date(initialEntry.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            setStartTime(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`);
            setEndTime(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`);
          } else {
            // Fallback to defaults if dates are invalid
            setStartTime(defaultStart);
            setEndTime(defaultEnd);
          }
        } else {
          // Fallback to defaults if times are missing
          setStartTime(defaultStart);
          setEndTime(defaultEnd);
        }
        
        setNotes(initialEntry.description || '');
        setSelectedColorKeyId(initialEntry.colorKeyId || (colorKeys[0]?.id || ''));
        setTitleManuallyEdited(false); // Reset for each dialog session
      } else {
        // New entry defaults
        const defaultKeyId = colorKeys[0]?.id || '';
        const defaultKey = colorKeys.find(k => k.id === defaultKeyId);
        setTitle(defaultKey?.label || '');
        setTitleManuallyEdited(false);
        setIsAllDay(false);
        
        setStartTime(defaultStart);
        setEndTime(defaultEnd);
        setNotes('');
        setSelectedColorKeyId(defaultKeyId);
        setCompleted(false);
      }
    }
  }, [isOpen, initialEntry, colorKeys, initialDate]);

  // Auto-update title when color key changes (only if not manually edited)
  useEffect(() => {
    if (!titleManuallyEdited && selectedColorKeyId) {
      const selectedKey = colorKeys.find(k => k.id === selectedColorKeyId);
      if (selectedKey) {
        setTitle(selectedKey.label);
      }
    }
  }, [selectedColorKeyId, colorKeys, titleManuallyEdited]);

  const handleSave = () => {
    if (!selectedColorKeyId) return;

    const selectedKey = colorKeys.find(k => k.id === selectedColorKeyId);
    const finalTitle = title.trim() || selectedKey?.label || 'Untitled';

    // Parse times to Date objects
    let startDate: Date | undefined = initialDate;
    let endDate: Date | undefined = initialDate;
    
    if (!isAllDay && startTime && endTime && initialDate) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      
      startDate = new Date(initialDate);
      startDate.setHours(startHours, startMinutes, 0, 0);
      
      endDate = new Date(initialDate);
      endDate.setHours(endHours, endMinutes, 0, 0);
    } else if (isAllDay) {
      // For all-day events, use centralized helper
      if (initialDate) {
        const times = getAllDayEventTimes(initialDate);
        startDate = times.startTime;
        endDate = times.endTime;
      }
    }


    const entryData: Partial<CalendarEntry> = {
      title: finalTitle,
      description: notes,
      colorKeyId: selectedColorKeyId,
      isAllDay,
      startTime: startDate,
      endTime: endDate,
      completed,
    };
    
    // If editing existing, include ID
    if (initialEntry) {
      entryData.id = initialEntry.id;
    }

    onSave(entryData);
    onClose();
  };

  const selectedColorKey = colorKeys.find(k => k.id === selectedColorKeyId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            {initialEntry ? 'Edit Event' : 'New Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Event Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Event Type</Label>
            <Select value={selectedColorKeyId} onValueChange={setSelectedColorKeyId}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: selectedColorKey?.color || '#ccc' }} 
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {colorKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              id="title"
              value={title || selectedColorKey?.label}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleManuallyEdited(true);
              }}
              placeholder={selectedColorKey?.label || 'Event title'}
              className="text-base"
            />
          </div>

          {/* Completion Checkbox */}
          <div className="flex items-center justify-between">
            <Label htmlFor="completed" className="text-sm font-medium text-gray-700">Mark as completed</Label>
            <Switch
              id="completed"
              checked={completed}
              onCheckedChange={setCompleted}
            />
          </div>

          {/* Time Section */}
          <div className="flex gap-4 items-start">
            <Clock className="w-5 h-5 text-gray-400 mt-2.5" />
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="all-day" className="text-sm font-medium text-gray-700">All day</Label>
                <Switch
                  id="all-day"
                  checked={isAllDay}
                  onCheckedChange={(checked) => {
                    setIsAllDay(checked);
                    if (!checked) {
                      // If turning off all-day, use consistent 9AM-10AM defaults
                      const { defaultStart, defaultEnd } = getToggleOffDefaultTimes();
                      setStartTime(defaultStart);
                      setEndTime(defaultEnd);
                    }
                  }}
                />
              </div>

              {!isAllDay && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Select
                    value={startTime}
                    onValueChange={(newStartTime) => {
                      setStartTime(newStartTime);
                      
                      // Auto-adjust end time if it becomes invalid
                      if (newStartTime && endTime) {
                        const [startH, startM] = newStartTime.split(':').map(Number);
                        const [endH, endM] = endTime.split(':').map(Number);
                        
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = endH * 60 + endM;
                        
                        if (startMinutes >= endMinutes) {
                          // Default to 1 hour duration
                          const newEndMinutes = startMinutes + 60;
                          const newEndH = Math.floor(newEndMinutes / 60) % 24;
                          const newEndM = newEndMinutes % 60;
                          setEndTime(`${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-[130px] sm:w-[140px]">
                      <SelectValue placeholder="Start time" />
                    </SelectTrigger>
                    <SelectContent className="h-[200px]">
                      {generateTimeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-gray-400">-</span>

                  <Select
                    value={endTime}
                    onValueChange={setEndTime}
                  >
                    <SelectTrigger className="w-[130px] sm:w-[140px]">
                      {endTime ? (
                        <span>
                          {generateTimeOptions().find(o => o.value === endTime)?.label || endTime}
                        </span>
                      ) : (
                        <span className="text-gray-500">End time</span>
                      )}
                    </SelectTrigger>
                    <SelectContent className="h-[200px]">
                      {generateTimeOptions().map((option) => {
                        const [startH, startM] = startTime.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const isDisabled = option.minutes <= startMinutes;
                        
                        let label = option.label;
                        if (!isDisabled) {
                          const durationMinutes = option.minutes - startMinutes;
                          const hours = Math.floor(durationMinutes / 60);
                          const mins = durationMinutes % 60;
                          
                          let durationLabel = '';
                          if (hours > 0) durationLabel += `${hours} hr`;
                          if (mins > 0) durationLabel += ` ${mins} min`;
                          
                          if (durationLabel) label += ` (${durationLabel.trim()})`;
                        }

                        return (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            disabled={isDisabled}
                            className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* Duration Label */}
                  <div className="text-sm text-gray-500 font-medium whitespace-nowrap min-w-[60px]">
                    {(() => {
                      if (!startTime || !endTime) return null;
                      const [startH, startM] = startTime.split(':').map(Number);
                      const [endH, endM] = endTime.split(':').map(Number);
                      const startMinutes = startH * 60 + startM;
                      const endMinutes = endH * 60 + endM;
                      const duration = endMinutes - startMinutes;
                      
                      if (duration <= 0) return null;
                      
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      
                      const parts = [];
                      if (hours > 0) parts.push(`${hours} hr`);
                      if (minutes > 0) parts.push(`${minutes} min`);
                      
                      return parts.join(' ');
                    })()}
                  </div>
                </div>
              )}
              
              {initialDate && (
                <div className="text-sm text-gray-500 font-medium">
                  {initialDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="flex gap-4 items-start">
            <AlignLeft className="w-5 h-5 text-gray-400 mt-2.5" />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add description"
              className="flex-1 min-h-[100px] resize-none bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex flex-row items-center justify-between sm:justify-between">
          {initialEntry && onDelete ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (confirm('Are you sure you want to delete this event?')) {
                  onDelete(initialEntry.id);
                  onClose();
                }
              }}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          ) : <div />} {/* Spacer */}
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selectedColorKeyId}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to generate time options
const generateTimeOptions = () => {
  const options = [];
  for (let i = 0; i < 24 * 60; i += 15) {
    const hours = Math.floor(i / 60);
    const minutes = i % 60;
    const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const label = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    options.push({ value, label, minutes: i });
  }
  return options;
};
