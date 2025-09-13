import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HelpCircle, LogOut, LogIn } from "lucide-react";

export default function MobileTopNav() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const performLogout = async () => {
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

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false);
    performLogout();
  };

  return (
    <div className="fixed top-0 right-0 p-4 z-[9999] lg:hidden pointer-events-auto">
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
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogoutClick}
              className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm"
              data-testid="button-logout-mobile"
            >
              <LogOut className="w-4 h-4" />
            </Button>

            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
              <AlertDialogContent className="max-w-sm rounded-2xl bg-white border-0 shadow-2xl">
                <AlertDialogHeader className="text-center pb-2">
                  <AlertDialogTitle className="text-xl font-serif text-gray-800">
                    log out?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600 text-sm">
                    You'll need to sign in again to access your toolkit.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col space-y-2 pt-4">
                  <AlertDialogAction
                    onClick={handleLogoutConfirm}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl py-3 font-medium"
                  >
                    Log Out
                  </AlertDialogAction>
                  <AlertDialogCancel className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 font-medium border-0">
                    Stay Logged In
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
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