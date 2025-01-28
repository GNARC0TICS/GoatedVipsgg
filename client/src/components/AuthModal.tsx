import { useState } from "react";
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
import { insertUserSchema } from "@db/schema";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .refine(async (username) => {
      const userExists = await checkIfUsernameExists(username); // Assuming this function exists
      if (userExists) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Username already exists",
            path: ["username"],
          },
        ]);
      }
      return true;
    }),
  email: z.string().email(),
  password: z.string().min(6),
});

async function checkIfUsernameExists(username: string) {
  //Implement your logic to check if username exists in your database here.
  // This is a placeholder, replace with your actual database query.
  // Example using a hypothetical database client:
  // const user = await db.user.findFirst({ where: { username } });
  // return user !== null;
  return false; // Placeholder return value
}

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const { login, register } = useAuth();

  const form = useForm({
    resolver: zodResolver(
      mode === "register" ? registerSchema : insertUserSchema,
    ),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      setIsLoading(true);
      const isLogin = mode === "login";
      const result = await (isLogin ? login(values) : register(values));

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: isLogin ? "Login Failed" : "Registration Failed",
          description: result.message || "An error occurred. Please try again.",
        });
        return;
      }

      toast({
        title: "Success",
        description: isLogin ? "Welcome back!" : "Account created successfully!",
      });

      setIsOpen(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message || "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
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
                className="w-full font-mona-sans-condensed font-extrabold uppercase tracking-tight text-black bg-[#D7FF00] hover:bg-[#b2d000]"
                disabled={isLoading} // Added loading state to disable button
              >
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm font-mona-sans-condensed font-extrabold uppercase tracking-tight text-white hover:text-[#b2d000]"
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