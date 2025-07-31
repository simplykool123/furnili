import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Users, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliStatsCard from "@/components/UI/FurniliStatsCard";
import { apiRequest } from "@/lib/queryClient";

// Types
interface Client {
  id: number;
  name: string;
  email: string;
  mobile: string;
  city: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  createdAt: string;
}

// Form validation schema
const clientFormSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  city: z.string().min(1, "City is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Form setup
  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      contactPerson: "",
      phone: "",
      address: "",
      gstNumber: "",
    },
  });

  // API Queries
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await apiRequest("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Client created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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
    mutationFn: async ({ id, data }: { id: number; data: ClientFormData }) => {
      const response = await apiRequest(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Client updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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
      const response = await apiRequest(`/api/clients/${clientId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Client deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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

  // Event handlers
  const onSubmitClient = (data: ClientFormData) => {
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
      contactPerson: client.contactPerson || "",
      phone: client.phone || "",
      address: client.address || "",
      gstNumber: client.gstNumber || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
  };

  // Filter clients
  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <FurniliLayout title="Client Management" subtitle="Manage client information and contact details">
      <div className="space-y-4 sm:space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`max-w-sm ${isMobile ? 'text-sm h-9' : ''}`}
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className={isMobile ? 'h-9 text-sm w-full' : ''}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FurniliStatsCard
            title="Total Clients"
            value={clients.length}
            icon={<Users className="h-4 w-4" />}
          />
          <FurniliStatsCard
            title="Active Projects"
            value="12"
            icon={<Building className="h-4 w-4" />}
          />
          <FurniliStatsCard
            title="This Month"
            value="3"
            icon={<Plus className="h-4 w-4" />}
          />
        </div>

        {/* Clients Table */}
        <div className="space-y-4">
          <FurniliCard>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading clients...
                        </TableCell>
                      </TableRow>
                    ) : filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No clients found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client: Client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.mobile}</TableCell>
                          <TableCell>{client.city}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
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
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-semibold">Add New Client</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Enter client information and contact details.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-3">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Client Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Mobile <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">Contact Person</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">Phone</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
                        placeholder="Enter phone number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">Address</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">GST Number</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-semibold">Edit Client</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update client information and contact details.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-3">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Client Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Mobile <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">Contact Person</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">Phone</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
                        placeholder="Enter phone number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">Address</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium text-gray-700">GST Number</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-8 text-sm border-gray-200" 
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
                  setIsEditDialogOpen(false);
                  setEditingClient(null);
                  clientForm.reset();
                }} className="h-8 px-3 text-sm">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateClientMutation.isPending} 
                  className="h-8 px-3 text-sm"
                >
                  {updateClientMutation.isPending ? "Updating..." : "Update Client"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client "{clientToDelete?.name}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FurniliLayout>
  );
}