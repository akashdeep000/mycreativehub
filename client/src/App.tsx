import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ScrollToTop from "@/components/ScrollToTop";
import { TimerProvider, useTimer } from "@/contexts/TimerContext";
import GlobalTimer from "@/components/GlobalTimer";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SignUp from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import ContentPlanning from "@/pages/content-planning";
import SocialMediaStrategy from "@/pages/social-media-strategy";
import ReelCarouselTemplates from "@/pages/reel-carousel-templates";
import MonthlyContentPlanner from "@/pages/monthly-content-planner";
import ContentBatchingPlanner from "@/pages/content-batching-planner";
import MonthlyContentCalendar from "@/pages/monthly-content-calendar";
import TimeBlocking from "@/pages/time-blocking";
import AffiliateMarketing from "@/pages/affiliate-marketing";
import InspirationHub from "@/pages/inspiration-hub";
import StreamlineWorkflow from "@/pages/streamline-workflow";
import InspirationBoardDetail from "@/pages/inspiration-board-detail";
import DailyFocusPage from "@/pages/daily-focus";
import AutomationToolkit from "@/pages/automation-toolkit";
import SOPBuilderHub from "@/pages/sop-builder-hub";
import SOPEditor from "@/pages/sop-editor";
import ContentStatusTracker from "@/pages/content-status-tracker";
import RepurposingToolkit from "@/pages/repurposing-toolkit";
import ContentPerformanceStrategy from "@/pages/content-performance-strategy";
import PerformanceTrackingTable from "@/pages/performance-tracking-table";
import EditProfile from "@/pages/edit-profile";

import ResourceLibrary from "@/pages/resource-library";
import ProductLaunch from "@/pages/product-launch";
import SeasonalityTimeline from "@/pages/seasonality-timeline";
import QuarterDetail from "@/pages/quarter-detail";
import ProductComponentChecklist from "@/pages/product-component-checklist";
import ProfitCalculator from "@/pages/profit-calculator";
import PreLaunchTimelinePlanner from "@/pages/pre-launch-timeline-planner";
import LaunchGrowthPlan from "@/pages/launch-growth-plan";
import MonthlyContentCalendarV2 from "@/pages/monthly-content-calendar-v2";
import MonthlyContentCalendarV3 from "@/pages/monthly-content-calendar-v3";
import Help from "@/pages/help";
import MobileFixedHeader from "@/components/layout/mobile-fixed-header";


function TimerWrapper() {
  const { isVisible, timeLeft, totalTime, currentTask, isRunning, pauseTimer, resumeTimer, stopTimer, hideTimer, completeTimer } = useTimer();
  
  return (
    <GlobalTimer
      isVisible={isVisible}
      onClose={hideTimer}
      timeLeft={timeLeft}
      totalTime={totalTime}
      currentTask={currentTask}
      isRunning={isRunning}
      onPause={pauseTimer}
      onResume={resumeTimer}
      onStop={stopTimer}
      onComplete={completeTimer}
    />
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show login routes only for confirmed unauthenticated users
  if (!isAuthenticated) {
    return (
      <>
        <ScrollToTop />
        <Switch>
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={SignUp} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route component={Login} />
        </Switch>
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      <TimerWrapper />
      <MobileFixedHeader />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inspiration-hub/board/:id" component={InspirationBoardDetail} />
        <Route path="/inspiration-hub" component={InspirationHub} />
        <Route path="/streamline-workflow" component={StreamlineWorkflow} />
        <Route path="/content" component={ContentPlanning} />
        <Route path="/content-planning" component={ContentPlanning} />
        <Route path="/social-media-strategy" component={SocialMediaStrategy} />
        <Route path="/reel-carousel-templates" component={ReelCarouselTemplates} />
        <Route path="/monthly-content-planner" component={MonthlyContentPlanner} />
        <Route path="/content-batching-planner" component={ContentBatchingPlanner} />
        <Route path="/monthly-content-calendar" component={MonthlyContentCalendar} />
        <Route path="/monthly-content-calendar-v2" component={MonthlyContentCalendarV2} />
        <Route path="/monthly-content-calendar-v3" component={MonthlyContentCalendarV3} />

        <Route path="/time-blocking-planner" component={TimeBlocking} />
        <Route path="/time-blocking" component={TimeBlocking} />
        <Route path="/affiliate-marketing" component={AffiliateMarketing} />
        <Route path="/daily-focus" component={DailyFocusPage} />
        <Route path="/automation-toolkit" component={AutomationToolkit} />
        <Route path="/sop-builder-hub" component={SOPBuilderHub} />
        <Route path="/sop/:id" component={SOPEditor} />
        <Route path="/content-status-tracker" component={ContentStatusTracker} />
        <Route path="/repurposing-toolkit" component={RepurposingToolkit} />
        <Route path="/content-performance-strategy" component={ContentPerformanceStrategy} />
        <Route path="/performance-tracking-table" component={PerformanceTrackingTable} />
        <Route path="/edit-profile" component={EditProfile} />

        <Route path="/resource-library" component={ResourceLibrary} />
        <Route path="/launch" component={ProductLaunch} />
        <Route path="/product-launch" component={ProductLaunch} />
        <Route path="/seasonality-timeline" component={SeasonalityTimeline} />
        <Route path="/seasonality/:quarter" component={QuarterDetail} />
        <Route path="/product-component-checklist" component={ProductComponentChecklist} />
        <Route path="/profit-calculator" component={ProfitCalculator} />
        <Route path="/pre-launch-timeline-planner" component={PreLaunchTimelinePlanner} />
        <Route path="/launch-growth-plan" component={LaunchGrowthPlan} />
        <Route path="/help" component={Help} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  // Global fix for mouse wheel scrolling on focused number inputs
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      const el = document.activeElement as HTMLInputElement | null;
      if (el && el.tagName === 'INPUT' && el.type === 'number') {
        e.preventDefault();
        el.blur();
      }
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TimerProvider>
          <Router />
        </TimerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
