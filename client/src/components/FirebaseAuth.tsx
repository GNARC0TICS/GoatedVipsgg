import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FcGoogle } from 'react-icons/fc';
import { 
  signInWithGoogle, 
  loginWithEmailAndPassword, 
  registerWithEmailAndPassword,
  getCurrentUser,
  onAuthChange
} from '@/lib/firebase';
import { useQueryClient } from '@tanstack/react-query';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function FirebaseAuth() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Check authentication state on component mount
    const user = getCurrentUser();
    setIsAuthenticated(!!user);

    // Set up auth state listener
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        // Invalidate relevant queries when auth state changes
        queryClient.invalidateQueries({queryKey: ['user']});
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  const handleLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await loginWithEmailAndPassword(data.email, data.password);
      if (result.success) {
        toast({
          title: 'Login Successful',
          description: 'You have been logged in successfully.',
        });
        // Invalidate relevant queries
        queryClient.invalidateQueries({queryKey: ['user']});
      } else {
        toast({
          title: 'Login Failed',
          description: 'Please check your credentials and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const result = await registerWithEmailAndPassword(data.email, data.password);
      if (result.success) {
        toast({
          title: 'Registration Successful',
          description: 'Your account has been created. You are now logged in.',
        });
        // Invalidate relevant queries
        queryClient.invalidateQueries({queryKey: ['user']});
        setActiveTab('login');
      } else {
        toast({
          title: 'Registration Failed',
          description: 'There was an issue creating your account. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        toast({
          title: 'Login Successful',
          description: 'You have been logged in with Google successfully.',
        });
        // Invalidate relevant queries
        queryClient.invalidateQueries({queryKey: ['user']});
      } else {
        toast({
          title: 'Login Failed',
          description: 'Failed to log in with Google. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>You are currently logged in.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => {
              // Handle logout via API
              fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
              }).then(() => {
                // Even if the API call fails, we'll continue with the front-end logout
                queryClient.invalidateQueries();
                window.location.href = '/';
              });
            }}
          >
            Log Out
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
        <CardDescription>Login or create an account to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="your@email.com"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email?.message && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.email?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password?.message && (
                    <p className="text-sm text-red-500">
                      {loginForm.formState.errors.password?.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <FcGoogle className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="your@email.com"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email?.message && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.email?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password?.message && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.password?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...registerForm.register('confirmPassword')}
                  />
                  {registerForm.formState.errors.confirmPassword?.message && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.confirmPassword?.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <FcGoogle className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}