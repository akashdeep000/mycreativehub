import { useAuth } from "@/hooks/useAuth";
import { usePWA } from "@/contexts/PWAContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { navigationItems } from "@/lib/navigation";
import {
  Settings,
  LogOut,
  HelpCircle,
  Download,
  Lightbulb
} from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const { isInstallable, promptInstall } = usePWA();
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed top-0 left-0 lg:w-64 bg-white lg:shadow-[4px_0_20px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto hidden lg:block z-40">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-8">
          <img src="/icons/icon-trans-192x192.png" alt="My Creative Hub Logo" className="size-16 mb-1" />
          <h1 className="text-xl font-serif font-semibold text-gray-800 text-center">My Creative Hub</h1>
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
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || "Creative User"
                }
              </p>
              
              <p className="text-sm text-gray-500">
                {user?.businessTitle || "Creative Business Owner"}
              </p>
            </div>
          </div>
          
          {/* Edit Profile Button */}
          <div className="mt-3 pt-3 border-t border-pink-200">
            <button 
              onClick={() => setLocation('/edit-profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                location === '/edit-profile'
                  ? "bg-pink-200 text-pink-700 font-medium"
                  : "text-gray-600 hover:bg-pink-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-3 mb-8">
          {navigationItems.map((item) => (
            <div key={item.href}>
              <button
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
              
              {/* Bonus Course Link under Resource Library */}
              {item.href === '/resource-library' && (
                <a
                  href="https://1c21-info.systeme.io/dashboard/en/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between space-x-3 pl-12 pr-4 py-3 text-left transition-colors text-gray-600 hover:bg-gray-50 rounded-lg mt-1"
                  data-testid="link-bonus-course"
                >
                  <span className="text-left text-sm">Bonus Course: Systems for Success</span>
                  <Lightbulb className="w-4 h-4 flex-shrink-0" />
                </a>
              )}
            </div>
          ))}
        </nav>


        {/* Help Section */}
        <div className="mb-6">
          <button
            onClick={() => setLocation("/help")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-colors ${
              location === "/help"
                ? "bg-pink-100 text-pink-600 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-left text-sm">Help</span>
          </button>
        </div>

        {/* Install Button */}
        {isInstallable && (
          <div className="mb-6 px-2">
            <button
              onClick={promptInstall}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-300 bg-pink-500 text-white font-semibold shadow-md hover:bg-pink-600 hover:shadow-lg transform hover:-translate-y-px"
            >
              <Download className="w-5 h-5 flex-shrink-0" />
              <span className="text-left text-sm">Install App</span>
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-pink-200 pt-6">
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
                // Clear JWT token from localStorage (correct key)
                localStorage.removeItem('token');
                // Force page reload to ensure auth state is cleared
                window.location.href = "/";
              } catch (error) {
                console.error("Logout error:", error);
                // Even if logout call fails, clear the token and redirect
                localStorage.removeItem('token');
                window.location.href = "/";
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
