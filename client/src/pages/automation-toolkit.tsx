import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Plus, 
  Copy, 
  Download, 
  GripVertical, 
  Trash2,
  Instagram,
  Zap,
  MessageSquare,
  Workflow,
  FileText
} from "lucide-react";

interface FlowStep {
  id: string;
  trigger: string;
  response: string;
  tag?: string;
}

interface PromptTemplate {
  id: string;
  scenario: string;
  defaultMessage: string;
  message: string;
}

interface PrewrittenReply {
  id: string;
  type: string;
  content: string;
}

const defaultPromptTemplates: PromptTemplate[] = [
  {
    id: "lead-magnet",
    scenario: "Lead Magnet Delivery",
    defaultMessage: "Thanks for joining! 🎉 Here's your free guide: [LINK]. Want more tips like this? Reply YES for weekly insider secrets!",
    message: "Thanks for joining! 🎉 Here's your free guide: [LINK]. Want more tips like this? Reply YES for weekly insider secrets!"
  },
  {
    id: "faq",
    scenario: "FAQ Response",
    defaultMessage: "Great question! Here's what I recommend: [ANSWER]. Need more help? Type SUPPORT and I'll connect you with our team.",
    message: "Great question! Here's what I recommend: [ANSWER]. Need more help? Type SUPPORT and I'll connect you with our team."
  },
  {
    id: "product-followup",
    scenario: "Product Follow-up",
    defaultMessage: "How are you loving your new [PRODUCT]? 💕 Share a photo and tag us for a chance to be featured! Any questions? Just reply here.",
    message: "How are you loving your new [PRODUCT]? 💕 Share a photo and tag us for a chance to be featured! Any questions? Just reply here."
  },
  {
    id: "welcome-sequence",
    scenario: "Welcome Sequence",
    defaultMessage: "Welcome to the family! 👋 I'm here to help you succeed. What's your biggest challenge right now? Reply and let's solve it together!",
    message: "Welcome to the family! 👋 I'm here to help you succeed. What's your biggest challenge right now? Reply and let's solve it together!"
  }
];

const defaultPrewrittenReplies: PrewrittenReply[] = [
  {
    id: "delivery",
    type: "Delivery Reply",
    content: "Your [ITEM] is on its way! 📦 You'll receive tracking info within 24 hours. Questions? Just reply here!"
  },
  {
    id: "followup",
    type: "Follow-Up Message",
    content: "Hey! Just checking in - how's everything going with your [PURCHASE]? I'm here if you need any help! 💪"
  },
  {
    id: "bonus-offer",
    type: "Bonus Offer or Upsell",
    content: "Since you loved [PRODUCT], I thought you'd want to know about this exclusive offer: [SPECIAL DEAL]. Limited time only! 🔥"
  }
];

export default function AutomationToolkit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // State for different sections
  const [prompts, setPrompts] = useState<PromptTemplate[]>(defaultPromptTemplates);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [instagramCTA, setInstagramCTA] = useState("");
  const [prewrittenReplies, setPrewrittenReplies] = useState<PrewrittenReply[]>(defaultPrewrittenReplies);

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

  // Debounced auto-save function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const debouncedSave = debounce(() => {
    // Auto-save logic would go here
    console.log("Auto-saving...");
  }, 1000);

  // Prompt Library functions
  const updatePrompt = (id: string, message: string) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, message } : p));
    debouncedSave();
  };

  const insertToFlowBuilder = (message: string) => {
    const newStep: FlowStep = {
      id: Date.now().toString(),
      trigger: "",
      response: message,
      tag: ""
    };
    setFlowSteps(prev => [...prev, newStep]);
    toast({
      title: "Added to Flow Builder",
      description: "Message has been added to your flow.",
    });
  };

  // Flow Builder functions
  const addFlowStep = () => {
    const newStep: FlowStep = {
      id: Date.now().toString(),
      trigger: "",
      response: "",
      tag: ""
    };
    setFlowSteps(prev => [...prev, newStep]);
  };

  const updateFlowStep = (id: string, field: keyof FlowStep, value: string) => {
    setFlowSteps(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
    debouncedSave();
  };

  const deleteFlowStep = (id: string) => {
    setFlowSteps(prev => prev.filter(step => step.id !== id));
  };

  const moveFlowStep = (id: string, direction: 'up' | 'down') => {
    setFlowSteps(prev => {
      const index = prev.findIndex(step => step.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newSteps = [...prev];
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      return newSteps;
    });
  };

  // Copy functions
  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: successMessage,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const generateFlowText = () => {
    return flowSteps.map((step, index) => {
      let flowText = `Step ${index + 1}:\n`;
      if (step.trigger) flowText += `Trigger: "${step.trigger}"\n`;
      if (step.response) flowText += `→ Response: "${step.response}"\n`;
      if (step.tag) flowText += `→ Tag: "${step.tag}"\n`;
      return flowText;
    }).join('\n');
  };

  const downloadFlowAsText = () => {
    const flowText = generateFlowText();
    const blob = new Blob([flowText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automation-flow.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updatePrewrittenReply = (id: string, content: string) => {
    setPrewrittenReplies(prev => prev.map(reply => 
      reply.id === id ? { ...reply, content } : reply
    ));
    debouncedSave();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="text-white text-2xl" />
          </div>
          <p className="text-gray-600">Loading automation toolkit...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation("/streamline-workflow")}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Streamline Workflow
                </Button>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-white text-2xl" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Automation System Toolkit
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Plan out your flows and messages before building in ManyChat
                </p>
              </div>
            </div>

            <div className="space-y-8">
              
              {/* ManyChat Affiliate Button */}
              <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Automate with ManyChat
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Click here to start building your automation (affiliate link)
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://manychat.partnerlinks.io/n6ui2n91rh1n"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Start Now
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                  </div>
                </CardContent>
              </Card>
              
              {/* 1. Prompt Library */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Prompt Library</CardTitle>
                      <CardDescription>
                        Choose and edit pre-written automation message ideas
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prompts.map((prompt) => (
                      <Card key={prompt.id} className="border-2 border-gray-100">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{prompt.scenario}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => insertToFlowBuilder(prompt.message)}
                            >
                              Insert to Flow Builder
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={prompt.message}
                            onChange={(e) => updatePrompt(prompt.id, e.target.value)}
                            placeholder="Edit your message..."
                            className="min-h-20"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Flow Builder */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Workflow className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Flow Builder</CardTitle>
                        <CardDescription>
                          Build a step-by-step automation sequence
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateFlowText(), "Flow copied to clipboard!")}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Flow as Text
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadFlowAsText}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download as .txt
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {flowSteps.map((step, index) => (
                      <Card key={step.id} className="border-2 border-gray-100">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-gray-400" />
                              <Badge variant="secondary">Step {index + 1}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveFlowStep(step.id, 'up')}
                                disabled={index === 0}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveFlowStep(step.id, 'down')}
                                disabled={index === flowSteps.length - 1}
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFlowStep(step.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor={`trigger-${step.id}`}>Trigger</Label>
                            <Input
                              id={`trigger-${step.id}`}
                              value={step.trigger}
                              onChange={(e) => updateFlowStep(step.id, 'trigger', e.target.value)}
                              placeholder="e.g., User sends: YES"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`response-${step.id}`}>Response Message</Label>
                            <Textarea
                              id={`response-${step.id}`}
                              value={step.response}
                              onChange={(e) => updateFlowStep(step.id, 'response', e.target.value)}
                              placeholder="Enter your response message..."
                              className="min-h-20"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`tag-${step.id}`}>Tag/Note (Optional)</Label>
                            <Input
                              id={`tag-${step.id}`}
                              value={step.tag || ''}
                              onChange={(e) => updateFlowStep(step.id, 'tag', e.target.value)}
                              placeholder="e.g., leads, interested, etc."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button onClick={addFlowStep} className="w-full" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Step
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Instagram CTA Copy Helper */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Instagram CTA Copy Helper</CardTitle>
                      <CardDescription>
                        Compose Instagram captions or bio lines to link into your automation
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      value={instagramCTA}
                      onChange={(e) => {
                        setInstagramCTA(e.target.value);
                        debouncedSave();
                      }}
                      placeholder="Write your Instagram caption or call-to-action here..."
                      className="min-h-32"
                    />
                    <Button
                      onClick={() => copyToClipboard(instagramCTA, "Instagram CTA copied to clipboard!")}
                      disabled={!instagramCTA.trim()}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy CTA to Clipboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Pre-Written Replies Vault */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Pre-Written Replies Vault</CardTitle>
                      <CardDescription>
                        High-converting ManyChat response templates
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {prewrittenReplies.map((reply) => (
                      <Card key={reply.id} className="border-2 border-gray-100">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{reply.type}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(reply.content, `${reply.type} copied to clipboard!`)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy to Clipboard
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={reply.content}
                            onChange={(e) => updatePrewrittenReply(reply.id, e.target.value)}
                            placeholder="Edit your reply template..."
                            className="min-h-20"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
      </div>
    </div>
  );
}