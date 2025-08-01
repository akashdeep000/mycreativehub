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

interface Launch {
  id: string;
  title: string;
  timelineData: TimelineData;
  createdAt: string;
  lastModified: string;
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
  
  // Initialize launches from localStorage with migration support
  const [launches, setLaunches] = useState<Launch[]>(() => {
    const saved = localStorage.getItem('prelaunchLaunches');
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Check for legacy single timeline data and migrate
    const legacyData = localStorage.getItem('prelaunchTimeline');
    if (legacyData) {
      try {
        const data = JSON.parse(legacyData);
        const migratedLaunch: Launch = {
          id: 'migrated-launch',
          title: data.projectName || 'Pre-Launch Timeline Planner',
          timelineData: data,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };
        // Remove legacy data
        localStorage.removeItem('prelaunchTimeline');
        return [migratedLaunch];
      } catch (error) {
        console.error('Error migrating legacy data:', error);
      }
    }
    
    return [];
  });

  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [customContentType, setCustomContentType] = useState('');
  const [customEmoji, setCustomEmoji] = useState('📝');
  const [isEditingLaunchTitle, setIsEditingLaunchTitle] = useState(false);
  const [editingLaunchTitle, setEditingLaunchTitle] = useState('');
  const [editingLaunchId, setEditingLaunchId] = useState<string | null>(null);

  // Auto-save launches to localStorage
  useEffect(() => {
    localStorage.setItem('prelaunchLaunches', JSON.stringify(launches));
  }, [launches]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Launch management functions
  const createNewLaunch = () => {
    const newLaunch: Launch = {
      id: generateId(),
      title: 'New Launch',
      timelineData: {
        weeks: [
          { weekNumber: 1, weekTitle: 'Week 1', content: [], notes: '' },
          { weekNumber: 2, weekTitle: 'Week 2', content: [], notes: '' },
        ],
        weekCount: 2,
        projectName: 'New Launch',
      },
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setLaunches([...launches, newLaunch]);
    toast({
      title: "New Launch Created",
      description: "Created a new launch timeline",
    });
  };

  const updateLaunchTitle = (launchId: string, newTitle: string) => {
    setLaunches(launches.map(launch => {
      if (launch.id === launchId) {
        return {
          ...launch,
          title: newTitle,
          timelineData: { ...launch.timelineData, projectName: newTitle },
          lastModified: new Date().toISOString(),
        };
      }
      return launch;
    }));
  };

  const deleteLaunch = (launchId: string) => {
    setLaunches(launches.filter(launch => launch.id !== launchId));
    if (selectedLaunch?.id === launchId) {
      setSelectedLaunch(null);
    }
    toast({
      title: "Launch Deleted",
      description: "Launch timeline has been removed",
    });
  };

  // Timeline functions (work with the selected launch)
  const addWeek = () => {
    if (!selectedLaunch) return;
    
    const newWeekNumber = selectedLaunch.timelineData.weeks.length + 1;
    const newWeek: WeekData = {
      weekNumber: newWeekNumber,
      weekTitle: `Week ${newWeekNumber}`,
      content: [],
      notes: '',
    };
    
    const updatedLaunch = {
      ...selectedLaunch,
      timelineData: {
        ...selectedLaunch.timelineData,
        weeks: [...selectedLaunch.timelineData.weeks, newWeek],
        weekCount: selectedLaunch.timelineData.weekCount + 1,
      },
      lastModified: new Date().toISOString(),
    };

    setSelectedLaunch(updatedLaunch);
    setLaunches(launches.map(launch => 
      launch.id === selectedLaunch.id ? updatedLaunch : launch
    ));
  };

  const addContentToWeek = (weekNumber: number, contentType: string, emoji: string, isCustom: boolean = false) => {
    if (!selectedLaunch) return;

    const weeks = selectedLaunch.timelineData.weeks.map(week => {
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

    const updatedLaunch = {
      ...selectedLaunch,
      timelineData: { ...selectedLaunch.timelineData, weeks },
      lastModified: new Date().toISOString(),
    };

    setSelectedLaunch(updatedLaunch);
    setLaunches(launches.map(launch => 
      launch.id === selectedLaunch.id ? updatedLaunch : launch
    ));

    setIsAddModalOpen(false);
    setSelectedWeek(null);

    toast({
      title: "Content Added",
      description: `Added "${contentType}" to Week ${weekNumber}`,
    });
  };

  const removeContent = (weekNumber: number, contentId: string) => {
    if (!selectedLaunch) return;

    const weeks = selectedLaunch.timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return { ...week, content: week.content.filter(c => c.id !== contentId) };
      }
      return week;
    });

    const updatedLaunch = {
      ...selectedLaunch,
      timelineData: { ...selectedLaunch.timelineData, weeks },
      lastModified: new Date().toISOString(),
    };

    setSelectedLaunch(updatedLaunch);
    setLaunches(launches.map(launch => 
      launch.id === selectedLaunch.id ? updatedLaunch : launch
    ));

    toast({
      title: "Content Removed",
      description: "Content block removed from timeline",
    });
  };

  const updateContentStatus = (weekNumber: number, contentId: string, status: 'in progress' | 'scheduled' | 'completed') => {
    if (!selectedLaunch) return;

    const weeks = selectedLaunch.timelineData.weeks.map(week => {
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

    const updatedLaunch = {
      ...selectedLaunch,
      timelineData: { ...selectedLaunch.timelineData, weeks },
      lastModified: new Date().toISOString(),
    };

    setSelectedLaunch(updatedLaunch);
    setLaunches(launches.map(launch => 
      launch.id === selectedLaunch.id ? updatedLaunch : launch
    ));
  };

  const updateWeekNotes = (weekNumber: number, notes: string) => {
    if (!selectedLaunch) return;

    const weeks = selectedLaunch.timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        return { ...week, notes };
      }
      return week;
    });

    const updatedLaunch = {
      ...selectedLaunch,
      timelineData: { ...selectedLaunch.timelineData, weeks },
      lastModified: new Date().toISOString(),
    };

    setSelectedLaunch(updatedLaunch);
    setLaunches(launches.map(launch => 
      launch.id === selectedLaunch.id ? updatedLaunch : launch
    ));
  };

  const handleCustomContentSubmit = () => {
    if (customContentType.trim() && selectedWeek) {
      addContentToWeek(selectedWeek, customContentType.trim(), customEmoji, true);
      setCustomContentType('');
      setCustomEmoji('📝');
    }
  };

  const handleLaunchTitleSave = () => {
    if (editingLaunchId && editingLaunchTitle.trim()) {
      updateLaunchTitle(editingLaunchId, editingLaunchTitle.trim());
      setIsEditingLaunchTitle(false);
      setEditingLaunchId(null);
      toast({
        title: "Launch Title Updated",
        description: "Launch name saved successfully",
      });
    }
  };

  const clearTimeline = () => {
    if (!selectedLaunch) return;

    const weeks = selectedLaunch.timelineData.weeks.map(week => ({
      ...week,
      content: [],
      notes: '',
    }));

    const updatedLaunch = {
      ...selectedLaunch,
      timelineData: { ...selectedLaunch.timelineData, weeks },
      lastModified: new Date().toISOString(),
    };

    setSelectedLaunch(updatedLaunch);
    setLaunches(launches.map(launch => 
      launch.id === selectedLaunch.id ? updatedLaunch : launch
    ));

    toast({
      title: "Timeline Cleared",
      description: "All content removed from timeline",
    });
  };

  const getStatusColor = (status: 'draft' | 'scheduled') => {
    return status === 'scheduled' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-600';
  };

  // Launch cards view (when no launch is selected)
  if (!selectedLaunch) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
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
                <h1 className="text-2xl font-bold text-gray-900">Pre-Launch Timeline Planner</h1>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">Manage multiple launch timelines with detailed planning for each</p>
          </div>

          {/* Add New Launch Button */}
          <div className="mb-6">
            <Button onClick={createNewLaunch} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Launch
            </Button>
          </div>

          {/* Launch Cards */}
          {launches.length === 0 ? (
            <Card className="p-8 text-center">
              <CardContent>
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No launches yet</h3>
                <p className="text-gray-600 mb-4">Create your first launch timeline to get started</p>
                <Button onClick={createNewLaunch}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Launch
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {launches.map((launch) => (
                <Card 
                  key={launch.id} 
                  className="h-fit cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedLaunch(launch)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-900">{launch.title}</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLaunchId(launch.id);
                          setEditingLaunchTitle(launch.title);
                          setIsEditingLaunchTitle(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        {launch.timelineData.weeks.length} weeks planned
                      </div>
                      <div className="text-sm text-gray-500">
                        Last modified: {new Date(launch.lastModified).toLocaleDateString()}
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLaunch(launch);
                          }}
                        >
                          Open Timeline
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLaunch(launch.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Launch Title Dialog */}
          <Dialog open={isEditingLaunchTitle} onOpenChange={setIsEditingLaunchTitle}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Launch Title</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={editingLaunchTitle}
                  onChange={(e) => setEditingLaunchTitle(e.target.value)}
                  placeholder="Launch title"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsEditingLaunchTitle(false);
                    setEditingLaunchId(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleLaunchTitleSave}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Timeline view (when a launch is selected)
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setSelectedLaunch(null)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Launches
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{selectedLaunch.title}</h1>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">Map out your pre-launch timeline with drag-and-drop content planning</p>

          {/* Controls */}
          <div className="flex justify-end mb-4">
            <Button onClick={clearTimeline} variant="outline" size="sm">
              Clear Timeline
            </Button>
          </div>
          
          {/* Instructions */}
          <p className="text-sm text-gray-600 mb-4">
            Click "Add Week" to build your launch timeline.
          </p>
        </div>

        {/* Timeline Grid */}
        <div id="timeline-export" className="bg-white p-6 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {selectedLaunch.timelineData.weeks.map((week) => (
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
          
          {/* Add Week Button */}
          <div className="mt-6 flex justify-center">
            <Button onClick={addWeek} variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Week
            </Button>
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