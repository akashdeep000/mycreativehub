import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BackToDashboard() {
  const [, setLocation] = useLocation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocation('/')}
      className="text-gray-600 hover:text-gray-800"
    >
      {/* Mobile: Just arrow */}
      <ArrowLeft className="w-4 h-4 lg:mr-2" />
      {/* Desktop: Full text */}
      <span className="hidden lg:inline">Back to Main Dashboard</span>
    </Button>
  );
}