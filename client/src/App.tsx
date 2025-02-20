import React, { Suspense } from "react";
// Imports necessary components for routing and state management
import { Switch, Route, useLocation } from "wouter";
// Imports for error handling and boundary
import { ErrorBoundary } from "react-error-boundary";
// Imports the authentication provider
import { AuthProvider } from "@/hooks/use-auth";
// Imports a custom error fallback component
import { ErrorFallback } from "@/components/ErrorFallback";
// Imports the tooltip provider
import { TooltipProvider } from "@/components/ui/tooltip";
// Imports for animation
import { AnimatePresence, motion } from "framer-motion";
// Imports the toaster for notifications
import { Toaster } from "@/components/ui/toaster";
// Imports the main layout component
import { Layout } from "@/components/Layout";
// Imports a loading spinner component
import { LoadingSpinner } from "@/components/LoadingSpinner";
// Imports a protected route component
import { ProtectedRoute } from "@/lib/protected-route";
// Imports a preloader component
import { PreLoader } from "@/components/PreLoader";
// Imports the not found component
import NotFound from "@/pages/not-found";
// Imports the home page component
import Home from "@/pages/Home";
// Imports the authentication page component
import AuthPage from "@/pages/auth-page";
import VipTransfer from "@/pages/VipTransfer";
import ProvablyFair from "@/pages/ProvablyFair";
import WagerRaces from "@/pages/WagerRaces";
import BonusCodes from "@/pages/BonusCodes";
import NotificationPreferences from "@/pages/notification-preferences";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import UserManagement from "@/pages/admin/UserManagement";
import NotificationManagement from "@/pages/admin/NotificationManagement";
import BonusCodeManagement from "@/pages/admin/BonusCodeManagement";
import SupportManagement from "@/pages/admin/SupportManagement";
import Leaderboard from "@/pages/Leaderboard";
import Help from "@/pages/Help";
import UserProfile from "@/pages/UserProfile";
import Telegram from "@/pages/Telegram";
import HowItWorks from "@/pages/HowItWorks";
import GoatedToken from "@/pages/GoatedToken";
import Support from "@/pages/support";
import FAQ from "@/pages/faq";
import VipProgram from "@/pages/VipProgram";
import TipsAndStrategies from "@/pages/tips-and-strategies";
import Promotions from "@/pages/Promotions";
import Challenges from "@/pages/Challenges";
import WheelChallenge from "@/pages/WheelChallenge";
import { AdminRoute } from "@/components/AdminRoute";

// MainContent Component
// Handles the core application rendering logic including preloader and route management
function MainContent() {
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (hasVisited) {
      setIsInitialLoad(false);
    } else {
      const timeout = setTimeout(() => {
        sessionStorage.setItem('hasVisited', 'true');
        setIsInitialLoad(false);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AnimatePresence mode="wait">
        {isInitialLoad ? (
          // Show preloader on initial visit
          <PreLoader key="preloader" onLoadComplete={() => setIsInitialLoad(false)} />
        ) : (
          // Main application content with loading state
          <Suspense fallback={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-[#14151A] z-50"
            >
              <LoadingSpinner size="lg" />
            </motion.div>
          }>
            <TooltipProvider>
              <Layout>
                {/* Main routing configuration */}
                <Switch>
                  {/* Public Routes */}
                  <Route path="/" component={Home} />
                  <Route path="/auth" component={AuthPage} />
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
                  <Route path="/wager-races" component={WagerRaces} />
                  <Route path="/bonus-codes" component={BonusCodes} />
                  <Route path="/provably-fair" component={ProvablyFair} />
                  <Route path="/vip-transfer" component={VipTransfer} />
                  <Route path="*" component={NotFound} />

                  {/* Protected Routes - Require Authentication */}
                  <ProtectedRoute path="/bonus-codes" component={BonusCodes} />
                  <ProtectedRoute path="/notification-preferences" component={NotificationPreferences} />
                  <ProtectedRoute path="/vip-transfer" component={VipTransfer} />
                  <ProtectedRoute path="/support" component={Support} />
                  <ProtectedRoute path="/wheel-challenge" component={WheelChallenge} />
                  <ProtectedRoute path="/user/:id" component={UserProfile} />

                  {/* Admin Routes - Require Admin Privileges */}
                  <AdminRoute path="/admin/user-management" component={UserManagement} />
                  <AdminRoute path="/admin/wager-races" component={WagerRaceManagement} />
                  <AdminRoute path="/admin/bonus-codes" component={BonusCodeManagement} />
                  <AdminRoute path="/admin/notifications" component={NotificationManagement} />
                  <AdminRoute path="/admin/support" component={SupportManagement} />

                  {/* Fallback Route */}
                  <Route component={NotFound} />
                </Switch>
              </Layout>
              <Toaster />
            </TooltipProvider>
          </Suspense>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}

// Main App Component
// Provides global providers and error boundaries for the application
export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <TooltipProvider>
          <MainContent />
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}