import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, Plus, Trash2, Download, Lightbulb } from "lucide-react";
import { useLocation } from "wouter";

interface ContentPost {
  id: string;
  postIdea: string;
  contentPillar: string;
  caption: string;
  visualType: 'Reel' | 'Carousel' | 'Photo' | 'Graphic';
  cta: string;
  notes: string;
}

interface ScheduledPost {
  id: string;
  date: string;
  postId: string;
  post: ContentPost;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function MonthlyContentPlanner() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: 'Fill out your batching table', completed: false },
    { id: '2', text: 'Schedule posts in the monthly calendar', completed: false },
    { id: '3', text: 'Sort your content into your folder system', completed: false },
    { id: '4', text: 'Set post reminders (or use scheduler of your choice)', completed: false },
    { id: '5', text: 'Review and repeat next month', completed: false }
  ]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Sample content pillars - in real app, these would come from user's saved pillars
  const contentPillars = [
    'Behind the Scenes',
    'Educational Content',
    'Product Showcase',
    'User Generated Content',
    'Motivational',
    'Entertainment',
    'Promotional'
  ];

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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const addNewPost = () => {
    const newPost: ContentPost = {
      id: Date.now().toString(),
      postIdea: '',
      contentPillar: '',
      caption: '',
      visualType: 'Photo',
      cta: '',
      notes: ''
    };
    setPosts([...posts, newPost]);
  };

  const updatePost = (id: string, field: keyof ContentPost, value: string) => {
    setPosts(posts.map(post => 
      post.id === id ? { ...post, [field]: value } : post
    ));
  };

  const deletePost = (id: string) => {
    setPosts(posts.filter(post => post.id !== id));
    setScheduledPosts(scheduledPosts.filter(scheduled => scheduled.postId !== id));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getPostsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return scheduledPosts.filter(scheduled => scheduled.date === dateString);
  };

  const getVisualTypeColor = (type: string) => {
    switch (type) {
      case 'Reel': return 'bg-pink-100 text-pink-700';
      case 'Carousel': return 'bg-orange-100 text-orange-700';
      case 'Photo': return 'bg-blue-100 text-blue-700';
      case 'Graphic': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const schedulePost = (date: Date, postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const dateString = date.toISOString().split('T')[0];
      const scheduledPost: ScheduledPost = {
        id: Date.now().toString(),
        date: dateString,
        postId,
        post
      };
      setScheduledPosts([...scheduledPosts, scheduledPost]);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = getCalendarDays();
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-rose-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/content-planning')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Content Planning
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Monthly Content Planner</h1>
              <p className="text-gray-600">Organize and schedule your monthly social media content</p>
            </div>
          </div>
        </div>

        {/* Intro Text */}
        <Card className="mb-8 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <p className="text-gray-700 leading-relaxed">
              Use this section to turn your content ideas into a plan you can actually stick to. 
              Batch your posts ahead of time, map them to your calendar, and keep everything organized with less stress and more strategy.
            </p>
          </CardContent>
        </Card>

        {/* Top Tip */}
        <Card className="mb-8 border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">Top Tip</h3>
                <p className="text-amber-700">
                  Reuse what works! If a particular post or structure performed well, bring it back next month with a fresh spin. 
                  Batching + recycling = creative energy saved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Batching Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-serif">Content Batching Table</CardTitle>
                <CardDescription>Plan and organize your content ideas</CardDescription>
              </div>
              <Button onClick={addNewPost} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Post
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-gray-700">Post Idea</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Content Pillar</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Caption</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Visual Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700">CTA</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Notes</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b">
                      <td className="p-3">
                        <Input
                          value={post.postIdea}
                          onChange={(e) => updatePost(post.id, 'postIdea', e.target.value)}
                          placeholder="Enter post idea..."
                        />
                      </td>
                      <td className="p-3">
                        <Select value={post.contentPillar} onValueChange={(value) => updatePost(post.id, 'contentPillar', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pillar" />
                          </SelectTrigger>
                          <SelectContent>
                            {contentPillars.map((pillar) => (
                              <SelectItem key={pillar} value={pillar}>{pillar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Textarea
                          value={post.caption}
                          onChange={(e) => updatePost(post.id, 'caption', e.target.value)}
                          placeholder="Write your caption..."
                          rows={3}
                        />
                      </td>
                      <td className="p-3">
                        <Select value={post.visualType} onValueChange={(value) => updatePost(post.id, 'visualType', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Reel">Reel</SelectItem>
                            <SelectItem value="Carousel">Carousel</SelectItem>
                            <SelectItem value="Photo">Photo</SelectItem>
                            <SelectItem value="Graphic">Graphic</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input
                          value={post.cta}
                          onChange={(e) => updatePost(post.id, 'cta', e.target.value)}
                          placeholder="Call to action..."
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={post.notes}
                          onChange={(e) => updatePost(post.id, 'notes', e.target.value)}
                          placeholder="Internal notes..."
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePost(post.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {posts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No posts added yet. Click "Add Post" to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Calendar */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-serif">Monthly Calendar</CardTitle>
                <CardDescription>
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-50 rounded">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                const postsForDate = getPostsForDate(date);
                const isCurrentMonthDate = isCurrentMonth(date);
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      isCurrentMonthDate 
                        ? 'bg-white border-gray-200' 
                        : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}
                  >
                    <div className="text-sm font-medium mb-2">{date.getDate()}</div>
                    <div className="space-y-1">
                      {postsForDate.map((scheduled) => (
                        <div key={scheduled.id} className="text-xs">
                          <Badge variant="secondary" className={getVisualTypeColor(scheduled.post.visualType)}>
                            {scheduled.post.visualType}
                          </Badge>
                          <div className="truncate mt-1">{scheduled.post.postIdea}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Folder System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Folder System Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Create folders on your desktop or cloud to store your content by format (Reels, Captions, Carousels). 
              Label by post date so when it's time to publish, you're one click away.
            </p>
            <Button variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download Folder System ZIP
            </Button>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif">Monthly Planning Checklist</CardTitle>
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

      <MobileNav />
    </div>
  );
}