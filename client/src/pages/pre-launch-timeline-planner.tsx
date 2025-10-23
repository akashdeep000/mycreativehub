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
import { useLocation } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import { useDebouncedEffect } from '@/hooks/use-debounced-effect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';


interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ContentBlock {
  id: string;
  type: string;
  title: string;
  isCustom: boolean;
  status: 'in progress' | 'scheduled' | 'completed';
  emoji?: string;
  notes?: string;
  checklist?: ChecklistItem[];
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
  { type: 'Value Email' },
  { type: 'Sales Email' },
  { type: 'FAQ Email' },
  { type: 'Case Study Email' },
  { type: 'Teaser Post' },
  { type: 'Carousel: Pain Point' },
  { type: 'Carousel: Solution/Outcome' },
  { type: 'Testimonial / Social Proof' },
  { type: 'Offer/Bonus Reveal' },
  { type: 'Countdown Reminder' },
  { type: 'Long Form Video' },
  { type: 'Instagram Stories' },
  { type: 'Reels' },
  { type: 'Behind-the-Scenes Video' },
  { type: 'Demo / Tutorial Clip' },
  { type: 'Q&A Stories' },
  { type: 'Poll / Quiz Stories' },
  { type: 'Live Q&A' },
  { type: 'DM Invite / Waitlist Nudge' },
];

// Function to get color classes based on content status
const getStatusColor = (status: 'in progress' | 'scheduled' | 'completed') => {
  switch (status) {
    case 'in progress':
      return 'bg-red-100 border-red-300 text-red-800';
    case 'scheduled':
      return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'completed':
      return 'bg-green-100 border-green-300 text-green-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

export default function PreLaunchTimelinePlanner() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [launches, setLaunches] = useState<Launch[]>([]);
  const queryClient = useQueryClient();

  const { data: plannerData, isLoading } = useQuery({
    queryKey: ['prelaunchTimelinePlanner'],
    queryFn: async () => {
      const res = await apiRequest('/api/persistent/prelaunch-timeline-planner');
      return res.json();
    },
  });

  useEffect(() => {
    if (plannerData && plannerData.launches) {
      setLaunches(plannerData.launches);
    }
  }, [plannerData]);

  const { mutate: savePlanner } = useMutation({
    mutationFn: (updatedLaunches: Launch[]) =>
      apiRequest('/api/persistent/prelaunch-timeline-planner', {
        method: 'PUT',
        body: JSON.stringify({ launches: updatedLaunches }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prelaunchTimelinePlanner'] });
      // toast({
      //   title: 'Saved!',
      //   description: 'Your timeline has been saved.',
      // });
    },
    onError: (error) => {
      console.error('Error saving pre-launch timeline planner data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save timeline data.',
        variant: 'destructive',
      });
    },
  });

  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [customContentType, setCustomContentType] = useState('');
  const [customEmoji, setCustomEmoji] = useState('📝');
  const [isEditingLaunchTitle, setIsEditingLaunchTitle] = useState(false);
  const [editingLaunchTitle, setEditingLaunchTitle] = useState('');
  const [editingLaunchId, setEditingLaunchId] = useState<string | null>(null);
  const [escapedEdit, setEscapedEdit] = useState(false);



  // Auto-save launches to DB with debounce
  useDebouncedEffect(() => {
    if (launches.length > 0 && !isLoading) {
      savePlanner(launches);
    }
  }, [launches, isLoading], 1000);

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



  const resetDialogState = () => {
    setCustomContentType('');
    setCustomEmoji('📝');
  };

  const addContentToWeek = (weekNumber: number, contentType: string, emoji?: string, isCustom: boolean = false) => {
    if (!selectedLaunch) return;

    const weeks = selectedLaunch.timelineData.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        const newContent: ContentBlock = {
          id: generateId(),
          type: contentType,
          title: contentType,
          isCustom,
          status: 'in progress',
          emoji: emoji,
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
    resetDialogState();

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
    }
  };

  const handleLaunchTitleSave = () => {
    // If user pressed escape, don't save
    if (escapedEdit) {
      setEscapedEdit(false);
      return;
    }

    // If title is empty, cancel the edit
    if (!editingLaunchTitle.trim()) {
      setIsEditingLaunchTitle(false);
      setEditingLaunchId(null);
      return;
    }

    if (editingLaunchId && editingLaunchTitle.trim()) {
      const newTitle = editingLaunchTitle.trim();

      // Update the launches array
      updateLaunchTitle(editingLaunchId, newTitle);

      // Also update selectedLaunch if it matches the edited launch
      if (selectedLaunch && selectedLaunch.id === editingLaunchId) {
        setSelectedLaunch({
          ...selectedLaunch,
          title: newTitle,
          timelineData: { ...selectedLaunch.timelineData, projectName: newTitle },
          lastModified: new Date().toISOString(),
        });
      }

      setIsEditingLaunchTitle(false);
      setEditingLaunchId(null);
      toast({
        title: "Launch Title Updated",
        description: "Launch name saved successfully",
      });
    }
  };

  const duplicateLaunch = (launchToDuplicate: Launch) => {
    const duplicatedLaunch: Launch = {
      id: generateId(),
      title: `${launchToDuplicate.title} (copy)`,
      timelineData: {
        ...launchToDuplicate.timelineData,
        projectName: `${launchToDuplicate.title} (copy)`,
        weeks: launchToDuplicate.timelineData.weeks.map(week => ({
          ...week,
          content: week.content.map(content => ({
            ...content,
            id: generateId(), // Generate new IDs for content blocks
          }))
        }))
      },
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    setLaunches([...launches, duplicatedLaunch]);
    toast({
      title: "Timeline Duplicated",
      description: `Created a copy of "${launchToDuplicate.title}"`,
    });
  };


  // Launch cards view (when no launch is selected)
  if (!selectedLaunch) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4">
              {/* Mobile Navigation - Single Back Arrow */}
              <div className="flex items-center gap-3 lg:hidden mt-16">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation("/launch")}
                  className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Desktop Navigation - Full Buttons */}
              <div className="hidden lg:flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => window.location.href = '/'}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Main Dashboard
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => window.history.back()}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Product Launch
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-serif font-semibold text-gray-900">Launch Timeline Planner</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {launches.map((launch) => (
                <Card 
                  key={launch.id} 
                  className="min-h-[200px] w-full cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedLaunch(launch)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-900">{launch.title}</CardTitle>
                      <div className="flex gap-2">
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
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
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateLaunch(launch);
                          }}
                          title="Duplicate Timeline"
                        >
                          Duplicate
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
          <div className="mb-4">
            {/* Mobile Navigation - Single Back Arrow */}
            <div className="flex items-center gap-3 lg:hidden mt-16">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedLaunch(null)}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Desktop Navigation - Full Buttons */}
            <div className="hidden lg:flex gap-2">
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/'}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Main Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedLaunch(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to All Launches
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              {isEditingLaunchTitle && editingLaunchId === selectedLaunch.id ? (
                <Input
                  value={editingLaunchTitle}
                  onChange={(e) => setEditingLaunchTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLaunchTitleSave();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setEscapedEdit(true);
                      setIsEditingLaunchTitle(false);
                      setEditingLaunchId(null);
                    }
                  }}
                  onBlur={handleLaunchTitleSave}
                  className="text-2xl font-bold border-none shadow-none p-0 h-auto bg-transparent"
                  data-testid="input-launch-title"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
                  onClick={() => {
                    setEscapedEdit(false);
                    setEditingLaunchId(selectedLaunch.id);
                    setEditingLaunchTitle(selectedLaunch.title);
                    setIsEditingLaunchTitle(true);
                  }}
                  title="Click to edit title"
                  data-testid="text-launch-title"
                >
                  {selectedLaunch.title}
                </h1>
              )}
            </div>
          </div>

          <p className="text-gray-600 mb-6">Map out your pre-launch timeline with week by week content planning</p>



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
                      else {
                        setSelectedWeek(null);
                        resetDialogState();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
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
                                  onClick={() => addContentToWeek(week.weekNumber, content.type)}
                                >
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
                        <div className={`p-3 rounded-lg border-2 ${getStatusColor(content.status)}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {content.emoji && <span className="text-sm">{content.emoji}</span>}
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