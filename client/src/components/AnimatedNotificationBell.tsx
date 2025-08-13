import { useState, useEffect } from "react";
import { Bell, AlertCircle, Clock, CheckCircle, AlertTriangle, Package, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authenticatedApiRequest } from "@/lib/auth";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedByUser?: {
    id: number;
    name: string;
    username: string;
  };
}

interface DashboardStats {
  lowStockProducts: any[];
  pendingRequests: number;
  todayAttendance: number;
  monthlyExpenses: number;
}

export function AnimatedNotificationBell() {
  const [, setLocation] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasNewTasks, setHasNewTasks] = useState(false);
  const [previousTaskCount, setPreviousTaskCount] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: tasks = [], error, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/dashboard/tasks"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch dashboard stats for other notifications
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/dashboard/stats');
    },
    refetchInterval: 30000,
  });

  // Count pending and in-progress tasks (using lowercase status values)
  const taskCount = tasks.filter(task => 
    task.status === 'pending' || task.status === 'in_progress'
  ).length;

  // Count other notifications
  const lowStockCount = Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0;
  const pendingRequestsCount = stats?.pendingRequests || 0;
  
  // Total notification count
  const totalNotifications = taskCount + lowStockCount + (pendingRequestsCount > 0 ? 1 : 0);
  
  // Check for high priority notifications
  const hasHighPriorityTasks = tasks.some(task => task.priority === 'high');
  const hasLowStock = lowStockCount > 0;
  const hasPendingRequests = pendingRequestsCount > 0;
  const hasUrgentNotifications = hasHighPriorityTasks || hasLowStock;

  // Trigger animation when new tasks are added
  useEffect(() => {
    if (taskCount > previousTaskCount) {
      setHasNewTasks(true);
      setIsAnimating(true);
      setShowGlow(true);
      
      // Stop intensive animation after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setHasNewTasks(false);
        setShowGlow(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    setPreviousTaskCount(taskCount);
  }, [taskCount, previousTaskCount]);

  // Removed continuous animation - only animate on new tasks
  // useEffect(() => {
  //   if (taskCount > 0 && !isAnimating) {
  //     const interval = setInterval(() => {
  //       setIsAnimating(true);
  //       setTimeout(() => setIsAnimating(false), 800);
  //     }, 4000);
  //     return () => clearInterval(interval);
  //   }
  // }, [taskCount, isAnimating]);

  // Removed duplicate variable declaration

  // Always show the bell for consistency

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 

            className={cn(
              "relative group transition-all duration-300 hover:bg-amber-50 rounded-full p-2",
              showGlow && "animate-glow-ring",
              hasNewTasks && "animate-bell-bounce"
            )}
          >
            <div className="relative">
              {/* Bell Icon with dynamic animations */}
              <Bell 
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  hasUrgentNotifications ? "text-red-500" : "text-amber-600"
                )} 
              />
              
              {/* Removed animated ripple effects */}
              
              {/* Total notification count badge */}
              {totalNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className={cn(
                    "absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center font-bold border-2 border-white",
                    hasUrgentNotifications ? "bg-red-600" : "bg-red-500"
                  )}
                >
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </Badge>
              )}
              
              {/* Priority indicator with different animations */}
              {hasUrgentNotifications && (
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
              )}
              
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 animate-shimmer transition-opacity duration-300"></div>
            </div>
            

          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          {/* Header with total notifications */}
          <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-4 w-4 text-amber-600" />
                {hasUrgentNotifications && (
                  <div className="absolute -inset-1 bg-red-500 rounded-full opacity-20 animate-ping"></div>
                )}
              </div>
              <span className="font-semibold text-sm text-amber-800">
                All Notifications
              </span>
              {hasUrgentNotifications && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  URGENT
                </Badge>
              )}
            </div>
          </div>
          
          {/* Low Stock Alerts */}
          {hasLowStock && (
            <>
              <div className="px-4 py-2 bg-red-50 border-b">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-sm text-red-700">Low Stock Alerts</span>
                  <Badge variant="destructive" className="text-xs">{lowStockCount}</Badge>
                </div>
              </div>
              <DropdownMenuItem
                onClick={() => setLocation('/products')}
                className="flex items-center gap-3 p-4 hover:bg-red-50 cursor-pointer border-l-4 border-l-red-400"
              >
                <Package className="h-4 w-4 text-red-500" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {lowStockCount} products need restocking
                  </div>
                  <div className="text-xs text-gray-600">Click to view inventory</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Pending Requests */}
          {hasPendingRequests && (
            <>
              <div className="px-4 py-2 bg-blue-50 border-b">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm text-blue-700">Pending Requests</span>
                  <Badge variant="secondary" className="text-xs">{pendingRequestsCount}</Badge>
                </div>
              </div>
              <DropdownMenuItem
                onClick={() => setLocation('/requests')}
                className="flex items-center gap-3 p-4 hover:bg-blue-50 cursor-pointer"
              >
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {pendingRequestsCount} material requests pending
                  </div>
                  <div className="text-xs text-gray-600">Click to review requests</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Tasks */}
          {taskCount > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50 border-b">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm text-amber-700">Pending Tasks</span>
                  <Badge variant="secondary" className="text-xs">{taskCount}</Badge>
                </div>
              </div>
              {tasks.slice(0, 3).map((task, index) => (
                <DropdownMenuItem
                  key={task.id}
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-amber-50",
                    task.priority === 'high' && "bg-red-50/30 hover:bg-red-50 border-l-4 border-l-red-400"
                  )}
                >
                  <div className="flex-shrink-0">
                    {task.priority === 'high' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-600">
                      {task.priority} priority • {task.status}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              {taskCount > 3 && (
                <DropdownMenuItem
                  onClick={() => setLocation('/tasks')}
                  className="text-center p-4 text-amber-600 hover:bg-amber-50 cursor-pointer"
                >
                  View all {taskCount} tasks →
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Empty state */}
          {totalNotifications === 0 && (
            <DropdownMenuItem disabled className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <span className="text-gray-500">All caught up!</span>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
}