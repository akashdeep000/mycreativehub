import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  GripVertical,
  Lightbulb,
  ArrowLeft,
  ZoomIn
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  month: number;
  quarter: number;
  title: string;
  notes: string;
  emoji: string;
  color: string;
}

const defaultEventTypes = [
  { value: 'launch', label: 'Launch', color: 'bg-purple-500', emoji: '🚀' },
  { value: 'holiday', label: 'Holiday', color: 'bg-red-500', emoji: '🎄' },
  { value: 'break', label: 'Break', color: 'bg-green-500', emoji: '🌴' },
  { value: 'promo', label: 'Promo', color: 'bg-orange-500', emoji: '💰' },
  { value: 'energy-high', label: 'Energy High', color: 'bg-yellow-500', emoji: '⚡' },
  { value: 'energy-low', label: 'Energy Low', color: 'bg-gray-500', emoji: '😴' },
  { value: 'personal', label: 'Personal', color: 'bg-pink-500', emoji: '❤️' }
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const quarters = [
  { name: 'Q1', months: [1, 2, 3], color: 'from-blue-400 to-cyan-400' },
  { name: 'Q2', months: [4, 5, 6], color: 'from-green-400 to-emerald-400' },
  { name: 'Q3', months: [7, 8, 9], color: 'from-orange-400 to-yellow-400' },
  { name: 'Q4', months: [10, 11, 12], color: 'from-purple-400 to-pink-400' }
];

const quickSuggestions = [
  { title: 'Black Friday Promo', type: 'promo', month: 11 },
  { title: 'New Year Launch', type: 'launch', month: 1 },
  { title: 'Summer Break', type: 'break', month: 7 },
  { title: 'Holiday Campaign', type: 'holiday', month: 12 },
  { title: 'Spring Energy Boost', type: 'energy-high', month: 3 }
];

export default function SeasonalityTimeline() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [eventTypes, setEventTypes] = useState(defaultEventTypes);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<TimelineEvent | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState({
    type: '',
    date: '',
    title: '',
    notes: '',
    emoji: ''
  });

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Load events and event types from localStorage on component mount
  useEffect(() => {
    const savedEvents = localStorage.getItem('seasonality-timeline-events');
    const savedEventTypes = localStorage.getItem('seasonality-timeline-event-types');
    
    if (savedEvents) {
      try {
        setEvents(JSON.parse(savedEvents));
      } catch (error) {
        console.error('Error loading events:', error);
      }
    }
    
    if (savedEventTypes) {
      try {
        setEventTypes(JSON.parse(savedEventTypes));
      } catch (error) {
        console.error('Error loading event types:', error);
      }
    }
  }, []);

  // Save events to localStorage whenever events change
  useEffect(() => {
    localStorage.setItem('seasonality-timeline-events', JSON.stringify(events));
    // Also sync events to quarter detail pages
    syncEventsToQuarters();
  }, [events]);

  // Save event types to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('seasonality-timeline-event-types', JSON.stringify(eventTypes));
  }, [eventTypes]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerOpen && !(event.target as Element).closest('.color-picker-container')) {
        setColorPickerOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [colorPickerOpen]);

  // Sync events to quarter detail pages
  const syncEventsToQuarters = () => {
    // Clear existing quarter events
    ['q1', 'q2', 'q3', 'q4'].forEach(quarter => {
      localStorage.removeItem(`quarter-${quarter}-events`);
    });

    // Group events by quarter and save to respective quarter localStorage
    events.forEach(event => {
      const quarterKey = `q${event.quarter}`;
      const quarterEvents = JSON.parse(localStorage.getItem(`quarter-${quarterKey}-events`) || '[]');
      
      // Convert timeline event to quarter event format
      const quarterEvent = {
        id: event.id,
        type: event.type,
        title: event.title,
        date: event.date,
        notes: event.notes,
        emoji: event.emoji,
        color: event.color,
        detailedNotes: '',
        checklist: [],
        reminders: []
      };
      
      quarterEvents.push(quarterEvent);
      localStorage.setItem(`quarter-${quarterKey}-events`, JSON.stringify(quarterEvents));
    });
  };

  const getEventTypeData = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const handleEditTypeLabel = (typeValue: string, currentLabel: string) => {
    setEditingTypeId(typeValue);
    setEditingLabel(currentLabel);
  };

  const saveTypeLabel = () => {
    if (!editingTypeId || !editingLabel.trim()) return;
    
    setEventTypes(prev => prev.map(type => 
      type.value === editingTypeId 
        ? { ...type, label: editingLabel.trim() }
        : type
    ));
    
    setEditingTypeId(null);
    setEditingLabel('');
    
    toast({
      title: "Label updated",
      description: "Event type label has been saved"
    });
  };

  const cancelEditLabel = () => {
    setEditingTypeId(null);
    setEditingLabel('');
  };

  // Available color options for the color picker
  const colorOptions = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-zinc-500'
  ];

  const handleColorChange = (typeValue: string, newColor: string) => {
    setEventTypes(prev => prev.map(type => 
      type.value === typeValue 
        ? { ...type, color: newColor }
        : type
    ));

    // Update all existing events with this type to use the new color
    setEvents(prev => prev.map(event => 
      event.type === typeValue 
        ? { ...event, color: newColor }
        : event
    ));

    setColorPickerOpen(null);
    
    toast({
      title: "Color updated",
      description: "Event type color has been changed"
    });
  };

  const addCustomEventType = () => {
    const colors = ['bg-indigo-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newType = {
      value: `custom-${Date.now()}`,
      label: 'Custom Type',
      color: randomColor,
      emoji: '⭐'
    };
    
    setEventTypes(prev => [...prev, newType]);
    handleEditTypeLabel(newType.value, newType.label);
  };

  const navigateToQuarter = (quarterNum: number) => {
    setLocation(`/seasonality/q${quarterNum}`);
  };

  const handleAddEvent = () => {
    if (!newEvent.type || !newEvent.date || !newEvent.title) {
      toast({
        title: "Missing fields",
        description: "Please fill in type, date, and title",
        variant: "destructive"
      });
      return;
    }

    const date = new Date(newEvent.date);
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const typeData = getEventTypeData(newEvent.type);

    const event: TimelineEvent = {
      id: generateId(),
      type: newEvent.type,
      date: newEvent.date,
      month,
      quarter,
      title: newEvent.title,
      notes: newEvent.notes,
      emoji: newEvent.emoji || typeData.emoji,
      color: typeData.color
    };

    setEvents(prev => [...prev, event]);
    setNewEvent({ type: '', date: '', title: '', notes: '', emoji: '' });
    setIsAddModalOpen(false);
    
    toast({
      title: "Event added",
      description: `${event.title} added to your timeline`
    });
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    toast({
      title: "Event deleted",
      description: "Event removed from timeline"
    });
  };

  const handleQuickAdd = (suggestion: any) => {
    const year = new Date().getFullYear();
    const date = `${year}-${suggestion.month.toString().padStart(2, '0')}-01`;
    
    setNewEvent({
      type: suggestion.type,
      date,
      title: suggestion.title,
      notes: '',
      emoji: ''
    });
    setIsAddModalOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, event: TimelineEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetMonth: number) => {
    e.preventDefault();
    
    if (!draggedEvent) return;

    const quarter = Math.ceil(targetMonth / 3);
    const updatedEvent = {
      ...draggedEvent,
      month: targetMonth,
      quarter
    };

    setEvents(prev => prev.map(event => 
      event.id === draggedEvent.id ? updatedEvent : event
    ));

    setDraggedEvent(null);
    
    toast({
      title: "Event moved",
      description: `${draggedEvent.title} moved to ${months[targetMonth - 1]}`
    });
  };



  const getEventsForMonth = (month: number) => {
    return events.filter(event => event.month === month);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/launch')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Product Launch
          </Button>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Seasonality Timeline {new Date().getFullYear()}</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <p className="text-gray-600">Plan your year with purpose—map your seasonal cycles, launches, and personal flow.</p>
          <div className="flex gap-2">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-pink-500 hover:bg-pink-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Timeline Event</DialogTitle>
                  <DialogDescription>
                    Create a new event for your timeline. Choose the type, date, and details.
                  </DialogDescription>
                </DialogHeader>
                <AddEventForm 
                  newEvent={newEvent}
                  setNewEvent={setNewEvent}
                  onAdd={handleAddEvent}
                  eventTypes={eventTypes}
                />
              </DialogContent>
            </Dialog>
            

          </div>
        </div>

        {/* Quick-Use Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Quick-Use Guide:</strong> Click 'Add Event' to input your details. Your colour-coded event will appear in your Year-at-a-Glance view. Click the + icon beside a quarter to expand and dive deeper into your plans.
          </p>
        </div>

        {/* Color Key - Moved to Top */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Event Types & Color Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              {eventTypes.map((type) => (
                <div key={type.value} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 relative">
                  <div 
                    className={`w-4 h-4 ${type.color} rounded cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all`}
                    onClick={() => setColorPickerOpen(colorPickerOpen === type.value ? null : type.value)}
                  ></div>
                  
                  {/* Color Picker Popup */}
                  {colorPickerOpen === type.value && (
                    <div className="color-picker-container absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[180px]">
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        {colorOptions.map((color) => (
                          <div
                            key={color}
                            className={`w-7 h-7 ${color} rounded-md cursor-pointer hover:scale-110 transition-all duration-200 hover:shadow-md ${
                              type.color === color ? 'ring-2 ring-gray-800 ring-offset-1' : ''
                            }`}
                            onClick={() => handleColorChange(type.value, color)}
                          ></div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 text-center font-medium">Click a color to select</div>
                    </div>
                  )}
                  
                  {editingTypeId === type.value ? (
                    <Input
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="h-6 text-xs w-24"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTypeLabel();
                        if (e.key === 'Escape') cancelEditLabel();
                      }}
                      onBlur={saveTypeLabel}
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-sm cursor-pointer hover:text-blue-600"
                      onClick={() => handleEditTypeLabel(type.value, type.label)}
                    >
                      {type.emoji} {type.label}
                    </span>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomEventType}
                className="h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Label
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Timeline */}
        <div className="lg:col-span-3">
          <div ref={timelineRef} className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Year-at-a-Glance: {new Date().getFullYear()}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quarters.map((quarter) => (
                <div key={quarter.name} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${quarter.color} text-white p-4 flex items-center justify-between`}>
                    <h3 className="font-semibold text-lg">{quarter.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => navigateToQuarter(parseInt(quarter.name.slice(1)))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {quarter.months.map((monthNum) => (
                      <div 
                        key={monthNum}
                        className="border border-gray-300 rounded-lg p-3 min-h-[100px] bg-gray-50"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, monthNum)}
                      >
                        <h4 className="font-medium text-sm text-gray-700 mb-2">
                          {months[monthNum - 1]}
                        </h4>
                        
                        <div className="space-y-2">
                          {getEventsForMonth(monthNum).map((event) => (
                            <div
                              key={event.id}
                              className={`${event.color} text-white text-xs p-2 rounded cursor-move flex items-center gap-2 hover:opacity-80`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, event)}
                            >
                              <GripVertical className="w-3 h-3" />
                              <span>{event.emoji}</span>
                              <span className="flex-1 truncate">{event.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 w-6 h-6 p-0"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <CardTitle className="text-lg">Planning Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Plan launches during your high-energy seasons</p>
                <p>• Block out rest periods after major launches</p>
                <p>• Consider industry holidays and trends</p>
                <p>• Leave buffer time for unexpected opportunities</p>
                <p>• Review and adjust quarterly</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Add</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-2"
                  onClick={() => handleQuickAdd(suggestion)}
                >
                  <span className="text-xs truncate">{suggestion.title}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AddEventForm({ newEvent, setNewEvent, onAdd, eventTypes }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="type">Event Type</Label>
        <Select value={newEvent.type} onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.emoji} {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          placeholder="Event title"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={newEvent.notes}
          onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
          placeholder="Additional details..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="emoji">Custom Emoji (Optional)</Label>
        <Input
          id="emoji"
          value={newEvent.emoji}
          onChange={(e) => setNewEvent({ ...newEvent, emoji: e.target.value })}
          placeholder="🎯"
          maxLength={2}
        />
      </div>

      <Button onClick={onAdd} className="w-full bg-pink-500 hover:bg-pink-600">
        Add Event
      </Button>
    </div>
  );
}