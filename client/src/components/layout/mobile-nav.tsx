import { useLocation } from "wouter";
import { navigationItems } from "@/lib/navigation";
import { Archive } from "lucide-react";

// Filter for mobile navigation - show first 4 main items + archived
const mobileNavigationItems = [
  ...navigationItems.slice(0, 4).map(item => ({
    ...item,
    label: item.label === "Dashboard" ? "Home" : 
           item.label === "Streamline Workflow" ? "Workflow" :
           item.label === "Content System" ? "Content" :
           item.label === "Product Launch" ? "Launch" :
           item.label
  })),
  {
    href: "/archived-templates",
    icon: Archive,
    label: "Archive",
    moduleKey: "archive"
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
