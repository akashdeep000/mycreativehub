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
      { id: '1', text: 'Create the automation:\n\n- In your email platform, go to Automations/Workflows → New.\nName it: "Funnel – Product/Lead Magnet".', completed: false },
      { id: '2', text: 'Choose the trigger (pick one):\n\n- Lead magnet sign-up (joined form/list).\n- Tag applied (e.g., "Interested in Product A").\n- Purchased product (order completed).', completed: false },
      { id: '3', text: 'Set up sales page\n\nBuild your conversion-focused landing page:\n\n• Write compelling headline and subheaders\n• Add benefit-focused bullet points\n• Include social proof (testimonials, reviews, case studies)\n• Create clear call-to-action buttons\n• Set up payment processing and delivery system\n• Test all forms and purchase flows\n\nDone when: sales page is live and all purchase flows tested.', completed: false },
      { id: '4', text: 'Build email sequences\n\nWrite your nurture and sales sequence:\n\n• Welcome email with lead magnet delivery\n• 5-7 nurture emails providing value and building trust\n• 3-5 sales emails with clear offers and urgency\n• Follow-up sequences for non-openers and non-clickers\n• Set up automation triggers and timing\n\nDone when: entire sequence is written, tested, and automated.', completed: false },
      { id: '5', text: 'Plan social media campaign\nCreate your promotion strategy:\n• Map content to your Content Pillars (behind-scenes, tips, testimonials)\n• Schedule posts in your Time Blocking Calendar\n• Create engagement-driving content (polls, questions, stories)\n• Plan cross-platform promotion (Instagram, Facebook, LinkedIn, TikTok)\n• Set up tracking for clicks and conversions\nDone when: 2-4 weeks of social content is planned and scheduled.', completed: false },
      { id: '6', text: 'Quick test (always)\nAdd yourself to the trigger → make sure each email lands, links work, mobile looks good.\n• Test on multiple devices and email clients\n• Check all links lead to correct pages\n• Verify lead magnet delivers properly\n• Confirm automation timing is correct\nDone when: you\'ve received and tested the entire customer journey.', completed: false },
      { id: '7', text: 'Turn it on\nSwitch the automation ON. Promote lead magnet/product to get signups.\n• Activate all email sequences\n• Launch social media campaign\n• Send announcement to existing list\n• Monitor performance in first 24 hours\nDone when: funnel is live and generating leads.', completed: false },
      { id: '8', text: 'Monitor and optimize\nTrack performance and make improvements:\n\nIf opens are low → try a stronger subject on the next email.\n\nIf clicks are low → move the CTA higher and make it clearer.\n\nIf someone buys → confirm they stop the sales funnel.\n\nWeekly: Review open rates, click rates, and conversion rates.', completed: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'product-launch',
    title: 'Product Launch SOP',
    steps: [
      { id: '1', text: 'Pre-launch planning (4-6 weeks out)\nDefine your launch strategy:\n• Set launch date and create countdown timeline\n• Define target audience and ideal customer avatar\n• Research competitor launches and pricing\n• Plan your unique value proposition and messaging\n• Use your Financial Management tools to set revenue goals\n• Block launch tasks in your Time Blocking Calendar\nDone when: you have a clear launch strategy and timeline documented.', completed: false },
      { id: '2', text: 'Create your product (3-4 weeks out)\nFinalize your offering:\n• Complete product creation (course, template, service, etc.)\n• Test all functionality and user experience\n• Create product mockups and demo videos\n• Write detailed product descriptions and benefits\n• Set up delivery system (if digital) or fulfillment (if physical)\nDone when: your product is 100% ready and tested.', completed: false },
      { id: '3', text: 'Build marketing assets (2-3 weeks out)\nCreate all promotional materials:\n• Sales page with compelling copy and visuals\n• Product images, videos, and testimonials\n• Social media graphics and templates\n• Email headers, banners, and promotional graphics\n• Press kit and media resources\n• FAQ document addressing common objections\nDone when: all marketing materials are created and approved.', completed: false },
      { id: '4', text: 'Set up sales systems (2 weeks out)\nPrepare your sales infrastructure:\n• Configure payment processing and checkout\n• Set up affiliate program if applicable\n• Create customer onboarding sequence\n• Test purchase flow end-to-end\n• Set up analytics and tracking codes\n• Prepare customer support resources\nDone when: customers can successfully purchase and receive your product.', completed: false },
      { id: '5', text: 'Build anticipation (1-2 weeks out)\nGenerate pre-launch buzz:\n• Send teaser emails to your list\n• Share behind-the-scenes content on social media\n• Partner with influencers or collaborators\n• Schedule podcast interviews or guest posts\n• Create urgency with limited-time bonuses\n• Set up waitlist or early bird offers\nDone when: your audience is excited and ready to buy.', completed: false },
      { id: '6', text: 'Execute launch week\nGo live with your launch:\n• Send launch announcement email\n• Post across all social media platforms\n• Go live on Instagram/Facebook to announce\n• Follow up with reminder emails (3-4 during launch week)\n• Engage with comments and questions immediately\n• Monitor sales and adjust strategy if needed\nDone when: launch week is complete and you\'ve maximized initial sales.', completed: false },
      { id: '7', text: 'Post-launch follow-up\nContinue momentum after launch:\n• Send final 24-hour reminder email\n• Thank customers and deliver products\n• Ask for testimonials and reviews\n• Analyze launch performance and metrics\n• Plan next steps (product updates, new launches)\n• Celebrate your success!\nDone when: customers are served and you\'ve captured lessons learned.', completed: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'batching-content',
    title: 'Batching Content SOP',
    steps: [
      { id: '1', text: 'Plan your next 2-4 weeks\nPick goal(s): nurture, launch support, list growth, or evergreen.\nChoose channels: IG feed/Reels, Stories, TikTok, YouTube Shorts, Email, Blog, Pinterest.\nDecide timeline (e.g. 3 IG posts, 2 Reels, 1 email per week).\nList 3-5 content pillar themes you\'ll repeat (e.g., Tips, Behind-the-Scenes, Testimonials, Offers). Use Content Pillars within Content Creation System.\nUse Time Blocking Calendar: plug in key dates (promos, holidays, launches). Done when: you have a filled in calendar and a target number of assets to make.', completed: false },
      { id: '2', text: 'Block your batching time\nTake Action! Pick 1-2 batching sessions this week for any given task within your Time Blocking Planner and get to work.\nSet a Quick Start Timer on your dashboard and turn off distractions. Done when: your time is blocked and your workspace/files are ready.', completed: false },
      { id: '3', text: 'Plan content\nBrain dump 10-20 post ideas tied to your content pillars.\nFor each idea, jot 3-5 bullet points (what to show/say).\nMap ideas to formats (Carousel, Reel, Story, Email). Done when: you have enough outlines to hit your batching target for 2-4 weeks.', completed: false },
      { id: '4', text: 'Produce visuals & videos (batch)\nRecord all clips in one go (same setup, different outfits/angles), OR film as you go, bank content throughout the week and batch the editing.\nDesign carousels/covers/thumbnails using your template packs.\nExport in correct sizes and store in organised desktop folder. Done when: all visuals/clips for this batch are exported and named properly.', completed: false },
      { id: '5', text: 'Write captions & email copy\nFor each asset, write:\nHook → 3-5 value lines → CTA.\nAdd 3-5 relevant hashtags (if used), alt text, and any links. Done when: every asset has its caption/copy, CTA, and accessibility text.', completed: false },
      { id: '6', text: 'Upload/Schedule\nLoad posts into your scheduler (or native app).\nSet dates/times; add first comments/links if needed.\nFinal checks:\nSpelling/brand voice, audio levels, CTAs, alt text/captions on.\nHit Schedule. Done when: everything is queued and ready to go.', completed: false },
      { id: '7', text: 'Publish day checklist (super short)\nReply to early comments/DMs in the first hour.\nAdd links to Stories/Link-in-bio as needed.', completed: false },
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
    const sopsVersion = localStorage.getItem('sops-version');
    const currentVersion = '8'; // Version 8 updates Email Funnel SOP Step 4 with improved email sequences formatting
    
    if (savedSOPs) {
      let sopsData = JSON.parse(savedSOPs);
      let needsVersionUpdate = !sopsVersion || sopsVersion !== currentVersion;
      
      // Helper function to detect old generic placeholder content
      const isGenericPlaceholder = (text: string): boolean => {
        const genericPhrases = [
          'Create launch timeline',
          'Develop marketing assets', 
          'Set up sales page',
          'Build email sequences',
          'Plan social media campaign',
          'Execute launch week'
        ];
        const hasStepPrefix = /^Step \d+ - /.test(text);
        const hasOldStep2Content = text.includes('Develop marketing assets');
        const hasOldStep3Content = text.includes('page is live, tested, and converting visitors to customers');
        const hasOldStep4Content = text.includes('entire sequence is written, tested, and automated') && !text.includes('\n\nWrite your nurture');
        return genericPhrases.some(phrase => text.includes(phrase)) || text.length < 50 || hasStepPrefix || hasOldStep2Content || hasOldStep3Content || hasOldStep4Content;
      };
      
      // Force update Email Funnel SOP with detailed content
      const emailFunnelSOP = sopsData.find((sop: SOP) => sop.id === 'email-funnel');
      const emailDefault = defaultSOPs.find(sop => sop.id === 'email-funnel');
      
      if (emailFunnelSOP && emailDefault) {
        const needsEmailUpdate = needsVersionUpdate || 
          emailFunnelSOP.steps.length !== emailDefault.steps.length ||
          emailFunnelSOP.steps.some((step: SOPStep) => 
            !step.text || step.text.trim() === '' || isGenericPlaceholder(step.text)
          );

        if (needsEmailUpdate) {
          console.log('🔄 Migrating Email Funnel SOP with detailed content');
          const mergedSOP = {
            ...emailDefault,
            steps: emailDefault.steps.map((defStep, i) => {
              const existing = emailFunnelSOP.steps[i];
              return {
                ...defStep, 
                completed: !!existing?.completed
              };
            }),
            updatedAt: new Date()
          };
          
          sopsData = sopsData.map((sop: SOP) => 
            sop.id === 'email-funnel' ? mergedSOP : sop
          );
        }
      }
      
      // Force update Product Launch SOP with detailed content
      const productLaunchSOP = sopsData.find((sop: SOP) => sop.id === 'product-launch');
      const productDefault = defaultSOPs.find(sop => sop.id === 'product-launch');
      
      if (productLaunchSOP && productDefault) {
        const needsProductUpdate = needsVersionUpdate ||
          productLaunchSOP.steps.length !== productDefault.steps.length ||
          productLaunchSOP.steps.some((step: SOPStep) => 
            !step.text || step.text.trim() === '' || isGenericPlaceholder(step.text)
          );

        if (needsProductUpdate) {
          console.log('🔄 Migrating Product Launch SOP with detailed content');
          const mergedSOP = {
            ...productDefault,
            steps: productDefault.steps.map((defStep, i) => {
              const existing = productLaunchSOP.steps[i];
              return {
                ...defStep,
                completed: !!existing?.completed
              };
            }),
            updatedAt: new Date()
          };
          
          sopsData = sopsData.map((sop: SOP) => 
            sop.id === 'product-launch' ? mergedSOP : sop
          );
        }
      }

      // Ensure batching-content SOP has correct content for steps 6 and 7
      const batchingSOP = sopsData.find((sop: SOP) => sop.id === 'batching-content');
      const batchingDefault = defaultSOPs.find(sop => sop.id === 'batching-content');
      
      if (batchingSOP && batchingDefault) {
        const updatedSteps = batchingSOP.steps.map((step: SOPStep, index: number) => {
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
      }
      
      // Save updated data and version
      localStorage.setItem('sop-builder-sops', JSON.stringify(sopsData));
      localStorage.setItem('sops-version', currentVersion);
      setSops(sopsData);
    } else {
      setSops(defaultSOPs);
      localStorage.setItem('sop-builder-sops', JSON.stringify(defaultSOPs));
      localStorage.setItem('sops-version', currentVersion);
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