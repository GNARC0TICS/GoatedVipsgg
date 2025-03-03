import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth, requiresAuth } from "@/lib/auth"; // Import useAuth and requiresAuth
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { PreLoader } from "@/components/PreLoader";

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
  const location = useLocation();

  if (isLoading) {
    return <PreLoader />;
  }

  if (!isAuthenticated && requiresAuth(location.pathname)) {
    return <Navigate to="/" state={{ from: location }} replace />;
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
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/wager-races" element={<RacesPage />} />  {/* Reverted to original path */}
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/login" element={<AuthPage />} /> {/* Added login route */}
                  <Route path="/register" element={<AuthPage />} /> {/* Added register route */}
                  <Route path="/admin/login" element={<AdminLogin />} /> {/* Added admin login route */}
                  <Route path="/help" element={<Help />} /> {/* Added help route */}
                  <Route path="/provably-fair" element={<ProvablyFair />} /> {/* Added provably-fair route */}
                  <Route path="/telegram" element={<Telegram />} /> {/* Added telegram route */}
                  <Route path="/how-it-works" element={<HowItWorks />} /> {/* Added how-it-works route */}
                  <Route path="/goated-token" element={<GoatedToken />} /> {/* Added goated-token route */}
                  <Route path="/faq" element={<FAQ />} /> {/* Added faq route */}
                  <Route path="/vip-program" element={<VipProgram />} /> {/* Added vip-program route */}
                  <Route path="/challenges" element={<ChallengesPage />} /> {/* Reverted to original path */}
                  <Route path="/tips-and-strategies" element={<TipsAndStrategies />} /> {/* Added tips-and-strategies route */}
                  <Route path="/promotions" element={<Promotions />} /> {/* Added promotions route */}
                  <Route path="/support" element={<Support />} /> {/* Added support route */}
                  <Route path="/user/:id" element={<UserProfile />} /> {/* Added user profile route */}
                  <Route path="/bonus-codes" element={<BonusCodes />} /> {/* Added bonus codes route */}
                  <Route path="/notification-preferences" element={<NotificationPreferences />} /> {/* Added notification preferences route */}
                  <Route path="/vip-transfer" element={<VipTransfer />} /> {/* Added vip transfer route */}


                  {/* Protected routes */}
                  <Route 
                    path="/admin/*" 
                    element={
                      <ProtectedRoute>
                        <AdminPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/challenges" 
                    element={
                      <ProtectedRoute>
                        <ChallengesPage />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

//Import necessary components
import AuthPage from "@/pages/auth-page";
import AdminLogin from "@/pages/admin-login";
import Help from "./pages/Help";
import ProvablyFair from "@/pages/ProvablyFair";
import Telegram from "@/pages/Telegram";
import HowItWorks from "@/pages/HowItWorks";
import GoatedToken from "@/pages/GoatedToken";
import FAQ from "@/pages/faq";
import VipProgram from "./pages/VipProgram";
import TipsAndStrategies from "@/pages/tips-and-strategies";
import Promotions from "@/pages/Promotions";
import BonusCodes from "@/pages/bonus-codes";
import NotificationPreferences from "@/pages/notification-preferences";
import VipTransfer from "@/pages/VipTransfer";
import Support from "@/pages/support";
import UserProfile from "@/pages/UserProfile";
import {useAuth} from "@/lib/auth"
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
import Promotions from "@/pages/Promotions";