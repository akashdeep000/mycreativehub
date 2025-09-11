import { useLayoutEffect } from 'react';
import { useLocation } from 'wouter';

export default function ScrollToTop() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    // Disable browser's default scroll restoration
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    // Scroll to top on every route change
    window.scrollTo(0, 0);
  }, [location]);

  useLayoutEffect(() => {
    // Additional defensive scroll reset for browser back/forward
    const handlePopState = () => {
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return null; // This component doesn't render anything
}