import { ReactNode } from "react";
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
  
  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen flex bg-amber-50" data-testid="main-layout">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {title && (
          <Header 
            title={title}
            subtitle={subtitle}
            showAddButton={showAddButton}
            onAddClick={onAddClick}
          />
        )}
        
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
