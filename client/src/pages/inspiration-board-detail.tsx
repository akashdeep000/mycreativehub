import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  StickyNote,
  Palette,
  Link as LinkIcon,
  Pin,
  Trash2,
  Edit,
  Save,
  X,
  Download,
  Settings,
  MoreHorizontal,
  Move,
  Copy
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { InspirationBoard, InspirationBoardImage, InspirationBoardNote, ColorPalette, BoardLink } from "@shared/schema";

const noteColors = [
  { value: "yellow", class: "bg-yellow-200 border-yellow-300", label: "Yellow" },
  { value: "pink", class: "bg-pink-200 border-pink-300", label: "Pink" },
  { value: "blue", class: "bg-blue-200 border-blue-300", label: "Blue" },
  { value: "green", class: "bg-green-200 border-green-300", label: "Green" },
  { value: "purple", class: "bg-purple-200 border-purple-300", label: "Purple" },
  { value: "orange", class: "bg-orange-200 border-orange-300", label: "Orange" },
];

const backgroundOptions = [
  { value: "white", label: "Clean White", class: "bg-white" },
  { value: "cream", label: "Soft Cream", class: "bg-cream" },
  { value: "grey", label: "Light Grey", class: "bg-gray-50" },
  { value: "pink", label: "Soft Pink", class: "bg-pink-50" },
  { value: "blue", label: "Soft Blue", class: "bg-blue-50" },
  { value: "purple", label: "Soft Purple", class: "bg-purple-50" },
];

const inspirationPrompts = [
  "What does this make you think of?",
  "Where could this lead?",
  "What project might this inspire?",
  "How does this make you feel?",
  "What story does this tell?",
];

export default function InspirationBoardDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");
  const [newNote, setNewNote] = useState({ title: "", content: "", color: "yellow" });
  const [newLink, setNewLink] = useState({ url: "", title: "", description: "" });
  const [newPalette, setNewPalette] = useState({ name: "", colors: ["#ffffff"] });
  const [newImage, setNewImage] = useState({ url: "", alt: "", file: null as File | null });
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isPaletteDialogOpen, setIsPaletteDialogOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["/api/inspiration-boards", id],
    enabled: isAuthenticated && !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ["/api/inspiration-boards", id, "images"],
    enabled: isAuthenticated && !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["/api/inspiration-boards", id, "notes"],
    enabled: isAuthenticated && !!id,
  });

  const { data: palettes = [] } = useQuery({
    queryKey: ["/api/inspiration-boards", id, "palettes"],
    enabled: isAuthenticated && !!id,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["/api/inspiration-boards", id, "links"],
    enabled: isAuthenticated && !!id,
  });

  const updateBoardMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/inspiration-boards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards", id] });
      toast({
        title: "Board Updated",
        description: "Your changes have been saved.",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: any) => {
      return await apiRequest(`/api/inspiration-boards/${id}/notes`, {
        method: "POST",
        body: JSON.stringify(note),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards", id, "notes"] });
      setIsNoteDialogOpen(false);
      setNewNote({ title: "", content: "", color: "yellow" });
      toast({
        title: "Note Added",
        description: "Your inspiration note has been added to the board.",
      });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async (link: any) => {
      return await apiRequest(`/api/inspiration-boards/${id}/links`, {
        method: "POST",
        body: JSON.stringify(link),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards", id, "links"] });
      setIsLinkDialogOpen(false);
      setNewLink({ url: "", title: "", description: "" });
      toast({
        title: "Link Added",
        description: "Reference link has been added to your board.",
      });
    },
  });

  const addPaletteMutation = useMutation({
    mutationFn: async (palette: any) => {
      return await apiRequest(`/api/inspiration-boards/${id}/palettes`, {
        method: "POST",
        body: JSON.stringify(palette),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards", id, "palettes"] });
      setIsPaletteDialogOpen(false);
      setNewPalette({ name: "", colors: ["#ffffff"] });
      toast({
        title: "Palette Added",
        description: "Color palette has been added to your board.",
      });
    },
  });

  const handleTitleSave = () => {
    if (boardTitle.trim() && boardTitle !== board?.title) {
      updateBoardMutation.mutate({ title: boardTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAddNote = () => {
    if (!newNote.content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some content for your note.",
        variant: "destructive",
      });
      return;
    }

    // Generate random position and slight rotation for natural look
    const position = {
      x: Math.random() * 300 + 100,
      y: Math.random() * 200 + 100,
      rotation: (Math.random() - 0.5) * 6, // -3 to +3 degrees
    };

    addNoteMutation.mutate({
      boardId: parseInt(id!),
      title: newNote.title.trim() || null,
      content: newNote.content.trim(),
      color: newNote.color,
      position,
    });
  };

  const handleAddLink = () => {
    if (!newLink.url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL for the reference link.",
        variant: "destructive",
      });
      return;
    }

    addLinkMutation.mutate({
      boardId: parseInt(id!),
      url: newLink.url.trim(),
      title: newLink.title.trim() || null,
      description: newLink.description.trim() || null,
      position: links.length,
    });
  };

  const handleAddPalette = () => {
    if (!newPalette.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your color palette.",
        variant: "destructive",
      });
      return;
    }

    const colors = newPalette.colors.filter(color => color.trim());
    if (colors.length === 0) {
      toast({
        title: "Colors Required",
        description: "Please add at least one color to your palette.",
        variant: "destructive",
      });
      return;
    }

    addPaletteMutation.mutate({
      boardId: parseInt(id!),
      name: newPalette.name.trim(),
      colors: colors.map(color => ({ color: color.trim() })),
    });
  };

  const addColorToPalette = () => {
    setNewPalette(prev => ({
      ...prev,
      colors: [...prev.colors, "#ffffff"]
    }));
  };

  const updatePaletteColor = (index: number, color: string) => {
    setNewPalette(prev => ({
      ...prev,
      colors: prev.colors.map((c, i) => i === index ? color : c)
    }));
  };

  const removePaletteColor = (index: number) => {
    if (newPalette.colors.length > 1) {
      setNewPalette(prev => ({
        ...prev,
        colors: prev.colors.filter((_, i) => i !== index)
      }));
    }
  };

  const addImageMutation = useMutation({
    mutationFn: async (image: any) => {
      return await apiRequest(`/api/inspiration-boards/${id}/images`, {
        method: "POST",
        body: JSON.stringify(image),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards", id, "images"] });
      setIsImageDialogOpen(false);
      setNewImage({ url: "", alt: "", file: null });
      toast({
        title: "Image Added",
        description: "Image has been added to your board.",
      });
    },
  });

  const handleAddImage = () => {
    if (!newImage.url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter an image URL.",
        variant: "destructive",
      });
      return;
    }

    // Generate random position for the image
    const position = {
      x: Math.random() * 300 + 100,
      y: Math.random() * 200 + 100,
      rotation: (Math.random() - 0.5) * 3, // -1.5 to +1.5 degrees
    };

    addImageMutation.mutate({
      boardId: parseInt(id!),
      imageUrl: newImage.url.trim(),
      caption: newImage.alt.trim() || null,
      position,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // For now, just show a message that file upload is coming soon
      toast({
        title: "File Upload Coming Soon",
        description: "File upload functionality will be available soon. Please use image URLs for now.",
        variant: "destructive",
      });
    }
  };

  const handleDragDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      toast({
        title: "Drag & Drop Coming Soon",
        description: "Drag & drop functionality will be available soon. Please use image URLs for now.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (board) {
      setBoardTitle(board.title);
    }
  }, [board]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (boardLoading) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">Board Not Found</h2>
            <p className="text-gray-600 mb-6">The inspiration board you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/inspiration-hub")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inspiration Hub
            </Button>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  const selectedBackground = backgroundOptions.find(bg => bg.value === board.backgroundColor);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/inspiration-hub")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Hub
              </Button>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    className="text-2xl font-serif font-semibold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSave();
                      if (e.key === "Escape") {
                        setBoardTitle(board.title);
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleTitleSave}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setBoardTitle(board.title);
                      setIsEditingTitle(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <h1 
                  className="text-2xl font-serif font-semibold text-gray-800 cursor-pointer hover:text-purple-600 transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {board.title}
                  <Edit className="w-4 h-4 inline ml-2 opacity-50" />
                </h1>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-gray-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {board.description && (
            <p className="text-gray-600 max-w-2xl">{board.description}</p>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Image to Board</DialogTitle>
                  <DialogDescription>Add visual inspiration to your board using an image URL or file upload.</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                  {/* URL Input */}
                  <div className="grid gap-3">
                    <label className="text-sm font-medium">Image URL</label>
                    <Input
                      value={newImage.url}
                      onChange={(e) => setNewImage(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      type="url"
                    />
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Input
                        value={newImage.alt}
                        onChange={(e) => setNewImage(prev => ({ ...prev, alt: e.target.value }))}
                        placeholder="Describe this image..."
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {newImage.url && (
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Preview</label>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                        <img
                          src={newImage.url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={() => {
                            toast({
                              title: "Invalid Image",
                              description: "Could not load image from this URL.",
                              variant: "destructive",
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onDrop={handleDragDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddImage} 
                    disabled={!newImage.url.trim() || addImageMutation.isPending}
                  >
                    {addImageMutation.isPending ? "Adding..." : "Add Image"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <StickyNote className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Inspiration Note</DialogTitle>
                  <DialogDescription>Capture quick thoughts and ideas in post-it style.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Title (Optional)</label>
                    <Input
                      value={newNote.title}
                      onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Note title..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                      placeholder={inspirationPrompts[Math.floor(Math.random() * inspirationPrompts.length)]}
                      rows={4}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Color</label>
                    <Select value={newNote.color} onValueChange={(value) => setNewNote(prev => ({ ...prev, color: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {noteColors.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded ${color.class}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddNote} disabled={addNoteMutation.isPending}>
                    {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPaletteDialogOpen} onOpenChange={setIsPaletteDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Color Palette</DialogTitle>
                  <DialogDescription>Build a custom color palette for your inspiration board.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Palette Name</label>
                    <Input
                      value={newPalette.name}
                      onChange={(e) => setNewPalette(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Brand Colors, Sunset Vibes..."
                    />
                  </div>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Colors</label>
                      <Button size="sm" variant="outline" onClick={addColorToPalette}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add Color
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      {newPalette.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => updatePaletteColor(index, e.target.value)}
                              className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer bg-white"
                              style={{ backgroundColor: color }}
                            />
                            <div 
                              className="absolute inset-0 rounded-lg border-2 border-white shadow-sm pointer-events-none"
                              style={{ backgroundColor: color }}
                            />
                          </div>
                          <Input
                            value={color}
                            onChange={(e) => updatePaletteColor(index, e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1 font-mono text-sm"
                          />
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                navigator.clipboard.writeText(color);
                                toast({
                                  title: "Copied!",
                                  description: `Color ${color} copied to clipboard`,
                                });
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {newPalette.colors.length > 1 && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => removePaletteColor(index)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Color Palette Preview */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium mb-3">Preview</h4>
                      <div className="flex gap-2 flex-wrap">
                        {newPalette.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPaletteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddPalette} disabled={addPaletteMutation.isPending}>
                    {addPaletteMutation.isPending ? "Creating..." : "Create Palette"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Reference Link</DialogTitle>
                  <DialogDescription>Save external resources and inspiration links.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">URL</label>
                    <Input
                      value={newLink.url}
                      onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Title (Optional)</label>
                    <Input
                      value={newLink.title}
                      onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Descriptive title for this link"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      value={newLink.description}
                      onChange={(e) => setNewLink(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Why this link is valuable or relevant..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddLink} disabled={addLinkMutation.isPending}>
                    {addLinkMutation.isPending ? "Adding..." : "Add Link"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Board Canvas */}
        <div 
          ref={boardRef}
          className="flex-1 overflow-auto bg-gray-50"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          <div className="max-w-7xl mx-auto p-6">
            {/* Images Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Existing Images */}
                {images.map((image: InspirationBoardImage) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 hover:border-gray-300"
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.caption || "Inspiration"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-gray-700 truncate">
                        {image.caption || "Untitled"}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Image Placeholder Cards */}
                {Array.from({ length: Math.max(3, 6 - images.length) }).map((_, index) => (
                  <Dialog key={`placeholder-${index}`} open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                    <DialogTrigger asChild>
                      <div className="aspect-square bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-gray-500 mb-2" />
                        <span className="text-sm text-gray-500 group-hover:text-gray-600 font-medium">Add Image</span>
                        <span className="text-xs text-gray-400 mt-1">Click to upload</span>
                      </div>
                    </DialogTrigger>
                  </Dialog>
                ))}
              </div>
            </div>

            {/* Color Palettes Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Colors
                </h3>
                <Dialog open={isPaletteDialogOpen} onOpenChange={setIsPaletteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Palette
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
              
              {palettes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {palettes.map((palette: ColorPalette) => (
                    <Card key={palette.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{palette.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-5 gap-2">
                          {palette.colors && Array.isArray(palette.colors) && (palette.colors as any[]).length > 0 ? (
                            (palette.colors as any[]).map((colorObj: any, index: number) => (
                              <div
                                key={index}
                                className="aspect-square rounded-lg border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                style={{ backgroundColor: colorObj.color }}
                                title={`${colorObj.color}${colorObj.name ? ` - ${colorObj.name}` : ''}`}
                              />
                            ))
                          ) : (
                            <div className="col-span-5 text-center py-4">
                              <p className="text-sm text-gray-500 italic">No colors in this palette</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No color palettes yet</p>
                  <p className="text-sm text-gray-500 mb-4">Add color palettes to organize your inspiration</p>
                  <Dialog open={isPaletteDialogOpen} onOpenChange={setIsPaletteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Palette
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
            </div>

            {/* Notes Section */}
            {notes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <StickyNote className="w-5 h-5" />
                  Notes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note: InspirationBoardNote) => {
                    const noteColor = noteColors.find(c => c.value === note.color) || noteColors[0];
                    return (
                      <div
                        key={note.id}
                        className={`p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow ${noteColor.class}`}
                      >
                        {note.title && (
                          <h4 className="font-semibold text-sm mb-2 text-gray-800">{note.title}</h4>
                        )}
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Links Section */}
            {links.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  References
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {links.map((link: BoardLink) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1 truncate">
                        {link.title || "Untitled Link"}
                      </div>
                      <div className="text-xs text-blue-600 truncate mb-2">{link.url}</div>
                      {link.description && (
                        <div className="text-xs text-gray-600 line-clamp-2">{link.description}</div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {notes.length === 0 && images.length === 0 && palettes.length === 0 && links.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <StickyNote className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-gray-700 mb-2">
                    Your Creative Canvas Awaits
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Start building your visual moodboard with images, notes, color palettes, and reference links.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setIsNoteDialogOpen(true)}>
                      <StickyNote className="w-4 h-4 mr-2" />
                      Add First Note
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}