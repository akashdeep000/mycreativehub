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
  { href: "/launch", icon: Rocket, label: "Product Launch", moduleKey: "Product Launch System" },
  { href: "/finance", icon: TrendingUp, label: "Finance", moduleKey: "Financial Management" },
  { href: "/affiliate-marketing", icon: Link, label: "Affiliate Hub", moduleKey: "The Affiliate Link Hub" },
  { href: "/resource-library", icon: FolderOpen, label: "Resource Library", moduleKey: "Your Resource Library" },
];

// Create route mapping from navigation items
export const routeMap: Record<string, string> = navigationItems.reduce((map, item) => {
  if (item.moduleKey !== "dashboard") {
    map[item.moduleKey] = item.href;
  }
  return map;
}, {} as Record<string, string>);

// Add additional route mappings for specific modules
// routeMap["Time Blocking Planner"] = "/time-blocking-planner"; // Removed - now handled within Streamline Workflow

// Create module order mapping for dashboard card sorting
export const moduleOrderMap: Record<string, number> = navigationItems.reduce((map, item, index) => {
  if (item.moduleKey !== "dashboard") {
    map[item.moduleKey] = index;
  }
  return map;
}, {} as Record<string, number>);

// Helper function to sort modules by navigation order
export const sortModulesByNavigationOrder = (modules: any[]) => {
  return modules.sort((a, b) => {
    const orderA = moduleOrderMap[a.name] ?? 999;
    const orderB = moduleOrderMap[b.name] ?? 999;
    return orderA - orderB;
  });
};