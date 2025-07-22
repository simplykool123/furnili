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
  Database,
  GitCompare,
  Brain,
  Settings,
  Download
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
      { name: 'Display Settings', href: '/display-settings', icon: Settings, roles: ['admin', 'staff'] },
      { name: 'Backups', href: '/backups', icon: Download, roles: ['admin'] },
    ]
  },
  { name: 'Staff Attendance', href: '/attendance', icon: Clock, roles: ['admin', 'staff'] },
  { name: 'Petty Cash', href: '/petty-cash', icon: Wallet, roles: ['admin', 'staff'] },
  { name: 'OCR Wizard', href: '/ocr-wizard', icon: Brain, roles: ['admin', 'staff'] },
  { name: 'Task Management', href: '/tasks', icon: CheckSquare, roles: ['admin', 'staff'] },
  { name: 'Price Comparison', href: '/price-comparison', icon: TrendingUp, roles: ['admin', 'staff'] },
  { name: 'Product Comparison', href: '/product-comparison', icon: GitCompare, roles: ['admin', 'staff'] },
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
    <aside className="w-64 lg:w-72 furnili-gradient shadow-xl border-r border-primary-foreground/20 h-full flex flex-col transition-all duration-300" data-testid="main-sidebar">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-primary-foreground/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <img 
              src="/furnili-logo-small.png" 
              alt="Furnili Logo" 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-white font-bold text-lg">F</span>';
                }
              }}
            />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg tracking-wide">Furnili MS</h2>
            <p className="text-xs text-white/80 capitalize font-medium">{user.role}</p>
          </div>
        </div>
      </div>

      

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {filteredNavigation.map((item) => {
            if (item.isCollapsible && item.subItems) {
              const isExpanded = expandedItems.includes(item.name);
              const hasActiveSubItem = item.subItems.some(subItem => 
                subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)))
              );
              
              return (
                <div key={item.name} className="space-y-1">
                  {/* Parent Menu Item */}
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm group hover:shadow-md",
                      hasActiveSubItem || isExpanded
                        ? "text-white bg-white/20 shadow-lg backdrop-blur-sm"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate font-semibold">{item.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform" />
                    )}
                  </button>
                  
                  {/* Sub Menu Items */}
                  {isExpanded && (
                    <div className="ml-8 space-y-1 animate-fade-in">
                      {item.subItems.map((subItem) => {
                        const isActive = subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)));
                        
                        return subItem.href ? (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center space-x-3 w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm group",
                              isActive
                                ? "text-white bg-white/25 shadow-md backdrop-blur-sm border border-white/20"
                                : "text-white/80 hover:bg-white/15 hover:text-white"
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
              // Regular navigation item
              const isActive = item.href && (location === item.href || (item.href !== '/' && location.startsWith(item.href)));
              
              return item.href ? (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm group hover:shadow-md",
                    isActive
                      ? "text-white bg-white/20 shadow-lg backdrop-blur-sm"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={onItemClick}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate font-semibold">{item.name}</span>
                </Link>
              ) : null;
            }
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-primary-foreground/20">
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 text-white/90 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200 w-full text-sm font-medium group"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
