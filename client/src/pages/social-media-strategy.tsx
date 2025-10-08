import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Target,
  ArrowLeft,
  Home,
  Plus
} from "lucide-react";

export default function SocialMediaStrategy() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 dark:text-gray-400">Please log in to view your strategy.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            data-testid="button-back"
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            data-testid="button-dashboard"
            onClick={() => setLocation('/dashboard')}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Main Dashboard
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-8 h-8 text-pink-500" />
            My Social Media Strategy
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Define your content pillars to guide your social media strategy
          </p>
        </div>

        {/* Add New Content Pillar Button */}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-center mb-6">
            <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Content Pillars Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Get started by adding your first content pillar
            </p>
          </div>
          <Button
            data-testid="button-add-new-pillar"
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Content Pillar
          </Button>
        </div>
      </div>
    </div>
  );
}
