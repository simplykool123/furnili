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
import CRM from "@/pages/CRM";
import Leads from "@/pages/CRM/Leads";
import Customers from "@/pages/CRM/Customers";
import Quotations from "@/pages/CRM/Quotations";
import FollowUps from "@/pages/CRM/FollowUps";
import SiteVisits from "@/pages/CRM/SiteVisits";
import CRMReports from "@/pages/CRM/CRMReports";
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
      
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/products">
        <ProtectedRoute>
          <Layout 
            title="Product Management" 
            subtitle="Manage your inventory products and stock levels"
            showAddButton={true}
            onAddClick={() => {
              // This will be handled by the Products component
              const event = new CustomEvent('openAddProductModal');
              window.dispatchEvent(event);
            }}
          >
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
          <Layout 
            title="BOQ Upload & Processing" 
            subtitle="Upload PDF BOQ files and extract material data automatically"
          >
            <BOQ />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/requests">
        <ProtectedRoute>
          <Layout 
            title="Material Requests" 
            subtitle="Manage and track all material request workflows"
          >
            <MaterialRequests />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/inventory-movement">
        <ProtectedRoute>
          <Layout 
            title="Inventory Movement" 
            subtitle="Track inward and outward inventory transactions"
          >
            <InventoryMovement />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <Layout 
            title="Reports & Analytics" 
            subtitle="Generate reports and export data for analysis"
          >
            <Reports />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute>
          <Layout 
            title="User Management" 
            subtitle="Manage system users and their roles"
          >
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
          <Layout 
            title="AI-Powered OCR Enhancement Wizard" 
            subtitle="Advanced OCR processing with AI-powered field extraction"
          >
            <OCRWizard />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks">
        <ProtectedRoute>
          <Layout>
            <TaskManagement />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks/:id">
        <ProtectedRoute>
          <Layout>
            <TaskDetail />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/price-comparison">
        <ProtectedRoute>
          <Layout>
            <PriceComparison />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/product-comparison">
        <ProtectedRoute>
          <Layout 
            title="Product Comparison" 
            subtitle="Compare products by category and find the best prices"
          >
            <ProductComparison />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/whatsapp">
        <ProtectedRoute>
          <Layout>
            <WhatsAppExport />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/display-settings">
        <ProtectedRoute>
          <Layout>
            <DisplaySettings />
          </Layout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/backups">
        <ProtectedRoute>
          <Layout>
            <Backups />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm">
        <ProtectedRoute>
          <Layout 
            title="Customer Relationship Management" 
            subtitle="Manage customers, leads, deals and activities"
          >
            <CRM />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/leads">
        <ProtectedRoute>
          <Layout>
            <Leads />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/customers">
        <ProtectedRoute>
          <Layout>
            <Customers />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/quotations">
        <ProtectedRoute>
          <Layout>
            <Quotations />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/followups">
        <ProtectedRoute>
          <Layout>
            <FollowUps />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/visits">
        <ProtectedRoute>
          <Layout>
            <SiteVisits />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/crm/reports">
        <ProtectedRoute>
          <Layout>
            <CRMReports />
          </Layout>
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
