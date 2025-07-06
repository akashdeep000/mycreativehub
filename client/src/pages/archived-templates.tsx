import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Archive, RotateCcw, Trash2, Calendar, FileText, Lightbulb, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import type { WorkflowTemplateInstance } from "@shared/schema";

const templateIcons = {
  inspiration: Lightbulb,
  'time-blocking': Calendar,
  prioritization: FileText,
  manychat: FileText,
  automation: FileText,
};

const templateNames = {
  inspiration: 'Creative Inspiration Hub',
  'time-blocking': 'Time Blocking Planner',
  prioritization: 'Priority Matrix',
  manychat: 'ManyChat Workflow',
  automation: 'Automation Blueprint',
};

// Section definitions for grouping archived templates
const sectionDefinitions = {
  'Creative Inspiration Hub': {
    templateTypes: ['inspiration'],
    icon: Lightbulb,
    description: 'Inspiration boards and creative content'
  },
  'Goal Mapping': {
    templateTypes: ['prioritization'],
    icon: FileText,
    description: 'Priority matrices and goal planning'
  },
  'Content Planning': {
    templateTypes: ['manychat', 'automation'],
    icon: FileText,
    description: 'Workflow automation and content strategies'
  }
};

export default function ArchivedTemplates() {
  const [, setLocation] = useLocation();
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Creative Inspiration Hub': true,
    'Goal Mapping': true,
    'Content Planning': true
  });
  const { toast } = useToast();

  const { data: archivedTemplates = [], isLoading } = useQuery({
    queryKey: ["/api/workflow-templates/archived"],
  });

  const restoreTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/workflow-templates/${templateId}/restore`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates"] });
      toast({
        title: "Template Restored",
        description: "Template has been restored to your main workspace.",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/workflow-templates/${templateId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates/archived"] });
      toast({
        title: "Template Deleted",
        description: "Template has been permanently deleted.",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (templateIds: number[]) => {
      const response = await fetch("/api/workflow-templates/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateIds }),
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates/archived"] });
      setSelectedTemplates([]);
      toast({
        title: "Templates Deleted",
        description: `${selectedTemplates.length} templates have been permanently deleted.`,
      });
    },
  });

  const handleSelectTemplate = (templateId: number, checked: boolean) => {
    if (checked) {
      setSelectedTemplates(prev => [...prev, templateId]);
    } else {
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTemplates(archivedTemplates.map((t: WorkflowTemplateInstance) => t.id));
    } else {
      setSelectedTemplates([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTemplates.length === 0) return;
    bulkDeleteMutation.mutate(selectedTemplates);
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Group templates by section
  const groupedTemplates = Object.entries(sectionDefinitions).reduce((acc, [sectionName, sectionConfig]) => {
    const sectionTemplates = archivedTemplates.filter((template: WorkflowTemplateInstance) => {
      // Filter out time-blocking templates (calendar views)
      if (template.templateType === 'time-blocking') return false;
      return sectionConfig.templateTypes.includes(template.templateType);
    });
    
    if (sectionTemplates.length > 0) {
      acc[sectionName] = {
        templates: sectionTemplates,
        config: sectionConfig
      };
    }
    return acc;
  }, {} as Record<string, { templates: WorkflowTemplateInstance[], config: any }>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/streamline-workflow")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflow
            </Button>
            <div className="flex items-center gap-2">
              <Archive className="w-6 h-6 text-gray-600" />
              <h1 className="text-2xl font-serif text-gray-900">
                Archived Templates
              </h1>
            </div>
          </div>
          
          {/* Bulk Actions */}
          {selectedTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedTemplates.length} selected
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {selectedTemplates.length} selected templates and remove all their data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleBulkDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete {selectedTemplates.length} Templates
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Select All Checkbox */}
        {archivedTemplates.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <Checkbox
              id="select-all"
              checked={selectedTemplates.length === archivedTemplates.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm text-gray-600">
              Select all templates
            </label>
          </div>
        )}

        {/* Grouped Templates */}
        {Object.keys(groupedTemplates).length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-serif text-gray-600 mb-2">No archived templates</h2>
            <p className="text-gray-500">
              Templates you archive will appear here organised by section. You can restore them or delete them permanently.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTemplates).map(([sectionName, { templates, config }]) => {
              const SectionIcon = config.icon;
              const isExpanded = expandedSections[sectionName];
              
              return (
                <div key={sectionName} className="border rounded-lg bg-white shadow-sm">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionName)}>
                    <CollapsibleTrigger className="w-full p-4 text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <SectionIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-serif font-semibold text-gray-900">{sectionName}</h3>
                            <p className="text-sm text-gray-500">{config.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-sm">
                            {templates.length} template{templates.length !== 1 ? 's' : ''}
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="border-t pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {templates.map((template: WorkflowTemplateInstance) => {
                            const IconComponent = templateIcons[template.templateType as keyof typeof templateIcons] || FileText;
                            const templateName = templateNames[template.templateType as keyof typeof templateNames] || template.templateType;
                            
                            return (
                              <Card key={template.id} className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        checked={selectedTemplates.includes(template.id)}
                                        onCheckedChange={(checked) => handleSelectTemplate(template.id, checked as boolean)}
                                      />
                                      <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <IconComponent className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                                      {templateName}
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-base font-serif leading-tight">{template.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="text-sm text-gray-500 mb-3">
                                    Archived: {format(new Date(template.archivedAt!), 'dd MMM yyyy')}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => restoreTemplateMutation.mutate(template.id)}
                                      disabled={restoreTemplateMutation.isPending}
                                      className="flex-1"
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Restore
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete "{template.title}" and remove all its data.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete Permanently
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}