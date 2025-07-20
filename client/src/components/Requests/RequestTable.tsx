import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Check, X, Truck, FileText, Download, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MaterialRequest {
  id: number;
  clientName: string;
  orderNumber: string;
  requestedByUser: { name: string; email: string };
  status: string;
  priority: string;
  totalValue: number;
  boqReference?: string;
  createdAt: string;
  items: any[];
}

export default function RequestTable() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    clientName: "",
  });
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authService.getUser();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/requests', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await authenticatedApiRequest('GET', `/api/requests?${params}`);
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await authenticatedApiRequest('PATCH', `/api/requests/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Status updated",
        description: "Request status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportRequests = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await authenticatedApiRequest('GET', `/api/export/requests?${params}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requests_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export requests data",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      approved: "bg-green-100 text-green-800 hover:bg-green-100",
      issued: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      completed: "bg-green-100 text-green-800 hover:bg-green-100",
      rejected: "bg-red-100 text-red-800 hover:bg-red-100",
    };
    
    return (
      <Badge className={statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles = {
      high: "bg-red-100 text-red-800 hover:bg-red-100",
      medium: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      low: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    
    return (
      <Badge className={priorityStyles[priority as keyof typeof priorityStyles]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const filteredRequests = requests?.filter((request: MaterialRequest) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return request.status === "pending";
    if (activeTab === "approved") return request.status === "approved";
    if (activeTab === "issued") return request.status === "issued";
    if (activeTab === "rejected") return request.status === "rejected";
    return true;
  }) || [];

  const getStatusCounts = () => {
    if (!requests) return { all: 0, pending: 0, approved: 0, issued: 0, rejected: 0 };
    
    return {
      all: requests.length,
      pending: requests.filter((r: MaterialRequest) => r.status === 'pending').length,
      approved: requests.filter((r: MaterialRequest) => r.status === 'approved').length,
      issued: requests.filter((r: MaterialRequest) => r.status === 'issued').length,
      rejected: requests.filter((r: MaterialRequest) => r.status === 'rejected').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="flex items-center gap-2">
                All Requests
                <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                Pending
                <Badge className="bg-yellow-100 text-yellow-800 ml-1">{statusCounts.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                Approved
                <Badge className="bg-green-100 text-green-800 ml-1">{statusCounts.approved}</Badge>
              </TabsTrigger>
              <TabsTrigger value="issued" className="flex items-center gap-2">
                Issued
                <Badge className="bg-blue-100 text-blue-800 ml-1">{statusCounts.issued}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                Rejected
                <Badge className="bg-red-100 text-red-800 ml-1">{statusCounts.rejected}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select 
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Client name..."
              value={filters.clientName}
              onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}
            />

            <Button onClick={exportRequests} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Details</TableHead>
                  <TableHead>Client Info</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request: MaterialRequest) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">REQ-{request.id.toString().padStart(4, '0')}</p>
                        <p className="text-sm text-gray-600">
                          By: {request.requestedByUser.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.clientName}</p>
                        <p className="text-sm text-gray-600">{request.orderNumber}</p>
                        {request.boqReference && (
                          <p className="text-sm text-blue-600">{request.boqReference}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.items?.length || 0} items</p>
                        <p className="text-sm text-gray-600">
                          {request.items?.slice(0, 2).map(item => item.product.name).join(', ')}
                          {(request.items?.length || 0) > 2 && '...'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>
                      <p className="font-medium">₹{request.totalValue.toFixed(2)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {user?.role === 'storekeeper' && request.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'approved' })}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {user?.role === 'storekeeper' && request.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'issued' })}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Truck className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Request Details - REQ-{selectedRequest?.id.toString().padStart(4, '0')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Request Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Client:</span> {selectedRequest.clientName}</p>
                    <p><span className="font-medium">Order Number:</span> {selectedRequest.orderNumber}</p>
                    <p><span className="font-medium">Requested By:</span> {selectedRequest.requestedByUser.name}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                    {selectedRequest.boqReference && (
                      <p><span className="font-medium">BOQ Reference:</span> {selectedRequest.boqReference}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Status Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Status:</span>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Priority:</span>
                      {getPriorityBadge(selectedRequest.priority)}
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">Total Value:</span> ₹{selectedRequest.totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-4">Requested Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Requested Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRequest.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-600">{item.product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.requestedQuantity} {item.product.unit}</TableCell>
                        <TableCell>₹{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>₹{item.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.product.currentStock >= item.requestedQuantity ? (
                            <Badge className="bg-green-100 text-green-800">Available</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Insufficient Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
