import { useLocation } from "wouter";
import { navigationItems } from "@/lib/navigation";
import { HelpCircle } from "lucide-react";

// Filter for mobile navigation - show specific main sections + help
const mobileNavigationItems = [
  // Streamline Workflow → "Streamline"
  { ...navigationItems.find(item => item.moduleKey === "Streamline Your Workflow")!, label: "Streamline" },
  // Content System → "Content"
  { ...navigationItems.find(item => item.moduleKey === "Content Creation System")!, label: "Content" },
  // Product Launch → "Launch"
  { ...navigationItems.find(item => item.moduleKey === "Product Launch System")!, label: "Launch" },
  // Finance → "Finance"
  { ...navigationItems.find(item => item.moduleKey === "Financial Management")!, label: "Finance" },
  // Affiliate Hub → "Affiliate"
  { ...navigationItems.find(item => item.moduleKey === "The Affiliate Link Hub")!, label: "Affiliate" },
  // Help
  {
    href: "/help",
    icon: HelpCircle,
    label: "Help",
    moduleKey: "help"
  }
];

export default function MobileNav() {
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-200 lg:hidden">
      <div className="flex items-center justify-around py-3">
        {mobileNavigationItems.map((item) => (
          <button
            key={item.href}
            onClick={() => item.href !== "#" && setLocation(item.href)}
            className={`flex flex-col items-center space-y-1 ${
              location === item.href
                ? "text-pink-600"
                : "text-gray-400"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
