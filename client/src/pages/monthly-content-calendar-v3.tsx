import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ChevronLeft, ChevronRight, Pencil, X, Download } from 'lucide-react';
import { useDebounce } from '../hooks/use-debounce';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Query calendar data
  const { data: calendarData, isLoading, refetch } = useQuery({
    queryKey: ['/api/calendar-v3', year, month],
    queryFn: () => apiRequest(`/api/calendar-v3/${year}/${month}`),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data (v5 syntax)
    refetchOnMount: true, // Always refetch when component mounts
  });

  const colorKeys: ColorKey[] = (calendarData as any)?.colorKeys || [];
  const days: CalendarDay[] = (calendarData as any)?.days || [];

  // Debug logging
  console.log('V3Calendar - Calendar data:', calendarData);
  console.log('V3Calendar - Color keys:', colorKeys);
  console.log('V3Calendar - Color keys length:', colorKeys.length);
  console.log('V3Calendar - API response type:', typeof calendarData);
  console.log('V3Calendar - Is loading:', isLoading);

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
      toast({ title: "Calendar saved successfully", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-v3', year, month] });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({ title: "Failed to save calendar", variant: "destructive" });
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('calendar-container');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: false 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 280;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 10;
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`content-calendar-${year}-${month}.pdf`);
      toast({ title: "Calendar exported successfully!" });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Failed to export calendar", variant: "destructive" });
    }
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-gray-900">
                Monthly Content Calendar V3
              </h1>
            </div>
          </div>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
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

        {/* Color Keys */}
        <div className="bg-white rounded-lg shadow-md border-0 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Keys & Content Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {colorKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-3">
                <button
                  className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center relative"
                  style={{ backgroundColor: key.color }}
                  onClick={() => setShowColorPicker(showColorPicker === key.id ? null : key.id)}
                >
                  {selectedKeyId === key.id && (
                    <div className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-gray-400" />
                  )}
                </button>
                
                {editingKeyId === key.id ? (
                  <Input
                    value={editingKeyValue}
                    onChange={(e) => setEditingKeyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleKeyEdit(key.id, editingKeyValue);
                      if (e.key === 'Escape') {
                        setEditingKeyId(null);
                        setEditingKeyValue('');
                      }
                    }}
                    onBlur={() => handleKeyEdit(key.id, editingKeyValue)}
                    className="text-sm h-8"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span 
                      className={`text-sm font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                        selectedKeyId === key.id ? 'bg-gray-100' : ''
                      }`}
                      onClick={() => setSelectedKeyId(selectedKeyId === key.id ? null : key.id)}
                    >
                      {key.label}
                    </span>
                    <button
                      onClick={() => {
                        setEditingKeyId(key.id);
                        setEditingKeyValue(key.label);
                      }}
                      className="opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                )}

                {/* Color Picker */}
                {showColorPicker === key.id && (
                  <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 mt-2">
                    <div className="grid grid-cols-5 gap-2 w-48">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          className="w-7 h-7 rounded border-2 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            updateColorKey(key.id, { color });
                            setShowColorPicker(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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
                              className="flex items-center gap-1 group"
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colorKey?.color || '#gray' }}
                              />
                              <span className="text-xs font-medium text-gray-700 truncate flex-1">
                                {colorKey?.label || 'Unknown'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNotesPopup(`${dayNumber}-${entry.id}`);
                                  setCurrentEntryId(entry.id);
                                  setNotesValue(entry.notes);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-100 hover:bg-gray-200 rounded px-1"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEntry(dayNumber, entry.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-red-100 hover:bg-red-200 rounded px-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
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
    </div>
  );
}