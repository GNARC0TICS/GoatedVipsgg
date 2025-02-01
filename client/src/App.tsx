
import React, { Suspense, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AnimatePresence } from "framer-motion";
import { QueryClientProvider } from "@tanstack/react-query";

// Component imports
import { PreLoader } from "@/components/PreLoader";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageTransition } from "@/components/PageTransition";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "react-error-boundary";

// Page imports
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import VipTransfer from "@/pages/VipTransfer";
import ProvablyFair from "@/pages/ProvablyFair";
import WagerRaces from "@/pages/WagerRaces";
import BonusCodes from "@/pages/bonus-codes";
import NotificationPreferences from "@/pages/notification-preferences";
import Leaderboard from "@/pages/Leaderboard";
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

// Admin pages
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import UserManagement from "@/pages/admin/UserManagement";
import NotificationManagement from "@/pages/admin/NotificationManagement";
import BonusCodeManagement from "@/pages/admin/BonusCodeManagement";
import SupportManagement from "@/pages/admin/SupportManagement";

// Utilities and context
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/lib/auth";
import { useUser } from "@/hooks/use-user";
import { Redirect } from "@/lib/navigation";

// Error handling component
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

// Admin route protection component
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

// Main router component
function Router() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Switch>
            {/* Public routes */}
            <Route path="/" component={Home} />
            <Route path="/vip-transfer" component={VipTransfer} />
            <Route path="/wager-races" component={WagerRaces} />
            <Route path="/bonus-codes" component={BonusCodes} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/tips-and-strategies" component={TipsAndStrategies} />
            <Route path="/promotions" component={Promotions} />
            <Route path="/notification-preferences" component={NotificationPreferences} />
            <Route path="/support" component={Support} />
            <Route path="/faq" component={FAQ} />
            <Route path="/help" component={Help} />
            <Route path="/provably-fair" component={ProvablyFair} />
            <Route path="/telegram" component={Telegram} />
            <Route path="/how-it-works" component={HowItWorks} />
            <Route path="/goated-token" component={GoatedToken} />
            <Route path="/vip-program" component={VipProgram} />

            {/* Dynamic routes */}
            <Route path="/user/:id">
              {(params) => (
                <PageTransition>
                  <UserProfile userId={params.id} />
                </PageTransition>
              )}
            </Route>

            {/* Admin routes */}
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
            <Route path="/admin/notifications">
              <AdminRoute>
                <NotificationManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/support">
              <AdminRoute>
                <SupportManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/bonus-codes">
              <AdminRoute>
                <BonusCodeManagement />
              </AdminRoute>
            </Route>

            {/* 404 route */}
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
      </AnimatePresence>
    </Layout>
  );
}

// App content component
function AppContent() {
  // Initial load state management
  const [isInitialLoad, setIsInitialLoad] = useState(() => !sessionStorage.getItem('hasVisited'));

  // Data fetching with React Query
  const { 
    data: leaderboardData, 
    isLoading: leaderboardLoading 
  } = useQuery({
    queryKey: ["/api/affiliate/stats"],
    staleTime: 30000,
  });

  const { 
    data: mvpData, 
    isLoading: mvpLoading 
  } = useQuery({
    queryKey: ["/api/mvp-stats"],
    staleTime: 30000,
  });

  // Handle initial load completion
  useEffect(() => {
    const isDataLoaded = !leaderboardLoading && !mvpLoading && leaderboardData && mvpData;
    
    if (isInitialLoad && isDataLoaded) {
      sessionStorage.setItem('hasVisited', 'true');
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

// Main App component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
