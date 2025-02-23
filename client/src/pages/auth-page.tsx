import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores and hyphens"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
});

const registerSchema = loginSchema.extend({
  email: z.string()
    .email("Invalid email address")
    .max(100, "Email cannot exceed 100 characters")
    .refine(email => email.toLowerCase() === email, "Email must be lowercase"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [_, navigate] = useLocation();
  const { user, login, register } = useUser();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const form = useForm<RegisterData>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = async (data: RegisterData) => {
    try {
      if (isLogin) {
        const result = await login(data);
        if (result.ok) {
          navigate("/");
        } else {
          throw new Error(result.message);
        }
      } else {
        // Check if username is already taken before submitting
        const usernameCheck = await fetch(`/api/check-username?username=${encodeURIComponent(data.username)}`);
        if (!usernameCheck.ok) {
          form.setError("username", { message: "Username is already taken" });
          return;
        }

        // Check if email is already registered
        if (data.email) {
          const emailCheck = await fetch(`/api/check-email?email=${encodeURIComponent(data.email)}`);
          if (!emailCheck.ok) {
            form.setError("email", { message: "Email is already registered" });
            return;
          }
        }

        const result = await register(data);
        if (result.ok) {
          navigate("/");
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      const errorMessage = error?.message || "Authentication failed";

      // Handle specific error cases
      if (errorMessage.includes("rate limit")) {
        toast({
          title: "Too many attempts",
          description: "Please try again later",
          variant: "destructive",
        });
      } else if (errorMessage.includes("credentials")) {
        toast({
          title: "Authentication failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isLogin ? "Welcome back!" : "Create an account"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Enter your credentials to access your account"
                : "Fill in your details to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete={isLogin ? "username" : "new-username"} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isLogin && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            autoComplete="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field}
                          autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLogin ? (
                    "Sign In"
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
            </Form>

            {isLogin && (
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-px w-10 bg-muted-foreground"></div>
                  <span className="text-sm text-muted-foreground">Or</span>
                  <div className="h-px w-10 bg-muted-foreground"></div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => (window.location.href = '/api/auth/telegram')}
                >
                  <img src="/telegram-logo.svg" alt="Telegram Logo" className="h-5 mr-2" />
                  Login with Telegram
                </Button>
              </div>
            )}

            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <h1 className="text-4xl font-bold mb-4">
            Advanced Affiliate Marketing Platform
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your races, engage with users, and manage your affiliate marketing
            campaigns with our sophisticated multi-server platform.
          </p>
        </div>
      </div>
    </div>
  );
}