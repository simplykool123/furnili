import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ClockIcon, Package, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import Layout from "@/components/Layout/Layout";
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

export default function ProductionPlanning() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/production/dashboard'],
  });

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
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
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
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Production Planning</h1>
            <p className="text-muted-foreground">
              Manufacturing workflow and capacity management
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              data-testid="button-create-work-order"
            >
              <Package className="mr-2 h-4 w-4" />
              Create Work Order
            </Button>
            <Button data-testid="button-schedule-production">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Schedule Production
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
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      data-testid={`work-order-${order.id}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.orderNumber}</span>
                          <Badge className={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.title}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Type: {order.orderType}</span>
                          <span>Qty: {order.totalQuantity}</span>
                          {order.estimatedStartDate && (
                            <span>Start: {format(new Date(order.estimatedStartDate), 'MMM dd')}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className={`${getStatusColor(order.status)} text-white`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {order.completionPercentage}% complete
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No work orders found. Create your first work order to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Production Schedule</CardTitle>
                <CardDescription>
                  Scheduled operations for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.todaySchedule?.map((schedule) => (
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
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      No production scheduled for today.
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
                <div className="text-center py-8 text-muted-foreground">
                  Capacity planning dashboard coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}