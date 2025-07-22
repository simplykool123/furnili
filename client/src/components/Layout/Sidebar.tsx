import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Package, 
  Tag,
  ClipboardList, 
  FileText, 
  BarChart3, 
  Users, 
  LogOut,
  Warehouse,
  Clock,
  Wallet,
  CheckSquare,
  TrendingUp,
  MessageCircle,
  ArrowUpDown
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'staff'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['admin', 'staff'] },
  { name: 'Categories', href: '/categories', icon: Tag, roles: ['admin', 'staff'] },
  { name: 'Material Requests', href: '/requests', icon: ClipboardList, roles: ['admin', 'staff'] },
  { name: 'BOQ Upload', href: '/boq', icon: FileText, roles: ['admin', 'staff'] },
  { name: 'Inventory Movement', href: '/inventory-movement', icon: ArrowUpDown, roles: ['admin', 'staff'] },
  { name: 'Staff Attendance', href: '/attendance', icon: Clock, roles: ['admin', 'staff'] },
  { name: 'Petty Cash', href: '/petty-cash', icon: Wallet, roles: ['admin', 'staff'] },
  { name: 'Task Management', href: '/tasks', icon: CheckSquare, roles: ['admin', 'staff'] },
  { name: 'Price Comparison', href: '/price-comparison', icon: TrendingUp, roles: ['admin', 'staff'] },
  { name: 'WhatsApp Export', href: '/whatsapp', icon: MessageCircle, roles: ['admin', 'staff'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'staff'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
];

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps = {}) {
  const [location] = useLocation();
  const user = authService.getUser();
  
  if (!user) return null;

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <aside className="w-56 lg:w-64 bg-white shadow-lg border-r border-gray-200 h-full flex flex-col" data-testid="main-sidebar">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Inventory MS</h2>
            <p className="text-xs text-gray-600 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-xs">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate text-sm">{user.name}</p>
            <p className="text-xs text-gray-600 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={onItemClick}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors w-full text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
