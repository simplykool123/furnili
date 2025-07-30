import { useState, useEffect, useMemo } from "react";
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

const uploadSchema = z.object({
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  files: z.any().optional(),
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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

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

  const uploadForm = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      type: "",
      title: "",
      files: undefined,
    },
  });

  // Optimized Queries with caching
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
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
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
    enabled: !!project?.clientId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
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

  // Memoized calculations for better performance
  const projectProgress = useMemo(() => {
    const completedTasks = mockTasks.filter(task => task.status === "completed").length;
    return Math.round((completedTasks / mockTasks.length) * 100);
  }, []);

  const taskSummary = useMemo(() => ({
    pending: mockTasks.filter(t => t.status === 'pending').length,
    inProgress: mockTasks.filter(t => t.status === 'in-progress').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
  }), []);

  const filteredFiles = useMemo(() => {
    return selectedFileType === "all" 
      ? mockFiles 
      : mockFiles.filter(file => file.category.toLowerCase() === selectedFileType);
  }, [selectedFileType]);

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

  // Stage update mutation
  const stageUpdateMutation = useMutation({
    mutationFn: async (newStage: string) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({
        title: "Success",
        description: "Project stage updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project stage",
        variant: "destructive",
      });
    },
  });

  const handleStageChange = (newStage: string) => {
    stageUpdateMutation.mutate(newStage);
  };



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
      {/* Modern Header matching mockup */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/projects')}
                className="p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">{project.name} - {project.code}</h1>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Edit className="h-4 w-4" />
                    <span>P-176</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{client?.name || 'Loading...'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>{client?.phone || '9500638851'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stage Selector */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 mb-1">Stage</div>
                <Select value={project.stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="w-40 bg-gray-100 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="execution">Execution</SelectItem>
                    <SelectItem value="design-presentation">Design Presentation</SelectItem>
                    <SelectItem value="boq-shared">BOQ Shared</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs with Enhanced UX */}
        <div className="px-6 border-b border-gray-100 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-auto bg-transparent p-0 space-x-6 min-w-max flex">
              <TabsTrigger 
                value="files" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📂</span>
                <FolderOpen className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Files</span>
              </TabsTrigger>
              <TabsTrigger 
                value="moodboard" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">🎨</span>
                <Image className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Moodboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">🗒️</span>
                <MessageSquare className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Notes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">✅</span>
                <CheckCircle className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Tasks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="quotes" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">💸</span>
                <FileText className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Quotes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📦</span>
                <Building2 className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Orders</span>
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📅</span>
                <Calendar className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Activities</span>
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📊</span>
                <BarChart3 className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Progress</span>
              </TabsTrigger>
              <TabsTrigger 
                value="manpower" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">👷</span>
                <Users className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Manpower</span>
              </TabsTrigger>
              <TabsTrigger 
                value="financials" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">💰</span>
                <Target className="hidden sm:block h-4 w-4" />
                <span className="font-medium text-sm">Finances</span>
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-transparent text-gray-600 data-[state=active]:text-blue-600 rounded-none"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="font-medium">Details</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Files Tab - Modern Design with Image Thumbnails */}
          <TabsContent value="files" className="p-6 bg-gray-50">
            {/* File Categories Tabs */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-4">
                  <Button 
                    variant={selectedFileType === "recce" ? "default" : "outline"}
                    onClick={() => setSelectedFileType("recce")}
                    className={selectedFileType === "recce" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300"}
                  >
                    Recce
                  </Button>
                  <Button 
                    variant={selectedFileType === "design" ? "default" : "outline"}
                    onClick={() => setSelectedFileType("design")}
                    className={selectedFileType === "design" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300"}
                  >
                    Design
                  </Button>
                  <Button 
                    variant={selectedFileType === "drawing" ? "default" : "outline"}
                    onClick={() => setSelectedFileType("drawing")}
                    className={selectedFileType === "drawing" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300"}
                  >
                    Drawing
                  </Button>
                </div>
                <Button 
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            </div>

            {/* Uploaded Files Section - Only show when files exist */}
            {filteredFiles.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Uploaded Files</h3>
                  <Badge variant="secondary" className="text-xs">
                    {filteredFiles.length} files
                  </Badge>
                </div>
                
                {/* Compact file list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{file.category}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no files */}
            {filteredFiles.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded</h3>
                <p className="text-gray-500 mb-6">Upload your first file to get started</p>
              </div>
            )}
          </TabsContent>

          {/* Moodboard Tab */}
          <TabsContent value="moodboard" className="p-6 bg-gray-50">
            <div className="text-center py-12">
              <Image className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Moodboard</h3>
              <p className="text-gray-500 mb-6">Create a visual inspiration board for this project</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            </div>
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
                      {projectProgress}%
                    </div>
                    <ProgressBar value={projectProgress} className="mb-4" />
                    <p className="text-sm text-gray-500">
                      {taskSummary.completed} of {mockTasks.length} tasks completed
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

          {/* Additional Tab Placeholders */}
          <TabsContent value="quotes" className="p-6 bg-gray-50">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Quotes Management</h3>
              <p className="text-gray-500 mb-6">Create and manage project quotes and estimates</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Quote
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="p-6 bg-gray-50">
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Orders Management</h3>
              <p className="text-gray-500 mb-6">Track project orders and material procurement</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="p-6 bg-gray-50">
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Activities Timeline</h3>
              <p className="text-gray-500 mb-6">Track project activities and milestones</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manpower" className="p-6 bg-gray-50">
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manpower Management</h3>
              <p className="text-gray-500 mb-6">Assign and manage project team members</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Assign Team
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="financials" className="p-6 bg-gray-50">
            <div className="text-center py-12">
              <Target className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Tracking</h3>
              <p className="text-gray-500 mb-6">Monitor project budget and expenses</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="details" className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Project Name</label>
                    <p className="text-gray-900">{project.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Project Code</label>
                    <p className="text-gray-900">{project.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-gray-900">{project.description || 'No description provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stage</label>
                    <p className="text-gray-900">{project.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Client Name</label>
                        <p className="text-gray-900">{client.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-gray-900">{client.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-gray-900">{client.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Company</label>
                        <p className="text-gray-900">{client.company || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Loading client information...</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>Create a new task for this project</DialogDescription>
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
            <DialogDescription>Add a note or log entry for this project</DialogDescription>
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
            <DialogDescription>Record communication with the client for this project</DialogDescription>
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

      {/* Upload Files Dialog - Matching Mockup Design */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Upload Files</DialogTitle>
            <DialogDescription>Upload files to organize in project categories</DialogDescription>
          </DialogHeader>
          <Form {...uploadForm}>
            <form 
              className="space-y-4"
              onSubmit={uploadForm.handleSubmit((data) => {
                console.log('Upload form data:', data, selectedFiles);
                toast({
                  title: "Files uploaded successfully",
                  description: `${selectedFiles?.length || 0} files uploaded`,
                });
                setIsUploadDialogOpen(false);
                setSelectedFiles(null);
                uploadForm.reset();
              })}
            >
              <FormField
                control={uploadForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                          <SelectValue placeholder="Select file type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rooms">Rooms</SelectItem>
                        <SelectItem value="internal-areas">Internal Areas</SelectItem>
                        <SelectItem value="drawings">Drawings</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="site-photos">Site Photos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={uploadForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter file title" 
                        className="w-full bg-gray-50 border-gray-200"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Files <span className="text-red-500">*</span>
                </label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      setSelectedFiles(files);
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.dwg"
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      {selectedFiles && selectedFiles.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-700">
                            {selectedFiles.length} file(s) selected
                          </p>
                          <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                            {Array.from(selectedFiles).map((file, index) => (
                              <div key={index} className="truncate">
                                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            Drag and drop files here, or click to select
                          </p>
                          <p className="text-xs text-gray-400">
                            Supports: Images, PDF, DOC, DOCX, DWG
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadDialogOpen(false)}
                  className="text-gray-600 border-gray-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  disabled={!selectedFiles || selectedFiles.length === 0}
                >
                  Submit
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}