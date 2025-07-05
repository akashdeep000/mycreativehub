import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, Plus, Edit2, X, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  duration: number; // in hours
  color: string;
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
  const [isCreatingBlock, setIsCreatingBlock] = useState<{ day: string; hour: number } | null>(null);

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
    
    return DAYS.map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  };

  const getCurrentMonthDates = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    
    return dates;
  };

  const createTimeBlock = (day: string, hour: number, title: string) => {
    const newBlock: TimeBlock = {
      id: `block-${Date.now()}`,
      title,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      duration: 1,
      color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
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

  const renderWeeklyView = () => {
    const weekDates = getCurrentWeekDates();

    return (
      <div className="space-y-4">
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

        <div className="grid grid-cols-8 gap-2 text-sm max-h-96 overflow-y-auto">
          {HOURS.map(hour => (
            <div key={hour} className="contents">
              <div className="py-2 text-xs text-gray-500 font-medium border-r border-gray-200">
                {formatTime(hour)}
              </div>
              {DAYS.map(day => (
                <div
                  key={`${day}-${hour}`}
                  className="min-h-[60px] border border-gray-200 rounded relative hover:bg-gray-50 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day, hour)}
                  onClick={() => setIsCreatingBlock({ day, hour })}
                >
                  {getBlocksForDayAndHour(day, hour).map(block => (
                    <div
                      key={block.id}
                      className="absolute inset-1 rounded text-white text-xs p-1 cursor-move flex items-center justify-between group"
                      style={{ backgroundColor: block.color, height: `${block.duration * 60 - 8}px` }}
                      draggable
                      onDragStart={() => handleDragStart(block)}
                    >
                      <div className="flex-1 truncate">
                        {editingBlock === block.id ? (
                          <Input
                            value={block.title}
                            onChange={(e) => updateTimeBlock(block.id, { title: e.target.value })}
                            onBlur={() => setEditingBlock(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingBlock(null);
                            }}
                            className="h-6 text-xs bg-white text-black"
                            autoFocus
                          />
                        ) : (
                          <span onClick={(e) => {
                            e.stopPropagation();
                            setEditingBlock(block.id);
                          }}>
                            {block.title}
                          </span>
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
                  
                  {isCreatingBlock?.day === day && isCreatingBlock?.hour === hour && (
                    <div className="absolute inset-1 bg-blue-100 border-2 border-blue-300 rounded p-1">
                      <Input
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        placeholder="Block title..."
                        className="h-6 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newBlockTitle.trim()) {
                            createTimeBlock(day, hour, newBlockTitle);
                          }
                          if (e.key === 'Escape') {
                            setIsCreatingBlock(null);
                            setNewBlockTitle('');
                          }
                        }}
                        onBlur={() => {
                          if (newBlockTitle.trim()) {
                            createTimeBlock(day, hour, newBlockTitle);
                          } else {
                            setIsCreatingBlock(null);
                            setNewBlockTitle('');
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    const monthDates = getCurrentMonthDates();
    const today = new Date();
    const monthName = today.toLocaleDateString('en', { month: 'long', year: 'numeric' });

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
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
        </div>

        <div className="grid grid-cols-7 gap-2 text-sm">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center font-medium text-gray-700 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeks.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              const dayName = date.toLocaleDateString('en', { weekday: 'long' });
              const dateString = date.toISOString().split('T')[0];
              const isCurrentMonth = date.getMonth() === today.getMonth();
              const blocks = data.monthlyView.blocks.filter(block => block.day === dateString);

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`min-h-[100px] border rounded p-2 ${
                    isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 text-gray-400'
                  }`}
                  onClick={() => isCurrentMonth && setIsCreatingBlock({ day: dateString, hour: 9 })}
                >
                  <div className="text-sm font-medium mb-1">{date.getDate()}</div>
                  <div className="space-y-1">
                    {blocks.slice(0, 3).map(block => (
                      <div
                        key={block.id}
                        className="text-xs p-1 rounded text-white cursor-pointer"
                        style={{ backgroundColor: block.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBlock(block.id);
                        }}
                      >
                        <div className="truncate">{block.title}</div>
                        <div className="text-xs opacity-75">{block.startTime}</div>
                      </div>
                    ))}
                    {blocks.length > 3 && (
                      <div className="text-xs text-gray-500">+{blocks.length - 3} more</div>
                    )}
                  </div>

                  {isCreatingBlock?.day === dateString && (
                    <div className="mt-1">
                      <Input
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        placeholder="Event title..."
                        className="h-6 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newBlockTitle.trim()) {
                            createTimeBlock(dateString, 9, newBlockTitle);
                          }
                          if (e.key === 'Escape') {
                            setIsCreatingBlock(null);
                            setNewBlockTitle('');
                          }
                        }}
                        onBlur={() => {
                          if (newBlockTitle.trim()) {
                            createTimeBlock(dateString, 9, newBlockTitle);
                          } else {
                            setIsCreatingBlock(null);
                            setNewBlockTitle('');
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Time Blocking Planner</h2>
          <p className="text-gray-600">Organize your schedule with drag-and-drop time blocks</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200">
          Auto-saving
        </Badge>
      </div>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'weekly' | 'monthly')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Monthly View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
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