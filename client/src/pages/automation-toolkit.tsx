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
  Copy, 
  Zap,
  MessageSquare,
  FileText
} from "lucide-react";



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
                              onClick={() => copyToClipboard(prompt.message, "Prompt copied to clipboard!")}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy to Clipboard
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

              {/* 2. Pre-Written Replies Vault */}
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