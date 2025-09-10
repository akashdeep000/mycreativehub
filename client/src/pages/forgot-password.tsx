import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Step management - strict three-step flow
  const [currentStep, setCurrentStep] = useState<'email' | 'code' | 'password'>('email');
  
  // Step 1: Email
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [email, setEmail] = useState("");
  
  // Step 2: Code verification only
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [code, setCode] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  
  // Step 3: Password reset (after code verification)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSessionId, setResetSessionId] = useState("");

  // Step 1: Submit email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmail(true);

    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      // Always proceed to step 2 regardless of response to prevent email enumeration
      setCurrentStep('code');
      toast({
        title: "Code sent",
        description: "If that email is registered, we've sent a 6-digit code. Check your inbox or junk.",
      });
      
      // Start resend countdown
      startResendCountdown();
    } catch (error) {
      // Still proceed to step 2 to prevent email enumeration
      setCurrentStep('code');
      toast({
        title: "Code sent", 
        description: "If that email is registered, we've sent a 6-digit code. Check your inbox or junk.",
      });
      
      startResendCountdown();
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Step 2: Submit code verification only
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCode(true);

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          code: code.trim()
        }),
      });

      const result = await response.json();

      if (result.ok) {
        // Code verified - move to password step
        setResetSessionId(result.resetSessionId);
        setCurrentStep('password');
        toast({
          title: "Code verified",
          description: "Please enter your new password.",
        });
      } else {
        toast({
          title: "Verification failed",
          description: result.message || "Invalid or expired code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Step 3: Submit new password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const response = await fetch("/api/auth/complete-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resetSessionId,
          newPassword 
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "Password updated",
          description: "Your password has been successfully reset. You can now log in.",
        });
        setLocation('/login');
      } else {
        toast({
          title: "Reset failed",
          description: result.message || "Session expired. Please start over.",
          variant: "destructive",
        });
        // Reset to email step if session is invalid
        setCurrentStep('email');
        setCode("");
        setNewPassword("");
        setConfirmPassword("");
        setResetSessionId("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Resend countdown timer
  const startResendCountdown = () => {
    setCanResend(false);
    setResendCountdown(30);
    const timer = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Resend code
  const handleResend = async () => {
    if (!canResend) return;
    
    setIsSubmittingEmail(true);
    try {
      await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      
      toast({
        title: "Code resent",
        description: "A new code has been sent to your email.",
      });
      
      startResendCountdown();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEmail(false);
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
            {currentStep === 'email' 
              ? "Enter your email address and we'll send you a 6-digit code to reset your password."
              : currentStep === 'code'
              ? "Enter the 6-digit code from your email to verify your identity."
              : "Enter your new password to complete the reset."
            }
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

            {/* Password Reset Card */}
            <Card className="border-pink-100 shadow-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-serif">
                  {currentStep === 'email' 
                    ? "Forgot Password?" 
                    : currentStep === 'code'
                    ? "Enter Reset Code"
                    : "Set New Password"
                  }
                </CardTitle>
                <CardDescription>
                  {currentStep === 'email' 
                    ? "No worries! Enter your email and we'll send you a 6-digit code."
                    : currentStep === 'code'
                    ? "Check your email for the 6-digit code and enter it below."
                    : "Your code has been verified. Please enter your new password."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentStep === 'email' ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                        data-testid="input-email"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmittingEmail}
                      className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      data-testid="button-send-code"
                    >
                      {isSubmittingEmail ? "Sending Code..." : "Send Code"}
                    </Button>
                  </form>
                ) : currentStep === 'code' ? (
                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">6-Digit Code</Label>
                      <Input
                        id="code"
                        name="code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        required
                        className="rounded-lg text-center text-2xl tracking-widest"
                        placeholder="000000"
                        data-testid="input-code"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmittingCode}
                      className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      data-testid="button-verify-code"
                    >
                      {isSubmittingCode ? "Verifying Code..." : "Verify Code"}
                    </Button>

                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        onClick={handleResend}
                        disabled={!canResend || isSubmittingEmail}
                        variant="outline"
                        className="flex-1"
                        data-testid="button-resend-code"
                      >
                        {!canResend ? `Resend in ${resendCountdown}s` : "Resend Code"}
                      </Button>
                      
                      <Button 
                        type="button"
                        onClick={() => {
                          setCurrentStep('email');
                          setCode("");
                        }}
                        variant="ghost"
                        className="flex-1"
                        data-testid="button-back-to-email"
                      >
                        Change Email
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="rounded-lg"
                        placeholder="Enter new password"
                        data-testid="input-new-password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="rounded-lg"
                        placeholder="Confirm new password"
                        data-testid="input-confirm-password"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={isSubmittingPassword}
                      className="w-full bg-gradient-to-r from-[#f46454] to-[#e53e3e] hover:from-[#e53e3e] hover:to-[#d53534] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                      data-testid="button-reset-password"
                    >
                      {isSubmittingPassword ? "Resetting Password..." : "Reset Password"}
                    </Button>

                    <Button 
                      type="button"
                      onClick={() => {
                        setCurrentStep('email');
                        setCode("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setResetSessionId("");
                      }}
                      variant="ghost"
                      className="w-full"
                      data-testid="button-start-over"
                    >
                      Start Over
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