import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, TrendingUp, Users, Target, Calendar, DollarSign } from "lucide-react";

export default function CRMReports() {
  const [dateRange, setDateRange] = useState('last30days');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Fetch CRM statistics and data
  const { data: crmStats } = useQuery({
    queryKey: ['/api/crm/stats'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/stats')
  });

  const { data: leadsData } = useQuery({
    queryKey: ['/api/crm/leads'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/leads')
  });

  const { data: customersData } = useQuery({
    queryKey: ['/api/crm/customers'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/customers')
  });

  const { data: dealsData } = useQuery({
    queryKey: ['/api/crm/deals'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/deals')
  });

  // Process data for charts
  const getLeadsFunnelData = () => {
    if (!leadsData) return [];
    
    const statusCounts = leadsData.reduce((acc: any, lead: any) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'New', value: statusCounts.new || 0, color: '#3B82F6' },
      { name: 'Contacted', value: statusCounts.contacted || 0, color: '#F59E0B' },
      { name: 'Qualified', value: statusCounts.qualified || 0, color: '#8B5CF6' },
      { name: 'Converted', value: statusCounts.converted || 0, color: '#10B981' },
      { name: 'Lost', value: statusCounts.lost || 0, color: '#EF4444' },
    ];
  };

  const getSourceAnalysis = () => {
    if (!leadsData) return [];
    
    const sourceCounts = leadsData.reduce((acc: any, lead: any) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(sourceCounts).map(([source, count]) => ({
      source: source || 'Unknown',
      leads: count,
      conversion: Math.floor(Math.random() * 30) + 10 // Mock conversion rate
    }));
  };

  const getStaffPerformance = () => {
    if (!leadsData) return [];
    
    const staffStats = leadsData.reduce((acc: any, lead: any) => {
      const staff = lead.assignedTo || 'Unassigned';
      if (!acc[staff]) {
        acc[staff] = { name: staff, leads: 0, conversions: 0 };
      }
      acc[staff].leads += 1;
      if (lead.status === 'converted') {
        acc[staff].conversions += 1;
      }
      return acc;
    }, {});

    return Object.values(staffStats).map((staff: any) => ({
      ...staff,
      conversionRate: staff.leads > 0 ? Math.round((staff.conversions / staff.leads) * 100) : 0
    }));
  };

  const getMonthlyTrends = () => {
    // Mock monthly trend data
    return [
      { month: 'Jan', leads: 45, customers: 12, deals: 8 },
      { month: 'Feb', leads: 52, customers: 15, deals: 11 },
      { month: 'Mar', leads: 48, customers: 18, deals: 13 },
      { month: 'Apr', leads: 61, customers: 22, deals: 16 },
      { month: 'May', leads: 55, customers: 19, deals: 14 },
      { month: 'Jun', leads: 67, customers: 25, deals: 18 },
    ];
  };

  const getMissedFollowUps = () => {
    // This would normally fetch from follow-ups API
    return [
      { id: 1, name: 'John Doe', phone: '+91 9876543210', dueDate: '2025-01-28', staff: 'Raj Kumar' },
      { id: 2, name: 'Jane Smith', phone: '+91 9876543211', dueDate: '2025-01-27', staff: 'Priya Sharma' },
    ];
  };

  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Reports</h1>
          <p className="text-gray-600">Analytics and insights for your CRM performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last90days">Last 90 Days</SelectItem>
              <SelectItem value="thisyear">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-blue-600">{crmStats?.activeLeads || 0}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-green-600">{crmStats?.totalCustomers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-purple-600">₹{crmStats?.pipelineValue?.toLocaleString() || '0'}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-orange-600">24%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Leads Funnel</TabsTrigger>
          <TabsTrigger value="performance">Staff Performance</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="followups">Missed Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getMonthlyTrends()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="customers" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="deals" stroke="#8B5CF6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getLeadsFunnelData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}: any) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getLeadsFunnelData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle>Leads Funnel Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getLeadsFunnelData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Staff-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Staff Member</th>
                      <th className="text-left p-2">Total Leads</th>
                      <th className="text-left p-2">Conversions</th>
                      <th className="text-left p-2">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getStaffPerformance().map((staff: any, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{staff.name}</td>
                        <td className="p-2">{staff.leads}</td>
                        <td className="p-2">{staff.conversions}</td>
                        <td className="p-2">
                          <Badge variant={staff.conversionRate > 20 ? "default" : "secondary"}>
                            {staff.conversionRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Lead Sources Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getSourceAnalysis()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4">
                <Button onClick={() => exportToCSV(getSourceAnalysis(), 'lead-sources')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Source Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Missed Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getMissedFollowUps().map((followUp) => (
                  <div key={followUp.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{followUp.name}</p>
                      <p className="text-sm text-gray-600">{followUp.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Due: {followUp.dueDate}</p>
                      <p className="text-sm text-gray-600">Assigned: {followUp.staff}</p>
                    </div>
                    <Badge variant="destructive">Overdue</Badge>
                  </div>
                ))}
                {getMissedFollowUps().length === 0 && (
                  <p className="text-center text-gray-500 py-8">No missed follow-ups found!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}