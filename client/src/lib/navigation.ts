import { 
  Home, 
  Workflow, 
  FileText, 
  Rocket, 
  TrendingUp, 
  Users,
  Link,
  FolderOpen,
  LucideIcon 
} from "lucide-react";

export interface NavigationItem {
  href: string;
  icon: LucideIcon;
  label: string;
  moduleKey: string; // Key used to match with database modules
}

// Centralized navigation configuration
export const navigationItems: NavigationItem[] = [
  { href: "/", icon: Home, label: "Dashboard", moduleKey: "dashboard" },
  { href: "/streamline-workflow", icon: Workflow, label: "Streamline Workflow", moduleKey: "Streamline Your Workflow" },
  { href: "/content", icon: FileText, label: "Content System", moduleKey: "Content Creation System" },
  { href: "/resource-library", icon: FolderOpen, label: "Resource Library", moduleKey: "Your Resource Library" },
  { href: "/launch", icon: Rocket, label: "Product Launch", moduleKey: "Product Launch System" },
  { href: "/finance", icon: TrendingUp, label: "Finance", moduleKey: "Financial Management" },
  { href: "/affiliate-marketing", icon: Link, label: "Affiliate Hub", moduleKey: "The Affiliate Link Hub" },
];

// Create route mapping from navigation items
export const routeMap: Record<string, string> = navigationItems.reduce((map, item) => {
  if (item.moduleKey !== "dashboard") {
    map[item.moduleKey] = item.href;
  }
  return map;
}, {} as Record<string, string>);