import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Header from './Header';
import Sidebar from './Sidebar';

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
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Auto-hide logic: collapse sidebar when not hovering (desktop only)
  useEffect(() => {
    if (!isMobile) {
      const timer = setTimeout(() => {
        if (!isHovering) {
          setSidebarCollapsed(true);
        }
      }, 2000); // Auto-hide after 2 seconds of no hover

      return () => clearTimeout(timer);
    }
  }, [isHovering, isMobile]);

  return (
    <div className="furnili-page">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2366451c' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && !isMobile ? "w-16" : "w-64"
        )}
        onMouseEnter={() => {
          setIsHovering(true);
          if (!isMobile) setSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          setIsHovering(false);
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

        {/* Main content */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed && !isMobile ? "lg:ml-16" : "lg:ml-64"
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
            "px-4 sm:px-6 lg:px-8 py-6 lg:py-8",
            "max-w-7xl mx-auto w-full",
            className
          )}>
            <div className="space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}