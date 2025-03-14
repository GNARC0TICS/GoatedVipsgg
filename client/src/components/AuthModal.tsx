
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FcGoogle } from "react-icons/fc";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
};

// Schemas for form validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const { login, registerWithEmail, loginWithGoogle } = useAuth();
  const { toast } = useToast();

  // Form for login/register
  const form = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(mode === "register" ? { confirmPassword: "" } : {}),
    },
  });

  // Handle form submission
  const onSubmit = async (values: LoginFormValues | RegisterFormValues) => {
    setIsLoading(true);
    try {
      if (mode === "login") {
        const { email, password } = values as LoginFormValues;
        const result = await login({ email, password });
        if (result.ok) {
          toast({
            title: "Success",
            description: "You've been successfully logged in",
          });
          onClose();
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.message || "Invalid credentials",
          });
        }
      } else {
        const { email, password } = values as RegisterFormValues;
        const result = await registerWithEmail({ email, password });
        if (result.ok) {
          toast({
            title: "Success",
            description: "Account created successfully",
          });
          onClose();
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.message || "Registration failed",
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.ok) {
        toast({
          title: "Success",
          description: "You've been successfully logged in with Google",
        });
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Google sign-in failed",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-background border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight font-heading text-center text-white">
            {mode === "login" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-center text-neutral-400">
            {mode === "login"
              ? "Sign in to access your account"
              : "Create a new account to get started"}
          </DialogDescription>
        </DialogHeader>

        <Button
          variant="outline"
          className="w-full flex gap-2 items-center justify-center bg-white text-black hover:bg-neutral-100"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <FcGoogle className="h-5 w-5" />
          <span>Continue with Google</span>
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-neutral-400">OR</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your email"
                      type="email"
                      autoComplete="email"
                      className="bg-neutral-900 border-neutral-700"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your password"
                      type="password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="bg-neutral-900 border-neutral-700"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "register" && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Confirm your password"
                        type="password"
                        autoComplete="new-password"
                        className="bg-neutral-900 border-neutral-700"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-black font-heading uppercase tracking-tight"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </span>
                    <span>{mode === "login" ? "Signing In..." : "Creating Account..."}</span>
                  </>
                ) : (
                  <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm font-heading uppercase tracking-tight text-white hover:text-[#b2d000]"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  form.reset();
                }}
              >
                {mode === "login"
                  ? "Don't have an account? Register"
                  : "Already have an account? Login"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
