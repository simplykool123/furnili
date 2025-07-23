import { Package, AlertTriangle, Clock, CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { MobileGrid, MobileCard, MobileHeading, MobileText, useIsMobile } from "./MobileOptimizer";
import { useLocation } from "wouter";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: any[];
  todayAttendance: number;
  activeTasks: number;
  pendingRequests: number;
  monthlyExpenses: number;
  lowStockItems?: number;
}

interface MobileDashboardProps {
  onMenuClick?: () => void;
}

export default function MobileDashboard({ onMenuClick }: MobileDashboardProps) {
  const { isMobile } = useIsMobile();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/dashboard/stats') as DashboardStats;
    },
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['/api/dashboard/activity'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/dashboard/activity');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-2" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
        <MobileGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-4 w-4 bg-muted rounded" />
              </div>
              <div className="h-8 bg-muted rounded w-16" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
          ))}
        </MobileGrid>
      </div>
    );
  }

  const statCards = [
    {
      title: "Products",
      value: stats?.totalProducts || 0,
      description: "Active items",
      icon: Package,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      href: "/products"
    },
    {
      title: "Low Stock",
      value: Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : (stats?.lowStockItems || 0),
      description: "Need restocking",
      icon: AlertTriangle,
      color: "red",
      gradient: "from-red-500 to-red-600",
      href: "/products"
    },
    {
      title: "Attendance",
      value: stats?.todayAttendance || 0,
      description: "Staff today",
      icon: Clock,
      color: "orange",
      gradient: "from-orange-500 to-orange-600",
      href: "/attendance"
    },
    {
      title: "Tasks",
      value: stats?.activeTasks || 0,
      description: "In progress",
      icon: CheckCircle,
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      href: "/attendance"
    },
    {
      title: "Requests",
      value: stats?.pendingRequests || 0,
      description: "Pending",
      icon: TrendingUp,
      color: "indigo",
      gradient: "from-indigo-500 to-indigo-600",
      href: "/requests"
    },
    {
      title: "Expenses",
      value: `₹${stats?.monthlyExpenses?.toLocaleString() || 0}`,
      description: "This month",
      icon: DollarSign,
      color: "yellow",
      gradient: "from-yellow-500 to-yellow-600",
      href: "/petty-cash"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Mobile Header with Menu Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onMenuClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMenuClick}
              className="touch-target hover:bg-primary/10"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </Button>
          )}
          <div className="space-y-1">
            <MobileHeading>Dashboard Overview</MobileHeading>
            <MobileText>Real-time business metrics and insights</MobileText>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <MobileGrid 
        mobileColumns={2} 
        tabletColumns={3} 
        desktopColumns={isMobile ? 2 : 6}
        className="gap-3 sm:gap-4"
      >
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-bounce-in border-l-4 border-l-current cursor-pointer active:scale-95 bg-card rounded-lg p-4 shadow-sm"
            style={{ borderLeftColor: `var(--${stat.color}-500, #6b7280)` }}
            onClick={() => setLocation(stat.href)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0`}
                >
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-xs font-medium text-muted-foreground ${isMobile ? 'hidden' : 'block'}`}>
                  {stat.title}
                </span>
              </div>
              {isMobile && (
                <span className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <div className={`font-bold text-foreground ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>

            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
          </div>
        ))}
      </MobileGrid>

      {/* Quick Actions */}
      <MobileCard className="space-y-4">
        <MobileHeading className="text-lg">Quick Actions</MobileHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Add Product", icon: Package, color: "bg-blue-100 text-blue-700", action: () => {
              setLocation('/products');
              // Trigger add product modal
              setTimeout(() => {
                window.dispatchEvent(new Event('openAddProductModal'));
              }, 100);
            }},
            { label: "Check In/Out", icon: Clock, color: "bg-green-100 text-green-700", action: () => setLocation('/attendance') },
            { label: "New Request", icon: TrendingUp, color: "bg-purple-100 text-purple-700", action: () => setLocation('/requests') }
          ].map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-all duration-200 group active:scale-95 ${isMobile ? 'min-h-[56px]' : 'min-h-[48px]'}`}
            >
              <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-foreground">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </MobileCard>

      {/* Recent Activity */}
      <MobileCard className="space-y-4">
        <div className="flex items-center justify-between">
          <MobileHeading className="text-lg">Recent Activity</MobileHeading>
          <button className="text-sm text-primary hover:text-primary/80 transition-colors">
            View All
          </button>
        </div>
        
        {activity.length > 0 ? (
          <div className="space-y-3">
            {activity.slice(0, isMobile ? 3 : 5).map((item: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium break-words">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )}
      </MobileCard>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MobileCard className="space-y-4">
          <MobileHeading className="text-lg">Inventory Health</MobileHeading>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Stock Value</span>
              <span className="font-medium text-foreground">₹{((stats?.totalProducts || 0) * 5000).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Low Stock Items</span>
              <span className={`font-medium ${(Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                {Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Categories</span>
              <span className="font-medium text-foreground">8+</span>
            </div>
          </div>
        </MobileCard>

        <MobileCard className="space-y-4">
          <MobileHeading className="text-lg">Team Performance</MobileHeading>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Present Today</span>
              <span className="font-medium text-success">{stats?.todayAttendance || 0}/10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Tasks</span>
              <span className="font-medium text-foreground">{stats?.activeTasks || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed Requests</span>
              <span className="font-medium text-success">24</span>
            </div>
          </div>
        </MobileCard>
      </div>
    </div>
  );
}