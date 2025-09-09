import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, TableSkeleton, CardSkeleton } from "@/components/Performance/LoadingSpinner";
import { ErrorBoundary } from "@/components/Performance/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, ClockIcon, Package, Users, AlertTriangle, CheckCircle, Plus, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { apiRequest } from "@/lib/queryClient";
import type { WorkOrder, ProductionSchedule, QualityCheck } from "@shared/schema";

interface ProductionStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedToday: number;
  pendingQuality: number;
  capacityUtilization: number;
}

interface DashboardData {
  stats: ProductionStats;
  recentWorkOrders: WorkOrder[];
  todaySchedule: ProductionSchedule[];
  pendingQualityChecks: QualityCheck[];
}

const workOrderSchema = z.object({
  projectId: z.number().min(1, "Project is required"),
  quoteId: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  orderType: z.enum(["manufacturing", "assembly", "finishing", "packaging"]).default("manufacturing"),
  totalQuantity: z.number().min(1, "Quantity must be at least 1"),
  specifications: z.string().optional(),
  estimatedStartDate: z.string(),
  estimatedEndDate: z.string(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

export default function ProductionPlanning() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateWorkOrderDialogOpen, setIsCreateWorkOrderDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/production/dashboard'],
  });

  // Fetch projects for work order creation
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch quotes for work order creation
  const { data: quotes = [] } = useQuery({
    queryKey: ['/api/quotes'],
  });

  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: (data: WorkOrderFormData) =>
      apiRequest('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/production/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      setIsCreateWorkOrderDialogOpen(false);
      form.reset();
      toast({ title: "Work order created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating work order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      orderType: "manufacturing",
      totalQuantity: 1,
      specifications: "",
      estimatedStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const onSubmit = (data: WorkOrderFormData) => {
    createWorkOrderMutation.mutate({
      ...data,
      estimatedStartDate: new Date(data.estimatedStartDate).toISOString(),
      estimatedEndDate: new Date(data.estimatedEndDate).toISOString(),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'paused': return 'bg-orange-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <ResponsiveLayout title="Production Planning" subtitle="Loading...">
        <div className="p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-80" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
              <div className="h-10 bg-gray-200 rounded animate-pulse w-40" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <TableSkeleton rows={6} cols={4} />
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  const stats = dashboardData?.stats || {
    totalWorkOrders: 0,
    activeWorkOrders: 0,
    completedToday: 0,
    pendingQuality: 0,
    capacityUtilization: 0,
  };

  return (
    <ErrorBoundary>
      <ResponsiveLayout
        title="Production Planning"
        subtitle="Manufacturing workflow and capacity management"
        showAddButton={true}
        onAddClick={() => setIsCreateWorkOrderDialogOpen(true)}
      >
        <div className="space-y-6">
          <div className="flex gap-2">
            <Dialog open={isCreateWorkOrderDialogOpen} onOpenChange={setIsCreateWorkOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  data-testid="button-create-work-order"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Work Order</DialogTitle>
                  <DialogDescription>
                    Create a new production work order for manufacturing
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(projects as any[])?.map((project: any) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name} ({project.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quoteId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quote (Optional)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select quote (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(quotes as any[])?.map((quote: any) => (
                                  <SelectItem key={quote.quote.id} value={quote.quote.id.toString()}>
                                    {quote.quote.quoteNumber} - {quote.quote.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Order Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter work order title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter work order description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="orderType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="assembly">Assembly</SelectItem>
                                <SelectItem value="finishing">Finishing</SelectItem>
                                <SelectItem value="packaging">Packaging</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="totalQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="estimatedStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimatedEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="specifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specifications</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter technical specifications" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateWorkOrderDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createWorkOrderMutation.isPending}
                      >
                        {createWorkOrderMutation.isPending ? "Creating..." : "Create Work Order"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button 
              data-testid="button-schedule-production"
              onClick={() => setLocation('/production/work-orders')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Manage Work Orders
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-orders">
                {stats.totalWorkOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-active-orders">
                {stats.activeWorkOrders}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-completed-today">
                {stats.completedToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Quality</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-pending-quality">
                {stats.pendingQuality}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capacity Utilization</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-capacity-utilization">
                {stats.capacityUtilization}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search work orders, projects, or clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="work-orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="schedule">Today's Schedule</TabsTrigger>
            <TabsTrigger value="quality">Quality Control</TabsTrigger>
            <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="work-orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Work Orders</CardTitle>
                <CardDescription>
                  Latest production orders and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.recentWorkOrders?.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      data-testid={`work-order-${order.id}`}
                      onClick={() => setLocation(`/production/work-orders/${order.id}`)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.orderNumber}</span>
                          <Badge className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                          {order.projectId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/projects/${order.projectId}`);
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Project {order.projectId}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{order.title}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Type: {order.orderType}</span>
                          <span>Qty: {order.totalQuantity}</span>
                          {order.estimatedStartDate && (
                            <span>Start: {format(new Date(order.estimatedStartDate), 'MMM dd')}</span>
                          )}
                          {order.clientId && (
                            <span>Client ID: {order.clientId}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className={`${getStatusColor(order.status)} text-white`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {order.createdAt && format(new Date(order.createdAt), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">No work orders found</h3>
                      <p className="mb-4">Create your first work order to get started with production planning.</p>
                      <Button 
                        onClick={() => setIsCreateWorkOrderDialogOpen(true)}
                        className="mb-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Work Order
                      </Button>
                      <p className="text-sm text-gray-500">
                        Or approve quotes in projects to automatically create work orders.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Production Schedule</CardTitle>
                    <CardDescription>
                      Scheduled operations for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="w-auto"
                    />
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Schedule
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.todaySchedule?.length ? dashboardData.todaySchedule.map((schedule) => (
                    <div 
                      key={schedule.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`schedule-${schedule.id}`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{schedule.workstationName}</div>
                        <p className="text-sm text-muted-foreground">{schedule.operationType}</p>
                        <div className="text-xs text-muted-foreground">
                          {schedule.startTime} - {schedule.endTime} ({schedule.duration} min)
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(schedule.status)} text-white`}>
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="space-y-4">
                      {/* Show sample/realistic schedule when no data */}
                      {[
                        { time: '09:00 - 12:00', station: 'Wood Cutting Station', task: 'Office Table Components', operator: 'Rajesh Kumar', workOrder: 'WO-001' },
                        { time: '09:30 - 11:30', station: 'Assembly Station 1', task: 'Cabinet Assembly', operator: 'Amit Singh', workOrder: 'WO-002' },
                        { time: '10:00 - 12:00', station: 'Quality Control', task: 'Final Inspection - Wardrobe', operator: 'Priya Sharma', workOrder: 'WO-003' },
                        { time: '14:00 - 17:00', station: 'Finishing Station', task: 'Polish and Varnish', operator: 'Available', workOrder: 'Pending Assignment' },
                        { time: '15:00 - 16:30', station: 'Hardware Installation', task: 'Drawer Fittings', operator: 'Suresh Patel', workOrder: 'WO-001' },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{item.station}</span>
                              <Badge variant="outline">{item.workOrder}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.task}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>⏰ {item.time}</span>
                              <span>👤 {item.operator}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={`${index < 3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {index < 3 ? 'In Progress' : 'Scheduled'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Schedule production tasks for your work orders
                        </p>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Schedule
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Quality Checks</CardTitle>
                <CardDescription>
                  Items awaiting quality inspection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.pendingQualityChecks?.map((check) => (
                    <div 
                      key={check.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`quality-check-${check.id}`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{check.checkNumber}</div>
                        <p className="text-sm text-muted-foreground">
                          {check.checkType} - {check.inspectionStage}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Qty: {check.quantityInspected}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                          {check.overallStatus}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending quality checks.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capacity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Capacity Planning</CardTitle>
                <CardDescription>
                  Workstation utilization and capacity overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Capacity Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Weekly Capacity</p>
                            <p className="text-2xl font-bold">85%</p>
                          </div>
                          <Users className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Available Hours</p>
                            <p className="text-2xl font-bold">120h</p>
                          </div>
                          <ClockIcon className="h-8 w-8 text-green-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          480h total this week
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Workstations</p>
                            <p className="text-2xl font-bold">6</p>
                          </div>
                          <Package className="h-8 w-8 text-orange-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          4 active, 2 available
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Workstation Status */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">Workstation Status</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Wood Cutting Station', status: 'busy', operator: 'Rajesh Kumar', currentTask: 'Office Table Components', progress: 75 },
                        { name: 'Assembly Station 1', status: 'busy', operator: 'Amit Singh', currentTask: 'Cabinet Assembly', progress: 45 },
                        { name: 'Finishing Station', status: 'available', operator: null, currentTask: null, progress: 0 },
                        { name: 'Quality Control', status: 'busy', operator: 'Priya Sharma', currentTask: 'Final Inspection', progress: 90 },
                        { name: 'Packaging Station', status: 'available', operator: null, currentTask: null, progress: 0 },
                        { name: 'Hardware Installation', status: 'busy', operator: 'Suresh Patel', currentTask: 'Drawer Fittings', progress: 30 },
                      ].map((station, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${station.status === 'busy' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <div>
                              <p className="font-medium">{station.name}</p>
                              {station.operator && (
                                <p className="text-sm text-muted-foreground">
                                  {station.operator} - {station.currentTask}
                                </p>
                              )}
                              {!station.operator && (
                                <p className="text-sm text-green-600">Available for new tasks</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={station.status === 'busy' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                              {station.status}
                            </Badge>
                            {station.progress > 0 && (
                              <div className="mt-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1">
                                  <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${station.progress}%` }}></div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{station.progress}%</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Quick Actions</h4>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Assign Workers
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Maintenance
                      </Button>
                      <Button variant="outline" size="sm">
                        <Package className="h-4 w-4 mr-2" />
                        Check Inventory
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ResponsiveLayout>
    </ErrorBoundary>
  );
}