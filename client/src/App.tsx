import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import VipTransfer from "@/pages/VipTransfer";
import WagerRaces from "@/pages/WagerRaces";
import NotificationPreferences from "@/pages/notification-preferences";
import WagerRaceManagement from "@/pages/admin/WagerRaceManagement";
import { Layout } from "@/components/Layout";
import { PageTransition } from "@/components/PageTransition";
import { useQuery } from "@tanstack/react-query";
import type { SelectUser } from "@db/schema";
import { redirect } from "wouter/use-location";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<SelectUser>({
    queryKey: ["/api/user"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user?.isAdmin) {
    redirect("/");
    return null;
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

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;