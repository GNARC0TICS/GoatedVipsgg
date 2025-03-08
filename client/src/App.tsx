import { Suspense } from "react";
import { Route, Router, Switch, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, requiresAuth, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { PreLoader } from "@/components/PreLoader";
import { Layout } from "./frontend/components/layout/Layout";
import { ErrorBoundary } from "./frontend/components/errors/ErrorBoundary";

// Import all other components at the top to avoid circular dependencies
import Home from "@/pages/Home";
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
import { NotFound } from "./frontend/components/errors/NotFound";
import Leaderboard from "@/pages/Leaderboard";
import Challenges from "@/pages/Challenges";
import WagerRaces from "@/pages/WagerRaces";
import TipsAndStrategies from "@/pages/tips-and-strategies";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";


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

// Higher-order component to wrap route components with Layout
const withLayout = (Component: React.ComponentType<any>) => (props: any) => {
  return (
    <Layout>
      <Component {...props} />
    </Layout>
  );
};

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
                    {/* Public routes wrapped with Layout */}
                    <Route path="/" component={withLayout(Home)} />
                    <Route path="/leaderboard" component={withLayout(Leaderboard)} />
                    <Route path="/wager-races" component={withLayout(WagerRaces)} />
                    <Route path="/privacy" component={withLayout(PrivacyPage)} />
                    <Route path="/terms" component={withLayout(TermsPage)} />
                    <Route path="/login" component={withLayout(AuthPage)} />
                    <Route path="/register" component={withLayout(AuthPage)} />
                    <Route path="/admin/login" component={withLayout(AdminLogin)} />
                    <Route path="/help" component={withLayout(Help)} />
                    <Route path="/provably-fair" component={withLayout(ProvablyFair)} />
                    <Route path="/telegram" component={withLayout(Telegram)} />
                    <Route path="/how-it-works" component={withLayout(HowItWorks)} />
                    <Route path="/goated-token" component={withLayout(GoatedToken)} />
                    <Route path="/faq" component={withLayout(FAQ)} />
                    <Route path="/vip-program" component={withLayout(VipProgram)} />
                    <Route path="/challenges" component={withLayout(Challenges)} />
                    <Route path="/tips-and-strategies" component={withLayout(TipsAndStrategies)} />
                    <Route path="/promotions" component={withLayout(Promotions)} />
                    <Route path="/support" component={withLayout(Support)} />
                    <Route path="/user/:id" component={withLayout(UserProfile)} />
                    <Route path="/bonus-codes" component={withLayout(BonusCodes)} />
                    <Route path="/notification-preferences" component={withLayout(NotificationPreferences)} />
                    <Route path="/vip-transfer" component={withLayout(VipTransfer)} />

                    {/* Protected routes wrapped with Layout */}
                    <Route path="/admin/:rest*">
                      {(params) => (
                        <ProtectedRoute>
                          <Layout>
                            <AdminDashboard />
                          </Layout>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/profile">
                      {() => (
                        <ProtectedRoute>
                          <Layout>
                            <UserProfile />
                          </Layout>
                        </ProtectedRoute>
                      )}
                    </Route>

                    {/* Catch-all route wrapped with Layout */}
                    <Route path="/:rest*" component={withLayout(NotFound)} />
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