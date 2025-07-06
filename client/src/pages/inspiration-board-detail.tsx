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
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Image to Board</DialogTitle>
                  <DialogDescription>Upload an image or paste a URL to add visual inspiration.</DialogDescription>
                </DialogHeader>
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Image upload functionality coming soon</p>
                </div>
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
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="w-4 h-4 mr-2" />
                  Add Palette
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Color Palette</DialogTitle>
                  <DialogDescription>Build a custom color palette for your inspiration board.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Palette Name</label>
                    <Input
                      value={newPalette.name}
                      onChange={(e) => setNewPalette(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Brand Colors, Sunset Vibes..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Colors</label>
                      <Button size="sm" variant="outline" onClick={addColorToPalette}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add Color
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {newPalette.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => updatePaletteColor(index, e.target.value)}
                            className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <Input
                            value={color}
                            onChange={(e) => updatePaletteColor(index, e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                          {newPalette.colors.length > 1 && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => removePaletteColor(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
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
          className={`flex-1 relative overflow-hidden ${selectedBackground?.class || "bg-white"}`}
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          {/* Sticky Notes */}
          {notes.map((note: InspirationBoardNote) => {
            const noteColor = noteColors.find(c => c.value === note.color) || noteColors[0];
            const position = note.position as any;
            
            return (
              <div
                key={note.id}
                className={`absolute w-64 p-4 rounded-lg shadow-lg cursor-move border-2 ${noteColor.class} transform hover:scale-105 transition-transform`}
                style={{
                  left: position?.x || 100,
                  top: position?.y || 100,
                  transform: `rotate(${position?.rotation || 0}deg)`,
                  zIndex: 10,
                }}
              >
                {note.title && (
                  <h4 className="font-semibold text-gray-800 mb-2">{note.title}</h4>
                )}
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Color Palettes Sidebar */}
          {palettes.length > 0 && (
            <div className="absolute top-4 right-4 w-64 space-y-4">
              {palettes.map((palette: ColorPalette) => (
                <Card key={palette.id} className="bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{palette.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {palette.colors && Array.isArray(palette.colors) && (palette.colors as any[]).length > 0 ? (
                        (palette.colors as any[]).map((colorObj: any, index: number) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: colorObj.color }}
                            title={colorObj.color}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No colors yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Links Section */}
          {links.length > 0 && (
            <div className="absolute bottom-4 left-4 right-80 bg-white/90 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                References & Links
              </h3>
              <div className="grid gap-2">
                {links.map((link: BoardLink) => (
                  <div key={link.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {link.title || link.url}
                      </h4>
                      {link.description && (
                        <p className="text-xs text-gray-500 truncate">{link.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      Visit
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {notes.length === 0 && images.length === 0 && palettes.length === 0 && links.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
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

      <MobileNav />
    </div>
  );
}