import { useLocation } from "wouter";
import { Home, Calendar, Lightbulb, User } from "lucide-react";

const navigationItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/content-planning", icon: Calendar, label: "Calendar" },
  { href: "/inspiration-hub", icon: Lightbulb, label: "Inspire" },
  { href: "#", icon: User, label: "Profile" },
];

export default function MobileNav() {
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-200 lg:hidden">
      <div className="flex items-center justify-around py-3">
        {navigationItems.map((item) => (
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
