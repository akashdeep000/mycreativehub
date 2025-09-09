import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from '@/components/BackToDashboard';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Grid3X3, Palette, Target, Play, Image, ClipboardCheck, Recycle, BookOpen, BarChart3, Lightbulb, Smartphone } from "lucide-react";
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
      description: "Define your content goals, segment your content pillars, and match each pillar with a clear Call-to-Action (CTA)",
      icon: Smartphone,
      colour: "orange",
      bgGradient: "from-orange-400 to-orange-500",
      lastUsed: "Never",
      isPopular: true
    },

    {
      id: 3,
      name: "Monthly Content Calendar",
      description: "Visually plan your content across the month with colour-coded tags. Great for balancing post types, tracking launches, and staying consistent without the overwhelm.",
      icon: Calendar,
      colour: "blue",
      bgGradient: "from-blue-400 to-blue-500",
      lastUsed: "1 week ago",
      isPopular: true,
      isInternal: true,
      internalUrl: "/monthly-content-calendar-v3"
    },

    {
      id: 8,
      name: "Reel & Carousel Template Pack",
      description: "Create on-brand, scroll-stopping content with customisable Canva templates for Reels and Carousels.",
      icon: Play,
      colour: "rose",
      bgGradient: "from-rose-400 to-rose-500",
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
      // Internal templates (like Content Batching Planner, Monthly Content Calendar, Reel & Carousel Template Pack)
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
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <BackToDashboard />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Content Creation System</h1>
              <p className="text-gray-600">Organise your content creation workflow</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              3 Systems
            </Badge>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white"
              onClick={() => handleTemplateClick(template)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${template.bgGradient} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <template.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <CardTitle className="text-lg font-serif">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips Panel */}
        <Card className="mt-8 border-0 shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-500 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-gray-800">
                Tips for Using This Section
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-pink-600 font-semibold">•</span>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Start with Your Strategy</h4>
                  <p className="text-gray-600 text-sm">Begin with a content plan that aligns with your goals, but don't be afraid to revisit and tweak it as your content evolves!</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-pink-600 font-semibold">•</span>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Fill Out Your Monthly Planner</h4>
                  <p className="text-gray-600 text-sm">Use the calendar to map out content types and assign post statuses to stay on track.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-pink-600 font-semibold">•</span>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Grab the Canva Templates</h4>
                  <p className="text-gray-600 text-sm">Once your calendar's filled in, head to the template pack to start creating.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <MobileNav />
    </div>
  );
}
