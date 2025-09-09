import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Users, Phone, Mail, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const leadFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  company: z.string().optional(),
  leadSourceId: z.number().optional(),
  pipelineStageId: z.number(),
  budget: z.number().optional(),
  requirements: z.string().optional(),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  budget?: number;
  requirements?: string;
  notes?: string;
  score: number;
  status: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  leadSource?: { name: string };
  pipelineStage?: { name: string; color: string };
  assignedTo?: { name: string };
}

interface PipelineStage {
  id: number;
  name: string;
  color: string;
  orderIndex: number;
}

interface LeadSource {
  id: number;
  name: string;
}

export default function Leads() {
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/crm/leads", searchTerm, statusFilter, stageFilter],
  });

  // Fetch pipeline stages
  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/crm/pipeline-stages"],
  });

  // Fetch lead sources
  const { data: leadSources = [] } = useQuery<LeadSource[]>({
    queryKey: ["/api/crm/lead-sources"],
  });

  // Form setup
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      requirements: "",
      notes: "",
      pipelineStageId: pipelineStages[0]?.id || 1,
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (data: LeadFormData) => apiRequest("/api/crm/leads", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      setIsNewLeadOpen(false);
      form.reset();
      toast({ title: "Success", description: "Lead created successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  // Convert lead to client mutation
  const convertToClientMutation = useMutation({
    mutationFn: (leadId: number) => apiRequest(`/api/crm/leads/${leadId}/convert`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      toast({ title: "Success", description: "Lead converted to client successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to convert lead",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeadFormData) => {
    createLeadMutation.mutate(data);
  };

  const handleConvertToClient = (leadId: number) => {
    convertToClientMutation.mutate(leadId);
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesStage = stageFilter === "all" || lead.pipelineStage?.name === stageFilter;
    
    return matchesSearch && matchesStatus && matchesStage;
  });

  // Lead statistics
  const leadStats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl" data-testid="leads-page">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Lead Management</h1>
          <p className="text-gray-600 mt-1">Capture, qualify, and convert potential customers</p>
        </div>
        
        <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700" data-testid="button-new-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="h-8" data-testid="input-lead-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Company</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="leadSourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Lead Source</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-lead-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leadSources.map((source) => (
                              <SelectItem key={source.id} value={source.id.toString()}>
                                {source.name}
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
                    name="pipelineStageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Pipeline Stage *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-pipeline-stage">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pipelineStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id.toString()}>
                                {stage.name}
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
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Budget (₹)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          className="h-8"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-lead-budget"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Requirements</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-lead-requirements" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-lead-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewLeadOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createLeadMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                    data-testid="button-create-lead"
                  >
                    {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-total-leads">{leadStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">New Leads</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-new-leads">{leadStats.new}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Qualified</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600" data-testid="text-qualified-leads">{leadStats.qualified}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Converted</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600" data-testid="text-converted-leads">{leadStats.converted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-leads"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48" data-testid="select-stage-filter">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {pipelineStages.map((stage) => (
              <SelectItem key={stage.id} value={stage.name}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads Grid */}
      {leadsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600 text-center">
              {searchTerm || statusFilter !== "all" || stageFilter !== "all" 
                ? "Try adjusting your search or filters" 
                : "Get started by adding your first lead"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow" data-testid={`card-lead-${lead.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</h3>
                    {lead.company && (
                      <p className="text-sm text-gray-600" data-testid={`text-lead-company-${lead.id}`}>{lead.company}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(lead.score)}`} data-testid={`text-lead-score-${lead.id}`}>
                      {lead.score}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span data-testid={`text-lead-email-${lead.id}`}>{lead.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span data-testid={`text-lead-phone-${lead.id}`}>{lead.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {lead.pipelineStage && (
                    <Badge 
                      style={{ backgroundColor: lead.pipelineStage.color + "20", color: lead.pipelineStage.color }}
                      data-testid={`badge-stage-${lead.id}`}
                    >
                      {lead.pipelineStage.name}
                    </Badge>
                  )}
                  <Badge variant="outline" data-testid={`badge-status-${lead.id}`}>
                    {lead.status}
                  </Badge>
                </div>

                {lead.budget && (
                  <div className="text-sm text-gray-600 mb-3">
                    Budget: ₹{lead.budget.toLocaleString()}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Added {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                  {lead.status !== "converted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConvertToClient(lead.id)}
                      disabled={convertToClientMutation.isPending}
                      data-testid={`button-convert-${lead.id}`}
                    >
                      Convert
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}