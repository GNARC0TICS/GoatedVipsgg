import React from "react";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import type { SelectUser } from "@db/schema";

// Extend the User type with additional properties we need
interface ExtendedUser extends SelectUser {
  email?: string;
  emailVerified?: boolean;
  telegramVerified?: boolean;
}
import { EmailVerificationStatus } from "@/components/EmailVerificationStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function Profile() {
  const { user: rawUser, loading, error } = useUser();
  // Type assertion to use our extended user type
  const user = rawUser as ExtendedUser;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view your profile.</p>
            <Button className="w-full" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Username</h3>
                <p className="text-lg font-medium">{user.username}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                <p className="text-lg font-medium">{user.email || "No email set"}</p>
              </div>
            </div>

            {user.email && (
              <div className="pt-2">
                <EmailVerificationStatus 
                  verified={Boolean(user.emailVerified)} 
                  email={user.email || ''}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Authentication Methods</h3>
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    Username/Password
                  </div>
                  {user.telegramVerified && (
                    <div className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-sm">
                      Telegram
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "/user-sessions"}>
                Manage Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
