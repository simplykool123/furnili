import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { authService } from "@/lib/auth";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

export default function Layout({ 
  children, 
  title = "", 
  subtitle = "", 
  showAddButton = false, 
  onAddClick 
}: LayoutProps) {
  const user = authService.getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen flex" data-testid="main-layout" style={{backgroundColor: '#F5F0E8'}}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64">
            <Sidebar onItemClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {title && (
          <Header 
            title={title}
            subtitle={subtitle}
            showAddButton={showAddButton}
            onAddClick={onAddClick}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
        
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
