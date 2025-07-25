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
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, showAddButton = false, onAddClick, onMenuClick }: HeaderProps) {
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
    <header className="border-b border-border bg-card/50 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-5 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden hover:bg-primary/10 dark:hover:bg-primary/20"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </Button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-amber-100 truncate">{title}</h1>
            <p className="text-sm sm:text-base text-amber-700 dark:text-amber-200 truncate mt-1">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Task Notifications for Staff */}
          <AnimatedNotificationBell />
          
          {/* Low Stock Notification */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
              >
                <Bell className="w-5 h-5 text-foreground" />
                {lowStockCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
                  >
                    {lowStockCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 glass-effect border shadow-lg">
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
