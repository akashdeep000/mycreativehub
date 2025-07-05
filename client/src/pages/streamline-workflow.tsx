import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Zap
} from "lucide-react";
import type { WorkflowTemplateInstance } from "@shared/schema";

// Template configuration
const workflowTemplates = [
  {
    id: "inspiration",
    name: "Creative Inspiration Hub",
    description: "Store moodboards, color palettes, and reference links",
    icon: Lightbulb,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    textColor: "text-white",
  },
  {
    id: "time-blocking",
    name: "Time Blocking Planner",
    description: "Weekly calendar with drag-and-drop scheduling",
    icon: Calendar,
    color: "bg-gradient-to-br from-blue-500 to-teal-500",
    textColor: "text-white",
  },
  {
    id: "prioritization",
    name: "Daily Prioritization Framework",
    description: "Must/Should/Could task organization system",
    icon: CheckSquare,
    color: "bg-gradient-to-br from-green-500 to-emerald-500",
    textColor: "text-white",
  },
  {
    id: "manychat",
    name: "Automate with Manychat",
    description: "Templates and flows for customer automation",
    icon: Bot,
    color: "bg-gradient-to-br from-orange-500 to-red-500",
    textColor: "text-white",
  },
  {
    id: "automation",
    name: "Automation System Toolkit",
    description: "Zapier templates and workflow connections",
    icon: Zap,
    color: "bg-gradient-to-br from-indigo-500 to-purple-500",
    textColor: "text-white",
  },
];

export default function StreamlineWorkflow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");

  // Fetch workflow templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/workflow-templates"],
    enabled: !!user,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch archived templates
  const { data: archivedTemplates = [], isLoading: archivedLoading } = useQuery({
    queryKey: ["/api/workflow-templates", "archived"],
    queryFn: async () => {
      const res = await fetch("/api/workflow-templates?includeArchived=true");
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const allTemplates = await res.json();
      return allTemplates.filter((t: WorkflowTemplateInstance) => t.isArchived);
    },
    enabled: !!user && activeTab === "archived",
  });

  const handleCreateTemplate = (templateType: string) => {
    const template = workflowTemplates.find(t => t.id === templateType);
    if (!template) return;

    // Navigate to create new template instance
    window.location.href = `/workflow/${templateType}/new`;
  };

  const getTemplatesByType = (templateType: string) => {
    return (templates as WorkflowTemplateInstance[]).filter((t: WorkflowTemplateInstance) => t.templateType === templateType);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const isLoading = templatesLoading || (activeTab === "archived" && archivedLoading);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Streamline Your Workflow</h1>
                  <p className="text-gray-600">Organize your creative process with powerful workflow tools</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                <TabsTrigger value="active">Active Templates</TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="w-4 h-4 mr-2" />
                  Archived
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-8">
                {/* Template Categories */}
                {workflowTemplates.map((template) => {
                  const userTemplates = getTemplatesByType(template.id);
                  const IconComponent = template.icon;

                  return (
                    <div key={template.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${template.color}`}>
                            <IconComponent className={`w-5 h-5 ${template.textColor}`} />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
                            <p className="text-gray-600">{template.description}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleCreateTemplate(template.id)}
                          size="sm"
                          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New
                        </Button>
                      </div>

                      {/* User Templates Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userTemplates.length === 0 ? (
                          <Card className="col-span-full bg-white border-dashed border-2 border-gray-200">
                            <CardContent className="flex flex-col items-center justify-center py-8">
                              <div className={`p-3 rounded-lg ${template.color} mb-4`}>
                                <IconComponent className={`w-6 h-6 ${template.textColor}`} />
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                              <p className="text-gray-600 text-center mb-4">
                                Create your first {template.name.toLowerCase()} to get started
                              </p>
                              <Button
                                onClick={() => handleCreateTemplate(template.id)}
                                size="sm"
                                className="bg-gray-900 hover:bg-gray-800 text-white"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Template
                              </Button>
                            </CardContent>
                          </Card>
                        ) : (
                          userTemplates.map((userTemplate: WorkflowTemplateInstance) => (
                            <Card key={userTemplate.id} className="bg-white hover:shadow-md transition-shadow">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">{userTemplate.title}</CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    v{userTemplate.version}
                                  </Badge>
                                </div>
                                <CardDescription className="flex items-center text-sm text-gray-600">
                                  <Clock className="w-4 h-4 mr-1" />
                                  Last edited {formatDate(userTemplate.lastEditedAt)}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between">
                                  <Link href={`/workflow/${template.id}/${userTemplate.id}`}>
                                    <Button variant="outline" size="sm">
                                      <FileText className="w-4 h-4 mr-2" />
                                      Open
                                    </Button>
                                  </Link>
                                  <Link href={`/workflow/${template.id}/${userTemplate.id}/settings`}>
                                    <Button variant="ghost" size="sm">
                                      <Settings className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="archived" className="space-y-6">
                {archivedTemplates.length === 0 ? (
                  <Card className="bg-white">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Archive className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No archived templates</h3>
                      <p className="text-gray-600 text-center">
                        Templates you archive will appear here for future reference
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedTemplates.map((template: WorkflowTemplateInstance) => (
                      <Card key={template.id} className="bg-white opacity-75">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{template.title}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              Archived
                            </Badge>
                          </div>
                          <CardDescription className="flex items-center text-sm text-gray-600">
                            <Archive className="w-4 h-4 mr-1" />
                            Archived {formatDate(template.archivedAt || template.updatedAt)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link href={`/workflow/${template.templateType}/${template.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              <FileText className="w-4 h-4 mr-2" />
                              View (Read-only)
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}