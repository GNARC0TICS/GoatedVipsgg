import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = async (values: AuthFormData) => {
    setIsLoading(true);
    try {
      const formData = {
        username: values.username.trim(),
        password: values.password.trim(),
        email: values.email.trim(),
      };

      const authFn = mode === "login" ? login : register;
      const result = await authFn(formData);

      if (result.ok) {
        toast({
          title: "Success",
          description: mode === "login" 
            ? "Welcome back! You can now access your bonus codes and notifications." 
            : "Account created successfully! You can now access bonus codes and receive notifications.",
        });
        setIsOpen(false);
        form.reset();
      } else {
        toast({
          variant: "destructive",
          title: mode === "login" ? "Login Failed" : "Registration Failed",
          description: result.message || "Please check your credentials and try again",
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="font-heading uppercase bg-[#1A1B21] border-[#2A2B31] hover:bg-[#2A2B31] hover:border-[#D7FF00] transition-all duration-300"
        >
          <span className="text-white">LOGIN</span>
          <span className="text-[#8A8B91]"> / </span>
          <span className="text-[#D7FF00] group-hover:text-[#D7FF00]">REGISTER</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1A1B21] text-white border-[#2A2B31]">
        <DialogHeader>
          <DialogTitle className="text-[#D7FF00]">
            {mode === "login" ? "Welcome Back!" : "Create an Account"}
          </DialogTitle>
          <DialogDescription className="text-[#8A8B91]">
            {mode === "login" 
              ? "Sign in to access bonus codes and manage your notification preferences"
              : "Join us to get exclusive bonus codes and personalized notifications"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-[#2A2B31]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" className="bg-[#2A2B31]" />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className="bg-[#2A2B31]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full font-heading uppercase tracking-tight text-black bg-[#D7FF00] hover:bg-[#b2d000]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    {mode === "login" ? "Signing In..." : "Creating Account..."}
                  </div>
                ) : (
                  mode === "login" ? "Sign In" : "Create Account"
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