import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { 
  Home, 
  Workflow, 
  FileText, 
  Mail, 
  Rocket, 
  DollarSign, 
  Users, 
  Settings, 
  LogOut,
  Palette 
} from "lucide-react";

const navigationItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/workflow", icon: Workflow, label: "Streamline Workflow" },
  { href: "/content", icon: FileText, label: "Content System" },
  { href: "/email", icon: Mail, label: "Email Marketing" },
  { href: "/launch", icon: Rocket, label: "Product Launch" },
  { href: "/finance", icon: DollarSign, label: "Finance" },
  { href: "/affiliate", icon: Users, label: "Affiliate Hub" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  return (
    <div className="lg:w-64 bg-white lg:shadow-[4px_0_20px_-4px_rgba(0,0,0,0.1)] relative hidden lg:block">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl flex items-center justify-center">
            <Palette className="text-white text-lg" />
          </div>
          <h1 className="text-xl font-serif font-semibold text-gray-800">Creative Toolkit</h1>
        </div>

        {/* User Profile Section */}
        <div className="mb-8 p-4 bg-pink-50 rounded-2xl">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={user?.profileImageUrl || ""} 
                alt={user?.firstName || "User"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
                {user?.firstName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-800">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || "Creative User"
                }
              </p>
              <p className="text-sm text-gray-500">Creative Entrepreneur</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-3 mb-8">
          {navigationItems.map((item) => (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-4 rounded-xl text-left transition-colors ${
                location === item.href
                  ? "bg-pink-100 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-left text-sm whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Settings and Logout */}
        <div className="border-t border-pink-200 pt-6 space-y-2">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </button>
          <button 
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                window.location.href = "/";
              } catch (error) {
                console.error("Logout error:", error);
              }
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
