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
  Warehouse 
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'storekeeper', 'user'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['admin', 'manager'] },
  { name: 'Categories', href: '/categories', icon: Tag, roles: ['admin', 'manager'] },
  { name: 'Material Requests', href: '/requests', icon: ClipboardList, roles: ['admin', 'manager', 'storekeeper', 'user'] },
  { name: 'BOQ Upload', href: '/boq', icon: FileText, roles: ['admin', 'manager'] },
  { name: 'Inventory', href: '/inventory', icon: Warehouse, roles: ['admin', 'storekeeper'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager', 'storekeeper'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
];

export default function Sidebar() {
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
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Inventory MS</h2>
            <p className="text-sm text-gray-600 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-sm text-gray-600 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            
            return (
              <Link key={item.name} href={item.href} className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-gray-700 hover:bg-gray-100"
              )}>
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
