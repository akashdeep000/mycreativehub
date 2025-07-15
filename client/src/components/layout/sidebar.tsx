import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { navigationItems } from "@/lib/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  LogOut,
  Palette,
  Archive,
  Edit2,
  Check,
  X
} from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to update business title
  const updateBusinessTitleMutation = useMutation({
    mutationFn: async (businessTitle: string) => {
      return await apiRequest('/api/auth/user/business-title', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessTitle })
      });
    },
    onSuccess: (updatedUser) => {
      // Update the user query cache
      queryClient.setQueryData(['/api/auth/user'], updatedUser);
      
      toast({
        title: "Business title updated",
        description: "Your business title has been saved successfully.",
      });
      
      setIsEditingTitle(false);
      setEditedTitle("");
    },
    onError: (error: any) => {
      console.error('Error updating business title:', error);
      toast({
        title: "Error",
        description: "Failed to update business title. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStartEditing = () => {
    setIsEditingTitle(true);
    setEditedTitle(user?.businessTitle || "Creative Business Owner");
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      updateBusinessTitleMutation.mutate(editedTitle.trim());
    }
  };

  const handleCancelEditing = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  return (
    <div className="fixed top-0 left-0 lg:w-64 bg-white lg:shadow-[4px_0_20px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto hidden lg:block z-40">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl flex items-center justify-center">
            <Palette className="text-white text-lg" />
          </div>
          <h1 className="text-xl font-serif font-semibold text-gray-800">Creative Toolkit</h1>
        </div>

        {/* User Profile Section */}
        <div className="mb-8 p-4 bg-pink-50 rounded-2xl">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={user?.profileImageUrl || ""} 
                alt={user?.firstName || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                {user?.firstName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || "Creative User"
                }
              </p>
              
              {/* Editable Business Title */}
              <div className="flex items-center gap-1 mt-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1 w-full">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="text-sm h-6 px-2 py-1 border-pink-200 focus:border-pink-400 focus:ring-pink-400"
                      placeholder="Enter your business title"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveTitle}
                      disabled={updateBusinessTitleMutation.isPending}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditing}
                      disabled={updateBusinessTitleMutation.isPending}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group cursor-pointer" onClick={handleStartEditing}>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.businessTitle || "Creative Business Owner"}
                    </p>
                    <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-3 mb-8">
          {navigationItems.map((item) => (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-left transition-colors ${
                location === item.href
                  ? "bg-pink-100 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-left text-sm whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Archive Link */}
        <div className="mb-6">
          <button
            onClick={() => setLocation("/archived-templates")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-colours ${
              location === "/archived-templates"
                ? "bg-pink-100 text-pink-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Archive className="w-5 h-5 flex-shrink-0" />
            <span className="text-left text-sm">Archived Templates</span>
          </button>
        </div>

        {/* Settings and Logout */}
        <div className="border-t border-pink-200 pt-6 space-y-2">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </button>
          <button 
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                // Clear JWT token from localStorage
                localStorage.removeItem('authToken');
                window.location.href = "/";
              } catch (error) {
                console.error("Logout error:", error);
              }
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
