import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// Removed tabs import - monthly view only
import { Calendar as CalendarIcon, Clock, Plus, GripVertical, Palette, Trash2, HelpCircle, ChevronLeft, ChevronRight, Edit2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface ColourTag {
  id: string;
  label: string;
  colour: string;
}

interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  duration: number; // in hours
  colour: string;
  colourTagId?: string;
  day: string;
  weekKey?: string; // Legacy field - keeping for data migration
  monthKey?: string; // Format: "2025-M08" (year-month number) - only used for monthly view
}

interface TimeBlockingData {
  weeklyView: {
    blocks: TimeBlock[];
  }; // Legacy field - keeping for data compatibility
  monthlyView: {
    blocks: TimeBlock[];
    selectedMonth: string;
  };
  colourTags: ColourTag[];
}

interface TimeBlockingPlannerProps {
  templateId: number;
  initialData: TimeBlockingData;
  onSave: (data: TimeBlockingData) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

const BLOCK_COLOURS = [
  '#3B82F6', // Blue - Email Marketing
  '#10B981', // Green - Content Creation
  '#8B5CF6', // Purple - Filming
  '#F59E0B', // Orange/Yellow - Editing
  '#EF4444', // Red - Planning
  '#14B8A6', // Teal - Product Development
  '#EC4899', // Pink - Creative Time
  '#6B7280', // Gray - Additional option
];

// Color picker grid options (similar to content planner)
const COLOR_PICKER_OPTIONS = [
  '#FF6B9D', '#FF8E3C', '#FFD93D', '#6BCF7F', '#4ECDC4', 
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB6C1',
  '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#A9DFBF'
];

// New default color categories for business focus
const DEFAULT_BUSINESS_COLOR_TAGS = [
  { id: "tag-1", label: "Email Marketing", colour: "#3B82F6" }, // Blue
  { id: "tag-2", label: "Content Creation", colour: "#10B981" }, // Green
  { id: "tag-3", label: "Filming", colour: "#8B5CF6" }, // Purple
  { id: "tag-4", label: "Editing", colour: "#F59E0B" }, // Orange/Yellow
  { id: "tag-5", label: "Planning", colour: "#EF4444" }, // Red
  { id: "tag-6", label: "Product Development", colour: "#14B8A6" }, // Teal
  { id: "tag-7", label: "Creative Time", colour: "#EC4899" } // Pink
];

// Old default categories that should be replaced
const OLD_DEFAULT_CATEGORIES = [
  "Focus Time", "Communication", "Creative Work", "Planning", "Urgent"
];

export default function TimeBlockingPlanner({ templateId, initialData, onSave }: TimeBlockingPlannerProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<TimeBlockingData>(initialData);
  
  // Update component data when parent provides new data
  useEffect(() => {
    if (initialData && initialData !== data) {
      setData(initialData);
    }
  }, [initialData]);
  // Only monthly view now - removed weekly view completely
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editingTimeBlock, setEditingTimeBlock] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<TimeBlock | null>(null);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [activeColourTagId, setActiveColourTagId] = useState<string>(initialData.colourTags[0]?.id || '');
  const [isCreatingBlock, setIsCreatingBlock] = useState<{ day: string; hour: number } | null>(null);
  const [editingColourTag, setEditingColourTag] = useState<string | null>(null);
  const [newColourTagLabel, setNewColourTagLabel] = useState('');
  const [showColourSelector, setShowColourSelector] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  
  // Navigation state - monthly only
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);


  // Legacy data migration - Add monthKey to existing blocks and update color categories
  useEffect(() => {
    const currentMonthKey = getCurrentMonthKey();
    let needsMigration = false;
    
    // Check if current color tags contain unwanted content categories or old defaults
    const unwantedCategories = ['Reel', 'Carousel', 'Photo', 'Promo', 'Story'];
    let updatedColourTags = data.colourTags;
    
    const hasOldDefaults = data.colourTags.some(tag => 
      OLD_DEFAULT_CATEGORIES.includes(tag.label)
    );
    
    const hasUnwantedContentCategories = data.colourTags.some(tag => 
      unwantedCategories.includes(tag.label)
    );
    
    // If user has old defaults or unwanted content categories, replace with business-focused ones
    if (hasOldDefaults || hasUnwantedContentCategories) {
      // Filter out unwanted categories and keep only user-created ones + business defaults
      const userCreatedTags = data.colourTags.filter(tag => 
        !OLD_DEFAULT_CATEGORIES.includes(tag.label) &&
        !unwantedCategories.includes(tag.label) &&
        !tag.id.startsWith('tag-') // Exclude default business tags to avoid duplicates
      );
      
      updatedColourTags = [...DEFAULT_BUSINESS_COLOR_TAGS, ...userCreatedTags];
      needsMigration = true;
    }
    
    const migratedData = {
      ...data,
      colourTags: updatedColourTags,
      weeklyView: {
        ...data.weeklyView,
        blocks: data.weeklyView.blocks.map(block => {
          if (!block.weekKey) {
            needsMigration = true;
            return { ...block, weekKey: currentWeekKey };
          }
          return block;
        })
      },
      monthlyView: {
        ...data.monthlyView,
        blocks: data.monthlyView.blocks.map(block => {
          if (!block.monthKey) {
            needsMigration = true;
            return { ...block, monthKey: currentMonthKey };
          }
          return block;
        })
      }
    };
    
    if (needsMigration) {
      setData(migratedData);
    }
  }, []); // Run only once on component mount

  // Auto-save functionality with immediate save and cleanup
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Save immediately for critical changes, debounce for minor ones
    const shouldSaveImmediately = data.monthlyView.blocks.length > 0 || data.weeklyView.blocks.length > 0;
    
    if (shouldSaveImmediately) {
      // Save immediately when blocks exist
      onSave(data);
    } else {
      // Debounce for other changes
      timer = setTimeout(() => {
        onSave(data);
      }, 1000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [data, onSave]);
  
  // Flush any pending saves on unmount
  useEffect(() => {
    return () => {
      // Final save before component unmounts
      if (data.monthlyView.blocks.length > 0 || data.weeklyView.blocks.length > 0) {
        onSave(data);
      }
    };
  }, []);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.color-picker-container') && !target.closest('[data-color-trigger]')) {
        setShowColorPicker(null);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  // Removed weekly functions - monthly only now

  // Removed weekly key function - monthly only now

  const getCurrentMonthKey = () => {
    const today = new Date();
    today.setMonth(today.getMonth() + currentMonthOffset);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return `${year}-M${month.toString().padStart(2, '0')}`;
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getCurrentMonthDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + currentMonthOffset;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    
    return dates;
  };

  // Navigation functions - monthly only
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonthOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const goToToday = () => {
    setCurrentMonthOffset(0);
  };

  const createTimeBlock = async (day: string, hour: number, title?: string, colourTagId?: string) => {
    const useColourTagId = colourTagId || activeColourTagId;
    const selectedColourTag = data.colourTags.find(tag => tag.id === useColourTagId);
    const colour = selectedColourTag?.colour || BLOCK_COLOURS[Math.floor(Math.random() * BLOCK_COLOURS.length)];
    
    // Auto-fill with category label if no title provided
    const blockTitle = title || selectedColourTag?.label || 'Untitled';
    
    // Create temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create block for immediate UI update (optimistic)
    const newBlock: TimeBlock = {
      id: tempId,
      title: blockTitle,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      duration: 1,
      colour,
      colourTagId: useColourTagId,
      day,
      monthKey: getCurrentMonthKey()
    };

    // Update UI immediately (optimistic update)
    const updatedData = {
      ...data,
      monthlyView: {
        ...data.monthlyView,
        blocks: [...data.monthlyView.blocks, newBlock]
      }
    };
    setData(updatedData);
    setIsCreatingBlock(null);
    setNewBlockTitle('');
    
    try {
      // Save to database in background
      console.log(`🔄 Creating time block: ${blockTitle} on ${day} at ${hour}:00`);
      
      const response = await fetch('/api/time-blocking-events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: blockTitle,
          startTime: `${day}T${hour.toString().padStart(2, '0')}:00:00.000Z`,
          endTime: `${day}T${(hour + 1).toString().padStart(2, '0')}:00:00.000Z`,
          color: colour,
          colorKeyId: useColourTagId || null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      const savedEvent = await response.json();
      console.log(`✅ Event created with ID: ${savedEvent.id}`);
      
      // Update the block with real database ID - use setData callback to get current state
      setData(currentData => ({
        ...currentData,
        monthlyView: {
          ...currentData.monthlyView,
          blocks: currentData.monthlyView.blocks.map(block => 
            block.id === tempId ? { ...block, id: savedEvent.id } : block
          )
        }
      }));
      
      // Show success toast
      toast({
        title: "Saved ✓",
        description: `${blockTitle} added successfully`,
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ Failed to create time block:', error);
      toast({
        title: "Save Failed",
        description: "Could not save the time block. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateTimeBlock = async (blockId: string, updates: Partial<TimeBlock>) => {
    try {
      console.log(`🔄 Updating time block: ${blockId}`);
      
      const response = await fetch(`/api/time-blocking-events/${blockId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: updates.title,
          color: updates.colour,
          colorKeyId: updates.colourTagId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status}`);
      }

      console.log(`✅ Event updated: ${blockId}`);
      
      // Show success toast
      toast({
        title: "Saved ✓",
        description: "Time block updated successfully",
        duration: 2000
      });

      const updatedData = {
        ...data,
        monthlyView: {
          ...data.monthlyView,
          blocks: data.monthlyView.blocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
          )
        }
      };
      
      setData(updatedData);
      
    } catch (error) {
      console.error('❌ Failed to update time block:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the time block. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteTimeBlock = async (blockId: string) => {
    try {
      console.log(`🔄 Deleting time block: ${blockId}`);
      
      const response = await fetch(`/api/time-blocking-events/${blockId}`, {
        method: 'DELETE',
        headers: { 
          'Cache-Control': 'no-store'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`);
      }

      console.log(`✅ Event deleted: ${blockId}`);
      
      // Show success toast
      toast({
        title: "Deleted ✓",
        description: "Time block removed successfully",
        duration: 2000
      });

      const updatedData = {
        ...data,
        monthlyView: {
          ...data.monthlyView,
          blocks: data.monthlyView.blocks.filter(block => block.id !== blockId)
        }
      };
      
      setData(updatedData);
      
    } catch (error) {
      console.error('❌ Failed to delete time block:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the time block. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (block: TimeBlock) => {
    setDraggedBlock(block);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, day: string, hour: number) => {
    e.preventDefault();
    if (draggedBlock) {
      const updates: Partial<TimeBlock> = {
        day,
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        monthKey: getCurrentMonthKey()
      };
      updateTimeBlock(draggedBlock.id, updates);
      setDraggedBlock(null);
    }
  };

  const getBlocksForDayAndHour = (day: string, hour: number) => {
    const currentBlocks = data.monthlyView.blocks;
    const currentMonthKey = getCurrentMonthKey();
    
    return currentBlocks.filter(block => {
      // For monthly view, only show blocks with matching monthKey
      const blockMonthKey = block.monthKey || currentMonthKey; // Handle legacy data
      return block.day === day && 
             parseInt(block.startTime.split(':')[0]) === hour &&
             blockMonthKey === currentMonthKey;
    });
  };

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Colour tag management functions
  const addColourTag = () => {
    if (newColourTagLabel.trim()) {
      const newTag: ColourTag = {
        id: `tag-${Date.now()}`,
        label: newColourTagLabel.trim(),
        colour: BLOCK_COLOURS[data.colourTags.length % BLOCK_COLOURS.length]
      };

      setData(prev => ({
        ...prev,
        colourTags: [...prev.colourTags, newTag]
      }));
      setNewColourTagLabel('');
    }
  };

  const updateColourTag = (tagId: string, updates: Partial<ColourTag>) => {
    setData(prev => ({
      ...prev,
      colourTags: prev.colourTags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      )
    }));
  };

  const updateColourTagColor = (tagId: string, newColor: string) => {
    updateColourTag(tagId, { colour: newColor });
    
    // Update all blocks using this color tag
    setData(prev => ({
      ...prev,
      weeklyView: {
        ...prev.weeklyView,
        blocks: prev.weeklyView.blocks.map(block =>
          block.colourTagId === tagId ? { ...block, colour: newColor } : block
        )
      },
      monthlyView: {
        ...prev.monthlyView,
        blocks: prev.monthlyView.blocks.map(block =>
          block.colourTagId === tagId ? { ...block, colour: newColor } : block
        )
      }
    }));
    
    setShowColorPicker(null);
  };

  const deleteColourTag = (tagId: string) => {
    setData(prev => ({
      ...prev,
      colourTags: prev.colourTags.filter(tag => tag.id !== tagId),
      weeklyView: {
        ...prev.weeklyView,
        blocks: prev.weeklyView.blocks.map(block =>
          block.colourTagId === tagId ? { ...block, colourTagId: undefined } : block
        )
      },
      monthlyView: {
        ...prev.monthlyView,
        blocks: prev.monthlyView.blocks.map(block =>
          block.colourTagId === tagId ? { ...block, colourTagId: undefined } : block
        )
      }
    }));
  };

  const getColourTagLabel = (colourTagId?: string) => {
    const tag = data.colourTags.find(tag => tag.id === colourTagId);
    return tag?.label || 'Untitled';
  };

  // Handle creating block with colour selection
  const handleCreateBlockWithColour = (day: string, hour: number, colourTagId?: string) => {
    createTimeBlock(day, hour, undefined, colourTagId);
    setShowColourSelector(null);
  };

  // Inline Colour Selector Component
  const renderInlineColourSelector = (day: string, hour: number) => (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="text-xs text-gray-600 mb-2 font-medium">Select a colour category:</div>
      <div className="flex flex-col gap-1">
        {data.colourTags.map((tag) => (
          <button
            key={tag.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-50 border border-gray-200 text-left"
            onClick={() => handleCreateBlockWithColour(day, hour, tag.id)}
          >
            <div
              className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: tag.colour || tag.color || BLOCK_COLOURS[0] }}
            />
            <span className="truncate">{tag.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <button
          className="text-xs text-gray-500 hover:text-gray-700 underline"
          onClick={() => handleCreateBlockWithColour(day, hour)}
        >
          Use default colour
        </button>
      </div>
    </div>
  );

  // Colour Key Panel Component
  const renderColourKeyPanel = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5" />
          Colour Key
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Click any colour tag to activate it. When you click a calendar block, the selected tag is applied automatically with editable text.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Select a colour category, then click a calendar block to apply it. The block will auto-fill with the category name, which you can edit anytime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 items-center">
          {data.colourTags.map((tag) => {
            const isActive = activeColourTagId === tag.id;
            return (
              <div
                key={tag.id}
                className={`relative flex items-center gap-2 rounded-lg p-2 transition-all cursor-pointer group ${
                  isActive 
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-md ring-2 ring-blue-200' 
                    : 'bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => setActiveColourTagId(tag.id)}
              >
                {isActive && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                    Selected
                  </div>
                )}
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer hover:ring-2 hover:ring-gray-300 ${
                      isActive ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: tag.colour || tag.color || BLOCK_COLOURS[0] }}
                    title="Click to change color"
                    data-color-trigger
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorPicker(showColorPicker === tag.id ? null : tag.id);
                    }}
                  />
                  {/* Color Picker Grid */}
                  {showColorPicker === tag.id && (
                    <div className="color-picker-container absolute top-6 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]">
                      <div className="grid grid-cols-4 gap-3">
                        {COLOR_PICKER_OPTIONS.map((color) => (
                          <div
                            key={color}
                            className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                            style={{ backgroundColor: color }}
                            onClick={() => updateColourTagColor(tag.id, color)}
                            title={`Change to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              <div className="flex items-center gap-1">
                {editingColourTag === tag.id ? (
                  <Input
                    value={tag.label}
                    onChange={(e) => updateColourTag(tag.id, { label: e.target.value })}
                    onBlur={() => setEditingColourTag(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingColourTag(null);
                    }}
                    className="h-6 text-xs w-24"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-sm px-1">
                      {tag.label}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/20 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingColourTag(tag.id);
                      }}
                      title="Edit category name"
                    >
                      <Edit2 className="h-3 w-3 text-gray-500" />
                    </button>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteColourTag(tag.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            );
          })}
          
          {/* Add new colour tag */}
          <div className="flex items-center gap-2">
            <Input
              value={newColourTagLabel}
              onChange={(e) => setNewColourTagLabel(e.target.value)}
              placeholder="New category..."
              className="h-8 text-sm w-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addColourTag();
              }}
            />
            <Button
              size="sm"
              onClick={addColourTag}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {activeColourTagId && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-700 font-medium">
              Active Colour: <span className="text-blue-800">{getColourTagLabel(activeColourTagId)}</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              New blocks will automatically use this colour and category
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderWeeklyView = () => {
    const weekDates = getCurrentWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const weekRange = `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return (
      <div className="space-y-4">
        {/* Week Navigation Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {weekRange}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Today
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-8 gap-2 text-sm">
          <div className="font-medium text-gray-500">Time</div>
          {DAYS.map((day, index) => (
            <div key={day} className="text-center font-medium text-gray-700">
              <div>{day.slice(0, 3)}</div>
              <div className="text-xs text-gray-500">
                {weekDates[index].toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full border border-gray-200 rounded-lg bg-white shadow-sm overflow-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
              <div className="py-4 px-3 text-sm font-semibold text-gray-700 border-r border-gray-200 text-center w-20 flex-shrink-0">
                Time
              </div>
              {DAYS.map(day => (
                <div key={day} className="py-4 px-3 text-sm font-semibold text-gray-700 text-center border-r border-gray-200 last:border-r-0 min-w-[100px] max-w-[140px] flex-1">
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-8 max-h-[700px] overflow-y-auto">
              {HOURS.map(hour => [
                <div key={`time-${hour}`} className="py-4 px-3 text-sm text-gray-600 font-medium bg-gray-50 border-r border-b border-gray-200 flex items-center justify-center w-20 flex-shrink-0">
                  {formatTime(hour)}
                </div>,
              ...DAYS.map(day => (
                <div
                  key={`${day}-${hour}`}
                  className="min-h-[90px] border-r border-b border-gray-200 relative hover:bg-blue-50 transition-colors cursor-pointer group overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, hour)}
                  onClick={() => {
                    if (activeColourTagId) {
                      createTimeBlock(day, hour);
                    } else {
                      setShowColourSelector(`${day}-${hour}`);
                    }
                  }}
                >
                  {getBlocksForDayAndHour(day, hour).map(block => (
                    <div
                      key={block.id}
                      className="absolute rounded text-white text-sm font-medium cursor-move group shadow-sm overflow-hidden box-border flex items-center justify-center text-center p-2"
                      style={{ 
                        backgroundColor: block.colour, 
                        height: `${Math.max(block.duration * 80 - 8, 75)}px`,
                        width: 'calc(100% - 8px)',
                        top: '4px',
                        left: '4px',
                        right: '4px'
                      }}
                      draggable
                      onDragStart={() => handleDragStart(block)}
                      title={`${block.title}${block.colourTagId ? ` (${getColourTagLabel(block.colourTagId)})` : ''} - Click to edit`}
                    >
                      {editingBlock === block.id ? (
                        <Input
                          value={block.title}
                          onChange={(e) => updateTimeBlock(block.id, { title: e.target.value })}
                          onBlur={() => setEditingBlock(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingBlock(null);
                          }}
                          className="h-8 text-xs bg-white text-black text-center font-medium border-0 rounded-md w-full"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="cursor-pointer font-medium leading-tight hover:bg-white/10 rounded px-1 py-0.5 transition-colors text-xs w-full break-words hyphens-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBlock(block.id);
                          }}
                          title={block.title}
                        >
                          {block.title}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="flex items-center justify-center w-5 h-5 rounded text-white hover:bg-red-500/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTimeBlock(block.id);
                          }}
                          title="Delete time block"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {showColourSelector === `${day}-${hour}` && renderInlineColourSelector(day, hour)}
                </div>
              ))
            ])}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    const monthDates = getCurrentMonthDates();
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + currentMonthOffset);
    const monthName = currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });

    // Group dates by weeks
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    monthDates.forEach((date, index) => {
      if (index === 0) {
        // Add empty cells for days before the first day of the month
        const firstDayOfWeek = date.getDay();
        const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Make Monday = 0
        for (let i = 0; i < startDay; i++) {
          currentWeek.push(new Date(date.getTime() - (startDay - i) * 24 * 60 * 60 * 1000));
        }
      }

      currentWeek.push(date);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <div className="space-y-4">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {monthName}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Today
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-sm">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center font-medium text-gray-700 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="w-full border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="py-3 px-4 text-sm font-semibold text-gray-700 text-center border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.map((week, weekIndex) =>
              week.map((date, dayIndex) => {
                const today = new Date();
                const dayName = date.toLocaleDateString('en', { weekday: 'long' });
                const dateString = date.toISOString().split('T')[0];
                const isCurrentMonth = date.getMonth() === today.getMonth();
                const blocks = data.monthlyView.blocks.filter(block => block.day === dateString);

                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`min-h-[140px] border-r border-b border-gray-200 p-3 transition-colors cursor-pointer ${
                      isCurrentMonth 
                        ? 'bg-white hover:bg-blue-50' 
                        : 'bg-gray-50 text-gray-400'
                    }`}
                    onClick={() => {
                      if (isCurrentMonth) {
                        if (activeColourTagId) {
                          // Auto-create block with selected colour category
                          createTimeBlock(dateString, 9);
                        } else {
                          // Show colour selector if no colour is active
                          setShowColourSelector(`${dateString}-9`);
                        }
                      }
                    }}
                  >
                  <div className="text-sm font-semibold mb-2 text-gray-700">{date.getDate()}</div>
                  <div className="space-y-1.5">
                    {blocks.slice(0, 3).map(block => (
                      <div
                        key={block.id}
                        className="text-xs p-2 rounded text-white cursor-pointer shadow-sm hover:shadow-md transition-shadow group relative"
                        style={{ backgroundColor: block.colour || block.color || BLOCK_COLOURS[0] }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBlock(block.id);
                        }}
                        title={`${block.title} at ${block.startTime} - Click to edit`}
                      >
                        <div className="font-medium break-words hyphens-auto leading-tight">
                          {editingBlock === block.id ? (
                            <Input
                              value={block.title}
                              onChange={(e) => updateTimeBlock(block.id, { title: e.target.value })}
                              onBlur={() => setEditingBlock(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingBlock(null);
                              }}
                              className="h-6 text-xs bg-white text-black font-medium border-0 rounded w-full px-1"
                              autoFocus
                            />
                          ) : (
                            block.title
                          )}
                        </div>
                        <div className="text-xs opacity-80 mt-0.5">
                          {editingTimeBlock === block.id ? (
                            <Select
                              value={block.startTime}
                              onValueChange={(value) => {
                                updateTimeBlock(block.id, { startTime: value });
                                setEditingTimeBlock(null);
                              }}
                            >
                              <SelectTrigger className="h-5 text-xs bg-white text-black border-0 rounded w-full px-1">
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  return (
                                    <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                                      {`${hour}:00`}
                                    </SelectItem>
                                  );
                                })}
                                {Array.from({ length: 24 }, (_, i) => {
                                  const hour = i.toString().padStart(2, '0');
                                  return (
                                    <SelectItem key={`${hour}:30`} value={`${hour}:30`}>
                                      {`${hour}:30`}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span 
                              className="cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTimeBlock(block.id);
                              }}
                              title="Click to edit time"
                            >
                              {block.startTime}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="flex items-center justify-center w-4 h-4 rounded text-white hover:bg-red-500/30 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTimeBlock(block.id);
                            }}
                            title="Delete time block"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {blocks.length > 3 && (
                      <div className="text-xs text-gray-500">+{blocks.length - 3} more</div>
                    )}
                  </div>

                  {showColourSelector === `${dateString}-9` && (
                    <div className="mt-1 relative">
                      {renderInlineColourSelector(dateString, 9)}
                    </div>
                  )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
        </div>
      </div>
      
      <div className="space-y-4">
        {renderColourKeyPanel()}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Monthly Calendar
            </CardTitle>
            <CardDescription>
              Click on any date to add events and appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderMonthlyView()}
          </CardContent>
        </Card>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li className="text-[14px]">Try blocking similar tasks on the same days so your brain isn't constantly context-switching. Stay in one mode, focus deeper, and boost productivity.</li>
          <li>Use the hover menu to delete blocks</li>
        </ul>
      </div>
    </div>
  );
}