import { Bell, Plus } from "lucide-react";
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
}

export default function Header({ title, subtitle, showAddButton = false, onAddClick }: HeaderProps) {
  const user = authService.getUser();
  
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
    enabled: !!user,
  });

  const lowStockCount = stats?.lowStockItems || 0;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Low Stock Notification */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                {lowStockCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {lowStockCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b">
                <h4 className="font-medium">Low Stock Alerts</h4>
                <p className="text-sm text-gray-600">{lowStockCount} items need attention</p>
              </div>
              {Array.isArray(stats?.lowStockProducts) && stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.slice(0, 3).map((product: any) => (
                  <DropdownMenuItem key={product.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{String(product.name || 'Unknown Product')}</p>
                      <p className="text-sm text-gray-600">
                        Stock: {Number(product.currentStock) || 0} / {Number(product.minStock) || 0}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">Low</Badge>
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
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Add Button */}
          {showAddButton && onAddClick && (
            <Button onClick={onAddClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
