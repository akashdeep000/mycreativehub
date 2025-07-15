import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function BackToDashboard() {
  const [, setLocation] = useLocation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocation('/')}
      className="text-gray-600 hover:text-gray-800 mb-2"
    >
      <Home className="w-4 h-4 mr-2" />
      Back to Main Dashboard
    </Button>
  );
}