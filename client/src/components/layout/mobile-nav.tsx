import { useLocation } from "wouter";
import { navigationItems } from "@/lib/navigation";
import { Home } from "lucide-react";

// Mobile navigation - Home + main sections
const mobileNavigationItems = [
  // Home (Dashboard)
  { ...navigationItems.find(item => item.moduleKey === "dashboard")!, label: "Home" },
  // Streamline Workflow → "Streamline"
  { ...navigationItems.find(item => item.moduleKey === "Streamline Your Workflow")!, label: "Streamline" },
  // Content System → "Content"
  { ...navigationItems.find(item => item.moduleKey === "Content Creation System")!, label: "Content" },
  // Product Launch → "Launch"
  { ...navigationItems.find(item => item.moduleKey === "Product Launch System")!, label: "Launch" },
  // Financial Management → "Finance"
  { ...navigationItems.find(item => item.moduleKey === "Financial Management System")!, label: "Finance" },
  // Affiliate Hub → "Affiliate"
  { ...navigationItems.find(item => item.moduleKey === "The Affiliate Link Hub")!, label: "Affiliate" }
];


export default function MobileNav() {
  const [location, setLocation] = useLocation();

  // Debug logging
  console.log("MobileNav - Current location:", location);
  console.log("MobileNav - Navigation items:", mobileNavigationItems.map(item => ({ 
    label: item.label, 
    href: item.href, 
    moduleKey: item.moduleKey 
  })));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-pink-200 lg:hidden shadow-lg pointer-events-auto">
      <div className="flex items-center justify-around py-3">
        {mobileNavigationItems.map((item) => (
          <button
            key={item.href}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              console.log("MobileNav - Clicking item:", { label: item.label, href: item.href, moduleKey: item.moduleKey });
              if (item.href !== "#") {
                setLocation(item.href);
              }
            }}
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
