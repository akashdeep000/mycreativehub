import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, FileText, Grid3X3, Palette, Target, Play, Image } from "lucide-react";
import { useLocation } from "wouter";

export default function ContentPlanning() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const templates = [
    {
      id: 1,
      name: "My Social Media Strategy",
      description: "Define your content goals, segment your content pillars, and match each pillar with a clear CTA",
      icon: Target,
      colour: "orange",
      lastUsed: "Never",
      isPopular: true
    },
    {
      id: 2,
      name: "Monthly Content Calendar",
      description: "Plan your content for the entire month with this comprehensive calendar template",
      icon: Calendar,
      colour: "blue",
      lastUsed: "2 days ago",
      isPopular: true
    },
    {
      id: 3,
      name: "Content Batching Planner",
      description: "Organise your content creation sessions for maximum efficiency",
      icon: Grid3X3,
      colour: "purple",
      lastUsed: "1 week ago",
      isPopular: false
    },
    {
      id: 4,
      name: "Blog Post Planner",
      description: "Structure your blog posts with this detailed planning template",
      icon: FileText,
      colour: "green",
      lastUsed: "3 days ago",
      isPopular: true
    },
    {
      id: 5,
      name: "Brand Colour Palette",
      description: "Keep track of your brand colours and visual identity",
      icon: Palette,
      colour: "pink",
      lastUsed: "Never",
      isPopular: false
    },
    {
      id: 6,
      name: "Reel & Carousel Template Pack",
      description: "Create on-brand, scroll-stopping content with customisable Canva templates for Reels and carousels.",
      icon: Play,
      colour: "rose",
      lastUsed: "Never",
      isPopular: true,
      isInternal: true,
      internalUrl: "/reel-carousel-templates"
    }
  ];

  const handleTemplateClick = (template: any) => {
    if (template.id === 1) {
      // My Social Media Strategy
      setLocation('/social-media-strategy');
    } else if (template.isInternal && template.internalUrl) {
      // Internal templates (like Reel & Carousel Template Pack)
      setLocation(template.internalUrl);
    } else if (template.isExternal && template.externalUrl) {
      // External templates (like Canva template pack)
      window.open(template.externalUrl, '_blank');
    } else {
      // Other templates can be handled here
      toast({
        title: "Template",
        description: `${template.name} is not yet implemented.`,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-rose-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Content Planning</h1>
              <p className="text-gray-600">Organize your content creation workflow</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                6 Templates
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="border-pink-100 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleTemplateClick(template)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br from-${template.colour}-400 to-${template.colour}-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <template.icon className="w-5 h-5 text-white" />
                  </div>
                  {template.isPopular && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-serif">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Last used: {template.lastUsed}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`${template.isExternal ? 'text-pink-600 hover:text-pink-700 bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100' : 'text-blue-600 hover:text-blue-700'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateClick(template);
                    }}
                  >
                    {template.isExternal ? 'Open in Canva' : 'Open'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Getting Started Section */}
        <Card className="mt-8 border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4">
              Getting Started with Content Planning
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">1. Choose Your Template</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Start with the Monthly Content Calendar for a comprehensive overview of your content strategy.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">2. Customize Your Plan</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Adapt the template to match your brand voice, posting schedule, and content themes.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">3. Batch Your Content</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Use the batching planner to create multiple pieces of content in focused sessions.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">4. Track Your Progress</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Monitor your content performance and adjust your strategy based on what works.
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
