import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { authService } from "@/lib/auth";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import { cn } from "@/lib/utils";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // Listen for mobile sidebar toggle events
  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggleMobileSidebar', handleToggleSidebar);
    return () => {
      window.removeEventListener('toggleMobileSidebar', handleToggleSidebar);
    };
  }, []);
  
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-red-100">
      <div className="p-4 text-red-800">Layout Error: No user found</div>
    </div>;
  }

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => {
            const newCollapsed = !sidebarCollapsed;
            setSidebarCollapsed(newCollapsed);
            localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
          }} 
        />
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
      
      <main className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", 
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {title && (
          <Header 
            title={title}
            subtitle={subtitle}
            showAddButton={showAddButton}
            onAddClick={onAddClick}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
        
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
}
