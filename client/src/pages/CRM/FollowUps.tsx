import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
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
import { Plus, Calendar as CalendarIcon, Phone, MessageSquare, User, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import FurniliLayout from "@/components/Layout/FurniliLayout";

interface FollowUp {
  id: number;
  leadCustomerName: string;
  leadCustomerPhone: string;
  followUpDate: string;
  followUpTime: string;
  method: 'call' | 'visit' | 'whatsapp' | 'email';
  staffAssigned: string;
  notes: string;
  status: 'pending' | 'completed' | 'missed';
  outcome: string;
  nextFollowUp: string;
  createdAt: string;
}

export default function FollowUps() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  // Fetch follow-ups
  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['/api/crm/followups'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/followups')
  });

  // Mutation for creating/updating follow-ups
  const followUpMutation = useMutation({
    mutationFn: (data: any) => {
      const url = editingFollowUp ? `/api/crm/followups/${editingFollowUp.id}` : '/api/crm/followups';
      const method = editingFollowUp ? 'PATCH' : 'POST';
      return authenticatedApiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: `Follow-up ${editingFollowUp ? 'updated' : 'scheduled'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/followups'] });
      setIsDialogOpen(false);
      form.reset();
      setEditingFollowUp(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingFollowUp ? 'update' : 'schedule'} follow-up`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    form.reset(followUp);
    setIsDialogOpen(true);
  };

  const markAsCompleted = async (followUpId: number, outcome: string = '') => {
    try {
      await authenticatedApiRequest('PATCH', `/api/crm/followups/${followUpId}`, {
        status: 'completed',
        outcome: outcome || 'Follow-up completed'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/followups'] });
      toast({ title: "Follow-up marked as completed" });
    } catch (error) {
      toast({ title: "Error updating follow-up", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      missed: 'bg-red-100 text-red-800'
    };

    const icons = {
      pending: Clock,
      completed: CheckCircle,
      missed: AlertCircle
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'} capitalize flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getMethodIcon = (method: string) => {
    const icons = {
      call: Phone,
      visit: User,
      whatsapp: MessageSquare,
      email: MessageSquare
    };
    
    const Icon = icons[method as keyof typeof icons] || Phone;
    return <Icon className="w-4 h-4" />;
  };

  const getTodaysFollowUps = () => {
    const today = new Date().toDateString();
    return followUps.filter((followUp: FollowUp) => 
      new Date(followUp.followUpDate).toDateString() === today
    );
  };

  const getUpcomingFollowUps = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return followUps.filter((followUp: FollowUp) => {
      const followUpDate = new Date(followUp.followUpDate);
      return followUpDate > today && followUpDate <= nextWeek && followUp.status === 'pending';
    });
  };

  const getPendingFollowUps = () => {
    return followUps.filter((followUp: FollowUp) => followUp.status === 'pending');
  };

  return (
    <FurniliLayout
      title="Follow-ups"
      subtitle="Schedule and manage customer follow-ups"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingFollowUp(null);
                form.reset({ followUpDate: new Date().toISOString().split('T')[0] });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Follow-up
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingFollowUp ? 'Edit' : 'Schedule New'} Follow-up</DialogTitle>
                <DialogDescription>
                  {editingFollowUp ? 'Update follow-up details and status.' : 'Schedule a new follow-up with a lead or customer.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit((data) => followUpMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leadCustomerName">Lead/Customer Name *</Label>
                    <Input {...form.register('leadCustomerName', { required: true })} placeholder="Name" />
                  </div>
                  <div>
                    <Label htmlFor="leadCustomerPhone">Phone Number</Label>
                    <Input {...form.register('leadCustomerPhone')} placeholder="Phone number" />
                  </div>
                  <div>
                    <Label htmlFor="followUpDate">Follow-up Date *</Label>
                    <Input {...form.register('followUpDate', { required: true })} type="date" />
                  </div>
                  <div>
                    <Label htmlFor="followUpTime">Follow-up Time</Label>
                    <Input {...form.register('followUpTime')} type="time" />
                  </div>
                  <div>
                    <Label htmlFor="method">Follow-up Method</Label>
                    <Select onValueChange={(value) => form.setValue('method', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="visit">Site Visit</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="staffAssigned">Assigned To</Label>
                    <Input {...form.register('staffAssigned')} placeholder="Staff member" />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select onValueChange={(value) => form.setValue('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nextFollowUp">Next Follow-up Date</Label>
                    <Input {...form.register('nextFollowUp')} type="date" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea {...form.register('notes')} placeholder="Follow-up agenda and notes" />
                </div>
                <div>
                  <Label htmlFor="outcome">Outcome (if completed)</Label>
                  <Textarea {...form.register('outcome')} placeholder="Results and next steps" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={followUpMutation.isPending}>
                    {followUpMutation.isPending ? 'Saving...' : 'Save Follow-up'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today ({getTodaysFollowUps().length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({getUpcomingFollowUps().length})</TabsTrigger>
          <TabsTrigger value="pending">All Pending ({getPendingFollowUps().length})</TabsTrigger>
          <TabsTrigger value="all">All Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Today's Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTodaysFollowUps().map((followUp: FollowUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{followUp.leadCustomerName}</p>
                          <p className="text-sm text-gray-600">{followUp.leadCustomerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{followUp.followUpTime || 'No time set'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize">
                          {getMethodIcon(followUp.method)}
                          {followUp.method}
                        </div>
                      </TableCell>
                      <TableCell>{followUp.staffAssigned || 'Unassigned'}</TableCell>
                      <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {followUp.status === 'pending' && (
                            <Button size="sm" onClick={() => markAsCompleted(followUp.id)}>
                              Mark Done
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEdit(followUp)}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {getTodaysFollowUps().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No follow-ups scheduled for today.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Follow-ups (Next 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getUpcomingFollowUps().map((followUp: FollowUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{followUp.leadCustomerName}</p>
                          <p className="text-sm text-gray-600">{followUp.leadCustomerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{new Date(followUp.followUpDate).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">{followUp.followUpTime || 'No time set'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize">
                          {getMethodIcon(followUp.method)}
                          {followUp.method}
                        </div>
                      </TableCell>
                      <TableCell>{followUp.staffAssigned || 'Unassigned'}</TableCell>
                      <TableCell className="max-w-xs truncate">{followUp.notes}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(followUp)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {getUpcomingFollowUps().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No upcoming follow-ups in the next 7 days.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>All Pending Follow-ups</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPendingFollowUps().map((followUp: FollowUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{followUp.leadCustomerName}</p>
                          <p className="text-sm text-gray-600">{followUp.leadCustomerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{new Date(followUp.followUpDate).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">{followUp.followUpTime || 'No time set'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize">
                          {getMethodIcon(followUp.method)}
                          {followUp.method}
                        </div>
                      </TableCell>
                      <TableCell>{followUp.staffAssigned || 'Unassigned'}</TableCell>
                      <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => markAsCompleted(followUp.id)}>
                            Mark Done
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(followUp)}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {getPendingFollowUps().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No pending follow-ups found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Follow-ups ({followUps.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUps.map((followUp: FollowUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{followUp.leadCustomerName}</p>
                          <p className="text-sm text-gray-600">{followUp.leadCustomerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{new Date(followUp.followUpDate).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">{followUp.followUpTime || 'No time set'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize">
                          {getMethodIcon(followUp.method)}
                          {followUp.method}
                        </div>
                      </TableCell>
                      <TableCell>{followUp.staffAssigned || 'Unassigned'}</TableCell>
                      <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {followUp.status === 'pending' && (
                            <Button size="sm" onClick={() => markAsCompleted(followUp.id)}>
                              Mark Done
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEdit(followUp)}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {followUps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No follow-ups found. Schedule your first follow-up to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </FurniliLayout>
  );
}