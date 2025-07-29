import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Phone, Mail, Calendar, Plus, Edit, Trash2, Eye, TrendingUp, DollarSign, Target, Activity } from "lucide-react";
import { useForm } from "react-hook-form";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  status: 'active' | 'inactive' | 'prospect';
  totalOrders: number;
  totalValue: number;
  lastContact: string;
  source: string;
  createdAt: string;
}

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  source: string;
  value: number;
  assignedTo: string;
  notes: string;
  createdAt: string;
  followUpDate: string;
}

interface Deal {
  id: number;
  title: string;
  customerId: number;
  customerName: string;
  value: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
}

export default function CRM() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const customerForm = useForm();
  const leadForm = useForm();
  const dealForm = useForm();

  // Fetch CRM data
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/crm/customers'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/crm/customers');
      return response.json();
    }
  });

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['/api/crm/leads'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/crm/leads');
      return response.json();
    }
  });

  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['/api/crm/deals'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/crm/deals');
      return response.json();
    }
  });

  const { data: crmStats } = useQuery({
    queryKey: ['/api/crm/stats'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/crm/stats');
      return response.json();
    }
  });

  // Mutations
  const customerMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/crm/customers/${editingItem.id}` : '/api/crm/customers';
      const method = editingItem ? 'PATCH' : 'POST';
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/stats'] });
      setIsCustomerDialogOpen(false);
      setEditingItem(null);
      customerForm.reset();
      toast({ title: editingItem ? "Customer updated" : "Customer created" });
    }
  });

  const leadMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/crm/leads/${editingItem.id}` : '/api/crm/leads';
      const method = editingItem ? 'PATCH' : 'POST';
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/stats'] });
      setIsLeadDialogOpen(false);
      setEditingItem(null);
      leadForm.reset();
      toast({ title: editingItem ? "Lead updated" : "Lead created" });
    }
  });

  const dealMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/crm/deals/${editingItem.id}` : '/api/crm/deals';
      const method = editingItem ? 'PATCH' : 'POST';
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/stats'] });
      setIsDealDialogOpen(false);
      setEditingItem(null);
      dealForm.reset();
      toast({ title: editingItem ? "Deal updated" : "Deal created" });
    }
  });

  const handleEdit = (item: any, type: string) => {
    setEditingItem(item);
    if (type === 'customer') {
      customerForm.reset(item);
      setIsCustomerDialogOpen(true);
    } else if (type === 'lead') {
      leadForm.reset(item);
      setIsLeadDialogOpen(true);
    } else if (type === 'deal') {
      dealForm.reset(item);
      setIsDealDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    const colors = {
      customer: {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-800',
        prospect: 'bg-blue-100 text-blue-800'
      },
      lead: {
        new: 'bg-blue-100 text-blue-800',
        contacted: 'bg-yellow-100 text-yellow-800',
        qualified: 'bg-green-100 text-green-800',
        proposal: 'bg-purple-100 text-purple-800',
        won: 'bg-green-100 text-green-800',
        lost: 'bg-red-100 text-red-800'
      },
      deal: {
        prospecting: 'bg-blue-100 text-blue-800',
        qualification: 'bg-yellow-100 text-yellow-800',
        proposal: 'bg-purple-100 text-purple-800',
        negotiation: 'bg-orange-100 text-orange-800',
        'closed-won': 'bg-green-100 text-green-800',
        'closed-lost': 'bg-red-100 text-red-800'
      }
    };

    return (
      <Badge className={`${colors[type]?.[status] || 'bg-gray-100 text-gray-800'} capitalize`}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Relationship Management</h1>
          <p className="text-gray-600">Manage customers, leads, and deals</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {crmStats?.totalCustomers || customers.length}
                </div>
                <p className="text-xs text-gray-600">Active customers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {crmStats?.activeLeads || leads.filter(l => !['won', 'lost'].includes(l.status)).length}
                </div>
                <p className="text-xs text-gray-600">In pipeline</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{(crmStats?.pipelineValue || deals.reduce((sum, deal) => sum + (deal.value || 0), 0)).toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">Expected revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {crmStats?.conversionRate || '0'}%
                </div>
                <p className="text-xs text-gray-600">Lead to customer</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customers.slice(0, 5).map((customer: Customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.company}</p>
                      </div>
                      {getStatusBadge(customer.status, 'customer')}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Hot Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leads.filter((lead: Lead) => ['qualified', 'proposal'].includes(lead.status)).slice(0, 5).map((lead: Lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-gray-600">₹{lead.value?.toLocaleString()}</p>
                      </div>
                      {getStatusBadge(lead.status, 'lead')}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Customers</h2>
            <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  customerForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit' : 'Add'} Customer</DialogTitle>
                  <DialogDescription>
                    {editingItem ? 'Update customer information and contact details.' : 'Create a new customer record with contact information and details.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={customerForm.handleSubmit((data) => customerMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input {...customerForm.register('name', { required: true })} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input type="email" {...customerForm.register('email')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input {...customerForm.register('phone')} />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input {...customerForm.register('company')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea {...customerForm.register('address')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={customerForm.watch('status')} onValueChange={(value) => customerForm.setValue('status', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="source">Source</Label>
                      <Input {...customerForm.register('source')} placeholder="e.g., Website, Referral" />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={customerMutation.isPending}>
                      {customerMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: Customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.source}</p>
                        </div>
                      </TableCell>
                      <TableCell>{customer.company}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{customer.email}</p>
                          <p>{customer.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status, 'customer')}</TableCell>
                      <TableCell>₹{customer.totalValue?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(customer, 'customer')}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Similar tabs for Leads and Deals would continue here... */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Leads</h2>
            <Button onClick={() => {
              setEditingItem(null);
              leadForm.reset();
              setIsLeadDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead: Lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-gray-600">{lead.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{lead.company}</TableCell>
                      <TableCell>₹{lead.value?.toLocaleString() || '0'}</TableCell>
                      <TableCell>{getStatusBadge(lead.status, 'lead')}</TableCell>
                      <TableCell>{lead.source}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(lead, 'lead')}>
                          <Edit className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Deals</h2>
            <Button onClick={() => {
              setEditingItem(null);
              dealForm.reset();
              setIsDealDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Probability</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal: Deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell>{deal.customerName}</TableCell>
                      <TableCell>₹{deal.value?.toLocaleString() || '0'}</TableCell>
                      <TableCell>{getStatusBadge(deal.stage, 'deal')}</TableCell>
                      <TableCell>{deal.probability}%</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(deal, 'deal')}>
                          <Edit className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}