import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AnimatePresence } from "framer-motion";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import VipTransfer from "@/pages/VipTransfer";
import WagerRaces from "@/pages/WagerRaces";
import NotificationPreferences from "@/pages/notification-preferences";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import { Layout } from "@/components/Layout";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function Router() {
  const [location] = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Switch location={location}>
          <Route path="/">
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
          <Route path="/notification-preferences">
            <PageTransition>
              <NotificationPreferences />
            </PageTransition>
          </Route>
          <Route path="/admin/wager-races">
            <PageTransition>
              <WagerRaceManagement />
            </PageTransition>
          </Route>
          <Route>
            <PageTransition>
              <NotFound />
            </PageTransition>
          </Route>
        </Switch>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;