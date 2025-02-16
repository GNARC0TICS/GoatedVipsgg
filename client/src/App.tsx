
import React, { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { ErrorBoundary } from "react-error-boundary";
import { AuthProvider } from "@/hooks/use-auth";
import { ErrorFallback } from "@/components/ErrorFallback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ProtectedRoute } from "@/lib/protected-route";
import { PreLoader } from "@/components/PreLoader";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
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

function MainContent() {
  const [isInitialLoad, setIsInitialLoad] = React.useState(() => {
    return !sessionStorage.getItem('hasVisited');
  });

  React.useEffect(() => {
    if (!isInitialLoad) return;

    const timeout = setTimeout(() => {
      sessionStorage.setItem('hasVisited', 'true');
      setIsInitialLoad(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, [isInitialLoad]);

  return (
    <AnimatePresence mode="wait">
      {isInitialLoad ? (
        <PreLoader key="preloader" onLoadComplete={() => setIsInitialLoad(false)} />
      ) : (
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
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Switch>
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

                  <ProtectedRoute path="/bonus-codes" component={BonusCodes} />
                  <ProtectedRoute path="/notification-preferences" component={NotificationPreferences} />
                  <ProtectedRoute path="/vip-transfer" component={VipTransfer} />
                  <ProtectedRoute path="/support" component={Support} />
                  <ProtectedRoute path="/wheel-challenge" component={WheelChallenge} />
                  <ProtectedRoute path="/user/:id" component={UserProfile} />

                  <AdminRoute path="/admin/user-management" component={UserManagement} />
                  <AdminRoute path="/admin/wager-races" component={WagerRaceManagement} />
                  <AdminRoute path="/admin/bonus-codes" component={BonusCodeManagement} />
                  <AdminRoute path="/admin/notifications" component={NotificationManagement} />
                  <AdminRoute path="/admin/support" component={SupportManagement} />

                  <Route component={NotFound} />
                </Switch>
              </ErrorBoundary>
            </Layout>
            <Toaster />
          </TooltipProvider>
        </Suspense>
      )}
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <MainContent key={window.location.pathname} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
