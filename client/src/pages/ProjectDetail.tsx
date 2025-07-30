import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Upload, Download, File, Image, FileText, Calendar, 
  User, MessageSquare, Phone, CheckCircle, Clock, AlertCircle,
  Plus, Edit, Trash2, Tag, Users, BarChart3, Progress, Target,
  MessageCircle, Mail, ExternalLink, Paperclip, FolderOpen,
  Camera, Building2, MapPin, Star, Circle, CheckCircle2
} from "lucide-react";
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
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project, Client } from "@shared/schema";
import { useLocation } from "wouter";

// Schemas for various forms
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["pending", "in-progress", "completed"]).default("pending"),
});

const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  type: z.enum(["note", "meeting", "call", "email"]).default("note"),
  taggedUsers: z.array(z.string()).optional(),
});

const communicationSchema = z.object({
  type: z.enum(["whatsapp", "email", "call", "meeting"]),
  content: z.string().min(1, "Content is required"),
  contactPerson: z.string().optional(),
  followUpDate: z.string().optional(),
  status: z.enum(["pending", "completed"]).default("pending"),
});

export default function ProjectDetail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract project ID from URL
  const projectId = location.split('/')[2];
  
  const [activeTab, setActiveTab] = useState("files");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("all");

  // Forms
  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      dueDate: "",
      priority: "medium" as const,
      status: "pending" as const,
    },
  });

  const noteForm = useForm({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: "",
      type: "note" as const,
      taggedUsers: [],
    },
  });

  const communicationForm = useForm({
    resolver: zodResolver(communicationSchema),
    defaultValues: {
      type: "whatsapp" as const,
      content: "",
      contactPerson: "",
      followUpDate: "",
      status: "pending" as const,
    },
  });

  // Queries
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    }
  });

  const { data: client } = useQuery({
    queryKey: ['/api/clients', project?.clientId],
    queryFn: async () => {
      if (!project?.clientId) return null;
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/clients/${project.clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json();
    },
    enabled: !!project?.clientId
  });

  // Mock data for demonstration (in real app, these would come from API)
  const mockFiles = [
    { id: 1, name: "Layout_Plan_v2.pdf", type: "pdf", size: "2.4 MB", category: "Layouts", uploadedAt: "2025-01-29" },
    { id: 2, name: "Site_Photo_1.jpg", type: "image", size: "1.8 MB", category: "Site Photos", uploadedAt: "2025-01-28" },
    { id: 3, name: "BOQ_Estimate.xlsx", type: "excel", size: "156 KB", category: "BOQ", uploadedAt: "2025-01-27" },
    { id: 4, name: "CAD_Drawing.dwg", type: "cad", size: "3.2 MB", category: "CAD", uploadedAt: "2025-01-26" },
  ];

  const mockTasks = [
    { id: 1, title: "Site Survey Completion", assignedTo: "John Doe", dueDate: "2025-02-05", priority: "high", status: "in-progress" },
    { id: 2, title: "Material Procurement", assignedTo: "Jane Smith", dueDate: "2025-02-10", priority: "medium", status: "pending" },
    { id: 3, title: "Design Approval", assignedTo: "Mike Johnson", dueDate: "2025-02-15", priority: "high", status: "completed" },
  ];

  const mockNotes = [
    { id: 1, content: "Client requested changes to bedroom layout", type: "meeting", author: "Admin", createdAt: "2025-01-29 10:30", taggedUsers: ["john", "jane"] },
    { id: 2, content: "Site visit scheduled for next week", type: "note", author: "Project Manager", createdAt: "2025-01-28 15:45", taggedUsers: [] },
  ];

  const mockCommunications = [
    { id: 1, type: "whatsapp", content: "Shared latest floor plan with client", contactPerson: "Mr. Sharma", status: "completed", createdAt: "2025-01-29" },
    { id: 2, type: "call", content: "Follow-up call regarding material selection", contactPerson: "Mrs. Sharma", status: "pending", followUpDate: "2025-02-02" },
  ];

  // Calculate project progress
  const calculateProgress = () => {
    const completedTasks = mockTasks.filter(task => task.status === "completed").length;
    return Math.round((completedTasks / mockTasks.length) * 100);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'image': return <Image className="h-5 w-5 text-blue-500" />;
      case 'excel': return <File className="h-5 w-5 text-green-500" />;
      case 'cad': return <File className="h-5 w-5 text-purple-500" />;
      default: return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFiles = selectedFileType === "all" 
    ? mockFiles 
    : mockFiles.filter(file => file.category.toLowerCase() === selectedFileType);

  if (projectLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Not Found</h3>
          <p className="text-gray-500 mb-4">The requested project could not be found.</p>
          <Button onClick={() => setLocation('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/projects')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">Code: {project.code}</span>
                <Badge variant="secondary" className="text-xs">
                  {project.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                {client && (
                  <span className="text-sm text-gray-500">Client: {client.name}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{calculateProgress()}% Complete</div>
              <ProgressBar value={calculateProgress()} className="w-32 mt-1" />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-lg p-1 shadow-sm">
            <TabsTrigger value="files" className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>Files & Drawings</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Project Notes</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Task Management</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Progress Tracker</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Client Communication</span>
            </TabsTrigger>
          </TabsList>

          {/* Files & Drawings Tab */}
          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <FolderOpen className="h-5 w-5" />
                    <span>Files / Drawings / Site Photos</span>
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                      <SelectTrigger className="w-48">
                        <Tag className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="layouts">Layouts</SelectItem>
                        <SelectItem value="boq">BOQ</SelectItem>
                        <SelectItem value="site photos">Site Photos</SelectItem>
                        <SelectItem value="cad">CAD Drawings</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(file.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">{file.size}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {file.category}
                          </Badge>
                          <span className="text-xs text-gray-500">{file.uploadedAt}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Project Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Project Notes / Logs</span>
                  </CardTitle>
                  <Button 
                    onClick={() => setIsNoteDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockNotes.map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{note.content}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {note.type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                by {note.author} at {note.createdAt}
                              </span>
                              {note.taggedUsers.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Users className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    @{note.taggedUsers.join(', @')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Task Management Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Task Management</span>
                  </CardTitle>
                  <Button 
                    onClick={() => setIsTaskDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.assignedTo}</TableCell>
                          <TableCell>{task.dueDate}</TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tracker Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {calculateProgress()}%
                    </div>
                    <ProgressBar value={calculateProgress()} className="mb-4" />
                    <p className="text-sm text-gray-500">
                      {mockTasks.filter(t => t.status === 'completed').length} of {mockTasks.length} tasks completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['prospect', 'execution', 'design-presentation', 'boq-shared', 'won', 'completed'].map((stage, index) => (
                      <div key={stage} className="flex items-center space-x-3">
                        {project.stage === stage ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        ) : index < ['prospect', 'execution', 'design-presentation', 'boq-shared', 'won', 'completed'].indexOf(project.stage) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <span className={`text-sm ${project.stage === stage ? 'font-medium text-blue-600' : 'text-gray-600'}`}>
                          {stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending</span>
                      <Badge className="bg-gray-100 text-gray-800">
                        {mockTasks.filter(t => t.status === 'pending').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">In Progress</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {mockTasks.filter(t => t.status === 'in-progress').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completed</span>
                      <Badge className="bg-green-100 text-green-800">
                        {mockTasks.filter(t => t.status === 'completed').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Client Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>Client Communication Tracker</span>
                  </CardTitle>
                  <Button 
                    onClick={() => setIsCommunicationDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCommunications.map((comm) => (
                    <Card key={comm.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {comm.type === 'whatsapp' && <MessageCircle className="h-4 w-4 text-green-600" />}
                              {comm.type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                              {comm.type === 'call' && <Phone className="h-4 w-4 text-orange-600" />}
                              {comm.type === 'meeting' && <Users className="h-4 w-4 text-purple-600" />}
                              <Badge variant="outline" className="text-xs">
                                {comm.type}
                              </Badge>
                              <Badge className={getStatusColor(comm.status)}>
                                {comm.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900 mb-2">{comm.content}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Contact: {comm.contactPerson}</span>
                              <span>Date: {comm.createdAt}</span>
                              {comm.followUpDate && (
                                <span>Follow-up: {comm.followUpDate}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form className="space-y-4">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter task description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned To</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter assignee name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Task</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Note</DialogTitle>
          </DialogHeader>
          <Form {...noteForm}>
            <form className="space-y-4">
              <FormField
                control={noteForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your note..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={noteForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select note type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="note">General Note</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Note</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Communication Dialog */}
      <Dialog open={isCommunicationDialogOpen} onOpenChange={setIsCommunicationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Client Communication</DialogTitle>
          </DialogHeader>
          <Form {...communicationForm}>
            <form className="space-y-4">
              <FormField
                control={communicationForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select communication type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={communicationForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter communication details..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={communicationForm.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact person" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={communicationForm.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCommunicationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Log Communication</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}