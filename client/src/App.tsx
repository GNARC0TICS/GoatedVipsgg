import React, { Suspense, useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "react-error-boundary";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { useUser } from "@/hooks/use-user";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AnimatePresence } from "framer-motion";
import Home from "@/pages/Home";
import VipTransfer from "@/pages/VipTransfer";
import ProvablyFair from "@/pages/ProvablyFair";
import WagerRaces from "@/pages/WagerRaces";
import BonusCodes from "@/pages/bonus-codes";
import NotificationPreferences from "@/pages/notification-preferences";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import UserManagement from "@/pages/admin/UserManagement";
import Leaderboard from "@/pages/Leaderboard";
import { Layout } from "@/components/Layout";
import { PageTransition } from "@/components/PageTransition";
import Help from "./pages/Help";
import UserProfile from "@/pages/UserProfile";
import Telegram from "@/pages/Telegram";
import HowItWorks from "@/pages/HowItWorks";
import GoatedToken from "@/pages/GoatedToken";
import Support from "@/pages/support";
import FAQ from "@/pages/faq";
import VipProgram from "./pages/VipProgram";
import TipsAndStrategies from "@/pages/tips-and-strategies";
import Promotions from "@/pages/Promotions";
import { Redirect } from "@/lib/navigation";
import { PreLoader } from "@/components/PreLoader";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 p-6 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">
          Something went wrong
        </h2>
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
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show auth page if user is not logged in
  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/vip-transfer" component={VipTransfer} />
            <Route path="/wager-races" component={WagerRaces} />
            <Route path="/bonus-codes" component={BonusCodes} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/tips-and-strategies" component={TipsAndStrategies} />
            <Route path="/promotions" component={Promotions} />
            <Route
              path="/notification-preferences"
              component={NotificationPreferences}
            />
            <Route path="/support" component={Support} />
            <Route path="/faq" component={FAQ} />
            <Route path="/admin/wager-races">
              <AdminRoute>
                <WagerRaceManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/users">
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            </Route>
            <Route path="/user/:id">
              {(params) => (
                <PageTransition>
                  <UserProfile userId={params.id} />
                </PageTransition>
              )}
            </Route>
            <Route path="/help" component={Help} />
            <Route path="/provably-fair" component={ProvablyFair} />
            <Route path="/telegram" component={Telegram} />
            <Route path="/how-it-works" component={HowItWorks} />
            <Route path="/goated-token" component={GoatedToken} />
            <Route path="/vip-program" component={VipProgram} />
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
      </AnimatePresence>
    </Layout>
  );
}

function AppContent() {
  const { user } = useUser();
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    return !localStorage.getItem('hasVisited');
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/affiliate/stats"],
    staleTime: 30000,
    enabled: !!user, // Only fetch if user is logged in
  });

  const { data: mvpData, isLoading: mvpLoading } = useQuery({
    queryKey: ["/api/mvp-stats"],
    staleTime: 30000,
    enabled: !!user, // Only fetch if user is logged in
  });

  useEffect(() => {
    if (!isInitialLoad) return;

    if (!leaderboardLoading && !mvpLoading && leaderboardData && mvpData) {
      localStorage.setItem('hasVisited', 'true');
      setIsInitialLoad(false);
    }
  }, [leaderboardLoading, mvpLoading, leaderboardData, mvpData, isInitialLoad]);

  return (
    <AnimatePresence mode="wait">
      {isInitialLoad ? (
        <PreLoader onLoadComplete={() => setIsInitialLoad(false)} />
      ) : (
        <Suspense fallback={<LoadingSpinner />}>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </Suspense>
      )}
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;