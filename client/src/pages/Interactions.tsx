import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, MessageCircle, Phone, Mail, Calendar, User, Clock, Star } from "lucide-react";
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
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

const interactionFormSchema = z.object({
  leadId: z.number().optional(),
  clientId: z.number().optional(),
  type: z.enum(["call", "email", "meeting", "whatsapp", "site_visit", "proposal_sent", "follow_up"]),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  outcome: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
});

type InteractionFormData = z.infer<typeof interactionFormSchema>;

interface Interaction {
  id: number;
  type: string;
  subject: string;
  description: string;
  outcome?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
  lead?: {
    id: number;
    name: string;
    email: string;
  };
  client?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Lead {
  id: number;
  name: string;
  email: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
}

export default function Interactions() {
  const [isNewInteractionOpen, setIsNewInteractionOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch interactions
  const { data: interactions = [], isLoading: interactionsLoading } = useQuery<Interaction[]>({
    queryKey: ["/api/crm/interactions", searchTerm, typeFilter, dateFilter],
  });

  // Fetch leads for form
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/crm/leads"],
  });

  // Fetch clients for form
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Form setup
  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      type: "call",
      subject: "",
      description: "",
      outcome: "",
    },
  });

  // Create interaction mutation
  const createInteractionMutation = useMutation({
    mutationFn: (data: InteractionFormData) => apiRequest("/api/crm/interactions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/interactions"] });
      setIsNewInteractionOpen(false);
      form.reset();
      toast({ title: "Success", description: "Interaction recorded successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record interaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InteractionFormData) => {
    // Ensure at least one contact is selected
    if (!data.leadId && !data.clientId) {
      toast({
        title: "Error",
        description: "Please select either a lead or client",
        variant: "destructive",
      });
      return;
    }
    createInteractionMutation.mutate(data);
  };

  // Filter interactions
  const filteredInteractions = interactions.filter(interaction => {
    const matchesSearch = interaction.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interaction.lead?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interaction.client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || interaction.type === typeFilter;
    
    const matchesDate = dateFilter === "all" || (() => {
      const interactionDate = new Date(interaction.createdAt);
      const today = new Date();
      const daysDiff = Math.ceil((today.getTime() - interactionDate.getTime()) / (1000 * 3600 * 24));
      
      switch (dateFilter) {
        case "today": return daysDiff === 0;
        case "week": return daysDiff <= 7;
        case "month": return daysDiff <= 30;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesType && matchesDate;
  });

  // Interaction statistics
  const interactionStats = {
    total: interactions.length,
    calls: interactions.filter(i => i.type === "call").length,
    meetings: interactions.filter(i => i.type === "meeting").length,
    emails: interactions.filter(i => i.type === "email").length,
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "meeting": return <User className="h-4 w-4" />;
      case "whatsapp": return <MessageCircle className="h-4 w-4" />;
      case "site_visit": return <Calendar className="h-4 w-4" />;
      case "proposal_sent": return <Star className="h-4 w-4" />;
      case "follow_up": return <Clock className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case "call": return "bg-blue-50 border-blue-200 text-blue-800";
      case "email": return "bg-green-50 border-green-200 text-green-800";
      case "meeting": return "bg-purple-50 border-purple-200 text-purple-800";
      case "whatsapp": return "bg-green-50 border-green-200 text-green-800";
      case "site_visit": return "bg-orange-50 border-orange-200 text-orange-800";
      case "proposal_sent": return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "follow_up": return "bg-gray-50 border-gray-200 text-gray-800";
      default: return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <ResponsiveLayout
      title="Customer Interactions"
      subtitle="Track all customer communications and touchpoints"
      showAddButton={true}
      onAddClick={() => setIsNewInteractionOpen(true)}
    >
      <Dialog open={isNewInteractionOpen} onOpenChange={setIsNewInteractionOpen}>
        <DialogTrigger asChild>
          <Button className="bg-amber-600 hover:bg-amber-700" data-testid="button-new-interaction" style={{ display: 'none' }}>
            <Plus className="h-4 w-4 mr-2" />
            Record Interaction
          </Button>
        </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Interaction</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Interaction Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-interaction-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="call">Phone Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="site_visit">Site Visit</SelectItem>
                            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                            <SelectItem value="follow_up">Follow Up</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Lead</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-lead">
                              <SelectValue placeholder="Select lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No Lead</SelectItem>
                            {leads.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id.toString()}>
                                {lead.name} - {lead.email}
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
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Client</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-client">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No Client</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name} - {client.email}
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
                    name="nextFollowUpDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Next Follow-up Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" className="h-8" data-testid="input-follow-up-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Subject *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8" data-testid="input-interaction-subject" />
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
                      <FormLabel className="text-xs">Description *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} data-testid="textarea-interaction-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Outcome</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="textarea-interaction-outcome" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewInteractionOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createInteractionMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                    data-testid="button-create-interaction"
                  >
                    {createInteractionMutation.isPending ? "Recording..." : "Record Interaction"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Interaction Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Interactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-total-interactions">{interactionStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Phone Calls</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-calls">{interactionStats.calls}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600" data-testid="text-meetings">{interactionStats.meetings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Emails</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600" data-testid="text-emails">{interactionStats.emails}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search interactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-interactions"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="call">Phone Calls</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="site_visit">Site Visits</SelectItem>
            <SelectItem value="proposal_sent">Proposals</SelectItem>
            <SelectItem value="follow_up">Follow Ups</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48" data-testid="select-date-filter">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interactions Timeline */}
      {interactionsLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInteractions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interactions found</h3>
            <p className="text-gray-600 text-center">
              {searchTerm || typeFilter !== "all" || dateFilter !== "all" 
                ? "Try adjusting your search or filters" 
                : "Get started by recording your first customer interaction"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInteractions.map((interaction) => (
            <Card key={interaction.id} className="hover:shadow-md transition-shadow" data-testid={`card-interaction-${interaction.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${getInteractionColor(interaction.type)}`}>
                    {getInteractionIcon(interaction.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900" data-testid={`text-interaction-subject-${interaction.id}`}>
                          {interaction.subject}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getInteractionColor(interaction.type)} data-testid={`badge-type-${interaction.id}`}>
                            {interaction.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {interaction.lead && (
                            <span className="text-sm text-gray-600" data-testid={`text-lead-${interaction.id}`}>
                              Lead: {interaction.lead.name}
                            </span>
                          )}
                          {interaction.client && (
                            <span className="text-sm text-gray-600" data-testid={`text-client-${interaction.id}`}>
                              Client: {interaction.client.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500" data-testid={`text-interaction-date-${interaction.id}`}>
                          {format(new Date(interaction.createdAt), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(interaction.createdAt), "HH:mm")}
                        </div>
                        {interaction.user && (
                          <div className="text-xs text-gray-500 mt-1" data-testid={`text-interaction-user-${interaction.id}`}>
                            by {interaction.user.name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3" data-testid={`text-interaction-description-${interaction.id}`}>
                      {interaction.description}
                    </p>
                    
                    {interaction.outcome && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Outcome:</h4>
                        <p className="text-sm text-gray-700" data-testid={`text-interaction-outcome-${interaction.id}`}>
                          {interaction.outcome}
                        </p>
                      </div>
                    )}
                    
                    {interaction.nextFollowUpDate && (
                      <div className="flex items-center text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <Calendar className="h-4 w-4 mr-2" />
                        Next follow-up: {format(new Date(interaction.nextFollowUpDate), "MMM dd, yyyy HH:mm")}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ResponsiveLayout>
  );
}