import { useState, useEffect, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronLeft } from 'lucide-react';
import { useIsMobile, useTouchDevice } from './MobileOptimizer';
import { Button } from '@/components/ui/button';

// Lazy load components for better performance
const MobileSidebar = lazy(() => import('./MobileSidebar'));

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function MobileLayout({
  children,
  title,
  subtitle,
  showBack,
  onBack,
  actions,
  className
}: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTouch = useTouchDevice();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [title]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen, isMobile]);

  // Mobile layout component - render for all devices
  // Parent component handles mobile detection

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 px-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>

          {/* Back Button */}
          {showBack && onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-2 px-2"
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate text-furnili-brown">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Sidebar */}
      <Suspense fallback={null}>
        <MobileSidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </Suspense>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-4 pb-20", // Extra bottom padding for mobile
        isTouch && "touch-manipulation" // Optimize touch interactions
      )}>
        {children}
      </main>

      {/* Mobile Safe Area */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}