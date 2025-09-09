import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, Pencil, X, Plus, ArrowLeft, Home, Trash2 } from 'lucide-react';
import { useDebounce } from '../hooks/use-debounce';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';

interface ColorKey {
  id: string;
  label: string;
  color: string;
}

interface CalendarEntry {
  id: string;
  colorKeyId: string;
  notes: string;
}

interface CalendarDay {
  date: number;
  entries: CalendarEntry[];
}

const COLOR_OPTIONS = [
  '#FF6B9D', '#FF8E3C', '#FFD93D', '#6BCF7F', '#4ECDC4', 
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB6C1',
  '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#A9DFBF'
];

// Simple color options for the color picker grid
const SIMPLE_COLOR_OPTIONS = [
  '#FF6B9D', '#FF8E3C', '#FFD93D', '#6BCF7F', '#4ECDC4', 
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB6C1',
  '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#A9DFBF'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyContentCalendarV3() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyValue, setEditingKeyValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [showNotesPopup, setShowNotesPopup] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#FF6B9D');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Query calendar data
  const { data: calendarData, isLoading, refetch } = useQuery({
    queryKey: ['/api/calendar-v3', year, month],
    queryFn: async () => {
      const response = await apiRequest(`/api/calendar-v3/${year}/${month}`);
      const data = await response.json();
      console.log('V3Calendar - Raw API response:', data);
      
      // Check if we need to migrate old labels
      if (data?.colorKeys && data.colorKeys.some((key: any) => 
        ['Email Marketing', 'Content Creation', 'Filming', 'Editing', 'Planning', 'Product Development', 'Creative Time'].includes(key.label)
      )) {
        console.log('V3Calendar - Migrating old labels to new content types');
        try {
          await apiRequest('/api/calendar-v3/migrate-labels', {
            method: 'POST',
            body: JSON.stringify({ year, month }),
            headers: { 'Content-Type': 'application/json' }
          });
          // Refetch data after migration
          const migratedResponse = await apiRequest(`/api/calendar-v3/${year}/${month}`);
          const migratedData = await migratedResponse.json();
          console.log('V3Calendar - Migration complete, using updated data');
          return migratedData;
        } catch (error) {
          console.error('V3Calendar - Migration failed:', error);
          return data; // Return original data if migration fails
        }
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Map colorKeys with correct property names (API returns 'colour', interface expects 'color')
  const colorKeys: ColorKey[] = ((calendarData as any)?.colorKeys || []).map((key: any) => ({
    ...key,
    color: key.colour || key.color // Handle both API response format and local format
  }));
  const days: CalendarDay[] = (calendarData as any)?.days || [];

  // Debug logging
  console.log('V3Calendar - Calendar data:', calendarData);
  console.log('V3Calendar - Color keys:', colorKeys);
  console.log('V3Calendar - Color keys length:', colorKeys.length);
  console.log('V3Calendar - API response type:', typeof calendarData);
  console.log('V3Calendar - Is loading:', isLoading);

  // Click outside effect to close color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
        setShowColorPicker(null);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  // Debounced save function
  const debouncedSave = useDebounce(() => {
    if (!calendarData) return;
    saveCalendarData.mutate({
      year,
      month,
      colorKeys: colorKeys,
      days: days
    });
  }, 1000);

  const saveCalendarData = useMutation({
    mutationFn: (data: { year: number; month: number; colorKeys: ColorKey[]; days: CalendarDay[] }) =>
      apiRequest('/api/calendar-v3', {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      // Silent save - no toast notification for cleaner UX
      // Don't invalidate query immediately to prevent race condition
      // The optimistic updates should be sufficient
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({ title: "Failed to save calendar", variant: "destructive" });
      // Only refetch on error to restore the correct state
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-v3', year, month] });
    },
  });

  // Helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to be 6, Monday = 0
  };

  const getDayData = (date: number): CalendarDay => {
    return days.find(d => d.date === date) || { date, entries: [] };
  };

  const updateColorKey = (id: string, updates: Partial<ColorKey>) => {
    const updatedColorKeys = colorKeys.map(key => 
      key.id === id ? { ...key, ...updates } : key
    );
    
    // Update the calendar data
    const updatedData = { ...(calendarData as any), colorKeys: updatedColorKeys };
    queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
    debouncedSave();
  };

  const addCalendarEntry = (date: number, colorKeyId: string) => {
    const newEntry: CalendarEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      colorKeyId,
      notes: ''
    };

    const dayIndex = days.findIndex(d => d.date === date);
    let updatedDays: CalendarDay[];

    if (dayIndex >= 0) {
      updatedDays = [...days];
      updatedDays[dayIndex] = {
        ...updatedDays[dayIndex],
        entries: [...updatedDays[dayIndex].entries, newEntry]
      };
    } else {
      updatedDays = [...days, { date, entries: [newEntry] }];
    }

    const updatedData = { ...(calendarData as any), days: updatedDays };
    queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
    debouncedSave();
  };

  const updateEntryNotes = (date: number, entryId: string, notes: string) => {
    const dayIndex = days.findIndex(d => d.date === date);
    if (dayIndex === -1) return;

    const updatedDays = [...days];
    const entryIndex = updatedDays[dayIndex].entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) return;

    updatedDays[dayIndex].entries[entryIndex].notes = notes;

    const updatedData = { ...(calendarData as any), days: updatedDays };
    queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
    debouncedSave();
  };

  const deleteEntry = (date: number, entryId: string) => {
    const dayIndex = days.findIndex(d => d.date === date);
    if (dayIndex === -1) return;

    const updatedDays = [...days];
    updatedDays[dayIndex].entries = updatedDays[dayIndex].entries.filter(e => e.id !== entryId);

    // Remove day if no entries left
    if (updatedDays[dayIndex].entries.length === 0) {
      updatedDays.splice(dayIndex, 1);
    }

    const updatedData = { ...(calendarData as any), days: updatedDays };
    queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
    debouncedSave();
  };

  // New helper functions for editing and custom tags
  const startEditingKey = (keyId: string, currentLabel: string) => {
    setEditingKeyId(keyId);
    setEditingKeyValue(currentLabel);
  };

  const saveKeyEdit = () => {
    if (editingKeyId && editingKeyValue.trim()) {
      updateColorKey(editingKeyId, { label: editingKeyValue.trim() });
      toast({ title: "Tag renamed successfully", variant: "default" });
    }
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const cancelKeyEdit = () => {
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const addNewCustomTag = () => {
    if (newTagName.trim()) {
      const newKey: ColorKey = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: newTagName.trim(),
        color: newTagColor
      };
      
      const updatedColorKeys = [...colorKeys, newKey];
      const updatedData = { ...(calendarData as any), colorKeys: updatedColorKeys };
      queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
      debouncedSave();
      
      toast({ title: "New tag created successfully", variant: "default" });
      setIsCreatingNewTag(false);
      setNewTagName('');
      setNewTagColor('#FF6B9D');
    }
  };

  const cancelNewTag = () => {
    setIsCreatingNewTag(false);
    setNewTagName('');
    setNewTagColor('#FF6B9D');
  };

  const deleteColorKey = (keyId: string) => {
    const updatedColorKeys = colorKeys.filter(key => key.id !== keyId);
    const updatedData = { ...(calendarData as any), colorKeys: updatedColorKeys };
    queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
    debouncedSave();
    toast({ title: "Tag deleted successfully", variant: "default" });
  };

  const updateColorKeyColor = (keyId: string, newColor: string) => {
    const updatedColorKeys = colorKeys.map(key => 
      key.id === keyId ? { ...key, color: newColor } : key
    );
    const updatedData = { ...(calendarData as any), colorKeys: updatedColorKeys };
    queryClient.setQueryData(['/api/calendar-v3', year, month], updatedData);
    debouncedSave();
    setShowColorPicker(null);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleKeyEdit = (keyId: string, newValue: string) => {
    if (newValue.trim()) {
      updateColorKey(keyId, { label: newValue.trim() });
    }
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const handleNotesEdit = (date: number, entryId: string, notes: string) => {
    updateEntryNotes(date, entryId, notes);
    setShowNotesPopup(null);
    setCurrentEntryId(null);
    setNotesValue('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 mb-6">
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
            onClick={() => window.location.href = '/content'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Content Creation
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-gray-900">
                Monthly Content Calendar
              </h1>
              <p className="text-gray-600 mt-1 text-base">
                Using your Content Strategy and Pillars to guide you, plan your Content Creation in one place
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-48 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Color Keys - Time Blocking Style */}
        <div className="bg-white rounded-lg shadow-md border-0 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Colour Key</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Select a colour category, then click a calendar block to apply it. This block will auto-fill with the category name, which you can edit anytime.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Color keys with inline editing */}
            {colorKeys.map((colorKey) => (
              <div
                key={colorKey.id}
                className={`group relative flex items-center gap-2 rounded-lg p-2 transition-all cursor-pointer ${
                  selectedKeyId === colorKey.id 
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-md ring-2 ring-blue-200' 
                    : 'bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => editingKeyId !== colorKey.id && setSelectedKeyId(selectedKeyId === colorKey.id ? null : colorKey.id)}
              >
                {selectedKeyId === colorKey.id && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                    Selected
                  </div>
                )}
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer hover:ring-2 hover:ring-gray-300 ${
                      selectedKeyId === colorKey.id ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: colorKey.color }}
                    title="Click to change color"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorPicker(showColorPicker === colorKey.id ? null : colorKey.id);
                    }}
                  />
                  {/* Simple Color Grid */}
                  {showColorPicker === colorKey.id && (
                    <div className="color-picker-container absolute top-6 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]">
                      <div className="grid grid-cols-4 gap-3">
                        {SIMPLE_COLOR_OPTIONS.map((color) => (
                          <div
                            key={color}
                            className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                            style={{ backgroundColor: color }}
                            onClick={() => updateColorKeyColor(colorKey.id, color)}
                            title={`Change to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {editingKeyId === colorKey.id ? (
                  <Input
                    value={editingKeyValue}
                    onChange={(e) => setEditingKeyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveKeyEdit();
                      if (e.key === 'Escape') cancelKeyEdit();
                    }}
                    onBlur={saveKeyEdit}
                    className="text-sm font-medium h-7 w-24"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-sm font-medium">{colorKey.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingKey(colorKey.id, colorKey.label);
                      }}
                      className="ml-2 hover:bg-gray-200 rounded p-1"
                      title="Edit tag name"
                    >
                      <Pencil className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteColorKey(colorKey.id);
                      }}
                      className="ml-1 hover:bg-red-100 rounded p-1"
                      title="Delete tag"
                    >
                      <X className="w-3 h-3 text-gray-500 hover:text-red-600" />
                    </button>
                  </>
                )}
              </div>
            ))}
            
            {/* Add new custom tag */}
            {isCreatingNewTag ? (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg p-2 bg-green-50 border-2 border-green-500 shadow-md">
                  <div className="relative">
                    <div
                      className="w-4 h-4 rounded-full border border-green-400 cursor-pointer hover:ring-2 hover:ring-green-300"
                      style={{ backgroundColor: newTagColor }}
                      onClick={() => setShowColorPicker(showColorPicker === 'newTag' ? null : 'newTag')}
                      title="Click to change color"
                    />
                    {/* Simple Color Grid for new tag */}
                    {showColorPicker === 'newTag' && (
                      <div className="color-picker-container absolute top-6 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]">
                        <div className="grid grid-cols-4 gap-3">
                          {SIMPLE_COLOR_OPTIONS.map((color: string) => (
                            <div
                              key={color}
                              className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                setNewTagColor(color);
                                setShowColorPicker(null);
                              }}
                              title={`Change to ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addNewCustomTag();
                      if (e.key === 'Escape') cancelNewTag();
                    }}
                    placeholder="Tag name"
                    className="text-sm font-medium h-7 w-24"
                    autoFocus
                  />
                  <button
                    onClick={addNewCustomTag}
                    className="text-green-600 hover:text-green-800"
                    title="Save new tag"
                  >
                    ✓
                  </button>
                  <button
                    onClick={cancelNewTag}
                    className="text-gray-400 hover:text-gray-600"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Color picker for new tag */}
                {showColorPicker === 'newTag' && (
                  <div className="color-picker-container absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border p-3 z-10 min-w-[180px]">
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-md hover:scale-110 transition-transform ${
                            newTagColor === color 
                              ? 'ring-2 ring-blue-500 ring-offset-1' 
                              : 'hover:shadow-md'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                          title={`Select ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingNewTag(true)}
                className="flex items-center gap-1 rounded-lg p-2 bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-gray-600 hover:text-gray-800"
                title="Add new custom tag"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Tip Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Note:</span> Within your calendar, you can edit each entry to add additional information. To quickly view it, simply hover over each element you've added.
          </p>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-md border-0 p-6" id="calendar-container">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: totalCells }, (_, index) => {
              const dayNumber = index - firstDayOfWeek + 1;
              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
              const dayData = isValidDay ? getDayData(dayNumber) : null;

              return (
                <div
                  key={index}
                  className={`
                    min-h-32 border border-gray-200 rounded-lg p-2
                    ${isValidDay ? 'bg-white hover:bg-gray-50' : 'bg-gray-100'}
                    ${isValidDay && selectedKeyId ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => {
                    if (isValidDay && selectedKeyId) {
                      addCalendarEntry(dayNumber, selectedKeyId);
                    }
                  }}
                >
                  {isValidDay && (
                    <>
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        {dayNumber}
                      </div>
                      <div className="space-y-1">
                        {dayData?.entries.map((entry) => {
                          const colorKey = colorKeys.find(k => k.id === entry.colorKeyId);
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center gap-1 group relative"
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colorKey?.color || '#gray' }}
                              />
                              <span className="text-xs font-medium text-gray-700 flex-1 break-words">
                                {colorKey?.label || 'Unknown'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNotesPopup(`${dayNumber}-${entry.id}`);
                                  setCurrentEntryId(entry.id);
                                  setNotesValue(entry.notes);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-100 hover:bg-gray-200 rounded px-1 ml-1"
                                title="Edit notes"
                              >
                                <Pencil className="w-3 h-3 text-gray-500" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEntry(dayNumber, entry.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-red-100 hover:bg-red-200 rounded px-1 ml-1"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </button>
                              {/* Custom instant tooltip */}
                              {entry.notes && (
                                <div className="absolute left-0 bottom-full mb-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-md shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-sm border border-gray-700">
                                  Notes: {entry.notes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes Dialog */}
        <Dialog open={!!showNotesPopup} onOpenChange={() => setShowNotesPopup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Content Notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add notes about this content..."
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNotesPopup(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  if (showNotesPopup && currentEntryId) {
                    const date = parseInt(showNotesPopup.split('-')[0]);
                    handleNotesEdit(date, currentEntryId, notesValue);
                  }
                }}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        <MobileNav />
      </div>
    </div>
  );
}