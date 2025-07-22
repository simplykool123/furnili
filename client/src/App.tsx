import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authService } from "@/lib/auth";
import { useEffect, useState } from "react";
import LoginSimple from "@/pages/LoginSimple";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import BOQ from "@/pages/BOQ";
import MaterialRequests from "@/pages/MaterialRequests";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Categories from "@/pages/Categories";
import Attendance from "@/pages/Attendance";
import PettyCash from "@/pages/PettyCash";
import TaskManagement from "@/pages/TaskManagement";
import PriceComparison from "@/pages/PriceComparison";
import WhatsAppExport from "@/pages/WhatsAppExport";
import InventoryMovement from "@/pages/InventoryMovement";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Verify token is still valid
          await authService.getCurrentUser();
          setIsAuthenticated(true);
        }
      } catch (error) {
        authService.logout();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginSimple />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        {() => {
          if (authService.isAuthenticated()) {
            window.location.href = "/";
            return null;
          }
          return <LoginSimple />;
        }}
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/products">
        <ProtectedRoute>
          <Products />
        </ProtectedRoute>
      </Route>
      
      <Route path="/categories">
        <ProtectedRoute>
          <Categories />
        </ProtectedRoute>
      </Route>
      
      <Route path="/boq">
        <ProtectedRoute>
          <BOQ />
        </ProtectedRoute>
      </Route>
      
      <Route path="/requests">
        <ProtectedRoute>
          <MaterialRequests />
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory">
        <ProtectedRoute>
          <Products />
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>
      
      <Route path="/attendance">
        <ProtectedRoute>
          <Attendance />
        </ProtectedRoute>
      </Route>
      
      <Route path="/petty-cash">
        <ProtectedRoute>
          <PettyCash />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks">
        <ProtectedRoute>
          <TaskManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/price-comparison">
        <ProtectedRoute>
          <PriceComparison />
        </ProtectedRoute>
      </Route>
      
      <Route path="/whatsapp">
        <ProtectedRoute>
          <WhatsAppExport />
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory-movement">
        <ProtectedRoute>
          <InventoryMovement />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
