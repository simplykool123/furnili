import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Edit, Phone, Mail, Calendar, User } from "lucide-react";
import { useForm } from "react-hook-form";
import FurniliLayout from "@/components/Layout/FurniliLayout";

interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  source: string;
  status: 'new' | 'contacted' | 'quoted' | 'converted' | 'lost';
  assignedTo: string;
  tags: string;
  notes: string;
  nextFollowUp: string;
  createdAt: string;
}

export default function Leads() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['/api/crm/leads'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/leads')
  });

  // Mutation for creating/updating leads
  const leadMutation = useMutation({
    mutationFn: (data: any) => {
      const url = editingLead ? `/api/crm/leads/${editingLead.id}` : '/api/crm/leads';
      const method = editingLead ? 'PATCH' : 'POST';
      return authenticatedApiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: `Lead ${editingLead ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsDialogOpen(false);
      form.reset();
      setEditingLead(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingLead ? 'update' : 'create'} lead`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    form.reset(lead);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'} capitalize`}>
        {status}
      </Badge>
    );
  };

  const getSourceOptions = () => [
    'Facebook', 'Website', 'Referral', 'Google Ads', 'WhatsApp', 'Walk-in', 'Phone Call', 'Other'
  ];

  return (
    <FurniliLayout
      title="Leads Management"
      subtitle="Track and manage your sales leads"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLead(null);
              form.reset();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit' : 'Add'} Lead</DialogTitle>
              <DialogDescription>
                {editingLead ? 'Update lead information and status.' : 'Create a new lead with contact information and details.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => leadMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Lead Name *</Label>
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
                  <Label htmlFor="source">Source</Label>
                  <Select onValueChange={(value) => form.setValue('source', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSourceOptions().map(source => (
                        <SelectItem key={source} value={source.toLowerCase()}>{source}</SelectItem>
                      ))}
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
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input {...form.register('assignedTo')} placeholder="Staff member" />
                </div>
                <div>
                  <Label htmlFor="nextFollowUp">Next Follow-up</Label>
                  <Input {...form.register('nextFollowUp')} type="datetime-local" />
                </div>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input {...form.register('tags')} placeholder="e.g., High Priority, VIP" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea {...form.register('address')} placeholder="Full address" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea {...form.register('notes')} placeholder="Additional notes and requirements" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={leadMutation.isPending}>
                  {leadMutation.isPending ? 'Saving...' : 'Save Lead'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            All Leads ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Follow-up</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {lead.phone}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{lead.source}</TableCell>
                  <TableCell>{lead.assignedTo || 'Unassigned'}</TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell>
                    {lead.nextFollowUp ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(lead.nextFollowUp).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(lead)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No leads found. Add your first lead to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </FurniliLayout>
  );
}