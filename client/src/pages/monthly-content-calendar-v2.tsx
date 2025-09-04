import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  X, 
  Check,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import BackToDashboard from '@/components/BackToDashboard';

// Types
interface ColorKey {
  id: string;
  label: string;
  color: string;
}

interface CalendarEntry {
  id: string;
  keyId: string;
  label: string;
  color: string;
  notes: string;
}

interface DayData {
  date: string;
  entries: CalendarEntry[];
}

interface CalendarData {
  id?: number;
  userId: string;
  year: number;
  month: number;
  colorKeys: ColorKey[];
  days: DayData[];
}

// Available colors for color picker
const AVAILABLE_COLORS = [
  '#FF6B9D', '#FF8E3C', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
  '#F1948A', '#AED6F1', '#A9DFBF', '#F9E79F', '#D2B4DE',
  '#FADBD8', '#D5DBDB', '#AEB6BF', '#85929E', '#566573'
];

// Default color keys
const DEFAULT_COLOR_KEYS: ColorKey[] = [
  { id: '1', label: 'Reel', color: '#FF6B9D' },
  { id: '2', label: 'Email', color: '#FF8E3C' },
  { id: '3', label: 'Blog Post', color: '#4ECDC4' },
  { id: '4', label: 'Social Media', color: '#45B7D1' },
  { id: '5', label: 'Content Planning', color: '#96CEB4' }
];

export default function MonthlyContentCalendarV2() {
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Query calendar data
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['/api/calendar-v2', year, month],
    queryFn: () => apiRequest(`/api/calendar-v2/${year}/${month}`),
  });

  // Save calendar mutation
  const saveCalendarMutation = useMutation({
    mutationFn: (data: Partial<CalendarData>) => 
      apiRequest('/api/calendar-v2', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-v2', year, month] });
      toast({ title: 'Calendar saved successfully' });
    },
    onError: (error) => {
      console.error('Calendar save error:', error);
      toast({ title: 'Failed to save calendar', variant: 'destructive' });
    }
  });

  // Get current calendar data or use defaults
  const currentCalendarData: CalendarData = {
    userId: (calendarData as any)?.userId || '',
    year,
    month,
    colorKeys: Array.isArray((calendarData as any)?.colorKeys) && (calendarData as any).colorKeys.length > 0 
      ? (calendarData as any).colorKeys 
      : DEFAULT_COLOR_KEYS,
    days: Array.isArray((calendarData as any)?.days) ? (calendarData as any).days : []
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Save data to database
  const saveCalendarData = (updatedData: Partial<CalendarData>) => {
    const dataToSave = {
      ...currentCalendarData,
      ...updatedData,
      year,
      month
    };
    
    console.log('Frontend saveCalendarData - Data being sent:', {
      year: dataToSave.year,
      month: dataToSave.month,
      colorKeysCount: Array.isArray(dataToSave.colorKeys) ? dataToSave.colorKeys.length : 0,
      daysCount: Array.isArray(dataToSave.days) ? dataToSave.days.length : 0,
      fullData: dataToSave
    });
    
    saveCalendarMutation.mutate(dataToSave);
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Color key functions
  const updateColorKey = (keyId: string, updates: Partial<ColorKey>) => {
    const updatedKeys = currentCalendarData.colorKeys.map(key =>
      key.id === keyId ? { ...key, ...updates } : key
    );
    saveCalendarData({ colorKeys: updatedKeys });
  };

  const handleKeyLabelEdit = (keyId: string) => {
    const key = currentCalendarData.colorKeys.find(k => k.id === keyId);
    if (key) {
      setEditingKeyId(keyId);
      setEditingKeyValue(key.label);
    }
  };

  const saveKeyLabelEdit = () => {
    if (editingKeyId && editingKeyValue.trim()) {
      updateColorKey(editingKeyId, { label: editingKeyValue.trim() });
    }
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const cancelKeyLabelEdit = () => {
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const handleColorChange = (keyId: string, color: string) => {
    updateColorKey(keyId, { color });
    setShowColorPicker(null);
  };

  // Calendar entry functions
  const addEntryToDay = (day: number) => {
    if (!selectedKeyId) return;

    const selectedKey = currentCalendarData.colorKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    const dateStr = `${year}-${month}-${day}`;
    const newEntry: CalendarEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyId: selectedKey.id,
      label: selectedKey.label,
      color: selectedKey.color,
      notes: ''
    };

    const updatedDays = [...currentCalendarData.days];
    const dayIndex = updatedDays.findIndex(d => d.date === dateStr);

    if (dayIndex >= 0) {
      updatedDays[dayIndex].entries.push(newEntry);
    } else {
      updatedDays.push({
        date: dateStr,
        entries: [newEntry]
      });
    }

    saveCalendarData({ days: updatedDays });
  };

  const removeEntryFromDay = (dayDate: string, entryId: string) => {
    const updatedDays = currentCalendarData.days.map(day => {
      if (day.date === dayDate) {
        return {
          ...day,
          entries: day.entries.filter(entry => entry.id !== entryId)
        };
      }
      return day;
    }).filter(day => day.entries.length > 0);

    saveCalendarData({ days: updatedDays });
  };

  const updateEntryNotes = (dayDate: string, entryId: string, notes: string) => {
    const updatedDays = currentCalendarData.days.map(day => {
      if (day.date === dayDate) {
        return {
          ...day,
          entries: day.entries.map(entry =>
            entry.id === entryId ? { ...entry, notes } : entry
          )
        };
      }
      return day;
    });

    saveCalendarData({ days: updatedDays });
  };

  const openNotesPopup = (entryId: string) => {
    const entry = currentCalendarData.days
      .flatMap(day => day.entries)
      .find(e => e.id === entryId);
    
    if (entry) {
      setNotesValue(entry.notes);
      setShowNotesPopup(entryId);
    }
  };

  const saveNotesPopup = () => {
    if (!showNotesPopup) return;

    const dayWithEntry = currentCalendarData.days.find(day =>
      day.entries.some(entry => entry.id === showNotesPopup)
    );

    if (dayWithEntry) {
      updateEntryNotes(dayWithEntry.date, showNotesPopup, notesValue);
    }

    setShowNotesPopup(null);
    setNotesValue('');
  };

  // Get entries for a specific day
  const getEntriesForDay = (day: number): CalendarEntry[] => {
    const dateStr = `${year}-${month}-${day}`;
    const dayData = currentCalendarData.days.find(d => d.date === dateStr);
    return dayData?.entries || [];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 max-w-full overflow-x-hidden">
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackToDashboard />
          </div>
          <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            📅
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold text-gray-900">
              Monthly Content Calendar
            </h1>
            <p className="text-gray-600">Plan and organize your content strategy</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Color Keys */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Types</h3>
          <div className="flex flex-wrap gap-3">
            {currentCalendarData.colorKeys.map((key) => (
              <div
                key={key.id}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                  selectedKeyId === key.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedKeyId(selectedKeyId === key.id ? null : key.id)}
              >
                {/* Color dot */}
                <button
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: key.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColorPicker(showColorPicker === key.id ? null : key.id);
                  }}
                />
                
                {/* Label */}
                {editingKeyId === key.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingKeyValue}
                      onChange={(e) => setEditingKeyValue(e.target.value)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveKeyLabelEdit();
                        if (e.key === 'Escape') cancelKeyLabelEdit();
                      }}
                      autoFocus
                    />
                    <button onClick={saveKeyLabelEdit} className="text-green-600 hover:text-green-700">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelKeyLabelEdit} className="text-gray-600 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">{key.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKeyLabelEdit(key.id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Color picker */}
                {showColorPicker === key.id && (
                  <div className="absolute z-10 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="grid grid-cols-5 gap-2">
                      {AVAILABLE_COLORS.map((color) => (
                        <button
                          key={color}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorChange(key.id, color)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 border-b border-gray-200">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] border-b border-r border-gray-200 p-2 ${
                  day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-25'
                }`}
                onClick={() => day && selectedKeyId && addEntryToDay(day)}
              >
                {day && (
                  <>
                    <div className="text-sm font-semibold text-gray-900 mb-2">{day}</div>
                    <div className="space-y-1">
                      {getEntriesForDay(day).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between group bg-gray-50 rounded px-2 py-1"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-gray-700 truncate">{entry.label}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openNotesPopup(entry.id);
                              }}
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEntryFromDay(`${year}-${month}-${day}`, entry.id);
                              }}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes Popup */}
        {showNotesPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Notes</h3>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add details, time, content ideas..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowNotesPopup(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotesPopup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  );
}