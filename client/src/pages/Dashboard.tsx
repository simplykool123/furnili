import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  DollarSign,
  CheckCircle,
  Calendar,
  Quote,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import StockWarnings from "@/components/Dashboard/StockWarnings";
import MobileDashboard from "@/components/Mobile/MobileDashboard";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: any[];
  lowStockItems: number;
  totalUsers: number;
  activeUsers: number;
  pendingRequests: number;
  todayAttendance: number;
  monthlyExpenses: number;
  activeTasks: number;
  totalValue: number;
  recentRequests: any[];
}

interface DashboardTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo: number;
  assignedBy: number;
  assignedUser?: { id: number; name: string; username: string };
  assignedByUser?: { id: number; name: string; username: string };
  createdAt: string;
}

const motivationalQuotes = [
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs"
  },
  {
    text: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller"
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins"
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill"
  },
  {
    text: "Quality is not an act, it is a habit.",
    author: "Aristotle"
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb"
  },
  {
    text: "Your limitation—it's only your imagination.",
    author: "Unknown"
  },
  {
    text: "Great things never come from comfort zones.",
    author: "Unknown"
  },
  {
    text: "Dream it. Wish it. Do it.",
    author: "Unknown"
  },
  {
    text: "Success doesn't just find you. You have to go out and get it.",
    author: "Unknown"
  },
  {
    text: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: "Unknown"
  },
  {
    text: "Dream bigger. Do bigger.",
    author: "Unknown"
  },
  {
    text: "Don't stop when you're tired. Stop when you're done.",
    author: "Unknown"
  },
  {
    text: "Wake up with determination. Go to bed with satisfaction.",
    author: "Unknown"
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery"
  },
  {
    text: "Little things make big days.",
    author: "Unknown"
  },
  {
    text: "It's going to be hard, but hard does not mean impossible.",
    author: "Unknown"
  },
  {
    text: "Don't wait for opportunity. Create it.",
    author: "Unknown"
  }
];

export default function Dashboard() {
  const currentUser = authService.getUser();
  const admin = authService.hasRole(['admin']);
  const [dailyQuote, setDailyQuote] = useState<typeof motivationalQuotes[0] | null>(null);
  const { isMobile } = useIsMobile();
  const [, setLocation] = useLocation();

  // Select a random quote on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setDailyQuote(motivationalQuotes[randomIndex]);
  }, []);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/activity"],
  });

  // Remove task display from dashboard completely to prevent duplication
  const pendingTasks: DashboardTask[] = []; // Always empty - tasks only shown in notification bell

  const { toast } = useToast();

  // Mark task as done mutation
  const markTaskDoneMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest(`/api/tasks/${taskId}/status`, "PATCH", { status: "done" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/notifications"] });
      toast({
        title: "Task completed",
        description: "Task has been marked as done",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="animate-pulse">
          <div className="h-10 bg-primary/20 rounded-lg w-1/2 mb-3"></div>
          <div className="h-6 bg-muted rounded-md w-1/3 mb-8"></div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-card rounded-xl shadow-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Use mobile dashboard for mobile devices
  if (isMobile) {
    return <MobileDashboard onMenuClick={() => {
      // Trigger sidebar toggle event for mobile
      window.dispatchEvent(new CustomEvent('toggleMobileSidebar'));
    }} />;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Tasks are now only shown in the notification bell to prevent duplication */}
      {/* Completely removed all task display logic from dashboard */}

      {/* Welcome Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900">
          Welcome back, {currentUser?.name || 'Admin'}!
        </h1>
        <p className="text-base sm:text-lg text-amber-800 mt-2">
          Here's your business overview and key metrics for today.
        </p>
      </div>

      {/* Motivational Quote */}
      {dailyQuote && (
        <Card className="shadow-lg border border-amber-200 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Quote className="h-8 w-8 text-amber-600" />
              </div>
              <div className="flex-1">
                <blockquote className="text-lg font-medium text-amber-900 leading-relaxed">
                  "{dailyQuote.text}"
                </blockquote>
                <cite className="block text-right text-amber-700 font-semibold mt-3">
                  — {dailyQuote.author}
                </cite>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Warnings */}
      <StockWarnings />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-card to-blue-50/20 cursor-pointer" onClick={() => setLocation('/products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active items</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 bg-gradient-to-br from-card to-red-50/20 cursor-pointer" onClick={() => setLocation('/products?filter=low-stock')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-red-600">
              {Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Need restocking</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500 bg-gradient-to-br from-card to-orange-50/20 cursor-pointer" onClick={() => setLocation('/attendance')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">Attendance</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-foreground">{stats?.todayAttendance || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Staff today</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 bg-gradient-to-br from-card to-purple-50/20 cursor-pointer" onClick={() => setLocation('/attendance')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">Staff & Payroll</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-foreground">{stats?.activeTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Manage staff</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500 bg-gradient-to-br from-card to-indigo-50/20 cursor-pointer" onClick={() => setLocation('/requests')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-foreground">{stats?.pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500 bg-gradient-to-br from-card to-yellow-50/20 cursor-pointer" onClick={() => setLocation('/petty-cash')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-card-foreground">Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-foreground">
              ₹{stats?.monthlyExpenses?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks/Messages for All Users */}
      {pendingTasks && pendingTasks.length > 0 && (
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg animate-pulse">
          <CardHeader className="pb-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="relative">
                <AlertCircle className="h-6 w-6 text-white" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              🔔 New Messages ({pendingTasks.length})
            </CardTitle>
            <CardDescription className="text-red-100">
              Important tasks and notifications require your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-white to-red-50 border-l-4 border-l-red-400 border border-red-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="relative">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-red-900 truncate flex items-center gap-2">
                      📋 {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="outline" 
                        className="bg-yellow-100 text-yellow-800 border-yellow-300"
                      >
                        Pending
                      </Badge>
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : 
                                task.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority} priority
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.assignedByUser && (
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned by: {task.assignedByUser.name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-gray-300 hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/tasks/${task.id}`);
                      }}
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-green-600 hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        markTaskDoneMutation.mutate(task.id);
                      }}
                      disabled={markTaskDoneMutation.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Done
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => setLocation('/tasks')}
              >
                View All Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Removed "All caught up!" section - tasks now only show in notification bell */}

      {/* Recent Activity Section */}
      {recentActivity && Array.isArray(recentActivity) && recentActivity.length > 0 && (
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentActivity.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50/50 border border-gray-100/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.createdAt && !isNaN(new Date(activity.createdAt).getTime()) 
                        ? new Date(activity.createdAt).toLocaleString()
                        : 'Recently'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}