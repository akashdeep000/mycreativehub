import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, Palette, Image, Bookmark, Sparkles } from "lucide-react";

export default function InspirationHub() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const collections = [
    {
      id: 1,
      name: "Brand Colors",
      description: "Curated color palettes for your brand identity",
      icon: Palette,
      color: "pink",
      itemCount: 12,
      isNew: true
    },
    {
      id: 2,
      name: "Design References",
      description: "Inspiring designs and layouts for your projects",
      icon: Image,
      color: "purple",
      itemCount: 24,
      isNew: false
    },
    {
      id: 3,
      name: "Mood Boards",
      description: "Visual inspiration boards for different projects",
      icon: Sparkles,
      color: "blue",
      itemCount: 8,
      isNew: false
    },
    {
      id: 4,
      name: "Saved Ideas",
      description: "Quick notes and ideas for future projects",
      icon: Bookmark,
      color: "green",
      itemCount: 15,
      isNew: false
    }
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-rose-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Inspiration Hub</h1>
              <p className="text-gray-600">Collect and organize your creative inspiration</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                59 Items
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                New
              </Badge>
            </div>
            <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Inspiration
            </Button>
          </div>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {collections.map((collection) => (
            <Card key={collection.id} className="border-pink-100 hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br from-${collection.color}-400 to-${collection.color}-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <collection.icon className="w-5 h-5 text-white" />
                  </div>
                  {collection.isNew && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-serif">{collection.name}</CardTitle>
                <CardDescription>{collection.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{collection.itemCount} items</span>
                  <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Add Section */}
        <Card className="border-pink-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4">
              Quick Add
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-20 border-purple-200 hover:bg-purple-50">
                <div className="text-center">
                  <Image className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <span className="text-sm font-medium">Upload Image</span>
                </div>
              </Button>
              <Button variant="outline" className="h-20 border-purple-200 hover:bg-purple-50">
                <div className="text-center">
                  <Bookmark className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <span className="text-sm font-medium">Save Link</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inspiration Tips */}
        <Card className="mt-8 border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4">
              Building Your Inspiration Library
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🎨 Organize by Project</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Create separate boards for different projects or clients to keep inspiration focused.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🏷️ Tag Everything</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Use descriptive tags to make it easy to find specific inspiration later.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📱 Capture on the Go</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Take photos of interesting designs, colors, or layouts you encounter daily.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🔄 Regular Review</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Review your inspiration regularly to keep ideas fresh and relevant.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
}
