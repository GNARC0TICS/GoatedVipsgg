import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageTransition } from "@/components/PageTransition";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Key, 
  Copy, 
  Clock, 
  RefreshCw,
  ShieldAlert,
  Info,
  CalendarClock
} from "lucide-react";

// Token input validation schema
const tokenSchema = z.object({
  token: z
    .string()
    .min(20, { message: "Token must be at least 20 characters long" })
    .regex(/^[A-Za-z0-9\-_\.]+\.[A-Za-z0-9\-_\.]+\.[A-Za-z0-9\-_\.]+$/, {
      message: "Invalid JWT token format",
    }),
});

// Token metadata interface
interface TokenMetadata {
  exists: boolean;
  created?: string;
  lastUsed?: string;
  isActive?: boolean;
  expiresAt?: string;
  isExpiring?: boolean;
  isExpired?: boolean;
  daysLeft?: number;
  metadata?: Record<string, any>;
}

export default function ApiTokenManagement() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("current");

  // Form setup
  const form = useForm<z.infer<typeof tokenSchema>>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      token: "",
    },
  });

  // Get token metadata on page load
  useEffect(() => {
    fetchTokenMetadata();
  }, []);

  async function fetchTokenMetadata() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/api-tokens/goated");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token metadata: ${response.status}`);
      }
      
      const data = await response.json();
      setTokenMetadata(data);
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      toast({
        title: "Error",
        description: "Failed to fetch token metadata. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof tokenSchema>) {
    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/api-tokens/goated", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: values.token }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save token: ${response.status}`);
      }
      
      // Reset form and refresh token metadata
      form.reset();
      await fetchTokenMetadata();
      
      toast({
        title: "Success",
        description: "API token updated successfully",
        variant: "default",
      });
      
      // Switch back to current tab
      setActiveTab("current");
    } catch (error) {
      console.error("Error saving token:", error);
      toast({
        title: "Error",
        description: "Failed to save token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
      variant: "default",
    });
  }

  if (loading) {
    return (
      <PageTransition isLoading={true}>
        <div className="min-h-screen"></div>
      </PageTransition>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-heading text-white mb-4">
          Admin Access Required
        </h1>
        <p className="text-[#8A8B91] mb-6">
          You need admin privileges to view this page.
        </p>
        <Link href="/">
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin">
              <Button
                variant="ghost"
                className="p-2 hover:bg-transparent hover:text-[#D7FF00]"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span>Back to Admin</span>
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-heading text-white">API Token Management</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Token info */}
          <div className="lg:col-span-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Current Token</TabsTrigger>
                <TabsTrigger value="new">Add New Token</TabsTrigger>
              </TabsList>
              
              {/* Current token tab */}
              <TabsContent value="current">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2 text-[#D7FF00]" /> 
                      Goated.com API Token
                    </CardTitle>
                    <CardDescription>
                      Current status and information about your Goated.com API token
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D7FF00]"></div>
                      </div>
                    ) : (
                      <>
                        {/* Status alerts */}
                        {tokenMetadata ? (
                          <>
                            {!tokenMetadata.exists && (
                              <Alert className="mb-4 border-amber-500 bg-amber-500/10">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <AlertTitle className="text-amber-500">No Token Found</AlertTitle>
                                <AlertDescription>
                                  You haven't set up an API token yet. Please add a token to enable API features.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {tokenMetadata.exists && tokenMetadata.isExpired && (
                              <Alert className="mb-4 border-red-500 bg-red-500/10">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <AlertTitle className="text-red-500">Token Expired</AlertTitle>
                                <AlertDescription>
                                  Your API token has expired. Please generate a new token from Goated.com.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {tokenMetadata.exists && tokenMetadata.isExpiring && !tokenMetadata.isExpired && (
                              <Alert className="mb-4 border-amber-500 bg-amber-500/10">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <AlertTitle className="text-amber-500">Token Expiring Soon</AlertTitle>
                                <AlertDescription>
                                  Your API token will expire in {tokenMetadata.daysLeft} days. Please generate a new token soon.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {tokenMetadata.exists && !tokenMetadata.isExpiring && !tokenMetadata.isExpired && (
                              <Alert className="mb-4 border-green-500 bg-green-500/10">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <AlertTitle className="text-green-500">Token Valid</AlertTitle>
                                <AlertDescription>
                                  Your API token is valid and working correctly.
                                </AlertDescription>
                              </Alert>
                            )}
                          </>
                        ) : (
                          <Alert className="mb-4 border-red-500 bg-red-500/10">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <AlertTitle className="text-red-500">Error</AlertTitle>
                            <AlertDescription>
                              Failed to fetch token information.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Token details */}
                        {tokenMetadata?.exists && (
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Status */}
                              <div className="flex flex-col space-y-1 rounded-lg border border-[#2A2B31] p-3">
                                <div className="text-sm text-[#8A8B91] mb-1">Status</div>
                                <div className="flex items-center space-x-2">
                                  {tokenMetadata.isExpired ? (
                                    <Badge variant="destructive">Expired</Badge>
                                  ) : tokenMetadata.isExpiring ? (
                                    <Badge variant="outline" className="border-amber-500 text-amber-500">
                                      Expiring Soon
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-green-500 text-green-500">
                                      Valid
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Expiration */}
                              <div className="flex flex-col space-y-1 rounded-lg border border-[#2A2B31] p-3">
                                <div className="text-sm text-[#8A8B91] mb-1">Expires</div>
                                <div className="flex items-center">
                                  <CalendarClock className="h-4 w-4 mr-2 text-[#D7FF00]" />
                                  {tokenMetadata.expiresAt ? (
                                    <span>
                                      {new Date(tokenMetadata.expiresAt).toLocaleString()}
                                      {tokenMetadata.daysLeft !== undefined && (
                                        <span className="ml-2 text-sm text-[#8A8B91]">
                                          ({tokenMetadata.daysLeft} days left)
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-[#8A8B91]">Not set</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Created */}
                              <div className="flex flex-col space-y-1 rounded-lg border border-[#2A2B31] p-3">
                                <div className="text-sm text-[#8A8B91] mb-1">Created</div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-[#D7FF00]" />
                                  {tokenMetadata.created ? (
                                    <span>{new Date(tokenMetadata.created).toLocaleString()}</span>
                                  ) : (
                                    <span className="text-[#8A8B91]">Unknown</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Last used */}
                              <div className="flex flex-col space-y-1 rounded-lg border border-[#2A2B31] p-3">
                                <div className="text-sm text-[#8A8B91] mb-1">Last Used</div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-[#D7FF00]" />
                                  {tokenMetadata.lastUsed ? (
                                    <span>{new Date(tokenMetadata.lastUsed).toLocaleString()}</span>
                                  ) : (
                                    <span className="text-[#8A8B91]">Never</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Token information */}
                            <div className="rounded-lg border border-[#2A2B31] p-3">
                              <div className="text-sm text-[#8A8B91] mb-1">Token Details</div>
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="bg-[#1A1B21] p-2 rounded text-sm font-mono flex-1 overflow-hidden text-ellipsis">
                                  {tokenMetadata.metadata?.decodedInfo ? (
                                    <div className="truncate">
                                      UID: {tokenMetadata.metadata.decodedInfo.uid || "N/A"}
                                    </div>
                                  ) : (
                                    <span className="text-[#8A8B91]">No token details available</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions when no token exists */}
                        {!tokenMetadata?.exists && (
                          <div className="flex justify-center mt-4">
                            <Button
                              onClick={() => setActiveTab("new")}
                              className="bg-[#D7FF00] text-black hover:bg-[#C8F000]"
                            >
                              Add API Token
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                  {tokenMetadata?.exists && (
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={fetchTokenMetadata}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button 
                        className="bg-[#D7FF00] text-black hover:bg-[#C8F000]"
                        onClick={() => setActiveTab("new")}
                      >
                        Update Token
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>
              
              {/* New token tab */}
              <TabsContent value="new">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2 text-[#D7FF00]" /> 
                      Add New Goated.com API Token
                    </CardTitle>
                    <CardDescription>
                      Paste your Goated.com API token to enable API features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-6 border-blue-500 bg-blue-500/10">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertTitle className="text-blue-500">How to get your token</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>1. Log in to your Goated.com account</p>
                        <p>2. Go to your account settings or API section</p>
                        <p>3. Generate a new API token</p>
                        <p>4. Copy and paste the token below</p>
                      </AlertDescription>
                    </Alert>
                    
                    <Form {...form}>
                      <form 
                        onSubmit={form.handleSubmit(onSubmit)} 
                        className="space-y-6"
                      >
                        <FormField
                          control={form.control}
                          name="token"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Token</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                  {...field}
                                  type="password"
                                  className="font-mono"
                                />
                              </FormControl>
                              <FormDescription>
                                This JWT token will be stored securely and used to authenticate with the Goated.com API.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-3">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setActiveTab("current")}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            className="bg-[#D7FF00] text-black hover:bg-[#C8F000]"
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                                Saving...
                              </>
                            ) : (
                              "Save Token"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right column - Guides */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="h-5 w-5 mr-2 text-[#D7FF00]" /> 
                  API Token Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-amber-500 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-500">Important</AlertTitle>
                    <AlertDescription>
                      Treat your API token like a password. It provides access to your account data.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Security Guidelines</h3>
                    <ul className="text-sm space-y-1 text-[#8A8B91]">
                      <li>• Never share your token with anyone</li>
                      <li>• Store tokens securely</li>
                      <li>• Rotate tokens periodically</li>
                      <li>• Monitor token usage</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Troubleshooting</h3>
                    <ul className="text-sm space-y-1 text-[#8A8B91]">
                      <li>• If API requests fail, check token validity</li>
                      <li>• Verify the token hasn't expired</li>
                      <li>• Ensure token has correct permissions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-[#D7FF00]" /> 
                  About Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-[#8A8B91]">
                  <p>
                    API tokens expire periodically for security reasons. When a token expires,
                    the platform will use fallback data until a new token is provided.
                  </p>
                  <p>
                    You'll receive email notifications when your token is about to expire,
                    giving you time to generate a new one.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
