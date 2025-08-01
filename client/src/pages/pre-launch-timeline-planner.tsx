import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, ArrowLeft, Plus, Edit3, Trash2, Clock, Target, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/layout/sidebar';


interface ContentBlock {
  id: string;
  type: string;
  title: string;
  isCustom: boolean;
  status: 'in progress' | 'scheduled' | 'completed';
  emoji: string;
  notes?: string;
}

interface WeekData {
  weekNumber: number;
  weekTitle: string;
  content: ContentBlock[];
  notes: string;
}

interface TimelineData {
  weeks: WeekData[];
  weekCount: number;
  projectName: string;
}

const PRE_FILLED_CONTENT_TYPES = [
  { type: 'Teaser Post', emoji: '👀', color: 'bg-pink-100 border-pink-300 text-pink-800' },
  { type: 'Behind-the-Scenes', emoji: '🎬', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { type: 'Story Moment', emoji: '📖', color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { type: 'Countdown Post', emoji: '⏰', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { type: 'Value Email', emoji: '💌', color: 'bg-green-100 border-green-300 text-green-800' },
  { type: 'Product Preview', emoji: '✨', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { type: 'Collab or Promo', emoji: '🤝', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
];

export default function PreLaunchTimelinePlanner() {
  const { toast } = useToast();
  const [timelineData, setTimelineData] = useState<TimelineData>(() => {
    const saved = localStorage.getItem('prelaunchTimeline');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      weeks: [
        { weekNumber: 1, weekTitle: 'Week 1', content: [], notes: '' },
        { weekNumber: 2, weekTitle: 'Week 2', content: [], notes: '' },
      ],
      weekCount: 2,
      projectName: 'New Launch Timeline',
    };
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [customContentType, setCustomContentType] = useState('');
  const [customEmoji, setCustomEmoji] = useState('📝');
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(timelineData.projectName);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('prelaunchTimeline', JSON.stringify(timelineData));
  }, [timelineData]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const updateWeekCount = (count: number) => {
    const weeks = [...timelineData.weeks];
    
    if (count > weeks.length) {
      // Add new weeks
      for (let i = weeks.length; i < count; i++) {
        weeks.push({
          weekNumber: i + 1,
          weekTitle: `Week ${i + 1}`,
          content: [],
          notes: '',
        });
      }
    } else if (count < weeks.length) {
      // Remove weeks
      weeks.splice(count);
    }

    setTimelineData({
      ...timelineData,
      weeks,
      weekCount: count,
    });
  };

  const addContentToWeek = (weekNumber: number, contentType: string, emoji: string, isCustom: boolean = false) => {
    const weeks = timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        const newContent: ContentBlock = {
          id: generateId(),
          type: contentType,
          title: contentType,
          isCustom,
          status: 'in progress',
          emoji,
        };
        return { ...week, content: [...week.content, newContent] };
      }
      return week;
    });

    setTimelineData({ ...timelineData, weeks });
    setIsAddModalOpen(false);
    setSelectedWeek(null);

    toast({
      title: "Content Added",
      description: `Added "${contentType}" to Week ${weekNumber}`,
    });
  };

  const removeContent = (weekNumber: number, contentId: string) => {
    const weeks = timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return { ...week, content: week.content.filter(c => c.id !== contentId) };
      }
      return week;
    });

    setTimelineData({ ...timelineData, weeks });
    toast({
      title: "Content Removed",
      description: "Content block removed from timeline",
    });
  };

  const updateContentStatus = (weekNumber: number, contentId: string, status: 'in progress' | 'scheduled' | 'completed') => {
    const weeks = timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return {
          ...week,
          content: week.content.map(c => 
            c.id === contentId ? { ...c, status } : c
          )
        };
      }
      return week;
    });

    setTimelineData({ ...timelineData, weeks });
  };

  const updateWeekNotes = (weekNumber: number, notes: string) => {
    const weeks = timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return { ...week, notes };
      }
      return week;
    });

    setTimelineData({ ...timelineData, weeks });
  };

  const handleCustomContentSubmit = () => {
    if (customContentType.trim() && selectedWeek) {
      addContentToWeek(selectedWeek, customContentType.trim(), customEmoji, true);
      setCustomContentType('');
      setCustomEmoji('📝');
    }
  };



  const handleProjectNameSave = () => {
    setTimelineData({ ...timelineData, projectName: editingProjectName });
    setIsEditingProjectName(false);
    toast({
      title: "Project Name Updated",
      description: "Timeline name saved successfully",
    });
  };

  const clearTimeline = () => {
    const weeks = timelineData.weeks.map(week => ({
      ...week,
      content: [],
      notes: '',
    }));

    setTimelineData({ ...timelineData, weeks });
    toast({
      title: "Timeline Cleared",
      description: "All content removed from timeline",
    });
  };

  const getStatusColor = (status: 'draft' | 'scheduled') => {
    return status === 'scheduled' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-600';
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Product Launch
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              {isEditingProjectName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingProjectName}
                    onChange={(e) => setEditingProjectName(e.target.value)}
                    className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleProjectNameSave();
                      if (e.key === 'Escape') setIsEditingProjectName(false);
                    }}
                    onBlur={handleProjectNameSave}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{timelineData.projectName}</h1>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setIsEditingProjectName(true);
                    setEditingProjectName(timelineData.projectName);
                  }}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            Map out your 2–4 week pre-launch timeline with drag-and-drop content planning
          </p>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Timeline Length:</span>
                <Select value={timelineData.weekCount.toString()} onValueChange={(value) => updateWeekCount(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 weeks</SelectItem>
                    <SelectItem value="3">3 weeks</SelectItem>
                    <SelectItem value="4">4 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={clearTimeline} variant="outline" size="sm">
                Clear Timeline
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div id="timeline-export" className="bg-white p-6 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {timelineData.weeks.map((week) => (
              <Card key={week.weekNumber} className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-900">{week.weekTitle}</CardTitle>
                    <Dialog open={isAddModalOpen && selectedWeek === week.weekNumber} onOpenChange={(open) => {
                      setIsAddModalOpen(open);
                      if (open) setSelectedWeek(week.weekNumber);
                      else setSelectedWeek(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Content to {week.weekTitle}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Pre-filled Content Types</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {PRE_FILLED_CONTENT_TYPES.map((content) => (
                                <Button
                                  key={content.type}
                                  variant="outline"
                                  className="justify-start h-auto p-3"
                                  onClick={() => addContentToWeek(week.weekNumber, content.type, content.emoji)}
                                >
                                  <span className="text-lg mr-2">{content.emoji}</span>
                                  {content.type}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-3">Custom Content</h4>
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Custom content type"
                                  value={customContentType}
                                  onChange={(e) => setCustomContentType(e.target.value)}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="📝"
                                  value={customEmoji}
                                  onChange={(e) => setCustomEmoji(e.target.value)}
                                  className="w-16"
                                />
                              </div>
                              <Button
                                onClick={handleCustomContentSubmit}
                                disabled={!customContentType.trim()}
                                className="w-full"
                              >
                                Add Custom Content
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {week.content.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No content planned yet</p>
                    </div>
                  ) : (
                    week.content.map((content) => (
                      <div key={content.id} className="group">
                        <div className={`p-3 rounded-lg border-2 ${PRE_FILLED_CONTENT_TYPES.find(t => t.type === content.type)?.color || 'bg-gray-100 border-gray-300 text-gray-800'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm">{content.emoji}</span>
                                <span className="font-medium text-sm">{content.title}</span>
                              </div>
                              <Select value={content.status} onValueChange={(value: 'in progress' | 'scheduled' | 'completed') => updateContentStatus(week.weekNumber, content.id, value)}>
                                <SelectTrigger className="w-full h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="in progress">In Progress</SelectItem>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeContent(week.weekNumber, content.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Week Notes */}
                  <div className="border-t pt-3">
                    <Textarea
                      placeholder="Week notes & goals..."
                      value={week.notes}
                      onChange={(e) => updateWeekNotes(week.weekNumber, e.target.value)}
                      className="resize-none h-20 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5" />
              Pre-Launch Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Week 1-2 Focus</h4>
                <ul className="space-y-1">
                  <li>• Build anticipation with teasers</li>
                  <li>• Share behind-the-scenes content</li>
                  <li>• Start email sequence to warm audience</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Week 3-4 Focus</h4>
                <ul className="space-y-1">
                  <li>• Showcase product previews</li>
                  <li>• Create urgency with countdown posts</li>
                  <li>• Partner with collaborators for wider reach</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}