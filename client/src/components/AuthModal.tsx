import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema } from "@db/schema";
import type { InsertUser } from "@db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type AuthMode = "login" | "register";

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const authMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const endpoint = isAdminLogin ? `admin/${mode}` : mode;
      const response = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setIsOpen(false);
      toast({
        title: `${mode === "login" ? "Login" : "Registration"} successful`,
        description: `Welcome ${form.getValues("username")}!`,
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: `${mode === "login" ? "Login" : "Registration"} failed`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    authMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-body">
          Login / Register
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1A1B21] text-white border-[#2A2B31]">
        <DialogHeader>
          <DialogTitle className="text-[#D7FF00]">
            {mode === "login" ? "Welcome Back!" : "Create an Account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Sign in to access your account"
              : "Join us to start earning rewards"}
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
            {mode === "register" && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="bg-[#2A2B31]" />
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
                    <Input type="password" {...field} className="bg-[#2A2B31]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === "login" && (
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="adminLogin"
                  checked={isAdminLogin}
                  onChange={(e) => setIsAdminLogin(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="adminLogin" className="text-sm">Admin Login</label>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full bg-[#D7FF00] text-black hover:bg-[#D7FF00]/90"
                disabled={authMutation.isPending}
              >
                {authMutation.isPending
                  ? "Processing..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm"
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