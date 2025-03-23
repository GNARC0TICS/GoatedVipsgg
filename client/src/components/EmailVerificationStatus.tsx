import { useState } from "react";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationStatusProps {
  verified: boolean;
  email: string;
}

export function EmailVerificationStatus({ verified, email }: EmailVerificationStatusProps) {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const resendVerificationEmail = async () => {
    try {
      setIsResending(true);
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to resend verification email");
      }

      toast({
        title: "Email Sent",
        description: "Verification email has been resent. Please check your inbox.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend verification email. Please try again later.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-green-500/10 text-green-500 rounded-lg text-sm">
        <CheckCircle className="h-4 w-4" />
        <span>Email verified</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 py-2 px-3 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Email not verified</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 h-8"
        onClick={resendVerificationEmail}
        disabled={isResending}
      >
        <Mail className="h-3.5 w-3.5 mr-1" />
        {isResending ? "Sending..." : "Resend verification email"}
      </Button>
    </div>
  );
}
