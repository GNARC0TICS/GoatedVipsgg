import React, { Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, requiresAuth } from "@/lib/auth";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { PreLoader } from "@/components/PreLoader";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Redirect } from "@/lib/navigation";

// Import all pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import VipTransfer from "@/pages/VipTransfer";
import ProvablyFair from "@/pages/ProvablyFair";
import WagerRaces from "@/pages/WagerRaces";
import BonusCodes from "@/pages/bonus-codes";
import NotificationPreferences from "@/pages/notification-preferences";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import UserManagement from "@/pages/admin/UserManagement";
import NotificationManagement from "@/pages/admin/NotificationManagement";
import BonusCodeManagement from "@/pages/admin/BonusCodeManagement";
import SupportManagement from "@/pages/admin/SupportManagement";
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
import Challenges from "@/pages/Challenges";
import AdminDashboard from "./pages/admin/Dashboard"; // Added import for AdminDashboard
import AdminLogin from "./pages/admin/Login"; // Admin login page
import ProtectedAdminRoute from "./components/ProtectedAdminRoute"; // Protected admin route component


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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user && requiresAuth(location)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Switch>
            {/* Public Routes */}
            <Route path="/" component={Home} />
            <Route path="/wager-races" component={WagerRaces} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/tips-and-strategies" component={TipsAndStrategies} />
            <Route path="/promotions" component={Promotions} />
            <Route path="/help" component={Help} />
            <Route path="/provably-fair" component={ProvablyFair} />
            <Route path="/telegram" component={Telegram} />
            <Route path="/how-it-works" component={HowItWorks} />
            <Route path="/goated-token" component={GoatedToken} />
            <Route path="/faq" component={FAQ} />
            <Route path="/vip-program" component={VipProgram} />
            <Route path="/challenges" component={Challenges} />

            {/* Protected Routes */}
            <Route path="/bonus-codes">
              <ProtectedRoute>
                <BonusCodes />
              </ProtectedRoute>
            </Route>
            <Route path="/notification-preferences">
              <ProtectedRoute>
                <NotificationPreferences />
              </ProtectedRoute>
            </Route>
            <Route path="/vip-transfer">
              <ProtectedRoute>
                <VipTransfer />
              </ProtectedRoute>
            </Route>
            <Route path="/support">
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            </Route>
            <Route path="/user/:id">
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            </Route>

            {/* Admin Routes */}
            <Route path="/admin/wager-races">
              <ProtectedRoute>
                <WagerRaceManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/admin/users">
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/admin/notifications">
              <ProtectedRoute>
                <NotificationManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/admin/bonus-codes">
              <ProtectedRoute>
                <BonusCodeManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/admin/support">
              <ProtectedRoute>
                <SupportManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/admin">
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            </Route> {/* Added route for AdminDashboard */}

            {/* 404 Route */}
            <Route component={NotFound} />
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
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function AppContent() {
  // Force initial load to true on first visit or when explicitly testing
  const [isInitialLoad, setIsInitialLoad] = React.useState(() => {
    // Always show initial load on first visit
    return !sessionStorage.getItem('hasVisited');
  });

  // Handle session storage separately from loading state
  useEffect(() => {
    if (isInitialLoad) {
      // Only set the hasVisited flag after loading completes
      // This is now handled by the onLoadComplete callback
    }
  }, [isInitialLoad]);

  const handleLoadComplete = () => {
    // Set the session storage flag to prevent showing the loader on subsequent visits
    sessionStorage.setItem('hasVisited', 'true');
    // Delay state update to ensure animation completes
    setTimeout(() => {
      setIsInitialLoad(false);
    }, 600); // Adding delay to ensure animation completes
  };

  return (
    <AnimatePresence mode="wait">
      {isInitialLoad ? (
        <PreLoader onLoadComplete={handleLoadComplete} />
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

export default App;