import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { authService } from "@/lib/auth";
import { useEffect, useState } from "react";
import LoginSimple from "@/pages/LoginSimple";
import Layout from "@/components/Layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import BOQ from "@/pages/BOQ";
import MaterialRequests from "@/pages/MaterialRequests";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Categories from "@/pages/Categories";
import Attendance from "@/pages/Attendance";
import PettyCash from "@/pages/PettyCash";
import OCRWizard from "@/pages/OCRWizard";
import TaskManagement from "@/pages/TaskManagement";
import TaskDetail from "@/pages/TaskDetail";
import PriceComparison from "@/pages/PriceComparison";
import ProductComparison from "@/pages/ProductComparison";
import WhatsAppExport from "@/pages/WhatsAppExport";
import InventoryMovement from "@/pages/InventoryMovement";
import DisplaySettings from "@/pages/DisplaySettings";
import Backups from "@/pages/Backups";
import SystemFlowchart from "@/pages/SystemFlowchart";

import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import CreateQuote from "@/pages/CreateQuote";
import EditQuote from "@/pages/EditQuote";
import SalesProducts from "@/pages/SalesProducts";
import Clients from "@/pages/Clients";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Suppliers from "@/pages/Suppliers";
import InventoryOptimization from "@/pages/InventoryOptimization";

import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('authUser');
        if (token && user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
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
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/products">
        <ProtectedRoute>
          <Layout>
            <Products />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/categories">
        <ProtectedRoute>
          <Layout>
            <Categories />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/boq">
        <ProtectedRoute>
          <Layout>
            <BOQ />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/requests">
        <ProtectedRoute>
          <Layout>
            <MaterialRequests />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/material-requests">
        <ProtectedRoute>
          <Layout>
            <MaterialRequests />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory-movement">
        <ProtectedRoute>
          <Layout>
            <InventoryMovement />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory-optimization">
        <ProtectedRoute>
          <InventoryOptimization />
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/attendance">
        <ProtectedRoute>
          <Layout>
            <Attendance />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/petty-cash">
        <ProtectedRoute>
          <Layout>
            <PettyCash />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/ocr-wizard">
        <ProtectedRoute>
          <OCRWizard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects">
        <ProtectedRoute>
          <Layout>
            <Projects />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId">
        <ProtectedRoute>
          <Layout>
            <ProjectDetail />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId/:tab">
        <ProtectedRoute>
          <Layout>
            <ProjectDetail />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId/quotes/create">
        <ProtectedRoute>
          <CreateQuote />
        </ProtectedRoute>
      </Route>
      
      <Route path="/projects/:projectId/quotes/:quoteId/edit">
        <ProtectedRoute>
          <EditQuote />
        </ProtectedRoute>
      </Route>
      
      <Route path="/clients">
        <ProtectedRoute>
          <Clients />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks">
        <ProtectedRoute>
          <TaskManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks/:id">
        <ProtectedRoute>
          <TaskDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/price-comparison">
        <ProtectedRoute>
          <PriceComparison />
        </ProtectedRoute>
      </Route>
      
      <Route path="/product-comparison">
        <ProtectedRoute>
          <ProductComparison />
        </ProtectedRoute>
      </Route>
      
      <Route path="/whatsapp">
        <ProtectedRoute>
          <WhatsAppExport />
        </ProtectedRoute>
      </Route>
      
      <Route path="/display-settings">
        <ProtectedRoute>
          <DisplaySettings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/backups">
        <ProtectedRoute>
          <Backups />
        </ProtectedRoute>
      </Route>

      <Route path="/system-flowchart">
        <ProtectedRoute>
          <SystemFlowchart />
        </ProtectedRoute>
      </Route>

      <Route path="/sales-products">
        <ProtectedRoute>
          <SalesProducts />
        </ProtectedRoute>
      </Route>

      <Route path="/purchase-orders">
        <ProtectedRoute>
          <PurchaseOrders />
        </ProtectedRoute>
      </Route>

      <Route path="/suppliers">
        <ProtectedRoute>
          <Suppliers />
        </ProtectedRoute>
      </Route>


      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
