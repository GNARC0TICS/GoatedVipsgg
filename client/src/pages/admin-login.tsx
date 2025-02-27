import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Loader2, Shield } from "lucide-react";
import { motion } from "framer-motion";

// Admin login schema
const adminFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminFormData = z.infer<typeof adminFormSchema>;

export default function AdminLoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // If user is already logged in and is an admin, redirect to admin dashboard
  React.useEffect(() => {
    if (user && user.isAdmin) {
      navigate("/admin/dashboard");
    } else if (user && !user.isAdmin) {
      // If logged in but not admin, show error and redirect to home
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have administrator privileges",
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: AdminFormData) => {
    setIsSubmitting(true);
    try {
      console.log("Attempting admin login", { username: data.username });
      
      const result = await login({
        username: data.username,
        password: data.password,
      });

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Admin Login Failed",
          description: result.message || "Invalid administrator credentials",
        });
      } else if (result.user && !result.user.isAdmin) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This account doesn't have administrator privileges",
        });
        // Log out the non-admin user
        // No need to await, we'll redirect anyway
        fetch("/api/logout", { method: "POST" });
        setTimeout(() => navigate("/admin"), 1000);
      } else {
        toast({
          title: "Admin Access Granted",
          description: "Welcome to the admin dashboard",
        });
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading uppercase text-2xl text-primary">
                Admin Login
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Shield size={20} />
              </div>
            </div>
            <CardDescription className="font-sans text-muted-foreground">
              Enter your administrator credentials
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
                      <FormLabel className="font-sans">Admin Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter admin username"
                          disabled={isSubmitting}
                          className="border-input focus:ring-1 focus:ring-primary"
                        />
                      </FormControl>
                      <FormMessage className="font-sans text-red-500" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans">Admin Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          placeholder="Enter admin password"
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
                  className="w-full font-heading mt-2 bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Access Admin Panel"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-xs"
            >
              Return to Main Site
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}