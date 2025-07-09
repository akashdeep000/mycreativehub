import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, Plus, Trash2, Download, Lightbulb, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface ColorTag {
  id: string;
  color: string;
  label: string;
}

interface CalendarCell {
  date: string;
  tagId?: string;
  content: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function MonthlyContentPlanner() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [colorTags, setColorTags] = useState<ColorTag[]>([
    { id: '1', color: '#ff6b9d', label: 'Reel' },
    { id: '2', color: '#4ecdc4', label: 'Carousel' },
    { id: '3', color: '#45b7d1', label: 'Photo' },
    { id: '4', color: '#f9ca24', label: 'Promo' },
    { id: '5', color: '#6c5ce7', label: 'Story' }
  ]);
  
  const [calendarCells, setCalendarCells] = useState<CalendarCell[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: 'Set up your color tags and labels', completed: false },
    { id: '2', text: 'Apply color tags to calendar dates', completed: false },
    { id: '3', text: 'Add content notes for each day', completed: false },
    { id: '4', text: 'Review and finalize monthly plan', completed: false },
    { id: '5', text: 'Export or print your calendar', completed: false }
  ]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // Color tag management
  const addColorTag = () => {
    if (colorTags.length >= 12) {
      toast({
        title: "Maximum reached",
        description: "You can have up to 12 color tags maximum",
        variant: "destructive",
      });
      return;
    }
    
    const newTag: ColorTag = {
      id: Date.now().toString(),
      color: '#95a5a6',
      label: 'New Tag'
    };
    setColorTags([...colorTags, newTag]);
  };

  const updateColorTag = (id: string, field: keyof ColorTag, value: string) => {
    setColorTags(colorTags.map(tag => 
      tag.id === id ? { ...tag, [field]: value } : tag
    ));
  };

  const deleteColorTag = (id: string) => {
    setColorTags(colorTags.filter(tag => tag.id !== id));
    // Remove tag from calendar cells
    setCalendarCells(calendarCells.map(cell => 
      cell.tagId === id ? { ...cell, tagId: undefined } : cell
    ));
  };

  // Calendar management
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 35; i++) { // 5 weeks
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getCellContent = (date: Date): CalendarCell => {
    const dateString = date.toISOString().split('T')[0];
    const cell = calendarCells.find(cell => cell.date === dateString);
    return cell || { date: dateString, content: '' };
  };

  const updateCalendarCell = (date: Date, updates: Partial<CalendarCell>) => {
    const dateString = date.toISOString().split('T')[0];
    const existingCellIndex = calendarCells.findIndex(cell => cell.date === dateString);
    
    if (existingCellIndex >= 0) {
      const updatedCells = [...calendarCells];
      updatedCells[existingCellIndex] = { ...updatedCells[existingCellIndex], ...updates };
      setCalendarCells(updatedCells);
    } else {
      setCalendarCells([...calendarCells, { date: dateString, content: '', ...updates }]);
    }
    
    // Auto-save with debouncing
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    const timeout = setTimeout(() => {
      toast({
        title: "Auto-saved",
        description: "Your changes have been saved",
        duration: 2000,
      });
    }, 1000);
    
    setDebounceTimeout(timeout);
  };

  const handleCellClick = (date: Date) => {
    if (selectedTagId) {
      const cell = getCellContent(date);
      updateCalendarCell(date, { 
        tagId: cell.tagId === selectedTagId ? undefined : selectedTagId 
      });
    }
  };

  const handleCellMouseEnter = (date: Date) => {
    if (isDragging && selectedTagId) {
      updateCalendarCell(date, { tagId: selectedTagId });
    }
  };

  const handleMouseDown = (tagId: string) => {
    setSelectedTagId(tagId);
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleContentChange = (date: Date, content: string) => {
    updateCalendarCell(date, { content });
  };

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  // PDF Export function
  const exportToPDF = async () => {
    if (!calendarRef.current) return;
    
    setIsExporting(true);
    
    try {
      // Hide elements that shouldn't be in the PDF
      const elementsToHide = document.querySelectorAll('[data-hide-in-pdf]');
      elementsToHide.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
      
      // Create canvas from the calendar
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: calendarRef.current.scrollWidth,
        height: calendarRef.current.scrollHeight,
      });
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(`Content Planner - ${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`, 20, 20);
      
      // Add calendar image
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 250;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight);
      
      // Add color key if it fits
      if (imgHeight + 40 < 180) {
        pdf.setFontSize(14);
        pdf.text('Color Key:', 20, imgHeight + 50);
        
        let yPos = imgHeight + 60;
        colorTags.forEach((tag, index) => {
          if (yPos > 180) return; // Don't exceed page
          
          pdf.setFillColor(tag.color);
          pdf.rect(20, yPos - 3, 5, 5, 'F');
          pdf.setFontSize(12);
          pdf.text(tag.label, 30, yPos);
          yPos += 10;
        });
      }
      
      // Save PDF
      const fileName = `content-planner-${monthNames[currentMonth.getMonth()].toLowerCase()}-${currentMonth.getFullYear()}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF Downloaded",
        description: `Your content planner has been saved as ${fileName}`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error creating the PDF. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      // Restore hidden elements
      const elementsToHide = document.querySelectorAll('[data-hide-in-pdf]');
      elementsToHide.forEach(el => {
        (el as HTMLElement).style.display = '';
      });
      
      setIsExporting(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex">
      <Sidebar />
      
      <div className="flex-1 ml-0 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/content-planning')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Content Planning</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Monthly Content Planner</h1>
                <p className="text-gray-600">Plan your content with strategic color coding</p>
              </div>
            </div>
            <Button 
              onClick={exportToPDF} 
              disabled={isExporting}
              className="bg-coral-500 hover:bg-coral-600"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Generating PDF...' : 'Download as PDF'}
            </Button>
          </div>

          {/* Color Key Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>Content Color Key</span>
              </CardTitle>
              <CardDescription>
                Create and customize color tags for your content types. Click a tag to select it, then click calendar dates to apply.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                {colorTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`group p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTagId === tag.id ? 'border-gray-900 shadow-md' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                    onMouseDown={() => handleMouseDown(tag.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: tag.color }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteColorTag(tag.id);
                        }}
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      type="color"
                      value={tag.color}
                      onChange={(e) => updateColorTag(tag.id, 'color', e.target.value)}
                      className="w-full h-8 mb-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Input
                      value={tag.label}
                      onChange={(e) => updateColorTag(tag.id, 'label', e.target.value)}
                      className="text-sm"
                      placeholder="Tag name"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>
              
              {colorTags.length < 12 && (
                <Button
                  onClick={addColorTag}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Monthly Calendar */}
          <Card className="mb-8" ref={calendarRef}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Select a color tag above, then click calendar dates to apply. Drag across multiple dates for batch tagging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {dayNames.map((day) => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-50 rounded">
                    {day}
                  </div>
                ))}
              </div>
              
              <div 
                className="grid grid-cols-7 gap-1"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {getCalendarDays().map((date, index) => {
                  const cell = getCellContent(date);
                  const cellTag = colorTags.find(tag => tag.id === cell.tagId);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all ${
                        isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                      } ${isToday ? 'ring-2 ring-blue-500' : ''} hover:shadow-md`}
                      onClick={() => handleCellClick(date)}
                      onMouseEnter={() => handleCellMouseEnter(date)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {date.getDate()}
                        </span>
                        {cellTag && (
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: cellTag.color }}
                            title={cellTag.label}
                          />
                        )}
                      </div>
                      
                      {cellTag && (
                        <Badge
                          className="text-xs mb-2"
                          style={{ 
                            backgroundColor: cellTag.color,
                            color: '#fff'
                          }}
                        >
                          {cellTag.label}
                        </Badge>
                      )}
                      
                      <Textarea
                        value={cell.content}
                        onChange={(e) => handleContentChange(date, e.target.value)}
                        placeholder="Add notes..."
                        className="text-xs resize-none border-none p-0 bg-transparent focus:ring-0"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-serif">Planning Checklist</CardTitle>
              <CardDescription>Track your progress through the planning process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={item.id}
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <label
                      htmlFor={item.id}
                      className={`flex-1 cursor-pointer ${
                        item.completed ? 'line-through text-gray-500' : 'text-gray-700'
                      }`}
                    >
                      {item.text}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}