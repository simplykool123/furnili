import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
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
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Database
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'staff'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['admin', 'staff'] },
  { name: 'Material Requests', href: '/requests', icon: ClipboardList, roles: ['admin', 'staff'] },
  { name: 'BOQ Upload', href: '/boq', icon: FileText, roles: ['admin', 'staff'] },
  { 
    name: 'Master', 
    icon: Database, 
    roles: ['admin', 'staff'],
    isCollapsible: true,
    subItems: [
      { name: 'Inventory Movement', href: '/inventory-movement', icon: ArrowUpDown, roles: ['admin', 'staff'] },
      { name: 'Categories', href: '/categories', icon: Tag, roles: ['admin', 'staff'] },
      { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
    ]
  },
  { name: 'Staff Attendance', href: '/attendance', icon: Clock, roles: ['admin', 'staff'] },
  { name: 'Petty Cash', href: '/petty-cash', icon: Wallet, roles: ['admin', 'staff'] },
  { name: 'Task Management', href: '/tasks', icon: CheckSquare, roles: ['admin', 'staff'] },
  { name: 'Price Comparison', href: '/price-comparison', icon: TrendingUp, roles: ['admin', 'staff'] },
  { name: 'WhatsApp Export', href: '/whatsapp', icon: MessageCircle, roles: ['admin', 'staff'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'staff'] },
];

interface SidebarProps {
  onItemClick?: () => void;
}

export default function Sidebar({ onItemClick }: SidebarProps = {}) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const user = authService.getUser();
  
  if (!user) return null;

  // Auto-expand Master menu if any sub-item is active
  useEffect(() => {
    const masterItem = navigation.find(item => item.name === 'Master');
    if (masterItem?.subItems) {
      const hasActiveMasterSubItem = masterItem.subItems.some(subItem => 
        subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)))
      );
      if (hasActiveMasterSubItem && !expandedItems.includes('Master')) {
        setExpandedItems(prev => [...prev, 'Master']);
      }
    }
  }, [location, expandedItems]);

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  ).map(item => {
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(subItem => subItem.roles.includes(user.role))
      };
    }
    return item;
  });

  return (
    <aside className="w-56 lg:w-64 bg-amber-900 shadow-lg border-r border-amber-800 h-full flex flex-col" data-testid="main-sidebar" style={{backgroundColor: '#8B5A2B'}}>
      {/* Logo/Brand */}
      <div className="p-4 border-b border-amber-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
              src="/furnili-logo.png" 
              alt="Furnili Logo" 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                // Fallback to SVG version
                (e.target as HTMLImageElement).src = '/furnili-logo.svg';
              }}
            />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Furnili MS</h2>
            <p className="text-xs text-amber-200 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            if (item.isCollapsible && item.subItems) {
              const isExpanded = expandedItems.includes(item.name);
              const hasActiveSubItem = item.subItems.some(subItem => 
                subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)))
              );
              
              return (
                <div key={item.name}>
                  {/* Parent Menu Item */}
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                      hasActiveSubItem || isExpanded
                        ? "text-white bg-amber-800"
                        : "text-amber-100 hover:bg-amber-800/50"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                  
                  {/* Sub Menu Items */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isActive = subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)));
                        
                        return subItem.href ? (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                              isActive
                                ? "text-white bg-amber-800"
                                : "text-amber-200 hover:bg-amber-800/50"
                            )}
                            onClick={onItemClick}
                          >
                            <subItem.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{subItem.name}</span>
                          </Link>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              // Regular menu item
              const isActive = item.href && (location === item.href || (item.href !== '/' && location.startsWith(item.href)));
              
              return item.href ? (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                    isActive
                      ? "text-white bg-amber-800"
                      : "text-amber-100 hover:bg-amber-800/50"
                  )}
                  onClick={onItemClick}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              ) : null;
            }
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-amber-800">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-2 px-3 py-2 text-amber-100 hover:bg-amber-800/50 rounded-lg transition-colors w-full text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
