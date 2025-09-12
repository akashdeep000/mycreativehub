import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { navigationItems } from "@/lib/navigation";
import { 
  Settings, 
  LogOut,
  Palette,
  HelpCircle
} from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  return (
    <div className="fixed top-0 left-0 lg:w-64 bg-white lg:shadow-[4px_0_20px_-4px_rgba(0,0,0,0.1)] h-full overflow-y-auto hidden lg:block z-40">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-300 to-purple-300 rounded-xl flex items-center justify-center">
            <Palette className="text-white text-lg" />
          </div>
          <h1 className="text-xl font-serif font-semibold text-gray-800">My Creative Hub</h1>
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
