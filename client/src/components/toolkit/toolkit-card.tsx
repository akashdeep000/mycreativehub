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
             module.templateCount > 0 ? `${module.templateCount} Templates` : "New"}
          </Badge>
        </div>
        <CardTitle className="text-lg font-serif">{module.name}</CardTitle>
        <p className="text-gray-600 text-sm">{module.description}</p>
      </CardHeader>
      
    </Card>
  );
}
