import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Simplified schema for admin login - only requires email/username and password
const adminLoginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: AdminLoginFormData) => {
    setIsLoading(true);
    try {
      // Send the identifier field directly to match our backend changes
      const formData = {
        identifier: values.identifier.trim(),
        password: values.password.trim(),
      };

      // Call the admin login endpoint
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.token) {
        // Store the token in localStorage for subsequent API requests
        localStorage.setItem('adminToken', result.token);
        
        toast({
          title: "Login Successful",
          description: "Welcome to the admin dashboard",
        });
        // Redirect to admin dashboard
        setLocation("/admin");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.error || "Invalid credentials",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-[#2A2B31] bg-[#1A1B21]">
          <CardHeader>
            <CardTitle className="font-heading uppercase text-white">
              Admin Login
            </CardTitle>
            <CardDescription className="font-sans text-[#8A8B91]">
              Enter your credentials to access the admin dashboard
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
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-white">Email or Username</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-[#2A2B31] border-[#3A3B41]" />
                      </FormControl>
                      <FormMessage className="font-sans" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-white">Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} className="bg-[#2A2B31] border-[#3A3B41]" />
                      </FormControl>
                      <FormMessage className="font-sans" />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full font-heading uppercase tracking-tight text-black bg-[#D7FF00] hover:bg-[#b2d000]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Signing In...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="text-[#8A8B91] hover:text-[#D7FF00]"
                onClick={() => setLocation("/")}
              >
                Return to Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}