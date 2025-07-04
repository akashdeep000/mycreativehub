import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Plus, Check, Clock, Heart, Calendar } from "lucide-react";
import type { ActivityLog } from "@shared/schema";

const activityIcons = {
  task_created: Plus,
  task_completed: Check,
  task_uncompleted: Clock,
  template_created: Plus,
  template_updated: Calendar,
  template_deleted: Calendar,
  focus_session: Clock,
  inspiration_saved: Heart,
};

const activityColors = {
  task_created: "blue",
  task_completed: "green",
  task_uncompleted: "orange",
  template_created: "purple",
  template_updated: "indigo",
  template_deleted: "red",
  focus_session: "orange",
  inspiration_saved: "purple",
};

export default function RecentActivity() {
  const { user } = useAuth();

  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="border-pink-100">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-pink-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif">Recent Activity</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-pink-600 hover:text-pink-700"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const IconComponent = activityIcons[activity.action as keyof typeof activityIcons] || Plus;
              const color = activityColors[activity.action as keyof typeof activityColors] || "blue";
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 bg-gradient-to-br from-${color}-400 to-${color}-500 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No recent activity</p>
              <p className="text-gray-400 text-xs mt-1">
                Your recent actions will appear here
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
