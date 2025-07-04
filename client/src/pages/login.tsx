import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#fff7e5'}}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#b9e6e0] to-[#8dd3c7] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-2xl drop-shadow-lg">
            <Palette className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Loading your creative workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#fff7e5'}}>
      <div className="container mx-auto px-4 py-16">
        {/* Main Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#b9e6e0] to-[#8dd3c7] rounded-2xl flex items-center justify-center shadow-2xl drop-shadow-lg">
              <Palette className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-serif font-bold text-gray-800 mb-4">
            The Creative Business Toolkit
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Designed for Makers, Dreamers and Doers. This is your space to stay organised, feel inspired and build a business that works for you.
          </p>
        </div>

        {/* Login Section */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Login Card */}
            <Card className="border-pink-100 shadow-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-serif">Ready to get creative?</CardTitle>
                <CardDescription>
                  Access your personal dashboard, templates, and progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => window.location.href = '/api/login'}
                >
                  Enter Your Dashboard
                </Button>
                
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Secure authentication powered by Replit
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features preview */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-4">What you'll get access to:</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-[#b9e6e0] rounded-full"></div>
                  <span>Personal Templates</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-[#f46454] rounded-full"></div>
                  <span>Progress Tracking</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-[#b9e6e0] rounded-full"></div>
                  <span>Creative Tools</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-[#f46454] rounded-full"></div>
                  <span>Business Planning</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}