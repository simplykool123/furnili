import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import Layout from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  ArrowRight,
  Eye
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const user = authService.getUser();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Layout title="Dashboard" subtitle="Overview of your inventory management system">
        <div className="space-y-6">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const formatValue = (value: number) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toFixed(0)}`;
  };

  return (
    <Layout title="Dashboard" subtitle={`Welcome back, ${user?.name}`}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalProducts || 0}
                  </p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Active inventory
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Pending Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.pendingRequests || 0}
                  </p>
                  <p className="text-sm text-yellow-600 flex items-center mt-1">
                    <Clock className="w-4 h-4 mr-1" />
                    Needs attention
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.lowStockItems || 0}
                  </p>
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Urgent restock
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatValue(stats?.totalValue || 0)}
                  </p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Total worth
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Material Requests */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Material Requests
                </CardTitle>
                <Link href="/requests">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.recentRequests?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentRequests.slice(0, 5).map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{request.clientName}</p>
                          <p className="text-sm text-gray-600">{request.orderNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                            request.status === 'issued' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                            'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent requests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Low Stock Alerts
                </CardTitle>
                <Link href="/products?stockStatus=low-stock">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.lowStockProducts?.length > 0 ? (
                <div className="space-y-4">
                  {stats.lowStockProducts.slice(0, 5).map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{product.currentStock}</p>
                        <p className="text-sm text-gray-600">Min: {product.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>All products are well stocked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {user && ['admin', 'manager'].includes(user.role) && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link href="/products">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <Package className="w-6 h-6 mb-2" />
                    Manage Products
                  </Button>
                </Link>
                
                <Link href="/requests">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <FileText className="w-6 h-6 mb-2" />
                    View Requests
                  </Button>
                </Link>
                
                {user.role === 'manager' && (
                  <Link href="/boq">
                    <Button variant="outline" className="w-full h-20 flex-col">
                      <FileText className="w-6 h-6 mb-2" />
                      Upload BOQ
                    </Button>
                  </Link>
                )}
                
                <Link href="/reports">
                  <Button variant="outline" className="w-full h-20 flex-col">
                    <TrendingUp className="w-6 h-6 mb-2" />
                    View Reports
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
