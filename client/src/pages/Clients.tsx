import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { insertClientSchema } from "@shared/schema";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Clients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useIsMobile();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const clientForm = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      address: "",
      contactPerson: "",
      phone: "",
      gstNumber: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await apiRequest('POST', '/api/clients', clientData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Client created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsCreateDialogOpen(false);
      clientForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/clients/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Client updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsEditDialogOpen(false);
      setEditingClient(null);
      clientForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest('DELETE', `/api/clients/${clientId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Client deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setClientToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitClient = (data: any) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data });
    } else {
      createClientMutation.mutate(data);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    clientForm.reset({
      name: client.name,
      email: client.email,
      mobile: client.mobile,
      city: client.city,
      address: client.address || "",
      contactPerson: client.contactPerson || "",
      phone: client.phone || "",
      gstNumber: client.gstNumber || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
  };

  // Filter clients based on search
  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.mobile.includes(searchTerm) ||
                         client.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && client.isActive;
  });

  if (isLoading) {
    return (
      <FurniliLayout title="Client Management" subtitle="Loading client data...">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </FurniliLayout>
    );
  }

  if (error) {
    const errorMessage = error?.message || "Failed to load clients";
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Invalid token') || errorMessage.includes('Access token required');
    
    return (
      <FurniliLayout title="Client Management" subtitle="Error loading client data">
        <div className="p-8">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isAuthError ? "Authentication Required" : "Error Loading Data"}
            </h3>
            <p className="text-gray-500 mb-4">
              {isAuthError 
                ? "Your session has expired. Please log in again to access client management features."
                : errorMessage
              }
            </p>
            {isAuthError ? (
              <Button onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                localStorage.removeItem('authUser');
                window.location.replace('/login');
              }}>
                Go to Login
              </Button>
            ) : (
              <Button onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
              }}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </FurniliLayout>
    );
  }

  return (
    <FurniliLayout title="Client Management" subtitle="Manage client information and contacts">
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600 mt-1">Manage client information and contacts</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* New Client Button */}
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Client</span>
            </Button>
          </div>

          {/* Table */}
          <FurniliCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Clients ({filteredClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700 font-medium">Name</TableHead>
                      <TableHead className="text-gray-700 font-medium">Email</TableHead>
                      <TableHead className="text-gray-700 font-medium">Mobile</TableHead>
                      <TableHead className="text-gray-700 font-medium">City</TableHead>
                      <TableHead className="text-gray-700 font-medium">Contact Person</TableHead>
                      <TableHead className="text-gray-700 font-medium">Status</TableHead>
                      <TableHead className="text-gray-700 font-medium text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No clients found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {searchTerm ? "Try adjusting your search" : "Add your first client"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client: Client) => (
                        <TableRow key={client.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">
                            {client.name}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {client.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {client.mobile}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              {client.city}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {client.contactPerson || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditClient(client)}
                                title="Edit Client"
                              >
                                <Edit className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteClient(client)}
                                title="Delete Client"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </FurniliCard>
        </div>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-semibold">Add New Client</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Enter client information and contact details.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                    <FormField
                      control={clientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Client Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter client name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter email address" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Mobile <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter mobile number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            City <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter city" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Contact Person</FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter contact person name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Phone</FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter phone number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Address</FormLabel>
                        <FormControl>
                          <Input 
                            className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                            placeholder="Enter full address" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">GST Number</FormLabel>
                        <FormControl>
                          <Input 
                            className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                            placeholder="Enter GST number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  clientForm.reset();
                }} className="h-8 px-3 text-sm">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClientMutation.isPending} 
                  onClick={clientForm.handleSubmit(onSubmitClient)}
                  className="h-8 px-3 text-sm"
                >
                  {createClientMutation.isPending ? "Creating..." : "Create Client"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="max-h-[80vh] flex flex-col">
            <DialogHeader className="pb-4 flex-shrink-0">
              <DialogTitle className="text-xl font-semibold">Edit Client</DialogTitle>
              <DialogDescription>
                Update client information and contact details.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              <Form {...clientForm}>
                <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={clientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Client Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter client name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter email address" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Mobile <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter mobile number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            City <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter city" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Contact Person</FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter contact person name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Phone</FormLabel>
                          <FormControl>
                            <Input 
                              className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                              placeholder="Enter phone number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Address</FormLabel>
                        <FormControl>
                          <Input 
                            className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                            placeholder="Enter full address" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">GST Number</FormLabel>
                        <FormControl>
                          <Input 
                            className={`h-10 bg-gray-100 border-gray-200 ${isMobile ? 'text-sm' : ''}`} 
                            placeholder="Enter GST number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
            
            <div className="flex items-center justify-end space-x-4 pt-4 border-t flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingClient(null);
                clientForm.reset();
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateClientMutation.isPending} 
                onClick={clientForm.handleSubmit(onSubmitClient)}
              >
                {updateClientMutation.isPending ? "Updating..." : "Update Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client "{clientToDelete?.name}" and may affect related projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FurniliLayout>
  );
}