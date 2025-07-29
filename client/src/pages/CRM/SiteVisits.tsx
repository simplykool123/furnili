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
import { Plus, MapPin, Calendar, User, Clock, CheckCircle, ExternalLink, Phone } from "lucide-react";
import { useForm } from "react-hook-form";

interface SiteVisit {
  id: number;
  clientName: string;
  clientPhone: string;
  address: string;
  locationLink: string;
  assignedTo: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  outcome: string;
  notes: string;
  followUpRequired: boolean;
  nextVisitDate: string;
  createdAt: string;
}

export default function SiteVisits() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  // Fetch site visits
  const { data: siteVisits = [], isLoading } = useQuery({
    queryKey: ['/api/crm/visits'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/crm/visits');
      return response.json();
    }
  });

  // Mutation for creating/updating site visits
  const visitMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingVisit ? `/api/crm/visits/${editingVisit.id}` : '/api/crm/visits';
      const method = editingVisit ? 'PATCH' : 'POST';
      
      const response = await authenticatedApiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `Site visit ${editingVisit ? 'updated' : 'scheduled'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/visits'] });
      setIsDialogOpen(false);
      form.reset();
      setEditingVisit(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingVisit ? 'update' : 'schedule'} site visit`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (visit: SiteVisit) => {
    setEditingVisit(visit);
    form.reset(visit);
    setIsDialogOpen(true);
  };

  const markAsCompleted = async (visitId: number) => {
    try {
      await authenticatedApiRequest('PATCH', `/api/crm/visits/${visitId}`, {
        status: 'completed'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/visits'] });
      toast({ title: "Site visit marked as completed" });
    } catch (error) {
      toast({ title: "Error updating site visit", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'} capitalize`}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getTodaysVisits = () => {
    const today = new Date().toDateString();
    return siteVisits.filter((visit: SiteVisit) => 
      new Date(visit.visitDate).toDateString() === today
    );
  };

  const getUpcomingVisits = () => {
    const today = new Date();
    return siteVisits.filter((visit: SiteVisit) => {
      const visitDate = new Date(visit.visitDate);
      return visitDate > today && (visit.status === 'scheduled' || visit.status === 'in-progress');
    });
  };

  const generateGoogleMapsLink = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Visits</h1>
          <p className="text-gray-600">Schedule and manage customer site visits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingVisit(null);
              form.reset({ visitDate: new Date().toISOString().split('T')[0], status: 'scheduled' });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Visit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVisit ? 'Edit' : 'Schedule New'} Site Visit</DialogTitle>
              <DialogDescription>
                {editingVisit ? 'Update site visit details and status.' : 'Schedule a new site visit with customer details and purpose.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => visitMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input {...form.register('clientName', { required: true })} placeholder="Client name" />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Client Phone</Label>
                  <Input {...form.register('clientPhone')} placeholder="Phone number" />
                </div>
                <div>
                  <Label htmlFor="visitDate">Visit Date *</Label>
                  <Input {...form.register('visitDate', { required: true })} type="date" />
                </div>
                <div>
                  <Label htmlFor="visitTime">Visit Time</Label>
                  <Input {...form.register('visitTime')} type="time" />
                </div>
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input {...form.register('assignedTo')} placeholder="Staff member" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => form.setValue('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="followUpRequired">Follow-up Required</Label>
                  <Select onValueChange={(value) => form.setValue('followUpRequired', value === 'true')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nextVisitDate">Next Visit Date</Label>
                  <Input {...form.register('nextVisitDate')} type="date" />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea {...form.register('address', { required: true })} placeholder="Complete address" />
              </div>
              <div>
                <Label htmlFor="locationLink">Location Link (Google Maps)</Label>
                <Input {...form.register('locationLink')} placeholder="Google Maps link or coordinates" />
              </div>
              <div>
                <Label htmlFor="purpose">Purpose/Objective</Label>
                <Textarea {...form.register('purpose')} placeholder="Purpose of the visit" />
              </div>
              <div>
                <Label htmlFor="outcome">Outcome/Results</Label>
                <Textarea {...form.register('outcome')} placeholder="Visit outcome and results" />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea {...form.register('notes')} placeholder="Additional notes and observations" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={visitMutation.isPending}>
                  {visitMutation.isPending ? 'Saving...' : 'Save Visit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Visits</p>
                <p className="text-2xl font-bold text-blue-600">{getTodaysVisits().length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-yellow-600">{getUpcomingVisits().length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {siteVisits.filter((v: SiteVisit) => v.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold text-gray-600">{siteVisits.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Visits */}
      {getTodaysVisits().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Site Visits ({getTodaysVisits().length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getTodaysVisits().map((visit: SiteVisit) => (
                  <TableRow key={visit.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visit.clientName}</p>
                        {visit.clientPhone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {visit.clientPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{visit.visitTime || 'No time set'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="truncate">{visit.address}</p>
                        {visit.locationLink && (
                          <a
                            href={visit.locationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Map
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{visit.assignedTo || 'Unassigned'}</TableCell>
                    <TableCell className="max-w-xs truncate">{visit.purpose}</TableCell>
                    <TableCell>{getStatusBadge(visit.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {visit.status !== 'completed' && (
                          <Button size="sm" onClick={() => markAsCompleted(visit.id)}>
                            Mark Complete
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(visit)}>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Site Visits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            All Site Visits ({siteVisits.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteVisits.map((visit: SiteVisit) => (
                <TableRow key={visit.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{visit.clientName}</p>
                      {visit.clientPhone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {visit.clientPhone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{new Date(visit.visitDate).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">{visit.visitTime || 'No time set'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="truncate">{visit.address}</p>
                      {visit.locationLink ? (
                        <a
                          href={visit.locationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Map
                        </a>
                      ) : (
                        <a
                          href={generateGoogleMapsLink(visit.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Search Map
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{visit.assignedTo || 'Unassigned'}</TableCell>
                  <TableCell>{getStatusBadge(visit.status)}</TableCell>
                  <TableCell>
                    {visit.followUpRequired ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">
                        Not Required
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {visit.status !== 'completed' && visit.status !== 'cancelled' && (
                        <Button size="sm" onClick={() => markAsCompleted(visit.id)}>
                          Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(visit)}>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {siteVisits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No site visits found. Schedule your first site visit to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}