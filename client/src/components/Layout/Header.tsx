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
      return await authenticatedApiRequest('/api/dashboard/stats');
    },
    enabled: !!user,
  });

  const lowStockCount = stats?.lowStockItems || (Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0);

  return (
    <header className="border-b border-amber-300 px-3 sm:px-4 lg:px-6 py-3 sm:py-4" style={{backgroundColor: '#F5F0E8'}}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">{title}</h1>
            <p className="text-sm sm:text-base text-gray-600 truncate">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
          {/* Low Stock Notification */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {lowStockCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {lowStockCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80">
              <div className="p-3 border-b">
                <h4 className="font-medium">Low Stock Alerts</h4>
                <p className="text-sm text-gray-600">{lowStockCount} items need attention</p>
              </div>
              {Array.isArray(stats?.lowStockProducts) && stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.slice(0, 3).map((product: any) => (
                  <DropdownMenuItem key={product.id} className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{String(product.name || 'Unknown Product')}</p>
                      <p className="text-sm text-gray-600">
                        Stock: {Number(product.currentStock) || 0} / {Number(product.minStock) || 0}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs ml-2">Low</Badge>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="p-3 text-center text-gray-500">
                  No low stock items
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-right hidden sm:block">
              <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{user?.name}</p>
              <p className="text-xs sm:text-sm text-gray-600 capitalize">{user?.role}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xs sm:text-sm">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
          </div>

          
          
          
        </div>
      </div>
    </header>
  );
}
