import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Building2, Calendar, User, MapPin, Eye, Edit, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project, Client } from "@shared/schema";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  clientId: z.number().min(1, "Client is required"),
  stage: z.enum(["prospect", "execution", "design-presentation", "boq-shared", "won", "completed"]).default("prospect"),
  budget: z.number().min(0).default(0),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  pincode: z.string().optional(),
});

const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Mobile number is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().optional(),
});

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("client");

  const { data: projects = [], isLoading, error: projectsError } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: clients = [], error: clientsError } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
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

  const createProjectMutation = useMutation({
    mutationFn: (data: z.infer<typeof createProjectSchema>) =>
      apiRequest('/api/projects', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (data: z.infer<typeof createClientSchema>) =>
      apiRequest('/api/clients', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsCreateClientDialogOpen(false);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const projectForm = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: 0,
      stage: "prospect",
      budget: 0,
      addressLine1: "",
      addressLine2: "",
      state: "",
      city: "",
      location: "",
      pincode: "",
    },
  });

  const clientForm = useForm<z.infer<typeof createClientSchema>>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      address: "",
    },
  });

  const onSubmitProject = (data: z.infer<typeof createProjectSchema>) => {
    createProjectMutation.mutate(data);
  };

  const onSubmitClient = (data: z.infer<typeof createClientSchema>) => {
    createClientMutation.mutate(data);
  };

  const filteredProjects = Array.isArray(projects) ? projects.filter((project: Project) => {
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || project.stage === stageFilter;
    const matchesClient = clientFilter === "all" || project.clientId?.toString() === clientFilter;
    return matchesSearch && matchesStage && matchesClient;
  }) : [];

  const getStageBadge = (stage: string) => {
    const stageColors = {
      prospect: "bg-blue-100 text-blue-800",
      execution: "bg-green-100 text-green-800",
      "design-presentation": "bg-purple-100 text-purple-800",
      "boq-shared": "bg-yellow-100 text-yellow-800",
      won: "bg-emerald-100 text-emerald-800",
      completed: "bg-gray-100 text-gray-800",
    };
    return stageColors[stage as keyof typeof stageColors] || "bg-gray-100 text-gray-800";
  };

  const getClientName = (clientId: number) => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client?.name || "N/A";
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (projectsError || clientsError) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-500 mb-4">
            {projectsError?.message || clientsError?.message || "Failed to load project data"}
          </p>
          <Button onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a comprehensive project with client details and address information
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="client">Client Details</TabsTrigger>
                <TabsTrigger value="project">Project Details</TabsTrigger>
                <TabsTrigger value="address">Address Details</TabsTrigger>
              </TabsList>

              <TabsContent value="client" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Select or Add Client</h3>
                  <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Client
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                      </DialogHeader>
                      <Form {...clientForm}>
                        <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-4">
                          <FormField
                            control={clientForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter client name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={clientForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="Enter email" {...field} />
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
                                  <FormLabel>Mobile</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter mobile number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={clientForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter city" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter complete address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateClientDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createClientMutation.isPending}>
                              {createClientMutation.isPending ? "Creating..." : "Add Client"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Form {...projectForm}>
                  <FormField
                    control={projectForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Client</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client: Client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name} - {client.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab("project")}>
                    Next: Project Details
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="project" className="space-y-4">
                <Form {...projectForm}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={projectForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter project name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={projectForm.control}
                      name="stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="prospect">Prospect</SelectItem>
                              <SelectItem value="execution">Execution</SelectItem>
                              <SelectItem value="design-presentation">Design Presentation</SelectItem>
                              <SelectItem value="boq-shared">BOQ Shared</SelectItem>
                              <SelectItem value="won">Won</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={projectForm.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter project budget"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={projectForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter project description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("client")}>
                    Back: Client Details
                  </Button>
                  <Button onClick={() => setActiveTab("address")}>
                    Next: Address Details
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <Form {...projectForm}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={projectForm.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address line 1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={projectForm.control}
                      name="addressLine2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address line 2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={projectForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={projectForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={projectForm.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter pincode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={projectForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location/Landmark</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter location or landmark details" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("project")}>
                    Back: Project Details
                  </Button>
                  <div className="space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={projectForm.handleSubmit(onSubmitProject)} disabled={createProjectMutation.isPending}>
                      {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by project name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="execution">Execution</SelectItem>
                <SelectItem value="design-presentation">Design Presentation</SelectItem>
                <SelectItem value="boq-shared">BOQ Shared</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client: Client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects ({filteredProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Code</TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project: Project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    {project.code || `P-${project.id}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      {project.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {project.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getClientName(project.clientId)}</TableCell>
                  <TableCell>{project.city || "N/A"}</TableCell>
                  <TableCell>
                    <Badge className={getStageBadge(project.stage)}>
                      {project.stage?.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.budget ? `₹${project.budget.toLocaleString('en-IN')}` : "N/A"}
                  </TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-500">
                {searchTerm || stageFilter !== "all" || clientFilter !== "all"
                  ? "No projects match your current filters."
                  : "Get started by creating your first project."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}