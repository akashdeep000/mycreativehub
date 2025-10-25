import React, { useState, useEffect } from 'react';
import { usePWA } from '@/contexts/PWAContext';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface InstallPromptProps {
  isAuthenticated: boolean;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ isAuthenticated }) => {
  const { isInstallable, promptInstall } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      if (isAuthenticated) {
        const hasBeenDismissed = localStorage.getItem('pwaInstallDismissed') === 'true';
        if (!hasBeenDismissed) {
          const timer = setTimeout(() => setIsVisible(true), 5000);
          return () => clearTimeout(timer);
        }
      } else {
        const lastDismissed = localStorage.getItem('pwaGuestInstallDismissed');
        const oneDay = 24 * 60 * 60 * 1000;
        if (!lastDismissed || (Date.now() - Number(lastDismissed)) > oneDay) {
          const timer = setTimeout(() => setIsVisible(true), 5000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isInstallable, isAuthenticated]);

  const handleInstallClick = () => {
    promptInstall();
    setIsVisible(false);
  };

  const handleDismissClick = () => {
    if (isAuthenticated) {
      localStorage.setItem('pwaInstallDismissed', 'true');
    } else {
      localStorage.setItem('pwaGuestInstallDismissed', Date.now().toString());
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[9999] md:left-auto md:right-4 flex justify-center">
      <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl p-4 w-full max-w-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 flex items-start">
        <div className="flex-1">
          <h4 className="font-serif font-semibold text-gray-800">Get the Full Experience</h4>
          <p className="text-sm text-gray-600 mt-1">
            Install My Creative Hub to your device for faster access and offline capabilities.
          </p>
          <div className="flex space-x-2 mt-4">
            <Button onClick={handleInstallClick} size="sm" className="bg-pink-500 hover:bg-pink-600 text-white">
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
            <Button onClick={handleDismissClick} variant="ghost" size="sm">
              Maybe later
            </Button>
          </div>
        </div>
        <Button onClick={handleDismissClick} variant="ghost" size="icon" className="w-7 h-7 -mt-1 -mr-1">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default InstallPrompt;