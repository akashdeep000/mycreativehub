import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  GripVertical,
  Lightbulb,
  ArrowLeft,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import BackToDashboard from '@/components/BackToDashboard';

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
  const [draggedEvent, setDraggedEvent] = useState<TimelineEvent | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventChecklists, setEventChecklists] = useState<{[eventId: string]: any[]}>({});
  const [editingLabel, setEditingLabel] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState({
    type: '',
    date: '',
    notes: ''
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

  // Load existing checklists from localStorage when events change
  useEffect(() => {
    const loadedChecklists: {[key: string]: any[]} = {};
    
    // Check all existing events and load their checklists
    events.forEach(event => {
      const eventData = JSON.parse(localStorage.getItem(`event-${event.id}-data`) || '{}');
      if (eventData.checklist && eventData.checklist.length > 0) {
        loadedChecklists[event.id] = eventData.checklist;
      }
    });

    if (Object.keys(loadedChecklists).length > 0) {
      setEventChecklists(prev => ({
        ...prev,
        ...loadedChecklists
      }));
    }
  }, [events]);

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

  const handleEditEventType = (typeValue: string, newLabel: string) => {
    setEventTypes(prev => prev.map(type => 
      type.value === typeValue 
        ? { ...type, label: newLabel }
        : type
    ));
    
    toast({
      title: "Event type updated",
      description: "Changes saved successfully"
    });
  };

  const handleDeleteEventType = (typeValue: string) => {
    // Prevent deletion if it's the last event type
    if (eventTypes.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "At least one event type must remain",
        variant: "destructive"
      });
      return;
    }

    // Check if any events use this type
    const eventsUsingType = events.filter(event => event.type === typeValue);
    if (eventsUsingType.length > 0) {
      toast({
        title: "Cannot delete",
        description: `This event type is used by ${eventsUsingType.length} event(s)`,
        variant: "destructive"
      });
      return;
    }

    setEventTypes(prev => prev.filter(type => type.value !== typeValue));
    
    toast({
      title: "Event type deleted",
      description: "Event type removed successfully"
    });
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
  };

  const navigateToQuarter = (quarterNum: number) => {
    setLocation(`/seasonality/q${quarterNum}`);
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const updateEventNotes = (eventId: string, notes: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, notes } : event
    ));
  };

  const updateEventChecklist = (eventId: string, checklist: any[]) => {
    // Update React state first for immediate UI response
    setEventChecklists(prev => ({
      ...prev,
      [eventId]: checklist
    }));
    
    // Store checklist in localStorage for persistence
    const eventData = JSON.parse(localStorage.getItem(`event-${eventId}-data`) || '{}');
    eventData.checklist = checklist;
    localStorage.setItem(`event-${eventId}-data`, JSON.stringify(eventData));
  };

  const getEventChecklist = (eventId: string) => {
    // First check React state for immediate response
    if (eventChecklists[eventId]) {
      return eventChecklists[eventId];
    }
    
    // Fallback to localStorage
    const eventData = JSON.parse(localStorage.getItem(`event-${eventId}-data`) || '{}');
    const checklist = eventData.checklist || [];
    
    // Update React state with the loaded data
    if (checklist.length > 0) {
      setEventChecklists(prev => ({
        ...prev,
        [eventId]: checklist
      }));
    }
    
    return checklist;
  };

  const addChecklistItem = (eventId: string) => {
    const currentChecklist = getEventChecklist(eventId);
    const newItem = {
      id: `item-${Date.now()}`,
      text: '',
      completed: false
    };
    const updatedChecklist = [...currentChecklist, newItem];
    updateEventChecklist(eventId, updatedChecklist);
  };

  const updateChecklistItem = (eventId: string, itemId: string, updates: any) => {
    const currentChecklist = getEventChecklist(eventId);
    const updatedChecklist = currentChecklist.map((item: any) => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateEventChecklist(eventId, updatedChecklist);
  };

  const deleteChecklistItem = (eventId: string, itemId: string) => {
    const currentChecklist = getEventChecklist(eventId);
    const updatedChecklist = currentChecklist.filter((item: any) => item.id !== itemId);
    updateEventChecklist(eventId, updatedChecklist);
  };

  const handleAddEvent = () => {
    if (!newEvent.type || !newEvent.date) {
      toast({
        title: "Missing fields",
        description: "Please fill in type and date",
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
      title: typeData.label,
      notes: newEvent.notes,
      emoji: typeData.emoji,
      color: typeData.color
    };

    setEvents(prev => [...prev, event]);
    setNewEvent({ type: '', date: '', notes: '' });
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
      notes: ''
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
          <BackToDashboard />
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
        
        <p className="text-gray-600 mb-6">Plan your year with purpose - map your seasonal cycles, launches, and holidays.</p>

        {/* Quick-Use Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Quick-Use Guide:</strong> Click 'Add Event' to input your details. Your colour-coded event will appear in your Year-at-a-Glance view. Click the chevron icon on any event to expand and dive deeper into your plans.
          </p>
        </div>

        {/* Centered Add Event Button */}
        <div className="flex justify-center mb-6">
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
                onEditEventType={handleEditEventType}
                onDeleteEventType={handleDeleteEventType}
              />
            </DialogContent>
          </Dialog>
        </div>
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
                  <div className={`bg-gradient-to-r ${quarter.color} text-white p-4`}>
                    <h3 className="font-semibold text-lg">{quarter.name}</h3>
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
                          {getEventsForMonth(monthNum).map((event) => {
                            const isExpanded = expandedEvents.has(event.id);
                            const checklist = getEventChecklist(event.id);
                            
                            return (
                              <div key={event.id} className="bg-white rounded-lg shadow-sm border">
                                {/* Event Header */}
                                <div
                                  className={`${event.color} text-white text-xs p-2 rounded-t-lg cursor-move flex items-center gap-2 hover:opacity-80`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event)}
                                >
                                  <GripVertical className="w-3 h-3" />
                                  <span className="flex-1 truncate">{event.title}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 w-5 h-5 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleEventExpansion(event.id);
                                    }}
                                  >
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 w-5 h-5 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                  <div className="p-3 space-y-4 bg-white rounded-b-lg">
                                    {/* Detailed Notes */}
                                    <div>
                                      <Label className="text-xs font-medium mb-1 flex items-center gap-1">
                                        <Edit2 className="w-3 h-3" />
                                        Detailed Notes & Strategy
                                      </Label>
                                      <Textarea
                                        placeholder="Add detailed notes, strategy, requirements..."
                                        value={event.notes || ''}
                                        onChange={(e) => updateEventNotes(event.id, e.target.value)}
                                        className="min-h-[60px] text-xs"
                                      />
                                    </div>

                                    {/* Action Checklist */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <Label className="text-xs font-medium flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          Action Checklist
                                        </Label>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => addChecklistItem(event.id)}
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Add
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        {checklist.map((item: any) => (
                                          <div key={item.id} className="flex items-center gap-2 p-1 bg-gray-50 rounded text-xs">
                                            <Checkbox
                                              checked={item.completed}
                                              onCheckedChange={(checked) => 
                                                updateChecklistItem(event.id, item.id, { completed: !!checked })
                                              }
                                            />
                                            <Input
                                              value={item.text}
                                              onChange={(e) => updateChecklistItem(event.id, item.id, { text: e.target.value })}
                                              placeholder="Enter checklist item..."
                                              className="flex-1 h-6 text-xs"
                                            />
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => deleteChecklistItem(event.id, item.id)}
                                            >
                                              <Trash2 className="w-3 h-3 text-red-500" />
                                            </Button>
                                          </div>
                                        ))}
                                        
                                        {checklist.length === 0 && (
                                          <p className="text-xs text-gray-500 py-1">No checklist items yet. Add some to track your progress!</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

function CustomEventTypeDropdown({ 
  value, 
  onChange, 
  eventTypes, 
  onEditEventType, 
  onDeleteEventType,
  editingTypeId,
  editingLabel,
  setEditingTypeId,
  setEditingLabel,
  onEditType,
  onSaveEdit,
  onCancelEdit
}: {
  value: string;
  onChange: (value: string) => void;
  eventTypes: any[];
  onEditEventType: (typeValue: string, newLabel: string) => void;
  onDeleteEventType: (typeValue: string) => void;
  editingTypeId: string | null;
  editingLabel: string;
  setEditingTypeId: (id: string | null) => void;
  setEditingLabel: (label: string) => void;
  onEditType: (typeValue: string, currentLabel: string) => void;
  onSaveEdit: (typeValue: string) => void;
  onCancelEdit: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedType = eventTypes.find(type => type.value === value);
  const displayText = selectedType ? selectedType.label : 'Select event type';

  const handleSelectType = (typeValue: string) => {
    if (editingTypeId !== typeValue) {
      onChange(typeValue);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {displayText}
        </span>
        <svg
          className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {eventTypes.map((type) => (
            <div key={type.value} className="relative group">
              {editingTypeId === type.value ? (
                <div className="flex items-center p-2 gap-2">
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onSaveEdit(type.value);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancelEdit();
                      }
                    }}
                    onBlur={() => onSaveEdit(type.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  className="relative select-none rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer pr-16"
                  onClick={() => handleSelectType(type.value)}
                >
                  <span>{type.label}</span>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEditType(type.value, type.label);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                      type="button"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteEventType(type.value);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                      type="button"
                    >
                      <Trash2 className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddEventForm({ newEvent, setNewEvent, onAdd, eventTypes, onEditEventType, onDeleteEventType }: {
  newEvent: any;
  setNewEvent: any;
  onAdd: any;
  eventTypes: any[];
  onEditEventType: (typeValue: string, newLabel: string) => void;
  onDeleteEventType: (typeValue: string) => void;
}) {
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const handleEditType = (typeValue: string, currentLabel: string) => {
    setEditingTypeId(typeValue);
    setEditingLabel(currentLabel);
  };

  const handleSaveEdit = (typeValue: string) => {
    if (editingLabel.trim()) {
      onEditEventType(typeValue, editingLabel.trim());
      setEditingTypeId(null);
      setEditingLabel('');
    }
  };

  const handleCancelEdit = () => {
    setEditingTypeId(null);
    setEditingLabel('');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="type">Event Type</Label>
        <CustomEventTypeDropdown
          value={newEvent.type}
          onChange={(value) => setNewEvent({ ...newEvent, type: value })}
          eventTypes={eventTypes}
          onEditEventType={onEditEventType}
          onDeleteEventType={onDeleteEventType}
          editingTypeId={editingTypeId}
          editingLabel={editingLabel}
          setEditingTypeId={setEditingTypeId}
          setEditingLabel={setEditingLabel}
          onEditType={handleEditType}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
        />
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
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={newEvent.notes}
          onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
          placeholder="Additional details..."
          rows={3}
        />
      </div>



      <Button onClick={onAdd} className="w-full bg-pink-500 hover:bg-pink-600">
        Add Event
      </Button>
    </div>
  );
}