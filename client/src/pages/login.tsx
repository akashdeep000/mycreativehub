import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Toaster } from "@/components/ui/toaster";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    staySignedIn: false
  });

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Frontend - Starting login process");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          staySignedIn: formData.staySignedIn
        }),
      });

      console.log("Frontend - Login response received:", response.status);
      console.log("Frontend - Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.json();
        console.log("Frontend - Login error:", error);
        throw new Error(error.message || "Login failed");
      }

      const responseData = await response.json();
      console.log("Frontend - Response data received:", responseData);
      
      // Store JWT token in localStorage for additional security
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        console.log("Frontend - JWT token stored in localStorage");
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in. Redirecting to dashboard...",
      });

      // Test session immediately after login
      console.log("Frontend - Testing session immediately after login");
      try {
        const authHeaders: Record<string, string> = {};
        if (responseData.token) {
          authHeaders["Authorization"] = `Bearer ${responseData.token}`;
        }
        
        const authCheck = await fetch("/api/auth/user", {
          method: "GET",
          headers: authHeaders,
          credentials: "include",
        });
        console.log("Frontend - Auth check response:", authCheck.status);
        if (authCheck.ok) {
          console.log("Frontend - Session verified, redirecting");
        } else {
          console.log("Frontend - Session verification failed");
        }
      } catch (error) {
        console.error("Frontend - Session verification error:", error);
      }

      // Give more time for authentication state to stabilize in preview environment
      const isPreviewEnv = window.location.hostname.includes('replit.dev');
      const redirectDelay = isPreviewEnv ? 2000 : 1000; // 2 seconds for preview, 1 second for production
      
      setTimeout(() => {
        // Force a full page reload to ensure proper authentication state
        window.location.replace("/");
      }, redirectDelay);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

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
            My Creative Hub
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
                <CardTitle className="text-xl font-serif">Welcome Back!</CardTitle>
                <CardDescription>
                  Sign in to access your personal dashboard and continue your creative journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="rounded-lg"
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="rounded-lg"
                      placeholder="Enter your password"
                    />
                    <div className="text-right">
                      <Link href="/forgot-password">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-sm text-[#f46454] hover:text-[#e53e3e]"
                          type="button"
                        >
                          Forgot your password?
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="staySignedIn"
                      name="staySignedIn"
                      checked={formData.staySignedIn}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, staySignedIn: checked as boolean})
                      }
                    />
                    <Label htmlFor="staySignedIn" className="text-sm text-gray-600">
                      Stay signed in for 30 days
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isSubmitting ? "Signing In..." : "Enter Your Dashboard"}
                  </Button>
                </form>
                
                <div className="text-center pt-6">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-[#f46454] hover:text-[#e53e3e]"
                      onClick={() => window.location.href = '/signup'}
                    >
                      Sign up here
                    </Button>
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
      <Toaster/>
    </div>
  );
}