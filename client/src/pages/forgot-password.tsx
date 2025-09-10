import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      // Always show success message regardless of response
      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "If that email is registered, we've sent a reset link.",
      });
    } catch (error) {
      // Still show success message to prevent email enumeration
      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "If that email is registered, we've sent a reset link.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Reset Your Password
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Forgot Password Section */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {/* Back to Login Link */}
            <div className="mb-6">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="text-gray-600 hover:text-gray-800 p-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>

            {/* Forgot Password Card */}
            <Card className="border-pink-100 shadow-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-serif">
                  {isSubmitted ? "Check Your Email" : "Forgot Password?"}
                </CardTitle>
                <CardDescription>
                  {isSubmitted 
                    ? "If that email is registered, we've sent a reset link to your inbox."
                    : "No worries! Enter your email and we'll send you reset instructions."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="rounded-lg"
                        placeholder="Enter your email address"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium mb-2">Email Sent!</p>
                      <p className="text-green-700 text-sm">
                        If that email is registered, we've sent a reset link.
                        Check your inbox and follow the instructions to reset your password.
                      </p>
                    </div>
                    
                    <div className="text-center space-y-3">
                      <Button 
                        onClick={() => {
                          setIsSubmitted(false);
                          setEmail("");
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Send Another Reset Link
                      </Button>
                      
                      <Link href="/login">
                        <Button 
                          variant="ghost" 
                          className="w-full text-[#f46454] hover:text-[#e53e3e]"
                        >
                          Back to Login
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Text */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Link href="/login">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[#f46454] hover:text-[#e53e3e]"
                  >
                    Sign in here
                  </Button>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}