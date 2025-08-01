import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, TrendingUp, Target, Lightbulb, CheckSquare, Calculator, Clock, BarChart3 } from 'lucide-react';
import { useLocation } from 'wouter';
import BackToDashboard from '@/components/BackToDashboard';
import Sidebar from '@/components/layout/sidebar';

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
      subtitle: "Plan your year with purpose—map your seasonal cycles, launches, and personal flow.",
      icon: Calendar,
      gradient: "from-pink-400 to-rose-400",
      route: "/seasonality-timeline",
      badge: "Popular"
    },
    {
      id: 2,
      title: "Pre-Launch Timeline Planner",
      subtitle: "Map out your 2–4 week pre-launch timeline with drag-and-drop content planning.",
      icon: Clock,
      gradient: "from-purple-400 to-pink-400",
      route: "/pre-launch-timeline-planner",
      badge: "New"
    },
    {
      id: 3,
      title: "Profit Calculator",
      subtitle: "Calculate costs, profits, and margins with color-coded margin strength indicators.",
      icon: Calculator,
      gradient: "from-green-400 to-teal-400",
      route: "/profit-calculator",
      badge: "New"
    },
    {
      id: 4,
      title: "Launch Growth Plan",
      subtitle: "Capture key insights and plan improvements for your next launch with interactive planning.",
      icon: BarChart3,
      gradient: "from-blue-400 to-indigo-400",
      route: "/launch-growth-plan",
      badge: "New"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
      <div className="mb-8">
        <BackToDashboard />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Product Launch System</h1>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Strategic tools to plan, execute, and optimize your product launches throughout the year.
        </p>
      </div>

      {/* Tips Panel */}
      <div className="mb-8">
        <Card className="border-0 shadow-md bg-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
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

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer aspect-square border-0 shadow-md bg-white"
            onClick={() => handleTemplateClick(template)}
          >
            <CardContent className="p-6 flex flex-col h-full relative">
              {/* Icon and Badge */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${template.gradient} rounded-xl flex items-center justify-center`}>
                  <template.icon className="w-5 h-5 text-white" />
                </div>
                {template.badge && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {template.badge}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {template.subtitle}
                </p>
              </div>
              
              {/* Footer */}
              <div className="mt-auto">
                <div className="flex items-center justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateClick(template);
                    }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
}