import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MobileOptimizerProps {
  children: ReactNode;
  className?: string;
}

// Hook to detect mobile device and screen size
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({ width, height });
      setIsMobile(width < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile, screenSize };
}

// Hook for device orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
}

// Mobile-optimized container component
export function MobileContainer({ children, className }: MobileOptimizerProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <div className={cn(
      "w-full",
      isMobile ? "px-3 py-2" : "px-6 py-4",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized grid component
interface MobileGridProps {
  children: ReactNode;
  className?: string;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
}

export function MobileGrid({ 
  children, 
  className, 
  mobileColumns = 1, 
  tabletColumns = 2, 
  desktopColumns = 4 
}: MobileGridProps) {
  return (
    <div className={cn(
      "grid gap-3 sm:gap-4 lg:gap-6",
      `grid-cols-${mobileColumns}`,
      `sm:grid-cols-${tabletColumns}`,
      `lg:grid-cols-${desktopColumns}`,
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized button component
interface MobileButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
}

export function MobileButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className,
  disabled = false
}: MobileButtonProps) {
  const { isMobile } = useIsMobile();
  
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 touch-manipulation";
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
  };
  
  const sizeClasses = {
    sm: isMobile ? "h-10 px-4 text-sm" : "h-9 px-3 text-sm",
    md: isMobile ? "h-12 px-6 text-base" : "h-10 px-4 text-sm",
    lg: isMobile ? "h-14 px-8 text-lg" : "h-11 px-8 text-base"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}

// Mobile-optimized card component
interface MobileCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export function MobileCard({ children, className, padding = 'md', shadow = true }: MobileCardProps) {
  const { isMobile } = useIsMobile();
  
  const paddingClasses = {
    sm: isMobile ? "p-3" : "p-4",
    md: isMobile ? "p-4" : "p-6",
    lg: isMobile ? "p-6" : "p-8"
  };
  
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg",
      paddingClasses[padding],
      shadow && "shadow-sm hover:shadow-md transition-shadow duration-200",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized input component
interface MobileInputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function MobileInput({ 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  className,
  disabled = false,
  required = false
}: MobileInputProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={cn(
        "w-full border border-input bg-background rounded-md px-3 transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
        "placeholder:text-muted-foreground",
        isMobile ? "h-12 text-base" : "h-10 text-sm",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
}

// Mobile-optimized typography components
interface MobileTextProps {
  children: ReactNode;
  className?: string;
}

export function MobileHeading({ children, className }: MobileTextProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <h2 className={cn(
      "font-semibold text-foreground",
      isMobile ? "text-xl" : "text-2xl",
      className
    )}>
      {children}
    </h2>
  );
}

export function MobileSubheading({ children, className }: MobileTextProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <h3 className={cn(
      "font-medium text-foreground",
      isMobile ? "text-lg" : "text-xl",
      className
    )}>
      {children}
    </h3>
  );
}

export function MobileText({ children, className }: MobileTextProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <p className={cn(
      "text-muted-foreground",
      isMobile ? "text-sm" : "text-base",
      className
    )}>
      {children}
    </p>
  );
}

// Mobile-optimized spacing component
interface MobileSpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function MobileSpacer({ size = 'md' }: MobileSpacerProps) {
  const { isMobile } = useIsMobile();
  
  const spacingClasses = {
    xs: isMobile ? "h-2" : "h-3",
    sm: isMobile ? "h-3" : "h-4",
    md: isMobile ? "h-4" : "h-6",
    lg: isMobile ? "h-6" : "h-8",
    xl: isMobile ? "h-8" : "h-12"
  };
  
  return <div className={spacingClasses[size]} />;
}

// Main mobile optimizer component
export default function MobileOptimizer({ children, className }: MobileOptimizerProps) {
  const { isMobile, screenSize } = useIsMobile();
  const orientation = useOrientation();
  
  useEffect(() => {
    // Add mobile-specific CSS classes to body
    if (isMobile) {
      document.body.classList.add('mobile-optimized');
      document.body.classList.add(`orientation-${orientation}`);
    } else {
      document.body.classList.remove('mobile-optimized');
      document.body.classList.remove('orientation-portrait', 'orientation-landscape');
    }
    
    // Set CSS custom properties for dynamic sizing
    document.documentElement.style.setProperty('--screen-width', `${screenSize.width}px`);
    document.documentElement.style.setProperty('--screen-height', `${screenSize.height}px`);
    
    return () => {
      document.body.classList.remove('mobile-optimized', 'orientation-portrait', 'orientation-landscape');
    };
  }, [isMobile, orientation, screenSize]);
  
  return (
    <div className={cn(
      "mobile-optimizer-container",
      isMobile && "mobile-layout",
      `orientation-${orientation}`,
      className
    )}>
      {children}
    </div>
  );
}