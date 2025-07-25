import { useQuery } from "@tanstack/react-query";
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
  Download
} from "lucide-react";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import StockWarnings from "@/components/Dashboard/StockWarnings";
import MobileDashboard from "@/components/Mobile/MobileDashboard";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

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

  // Fetch user's tasks for staff members
  const { data: myTasks } = useQuery({
    queryKey: ["/api/tasks/my"],
    enabled: !admin, // Only fetch for staff members
  });

  // Fetch today's tasks
  const { data: todayTasks } = useQuery({
    queryKey: ["/api/tasks/today"],
    enabled: !admin, // Only fetch for staff members
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

      {/* Task Dashboard for Staff */}
      {!admin && (myTasks?.length > 0 || todayTasks?.length > 0) && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* My Tasks */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                My Tasks ({myTasks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {myTasks?.slice(0, 3).map((task: any) => (
                  <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                    <div className="flex-shrink-0 mt-1">
                      {task.status === 'done' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="h-3 w-3 text-blue-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
                          task.status === 'done' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status === 'in_progress' ? 'In Progress' : task.status}
                        </span>
                        {task.priority === 'high' && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            High
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!myTasks || myTasks.length === 0) && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-muted-foreground text-xs">No tasks assigned</p>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => setLocation('/tasks')}
                variant="outline" 
                size="sm"
                className="w-full mt-2 text-xs"
              >
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Today ({todayTasks?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {todayTasks?.slice(0, 3).map((task: any) => (
                  <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50/50 border border-yellow-100/50">
                    <div className="flex-shrink-0 mt-1">
                      {task.status === 'done' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="h-3 w-3 text-blue-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
                          task.status === 'done' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status === 'in_progress' ? 'In Progress' : task.status}
                        </span>
                        {task.priority === 'high' && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            High
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!todayTasks || todayTasks.length === 0) && (
                  <div className="text-center py-4">
                    <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-muted-foreground text-xs">No tasks due today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compact Quick Actions & Recent Activity */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setLocation('/products/new')}>
                <Package className="h-5 w-5 text-primary mb-1" />
                <span className="text-xs font-medium text-center">Add Product</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setLocation('/inventory-movement')}>
                <TrendingUp className="h-5 w-5 text-primary mb-1" />
                <span className="text-xs font-medium text-center">Stock Move</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setLocation('/attendance')}>
                <Clock className="h-5 w-5 text-primary mb-1" />
                <span className="text-xs font-medium text-center">Check In</span>
              </div>

            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
                recentActivity.slice(0, 6).map((activity: any, index: number) => (
                  <div key={index} className="flex items-start space-x-2 py-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-tight">{String(activity.description || 'Activity')}</p>
                      <p className="text-xs text-muted-foreground">{String(activity.time || 'Recently')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-muted-foreground text-xs">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}