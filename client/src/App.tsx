import { lazy, Suspense, useState, useEffect } from "react";
import { Route, Router, Switch, useLocation, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, requiresAuth, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { PreLoader } from "@/components/PreLoader";

// Import all other components at the top to avoid circular dependencies
import AuthPage from "@/pages/auth-page";
import AdminLogin from "@/pages/admin-login";
import Help from "./pages/Help";
import ProvablyFair from "@/pages/ProvablyFair";
import Telegram from "@/pages/Telegram";
import HowItWorks from "@/pages/HowItWorks";
import GoatedToken from "@/pages/GoatedToken";
import FAQ from "@/pages/faq";
import VipProgram from "./pages/VipProgram";
import Promotions from "@/pages/Promotions";
import BonusCodes from "@/pages/bonus-codes";
import NotificationPreferences from "@/pages/notification-preferences";
import VipTransfer from "@/pages/VipTransfer";
import Support from "@/pages/support";
import UserProfile from "@/pages/UserProfile";
import BonusCodeManagement from "@/pages/admin/BonusCodeManagement";
import NotificationManagement from "@/pages/admin/NotificationManagement";
import SupportManagement from "@/pages/admin/SupportManagement";
import UserManagement from "@/pages/admin/UserManagement";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import AdminDashboard from "./pages/admin/Dashboard";
import NotFound from "@/pages/not-found";
import Leaderboard from "@/pages/Leaderboard";
import Challenges from "@/pages/Challenges";
import WagerRaces from "@/pages/WagerRaces";
import TipsAndStrategies from "@/pages/tips-and-strategies";

// Lazy load pages for better performance
const Home = lazy(() => import("@/pages/Home"));
const LeaderboardPage = lazy(() => import("@/pages/Leaderboard")); //Renamed to match original
const RacesPage = lazy(() => import("@/pages/WagerRaces")); //Renamed to match original
const ChallengesPage = lazy(() => import("@/pages/Challenges")); //Renamed to match original
const AdminPage = lazy(() => import("./pages/admin/Dashboard")); // Adjusted import path for AdminDashboard.  This assumes AdminPage will hold all admin routes
const NotFoundPage = lazy(() => import("@/pages/not-found")); //Renamed to match original
const ProfilePage = lazy(() => import("@/pages/UserProfile")); //Renamed to match original
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage")); // Added, not in original, assuming this is new functionality
const TermsPage = lazy(() => import("@/pages/TermsPage")); // Added, not in original, assuming this is new functionality


// Define auth protected route component
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return <PreLoader />;
  }

  if (!isAuthenticated && requiresAuth(location)) {
    setLocation("/");
    return null;
  }

  return children;
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary fallback={<div>Something went wrong</div>}>
            <AnimatePresence mode="wait">
              <Suspense fallback={<PreLoader />}>
                {/* Wouter Router */}
                <Router>
                  <Switch>
                    {/* Public routes */}
                    <Route path="/" component={Home} />
                    <Route path="/leaderboard" component={LeaderboardPage} />
                    <Route path="/wager-races" component={RacesPage} />
                    <Route path="/privacy" component={PrivacyPage} />
                    <Route path="/terms" component={TermsPage} />
                    <Route path="/login" component={AuthPage} />
                    <Route path="/register" component={AuthPage} />
                    <Route path="/admin/login" component={AdminLogin} />
                    <Route path="/help" component={Help} />
                    <Route path="/provably-fair" component={ProvablyFair} />
                    <Route path="/telegram" component={Telegram} />
                    <Route path="/how-it-works" component={HowItWorks} />
                    <Route path="/goated-token" component={GoatedToken} />
                    <Route path="/faq" component={FAQ} />
                    <Route path="/vip-program" component={VipProgram} />
                    <Route path="/challenges" component={ChallengesPage} />
                    <Route path="/tips-and-strategies" component={TipsAndStrategies} />
                    <Route path="/promotions" component={Promotions} />
                    <Route path="/support" component={Support} />
                    <Route path="/user/:id" component={UserProfile} />
                    <Route path="/bonus-codes" component={BonusCodes} />
                    <Route path="/notification-preferences" component={NotificationPreferences} />
                    <Route path="/vip-transfer" component={VipTransfer} />

                    {/* Protected routes */}
                    <Route path="/admin/:rest*">
                      {(params) => (
                        <ProtectedRoute>
                          <AdminPage />
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/profile">
                      {() => (
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      )}
                    </Route>

                    {/* Catch-all route */}
                    <Route path="/:rest*" component={NotFoundPage} />
                  </Switch>
                </Router>
              </Suspense>
            </AnimatePresence>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// End of file