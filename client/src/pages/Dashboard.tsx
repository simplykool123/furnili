import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
  ArrowRight,
  LogIn,
  LogOut
} from "lucide-react";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import StockWarnings from "@/components/Dashboard/StockWarnings";
import MobileDashboard from "@/components/Mobile/MobileDashboard";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import { DashboardSkeleton } from "@/components/LoadingOptimizer";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import FurniliStatsCard from "@/components/UI/FurniliStatsCard";

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

  // Memoized daily quote to prevent re-calculation on each render
  const dailyQuoteIndex = useMemo(() => Math.floor(Math.random() * motivationalQuotes.length), []);
  
  // Select a quote on component mount
  useEffect(() => {
    setDailyQuote(motivationalQuotes[dailyQuoteIndex]);
  }, [dailyQuoteIndex]);

  // Optimized queries with caching for better performance
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/activity"],
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
  });

  // Fetch ongoing projects (not completed)
  const { data: ongoingProjects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => authenticatedApiRequest('GET', "/api/projects"),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: any[]) => data.filter(project => project.stage !== 'Completed'), // Filter out completed projects
  });

  // Fetch pending tasks for dashboard display
  const { data: pendingTasks = [] } = useQuery<DashboardTask[]>({
    queryKey: ["/api/dashboard/tasks"],
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
  });

  const { toast } = useToast();

  // Attendance queries for staff check-in functionality
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/attendance/today"],
    queryFn: () => authenticatedApiRequest('GET', "/api/attendance/today"),
    enabled: currentUser?.role === 'staff',
  });

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

  // Self check-in/out mutations for staff users
  const selfCheckInMutation = useMutation({
    mutationFn: async (data: { location?: string; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/checkin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-in failed", description: String(error), variant: "destructive" });
    },
  });

  const selfCheckOutMutation = useMutation({
    mutationFn: async () => {
      return authenticatedApiRequest("POST", "/api/attendance/checkout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-out failed", description: String(error), variant: "destructive" });
    },
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Use mobile dashboard for mobile devices
  if (isMobile) {
    return <MobileDashboard onMenuClick={() => {
      // Trigger sidebar toggle event for mobile
      window.dispatchEvent(new CustomEvent('toggleMobileSidebar'));
    }} />;
  }

  return (
    <FurniliLayout
      title={`Welcome back, ${currentUser?.name || 'Admin'}!`}
      subtitle="Here's your business overview and key metrics for today."
    >
      {/* Daily Motivation Quote */}
      {dailyQuote && (
        <FurniliCard variant="gradient" className="border-l-4 border-l-primary">
          <div className="flex items-start space-x-4">
            <div className="furnili-gradient p-3 rounded-lg">
              <Quote className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <blockquote className="text-base font-medium text-foreground leading-relaxed">
                "{dailyQuote.text}"
              </blockquote>
              <cite className="block text-right text-muted-foreground font-semibold mt-3 text-sm">
                — {dailyQuote.author}
              </cite>
            </div>
          </div>
        </FurniliCard>
      )}

      {/* Staff Check-In/Out Widget - Compact Version for staff users */}
      {currentUser?.role === 'staff' && (
        <Card className="shadow-md border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-800 text-base">
              <Clock className="w-4 h-4" />
              My Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              const myTodayRecord = todayAttendance.find((a: any) => a.userId === currentUser.id);
              const formatTime = (timeString: string | null) => {
                if (!timeString) return "-";
                return new Date(timeString).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit"
                });
              };
              
              return (
                <div className="space-y-3">
                  {/* Compact Status Display */}
                  <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-green-800 text-sm">Today's Status</h4>
                        <p className="text-xs text-green-600">
                          {new Date().toLocaleDateString("en-IN", { 
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      </div>
                      <div>
                        {myTodayRecord ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                            Present
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 border-gray-300 text-xs">
                            Not Checked In
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Compact Time Display */}
                    {myTodayRecord && (
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">Check In:</span>
                          <span className="font-semibold">{formatTime(myTodayRecord.checkInTime)}</span>
                        </div>
                        {myTodayRecord.checkOutTime && (
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">Check Out:</span>
                            <span className="font-semibold">{formatTime(myTodayRecord.checkOutTime)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compact Action Button */}
                  <div className="flex justify-center">
                    {!myTodayRecord ? (
                      <Button
                        size="sm"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => selfCheckInMutation.mutate({})}
                        disabled={selfCheckInMutation.isPending}
                      >
                        <LogIn className="w-4 h-4 mr-1" />
                        {selfCheckInMutation.isPending ? 'Checking In...' : 'Check In'}
                      </Button>
                    ) : !myTodayRecord.checkOutTime ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-4 py-2 border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => selfCheckOutMutation.mutate()}
                        disabled={selfCheckOutMutation.isPending}
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        {selfCheckOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                      </Button>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-medium">Attendance Complete</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) as React.ReactElement;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Stock Warnings */}
      <StockWarnings />

      {/* Stats Grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-card to-blue-50/20 cursor-pointer" onClick={() => setLocation('/products')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-semibold text-card-foreground">Products</CardTitle>
            <Package className="h-3 w-3 text-blue-600" />
          </CardHeader>
          <CardContent className="pb-2 pt-1">
            <div className="text-xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Active items</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 bg-gradient-to-br from-card to-red-50/20 cursor-pointer" onClick={() => setLocation('/products?filter=low-stock')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-semibold text-card-foreground">Low Stock</CardTitle>
            <AlertTriangle className="h-3 w-3 text-red-600" />
          </CardHeader>
          <CardContent className="pb-2 pt-1">
            <div className="text-xl font-bold text-red-600">
              {Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Need restocking</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500 bg-gradient-to-br from-card to-orange-50/20 cursor-pointer" onClick={() => setLocation('/attendance')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-semibold text-card-foreground">Attendance</CardTitle>
            <Clock className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="pb-2 pt-1">
            <div className="text-xl font-bold text-foreground">{stats?.todayAttendance || 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Staff today</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 bg-gradient-to-br from-card to-purple-50/20 cursor-pointer" onClick={() => setLocation('/attendance')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-semibold text-card-foreground">Staff & Payroll</CardTitle>
            <CheckCircle className="h-3 w-3 text-purple-600" />
          </CardHeader>
          <CardContent className="pb-2 pt-1">
            <div className="text-xl font-bold text-foreground">{stats?.activeTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Manage staff</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500 bg-gradient-to-br from-card to-indigo-50/20 cursor-pointer" onClick={() => setLocation('/requests')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-semibold text-card-foreground">Requests</CardTitle>
            <TrendingUp className="h-3 w-3 text-indigo-600" />
          </CardHeader>
          <CardContent className="pb-2 pt-1">
            <div className="text-xl font-bold text-foreground">{stats?.pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500 bg-gradient-to-br from-card to-yellow-50/20 cursor-pointer" onClick={() => setLocation('/petty-cash')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-semibold text-card-foreground">Expenses</CardTitle>
            <DollarSign className="h-3 w-3 text-yellow-600" />
          </CardHeader>
          <CardContent className="pb-2 pt-1">
            <div className="text-xl font-bold text-foreground">
              ₹{stats?.monthlyExpenses?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Removed animated "New Messages" section - keeping only clean "Pending Tasks" section below */}

      {/* Pending Tasks Section - Similar to Recent Activity */}
      {pendingTasks && pendingTasks.length > 0 && (
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Pending Tasks ({pendingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingTasks.slice(0, 5).map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-start gap-2 p-3 rounded-lg bg-red-50/50 border border-red-200/50 hover:bg-red-50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                >
                  <div className="flex-shrink-0 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : 
                                task.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-gray-500">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {pendingTasks.length > 5 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setLocation('/tasks')}
                >
                  View All {pendingTasks.length} Tasks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Tasks Message */}
      {pendingTasks && pendingTasks.length === 0 && (
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">All caught up!</p>
                <p className="text-xs text-green-700">You have no pending tasks at the moment.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ongoing Projects Section */}
      {ongoingProjects && ongoingProjects.length > 0 && (
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ongoing Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {ongoingProjects.slice(0, 8).map((project: any) => (
                <div 
                  key={project.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-gray-50/50 border border-gray-100/50 hover:bg-gray-100/50 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 min-w-fit">
                      {project.code}
                    </p>
                    <Badge 
                      variant={
                        project.stage === 'Production' ? 'default' :
                        project.stage === 'Installation' ? 'secondary' :
                        project.stage === 'Client Approved' ? 'destructive' :
                        'outline'
                      }
                      className="text-xs min-w-fit"
                    >
                      {project.stage}
                    </Badge>
                    <p className="text-xs text-gray-600 truncate">
                      {project.name} - {project.clientName}
                    </p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
            {ongoingProjects.length > 8 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setLocation('/projects')}
                >
                  View All {ongoingProjects.length} Ongoing Projects
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Ongoing Projects Message */}
      {ongoingProjects && ongoingProjects.length === 0 && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">All projects completed!</p>
                <p className="text-xs text-blue-700">No ongoing projects at the moment.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </FurniliLayout>
  );
}