import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Edit, Phone, Mail, Building, MapPin, Calendar, FileText } from "lucide-react";
import { useForm } from "react-hook-form";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  company: string;
  source: string;
  status: 'active' | 'inactive' | 'prospect';
  totalValue: number;
  totalOrders: number;
  lastContact: string;
  notes: string;
  createdAt: string;
}

export default function Customers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['/api/crm/customers'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/customers')
  });

  // Mutation for creating/updating customers
  const customerMutation = useMutation({
    mutationFn: (data: any) => {
      const url = editingCustomer ? `/api/crm/customers/${editingCustomer.id}` : '/api/crm/customers';
      const method = editingCustomer ? 'PATCH' : 'POST';
      return authenticatedApiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: `Customer ${editingCustomer ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/customers'] });
      setIsDialogOpen(false);
      form.reset();
      setEditingCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingCustomer ? 'update' : 'create'} customer`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset(customer);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      prospect: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'} capitalize`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your converted customers and clients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCustomer(null);
              form.reset();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit' : 'Add'} Customer</DialogTitle>
              <DialogDescription>
                {editingCustomer ? 'Update customer information and details.' : 'Create a new customer record with contact information.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => customerMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input {...form.register('name', { required: true })} placeholder="Full name" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input {...form.register('phone', { required: true })} placeholder="Phone number" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input {...form.register('email')} type="email" placeholder="Email address" />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input {...form.register('company')} placeholder="Company name" />
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select onValueChange={(value) => form.setValue('source', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="google-ads">Google Ads</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => form.setValue('status', value)}>
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
                  <Label htmlFor="totalValue">Total Value</Label>
                  <Input {...form.register('totalValue')} type="number" placeholder="Total business value" />
                </div>
                <div>
                  <Label htmlFor="totalOrders">Total Orders</Label>
                  <Input {...form.register('totalOrders')} type="number" placeholder="Number of orders" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea {...form.register('address')} placeholder="Full address" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea {...form.register('notes')} placeholder="Additional notes and preferences" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={customerMutation.isPending}>
                  {customerMutation.isPending ? 'Saving...' : 'Save Customer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Customer List</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedCustomer}>Customer Details</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                All Customers ({customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: Customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{customer.source} customer</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {customer.phone}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.company || 'Individual'}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>₹{customer.totalValue?.toLocaleString() || '0'}</TableCell>
                      <TableCell>{customer.totalOrders || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(customer)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(customer)}>
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No customers found. Add your first customer to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {selectedCustomer && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Name</Label>
                      <p className="font-medium">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Phone</Label>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p>{selectedCustomer.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Company</Label>
                      <p>{selectedCustomer.company || 'Individual'}</p>
                    </div>
                  </div>
                  {selectedCustomer.address && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Address</Label>
                      <p>{selectedCustomer.address}</p>
                    </div>
                  )}
                  {selectedCustomer.notes && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Notes</Label>
                      <p>{selectedCustomer.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedCustomer.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Total Value</Label>
                    <p className="text-lg font-semibold text-green-600">₹{selectedCustomer.totalValue?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Total Orders</Label>
                    <p className="text-lg font-semibold">{selectedCustomer.totalOrders || 0}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Customer Since</Label>
                    <p>{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}