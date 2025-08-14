import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  FileBarChart,
  Calendar,
  Filter
} from "lucide-react";

interface ReportFilters {
  dateRange: string;
  type: string;
  category: string;
}

interface CategorySummary {
  category: string;
  totalItems: number;
  totalValue: number;
  inStock: number;
  lowStock: number;
  stockHealth: number;
}

interface ReportStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  pendingRequests: number;
  categorySummary: CategorySummary[];
  detailedData: any[];
  reportType: string;
}

const getReportTitle = (type: string) => {
  switch (type) {
    case 'inventory': return 'Detailed Inventory Report';
    case 'requests': return 'Material Requests Report'; 
    case 'low-stock': return 'Low Stock Alert Report';
    case 'financial': return 'Financial Summary Report';
    default: return 'Report';
  }
};

const renderDetailedTable = (type: string, data: any[]) => {
  switch (type) {
    case 'inventory':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead className="text-center">Current Stock</TableHead>
              <TableHead className="text-center">Min Stock</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Total Value (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-gray-600">{product.sku || '-'}</TableCell>
                <TableCell className="text-right">{product.price.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <span className={`font-medium ${
                    product.stockQuantity >= product.minStockLevel 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {product.stockQuantity}
                  </span>
                </TableCell>
                <TableCell className="text-center">{product.minStockLevel}</TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.stockStatus === 'In Stock'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {product.stockStatus}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {product.totalValue.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
      
    case 'requests':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Order Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Total Value (₹)</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.id}</TableCell>
                <TableCell>{request.clientName}</TableCell>
                <TableCell>{request.orderNumber}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    request.status === 'completed' ? 'bg-green-100 text-green-700' :
                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {request.status}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    request.priority === 'high' ? 'bg-red-100 text-red-700' :
                    request.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {request.priority}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {request.totalValue.toLocaleString()}
                </TableCell>
                <TableCell>{request.requestedBy}</TableCell>
                <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
      
    case 'low-stock':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Current Stock</TableHead>
              <TableHead className="text-center">Min Stock</TableHead>
              <TableHead className="text-center">Deficit</TableHead>
              <TableHead className="text-right">Unit Price (₹)</TableHead>
              <TableHead className="text-right">Reorder Value (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-gray-600">{product.sku || '-'}</TableCell>
                <TableCell className="text-center">
                  <span className="text-red-600 font-medium">{product.currentStock}</span>
                </TableCell>
                <TableCell className="text-center">{product.minStockLevel}</TableCell>
                <TableCell className="text-center">
                  <span className="text-red-600 font-medium">-{product.deficit}</span>
                </TableCell>
                <TableCell className="text-right">{product.price.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">
                  {product.reorderValue.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
      
    case 'financial':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Unit Price (₹)</TableHead>
              <TableHead className="text-center">Stock Quantity</TableHead>
              <TableHead className="text-right">Total Value (₹)</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-right">{product.price.toLocaleString()}</TableCell>
                <TableCell className="text-center">{product.stockQuantity}</TableCell>
                <TableCell className="text-right font-medium">
                  {product.totalValue.toLocaleString()}
                </TableCell>
                <TableCell>{new Date(product.lastUpdated).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
      
    default:
      return <p>No data available</p>;
  }
};

async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    credentials: 'include',
  });
}

export default function ReportsView() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "month",
    type: "inventory",
    category: "all",
  });
  
  const { toast } = useToast();

  // Fetch report data with proper error handling
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['reports', filters],
    queryFn: async (): Promise<ReportStats> => {
      const params = new URLSearchParams({
        dateRange: filters.dateRange,
        type: filters.type,
        category: filters.category,
      });
      const response = await authenticatedFetch(`/api/reports/dashboard?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }
      return response.json();
    },
    retry: 3,
    staleTime: 30000, // 30 seconds
  });

  // Fetch categories from products for dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const handleExport = async (reportType: 'inventory' | 'requests' | 'low-stock') => {
    try {
      const endpoint = `/api/reports/export/${reportType}`;
      const response = await authenticatedFetch(endpoint, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `${reportType} report has been downloaded.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Reports</h3>
              <p className="text-gray-600 mb-4">Unable to fetch report data from the server.</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Configuration
          </CardTitle>
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
                  <SelectItem value="low-stock">Low Stock Alert</SelectItem>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                className="w-full"
                onClick={() => {
                  // Force refresh with new filters
                  window.location.search = `?dateRange=${filters.dateRange}&type=${filters.type}&category=${filters.category}`;
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleExport('inventory')}>
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
              {isLoading ? "..." : reportData?.totalProducts || 0} items
            </div>
            <div className="text-sm text-gray-600">
              Total Value: ₹{isLoading ? "..." : reportData?.totalValue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleExport('low-stock')}>
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
              {isLoading ? "..." : reportData?.lowStockItems || 0} items
            </div>
            <div className="text-sm text-gray-600">Requires immediate attention</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleExport('requests')}>
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
              {isLoading ? "..." : reportData?.pendingRequests || 0} pending
            </div>
            <div className="text-sm text-gray-600">Active requests in workflow</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5" />
              {getReportTitle(filters.type)}
            </CardTitle>
            <div className="text-sm text-gray-600">
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading inventory data...</p>
            </div>
          ) : reportData?.detailedData && reportData.detailedData.length > 0 ? (
            <div className="overflow-x-auto">
              {filters.category !== 'all' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Filtered by:</strong> {filters.category} category, {filters.dateRange} timeframe
                  </p>
                </div>
              )}
              {renderDetailedTable(filters.type, reportData.detailedData)}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileBarChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No data available for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}