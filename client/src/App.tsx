import React, { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { Redirect } from "@/lib/navigation";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import VipTransfer from "@/pages/VipTransfer";
import WagerRaces from "@/pages/WagerRaces";
import BonusCodes from "@/pages/bonus-codes";
import NotificationPreferences from "@/pages/notification-preferences";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import { Layout } from "@/components/Layout";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useUser } from "@/hooks/use-user";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 p-6 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h2>
        <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

// Admin route wrapper component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Switch location={location}>
            <Route path="/" key="home">
              <PageTransition>
                <Home />
              </PageTransition>
            </Route>
            <Route path="/vip-transfer">
              <PageTransition>
                <VipTransfer />
              </PageTransition>
            </Route>
            <Route path="/wager-races">
              <PageTransition>
                <WagerRaces />
              </PageTransition>
            </Route>
            <Route path="/bonus-codes">
              <PageTransition>
                <BonusCodes />
              </PageTransition>
            </Route>
            <Route path="/notification-preferences">
              <PageTransition>
                <NotificationPreferences />
              </PageTransition>
            </Route>
            {/* Protected Admin Routes */}
            <Route path="/admin/wager-races">
              <PageTransition>
                <AdminRoute>
                  <WagerRaceManagement />
                </AdminRoute>
              </PageTransition>
            </Route>
            <Route>
              <PageTransition>
                <NotFound />
              </PageTransition>
            </Route>
          </Switch>
        </ErrorBoundary>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<LoadingSpinner />}>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;