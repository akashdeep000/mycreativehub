import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Heart, LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: "green" | "purple" | "pink";
  icon: "check" | "clock" | "heart";
}

const iconMap: Record<string, LucideIcon> = {
  check: Check,
  clock: Clock,
  heart: Heart,
};

const colorMap = {
  green: {
    bg: "from-green-400 to-green-500",
    badge: "bg-green-50 text-green-600",
  },
  purple: {
    bg: "from-purple-400 to-purple-500",
    badge: "bg-purple-50 text-purple-600",
  },
  pink: {
    bg: "from-pink-400 to-pink-500",
    badge: "bg-pink-50 text-pink-600",
  },
};

export default function StatsCard({ title, value, subtitle, color, icon }: StatsCardProps) {
  const IconComponent = iconMap[icon];
  const colorConfig = colorMap[color];

  return (
    <Card className="border-pink-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${colorConfig.bg} rounded-xl flex items-center justify-center`}>
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <Badge variant="secondary" className={`text-sm ${colorConfig.badge}`}>
            {subtitle}
          </Badge>
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
        <p className="text-gray-600">{title}</p>
      </CardContent>
    </Card>
  );
}
