
import React from 'react';
import { Route, Switch } from 'wouter';
import AdminLoginPage from './pages/admin-login';
import AdminRedirect from './pages/admin';
import AdminDashboard from './pages/admin/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

export function Routes() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/admin-login" component={AdminLoginPage} />
      <Route path="/admin" component={AdminRedirect} />
      
      {/* Protected admin routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Add other routes here */}
    </Switch>
  );
}
