import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Plus, 
  Archive, 
  Clock, 
  Lightbulb, 
  Calendar, 
  CheckSquare, 
  Bot, 
  Settings,
  FileText,
  Zap,
  MoreVertical
} from "lucide-react";
import type { WorkflowTemplateInstance } from "@shared/schema";
import CreativeInspirationHub from "@/components/workflow/creative-inspiration-hub";
import TimeBlockingPlanner from "@/components/workflow/time-blocking-planner";

// Template configuration with pre-built data
const workflowTemplates = [
  {
    id: "inspiration",
    name: "Creative Inspiration Hub",
    description: "Store moodboards, color palettes, and reference links",
    icon: Lightbulb,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    textColor: "text-white",
    defaultData: {
      moodboard: {
        images: [
          { id: 1, url: "https://via.placeholder.com/200x150/8B5CF6/FFFFFF?text=Inspiration+1", alt: "Inspiration 1" },
          { id: 2, url: "https://via.placeholder.com/200x150/A855F7/FFFFFF?text=Inspiration+2", alt: "Inspiration 2" },
          { id: 3, url: "https://via.placeholder.com/200x150/9333EA/FFFFFF?text=Inspiration+3", alt: "Inspiration 3" }
        ],
        notes: [
          { id: 1, text: "Minimalist design with bold typography", color: "#8B5CF6" },
          { id: 2, text: "Nature-inspired color palette", color: "#A855F7" },
          { id: 3, text: "Clean layouts with plenty of white space", color: "#9333EA" }
        ]
      }
    }
  },
  {
    id: "time-blocking",
    name: "Time Blocking Planner",
    description: "Weekly calendar with drag-and-drop scheduling",
    icon: Calendar,
    color: "bg-gradient-to-br from-blue-500 to-teal-500",
    textColor: "text-white",
    defaultData: {
      weeklyView: {
        blocks: [
          { id: "block-1", title: "Focus Work", startTime: "09:00", duration: 2, color: "#3B82F6", day: "Monday" },
          { id: "block-2", title: "Emails", startTime: "11:00", duration: 1, color: "#10B981", day: "Monday" },
          { id: "block-3", title: "Creative Session", startTime: "14:00", duration: 2, color: "#8B5CF6", day: "Monday" },
          { id: "block-4", title: "Planning", startTime: "09:00", duration: 1, color: "#F59E0B", day: "Tuesday" },
          { id: "block-5", title: "Client Work", startTime: "10:00", duration: 2, color: "#EF4444", day: "Tuesday" },
          { id: "block-6", title: "Deep Work", startTime: "09:00", duration: 3, color: "#3B82F6", day: "Wednesday" },
          { id: "block-7", title: "Team Meeting", startTime: "13:00", duration: 1, color: "#10B981", day: "Wednesday" }
        ]
      },
      monthlyView: {
        blocks: [
          { 
            id: "month-1", 
            title: "Project Deadline", 
            startTime: "10:00", 
            duration: 1, 
            color: "#EF4444", 
            day: new Date().toISOString().split('T')[0]
          },
          { 
            id: "month-2", 
            title: "Weekly Review", 
            startTime: "15:00", 
            duration: 1, 
            color: "#8B5CF6", 
            day: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ],
        selectedMonth: new Date().toISOString().slice(0, 7)
      }
    }
  },
  {
    id: "prioritization",
    name: "Daily Prioritization Framework",
    description: "Must/Should/Could task organization system",
    icon: CheckSquare,
    color: "bg-gradient-to-br from-green-500 to-emerald-500",
    textColor: "text-white",
    defaultData: {
      tasks: {
        must: [
          { id: 1, text: "Complete project proposal", completed: false, priority: "high" },
          { id: 2, text: "Review client feedback", completed: true, priority: "high" },
          { id: 3, text: "Submit invoice", completed: false, priority: "medium" }
        ],
        should: [
          { id: 4, text: "Update website content", completed: false, priority: "medium" },
          { id: 5, text: "Schedule team meeting", completed: true, priority: "low" }
        ],
        could: [
          { id: 6, text: "Research new tools", completed: false, priority: "low" },
          { id: 7, text: "Organize workspace", completed: false, priority: "low" }
        ]
      }
    }
  },
  {
    id: "manychat",
    name: "Automate with Manychat",
    description: "Build chatbot sequences and automate conversations",
    icon: Bot,
    color: "bg-gradient-to-br from-orange-500 to-red-500",
    textColor: "text-white",
    defaultData: {
      affiliateLink: "https://manychat.com/ref/affiliate-link",
      sequence: [
        { id: 1, type: "welcome", text: "Welcome! How can I help you today?", icon: "👋" },
        { id: 2, type: "question", text: "What are you looking for?", options: ["Products", "Support", "Info"], icon: "❓" },
        { id: 3, type: "response", text: "Great! Let me show you our options.", icon: "📱" },
        { id: 4, type: "link", text: "Check out our latest offerings", url: "#", icon: "🔗" }
      ]
    }
  },
  {
    id: "automation",
    name: "Automation System Toolkit",
    description: "Connect apps and automate repetitive tasks",
    icon: Zap,
    color: "bg-gradient-to-br from-yellow-500 to-orange-500",
    textColor: "text-white",
    defaultData: {
      flows: [
        {
          id: 1,
          name: "New Sale → Notion Database",
          trigger: "New sale in Stripe",
          action: "Add to Notion DB",
          active: true,
          parameters: {
            stripeWebhook: "enabled",
            notionDatabase: "Sales Tracker",
            fields: ["Customer Name", "Amount", "Date", "Product"]
          }
        }
      ]
    }
  }
];

export default function StreamlineWorkflow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch user's workflow templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/workflow-templates"],
    enabled: !!user,
  });

  // Fetch archived templates
  const { data: archivedTemplates, isLoading: archivedLoading } = useQuery({
    queryKey: ["/api/workflow-templates", "archived"],
    enabled: !!user && activeTab === "archived",
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await fetch("/api/workflow-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates"] });
    },
  });

  // Archive template mutation
  const archiveTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/workflow-templates/${templateId}/archive`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
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

  const isLoading = templatesLoading || (activeTab === "archived" && archivedLoading);

  if (selectedTemplate) {
    const templateConfig = workflowTemplates.find(t => t.id === selectedTemplate);
    const templateInstance = getTemplateByType(selectedTemplate);

    if (!templateConfig || !templateInstance) {
      return <div>Template not found</div>;
    }

    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <MobileNav />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Templates
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{templateConfig.name}</h1>
                    <p className="text-gray-600">{templateConfig.description}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleArchiveTemplate(templateInstance.id)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive This Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Template-specific content */}
              <div className="bg-white rounded-lg shadow-sm p-6">
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Streamline Your Workflow</h1>
              <p className="text-gray-600">
                Pre-built templates to organize your creative business processes
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
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
                              <div className={`p-3 rounded-lg ${template.color}`}>
                                <IconComponent className={`h-6 w-6 ${template.textColor}`} />
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
                              <Badge variant="secondary" className="text-xs">
                                {count > 0 ? `${count} Template${count !== 1 ? 's' : ''}` : 'Pre-loaded'}
                              </Badge>
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
              </TabsContent>

              <TabsContent value="archived" className="space-y-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-3">
                          <div className="h-6 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : archivedTemplates && archivedTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {archivedTemplates.map((template: WorkflowTemplateInstance) => {
                      const templateConfig = workflowTemplates.find(t => t.id === template.templateType);
                      if (!templateConfig) return null;
                      
                      const IconComponent = templateConfig.icon;
                      
                      return (
                        <Card key={template.id} className="border-0 shadow-md bg-white opacity-75">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg ${templateConfig.color}`}>
                                <IconComponent className={`h-6 w-6 ${templateConfig.textColor}`} />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                                  {template.title}
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-600">
                                  Archived {formatDate(template.archivedAt?.toString() || template.updatedAt?.toString())}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Badge variant="outline" className="text-xs">
                              <Archive className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No archived templates</h3>
                    <p className="text-gray-600">
                      When you archive templates, they'll appear here
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}