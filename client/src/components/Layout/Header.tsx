import { Bell, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import NotificationBadge from "@/components/NotificationBadge";
import { AnimatedNotificationBell } from "@/components/AnimatedNotificationBell";

interface HeaderProps {
  title: string;
  subtitle: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, showAddButton = false, onAddClick, actions, onMenuClick }: HeaderProps) {
  const user = authService.getUser();
  
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/dashboard/stats');
    },
    enabled: !!user,
  });

  const lowStockCount = stats?.lowStockItems || (Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 sticky top-0 z-40">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden hover:bg-primary/10 dark:hover:bg-primary/20 p-3 min-w-[44px] min-h-[44px] touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mobile menu clicked!');
                onMenuClick();
              }}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </Button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-amber-900 dark:text-amber-100 truncate leading-tight">{title}</h1>
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-200 truncate mt-0.5 sm:mt-1">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
          {/* Custom Actions */}
          {actions && (
            <div className="flex items-center space-x-1 sm:space-x-2">
              {actions}
            </div>
          )}
          
          {/* Task Notifications for Staff */}
          <div className="hidden sm:block">
            <AnimatedNotificationBell />
          </div>
          
          {/* Mobile compact notifications */}
          <div className="sm:hidden">
            <AnimatedNotificationBell />
          </div>
          
          {/* Low Stock Notification */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors p-2"
              >
                <Bell className="w-3 h-3 sm:w-4 sm:h-4 text-foreground" />
                {lowStockCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
                  >
                    {lowStockCount > 9 ? '9+' : lowStockCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80 lg:w-96 glass-effect border shadow-lg">
              <div className="p-4 border-b border-border">
                <h4 className="font-semibold text-foreground">Low Stock Alerts</h4>
                <p className="text-sm text-muted-foreground">{lowStockCount} items need attention</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {Array.isArray(stats?.lowStockProducts) && stats.lowStockProducts.length > 0 ? (
                  stats.lowStockProducts.slice(0, 5).map((product: any) => (
                    <DropdownMenuItem key={product.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-foreground">{String(product.name || 'Unknown Product')}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {Number(product.currentStock) || 0} / {Number(product.minStock) || 0}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs ml-2 animate-pulse">Low</Badge>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="p-4 text-center text-muted-foreground">
                    All stock levels are healthy
                  </DropdownMenuItem>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-foreground text-sm lg:text-base truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 furnili-gradient rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
          </div>


        </div>
      </div>
    </header>
  );
}
