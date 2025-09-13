import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Plus, FileText, CheckCircle, Circle, ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';

interface SOPStep {
  id: string;
  text: string;
  completed: boolean;
}

interface SOP {
  id: string;
  title: string;
  steps: SOPStep[];
  createdAt: Date;
  updatedAt: Date;
}

const defaultSOPs: SOP[] = [
  {
    id: 'email-funnel',
    title: 'Email Funnel SOP',
    steps: [
      { id: '1', text: 'Create launch timeline', completed: false },
      { id: '2', text: 'Develop marketing assets', completed: false },
      { id: '3', text: 'Set up sales page', completed: false },
      { id: '4', text: 'Build email sequences', completed: false },
      { id: '5', text: 'Plan social media campaign', completed: false },
      { id: '6', text: 'Quick test (always)\nAdd yourself to the trigger → make sure each email lands, links work, mobile looks good.', completed: false },
      { id: '7', text: 'Turn it on\nSwitch the automation ON. Promote lead magnet/product to get signups.', completed: false },
      { id: '8', text: 'Tips: Keep it simple to improve\n\nIf opens are low → try a stronger subject on the next email.\n\nIf clicks are low → move the CTA higher and make it clearer.\n\nIf someone buys → confirm they stop the sales funnel.', completed: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'product-launch',
    title: 'Product Launch SOP',
    steps: [
      { id: '1', text: 'Create launch timeline', completed: false },
      { id: '2', text: 'Develop marketing assets', completed: false },
      { id: '3', text: 'Set up sales page', completed: false },
      { id: '4', text: 'Build email sequences', completed: false },
      { id: '5', text: 'Plan social media campaign', completed: false },
      { id: '6', text: 'Execute launch week', completed: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'batching-content',
    title: 'Batching Content SOP',
    steps: [
      { id: '1', text: 'Step 1 - Plan your next 2-4 weeks\nPick goal(s): nurture, launch support, list growth, or evergreen.\nChoose channels: IG feed/Reels, Stories, TikTok, YouTube Shorts, Email, Blog, Pinterest.\nDecide timeline (e.g. 3 IG posts, 2 Reels, 1 email per week).\nList 3-5 content pillar themes you\'ll repeat (e.g., Tips, Behind-the-Scenes, Testimonials, Offers). Use Content Pillars within Content Creation System.\nUse Time Blocking Calendar: plug in key dates (promos, holidays, launches). Done when: you have a filled in calendar and a target number of assets to make.', completed: false },
      { id: '2', text: 'Step 2 - Block your batching time\nTake Action! Pick 1-2 batching sessions this week for any given task within your Time Blocking Planner and get to work.\nSet a Quick Start Timer on your dashboard and turn off distractions. Done when: your time is blocked and your workspace/files are ready.', completed: false },
      { id: '3', text: 'Step 4 - Plan content\nBrain dump 10-20 post ideas tied to your content pillars.\nFor each idea, jot 3-5 bullet points (what to show/say).\nMap ideas to formats (Carousel, Reel, Story, Email). Done when: you have enough outlines to hit your batching target for 2-4 weeks.', completed: false },
      { id: '4', text: 'Step 5 - Produce visuals & videos (batch)\nRecord all clips in one go (same setup, different outfits/angles), OR film as you go, bank content throughout the week and batch the editing.\nDesign carousels/covers/thumbnails using your template packs.\nExport in correct sizes and store in organised desktop folder. Done when: all visuals/clips for this batch are exported and named properly.', completed: false },
      { id: '5', text: 'Step 6 - Write captions & email copy\nFor each asset, write:\nHook → 3-5 value lines → CTA.\nAdd 3-5 relevant hashtags (if used), alt text, and any links. Done when: every asset has its caption/copy, CTA, and accessibility text.', completed: false },
      { id: '6', text: 'Step 7 - Upload/Schedule\nLoad posts into your scheduler (or native app).\nSet dates/times; add first comments/links if needed.\nFinal checks:\nSpelling/brand voice, audio levels, CTAs, alt text/captions on.\nHit Schedule. Done when: everything is queued and ready to go.', completed: false },
      { id: '7', text: 'Step 8 - Publish day checklist (super short)\nReply to early comments/DMs in the first hour.\nAdd links to Stories/Link-in-bio as needed.', completed: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function SOPBuilderHub() {
  const [sops, setSops] = useState<SOP[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedSOPs = localStorage.getItem('sop-builder-sops');
    if (savedSOPs) {
      let sopsData = JSON.parse(savedSOPs);
      
      // Update Email Funnel SOP if it exists but has fewer than 9 steps or empty steps 6-9
      const emailFunnelSOP = sopsData.find((sop: SOP) => sop.id === 'email-funnel');
      const emailDefault = defaultSOPs.find(sop => sop.id === 'email-funnel');
      
      if (emailFunnelSOP && emailDefault) {
        const needsUpdate = emailFunnelSOP.steps.length < 9 || 
          emailDefault.steps.slice(5).some((_, idx) => {
            const existingStep = emailFunnelSOP.steps[5 + idx];
            return !existingStep || !existingStep.text || !existingStep.text.trim();
          });

        if (needsUpdate) {
          const mergedSOP = {
            ...emailDefault,
            steps: emailDefault.steps.map((defStep, i) => {
              const existing = emailFunnelSOP.steps[i];
              return existing && existing.text?.trim()
                ? { ...defStep, ...existing, id: defStep.id, text: existing.text, completed: !!existing.completed }
                : { ...defStep, completed: !!existing?.completed };
            }),
            updatedAt: new Date()
          };
          
          sopsData = sopsData.map((sop: SOP) => 
            sop.id === 'email-funnel' ? mergedSOP : sop
          );
          localStorage.setItem('sop-builder-sops', JSON.stringify(sopsData));
        }
      }

      // Ensure batching-content SOP has correct content for steps 6 and 7
      const batchingSOP = sopsData.find((sop: SOP) => sop.id === 'batching-content');
      const batchingDefault = defaultSOPs.find(sop => sop.id === 'batching-content');
      
      if (batchingSOP && batchingDefault) {
        // Only update steps 6 and 7 if they're missing or have placeholder content
        const updatedSteps = batchingSOP.steps.map((step, index) => {
          if (index === 5 && (!step.text || step.text.trim() === '' || step.text.includes('Step 7 - Upload/Schedule'))) {
            return { ...step, text: batchingDefault.steps[5].text };
          }
          if (index === 6 && (!step.text || step.text.trim() === '' || step.text.includes('Step 8 - Publish day checklist'))) {
            return { ...step, text: batchingDefault.steps[6].text };
          }
          return step;
        });
        
        const updatedBatchingSOP = {
          ...batchingSOP,
          steps: updatedSteps,
          updatedAt: new Date()
        };
        
        sopsData = sopsData.map((sop: SOP) => 
          sop.id === 'batching-content' ? updatedBatchingSOP : sop
        );
        localStorage.setItem('sop-builder-sops', JSON.stringify(sopsData));
      }
      
      setSops(sopsData);
    } else {
      setSops(defaultSOPs);
      localStorage.setItem('sop-builder-sops', JSON.stringify(defaultSOPs));
    }
  }, []);

  const saveSOPs = (updatedSOPs: SOP[]) => {
    setSops(updatedSOPs);
    localStorage.setItem('sop-builder-sops', JSON.stringify(updatedSOPs));
  };

  const createNewSOP = () => {
    const newSOP: SOP = {
      id: `sop-${Date.now()}`,
      title: 'New SOP',
      steps: [
        { id: '1', text: '', completed: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updatedSOPs = [...sops, newSOP];
    saveSOPs(updatedSOPs);
    
    toast({
      title: "New SOP Created",
      description: "Your new SOP has been created and is ready for editing.",
    });
  };

  const updateSOPTitle = (id: string, newTitle: string) => {
    const updatedSOPs = sops.map(sop => 
      sop.id === id ? { ...sop, title: newTitle, updatedAt: new Date() } : sop
    );
    saveSOPs(updatedSOPs);
  };

  const clearSOPChecklist = (id: string) => {
    const updatedSOPs = sops.map(sop => 
      sop.id === id ? {
        ...sop,
        steps: sop.steps.map(step => ({ ...step, completed: false })),
        updatedAt: new Date()
      } : sop
    );
    saveSOPs(updatedSOPs);
    
    toast({
      title: "Checklist Cleared",
      description: "All steps have been unchecked for this SOP.",
    });
  };

  const getSOPProgress = (sop: SOP) => {
    const completedSteps = sop.steps.filter(step => step.completed).length;
    const totalSteps = sop.steps.length;
    return { completed: completedSteps, total: totalSteps, percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0 };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 max-w-full overflow-x-hidden">
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
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
                  onClick={() => setLocation("/")}
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
            <div className="flex items-start gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SOP Builder Hub</h1>
                <p className="text-gray-600 mt-1">Create and manage your Standard Operating Procedures to streamline your workflow</p>
              </div>
            </div>
          </div>

          {/* Information Box */}
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What's an SOP?</h3>
                <p className="text-gray-600">A Standard Operating Procedure is a step-by-step checklist for repeatable tasks, so that you're not starting from scratch every single time.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How to use this hub:</h3>
                <p className="text-gray-600">The first three SOPs (Email Funnel, Product Launch, Batching Content) are examples. Open one, edit the steps to fit your business, or click Add New SOP to create your own. Mark steps complete to track progress.</p>
              </div>
            </div>
          </div>

        {/* SOP Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sops.map((sop) => {
            const progress = getSOPProgress(sop);
            return (
              <Card key={sop.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-pink-600" />
                      <input
                        type="text"
                        value={sop.title}
                        onChange={(e) => updateSOPTitle(sop.id, e.target.value)}
                        className="font-semibold text-lg bg-transparent border-none outline-none focus:ring-0 text-gray-900"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {progress.completed}/{progress.total} steps
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Link href={`/sop/${sop.id}`} className="flex-1">
                      <Button 
                        className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                        size="sm"
                      >
                        Open SOP
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add New SOP Card */}
          <Card className="border-2 border-dashed border-pink-200 hover:border-pink-300 transition-colors cursor-pointer" onClick={createNewSOP}>
            <CardContent className="flex flex-col items-center justify-center h-full p-8">
              <Plus className="h-8 w-8 text-pink-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Add New SOP</h3>
              <p className="text-sm text-gray-500 text-center">Create a new Standard Operating Procedure</p>
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    </div>
  );
}