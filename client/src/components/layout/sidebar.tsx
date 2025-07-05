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
  { href: "/workflow", icon: Workflow, label: "Streamline Your Workflow" },
  { href: "/content", icon: FileText, label: "Content Creation System" },
  { href: "/email", icon: Mail, label: "Email Marketing" },
  { href: "/launch", icon: Rocket, label: "Product Launch System" },
  { href: "/finance", icon: DollarSign, label: "Financial Management" },
  { href: "/affiliate", icon: Users, label: "The Affiliate Marketing Hub" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  return (
    <div className="lg:w-64 bg-white shadow-lg lg:shadow-none lg:border-r border-pink-200 hidden lg:block">
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
        <nav className="space-y-2 mb-8">
          {navigationItems.map((item) => (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                location === item.href
                  ? "bg-pink-100 text-pink-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Settings and Logout */}
        <div className="border-t border-pink-200 pt-6 space-y-2">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
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
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
