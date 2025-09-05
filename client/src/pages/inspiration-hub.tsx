import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Lightbulb, 
  Plus, 
  Palette, 
  Image, 
  Bookmark, 
  Sparkles,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  Eye,
  Pin,
  Grid3X3,
  Link as LinkIcon,
  StickyNote,
  Download,
  ArrowLeft
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { InspirationBoard } from "@shared/schema";

const backgroundOptions = [
  { value: "white", label: "Clean White", class: "bg-white" },
  { value: "cream", label: "Soft Cream", class: "bg-cream" },
  { value: "grey", label: "Light Grey", class: "bg-gray-50" },
  { value: "pink", label: "Soft Pink", class: "bg-pink-50" },
  { value: "blue", label: "Soft Blue", class: "bg-blue-50" },
  { value: "purple", label: "Soft Purple", class: "bg-purple-50" },
];

const textureOptions = [
  { value: "paper", label: "Paper", class: "bg-gradient-to-br from-white to-gray-50" },
  { value: "canvas", label: "Canvas", class: "bg-gradient-to-br from-amber-50 to-orange-50" },
  { value: "linen", label: "Linen", class: "bg-gradient-to-br from-stone-50 to-stone-100" },
];

export default function InspirationHub() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<InspirationBoard | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");

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

  const { data: boards = [], isLoading: boardsLoading } = useQuery<InspirationBoard[]>({
    queryKey: ["/api/inspiration-boards"],
    enabled: isAuthenticated,
  });



  const createBoardMutation = useMutation({
    mutationFn: async (boardData: { title: string; description?: string }) => {
      console.log("Frontend - Creating board with data:", boardData);
      return await apiRequest("/api/inspiration-boards", {
        method: "POST",
        body: JSON.stringify(boardData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards"] });
      setIsCreateDialogOpen(false);
      setNewBoardTitle("");
      setNewBoardDescription("");
      toast({
        title: "Board Created",
        description: "Your new inspiration board has been created successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create inspiration board. Please try again.",
        variant: "destructive",
      });
    },
  });

  const duplicateBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      return await apiRequest(`/api/inspiration-boards/${boardId}/duplicate`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards"] });
      toast({
        title: "Board Duplicated",
        description: "Board has been duplicated successfully.",
      });
    },
  });



  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId: number) => {
      return await apiRequest(`/api/inspiration-boards/${boardId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration-boards"] });
      toast({
        title: "Board Deleted",
        description: "Board has been permanently deleted.",
      });
    },
  });

  const handleCreateBoard = () => {
    if (!newBoardTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your inspiration board.",
        variant: "destructive",
      });
      return;
    }

    createBoardMutation.mutate({
      title: newBoardTitle.trim(),
      description: newBoardDescription.trim() || undefined,
    });
  };

  const handleViewBoard = (boardId: number) => {
    setLocation(`/inspiration-hub/board/${boardId}`);
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (boardsLoading) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
        <Sidebar />
        <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
      <Sidebar />
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to main dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/streamline-workflow")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Streamline Your Workflow
            </Button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Inspiration Hub</h1>
              <p className="text-gray-600">Create visual moodboards and organise your creative inspiration</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                {boards.length} Board{boards.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Board
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Inspiration Board</DialogTitle>
                  <DialogDescription>
                    Start a new visual moodboard to collect and organise your creative inspiration.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Board Title
                    </label>
                    <Input
                      id="title"
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      placeholder="e.g. Brand Identity, Website Redesign, Product Launch"
                      maxLength={100}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">
                      Description (Optional)
                    </label>
                    <Textarea
                      id="description"
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Brief description of what this board is for..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateBoard}
                    disabled={createBoardMutation.isPending}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  >
                    {createBoardMutation.isPending ? "Creating..." : "Create Board"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Empty State */}
        {boards.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">
              Welcome to Your Inspiration Hub
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">Saw something that sparked an idea? 
            Snap it, screenshot it, drop it in here.

            No more digging through your camera roll...this is your space to collect, save and actually use the things that inspire you.</p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Board
            </Button>
          </div>
        )}

        {/* Active Boards Grid */}
        {boards.length > 0 && (
          <div>
            <h2 className="text-xl font-serif font-semibold text-gray-800 mb-6">Active Boards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {boards.map((board: InspirationBoard) => (
                <Card key={board.id} className="border-pink-100 hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden">
                  <div 
                    className={`absolute inset-0 opacity-5 ${
                      backgroundOptions.find(bg => bg.value === board.backgroundColor)?.class || "bg-white"
                    }`}
                  />
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Lightbulb className="w-5 h-5 text-white" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewBoard(board.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Board
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateBoardMutation.mutate(board.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteBoardMutation.mutate(board.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-lg font-serif group-hover:text-purple-600 transition-colors">
                      {board.title}
                    </CardTitle>
                    {board.description && (
                      <CardDescription className="line-clamp-2">
                        {board.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Created {new Date(board.createdAt!).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1">
                        <Grid3X3 className="w-4 h-4" />
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors"
                      onClick={() => handleViewBoard(board.id)}
                    >
                      Open Board
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}



        {/* Quick Tips */}
        {boards.length > 0 && (
          <Card className="mt-12 border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50">
            <CardContent className="p-6">
              <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Inspiration Hub Tips
              </h3>
              <div className="text-gray-600 text-sm space-y-4">
                <p>This isn't meant to replace Pinterest - think of it as a practical space to organise your creative ideas in one place. Use it to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Save screenshots you've taken while browsing</li>
                  <li>Store colour palettes and keep track of hex codes you love</li>
                  <li>Bookmark helpful websites or resources relevant to your board's theme</li>
                  <li>Add post-it style notes to jot down ideas, reminders, or creative directions for each board</li>
                </ul>
                <p>
                  Keep everything in one spot so your inspiration is easy to find when it's time to create.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <MobileNav />
    </div>
  );
}