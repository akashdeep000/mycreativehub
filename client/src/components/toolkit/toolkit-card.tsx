import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Calendar, 
  Workflow, 
  FileText, 
  Mail, 
  Rocket,
  TrendingUp,
  Users,
  Link,
  LucideIcon
} from "lucide-react";

interface ToolkitModule {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  templateCount: number;
  lastUsed: string;
  href: string;
}

interface ToolkitCardProps {
  module: ToolkitModule;
}

const iconMap: Record<string, LucideIcon> = {
  "Workflow": Workflow,
  "FileText": FileText,
  "Mail": Mail,
  "Rocket": Rocket,
  "TrendingUp": TrendingUp,
  "Users": Users,
  "Link": Link,
};

const colorMap: Record<string, string> = {
  emerald: "from-emerald-400 to-emerald-500",
  blue: "from-blue-400 to-blue-500",
  orange: "from-orange-400 to-orange-500",
  green: "from-green-400 to-green-500",
  purple: "from-purple-400 to-purple-500",
  indigo: "from-indigo-400 to-indigo-500",
  pink: "from-pink-400 to-pink-500",
};

const badgeColorMap: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  indigo: "bg-indigo-50 text-indigo-600",
  pink: "bg-pink-50 text-pink-600",
};

export default function ToolkitCard({ module }: ToolkitCardProps) {
  const [, setLocation] = useLocation();
  const IconComponent = iconMap[module.icon] || Calendar;
  
  return (
    <Card 
      className="border-pink-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
      onClick={() => setLocation(module.href)}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[module.color]} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <Badge 
            variant="secondary" 
            className={`text-xs ${badgeColorMap[module.color]}`}
          >
            {module.name === "Content Creation System" ? "3 Systems" : 
             module.name === "Product Launch System" ? "4 Systems" :
             module.name === "The Affiliate Link Hub" ? "1 System" :
             module.name === "Streamline Your Workflow" ? "4 Systems" :
             module.name === "Your Resource Library" ? "1 System" :
             module.templateCount === 1 ? "1 template" :
             module.templateCount > 1 ? `${module.templateCount} Templates` : "New"}
          </Badge>
        </div>
        <CardTitle className="text-lg font-serif">{module.name}</CardTitle>
        <p className="text-gray-600 text-sm">{module.description}</p>
        {module.name === "Streamline Your Workflow" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-800 mb-2">What's Inside:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Creative Inspiration Hub</li>
              <li>• Time Blocking Planner</li>
              <li>• Automation System Toolkit</li>
              <li>• SOP Builder</li>
            </ul>
          </div>
        )}
        {module.name === "Content Creation System" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-800 mb-2">What's Inside:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• My Social Media Strategy</li>
              <li>• Monthly Content Calendar</li>
              <li>• Reel & Carousel Template Pack</li>
            </ul>
          </div>
        )}
        {module.name === "Product Launch System" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-800 mb-2">What's Inside:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Seasonality Timeline</li>
              <li>• Pre-Launch Timeline Planner</li>
              <li>• Product Profit Calculator</li>
              <li>• Launch Growth Plan</li>
            </ul>
          </div>
        )}
        {module.name === "Financial Management" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-800 mb-2">What's Inside:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Your Money Map</li>
            </ul>
          </div>
        )}
        {module.name === "The Affiliate Link Hub" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-800 mb-2">What's Inside:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Affiliate Link Tracker</li>
            </ul>
          </div>
        )}
      </CardHeader>
      
    </Card>
  );
}
