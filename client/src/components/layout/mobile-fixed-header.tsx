import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePWA } from "@/contexts/PWAContext";
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
import { HelpCircle, LogOut, LogIn, Download } from "lucide-react";

export default function MobileFixedHeader() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isInstallable, promptInstall } = usePWA();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Hide header on scroll
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when at top (within 10px), hide when scrolling down
      if (currentScrollY <= 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide header
        setIsHeaderVisible(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Only render on mobile screens (≤ 768px)
  const headerContent = (
    <div className="md:hidden"> 
      {/* Fixed header container using portal with hide/show animation */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100 pointer-events-auto transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex justify-between items-center px-4 py-1.5">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/icons/icon-trans-192x192.png" alt="My Creative Hub Logo" className="size-12" />
          </div>
          <div className="flex items-center space-x-3">
            {/* Install Button */}
            {isInstallable && (
              <Button
                size="sm"
                onClick={promptInstall}
                className="bg-pink-500 text-white font-semibold shadow-md hover:bg-pink-600 hover:shadow-lg transform hover:-translate-y-px transition-all duration-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>
            )}
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
      </div>
    </div>
  );

  // Use portal to render at document.body to avoid z-index conflicts
  return typeof document !== 'undefined' 
    ? createPortal(headerContent, document.body)
    : null;
}