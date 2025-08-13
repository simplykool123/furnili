import { useState, useEffect, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useIsMobile } from '@/components/Mobile/MobileOptimizer';
import MobileLayout from '@/components/Mobile/MobileLayout';

interface FurniliLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function FurniliLayout({ 
  children, 
  title, 
  subtitle, 
  showAddButton, 
  onAddClick,
  actions,
  className 
}: FurniliLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile(1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed
  const [isHovering, setIsHovering] = useState(false);

  // Use mobile layout for better performance on mobile devices
  if (isMobile) {
    return (
      <MobileLayout 
        title={title} 
        subtitle={subtitle}
        actions={actions}
        className={className}
      >
        {children}
      </MobileLayout>
    );
  }

  // No auto-hide - sidebar stays open once expanded

  return (
    <div className="furnili-page">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2366451c' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar - Always Fixed */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed && !isMobile ? "w-16" : "w-64"
        )}
        onClick={() => {
          if (!isMobile && sidebarCollapsed) {
            setSidebarCollapsed(false);
          }
        }}>
          <div className="furnili-sidebar h-full shadow-xl border-r border-border/50">
            <Sidebar 
              onItemClick={() => isMobile && setSidebarOpen(false)} 
              collapsed={sidebarCollapsed && !isMobile}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Toggle Button for Desktop */}
        {!isMobile && sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-8 h-12 bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] text-white rounded-r-lg shadow-lg transition-all duration-200 flex items-center justify-center"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Main content */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed && !isMobile ? "ml-16" : "ml-64 lg:ml-64",
          isMobile ? "ml-0" : ""
        )}>
          {/* Header */}
          <div className="furnili-header sticky top-0 z-30">
            <Header
              title={title}
              subtitle={subtitle}
              showAddButton={showAddButton}
              onAddClick={onAddClick}
              actions={actions}
              onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>

          {/* Page content */}
          <main className={cn(
            "flex-1 overflow-auto",
            "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5",
            "w-full",
            className
          )}>
            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}