import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function ResetPassword() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  // Check for reset token in cookie on component mount
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        const response = await fetch('/api/auth/reset-token');
        setIsTokenValid(response.ok);
      } catch (error) {
        console.error('Token check error:', error);
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    checkResetToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: formData.newPassword
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }

      setIsPasswordReset(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now sign in with your new password.",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "Something went wrong. Please try again or request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#fff7e5'}}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#b9e6e0] to-[#8dd3c7] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-2xl drop-shadow-lg">
            <Palette className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Validating reset link...</p>
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
            {isPasswordReset ? "Password Updated!" : "Set New Password"}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            {isPasswordReset 
              ? "Your password has been successfully updated. You can now sign in with your new password."
              : "Enter your new password below to complete the reset process."
            }
          </p>
        </div>

        {/* Reset Password Section */}
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

            {/* Reset Password Card */}
            <Card className="border-pink-100 shadow-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-serif flex items-center justify-center gap-2">
                  {!isTokenValid ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Invalid Reset Link
                    </>
                  ) : isPasswordReset ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Password Updated!
                    </>
                  ) : (
                    "Create New Password"
                  )}
                </CardTitle>
                <CardDescription>
                  {!isTokenValid
                    ? "This reset link is invalid, expired, or has already been used."
                    : isPasswordReset
                    ? "Your password has been successfully updated."
                    : "Choose a strong password for your account."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isTokenValid ? (
                  // Invalid token state
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-800 font-medium mb-2">Reset Link Expired</p>
                      <p className="text-red-700 text-sm">
                        This reset link is no longer valid. Please request a new one.
                      </p>
                    </div>
                    
                    <div className="text-center space-y-3">
                      <Link href="/forgot-password">
                        <Button 
                          className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Request New Reset Link
                        </Button>
                      </Link>
                      
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
                ) : isPasswordReset ? (
                  // Success state
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium mb-2">Success!</p>
                      <p className="text-green-700 text-sm">
                        Your password has been updated. You can now sign in with your new password.
                      </p>
                    </div>
                    
                    <Link href="/login">
                      <Button 
                        className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Sign In Now
                      </Button>
                    </Link>
                  </div>
                ) : (
                  // Password reset form
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="rounded-lg"
                        placeholder="Enter your new password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className="rounded-lg"
                        placeholder="Confirm your new password"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
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