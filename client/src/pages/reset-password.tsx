import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ResetPassword() {
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Handle email submission (step 1)
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset code");
      }

      toast({
        title: "Reset code sent",
        description: "If that email is registered, we've sent a 6-digit reset code. Check your email.",
      });
      
      setStep('code');
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle code and password submission (step 2)
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code.trim()) {
      toast({
        title: "Code required",
        description: "Please enter your 6-digit reset code.",
        variant: "destructive",
      });
      return;
    }

    if (formData.code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Reset code must be exactly 6 digits.",
        variant: "destructive",
      });
      return;
    }

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
      const response = await fetch("/api/auth/confirm-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          code: formData.code.trim(),
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }

      setStep('success');
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now sign in with your new password.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Invalid code or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (!formData.email.trim()) return;

    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resend code");
      }

      toast({
        title: "Code resent",
        description: "We've sent a new 6-digit reset code to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Resend failed",
        description: error.message || "Failed to resend code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For code input, only allow numbers and limit to 6 digits
    if (name === 'code') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 6) {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
      }
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBackToEmail = () => {
    setStep('email');
    setFormData(prev => ({ ...prev, code: "", newPassword: "", confirmPassword: "" }));
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
            {step === 'success' ? "Password Updated!" : step === 'code' ? "Enter Reset Code" : "Reset Your Password"}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            {step === 'success' 
              ? "Your password has been successfully updated. You can now sign in with your new password."
              : step === 'code'
              ? "Enter the 6-digit code we sent to your email along with your new password."
              : "Enter your email address and we'll send you a 6-digit reset code."
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
                  {step === 'success' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Password Updated!
                    </>
                  ) : step === 'code' ? (
                    "Reset Code & New Password"
                  ) : (
                    "Request Reset Code"
                  )}
                </CardTitle>
                <CardDescription>
                  {step === 'success'
                    ? "Your password has been successfully updated."
                    : step === 'code'
                    ? "Enter the 6-digit code from your email and choose a new password."
                    : "We'll send a 6-digit code to your email address."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {step === 'success' ? (
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
                ) : step === 'code' ? (
                  // Code and password form
                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="rounded-lg bg-gray-50"
                        disabled
                      />
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleBackToEmail}
                        className="p-0 h-auto text-sm text-[#f46454] hover:text-[#e53e3e]"
                      >
                        Change email address
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code">Reset Code</Label>
                      <Input
                        id="code"
                        name="code"
                        type="text"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        maxLength={6}
                        className="rounded-lg text-center text-xl font-mono tracking-widest"
                        placeholder="000000"
                        autoComplete="off"
                      />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Check your email for the code</span>
                        <Button
                          type="button"
                          variant="link"
                          onClick={handleResendCode}
                          disabled={isResending}
                          className="p-0 h-auto text-[#f46454] hover:text-[#e53e3e]"
                        >
                          {isResending ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Resend code"
                          )}
                        </Button>
                      </div>
                    </div>

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
                ) : (
                  // Email form
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="rounded-lg"
                        placeholder="Enter your email address"
                        autoComplete="email"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? "Sending Code..." : "Send Reset Code"}
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