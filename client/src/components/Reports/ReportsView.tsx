import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileBarChart, Package, AlertTriangle, TrendingUp } from "lucide-react";

interface ReportFilters {
  dateRange: string;
  type: string;
  category: string;
  client: string;
}

export default function ReportsView() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "month",
    type: "inventory",
    category: "",
    client: "",
  });
  
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/products');
      return response.json();
    },
  });

  const exportReport = async (reportType: string) => {
    try {
      let endpoint = '';
      switch (reportType) {
        case 'inventory':
          endpoint = '/api/export/products';
          break;
        case 'requests':
          endpoint = '/api/export/requests';
          break;
        case 'low-stock':
          endpoint = '/api/export/low-stock';
          break;
        default:
          return;
      }

      const response = await authenticatedApiRequest('GET', endpoint);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `${reportType} report has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  const generateReport = () => {
    toast({
      title: "Report generated",
      description: "Report has been generated successfully.",
    });
  };

  // Group products by category for summary
  const getCategorySummary = () => {
    if (!products) return [];
    
    const categories = products.reduce((acc: any, product: any) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          name: product.category,
          totalItems: 0,
          inStock: 0,
          lowStock: 0,
          totalValue: 0,
        };
      }
      
      acc[product.category].totalItems += 1;
      acc[product.category].totalValue += (product.pricePerUnit || 0) * product.currentStock;
      
      if (product.currentStock > product.minStock) {
        acc[product.category].inStock += 1;
      } else if (product.currentStock <= product.minStock && product.currentStock > 0) {
        acc[product.category].lowStock += 1;
      }
      
      return acc;
    }, {});
    
    return Object.values(categories);
  };

  const categorySummary = getCategorySummary();

  return (
    <div className="space-y-6">
      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date Range</Label>
              <Select 
                value={filters.dateRange}
                onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Report Type</Label>
              <Select 
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="requests">Material Requests</SelectItem>
                  <SelectItem value="low-stock">Low Stock Items</SelectItem>
                  <SelectItem value="financial">Financial Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Category</Label>
              <Select 
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.from(new Set((products || []).map((p: any) => p.category))).map((category: string) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={generateReport} className="flex-1">
                <FileBarChart className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => exportReport('inventory')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="font-semibold text-lg mb-2">Current Inventory</h3>
            <p className="text-gray-600 text-sm mb-4">
              Export complete product inventory with stock levels and values
            </p>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalProducts || 0} items
            </div>
            <div className="text-sm text-gray-600">
              Total Value: ₹{((stats?.totalValue || 0) / 100000).toFixed(1)}L
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => exportReport('low-stock')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="font-semibold text-lg mb-2">Low Stock Items</h3>
            <p className="text-gray-600 text-sm mb-4">
              Export products below minimum stock threshold
            </p>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.lowStockItems || 0} items
            </div>
            <div className="text-sm text-red-600">Requires immediate attention</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => exportReport('requests')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="font-semibold text-lg mb-2">Material Requests</h3>
            <p className="text-gray-600 text-sm mb-4">
              Export request history with client and status details
            </p>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.pendingRequests || 0} pending
            </div>
            <div className="text-sm text-gray-600">This month</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Summary by Category</CardTitle>
            <div className="text-sm text-gray-600">
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead>In Stock</TableHead>
                  <TableHead>Low Stock</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Stock Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorySummary.map((category: any, index) => {
                  const stockHealthPercentage = category.totalItems > 0 
                    ? (category.inStock / category.totalItems) * 100 
                    : 0;
                    
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.totalItems}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{category.inStock}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600 font-medium">{category.lowStock}</span>
                      </TableCell>
                      <TableCell>₹{category.totalValue.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${stockHealthPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {stockHealthPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {categorySummary.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileBarChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No data available for report</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
