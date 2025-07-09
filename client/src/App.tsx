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
import TimeBlocking from "@/pages/time-blocking";
import FinanceTracker from "@/pages/finance-tracker";
import InspirationHub from "@/pages/inspiration-hub";
import StreamlineWorkflow from "@/pages/streamline-workflow";
import ArchivedTemplates from "@/pages/archived-templates";
import InspirationBoardDetail from "@/pages/inspiration-board-detail";
import DailyFocusPage from "@/pages/daily-focus";
import AutomationToolkit from "@/pages/automation-toolkit";

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
      <Route path="/time-blocking" component={TimeBlocking} />
      <Route path="/finance" component={FinanceTracker} />
      <Route path="/daily-focus" component={DailyFocusPage} />
      <Route path="/automation-toolkit" component={AutomationToolkit} />
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
