import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Download } from "lucide-react";

export default function EmailMarketing() {
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

  const handleDownload = () => {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = '/downloads/email-marketing-starter-map.pdf';
    link.download = 'email-marketing-starter-map.pdf';
    link.click();
    
    toast({
      title: "Download Started",
      description: "Your Email Marketing Starter Map is downloading.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <Sidebar />
      
      <div className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-serif font-semibold text-gray-800">
                Email Marketing
              </h1>
              <p className="text-gray-600 text-lg">
                Resources and strategies for effective email marketing
              </p>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                1 Resource
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
          </div>
        </div>

        {/* Email Marketing Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Email Marketing Starter Map Card */}
          <Card className="group cursor-pointer border-pink-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <CardHeader className="bg-gradient-to-br from-pink-400 to-pink-500 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-serif mb-2">
                  Email Marketing Starter Map
                </CardTitle>
                <CardDescription className="text-pink-100">
                  Your visual reference for building a simple and powerful email funnel.
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Main Description */}
                <div className="text-gray-700 leading-relaxed text-sm">
                  <p>
                    This starter map gives you a clear visual overview of your email funnel—from lead magnet to welcome email to your mini sequence.
                  </p>
                </div>

                {/* Download Button */}
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}