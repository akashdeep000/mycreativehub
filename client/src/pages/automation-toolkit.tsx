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



interface AutomationFlow {
  id: string;
  triggerWord: string;
  dmPrompt: string;
  linkText: string;
  clickableButtonTitle: string;
  ctaButtons: string;
  automatedReply: string;
  followUp: string;
  bonusUpsell: string;
}

const defaultAutomationFlows: AutomationFlow[] = [
  {
    id: '1',
    triggerWord: 'PROMPTS',
    dmPrompt: 'Thanks! I\'ve sent the link to your DMs!',
    linkText: 'Hey there! I\'m so happy you\'re here, thanks so much for your interest in my [enter thing] 😊  Just click below and I\'ll send you the link straight there, as well as a freebie to go with!',
    clickableButtonTitle: 'Click to find out more!',
    ctaButtons: 'Grab Yours Today',
    automatedReply: 'Here\'s the link to [the thing]!\n\nP.s If you love it, I\'d be so grateful if you could leave a quick review [then direct them to review page in 2nd link] ',
    followUp: 'How are you getting on with the prompts? Any questions?',
    bonusUpsell: 'Since you grabbed the prompts, you might love our Premium Journal Set — limited-time offer inside!'
  },
  {
    id: '2', 
    triggerWord: 'DISCOUNT',
    dmPrompt: 'Sent you a message! 😍',
    linkText: 'Thanks so much for your interest in [insert]! Inside, you\'ll find [list qualities]...can\'t wait for you to join! Click below to grab the link.',
    clickableButtonTitle: 'Grab the link',
    ctaButtons: 'Claim Your Discount',
    automatedReply: 'Yay! Here\'s the link to my [thing]. I hope you love it as much as I loved creating it 😍 Below you\'ll also find a link to my Freebie [enter relevant freebie - optional] ',
    followUp: 'Did you use your discount code? Let me know if you need help!',
    bonusUpsell: 'Love your purchase? Get 20% off our premium bundle with code BUNDLE20!'
  },
  {
    id: '3',
    triggerWord: 'INFO',
    dmPrompt: 'Yay! The Link is in your DMs! ',
    linkText: 'Hey there! 👋 Thanks so much for checking out my [product name] You\'ll get [product qualities] Click to find out more!',
    clickableButtonTitle: 'Check it out!',
    ctaButtons: 'Start Here',
    automatedReply: 'Here\'s everything you need to know: [LINK]',
    followUp: 'Have you had a chance to look through the info? Any questions?',
    bonusUpsell: 'Ready to get started? Book a free consultation call: [LINK]'
  }
];

export default function AutomationToolkit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // State for automation flows
  const [automationFlows, setAutomationFlows] = useState<AutomationFlow[]>(defaultAutomationFlows);

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

  // Automation flow functions
  const updateFlow = (id: string, field: keyof AutomationFlow, value: string) => {
    setAutomationFlows(prev => prev.map(flow => 
      flow.id === id ? { ...flow, [field]: value } : flow
    ));
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

  // Add new flow function
  const addNewFlow = () => {
    const newId = (Math.max(...automationFlows.map(f => parseInt(f.id))) + 1).toString();
    const newFlow: AutomationFlow = {
      id: newId,
      triggerWord: '',
      dmPrompt: '',
      linkText: '',
      clickableButtonTitle: '',
      ctaButtons: '',
      automatedReply: '',
      followUp: '',
      bonusUpsell: ''
    };
    setAutomationFlows(prev => [...prev, newFlow]);
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
              <div className="mb-4">
                {/* Mobile: Simple back arrow using browser history */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.history.back()}
                  className="text-gray-600 hover:text-gray-800 lg:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                
                {/* Desktop: Keep existing navigation buttons */}
                <div className="hidden lg:flex lg:items-center lg:gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setLocation("/dashboard")}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Main Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setLocation("/streamline-workflow")}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Streamline Workflow
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-white text-2xl" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Automation System Toolkit
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Complete conversation flow cheat sheet - edit any cell and copy directly to ManyChat
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
              
              {/* Automation Flow Cheat Sheet Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Conversation Flow Cheat Sheet</CardTitle>
                      <CardDescription>
                        Complete automation journey from trigger to upsell - edit any cell and copy to ManyChat
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                      {/* Table Header */}
                      <div className="sticky top-0 bg-gray-50 border border-gray-200 rounded-t-lg">
                        <div className="grid grid-cols-8 gap-px">
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            Trigger Word or Phrase
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            Automated Replies
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            The Opening DM
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            Clickable Button Title
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            DM with Link
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            Link Title
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900 border-r border-gray-200">
                            Link You Will Send
                          </div>
                          <div className="bg-white p-3 font-semibold text-sm text-gray-900">
                            Follow Up DM
                          </div>
                        </div>
                      </div>

                      {/* Table Body */}
                      <div className="border-l border-r border-b border-gray-200 rounded-b-lg">
                        {automationFlows.map((flow, index) => (
                          <div key={flow.id} className={`grid grid-cols-8 gap-px ${index !== automationFlows.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            {/* Trigger Word */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.triggerWord, "Trigger word copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.triggerWord}
                                onChange={(e) => updateFlow(flow.id, 'triggerWord', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="KEYWORD"
                              />
                            </div>

                            {/* DM Prompt */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.dmPrompt, "DM prompt copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.dmPrompt}
                                onChange={(e) => updateFlow(flow.id, 'dmPrompt', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="First automatic response..."
                              />
                            </div>

                            {/* Link Text */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.linkText, "Link text copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.linkText}
                                onChange={(e) => updateFlow(flow.id, 'linkText', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="Your opening DM to a follower that commented your keyword"
                              />
                            </div>

                            {/* Clickable Button Title */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.clickableButtonTitle, "Clickable button title copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.clickableButtonTitle}
                                onChange={(e) => updateFlow(flow.id, 'clickableButtonTitle', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="Get them to click for link"
                              />
                            </div>

                            {/* Automated Reply */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.automatedReply, "Auto reply copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.automatedReply}
                                onChange={(e) => updateFlow(flow.id, 'automatedReply', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="DM you send just above the link"
                              />
                            </div>

                            {/* CTA Buttons */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.ctaButtons, "CTA button copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.ctaButtons}
                                onChange={(e) => updateFlow(flow.id, 'ctaButtons', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="Button text for links..."
                              />
                            </div>

                            {/* Follow-Up */}
                            <div className="bg-white p-2 border-r border-gray-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.followUp, "Follow-up copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.followUp}
                                onChange={(e) => updateFlow(flow.id, 'followUp', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="Link URL..."
                              />
                            </div>

                            {/* Bonus/Upsell */}
                            <div className="bg-white p-2">
                              <div className="flex items-center gap-2 mb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(flow.bonusUpsell, "Upsell message copied!")}
                                  className="text-xs h-6 px-2"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <Textarea
                                value={flow.bonusUpsell}
                                onChange={(e) => updateFlow(flow.id, 'bonusUpsell', e.target.value)}
                                className="min-h-16 text-sm resize-none"
                                placeholder="Nurture message..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Add New Prompt Button */}
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={addNewFlow}
                      variant="outline"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add New Prompt
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
      </div>
    </div>
  );
}