import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Plus, 
  Archive, 
  Clock, 
  Lightbulb, 
  CalendarDays, 
  CheckSquare, 
  Bot, 
  Settings,
  FileText,
  Zap,
  MoreVertical,
  Workflow
} from "lucide-react";
import type { WorkflowTemplateInstance } from "@shared/schema";
import CreativeInspirationHub from "@/components/workflow/creative-inspiration-hub";
import TimeBlockingPlanner from "@/components/workflow/time-blocking-planner";

// Template configuration with pre-built data
const workflowTemplates = [
  {
    id: "inspiration",
    name: "Creative Inspiration Hub",
    description: "Store moodboards, colour palettes, and reference links",
    icon: Lightbulb,
    colour: "bg-gradient-to-br from-purple-500 to-pink-500",
    textColor: "text-white",
    defaultData: {
      moodboard: {
        images: [
          { id: 1, url: "https://via.placeholder.com/200x150/8B5CF6/FFFFFF?text=Inspiration+1", alt: "Inspiration 1" },
          { id: 2, url: "https://via.placeholder.com/200x150/A855F7/FFFFFF?text=Inspiration+2", alt: "Inspiration 2" },
          { id: 3, url: "https://via.placeholder.com/200x150/9333EA/FFFFFF?text=Inspiration+3", alt: "Inspiration 3" }
        ],
        notes: [
          { id: 1, text: "Minimalist design with bold typography", colour: "#8B5CF6" },
          { id: 2, text: "Nature-inspired colour palette", colour: "#A855F7" },
          { id: 3, text: "Clean layouts with plenty of white space", colour: "#9333EA" }
        ]
      }
    }
  },
  {
    id: "time-blocking",
    name: "Time Blocking Planner",
    description: "Weekly and Monthly calendar with click-and-drop scheduling",
    icon: CalendarDays,
    colour: "bg-gradient-to-br from-blue-500 to-teal-500",
    textColor: "text-white",
    defaultData: {
      weeklyView: {
        blocks: [
          { id: "block-1", title: "Newsletter Content", startTime: "09:00", duration: 2, colour: "#3B82F6", colourTagId: "tag-1", day: "Monday" },
          { id: "block-2", title: "Blog Post Writing", startTime: "11:00", duration: 1, colour: "#10B981", colourTagId: "tag-2", day: "Monday" },
          { id: "block-3", title: "Instagram Reels", startTime: "14:00", duration: 2, colour: "#8B5CF6", colourTagId: "tag-3", day: "Monday" },
          { id: "block-4", title: "Video Editing", startTime: "09:00", duration: 1, colour: "#F59E0B", colourTagId: "tag-4", day: "Tuesday" },
          { id: "block-5", title: "Weekly Review", startTime: "10:00", duration: 2, colour: "#EF4444", colourTagId: "tag-5", day: "Tuesday" },
          { id: "block-6", title: "Course Development", startTime: "09:00", duration: 3, colour: "#14B8A6", colourTagId: "tag-6", day: "Wednesday" },
          { id: "block-7", title: "Brainstorming Session", startTime: "13:00", duration: 1, colour: "#EC4899", colourTagId: "tag-7", day: "Wednesday" }
        ]
      },
      monthlyView: {
        blocks: [
          { 
            id: "month-1", 
            title: "Product Launch Planning", 
            startTime: "10:00", 
            duration: 1, 
            colour: "#EF4444", 
            colourTagId: "tag-5",
            day: new Date().toISOString().split('T')[0]
          },
          { 
            id: "month-2", 
            title: "Content Filming Day", 
            startTime: "15:00", 
            duration: 1, 
            colour: "#8B5CF6", 
            colourTagId: "tag-3",
            day: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ],
        selectedMonth: new Date().toISOString().slice(0, 7)
      },
      colourTags: [
        { id: "tag-1", label: "Email Marketing", colour: "#3B82F6" }, // Blue
        { id: "tag-2", label: "Content Creation", colour: "#10B981" }, // Green
        { id: "tag-3", label: "Filming", colour: "#8B5CF6" }, // Purple
        { id: "tag-4", label: "Editing", colour: "#F59E0B" }, // Orange/Yellow
        { id: "tag-5", label: "Planning", colour: "#EF4444" }, // Red
        { id: "tag-6", label: "Product Development", colour: "#14B8A6" }, // Teal
        { id: "tag-7", label: "Creative Time", colour: "#EC4899" } // Pink
      ]
    }
  },
  {
    id: "automation",
    name: "Automation System Toolkit",
    description: "Plan out your flows and messages before building in ManyChat",
    icon: Zap,
    colour: "bg-gradient-to-br from-orange-500 to-red-500",
    textColor: "text-white",
    isExternal: true,
    externalRoute: "/automation-toolkit",
    defaultData: {}
  },
  {
    id: "sop-builder",
    name: "SOP Builder",
    description: "Create and manage Standard Operating Procedures for your content workflow. Track progress and streamline your processes.",
    icon: FileText,
    colour: "bg-gradient-to-br from-indigo-500 to-purple-500",
    textColor: "text-white",
    isExternal: true,
    externalRoute: "/sop-builder-hub",
    defaultData: {}
  }
];

export default function StreamlineWorkflow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user's workflow templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/workflow-templates"],
    enabled: !!user,
  });



  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await apiRequest("POST", "/api/workflow-templates", templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates"] });
    },
  });

  // Archive template mutation
  const archiveTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("PATCH", `/api/workflow-templates/${templateId}/archive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates"] });
      toast({
        title: "Template Archived",
        description: "Template has been moved to archived section.",
      });
    },
  });

  // Auto-create templates on first visit
  useEffect(() => {
    if (user && templates && Array.isArray(templates) && !isInitialized && !templatesLoading) {
      const existingTemplateTypes = templates.map((t: WorkflowTemplateInstance) => t.templateType);
      const missingTemplates = workflowTemplates.filter(
        template => !existingTemplateTypes.includes(template.id)
      );

      if (missingTemplates.length > 0) {
        Promise.all(
          missingTemplates.map(template =>
            createTemplateMutation.mutateAsync({
              templateType: template.id,
              title: template.name,
              data: template.defaultData
            })
          )
        ).then(() => {
          setIsInitialized(true);
        });
      } else {
        setIsInitialized(true);
      }
    }
  }, [user, templates, isInitialized, templatesLoading]);

  const getTemplateCount = (templateType: string) => {
    // For external templates, show "Access" instead of count
    const templateConfig = workflowTemplates.find(t => t.id === templateType);
    if (templateConfig?.isExternal) {
      return "Access";
    }
    
    if (!templates) return 0;
    return (templates as WorkflowTemplateInstance[]).filter(
      (t: WorkflowTemplateInstance) => t.templateType === templateType && !t.isArchived
    ).length;
  };

  const getTemplateByType = (templateType: string) => {
    if (!templates) return null;
    return (templates as WorkflowTemplateInstance[]).find(
      (t: WorkflowTemplateInstance) => t.templateType === templateType && !t.isArchived
    );
  };

  const handleTemplateClick = (templateType: string) => {
    // Check if it's an external route template
    const templateConfig = workflowTemplates.find(t => t.id === templateType);
    if (templateConfig?.isExternal) {
      setLocation(templateConfig.externalRoute);
      return;
    }
    
    // Route to standalone inspiration hub for the inspiration template
    if (templateType === "inspiration") {
      setLocation("/inspiration-hub");
      return;
    }
    
    // Route to standalone time blocking planner for the time-blocking template
    if (templateType === "time-blocking") {
      setLocation("/time-blocking-planner");
      return;
    }
    
    const template = getTemplateByType(templateType);
    if (template) {
      setSelectedTemplate(templateType);
    }
  };

  const handleArchiveTemplate = (templateId: number) => {
    archiveTemplateMutation.mutate(templateId);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const isLoading = templatesLoading;

  if (selectedTemplate) {
    const templateConfig = workflowTemplates.find(t => t.id === selectedTemplate);
    const templateInstance = getTemplateByType(selectedTemplate);

    if (!templateConfig || !templateInstance) {
      return <div>Template not found</div>;
    }

    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64">
          <MobileNav />
          <main className="flex-1 overflow-y-auto">
            <div className="w-full px-6 sm:px-8 lg:px-12 py-6">
              <div className="flex items-center justify-between mb-6">
                {/* Mobile Navigation - Single Back Arrow */}
                <div className="flex items-center gap-3 lg:hidden">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.history.back()}
                    className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Desktop Navigation - Full Buttons */}
                <div className="hidden lg:flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/")}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Main Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Streamline Workflow
                  </Button>
                </div>
                
              </div>

              {/* Template-specific content */}
              <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
                {selectedTemplate === "inspiration" && (
                  <CreativeInspirationHub
                    templateId={templateInstance.id}
                    initialData={templateInstance.data?.moodboard ? templateInstance.data : templateConfig.defaultData}
                    onSave={(data) => {
                      // Update template data via API
                      fetch(`/api/workflow-templates/${templateInstance.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ data }),
                      });
                    }}
                  />
                )}
                {selectedTemplate === "time-blocking" && (
                  <TimeBlockingPlanner
                    templateId={templateInstance.id}
                    initialData={templateInstance.data?.weeklyView ? templateInstance.data : templateConfig.defaultData}
                    onSave={(data) => {
                      // Update template data via API
                      fetch(`/api/workflow-templates/${templateInstance.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ data }),
                      });
                    }}
                  />
                )}
                {selectedTemplate !== "inspiration" && selectedTemplate !== "time-blocking" && (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-600">
                      {templateConfig.name} workspace coming soon!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 max-w-full overflow-x-hidden">
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
            <div className="mb-8">
              <div className="mb-6">
                {/* Mobile Navigation - Single Back Arrow */}
                <div className="flex items-center gap-3 lg:hidden">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.history.back()}
                    className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Desktop Navigation - Full Button */}
                <div className="hidden lg:flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation("/")}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Main Dashboard
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shrink-0">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-semibold text-gray-800">Streamline Your Workflow</h1>
                  <p className="text-gray-600">Simple systems for busy weeks: organise ideas, block time and keep work moving.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="pb-3">
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workflowTemplates.map((template) => {
                    const count = getTemplateCount(template.id);
                    const IconComponent = template.icon;
                    
                    return (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white"
                        onClick={() => handleTemplateClick(template.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${template.colour}`}>
                              <IconComponent className={`w-5 h-5 ${template.textColor}`} />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                                {template.name}
                              </CardTitle>
                              <CardDescription className="text-sm text-gray-600">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Click to open
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
        </main>
      </div>
    </div>
  );
}