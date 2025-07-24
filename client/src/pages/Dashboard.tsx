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
  Quote
} from "lucide-react";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import StockWarnings from "@/components/Dashboard/StockWarnings";
import MobileDashboard from "@/components/Mobile/MobileDashboard";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";

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
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-900">
            Welcome, {currentUser?.name || 'Admin'}
          </h1>
          <p className="text-sm text-amber-800">
            Today's overview
          </p>
        </div>
        {dailyQuote && (
          <div className="hidden lg:block max-w-md">
            <div className="flex items-center space-x-2 text-xs text-amber-700">
              <Quote className="h-3 w-3" />
              <span className="italic">"{dailyQuote.text.length > 60 ? dailyQuote.text.substring(0, 60) + '...' : dailyQuote.text}"</span>
            </div>
          </div>
        )}
      </div>

      {/* Stock Warnings - Compact */}
      <StockWarnings />

      {/* Compact Stats Grid */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-foreground">{stats?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">Products</p>
              </div>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-red-600">
                  {Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0}
                </div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-foreground">{stats?.todayAttendance || 0}</div>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-purple-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-foreground">{stats?.activeTasks || 0}</div>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-indigo-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-foreground">{stats?.pendingRequests || 0}</div>
                <p className="text-xs text-muted-foreground">Requests</p>
              </div>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-yellow-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-foreground">
                  ₹{stats?.monthlyExpenses?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Expenses</p>
              </div>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Quick Actions & Recent Activity */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 grid-cols-3">
              <div className="flex flex-col items-center p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <Package className="h-5 w-5 text-primary mb-1" />
                <span className="text-xs font-medium text-center">Add Product</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <TrendingUp className="h-5 w-5 text-primary mb-1" />
                <span className="text-xs font-medium text-center">Stock Move</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
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