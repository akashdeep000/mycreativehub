import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { apiRequest } from "@/lib/queryClient";
import type { WorkflowTemplateInstance } from "@shared/schema";

interface SOPStep {
  id: string;
  text: string;
  completed: boolean;
}

interface SOP {
  id: string;
  title: string;
  steps: SOPStep[];
  createdAt: string;
  updatedAt: string;
}

interface SOPBuilderData {
  sops: SOP[];
  lastModified: string;
}

// The 3 permanent example SOPs with user's exact content
const defaultSOPs: SOP[] = [
  {
    id: "email-funnel",
    title: "Email Funnel SOP",
    steps: [
      {
        id: "1",
        text: 'Create the automation:\n\n- In your email platform, go to Automations/Workflows → New.\nName it: "Funnel – Product/Lead Magnet".',
        completed: false,
      },
      {
        id: "2",
        text: 'Choose the trigger (pick one):\n\n- Lead magnet sign-up (joined form/list).\n- Tag applied (e.g., "Interested in Product A").\n- Purchased product (order completed).',
        completed: false,
      },
      {
        id: "3",
        text: "Protect your list:\n\n- If this is a sales funnel, also exclude subscribers that have already bought this product.",
        completed: false,
      },
      {
        id: "4",
        text: 'Plan/Write the email sequence:\n(Timing is from the moment they enter the automation).\n\nFor a Sales/Nurture Funnel (after tag or lead magnet):\n\n- Email 1: Welcome + quick win (send immediately)\nDeliver the freebie/product or a tip. CTA: "Learn about Product/additional product"\n\n- Email 2: Teach something helpful (+1 day)\nShort tip/tutorial. CTA: "See how Product/additional product helps"\n\n- Email 3: Proof/Story (+2 days)\nBefore/after or testimonial. CTA: "See results / case study"\n\n- Email 4: Offer (+2 days)\nWhat\'s inside, benefits, bonus, guarantee. CTA: "Get Product"\n\n- Email 5: FAQs / Objections (+2 days)\nAnswer "Will this work for me?", time, price. CTA: "Get Product"\n\n- Email 6: Last call (gentle urgency) (+2–3 days)\nRecap benefits + simple nudge. CTA: "Last chance to grab it" or "I won\'t mention this again for a while!"',
        completed: false,
      },
      {
        id: "5",
        text: "Add delays:\n\n- Between emails, add delays as listed above (1–2 days is perfect for first week after sign up, then move to weekly value emails).",
        completed: false,
      },
      {
        id: "6",
        text: "Add one simple rule:\n\n- If purchased a Product → Exit the sales funnel (so buyers stop getting pitches).",
        completed: false,
      },
      {
        id: "7",
        text: "Quick test (always):\n\n- Add yourself to the trigger → make sure each email lands, links work, mobile looks good.",
        completed: false,
      },
      {
        id: "8",
        text: "Turn it on:\n\n- Switch the automation ON. Promote lead magnet/product to get signups.",
        completed: false,
      },
      {
        id: "9",
        text: "Tips: Keep it simple to improve:\n\nIf opens are low → try a stronger subject on the next email.\nIf clicks are low → move the CTA higher and make it clearer.\nIf someone buys → confirm they stop the sales funnel.",
        completed: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "product-launch",
    title: "Product Launch SOP",
    steps: [
      {
        id: "1",
        text: "Set the foundations:\n\n- Pick your launch window (Use the Seasonality Timeline). Add holidays, travel, collabs, and other promos.\n\n- Choose a 10-14 day window (pre-launch + launch week).\nDone when: Launch dates are blocked on the Seasonality Timeline (Product Launch System)\n\n- Set the money goal (Profit Calculator within Product Launch System)\n\n- Enter product price, estimated costs/fees, and unit target.\nAdjust price or target until profit goal feels realistic.",
        completed: false,
      },
      {
        id: "2",
        text: "Map the marketing:\n\n- Plan your 2-4 week content runway (Pre-Launch Timeline within Product Launch System)\n\nUse the same menu each week so it's simple:\n- Value Email\n- Sales Email (soft CTA or waitlist until open-cart)\n- Behind-the-Scenes Video (long or short)\n- Carousel: Pain Point or Myth vs Fact\n- Story/Case Study Post\n- Live/Q&A or Stories Poll\n- Teaser/Countdown (T-2 and T-1 only)\nDone when: Each week has 4–6 scheduled content blocks.\n\nDecide list growth (optional):\n\n- Pick or refresh a lead magnet to share and drive sales to launch.\nDone when: Lead magnet link is added to your content call-to-actions",
        completed: false,
      },
      {
        id: "3",
        text: "Build core assets:\n\n- Draft the sales page/listing page (can be simple)\n\n- Sections: Headline → Description →  Problem → Promise → What's inside → Who it's for → Social proof → Bonuses → Pricing → Guarantee → FAQ → CTA.\n\n- Write the emails (use your email funnel SOP)\n\n- Waitlist/Pre-launch: 2–3 value emails + 1 story/case study.\n\n- Open-cart: Day 1 announcement.\n\n- Mid-cart: 1 objection buster + 1 social proof.\n\n- Close day: 2 reminders (AM + last-chance PM).\nDone when: Emails are drafted/scheduled in your ESP.\n\n- Prep social + visuals: 2-3 carousels, 2 reels/shorts, 3-4 stories templates, product mockups.",
        completed: false,
      },
      {
        id: "4",
        text: 'Launch week:\n\nOpen cart (Day 1): \n- Publish sales/listing page.\n- Send "It\'s live" email; post announcement to top platform; add story highlights.\nDone when: Sales page is live and first marketing/email is published\n\nMid-cart momentum (Day 2-4):\nEmail: objection buster + case study.\nSocial: BTS, carousel addressing common question, 1 live/Q&A.\n\nFinal push (Last day)\n- AM reminder email; PM last-chance email.\n- Stories and final email reminder',
        completed: false,
      },
      {
        id: "5",
        text: "Delivery & upsell:\n\nOnboard buyers:\n\n- Thank-you email, access instructions, quick-start checklist.\nTag buyers and remove from promo sequence.\nDone when: All buyers receive access + are correctly tagged.\n\n- Optional: Easy upsell\nCreate a simple follow-up email with a complementary offer or add-on.\nDone when: Upsell is scheduled for buyers (1-3 days later).",
        completed: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "batching-content",
    title: "Batching Content SOP",
    steps: [
      {
        id: "1",
        text: "Plan your next 2-4 weeks:\n\n- Pick goal(s): nurture, launch support, list growth, or evergreen.\n\n- Choose channels: IG feed/Reels, Stories, TikTok, YouTube Shorts, Email, Blog, Pinterest.\n\n- Decide timeline (e.g. 3 IG posts, 2 Reels, 1 email per week).\n\n- List 3-5 content pillar themes you'll repeat (e.g., Tips, Behind-the-Scenes, Testimonials, Offers). Use Content Pillars within Content Creation System.\n\n- Use Time Blocking Calendar: plug in key dates (promos, holidays, launches).\nDone when: you have a filled in calendar and a target number of assets to make.",
        completed: false,
      },
      {
        id: "2",
        text: "Block your batching time:\n\n- Take Action! Pick 1-2 batching sessions this week for any given task within your Time Blocking Planner and get to work. \n\n- Set a Quick Start Timer on your dashboard and turn off distractions. \nDone when: your time is blocked and your workspace/files are ready.",
        completed: false,
      },
      {
        id: "3",
        text: "Plan content:\n\n- Brain dump 10-20 post ideas tied to your content pillars.\n\n- For each idea, jot 3-5 bullet points (what to show/say).\n\n- Map ideas to formats (Carousel, Reel, Story, Email).\nDone when: you have enough outlines to hit your batching target for 2-4 weeks.",
        completed: false,
      },
      {
        id: "4",
        text: "Produce visuals & videos (batch):\n\n- Record all clips in one go (same setup, different outfits/angles), OR film as you go, bank content throughout the week and batch the editing. \n\n- Design carousels/covers/thumbnails using your template packs.\n\n- Export in correct sizes and store in organised desktop folder.\nDone when: all visuals/clips for this batch are exported and named properly.",
        completed: false,
      },
      {
        id: "5",
        text: "Write captions & email copy:\n\n- For each asset, write: Hook → 3-5 value lines → CTA.\n\n- Add 3-5 relevant hashtags (if used), alt text, and any links.\nDone when: every asset has its caption/copy, CTA, and accessibility text.",
        completed: false,
      },
      {
        id: "6",
        text: "Upload/Schedule:\n\n- Load posts into your scheduler (or native app).\n\n- Set dates/times; add first comments/links if needed.\n\n- Final checks: Spelling/brand voice, audio levels, CTAs, alt text/captions on.\n\n- Hit Schedule.\nDone when: everything is queued and ready to go.",
        completed: false,
      },
      {
        id: "7",
        text: "Publish day checklist (super short):\n\n- Reply to early comments/DMs in the first hour.\n- Add links to Stories/Link-in-bio as needed.",
        completed: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function SOPBuilderHub() {
  const [id, setId] = useState<string | null>(null);
  const [localSOPs, setLocalSOPs] = useState<SOP[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Step 1 — Fetch all workflow templates for this user
  const { data: templates, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["/api/workflow-templates"],
    queryFn: async () => {
      const res = await fetch(`/api/workflow-templates`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json() as Promise<WorkflowTemplateInstance[]>;
    },
  });

  // Step 2 — Create SOP Builder template if missing
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/workflow-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: "sop-builder",
          title: "SOP Builder",
          data: { sops: defaultSOPs, lastModified: new Date().toISOString() },
        }),
      });
      if (!res.ok) throw new Error("Failed to create SOP Builder");
      return res.json() as Promise<WorkflowTemplateInstance>;
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates"] });
      setId(String(newTemplate.id));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create SOP Builder template.",
        variant: "destructive",
      });
    },
  });

  // Step 3 — If no template found, auto-create
  useEffect(() => {
    if (!isTemplatesLoading && templates) {
      const existing = templates.find((t) => t.templateType === "sop-builder");
      if (!existing && !createTemplateMutation.isPending) {
        createTemplateMutation.mutate();
      } else if (existing && !id) {
        setId(String(existing.id));
      }
    }
  }, [isTemplatesLoading, templates, id, createTemplateMutation]);

  // Step 4 — Once we have ID, fetch the actual template data
  const { data: template, isLoading } = useQuery({
    queryKey: [`/api/workflow-templates/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/workflow-templates/${id}`);
      if (!res.ok) throw new Error("Failed to fetch template");
      return res.json() as Promise<WorkflowTemplateInstance>;
    },
    enabled: !!id,
  });

  // Update local SOPs when template data changes
  useEffect(() => {
    if (template?.data) {
      const sopData = template.data as SOPBuilderData;
      if (sopData?.sops) {
        setLocalSOPs(sopData.sops);
      }
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: async (data: SOPBuilderData) => {
      return apiRequest(`/api/workflow-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workflow-templates/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-templates"] });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save SOP changes.",
        variant: "destructive",
      });
    },
  });

  const sops = localSOPs.length > 0 ? localSOPs : defaultSOPs;

  console.log({template, sops})

  // Debounced save with useRef
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback((data: SOPBuilderData) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      updateMutation.mutate(data);
    }, 600);
  }, [updateMutation]);

  const saveSOPs = (updatedSOPs: SOP[]) => {
    const data: SOPBuilderData = {
      sops: updatedSOPs,
      lastModified: new Date().toISOString(),
    };
    setLocalSOPs(updatedSOPs);
    debouncedSave(data);
  };

  const createNewSOP = () => {
    const newSOP: SOP = {
      id: `sop-${Date.now()}`,
      title: "New SOP",
      steps: [{ id: "1", text: "", completed: false }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedSOPs = [...sops, newSOP];
    saveSOPs(updatedSOPs);
    toast({ title: "New SOP Created", description: "Your new SOP has been saved." });
  };

  const deleteSOP = (sopId: string) => {
    if (["email-funnel", "product-launch", "batching-content"].includes(sopId)) {
      toast({
        title: "Cannot Delete Example SOP",
        description: "Example SOPs cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    const updatedSOPs = sops.filter((sop) => sop.id !== sopId);
    saveSOPs(updatedSOPs);
    toast({ title: "SOP Deleted", description: "The SOP was deleted successfully." });
  };

  const getCompletionPercentage = (sop: SOP) => {
    if (!sop.steps.length) return 0;
    const completed = sop.steps.filter((step) => step.completed).length;
    return Math.round((completed / sop.steps.length) * 100);
  };

  if (isTemplatesLoading || createTemplateMutation.isPending || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading SOP Builder...</p>
      </div>
    );
  }

  // --- UI Section (unchanged) ---
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64">
        <div className="p-6 pt-20 md:pt-6 pb-24 lg:pb-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4 mt-8 lg:hidden">
              <Link href="/streamline-workflow">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 mb-6">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Main Dashboard
                </Button>
              </Link>
              <Link href="/streamline-workflow">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Streamline Your Workflow
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">
                SOP Builder
              </h1>
            </div>
            <p className="text-gray-600">
              Create, manage, and track your Standard Operating Procedures.
            </p>
          </div>

          {/* SOP Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sops.map((sop) => (
              <Card key={sop.id} className="hover:shadow-lg transition-shadow bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg font-semibold">{sop.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{getCompletionPercentage(sop)}%</span>
                      </div>
                      <Progress value={getCompletionPercentage(sop)} className="h-2" />
                    </div>
                    <div className="text-sm text-gray-600">
                      Total steps: {sop.steps.length}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/sop/${sop.id}`}>Edit SOP</Link>
                      </Button>
                      {!["email-funnel", "product-launch", "batching-content"].includes(sop.id) && (
                        <Button variant="outline" size="sm" onClick={() => deleteSOP(sop.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create SOP Button */}
          <Card className="border-2 border-dashed hover:border-blue-400 transition-colors bg-white/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Create New SOP</h3>
              <p className="text-gray-600 mb-4 text-center">
                Build your own Standard Operating Procedure
              </p>
              <Button onClick={createNewSOP}>
                <Plus className="w-4 h-4 mr-2" />
                Create SOP
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}