import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, TrendingUp, Target, Lightbulb, CheckSquare, Calculator, Clock, BarChart3, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';

export default function ProductLaunch() {
  const [, setLocation] = useLocation();

  const handleTemplateClick = (template: any) => {
    if (template.route) {
      setLocation(template.route);
    }
  };

  const templates = [
    {
      id: 1,
      title: "Seasonality Timeline",
      subtitle: "Plan your year with purpose! Map your seasonal cycles, launches, and holidays.",
      icon: Calendar,
      gradient: "from-pink-400 to-rose-400",
      route: "/seasonality-timeline"
    },
    {
      id: 2,
      title: "Launch Timeline Planner",
      subtitle: "Map out your launch and pre-launch weeks within this timeline",
      icon: Clock,
      gradient: "from-purple-400 to-pink-400",
      route: "/pre-launch-timeline-planner"
    },
    {
      id: 3,
      title: "Profit Calculator",
      subtitle: "Calculate costs, profits, and margins with colour-coded margin strength indicators.",
      icon: Calculator,
      gradient: "from-green-400 to-teal-400",
      route: "/profit-calculator"
    },
    {
      id: 4,
      title: "Launch Reflection",
      subtitle: "Capture key insights and plan improvements for your next launch with interactive planning.",
      icon: TrendingUp,
      gradient: "from-blue-400 to-indigo-400",
      route: "/launch-growth-plan"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
      <div className="mb-8">
        <div className="mb-6">
          {/* Mobile Navigation - Single Back Arrow */}
          <div className="flex items-center gap-3 lg:hidden mt-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Desktop Navigation - Full Button */}
          <div className="hidden lg:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main Dashboard
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-serif font-semibold text-gray-800">Product Launch System</h1>
        </div>
        <p className="text-gray-600 leading-relaxed">Strategic tools to plan, execute, and optimise your product launches throughout the year.</p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white"
            onClick={() => handleTemplateClick(template)}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${template.gradient} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <template.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <CardTitle className="text-lg font-serif">{template.title}</CardTitle>
              <CardDescription>{template.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips Panel */}
      <div className="mb-8">
        <Card className="border-0 shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quick Tips</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Start with your natural energy cycles and seasonal trends</li>
                  <li>• Plan launches around key holidays and industry events</li>
                  <li>• Build in buffer time for unexpected opportunities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}