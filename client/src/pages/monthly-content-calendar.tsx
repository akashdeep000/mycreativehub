import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Calendar, Lightbulb, Download, Edit3, Trash2, Plus, Palette } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ColorTag {
  id: string;
  label: string;
  color: string;
}

interface CalendarCell {
  date: string;
  content: string;
  tagId: string | null;
}

const defaultColorTags: ColorTag[] = [
  { id: '1', label: 'Reel', color: '#FF6B9D' },
  { id: '2', label: 'Carousel', color: '#FF8E3C' },
  { id: '3', label: 'Photo', color: '#4ECDC4' },
  { id: '4', label: 'Promo', color: '#45B7D1' },
  { id: '5', label: 'Story', color: '#96CEB4' },
];

export default function MonthlyContentCalendar() {
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [colorTags, setColorTags] = useState<ColorTag[]>(defaultColorTags);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarCell[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Load calendar data from localStorage
  useEffect(() => {
    const savedCalendar = localStorage.getItem('monthly-content-calendar');
    const savedTags = localStorage.getItem('monthly-content-calendar-tags');
    
    if (savedCalendar) {
      setCalendarData(JSON.parse(savedCalendar));
    }
    
    if (savedTags) {
      setColorTags(JSON.parse(savedTags));
    }
  }, []);

  // Save calendar data to localStorage
  useEffect(() => {
    localStorage.setItem('monthly-content-calendar', JSON.stringify(calendarData));
  }, [calendarData]);

  useEffect(() => {
    localStorage.setItem('monthly-content-calendar-tags', JSON.stringify(colorTags));
  }, [colorTags]);

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
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
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
    const month = currentDate.getMonth();
    return `${year}-${month}-${day}`;
  };

  const getCellData = (day: number) => {
    const dateKey = getDateKey(day);
    return calendarData.find(cell => cell.date === dateKey) || { date: dateKey, content: '', tagId: null };
  };

  const updateCell = (day: number, updates: Partial<CalendarCell>) => {
    const dateKey = getDateKey(day);
    setCalendarData(prev => {
      const existing = prev.find(cell => cell.date === dateKey);
      if (existing) {
        return prev.map(cell => 
          cell.date === dateKey ? { ...cell, ...updates } : cell
        );
      } else {
        return [...prev, { date: dateKey, content: '', tagId: null, ...updates }];
      }
    });
  };

  const handleCellClick = (day: number) => {
    if (selectedTagId) {
      updateCell(day, { tagId: selectedTagId });
    }
  };

  const handleMouseDown = (day: number) => {
    if (selectedTagId) {
      setIsDragging(true);
      updateCell(day, { tagId: selectedTagId });
    }
  };

  const handleMouseEnter = (day: number) => {
    if (isDragging && selectedTagId) {
      updateCell(day, { tagId: selectedTagId });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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

  const updateColorTag = (id: string, field: 'label' | 'color', value: string) => {
    setColorTags(prev => 
      prev.map(tag => 
        tag.id === id ? { ...tag, [field]: value } : tag
      )
    );
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

    const newTag: ColorTag = {
      id: Date.now().toString(),
      label: `Tag ${colorTags.length + 1}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    setColorTags(prev => [...prev, newTag]);
    setEditingTagId(newTag.id);
  };

  const deleteColorTag = (id: string) => {
    setColorTags(prev => prev.filter(tag => tag.id !== id));
    setCalendarData(prev => prev.map(cell => 
      cell.tagId === id ? { ...cell, tagId: null } : cell
    ));
    if (selectedTagId === id) {
      setSelectedTagId(null);
    }
  };

  const exportToPDF = async () => {
    try {
      const element = document.getElementById('monthly-calendar');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add title
      pdf.setFontSize(20);
      pdf.text(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()} Content Calendar`, 20, 20);

      // Add calendar
      pdf.addImage(imgData, 'PNG', 0, 30, imgWidth, imgHeight - 30);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${monthNames[currentDate.getMonth()]}-${currentDate.getFullYear()}-content-calendar.pdf`);
      
      toast({
        title: "PDF exported successfully",
        description: "Your content calendar has been downloaded",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your calendar to PDF",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/content-planning">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Content Planning
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monthly Content Calendar</h1>
              <p className="text-gray-600 mt-1">Visually plan your content across the month with colour-coded tags</p>
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

        {/* Color Key Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5" />
              Color Key
            </CardTitle>
            <CardDescription>
              Select a color category, then click calendar dates to apply it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              {colorTags.map((tag) => {
                const isActive = selectedTagId === tag.id;
                return (
                  <div
                    key={tag.id}
                    className={`relative flex items-center gap-2 rounded-lg p-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-md ring-2 ring-blue-200' 
                        : 'bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                  >
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                        Selected
                      </div>
                    )}
                    <div
                      className={`w-4 h-4 rounded-full border transition-all ${
                        isActive ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: tag.color }}
                    />
                    {editingTagId === tag.id ? (
                      <Input
                        value={tag.label}
                        onChange={(e) => updateColorTag(tag.id, 'label', e.target.value)}
                        onBlur={() => setEditingTagId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingTagId(null);
                        }}
                        className="h-6 text-xs w-24"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-sm cursor-pointer hover:bg-gray-100 px-1 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTagId(tag.id);
                        }}
                      >
                        {tag.label}
                      </span>
                    )}
                    <input
                      type="color"
                      value={tag.color}
                      onChange={(e) => updateColorTag(tag.id, 'color', e.target.value)}
                      className="w-6 h-6 rounded border-none cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteColorTag(tag.id);
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
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
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center font-semibold text-gray-600 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7" onMouseUp={handleMouseUp}>
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={index} className="h-24 border-r border-b last:border-r-0" />;
                  }
                  
                  const cellData = getCellData(day);
                  const tag = cellData.tagId ? colorTags.find(t => t.id === cellData.tagId) : null;
                  
                  return (
                    <div
                      key={day}
                      className={`h-24 border-r border-b last:border-r-0 p-1 cursor-pointer transition-colors ${
                        selectedTagId ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleCellClick(day)}
                      onMouseDown={() => handleMouseDown(day)}
                      onMouseEnter={() => handleMouseEnter(day)}
                      style={{
                        backgroundColor: tag ? `${tag.color}20` : 'transparent'
                      }}
                    >
                      <div className="flex justify-between items-start h-full">
                        <span className="text-sm font-medium text-gray-700">{day}</span>
                        {tag && (
                          <div
                            className="w-3 h-3 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                      </div>
                      
                      {/* Content area */}
                      <div className="mt-1">
                        <Textarea
                          value={cellData.content}
                          onChange={(e) => updateCell(day, { content: e.target.value })}
                          placeholder="Add notes..."
                          className="w-full h-12 text-xs border-none bg-transparent p-0 resize-none focus:ring-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}