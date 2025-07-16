import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import BackToDashboard from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Plus, DollarSign, PieChart, Calculator, Receipt, BarChart3 } from "lucide-react";
import { Link } from "wouter";

export default function FinanceTracker() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const templates = [
    {
      id: 1,
      name: "Your Money Map",
      description: "Complete financial dashboard with budget planning, income tracking, profitability analysis, goals, and savings tracking",
      icon: BarChart3,
      color: "blue",
      lastUsed: "Never",
      isPopular: true,
      route: "/your-money-map"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="mb-8">
          <BackToDashboard />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-gray-800">Financial Management</h1>
              <p className="text-gray-600">Manage your creative business finances</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              1 Dashboard
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Financial
            </Badge>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Link key={template.id} href={template.route}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 bg-gradient-to-br from-${template.color}-400 to-${template.color}-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <template.icon className="w-5 h-5 text-white" />
                    </div>
                    {template.isPopular && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-serif">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Last used: {template.lastUsed}</span>
                    <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Financial Tips */}
        <Card className="mt-8 border-0 shadow-md bg-white">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-4">
              Financial Management Tips
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">💰 Separate Business & Personal</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Keep your business and personal finances completely separate for cleaner bookkeeping.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📊 Track Everything</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Record every business expense, no matter how small. It all adds up at tax time.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🎯 Set Monthly Goals</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Break down your annual revenue goals into monthly targets for better focus.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">💡 Plan for Taxes</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Set aside 25-30% of your income for taxes to avoid surprises later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  );
}
