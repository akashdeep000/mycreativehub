import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SignUp from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import ContentPlanning from "@/pages/content-planning";
import SocialMediaStrategy from "@/pages/social-media-strategy";
import ReelCarouselTemplates from "@/pages/reel-carousel-templates";
import MonthlyContentPlanner from "@/pages/monthly-content-planner";
import ContentBatchingPlanner from "@/pages/content-batching-planner";
import MonthlyContentCalendar from "@/pages/monthly-content-calendar";
import TimeBlocking from "@/pages/time-blocking";
import FinanceTracker from "@/pages/finance-tracker";
import InspirationHub from "@/pages/inspiration-hub";
import StreamlineWorkflow from "@/pages/streamline-workflow";
import ArchivedTemplates from "@/pages/archived-templates";
import InspirationBoardDetail from "@/pages/inspiration-board-detail";
import DailyFocusPage from "@/pages/daily-focus";
import AutomationToolkit from "@/pages/automation-toolkit";
import SOPBuilderHub from "@/pages/sop-builder-hub";
import SOPEditor from "@/pages/sop-editor";
import ContentStatusTracker from "@/pages/content-status-tracker";
import RepurposingToolkit from "@/pages/repurposing-toolkit";
import ContentPerformanceStrategy from "@/pages/content-performance-strategy";
import PerformanceTrackingTable from "@/pages/performance-tracking-table";

import ResourceLibrary from "@/pages/resource-library";
import ProductLaunch from "@/pages/product-launch";
import SeasonalityTimeline from "@/pages/seasonality-timeline";
import QuarterDetail from "@/pages/quarter-detail";
import ProductComponentChecklist from "@/pages/product-component-checklist";
import ProfitCalculator from "@/pages/profit-calculator";
import PreLaunchTimelinePlanner from "@/pages/pre-launch-timeline-planner";
import LaunchGrowthPlan from "@/pages/launch-growth-plan";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Always show login/signup routes for unauthenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }



  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/streamline-workflow" component={StreamlineWorkflow} />
      <Route path="/content" component={ContentPlanning} />
      <Route path="/content-planning" component={ContentPlanning} />
      <Route path="/social-media-strategy" component={SocialMediaStrategy} />
      <Route path="/reel-carousel-templates" component={ReelCarouselTemplates} />
      <Route path="/monthly-content-planner" component={MonthlyContentPlanner} />
      <Route path="/content-batching-planner" component={ContentBatchingPlanner} />
      <Route path="/monthly-content-calendar" component={MonthlyContentCalendar} />
      <Route path="/time-blocking" component={TimeBlocking} />
      <Route path="/finance" component={FinanceTracker} />
      <Route path="/daily-focus" component={DailyFocusPage} />
      <Route path="/automation-toolkit" component={AutomationToolkit} />
      <Route path="/sop-builder" component={SOPBuilderHub} />
      <Route path="/sop/:id" component={SOPEditor} />
      <Route path="/content-status-tracker" component={ContentStatusTracker} />
      <Route path="/repurposing-toolkit" component={RepurposingToolkit} />
      <Route path="/content-performance-strategy" component={ContentPerformanceStrategy} />
      <Route path="/performance-tracking-table" component={PerformanceTrackingTable} />

      <Route path="/resource-library" component={ResourceLibrary} />
      <Route path="/launch" component={ProductLaunch} />
      <Route path="/seasonality-timeline" component={SeasonalityTimeline} />
      <Route path="/seasonality/:quarter" component={QuarterDetail} />
      <Route path="/product-component-checklist" component={ProductComponentChecklist} />
      <Route path="/profit-calculator" component={ProfitCalculator} />
      <Route path="/pre-launch-timeline-planner" component={PreLaunchTimelinePlanner} />
      <Route path="/launch-growth-plan" component={LaunchGrowthPlan} />
      <Route path="/archived-templates" component={ArchivedTemplates} />
      <Route path="/inspiration-hub/board/:id" component={InspirationBoardDetail} />
      <Route path="/inspiration-hub" component={InspirationHub} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
