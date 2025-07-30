import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Building2, Calendar, User, MapPin, Eye, Edit, FolderOpen } from "lucide-react";
import { useLocation } from "wouter";
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
import { insertClientSchema } from "@shared/schema";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  clientId: z.number().min(1, "Client is required"),
  stage: z.enum(["prospect", "recce-done", "design-in-progress", "design-approved", "estimate-given", "client-approved", "production", "installation", "handover", "completed", "on-hold", "lost"]).default("prospect"),
  budget: z.number().min(0).default(0),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  pincode: z.string().optional(),
});

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("client");

  const { data: projects = [], isLoading, error: projectsError } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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

  const projectForm = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: 0,
      stage: "prospect" as const,
      budget: 0,
      addressLine1: "",
      addressLine2: "",
      state: "",
      city: "",
      location: "",
      pincode: "",
    },
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

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await apiRequest('POST', '/api/projects', projectData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Project created successfully" });
      setIsCreateDialogOpen(false);
      projectForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await apiRequest('POST', '/api/clients', clientData);
      return response.json();
    },
    onSuccess: (newClient: Client) => {
      toast({ title: "Client created successfully" });
      setIsCreateClientDialogOpen(false);
      clientForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Auto-select the new client in the project form
      projectForm.setValue("clientId", newClient.id);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitProject = (data: any) => {
    createProjectMutation.mutate(data);
  };

  const onSubmitClient = (data: any) => {
    createClientMutation.mutate(data);
  };

  // Filter projects based on search and filters
  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getClientName(project.clientId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === "all" || project.stage === stageFilter;
    const matchesClient = clientFilter === "all" || project.clientId.toString() === clientFilter;
    
    return matchesSearch && matchesStage && matchesClient;
  });

  const getStageColor = (stage: string) => {
    const stageColors = {
      prospect: "bg-blue-100 text-blue-800",
      "recce-done": "bg-indigo-100 text-indigo-800",
      "design-in-progress": "bg-purple-100 text-purple-800",
      "design-approved": "bg-violet-100 text-violet-800",
      "estimate-given": "bg-orange-100 text-orange-800",
      "client-approved": "bg-green-100 text-green-800",
      production: "bg-yellow-100 text-yellow-800",
      installation: "bg-amber-100 text-amber-800",
      handover: "bg-emerald-100 text-emerald-800",
      completed: "bg-gray-100 text-gray-800",
      "on-hold": "bg-slate-100 text-slate-800",
      lost: "bg-red-100 text-red-800",
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
    const errorMessage = projectsError?.message || clientsError?.message || "Failed to load project data";
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Invalid token') || errorMessage.includes('Access token required');
    
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isAuthError ? "Authentication Required" : "Error Loading Data"}
          </h3>
          <p className="text-gray-500 mb-4">
            {isAuthError 
              ? "Your session has expired. Please log in again to access project management features."
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
              queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
              queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
            }}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FolderOpen className="h-8 w-8 text-amber-900" />
            <h1 className="text-2xl font-semibold text-gray-900">Project Studio</h1>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Project
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Filters Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="recce-done">Recce Done</SelectItem>
                  <SelectItem value="design-in-progress">Design In Progress</SelectItem>
                  <SelectItem value="design-approved">Design Approved</SelectItem>
                  <SelectItem value="estimate-given">Estimate Given</SelectItem>
                  <SelectItem value="client-approved">Client Approved</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="handover">Handover</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-48">
                  <User className="h-4 w-4 mr-2" />
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
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-700 font-medium">Created On</TableHead>
                  <TableHead className="text-gray-700 font-medium">Project Code</TableHead>
                  <TableHead className="text-gray-700 font-medium">Project Name</TableHead>
                  <TableHead className="text-gray-700 font-medium">Client Name</TableHead>
                  <TableHead className="text-gray-700 font-medium">City</TableHead>
                  <TableHead className="text-gray-700 font-medium">Stage</TableHead>
                  <TableHead className="text-gray-700 font-medium text-center">View Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project: Project) => (
                  <TableRow key={project.id} className="hover:bg-gray-50">
                    <TableCell className="text-gray-600">
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                      }) : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium text-amber-900">
                      {project.code}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {project.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {getClientName(project.clientId)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {project.city || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStageColor(project.stage)}>
                        {project.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => setLocation(`/projects/${project.id}`)}
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">New Project</DialogTitle>
          </DialogHeader>

          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-8">
              {/* Client Details Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-amber-900 flex items-center justify-center text-white text-sm font-medium">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Client Details</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <FormField
                        control={projectForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Client <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger className="h-12 bg-gray-100 border-gray-200">
                                  <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client: Client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button"
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mt-6"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Client
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
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setIsCreateClientDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={createClientMutation.isPending}>
                                {createClientMutation.isPending ? "Creating..." : "Create Client"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Project Details Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-amber-900 flex items-center justify-center text-white text-sm font-medium">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={projectForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Project Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="h-12 bg-gray-100 border-gray-200" 
                            placeholder="Enter project name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <FormField
                          control={projectForm.control}
                          name="stage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Project Stage <span className="text-red-500">*</span>
                              </FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="h-12 bg-gray-100 border-gray-200">
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="prospect">Prospect</SelectItem>
                                  <SelectItem value="recce-done">Recce Done</SelectItem>
                                  <SelectItem value="design-in-progress">Design In Progress</SelectItem>
                                  <SelectItem value="design-approved">Design Approved</SelectItem>
                                  <SelectItem value="estimate-given">Estimate Given</SelectItem>
                                  <SelectItem value="client-approved">Client Approved</SelectItem>
                                  <SelectItem value="production">Production</SelectItem>
                                  <SelectItem value="installation">Installation</SelectItem>
                                  <SelectItem value="handover">Handover</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="on-hold">On Hold</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="button"
                        className="btn-primary mt-6"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Stage
                      </Button>
                    </div>

                    <FormField
                      control={projectForm.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Budget <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter budget" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={projectForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-24 bg-gray-100 border-gray-200" 
                            placeholder="Enter project description" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address Details Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    3
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Address Details</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={projectForm.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Address Line 1</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter address line 1" 
                              {...field} 
                            />
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
                          <FormLabel className="text-sm font-medium text-gray-700">Address Line 2</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter address line 2" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <FormField
                      control={projectForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            State <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter state" 
                              {...field} 
                            />
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
                          <FormLabel className="text-sm font-medium text-gray-700">
                            City <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter city" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={projectForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Location</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter location" 
                              {...field} 
                            />
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
                          <FormLabel className="text-sm font-medium text-gray-700">Pincode</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12 bg-gray-100 border-gray-200" 
                              placeholder="Enter pincode" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Submit"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}