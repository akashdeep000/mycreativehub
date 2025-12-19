import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, AlertTriangle, CheckCircle2, CreditCard, Calendar, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Skeleton } from "@/components/ui/skeleton";

type Subscription = {
  id: number;
  status: string;
  plan: string;
  amount: number;
  currency: string;
  nextBillingDate: string;
  lastBillingDate: string;
  createdAt: string;
  cancelUrl: string;
};

export default function SubscriptionManagement() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<"confirm" | "retention" | "discount" | "final">("confirm");

  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/subscription/cancel", {
        method: "POST",
        body: JSON.stringify({ 
          subscriptionId: subscription?.id,
          cancelType: 'at_the_end_of_the_period'
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been successfully cancelled.",
      });
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel subscription. Please contact support.",
        variant: "destructive",
      });
    },
  });

  const handleCancelClick = () => {
    setCancelStep("confirm");
    setIsCancelModalOpen(true);
  };

  const handleNextStep = () => {
    if (cancelStep === "confirm") setCancelStep("retention");
    else if (cancelStep === "retention") setCancelStep("discount");
    else if (cancelStep === "discount") setCancelStep("final");
  };

  const handleFinalCancel = () => {
    cancelMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden pt-20 md:pt-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>

            <Card className="mb-8 border-l-4 border-l-gray-200 shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-7 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-12 mb-2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between bg-gray-50/50 border-t p-6">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-40" />
              </CardFooter>
            </Card>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  const content = (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Subscription</h1>
        <p className="text-gray-600 mt-2">View and manage your plan details</p>
      </div>

      {error || !subscription || subscription.status !== 'active' ? (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Manage your subscription and billing details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <CreditCard className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
              <p className="text-gray-500 max-w-md mb-6">
                We couldn't find an active subscription for your account. If you believe this is an error, please contact support.
              </p>
              <Button onClick={() => setLocation("/")}>Return to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 border-l-4 border-l-primary shadow-md">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{subscription.plan}</CardTitle>
                <CardDescription className="mt-1">Current Active Plan</CardDescription>
              </div>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Price</p>
                  <p className="text-lg font-semibold">
                    {(subscription.amount / 100).toLocaleString(undefined, { style: 'currency', currency: subscription.currency })}
                    <span className="text-sm text-gray-500 font-normal"> / year</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Billing Date</p>
                  <p className="text-lg font-semibold">
                    {subscription.lastBillingDate ? new Date(subscription.lastBillingDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="text-lg font-semibold">
                    {subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Next Billing Date</p>
                  <p className="text-lg font-semibold">
                    {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Payment Method</h3>
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="bg-white p-2 rounded border">
                    <CreditCard className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Payment Details</p>
                    <p className="text-xs text-gray-500">Managed via Systeme.io</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={subscription.cancelUrl} target="_blank" rel="noopener noreferrer">
                    Update Details
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between bg-gray-50/50 border-t p-6">
            <Button variant="outline" asChild>
              <a href={subscription.cancelUrl} target="_blank" rel="noopener noreferrer">
                Manage Billing
              </a>
            </Button>
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleCancelClick}>
              Cancel Subscription
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Cancellation Flow Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={(open) => !open && setIsCancelModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          {cancelStep === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle>Are you sure you want to cancel?</DialogTitle>
                <DialogDescription>
                  Your subscription will remain active until the end of the current billing period.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Cancelling will disable auto-renewal. You will lose access to premium features after your current period ends.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Keep Subscription</Button>
                <Button variant="destructive" onClick={handleNextStep}>Continue to Cancel</Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === "retention" && (
            <>
              <DialogHeader>
                <DialogTitle>Before you go...</DialogTitle>
                <DialogDescription>
                  Here's what you'll lose access to if you cancel:
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                {[
                  "Creative Inspiration Hub",
                  "Time Blocking Planner",
                  "Content Creation System",
                  "Product Launch System",
                  "Financial Management System",
                  "Automation System Toolkit & SOPs",
                  "Affiliate Link Hub & Resource Library"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center space-x-2 text-gray-700">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              <DialogFooter className="flex-col space-y-2 sm:space-y-0">
                <Button className="w-full sm:w-auto" onClick={() => setIsCancelModalOpen(false)}>I changed my mind</Button>
                <Button variant="ghost" className="text-gray-500" onClick={handleNextStep}>I understand, continue</Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === "discount" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-primary">Wait! Last Chance Offer</DialogTitle>
                <DialogDescription>
                  We'd love to keep you as a member. Here is a special offer just for you.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 text-center">
                <div className="bg-primary/10 rounded-xl p-6 mb-4">
                  <h3 className="text-2xl font-bold text-primary mb-2">
                    {import.meta.env.VITE_DISCOUNT_OFFER_TEXT || "30% OFF"}
                  </h3>
                  <p className="text-gray-600">Your next renewal</p>
                </div>
                <p className="text-sm text-gray-500">
                  Claim this offer to stay with us at a discounted rate.
                </p>
              </div>
              <DialogFooter className="flex-col space-y-2 sm:space-y-0">
                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90" onClick={() => {
                  const offerUrl = import.meta.env.VITE_DISCOUNT_OFFER_URL || "mailto:support@mycreativehub.com?subject=Claim%2030%25%20Discount";
                  window.open(offerUrl, "_blank");
                  setIsCancelModalOpen(false);
                }}>
                  {import.meta.env.VITE_DISCOUNT_OFFER_BUTTON || "Claim 30% Discount"}
                </Button>
                <Button variant="ghost" className="text-gray-500" onClick={handleNextStep}>No thanks, cancel anyway</Button>
              </DialogFooter>
            </>
          )}

          {cancelStep === "final" && (
            <>
              <DialogHeader>
                <DialogTitle>Final Confirmation</DialogTitle>
                <DialogDescription>
                  This is your last step. Please confirm you want to cancel.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">
                  We're sorry to see you go. Your access will continue until <strong>{subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'the end of the period'}</strong>.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Go Back</Button>
                <Button variant="destructive" onClick={handleFinalCancel} disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm Cancellation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden pt-20 md:pt-4">
        {content}
      </div>
      <MobileNav />
    </div>
  );
}
