import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Video, Image, Home } from "lucide-react";
import { Link } from "wouter";

export default function ReelCarouselTemplates() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const templates = [
    {
      id: 1,
      name: "Editable Reels Template",
      description: "Customisable Canva templates for short-form video content",
      icon: Video,
      colour: "purple",
      url: "https://www.canva.com"
    },
    {
      id: 2,
      name: "Editable Carousel Template", 
      description: "Swipe-worthy Canva templates designed for engagement and clarity",
      icon: Image,
      colour: "blue",
      url: "https://www.canva.com"
    }
  ];

  const handleTemplateClick = (template: any) => {
    window.open(template.url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 lg:ml-64">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Back to Main Dashboard
              </Button>
            </Link>
            <Link href="/content-planning">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content Planning
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Reel & Carousel Template Pack</h1>
              <p className="text-gray-600">Create on-brand, easy to edit content with customisable Canva templates</p>
            </div>
          </div>
        </div>

        {/* Instruction Section */}
        <Card className="mb-8 shadow-md border-0 bg-white">
          <CardContent className="p-6">
            <div className="text-gray-700">
              <p className="font-medium mb-2">Choose your template type to get started (these are available to use in the free version of Canva).</p>
              <p className="text-[16px]">Use the template as your starting point - then make it yours. Add your brand fonts and colours, and swap in your own footage or text overlays whenever you create new content.</p>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-4xl">
          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className="shadow-md border-0 bg-white hover:shadow-lg transition-all duration-300 cursor-pointer group hover:scale-105"
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${template.colour}-400 to-${template.colour}-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <template.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-serif">{template.name}</CardTitle>
                  <CardDescription className="text-gray-600">{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Ready to customise</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-pink-600 hover:text-pink-700 bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateClick(template);
                      }}
                    >
                      Open in Canva
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          
        </div>
      </div>
    </div>
  );
}