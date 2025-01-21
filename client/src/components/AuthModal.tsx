import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@db/schema";
import { useAuth } from "@/lib/auth";

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const { login, register } = useAuth();

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = async (values: any) => {
    try {
      if (mode === "login") {
        await login({ username: values.username, password: values.password });
      } else {
        await register(values);
      }
      setIsOpen(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the auth context
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-heading uppercase">
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
                      <Input {...field} type="email" className="bg-[#2A2B31]" />
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
                    <Input {...field} type="password" className="bg-[#2A2B31]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full">
                {mode === "login" ? "Sign In" : "Create Account"}
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