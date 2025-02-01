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
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email().optional(),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = async (values: any) => {
    try {
      if (isLogin) {
        await login({
          username: values.username,
          password: values.password,
        });
      } else {
        await register({
          username: values.username,
          password: values.password,
          email: values.email,
        });
      }
      setLocation("/");
    } catch (error) {
      // Error handling is done in the auth provider
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14151A] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-2 border-[#2A2B31] bg-[#1A1B21]/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#D7FF00]">
              {isLogin ? "Welcome Back!" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-[#8A8B91]">
              {isLogin
                ? "Enter your credentials to access your account"
                : "Sign up to start using our platform"}
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
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field}
                          className="bg-[#1A1B21] border-[#2A2B31]"
                        />
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
                            placeholder="Enter your email"
                            {...field}
                            className="bg-[#1A1B21] border-[#2A2B31]"
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
                          placeholder="Enter your password"
                          {...field}
                          className="bg-[#1A1B21] border-[#2A2B31]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? "Processing..."
                    : isLogin
                    ? "Sign In"
                    : "Create Account"}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="text-sm text-[#D7FF00] hover:text-[#D7FF00]/80"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}