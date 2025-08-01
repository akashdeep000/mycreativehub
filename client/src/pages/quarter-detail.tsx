import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  ArrowLeft, 
  Edit2, 
  Trash2,
  Check,
  X,
  Clock,
  Target,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuarterEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  notes: string;
  emoji: string;
  color: string;
  detailedNotes: string;
  checklist: ChecklistItem[];
  reminders: Reminder[];
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Reminder {
  id: string;
  text: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
}

const quarterInfo = {
  q1: {
    name: 'Q1 - January to March',
    months: ['January', 'February', 'March'],
    color: 'from-blue-400 to-cyan-400',
    theme: 'New Beginnings & Fresh Starts'
  },
  q2: {
    name: 'Q2 - April to June',
    months: ['April', 'May', 'June'],
    color: 'from-green-400 to-emerald-400',
    theme: 'Growth & Momentum Building'
  },
  q3: {
    name: 'Q3 - July to September',
    months: ['July', 'August', 'September'],
    color: 'from-orange-400 to-yellow-400',
    theme: 'Peak Performance & Harvest'
  },
  q4: {
    name: 'Q4 - October to December',
    months: ['October', 'November', 'December'],
    color: 'from-purple-400 to-pink-400',
    theme: 'Wrapping Up & Planning Ahead'
  }
};

export default function QuarterDetail() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [quarterEvents, setQuarterEvents] = useState<QuarterEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  
  // Get quarter from URL (e.g., /seasonality/q1)
  const currentPath = window.location.pathname;
  const quarterMatch = currentPath.match(/\/seasonality\/(q[1-4])/);
  const currentQuarter = quarterMatch ? quarterMatch[1] as keyof typeof quarterInfo : 'q1';
  const quarter = quarterInfo[currentQuarter];

  useEffect(() => {
    // Load quarter events from localStorage
    const savedEvents = localStorage.getItem(`quarter-${currentQuarter}-events`);
    if (savedEvents) {
      try {
        setQuarterEvents(JSON.parse(savedEvents));
      } catch (error) {
        console.error('Error loading quarter events:', error);
      }
    }
  }, [currentQuarter]);

  const saveEvents = (events: QuarterEvent[]) => {
    localStorage.setItem(`quarter-${currentQuarter}-events`, JSON.stringify(events));
    setQuarterEvents(events);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addChecklistItem = (eventId: string) => {
    const newItem: ChecklistItem = {
      id: generateId(),
      text: '',
      completed: false
    };

    setQuarterEvents(prev => prev.map(event => 
      event.id === eventId
        ? { ...event, checklist: [...event.checklist, newItem] }
        : event
    ));
  };

  const updateChecklistItem = (eventId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    const updatedEvents = quarterEvents.map(event => 
      event.id === eventId
        ? {
            ...event,
            checklist: event.checklist.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : event
    );
    saveEvents(updatedEvents);
  };

  const deleteChecklistItem = (eventId: string, itemId: string) => {
    const updatedEvents = quarterEvents.map(event => 
      event.id === eventId
        ? {
            ...event,
            checklist: event.checklist.filter(item => item.id !== itemId)
          }
        : event
    );
    saveEvents(updatedEvents);
  };

  const addReminder = (eventId: string) => {
    const newReminder: Reminder = {
      id: generateId(),
      text: '',
      date: '',
      priority: 'medium'
    };

    setQuarterEvents(prev => prev.map(event => 
      event.id === eventId
        ? { ...event, reminders: [...event.reminders, newReminder] }
        : event
    ));
  };

  const updateReminder = (eventId: string, reminderId: string, updates: Partial<Reminder>) => {
    const updatedEvents = quarterEvents.map(event => 
      event.id === eventId
        ? {
            ...event,
            reminders: event.reminders.map(reminder =>
              reminder.id === reminderId ? { ...reminder, ...updates } : reminder
            )
          }
        : event
    );
    saveEvents(updatedEvents);
  };

  const deleteReminder = (eventId: string, reminderId: string) => {
    const updatedEvents = quarterEvents.map(event => 
      event.id === eventId
        ? {
            ...event,
            reminders: event.reminders.filter(reminder => reminder.id !== reminderId)
          }
        : event
    );
    saveEvents(updatedEvents);
  };

  const updateEventNotes = (eventId: string, detailedNotes: string) => {
    const updatedEvents = quarterEvents.map(event => 
      event.id === eventId ? { ...event, detailedNotes } : event
    );
    saveEvents(updatedEvents);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/seasonality-timeline')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Timeline
          </Button>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${quarter.color} rounded-xl flex items-center justify-center`}>
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quarter.name}</h1>
            <p className="text-gray-600">{quarter.theme}</p>
          </div>
        </div>
        
        <div className="flex gap-2 mb-4">
          {quarter.months.map((month, index) => (
            <Badge key={month} variant="secondary" className="px-3 py-1">
              {month}
            </Badge>
          ))}
        </div>
      </div>

      {/* Planning Tips */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Quarter Planning Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Strategic Focus:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Set 2-3 main objectives for this quarter</li>
                <li>• Break down large projects into monthly milestones</li>
                <li>• Plan for seasonal energy shifts and holidays</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Use This Space For:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Detailed project notes and requirements</li>
                <li>• Pre-launch checklists and task breakdowns</li>
                <li>• Important reminders and deadline alerts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-6">
        {quarterEvents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600 mb-4">
                Events you add to {quarter.name} in the main timeline will appear here for detailed planning.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/seasonality-timeline')}
              >
                Add Events to Timeline
              </Button>
            </CardContent>
          </Card>
        ) : (
          quarterEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${event.color} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{event.emoji}</span>
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <p className="text-white/90 text-sm">{event.date}</p>
                    </div>
                  </div>
                  
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                {/* Detailed Notes */}
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Detailed Notes & Strategy
                  </Label>
                  <Textarea
                    placeholder="Add detailed notes, strategy, requirements, or any important information for this event..."
                    value={event.detailedNotes || ''}
                    onChange={(e) => updateEventNotes(event.id, e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Action Checklist
                    </Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addChecklistItem(event.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {event.checklist?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
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
                          className="flex-1 h-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteChecklistItem(event.id, item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    
                    {(!event.checklist || event.checklist.length === 0) && (
                      <p className="text-sm text-gray-500 py-2">No checklist items yet. Add some to track your progress!</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}