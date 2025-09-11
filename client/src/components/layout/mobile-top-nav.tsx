import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { HelpCircle, LogOut, LogIn } from "lucide-react";

export default function MobileTopNav() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleLogout = async () => {
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
  };

  return (
    <div className="fixed top-0 right-0 p-4 z-50 lg:hidden">
      <div className="flex items-center space-x-3">
        {/* Help Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/help')}
          className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm"
          data-testid="button-help-mobile"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* Login/Logout Button */}
        {isAuthenticated ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm"
            data-testid="button-logout-mobile"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/login')}
            className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm"
            data-testid="button-login-mobile"
          >
            <LogIn className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}