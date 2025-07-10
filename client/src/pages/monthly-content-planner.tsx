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

interface BatchingRow {
  id: string;
  postTitle: string;
  pillar: string;
  type: string;
  caption: string;
  cta: string;
  visual: string;
  status: string;
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

  // Content batching table data
  const [batchingData, setBatchingData] = useState<BatchingRow[]>([
    { id: '1', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '2', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '3', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '4', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
    { id: '5', postTitle: '', pillar: '', type: '', caption: '', cta: '', visual: '', status: '' },
  ]);

  // Custom dropdown options state
  const [customPillars, setCustomPillars] = useState<string[]>([]);
  const [customPostTypes, setCustomPostTypes] = useState<string[]>([]);
  const [showCustomPillarInput, setShowCustomPillarInput] = useState<string | null>(null);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState<string | null>(null);
  const [customPillarValue, setCustomPillarValue] = useState('');
  const [customTypeValue, setCustomTypeValue] = useState('');

  // Default options
  const defaultPillars = [
    "Behind the scenes",
    "Tips & advice", 
    "Motivation",
    "Education",
    "Personal story",
    "Product feature",
    "Community"
  ];

  const defaultPostTypes = [
    "Reel",
    "Carousel", 
    "Photo",
    "Story",
    "IGTV",
    "Live"
  ];

  // New tag input state
  const [newTagLabel, setNewTagLabel] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

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

  // Load custom options from localStorage on mount
  useEffect(() => {
    const savedPillars = localStorage.getItem('customContentPillars');
    const savedTypes = localStorage.getItem('customPostTypes');
    
    if (savedPillars) {
      setCustomPillars(JSON.parse(savedPillars));
    }
    if (savedTypes) {
      setCustomPostTypes(JSON.parse(savedTypes));
    }
  }, []);

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

    if (!newTagLabel.trim()) {
      toast({
        title: "Tag name required",
        description: "Please enter a name for the new tag",
        variant: "destructive",
      });
      return;
    }
    
    const availableColors = ['#EC4899', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#6B7280', '#14B8A6'];
    const newTag: ColorTag = {
      id: Date.now().toString(),
      color: availableColors[colorTags.length % availableColors.length],
      label: newTagLabel.trim()
    };
    setColorTags([...colorTags, newTag]);
    setNewTagLabel('');
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

  // Custom dropdown functions
  const addCustomPillar = (rowId: string) => {
    if (customPillarValue.trim()) {
      const newPillars = [...customPillars, customPillarValue.trim()];
      setCustomPillars(newPillars);
      updateBatchingData(rowId, 'pillar', customPillarValue.trim());
      setCustomPillarValue('');
      setShowCustomPillarInput(null);
      localStorage.setItem('customContentPillars', JSON.stringify(newPillars));
      toast({
        title: "Custom pillar added",
        description: `"${customPillarValue.trim()}" has been added to your options`,
        duration: 2000,
      });
    }
  };

  const addCustomType = (rowId: string) => {
    if (customTypeValue.trim()) {
      const newTypes = [...customPostTypes, customTypeValue.trim()];
      setCustomPostTypes(newTypes);
      updateBatchingData(rowId, 'type', customTypeValue.trim());
      setCustomTypeValue('');
      setShowCustomTypeInput(null);
      localStorage.setItem('customPostTypes', JSON.stringify(newTypes));
      toast({
        title: "Custom type added",
        description: `"${customTypeValue.trim()}" has been added to your options`,
        duration: 2000,
      });
    }
  };

  const handleCustomPillarKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomPillar(rowId);
    } else if (e.key === 'Escape') {
      setShowCustomPillarInput(null);
      setCustomPillarValue('');
    }
  };

  const handleCustomTypeKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomType(rowId);
    } else if (e.key === 'Escape') {
      setShowCustomTypeInput(null);
      setCustomTypeValue('');
    }
  };

  // Batching data management
  const updateBatchingData = (id: string, field: keyof BatchingRow, value: string) => {
    setBatchingData(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    
    // Auto-save with debouncing
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    const timeout = setTimeout(() => {
      toast({
        title: "Auto-saved",
        description: "Your content ideas have been saved",
        duration: 2000,
      });
    }, 1000);
    
    setDebounceTimeout(timeout);
  };

  const addBatchingRow = () => {
    const newRow: BatchingRow = {
      id: Date.now().toString(),
      postTitle: '',
      pillar: '',
      type: '',
      caption: '',
      cta: '',
      visual: '',
      status: ''
    };
    setBatchingData([...batchingData, newRow]);
  };

  const deleteBatchingRow = (id: string) => {
    setBatchingData(prev => prev.filter(row => row.id !== id));
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

          {/* Content Batching Table - Lightweight Spreadsheet Style */}
          <div className="mb-6 bg-pink-50 rounded-lg p-4 border border-pink-100">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-1">Content Batching Space</h3>
              <p className="text-sm text-gray-600">
                Use this batching space to map out what you'll create before plugging your content into the calendar below.
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-700 p-3 border-r border-gray-200">Post Title</th>
                    <th className="text-left text-sm font-medium text-gray-700 p-3 border-r border-gray-200">Content Pillar</th>
                    <th className="text-left text-sm font-medium text-gray-700 p-3 border-r border-gray-200">Post Type</th>
                    <th className="text-left text-sm font-medium text-gray-700 p-3 border-r border-gray-200">CTA</th>
                    <th className="text-left text-sm font-medium text-gray-700 p-3 border-r border-gray-200">Notes</th>
                    <th className="text-center text-sm font-medium text-gray-700 p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {batchingData.map((row, index) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 border-r border-gray-100">
                        <Input
                          value={row.postTitle}
                          onChange={(e) => updateBatchingData(row.id, 'postTitle', e.target.value)}
                          placeholder="Post title..."
                          className="border-none bg-transparent p-0 focus:ring-0 text-sm"
                        />
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        {showCustomPillarInput === row.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customPillarValue}
                              onChange={(e) => setCustomPillarValue(e.target.value)}
                              onKeyDown={(e) => handleCustomPillarKeyDown(e, row.id)}
                              placeholder="Type custom pillar..."
                              className="border-none bg-transparent p-0 focus:ring-0 text-sm flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => addCustomPillar(row.id)}
                              className="h-5 w-5 p-0 bg-green-500 hover:bg-green-600 text-white"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowCustomPillarInput(null);
                                setCustomPillarValue('');
                              }}
                              className="h-5 w-5 p-0 bg-gray-400 hover:bg-gray-500 text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <select
                            value={row.pillar}
                            onChange={(e) => {
                              if (e.target.value === '+ Add Custom Type') {
                                setShowCustomPillarInput(row.id);
                                setCustomPillarValue('');
                              } else {
                                updateBatchingData(row.id, 'pillar', e.target.value);
                              }
                            }}
                            className="w-full border-none bg-transparent p-0 focus:ring-0 text-sm"
                          >
                            <option value="">Select pillar...</option>
                            {defaultPillars.map((pillar) => (
                              <option key={pillar} value={pillar}>{pillar}</option>
                            ))}
                            {customPillars.length > 0 && (
                              <optgroup label="Custom Pillars">
                                {customPillars.map((pillar) => (
                                  <option key={pillar} value={pillar} className="font-medium">
                                    {pillar}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="+ Add Custom Type" className="text-blue-600 font-medium">
                              + Add Custom Type
                            </option>
                          </select>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        {showCustomTypeInput === row.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customTypeValue}
                              onChange={(e) => setCustomTypeValue(e.target.value)}
                              onKeyDown={(e) => handleCustomTypeKeyDown(e, row.id)}
                              placeholder="Type custom type..."
                              className="border-none bg-transparent p-0 focus:ring-0 text-sm flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => addCustomType(row.id)}
                              className="h-5 w-5 p-0 bg-green-500 hover:bg-green-600 text-white"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowCustomTypeInput(null);
                                setCustomTypeValue('');
                              }}
                              className="h-5 w-5 p-0 bg-gray-400 hover:bg-gray-500 text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <select
                            value={row.type}
                            onChange={(e) => {
                              if (e.target.value === '+ Add Custom Type') {
                                setShowCustomTypeInput(row.id);
                                setCustomTypeValue('');
                              } else {
                                updateBatchingData(row.id, 'type', e.target.value);
                              }
                            }}
                            className="w-full border-none bg-transparent p-0 focus:ring-0 text-sm"
                          >
                            <option value="">Select type...</option>
                            {defaultPostTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            {customPostTypes.length > 0 && (
                              <optgroup label="Custom Types">
                                {customPostTypes.map((type) => (
                                  <option key={type} value={type} className="font-medium">
                                    {type}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="+ Add Custom Type" className="text-blue-600 font-medium">
                              + Add Custom Type
                            </option>
                          </select>
                        )}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <Input
                          value={row.cta}
                          onChange={(e) => updateBatchingData(row.id, 'cta', e.target.value)}
                          placeholder="Call to action..."
                          className="border-none bg-transparent p-0 focus:ring-0 text-sm"
                        />
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <Textarea
                          value={row.caption}
                          onChange={(e) => updateBatchingData(row.id, 'caption', e.target.value)}
                          placeholder="Notes..."
                          className="border-none bg-transparent p-0 focus:ring-0 resize-none text-sm"
                          rows={1}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteBatchingRow(row.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                <Button
                  onClick={addBatchingRow}
                  variant="outline"
                  size="sm"
                  className="text-pink-600 border-pink-200 hover:bg-pink-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More
                </Button>
              </div>
            </div>
          </div>

          {/* Clean Color Key Section - Time Blocking Style */}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteColorTag(tag.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
                
                {/* Add new color tag */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="New category..."
                    className="h-8 text-sm w-32"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addColorTag();
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={addColorTag}
                    className="h-8 px-3 bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Category
                  </Button>
                </div>
              </div>
              
              {selectedTagId && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium">
                    Active Color: <span className="text-blue-800">{colorTags.find(t => t.id === selectedTagId)?.label}</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Click calendar dates to apply this color tag
                  </div>
                </div>
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