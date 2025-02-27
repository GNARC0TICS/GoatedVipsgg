import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
// Import the useUser hook from our custom hooks folder
import { useUser } from "@/hooks/use-user";
import type { SelectUser, InsertUser } from "@db/schema";

// Define RequestResult type to match the one in the user hook
type RequestResult =
  | {
      ok: true;
      user?: SelectUser;
    }
  | {
      ok: false;
      message: string;
      errors?: Record<string, string>;
    };
    
// Define the return type of our useUser hook to avoid TypeScript errors
interface UseUserHook {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (data: Partial<InsertUser>) => Promise<RequestResult>;
  register: (data: InsertUser) => Promise<RequestResult>;
  logout: () => Promise<RequestResult>;
}
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Loader2, ChevronLeft } from "lucide-react";

// Custom schema for form validation
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters"),
  email: z.string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal(""))
});

// Define the type for our user and form data
type UserFormData = {
  username: string;
  password: string;
  email: string;
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login, register, isLoading: userIsLoading } = useUser();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
    mode: "onChange",
  });

  // Reset form when switching between login/register
  useEffect(() => {
    form.reset({
      username: "",
      password: "",
      email: "",
    });
    form.clearErrors();
  }, [isLogin, form]);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      window.location.href = "/dashboard";
    }
  }, [user]);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      // For login, we only need username and password
      const formData = isLogin 
        ? { username: values.username, password: values.password } 
        : values;
        
      const result = await (isLogin ? login(formData) : register(formData));
      
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      } else {
        toast({
          title: isLogin ? "Welcome back!" : "Account created",
          description: isLogin ? "You are now signed in" : "Your account has been created successfully",
        });
        
        // Redirect to dashboard on success
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading uppercase text-2xl">
                {isLogin ? "Sign In" : "Create Account"}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {isLogin ? "👤" : "✨"}
              </div>
            </div>
            <CardDescription className="font-sans text-muted-foreground">
              {isLogin
                ? "Enter your credentials to access your account"
                : "Create a new account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans">Username</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter your username" 
                          disabled={isSubmitting}
                          className="border-input focus:ring-1 focus:ring-primary"
                        />
                      </FormControl>
                      <FormMessage className="font-sans text-red-500" />
                    </FormItem>
                  )}
                />
                {!isLogin && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans">Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            placeholder="Enter your email address" 
                            disabled={isSubmitting}
                            className="border-input focus:ring-1 focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage className="font-sans text-red-500" />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          placeholder={isLogin ? "Enter your password" : "Create a strong password"} 
                          disabled={isSubmitting}
                          className="border-input focus:ring-1 focus:ring-primary"
                        />
                      </FormControl>
                      <FormMessage className="font-sans text-red-500" />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full uppercase font-heading mt-2" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? "Signing In..." : "Creating Account..."}
                    </>
                  ) : (
                    isLogin ? "Sign In" : "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              variant="ghost"
              className="w-full font-sans text-sm"
              onClick={toggleAuthMode}
              disabled={isSubmitting}
            >
              {isLogin
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
