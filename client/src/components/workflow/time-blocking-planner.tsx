import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, Plus, Edit2, X, GripVertical, Palette, Trash2, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface ColorTag {
  id: string;
  label: string;
  color: string;
}

interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  duration: number; // in hours
  color: string;
  colorTagId?: string;
  day: string;
}

interface TimeBlockingData {
  weeklyView: {
    blocks: TimeBlock[];
  };
  monthlyView: {
    blocks: TimeBlock[];
    selectedMonth: string;
  };
  colorTags: ColorTag[];
}

interface TimeBlockingPlannerProps {
  templateId: number;
  initialData: TimeBlockingData;
  onSave: (data: TimeBlockingData) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

const BLOCK_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#6B7280', // Gray
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export default function TimeBlockingPlanner({ templateId, initialData, onSave }: TimeBlockingPlannerProps) {
  const [data, setData] = useState<TimeBlockingData>(initialData);
  const [activeView, setActiveView] = useState<'weekly' | 'monthly'>('weekly');
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<TimeBlock | null>(null);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [activeColorTagId, setActiveColorTagId] = useState<string>(initialData.colorTags[0]?.id || '');
  const [isCreatingBlock, setIsCreatingBlock] = useState<{ day: string; hour: number } | null>(null);
  const [editingColorTag, setEditingColorTag] = useState<string | null>(null);
  const [newColorTagLabel, setNewColorTagLabel] = useState('');
  const [showColorSelector, setShowColorSelector] = useState<string | null>(null);
  
  // Navigation state
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);


  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(data);
    }, 1000);
    return () => clearTimeout(timer);
  }, [data, onSave]);

  const getCurrentWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Apply week offset
    monday.setDate(monday.getDate() + (currentWeekOffset * 7));
    
    return DAYS.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
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

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonthOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const goToToday = () => {
    setCurrentWeekOffset(0);
    setCurrentMonthOffset(0);
  };

  const createTimeBlock = (day: string, hour: number, title?: string, colorTagId?: string) => {
    const useColorTagId = colorTagId || activeColorTagId;
    const selectedColorTag = data.colorTags.find(tag => tag.id === useColorTagId);
    const color = selectedColorTag?.color || BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    
    // Auto-fill with category label if no title provided
    const blockTitle = title || selectedColorTag?.label || 'Untitled';
    
    const newBlock: TimeBlock = {
      id: `block-${Date.now()}`,
      title: blockTitle,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      duration: 1,
      color,
      colorTagId: useColorTagId,
      day
    };

    setData(prev => ({
      ...prev,
      [activeView === 'weekly' ? 'weeklyView' : 'monthlyView']: {
        ...prev[activeView === 'weekly' ? 'weeklyView' : 'monthlyView'],
        blocks: [...prev[activeView === 'weekly' ? 'weeklyView' : 'monthlyView'].blocks, newBlock]
      }
    }));

    setIsCreatingBlock(null);
    setNewBlockTitle('');
    onSave(data);
  };

  const updateTimeBlock = (blockId: string, updates: Partial<TimeBlock>) => {
    setData(prev => ({
      ...prev,
      [activeView === 'weekly' ? 'weeklyView' : 'monthlyView']: {
        ...prev[activeView === 'weekly' ? 'weeklyView' : 'monthlyView'],
        blocks: prev[activeView === 'weekly' ? 'weeklyView' : 'monthlyView'].blocks.map(block =>
          block.id === blockId ? { ...block, ...updates } : block
        )
      }
    }));
  };

  const deleteTimeBlock = (blockId: string) => {
    setData(prev => ({
      ...prev,
      [activeView === 'weekly' ? 'weeklyView' : 'monthlyView']: {
        ...prev[activeView === 'weekly' ? 'weeklyView' : 'monthlyView'],
        blocks: prev[activeView === 'weekly' ? 'weeklyView' : 'monthlyView'].blocks.filter(block => block.id !== blockId)
      }
    }));
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
      updateTimeBlock(draggedBlock.id, {
        day,
        startTime: `${hour.toString().padStart(2, '0')}:00`
      });
      setDraggedBlock(null);
    }
  };

  const getBlocksForDayAndHour = (day: string, hour: number) => {
    const currentBlocks = activeView === 'weekly' ? data.weeklyView.blocks : data.monthlyView.blocks;
    return currentBlocks.filter(block => 
      block.day === day && 
      parseInt(block.startTime.split(':')[0]) === hour
    );
  };

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Color tag management functions
  const addColorTag = () => {
    if (newColorTagLabel.trim()) {
      const newTag: ColorTag = {
        id: `tag-${Date.now()}`,
        label: newColorTagLabel.trim(),
        color: BLOCK_COLORS[data.colorTags.length % BLOCK_COLORS.length]
      };

      setData(prev => ({
        ...prev,
        colorTags: [...prev.colorTags, newTag]
      }));
      setNewColorTagLabel('');
    }
  };

  const updateColorTag = (tagId: string, updates: Partial<ColorTag>) => {
    setData(prev => ({
      ...prev,
      colorTags: prev.colorTags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      )
    }));
  };

  const deleteColorTag = (tagId: string) => {
    setData(prev => ({
      ...prev,
      colorTags: prev.colorTags.filter(tag => tag.id !== tagId),
      weeklyView: {
        ...prev.weeklyView,
        blocks: prev.weeklyView.blocks.map(block =>
          block.colorTagId === tagId ? { ...block, colorTagId: undefined } : block
        )
      },
      monthlyView: {
        ...prev.monthlyView,
        blocks: prev.monthlyView.blocks.map(block =>
          block.colorTagId === tagId ? { ...block, colorTagId: undefined } : block
        )
      }
    }));
  };

  const getColorTagLabel = (colorTagId?: string) => {
    const tag = data.colorTags.find(tag => tag.id === colorTagId);
    return tag?.label || 'Untitled';
  };

  // Handle creating block with color selection
  const handleCreateBlockWithColor = (day: string, hour: number, colorTagId?: string) => {
    createTimeBlock(day, hour, undefined, colorTagId);
    setShowColorSelector(null);
  };

  // Inline Color Selector Component
  const renderInlineColorSelector = (day: string, hour: number) => (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="text-xs text-gray-600 mb-2 font-medium">Select a color category:</div>
      <div className="flex flex-col gap-1">
        {data.colorTags.map((tag) => (
          <button
            key={tag.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-50 border border-gray-200 text-left"
            onClick={() => handleCreateBlockWithColor(day, hour, tag.id)}
          >
            <div
              className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <span className="truncate">{tag.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <button
          className="text-xs text-gray-500 hover:text-gray-700 underline"
          onClick={() => handleCreateBlockWithColor(day, hour)}
        >
          Use default color
        </button>
      </div>
    </div>
  );

  // Color Key Panel Component
  const renderColorKeyPanel = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5" />
          Color Key
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Click any color tag to activate it. When you click a calendar block, the selected tag is applied automatically with editable text.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Select a color category, then click a calendar block to apply it. The block will auto-fill with the category name, which you can edit anytime.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 items-center">
          {data.colorTags.map((tag) => {
            const isActive = activeColorTagId === tag.id;
            return (
              <div
                key={tag.id}
                className={`relative flex items-center gap-2 rounded-lg p-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-md ring-2 ring-blue-200' 
                    : 'bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => setActiveColorTagId(tag.id)}
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
                  title={`${isActive ? 'Active: ' : 'Select '}${tag.label} color`}
                />
              {editingColorTag === tag.id ? (
                <Input
                  value={tag.label}
                  onChange={(e) => updateColorTag(tag.id, { label: e.target.value })}
                  onBlur={() => setEditingColorTag(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingColorTag(null);
                  }}
                  className="h-6 text-xs w-24"
                  autoFocus
                />
              ) : (
                <span
                  className="text-sm cursor-pointer hover:bg-gray-100 px-1 rounded"
                  onClick={() => setEditingColorTag(tag.id)}
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
              value={newColorTagLabel}
              onChange={(e) => setNewColorTagLabel(e.target.value)}
              placeholder="New category..."
              className="h-8 text-sm w-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addColorTag();
              }}
            />
            <Button
              size="sm"
              onClick={addColorTag}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {activeColorTagId && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-700 font-medium">
              Active Color: <span className="text-blue-800">{getColorTagLabel(activeColorTagId)}</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              New blocks will automatically use this color and category
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
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Today
          </Button>
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

        <div className="w-full border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
            <div className="py-4 px-3 text-sm font-semibold text-gray-700 border-r border-gray-200 text-center">
              Time
            </div>
            {DAYS.map(day => (
              <div key={day} className="py-4 px-3 text-sm font-semibold text-gray-700 text-center border-r border-gray-200 last:border-r-0">
                {day.slice(0, 3)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 max-h-[700px] overflow-y-auto">
            {HOURS.map(hour => [
              <div key={`time-${hour}`} className="py-4 px-3 text-sm text-gray-600 font-medium bg-gray-50 border-r border-b border-gray-200 flex items-center justify-center min-w-[80px]">
                {formatTime(hour)}
              </div>,
              ...DAYS.map(day => (
                <div
                  key={`${day}-${hour}`}
                  className="min-h-[90px] border-r border-b border-gray-200 relative hover:bg-blue-50 transition-colors cursor-pointer group"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, hour)}
                  onClick={() => {
                    if (activeColorTagId) {
                      createTimeBlock(day, hour);
                    } else {
                      setShowColorSelector(`${day}-${hour}`);
                    }
                  }}
                >
                  {getBlocksForDayAndHour(day, hour).map(block => (
                    <div
                      key={block.id}
                      className="absolute inset-1 rounded text-white text-sm font-medium p-2 cursor-move flex items-center justify-between group shadow-sm"
                      style={{ backgroundColor: block.color, height: `${Math.max(block.duration * 80 - 8, 75)}px` }}
                      draggable
                      onDragStart={() => handleDragStart(block)}
                      title={`${block.title}${block.colorTagId ? ` (${getColorTagLabel(block.colorTagId)})` : ''} - Click to edit`}
                    >
                      <div className="flex-1 flex items-center justify-center text-center px-1">
                        {editingBlock === block.id ? (
                          <Input
                            value={block.title}
                            onChange={(e) => updateTimeBlock(block.id, { title: e.target.value })}
                            onBlur={() => setEditingBlock(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingBlock(null);
                            }}
                            className="h-8 text-xs bg-white text-black text-center font-medium border-0 rounded-md"
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="truncate cursor-pointer font-medium leading-tight hover:bg-white/10 rounded px-1 py-0.5 transition-colors text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBlock(block.id);
                            }}
                            title={block.title}
                          >
                            {block.title}
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBlock(block.id);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTimeBlock(block.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {showColorSelector === `${day}-${hour}` && renderInlineColorSelector(day, hour)}
                </div>
              ))
            ])}
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
                        if (activeColorTagId) {
                          // Auto-create block with selected color category
                          createTimeBlock(dateString, 9);
                        } else {
                          // Show color selector if no color is active
                          setShowColorSelector(`${dateString}-9`);
                        }
                      }
                    }}
                  >
                  <div className="text-sm font-semibold mb-2 text-gray-700">{date.getDate()}</div>
                  <div className="space-y-1.5">
                    {blocks.slice(0, 3).map(block => (
                      <div
                        key={block.id}
                        className="text-xs p-2 rounded text-white cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: block.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBlock(block.id);
                        }}
                        title={`${block.title} at ${block.startTime} - Click to edit`}
                      >
                        <div className="truncate font-medium">{block.title}</div>
                        <div className="text-xs opacity-80 mt-0.5">{block.startTime}</div>
                      </div>
                    ))}
                    {blocks.length > 3 && (
                      <div className="text-xs text-gray-500">+{blocks.length - 3} more</div>
                    )}
                  </div>

                  {showColorSelector === `${dateString}-9` && (
                    <div className="mt-1 relative">
                      {renderInlineColorSelector(dateString, 9)}
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
    <div className="w-full px-8 lg:px-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Time Blocking Planner</h2>
          <p className="text-gray-600">Organize your schedule with drag-and-drop time blocks</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          Auto-saving
        </Badge>
      </div>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'weekly' | 'monthly')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Weekly View</span>
            <span className="sm:hidden">Week</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Monthly View</span>
            <span className="sm:hidden">Month</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          {renderColorKeyPanel()}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Click on any time slot to create a block, or drag existing blocks to reschedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderWeeklyView()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {renderColorKeyPanel()}
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
        </TabsContent>
      </Tabs>

      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click any empty slot to create a new time block</li>
          <li>Drag blocks to move them to different times</li>
          <li>Click on a block title to edit it</li>
          <li>Use the hover menu to delete blocks</li>
        </ul>
      </div>
    </div>
  );
}