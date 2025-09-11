import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Calendar, Lightbulb, Download, Edit3, Trash2, Plus, Palette, Check, Video, RefreshCw, TrendingUp, Edit2, Clock, X } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ColorTag {
  id: string;
  label: string;
  color: string;
}

interface CalendarTag {
  id: string;
  tagId: string;
  tagLabel: string;
  color: string;
  notes: string;
  time: string;
  status: 'idea' | 'in-progress' | 'scheduled' | 'posted' | null;
}

interface CalendarCell {
  date: string;
  tags: CalendarTag[];
  isBatchDay: boolean;
  batchNote: string;
}

const defaultColorTags: ColorTag[] = [
  { id: '1', label: 'Reel', color: '#FF6B9D' },
  { id: '2', label: 'Carousel', color: '#FF8E3C' },
  { id: '3', label: 'Photo', color: '#4ECDC4' },
  { id: '4', label: 'Promo', color: '#45B7D1' },
  { id: '5', label: 'Story', color: '#96CEB4' },
];

// Predefined color swatches for easier selection
const colorSwatches = [
  '#FF6B9D', '#FF8E3C', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71',
  '#1ABC9C', '#F1C40F', '#E67E22', '#8E44AD', '#3498DB',
  '#16A085', '#27AE60', '#E74C3C', '#D35400', '#8E44AD'
];

export default function MonthlyContentCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // MINIMAL STATE: Only UI controls, no data storage
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [colorPickerTagId, setColorPickerTagId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  
  // Tag notes modal state
  const [editingTag, setEditingTag] = useState<{ cellDate: string; tagId: string } | null>(null);
  const [tagNotesModal, setTagNotesModal] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [tempStatus, setTempStatus] = useState<'idea' | 'in-progress' | 'scheduled' | 'posted' | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

  // DATABASE-DRIVEN: Load calendar data from database only
  const { data: dbCalendar, isLoading, isError } = useQuery({
    queryKey: ['/api/persistent/monthly-content-calendar', year, month],
    queryFn: async () => {
      console.log('Frontend Query - Token check:', {
        tokenExists: !!localStorage.getItem('authToken'),
        tokenLength: localStorage.getItem('authToken')?.length,
        tokenPreview: localStorage.getItem('authToken')?.substring(0, 30) + '...',
        url: `/api/persistent/monthly-content-calendar/${year}/${month}`
      });
      
      const response = await fetch(`/api/persistent/monthly-content-calendar/${year}/${month}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Initializing calendar data from database:', data);
      console.log('Database calendar data type:', typeof data?.calendarData, 'value:', data?.calendarData);
      console.log('Database color tags type:', typeof data?.colorTags, 'value:', data?.colorTags);
      
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // DERIVED STATE: Get current data from database, never from local state
  const calendarData: CalendarCell[] = dbCalendar?.calendarData || [];
  const colorTags: ColorTag[] = dbCalendar?.colorTags?.length > 0 ? dbCalendar.colorTags : defaultColorTags;

  // DATABASE-ONLY SAVE: Direct database mutation with immediate refresh
  const saveCalendarMutation = useMutation({
    mutationFn: async (data: { calendarData: CalendarCell[], colorTags: ColorTag[] }) => {
      console.log('Auto-saving calendar data', {
        calendarDataLength: data.calendarData?.length || 0,
        colorTagsLength: data.colorTags?.length || 0
      });
      
      console.log('Saving calendar data to database:', {
        year,
        month,
        calendarDataArray: data.calendarData,
        calendarDataLength: data.calendarData?.length || 0,
        colorTagsArray: data.colorTags,
        colorTagsLength: data.colorTags?.length || 0
      });
      
      console.log('Frontend API - Token check:', {
        tokenExists: !!localStorage.getItem('authToken'),
        tokenLength: localStorage.getItem('authToken')?.length,
        tokenPreview: localStorage.getItem('authToken')?.substring(0, 30) + '...',
        url: '/api/persistent/monthly-content-calendar',
        method: 'PUT'
      });
      console.log('Frontend API - Authorization header added');
      
      await apiRequest('/api/persistent/monthly-content-calendar', {
        method: 'PUT',
        body: JSON.stringify({
          year,
          month,
          calendarData: data.calendarData || [],
          colorTags: data.colorTags || []
        })
      });
    },
    onSuccess: () => {
      console.log('Calendar save successful - refreshing from database');
      queryClient.invalidateQueries({ queryKey: ['/api/persistent/monthly-content-calendar', year, month] });
    },
    onError: (error: any) => {
      console.error('Calendar save error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save to database. Data may be lost.",
        variant: "destructive",
      });
    }
  });

  // DATABASE-DRIVEN: No local state initialization needed - data comes directly from database

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.color-picker') && !target.closest('.color-button')) {
        setColorPickerTagId(null);
      }
    };

    if (colorPickerTagId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [colorPickerTagId]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Convert Sunday-based (0) to Monday-based (0=Monday, 6=Sunday)
    const mondayStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < mondayStartingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Add 1 to convert from 0-indexed to 1-indexed month
    return `${year}-${month}-${day}`;
  };

  const getCellData = (day: number): CalendarCell => {
    const dateKey = getDateKey(day);
    if (!Array.isArray(calendarData)) {
      return { 
        date: dateKey, 
        tags: [],
        isBatchDay: false, 
        batchNote: '' 
      };
    }
    return calendarData.find(cell => cell.date === dateKey) || { 
      date: dateKey, 
      tags: [],
      isBatchDay: false, 
      batchNote: '' 
    };
  };

  const addTagToDate = (day: number, tagId: string) => {
    const dateKey = getDateKey(day);
    const colorTag = colorTags.find(t => t.id === tagId);
    if (!colorTag) return;

    const newTag: CalendarTag = {
      id: Math.random().toString(36).substr(2, 9),
      tagId: tagId,
      tagLabel: colorTag.label,
      color: colorTag.color,
      notes: '',
      time: '',
      status: null
    };

    console.log('DATABASE-DRIVEN: Adding tag to date:', dateKey, 'tagId:', tagId);

    // CRITICAL FIX: Get the most current data from the query result, not stale state
    const currentData = Array.isArray(calendarData) ? calendarData : [];
    console.log('Current calendar data before adding tag:', currentData.length, 'items');
    console.log('Current calendar data structure:', currentData);
    
    const existing = currentData.find(cell => cell.date === dateKey);
    
    let newCalendarData;
    if (existing) {
      newCalendarData = currentData.map(cell => 
        cell.date === dateKey 
          ? { ...cell, tags: [...cell.tags, newTag] }
          : cell
      );
    } else {
      newCalendarData = [...currentData, { 
        date: dateKey, 
        tags: [newTag], 
        isBatchDay: false, 
        batchNote: '' 
      }];
    }
    
    console.log('New calendar data after adding tag:', newCalendarData.length, 'items');
    console.log('New calendar data structure:', newCalendarData);
    
    // IMMEDIATE SAVE: Save to database immediately on tag addition
    saveCalendarMutation.mutate({ calendarData: newCalendarData, colorTags });
  };

  const removeTagFromDate = (cellDate: string, tagId: string) => {
    console.log('DATABASE-DRIVEN: Removing tag from date:', cellDate, 'tagId:', tagId);

    // IMMEDIATE DATABASE SAVE: Calculate new data and save directly
    const currentData = Array.isArray(calendarData) ? calendarData : [];
    const newCalendarData = currentData.map(cell => 
      cell.date === cellDate 
        ? { ...cell, tags: cell.tags.filter(tag => tag.id !== tagId) }
        : cell
    ).filter(cell => cell.tags.length > 0 || cell.isBatchDay); // Remove empty cells unless they're batch days
    
    // IMMEDIATE SAVE: Save to database immediately on tag removal
    saveCalendarMutation.mutate({ calendarData: newCalendarData, colorTags });
  };

  // Open tag notes modal
  const openTagNotesModal = (cellDate: string, tagId: string) => {
    const cell = calendarData.find(c => c.date === cellDate);
    const tag = cell?.tags.find(t => t.id === tagId);
    
    if (tag) {
      setEditingTag({ cellDate, tagId });
      setTempNotes(tag.notes);
      setTempTime(tag.time);
      setTempStatus(tag.status);
      setTagNotesModal(true);
    }
  };

  // Save tag notes
  const saveTagNotes = () => {
    if (!editingTag) return;

    console.log('DATABASE-DRIVEN: Saving tag notes for tag:', editingTag.tagId, 'notes:', tempNotes);

    // IMMEDIATE DATABASE SAVE: Calculate new data and save directly
    const currentData = Array.isArray(calendarData) ? calendarData : [];
    const newCalendarData = currentData.map(cell => 
      cell.date === editingTag.cellDate
        ? {
            ...cell,
            tags: cell.tags.map(tag => 
              tag.id === editingTag.tagId
                ? { ...tag, notes: tempNotes, time: tempTime, status: tempStatus }
                : tag
            )
          }
        : cell
    );
    
    // IMMEDIATE SAVE: Save to database immediately on tag notes update
    saveCalendarMutation.mutate({ calendarData: newCalendarData, colorTags });

    // Close modal and reset state
    setTagNotesModal(false);
    setEditingTag(null);
    setTempNotes('');
    setTempTime('');
    setTempStatus(null);
  };

  const updateCell = (day: number, updates: Partial<CalendarCell>) => {
    const dateKey = getDateKey(day);
    console.log('DATABASE-DRIVEN: Updating cell for date:', dateKey, 'updates:', updates);

    // IMMEDIATE DATABASE SAVE: Calculate new data and save directly
    const currentData = Array.isArray(calendarData) ? calendarData : [];
    const existing = currentData.find(cell => cell.date === dateKey);
    
    let newCalendarData;
    if (existing) {
      newCalendarData = currentData.map(cell => 
        cell.date === dateKey ? { ...cell, ...updates } : cell
      );
    } else {
      newCalendarData = [...currentData, { 
        date: dateKey, 
        tags: [],
        isBatchDay: false, 
        batchNote: '', 
        ...updates 
      }];
    }
    
    // IMMEDIATE SAVE: Save to database immediately on cell update
    saveCalendarMutation.mutate({ calendarData: newCalendarData, colorTags });
  };

  const handleCellClick = (day: number, event: React.MouseEvent) => {
    // Prevent click and drag behavior - only single clicks should add tags
    event.preventDefault();
    event.stopPropagation();
    
    if (batchMode) {
      // Handle batch day toggle
      const cellData = getCellData(day);
      const newBatchState = !cellData.isBatchDay;
      
      updateCell(day, { 
        isBatchDay: newBatchState,
        batchNote: newBatchState ? cellData.batchNote : ''
      });
      
      // Optionally focus on batch note input
      if (newBatchState) {
        setTimeout(() => {
          const noteInput = document.querySelector(`[data-day="${day}"] .batch-note-input`) as HTMLInputElement;
          if (noteInput) {
            noteInput.focus();
          }
        }, 100);
      }
    } else if (selectedTagId) {
      // Add new tag to this date (no drag behavior)
      addTagToDate(day, selectedTagId);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // getCellData function already exists earlier in the component

  // All helper functions already exist earlier in the component - removed duplicates

  const updateColorTag = (id: string, field: 'label' | 'color', value: string) => {
    console.log('DATABASE-DRIVEN: Updating color tag:', id, field, value);
    
    // IMMEDIATE DATABASE SAVE: Calculate new color tags and save directly
    const newColorTags = colorTags.map(tag => 
      tag.id === id ? { ...tag, [field]: value } : tag
    );
    
    // Update any calendar tags that use this color tag (for label/color changes)
    const newCalendarData = calendarData.map(cell => ({
      ...cell,
      tags: cell.tags.map(tag => 
        tag.tagId === id 
          ? { ...tag, tagLabel: field === 'label' ? value : tag.tagLabel, color: field === 'color' ? value : tag.color }
          : tag
      )
    }));
    
    // IMMEDIATE SAVE: Save to database immediately on color tag update
    saveCalendarMutation.mutate({ calendarData: newCalendarData, colorTags: newColorTags });
  };

  const addColorTag = () => {
    if (colorTags.length >= 12) {
      toast({
        title: "Maximum tags reached",
        description: "You can have up to 12 color tags",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    console.log('DATABASE-DRIVEN: Adding new color tag');

    const newTag: ColorTag = {
      id: Date.now().toString(),
      label: `Tag ${colorTags.length + 1}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    // IMMEDIATE DATABASE SAVE: Add new color tag and save directly
    const newColorTags = [...colorTags, newTag];
    
    // IMMEDIATE SAVE: Save to database immediately on color tag addition
    saveCalendarMutation.mutate({ calendarData, colorTags: newColorTags });
    
    setEditingTagId(newTag.id);
  };

  const deleteColorTag = (id: string) => {
    console.log('DATABASE-DRIVEN: Deleting color tag:', id);
    
    // IMMEDIATE DATABASE SAVE: Calculate new data with tag removed
    const newColorTags = colorTags.filter(tag => tag.id !== id);
    
    // Remove any calendar tags that use this deleted color tag
    const newCalendarData = calendarData.map(cell => ({
      ...cell,
      tags: cell.tags.filter(tag => tag.tagId !== id)
    }));
    
    if (selectedTagId === id) {
      setSelectedTagId(null);
    }
    
    // IMMEDIATE SAVE: Save to database immediately on color tag deletion
    saveCalendarMutation.mutate({ calendarData: newCalendarData, colorTags: newColorTags });
  };

  const exportToPDF = async () => {
    try {
      // Hide interactive elements during capture
      setColorPickerTagId(null);
      setEditingTagId(null);
      
      // Wait for any state changes to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the entire calendar container
      const element = document.getElementById('pdf-export-container');
      if (!element) {
        toast({
          title: "Export failed",
          description: "Calendar container not found",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to fit A4 landscape
      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = 210; // A4 landscape height in mm
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 3); // Extra margin for title
      
      // Calculate scaling to fit within available space
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / imgAspectRatio;
      
      // If height exceeds available space, scale down based on height
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * imgAspectRatio;
      }

      // Add title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const title = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()} Content Calendar`;
      const titleWidth = pdf.getTextWidth(title);
      const titleX = (pdfWidth - titleWidth) / 2; // Center the title
      pdf.text(title, titleX, margin + 8);

      // Add subtitle
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const subtitle = 'Generated from Creative Business Toolkit';
      const subtitleWidth = pdf.getTextWidth(subtitle);
      const subtitleX = (pdfWidth - subtitleWidth) / 2;
      pdf.text(subtitle, subtitleX, margin + 15);

      // Calculate centered position for the image
      const imgX = (pdfWidth - imgWidth) / 2;
      const imgY = margin + 20;

      // Add the calendar image
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);

      // Save the PDF
      const filename = `${monthNames[currentDate.getMonth()]}-${currentDate.getFullYear()}-content-calendar.pdf`;
      pdf.save(filename);
      
      toast({
        title: "PDF exported successfully",
        description: `${filename} has been downloaded`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your calendar to PDF. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/content-planning">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Content Planning
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Monthly Content Calendar</h1>
              <p className="text-gray-600">Visually plan your content across the month with colour-coded tags</p>
            </div>
          </div>
          <Button
            onClick={exportToPDF}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        {/* PDF Export Container - includes both Color Key and Calendar */}
        <div id="pdf-export-container">
          {/* Color Key Section */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5" />
                Colour Key
              </CardTitle>
              <CardDescription>
                Select a color category or batch mode, then click calendar dates to apply.
              </CardDescription>
            </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              {colorTags.map((tag) => {
                const isActive = selectedTagId === tag.id;
                const isColorPickerOpen = colorPickerTagId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className={`relative flex items-center gap-2 rounded-lg p-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-md ring-2 ring-blue-200' 
                        : 'bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                    }`}
                    onClick={(e) => {
                      // Only select tag if not clicking on pencil, delete, or color circle
                      const target = e.target as HTMLElement;
                      const isInteractiveElement = target.closest('.edit-button, .delete-button, .color-button, .color-picker');
                      if (!isInteractiveElement) {
                        setSelectedTagId(selectedTagId === tag.id ? null : tag.id);
                      }
                    }}
                  >
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                        Selected
                      </div>
                    )}
                    
                    {/* Color circle - clickable for color picker */}
                    <div className="relative">
                      <div
                        className={`w-4 h-4 rounded-full border transition-all cursor-pointer color-button ${
                          isActive ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: tag.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorPickerTagId(isColorPickerOpen ? null : tag.id);
                        }}
                      />
                      
                      {/* Color picker popup */}
                      {isColorPickerOpen && (
                        <div className="absolute top-6 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 color-picker">
                          <div className="grid grid-cols-5 gap-2">
                            {colorSwatches.map((color) => (
                              <div
                                key={color}
                                className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all hover:scale-110 ${
                                  tag.color === color ? 'border-gray-600 ring-2 ring-gray-300' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  updateColorTag(tag.id, 'color', color);
                                  setColorPickerTagId(null);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Tag name with pencil edit */}
                    <div className="flex items-center gap-1">
                      {editingTagId === tag.id ? (
                        <Input
                          value={tag.label}
                          onChange={(e) => updateColorTag(tag.id, 'label', e.target.value)}
                          onBlur={() => setEditingTagId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingTagId(null);
                            if (e.key === 'Escape') setEditingTagId(null);
                          }}
                          className="h-6 text-xs w-24"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="text-sm">{tag.label}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTagId(tag.id);
                            }}
                            className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 edit-button ml-1"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {/* Delete button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteColorTag(tag.id);
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 delete-button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              
              {colorTags.length < 12 && (
                <Button
                  onClick={addColorTag}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Tag
                </Button>
              )}
              
              {/* Batch Day Toggle Button */}
              <div className="border-l pl-3 ml-3">
                <Button
                  onClick={() => {
                    setBatchMode(!batchMode);
                    // Clear tag selection when entering batch mode
                    if (!batchMode) setSelectedTagId(null);
                  }}
                  variant={batchMode ? "default" : "outline"}
                  size="sm"
                  className={`${
                    batchMode 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
                      : 'text-yellow-700 border-yellow-300 hover:bg-yellow-50'
                  }`}
                >
                  {batchMode ? (
                    <>
                      <Video className="h-3 w-3 mr-1" />
                      Batch Mode Active ⏳
                    </>
                  ) : (
                    <>
                      ⏳ Batch Day
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Great for balancing post types, tracking launches, and staying consistent without the overwhelm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div id="monthly-calendar" className="bg-white rounded-lg border">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="p-3 text-center font-semibold text-gray-600 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="h-40 border-r border-b border-gray-200 last:border-r-0" />;
                  }
                  
                  const cellData = getCellData(day);
                  
                  // Determine background color - batch day gets priority
                  let backgroundColor = 'transparent';
                  if (cellData.isBatchDay) {
                    backgroundColor = '#fef3c7'; // Pastel yellow for batch days
                  }
                  
                  return (
                    <div
                      key={`day-${day}`}
                      data-day={day}
                      className={`h-40 border-r border-b border-gray-200 last:border-r-0 p-1 cursor-pointer transition-colors relative ${
                        batchMode ? 'hover:bg-yellow-50' : selectedTagId ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
                      } ${cellData.isBatchDay ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}`}
                      onClick={(e) => handleCellClick(day, e)}
                      style={{
                        backgroundColor
                      }}
                    >
                      {/* Date number and batch day indicator */}
                      <div className="absolute top-1 left-1 flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-800">{day}</span>
                        {cellData.isBatchDay && (
                          <div className="flex items-center">
                            <span className="text-xs">⏳</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Batch day controls */}
                      {cellData.isBatchDay && (
                        <div className="mt-5 mb-1 px-1">
                          <input
                            type="text"
                            value={cellData.batchNote}
                            onChange={(e) => updateCell(day, { batchNote: e.target.value })}
                            placeholder="Film 3 reels"
                            className="batch-note-input w-full text-xs bg-yellow-50 border border-yellow-200 rounded px-1 py-0.5 placeholder:text-yellow-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      
                      {/* Multiple Tags Display - stacked vertically with full names */}
                      <div className={`${cellData.isBatchDay ? 'mt-1' : 'mt-5'} px-1 space-y-0.5 overflow-y-auto max-h-32`}>
                        {cellData.tags.map((tag) => (
                          <div key={tag.id} className="group bg-white/90 rounded px-1 py-1 border border-gray-100 shadow-sm max-w-full">
                            <div className="flex items-start justify-between w-full">
                              <div className="flex items-start gap-1 flex-1 min-w-0 max-w-full overflow-hidden">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" 
                                  style={{ backgroundColor: tag.color }}
                                />
                                <div className="flex-1 min-w-0 max-w-0">
                                  <span className="text-xs font-medium text-gray-800 leading-tight block truncate">
                                    {tag.tagLabel}
                                  </span>
                                  {tag.status === 'posted' && (
                                    <Check className="w-3 h-3 text-green-600 mt-0.5" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTagNotesModal(cellData.date, tag.id);
                                  }}
                                  className="p-0.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
                                  title="Edit notes"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTagFromDate(cellData.date, tag.id);
                                  }}
                                  className="p-0.5 hover:bg-red-100 rounded text-red-600 hover:text-red-800"
                                  title="Delete tag"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Tips Bar */}
        <Card className="mt-6 border-pink-200">
          <CardHeader className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Strategic Tips
            </CardTitle>
            <CardDescription className="text-pink-100">
              Smart strategies to maximise your content's impact
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    🔁 Don't forget to repurpose! A topic that worked well on Instagram could also become an email, blog, or video.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-800 font-medium">
                    🌟 Create more of what's working. Notice patterns in posts that perform well — and lean into them.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tag Notes Modal */}
        <Dialog open={tagNotesModal} onOpenChange={setTagNotesModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit Tag Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                <Textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Add notes about this content..."
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time/Duration</label>
                <Input
                  value={tempTime}
                  onChange={(e) => setTempTime(e.target.value)}
                  placeholder="e.g., 2:30 PM, 30 seconds"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select
                  value={tempStatus || ''}
                  onValueChange={(value) => setTempStatus(value as 'idea' | 'in-progress' | 'scheduled' | 'posted' | null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea 💡</SelectItem>
                    <SelectItem value="in-progress">In Progress ✍️</SelectItem>
                    <SelectItem value="scheduled">Scheduled 📆</SelectItem>
                    <SelectItem value="posted">Posted ✅</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setTagNotesModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveTagNotes}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div> {/* End PDF Export Container */}
      </div>
    </div>
  );
}