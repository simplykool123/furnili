import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import ChangePassword from "@/components/ChangePassword";
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
  Download,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'staff'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['admin', 'staff'] },
  { name: 'Material Requests', href: '/requests', icon: ClipboardList, roles: ['admin', 'staff'] },
  { name: 'Staff Attendance', href: '/attendance', icon: Clock, roles: ['admin', 'staff'] },
  { name: 'Petty Cash', href: '/petty-cash', icon: Wallet, roles: ['admin', 'staff'] },
  { name: 'Project Management', href: '/projects', icon: FolderOpen, roles: ['admin', 'staff'] },
  { name: 'Task Management', href: '/tasks', icon: CheckSquare, roles: ['admin', 'staff'] },
  { name: 'Product Comparison', href: '/product-comparison', icon: GitCompare, roles: ['admin'] }, // Staff disabled
  { name: 'WhatsApp Export', href: '/whatsapp', icon: MessageCircle, roles: ['admin', 'staff'] },

  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'staff'] },
  { 
    name: 'Master', 
    icon: Database, 
    roles: ['admin', 'staff'], // Show Master section for staff but with limited items
    isCollapsible: true,
    subItems: [
      { name: 'Inventory Movement', href: '/inventory-movement', icon: ArrowUpDown, roles: ['admin'] }, // Staff disabled
      { name: 'Categories', href: '/categories', icon: Tag, roles: ['admin'] }, // Staff disabled
      { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
      { name: 'OCR Wizard', href: '/ocr-wizard', icon: Brain, roles: ['admin', 'staff'] },
      { name: 'Price Comparison', href: '/price-comparison', icon: TrendingUp, roles: ['admin'] }, // Staff disabled
      { name: 'Display Settings', href: '/display-settings', icon: Settings, roles: ['admin', 'staff'] },
      { name: 'Backups', href: '/backups', icon: Download, roles: ['admin'] },
    ]
  },
];

interface SidebarProps {
  onItemClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ onItemClick, collapsed = false, onToggleCollapse }: SidebarProps = {}) {
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
    <aside className={cn(
      "shadow-xl border-r border-primary-foreground/20 h-full flex flex-col fixed left-0 top-0 z-40",
      collapsed ? "w-16" : "w-56 lg:w-60"
    )} style={{backgroundColor: '#D4B896'}} data-testid="main-sidebar">
      {/* Logo/Brand & Toggle */}
      <div className="p-2 border-b border-primary-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <img 
                src="/furnili-logo-small.png" 
                alt="Furnili Logo" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-white font-bold text-sm">F</span>';
                  }
                }}
              />
            </div>
            {!collapsed && (
              <div className="flex-1">
                <h2 className="font-bold text-amber-900 text-sm tracking-wide">Furnili MS</h2>
                <p className="text-xs text-amber-800 capitalize font-medium">{user.role}</p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md hover:bg-white/20 text-amber-900"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          )}
        </div>
      </div>

      

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-0.5">
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
                    onClick={() => collapsed ? null : toggleExpanded(item.name)}
                    className={cn(
                      "flex items-center w-full rounded-lg font-medium text-xs group",
                      collapsed ? "justify-center p-2" : "justify-between px-2 py-1.5",
                      hasActiveSubItem || isExpanded
                        ? "text-amber-900 bg-white/30"
                        : "text-amber-900 hover:bg-white/20 hover:text-amber-800"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-2")}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate font-semibold">{item.name}</span>}
                    </div>
                    {!collapsed && (isExpanded ? (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    ))}
                  </button>
                  
                  {/* Sub Menu Items */}
                  {isExpanded && !collapsed && (
                    <div className="ml-6 space-y-0.5">
                      {item.subItems.map((subItem) => {
                        const isActive = subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)));
                        
                        return subItem.href ? (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center space-x-2 w-full px-2 py-1 rounded-lg font-medium text-xs group",
                              isActive
                                ? "text-amber-900 bg-white/25"
                                : "text-amber-900/80 hover:bg-white/15 hover:text-amber-800"
                            )}
                            onClick={onItemClick}
                          >
                            <subItem.icon className="w-3 h-3 flex-shrink-0" />
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
                    "flex items-center rounded-lg font-medium text-xs group",
                    collapsed ? "justify-center p-2" : "space-x-2 px-2 py-1.5",
                    isActive
                      ? "text-amber-900 bg-white/30"
                      : "text-amber-900/90 hover:bg-white/15 hover:text-amber-800"
                  )}
                  onClick={onItemClick}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "w-4 h-4 flex-shrink-0",
                    (item.name === 'Staff Attendance' || item.name === 'Petty Cash') ? "!text-amber-900" : ""
                  )} />
                  {!collapsed && <span className="truncate font-semibold">{item.name}</span>}
                </Link>
              ) : null;
            }
          })}
        </div>
      </nav>

      {/* User Actions */}
      <div className="p-2 border-t border-primary-foreground/20 space-y-1">
        {/* Change Password */}
        {!collapsed && (
          <div className="w-full">
            <ChangePassword />
          </div>
        )}
        
        {/* Logout */}
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center rounded-lg font-medium text-xs text-amber-900/90 hover:bg-white/15 hover:text-amber-800 group w-full",
            collapsed ? "justify-center p-2" : "space-x-2 px-2 py-1.5"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
