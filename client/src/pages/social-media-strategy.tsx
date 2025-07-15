import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

interface ContentPillar {
  id: string;
  title: string;
  cta: string;
}

interface SocialMediaStrategy {
  id?: number;
  userId?: string;
  contentGoals: string;
  pillars: ContentPillar[];
  updatedAt?: string;
}

export default function SocialMediaStrategy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<SocialMediaStrategy>({
    contentGoals: "",
    pillars: [
      { id: "1", title: "", cta: "" },
      { id: "2", title: "", cta: "" },
      { id: "3", title: "", cta: "" }
    ]
  });

  // Fetch existing strategy
  const { data: existingStrategy, isLoading } = useQuery({
    queryKey: ['/api/social-media-strategy'],
    enabled: !!user,
    retry: false,
  });

  // Save strategy mutation
  const saveMutation = useMutation({
    mutationFn: async (strategyData: SocialMediaStrategy) => {
      return await apiRequest('/api/social-media-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Strategy Saved",
        description: "Your social media strategy has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/social-media-strategy'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to save strategy. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load existing strategy when data is available
  useEffect(() => {
    if (existingStrategy) {
      setStrategy(existingStrategy);
    }
  }, [existingStrategy]);

  // Auto-save functionality with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (strategy.contentGoals.trim() || strategy.pillars.some(p => p.title.trim() || p.cta.trim())) {
        saveMutation.mutate(strategy);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [strategy]);

  const updateContentGoals = (goals: string) => {
    setStrategy(prev => ({ ...prev, contentGoals: goals }));
  };

  const updatePillar = (id: string, field: 'title' | 'cta', value: string) => {
    setStrategy(prev => ({
      ...prev,
      pillars: prev.pillars.map(pillar =>
        pillar.id === id ? { ...pillar, [field]: value } : pillar
      )
    }));
  };

  const addPillar = () => {
    if (strategy.pillars.length < 5) {
      const newId = Date.now().toString();
      setStrategy(prev => ({
        ...prev,
        pillars: [...prev.pillars, { id: newId, title: "", cta: "" }]
      }));
    }
  };

  const removePillar = (id: string) => {
    if (strategy.pillars.length > 3) {
      setStrategy(prev => ({
        ...prev,
        pillars: prev.pillars.filter(pillar => pillar.id !== id)
      }));
    }
  };

  const handleSave = () => {
    saveMutation.mutate(strategy);
  };

  const handleDownload = () => {
    const content = `
MY SOCIAL MEDIA STRATEGY

CONTENT GOALS:
${strategy.contentGoals}

CONTENT PILLARS:
${strategy.pillars.map((pillar, index) => `
${index + 1}. ${pillar.title || 'Untitled Pillar'}
   Call-to-Action: ${pillar.cta || 'No CTA defined'}
`).join('')}

Generated on: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'social-media-strategy.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Strategy Downloaded",
      description: "Your strategy has been downloaded as a text file.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rose-50">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading your strategy...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50">
      <Sidebar />
      <MobileNav />
      
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <BackToDashboard />
            <Link href="/content-planning">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Content Planning
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">My Social Media Strategy</h1>
              <p className="text-gray-600">Define your content goals and organize your content pillars</p>
            </div>
          </div>
        </div>

        {/* Instruction Section */}
        <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="text-gray-700">
              <p className="font-medium mb-2">Use this section to organise your content strategy.</p>
              <p className="text-sm">
                Define your goals, segment your content pillars, and write your call-to-actions.
              </p>
              <p className="text-sm mt-2 text-gray-600">
                <em>(Does Pillar One send people to your shop? Does Pillar Two guide them to your email list? Does Pillar Three send them to your YouTube channel?)</em>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-4xl space-y-8">
          {/* Content Goals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Content Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content-goals" className="text-gray-700">
                  What's the purpose behind your content? What do you want it to achieve?
                </Label>
                <Textarea
                  id="content-goals"
                  value={strategy.contentGoals}
                  onChange={(e) => updateContentGoals(e.target.value)}
                  placeholder="Grow email list, drive product visibility, build brand trust..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Pillars Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  Content Pillars
                </CardTitle>
                <Button
                  onClick={addPillar}
                  disabled={strategy.pillars.length >= 5}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pillar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {strategy.pillars.map((pillar, index) => (
                  <Card key={pillar.id} className="border-orange-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">
                          Pillar {index + 1}
                        </h3>
                        {strategy.pillars.length > 3 && (
                          <Button
                            onClick={() => removePillar(pillar.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor={`pillar-title-${pillar.id}`} className="text-sm text-gray-600">
                          Pillar Name
                        </Label>
                        <Input
                          id={`pillar-title-${pillar.id}`}
                          value={pillar.title}
                          onChange={(e) => updatePillar(pillar.id, 'title', e.target.value)}
                          placeholder="e.g., Behind the Scenes"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`pillar-cta-${pillar.id}`} className="text-sm text-gray-600">
                          Where do you want this pillar to send people?
                        </Label>
                        <Input
                          id={`pillar-cta-${pillar.id}`}
                          value={pillar.cta}
                          onChange={(e) => updatePillar(pillar.id, 'cta', e.target.value)}
                          placeholder="e.g., Shop, Newsletter, Podcast..."
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download as Text
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Strategy'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}