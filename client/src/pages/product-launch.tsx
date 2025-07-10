import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { useLocation } from 'wouter';

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
      badge: "New"
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
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
        <Card className="bg-pink-50 border-pink-200">
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
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer aspect-square"
            onClick={() => handleTemplateClick(template)}
          >
            <CardHeader className={`pb-4 bg-gradient-to-br ${template.gradient} text-white relative`}>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <template.icon className="w-6 h-6" />
                </div>
                {template.badge && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {template.badge}
                  </span>
                )}
              </div>
              <div>
                <CardTitle className="text-white text-lg font-semibold leading-tight mb-1">
                  {template.title}
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {template.subtitle}
                </p>
              </div>
              
              <div className="mt-auto">
                <p className="text-xs text-gray-500 mb-3">Last used: Never</p>
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  size="sm"
                >
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}