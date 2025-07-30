import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Upload, Download, File, Image, FileText, Calendar, 
  User, MessageSquare, Phone, CheckCircle, Clock, AlertCircle,
  Plus, Edit, Trash2, Tag, Users, BarChart3, Target,
  MessageCircle, Mail, ExternalLink, Paperclip, FolderOpen,
  Camera, Building2, MapPin, Star, Circle, CheckCircle2, Eye, RefreshCw, X,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Link } from "wouter";

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
  title: z.string().min(1, "Title is required"),
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

const moodboardSchema = z.object({
  name: z.string().min(1, "Moodboard name is required"),
  keywords: z.string().min(1, "Keywords are required"),
  roomType: z.string().min(1, "Room type is required"),
  inspirationType: z.enum(["ai", "real"]),
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
  const [isMoodboardDialogOpen, setIsMoodboardDialogOpen] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [activeFileTab, setActiveFileTab] = useState("recce");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<{[key: string]: 'loading' | 'loaded' | 'error'}>({});
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);
  const [noteFiles, setNoteFiles] = useState<FileList | null>(null);
  
  // New state for grouped images
  const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<{ fileId: number; comment: string } | null>(null);
  const [groupTitles, setGroupTitles] = useState<Record<string, string>>({
    recce: "Internal Recce",
    design: "Design Files", 
    drawing: "Technical Drawings",
    documents: "Documents",
    general: "General Files"
  });

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
      title: "",
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

  const moodboardForm = useForm({
    resolver: zodResolver(moodboardSchema),
    defaultValues: {
      name: "",
      keywords: "",
      roomType: "",
      inspirationType: "real" as const,
    },
  });

  // Handle file deletion
  const handleDeleteFile = async (fileId: number, fileName: string) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      // Refresh the files list
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate preview images based on form data
  const generatePreview = async () => {
    const formData = moodboardForm.getValues();
    if (!formData.keywords || !formData.roomType || !formData.inspirationType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to generate preview",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPreview(true);
    
    try {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let images: string[] = [];
      const randomSeed = Math.floor(Math.random() * 1000);
      
      if (formData.inspirationType === 'ai') {
        // AI-style interior design images focused on walls, cupboards, furniture
        const roomTypeImages: Record<string, string[]> = {
          'living-room': [
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`, // Modern living room
            `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=300&fit=crop&auto=format`, // Wall design
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format&blur=1`, // Blurred effect
            `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=300&fit=crop&auto=format&blur=1`
          ],
          'bedroom': [
            `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&auto=format`, // Bedroom design
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`, // Wall treatments
            `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&auto=format&blur=1`,
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format&blur=1`
          ],
          'kitchen': [
            `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format`, // Kitchen cabinets
            `https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&auto=format`, // Kitchen design
            `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format&blur=1`,
            `https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&auto=format&blur=1`
          ]
        };
        images = roomTypeImages[formData.roomType] || roomTypeImages['living-room'];
      } else {
        // Real photo inspiration images for interior design
        const roomTypeImages: Record<string, string[]> = {
          'living-room': [
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format`
          ],
          'bedroom': [
            `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format`
          ],
          'kitchen': [
            `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format`
          ]
        };
        images = roomTypeImages[formData.roomType] || roomTypeImages['living-room'];
      }
      
      setPreviewImages(images);
      setPreviewGenerated(true);
      
      toast({
        title: "Preview Generated",
        description: `${formData.inspirationType === 'ai' ? 'AI-generated' : 'Real photo'} moodboard preview ready`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Regenerate preview with different images
  const regeneratePreview = () => {
    setPreviewGenerated(false);
    setPreviewImages([]);
    generatePreview();
  };

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
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    gcTime: 10 * 60 * 1000,
  });

  // Real project files from database
  const { data: projectFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'files'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project files');
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Query for project logs/notes
  const projectLogsQuery = useQuery({
    queryKey: ['/api/projects', projectId, 'logs'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project logs');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Query for project moodboards
  const { data: projectMoodboards = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'moodboards'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/moodboards`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project moodboards');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Query for project material requests (orders)
  const { data: projectOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/requests', 'project', projectId],
    queryFn: async () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/requests?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch project orders');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Separate moodboard images from regular files
  const moodboardImages = useMemo(() => {
    return projectFiles.filter((file: any) => 
      file.category === 'moodboard' && 
      file.mimeType?.includes('image')
    );
  }, [projectFiles]);

  // Mutations for database operations
  const createLogMutation = useMutation({
    mutationFn: async (logData: any) => {
      return apiRequest('POST', `/api/projects/${projectId}/logs`, logData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'logs'] });
      setIsNoteDialogOpen(false);
      noteForm.reset();
      setNoteFiles(null);
      toast({ title: "Note added successfully!" });
    },
  });



  // Form submission handlers
  const handleNoteSubmit = () => {
    const title = noteForm.watch('title');
    const content = noteForm.watch('content');
    
    if (!content) {
      toast({
        title: "Error",
        description: "Note content is required",
        variant: "destructive",
      });
      return;
    }
    
    createLogMutation.mutate({
      title: title || 'Meeting Note',
      content: content,
      type: noteForm.watch('type') || 'note',
      attachments: noteFiles ? Array.from(noteFiles).map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      })) : []
    });
  };

  // Note deletion mutation  
  const deleteLogMutation = useMutation({
    mutationFn: async (logId: number) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'logs'] });
      toast({ title: "Note deleted successfully!" });
    },
  });

  // Comment update mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ fileId, comment }: { fileId: number; comment: string }) => {
      return apiRequest('PUT', `/api/files/${fileId}/comment`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      setEditingComment(null);
      // No toast notification for seamless inline editing
    },
  });

  const handleMoodboardCreate = (data: any) => {
    console.log('Creating moodboard with data:', data);
    console.log('Form errors:', moodboardForm.formState.errors);
    
    // Use preview images if available, otherwise generate new ones
    let finalImages = previewImages;
    if (!previewGenerated || previewImages.length === 0) {
      if (data.inspirationType === 'ai') {
        // AI-style interior design images focused on walls, cupboards, furniture
        const roomTypeImages = {
          'living-room': [
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`, // Modern living room
            `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=300&fit=crop&auto=format`, // Wall design
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format&blur=1`, // Blurred effect
            `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=300&fit=crop&auto=format&blur=1`
          ],
          'bedroom': [
            `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&auto=format`, // Bedroom design
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`, // Wall treatments
            `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&auto=format&blur=1`,
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format&blur=1`
          ],
          'kitchen': [
            `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format`, // Kitchen cabinets
            `https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&auto=format`, // Kitchen design
            `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format&blur=1`,
            `https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&auto=format&blur=1`
          ]
        };
        finalImages = roomTypeImages[data.roomType] || roomTypeImages['living-room'];
      } else {
        // Real photo inspiration images for interior design
        const roomTypeImages = {
          'living-room': [
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format`
          ],
          'bedroom': [
            `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format`
          ],
          'kitchen': [
            `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop&auto=format`,
            `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format`
          ]
        };
        finalImages = roomTypeImages[data.roomType] || roomTypeImages['living-room'];
      }
    }
    
    const moodboardData = {
      ...data,
      sourceType: data.inspirationType === 'ai' ? 'ai_generated' : 'real_photos',
      imageUrls: finalImages,
      linkedProjectId: parseInt(projectId),
    };
    // Remove the old field name
    delete moodboardData.inspirationType;
    console.log('Final moodboard data:', moodboardData);
    createMoodboardMutation.mutate(moodboardData);
  };

  // Note creation handler
  const handleNoteCreate = (data: any) => {
    console.log('Creating note with data:', data);
    const noteData = {
      logType: data.type, // Map 'type' to 'logType' for database schema
      title: data.title || "Untitled Note", // Use title field from form
      description: data.content,
      projectId: parseInt(projectId),
    };
    createNoteMutation.mutate(noteData);
  };

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

  // Project stages in order
  const projectStages = [
    'prospect', 'recce-done', 'design-in-progress', 'design-approved', 
    'estimate-given', 'client-approved', 'production', 'installation', 
    'handover', 'completed'
  ];

  // Memoized calculations for better performance
  const projectProgress = useMemo(() => {
    if (!project?.stage) return 0;
    
    // Special handling for optional stages
    if (project.stage === 'on-hold' || project.stage === 'lost') {
      const lastMainStage = project.previousStage || 'prospect';
      const stageIndex = projectStages.indexOf(lastMainStage);
      return Math.round(((stageIndex + 1) / projectStages.length) * 100);
    }
    
    const currentStageIndex = projectStages.indexOf(project.stage);
    if (currentStageIndex === -1) return 0;
    
    // Calculate percentage: (completed stages + 1) / total stages * 100
    return Math.round(((currentStageIndex + 1) / projectStages.length) * 100);
  }, [project?.stage]);

  const stageProgress = useMemo(() => {
    if (!project?.stage) return { completed: 0, total: projectStages.length, current: 'prospect' };
    
    // Special handling for optional stages
    if (project.stage === 'on-hold' || project.stage === 'lost') {
      const lastMainStage = project.previousStage || 'prospect';
      const stageIndex = projectStages.indexOf(lastMainStage);
      return { 
        completed: stageIndex + 1, 
        total: projectStages.length, 
        current: lastMainStage 
      };
    }
    
    const currentStageIndex = projectStages.indexOf(project.stage);
    return { 
      completed: currentStageIndex + 1, 
      total: projectStages.length, 
      current: project.stage 
    };
  }, [project?.stage]);

  const taskSummary = useMemo(() => ({
    pending: mockTasks.filter(t => t.status === 'pending').length,
    inProgress: mockTasks.filter(t => t.status === 'in-progress').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
  }), []);

  const filteredFiles = useMemo(() => {
    if (selectedFileType === "all") return projectFiles;
    
    const categoryMap: Record<string, string> = {
      "recce": "recce",
      "design": "design", 
      "drawing": "drawing"
    };
    
    const targetCategory = categoryMap[selectedFileType.toLowerCase()];
    return projectFiles.filter((file: any) => 
      file.category?.toLowerCase() === targetCategory
    );
  }, [projectFiles, selectedFileType]);

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType?.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || fileName?.endsWith('.xlsx')) return <File className="h-5 w-5 text-green-500" />;
    if (fileName?.endsWith('.dwg')) return <File className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
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

  // Moodboard deletion mutation
  const deleteMoodboardMutation = useMutation({
    mutationFn: async (moodboardId: number) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/moodboards/${moodboardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to delete moodboard');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'moodboards'] });
      toast({
        title: "Success",
        description: "Moodboard deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete moodboard",
        variant: "destructive",
      });
    },
  });

  // Moodboard creation mutation
  const createMoodboardMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch('/api/moodboards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          linkedProjectId: parseInt(projectId),
        }),
      });
      if (!response.ok) throw new Error('Failed to create moodboard');
      return response.json();
    },
    onSuccess: () => {
      setIsMoodboardDialogOpen(false);
      moodboardForm.reset();
      setPreviewImages([]);
      setPreviewGenerated(false);
      toast({
        title: "Success",
        description: "Moodboard created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create moodboard",
        variant: "destructive",
      });
    },
  });

  // Stage update mutation
  const stageUpdateMutation = useMutation({
    mutationFn: async (newStage: string) => {
      return apiRequest('PATCH', `/api/projects/${projectId}`, { stage: newStage });
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

  // Note creation mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'logs'] });
      setIsNoteDialogOpen(false);
      noteForm.reset();
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });



  // File upload mutation
  const fileUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error('File upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      uploadForm.reset();
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    },
  });



  const handleFileUpload = (data: any) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('category', data.type);
    formData.append('title', data.title);
    formData.append('clientVisible', 'true');
    
    Array.from(selectedFiles).forEach((file) => {
      formData.append('files', file);
    });

    fileUploadMutation.mutate(formData);
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
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs with Enhanced UX */}
        <div className="px-4 border-b border-gray-100 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-auto bg-transparent p-0 space-x-4 min-w-max flex">
              <TabsTrigger 
                value="files" 
                className="flex items-center space-x-1 px-0 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-sm">📂</span>
                <span className="font-medium text-xs">Files</span>
              </TabsTrigger>
              <TabsTrigger 
                value="moodboard" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">🎨</span>
                <span className="font-medium text-sm">Moodboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">🗒️</span>
                <span className="font-medium text-sm">Notes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">✅</span>
                <span className="font-medium text-sm">Tasks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="quotes" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">💸</span>
                <span className="font-medium text-sm">Quotes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📦</span>
                <span className="font-medium text-sm">Orders</span>
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📅</span>
                <span className="font-medium text-sm">Activities</span>
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📊</span>
                <span className="font-medium text-sm">Progress</span>
              </TabsTrigger>

              <TabsTrigger 
                value="financials" 
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">💰</span>
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
      <div className="p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">

          {/* Files Tab - Modern Design with Image Thumbnails */}
          <TabsContent value="files" className="p-3 bg-gray-50">
            {/* File Categories Tabs */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex space-x-2">
                  <Button 
                    variant={selectedFileType === "recce" ? "default" : "outline"}
                    onClick={() => setSelectedFileType("recce")}
                    className={`h-8 text-xs ${selectedFileType === "recce" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Recce
                  </Button>
                  <Button 
                    variant={selectedFileType === "design" ? "default" : "outline"}
                    onClick={() => setSelectedFileType("design")}
                    className={`h-8 text-xs ${selectedFileType === "design" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Design
                  </Button>
                  <Button 
                    variant={selectedFileType === "drawing" ? "default" : "outline"}
                    onClick={() => setSelectedFileType("drawing")}
                    className={`h-8 text-xs ${selectedFileType === "drawing" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Drawing
                  </Button>
                  
                </div>
                <div className="flex space-x-2">
                  {selectedFileType === "moodboard" ? (
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => setIsMoodboardDialogOpen(true)}
                        className="btn-primary"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Create Moodboard
                      </Button>
                      <Button 
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="btn-outline"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setIsUploadDialogOpen(true)}
                      className="btn-primary btn-sm"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Files
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Moodboard Section - Show when moodboard tab is selected */}
            {selectedFileType === "moodboard" && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Moodboards</h3>
                <div className="text-gray-500 text-center py-8">
                  <div className="bg-gray-100 rounded-lg p-8">
                    <div className="text-4xl mb-4">🎨</div>
                    <h4 className="text-lg font-medium mb-2">No moodboards created yet</h4>
                    <p className="text-sm text-gray-600 mb-4">Create beautiful moodboards with AI-generated images or real photos</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={() => setIsMoodboardDialogOpen(true)}
                        className="btn-primary"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Create Moodboard
                      </Button>
                      <Button 
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="btn-outline"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grouped Images Interface */}
            {selectedFileType !== "moodboard" && filteredFiles.length > 0 && (
              <div className="space-y-4">
                {Object.entries(
                  filteredFiles.reduce((groups: any, file: any) => {
                    const category = file.category || 'general';
                    if (!groups[category]) groups[category] = [];
                    groups[category].push(file);
                    return groups;
                  }, {})
                ).map(([category, files]: [string, any]) => (
                  <div key={category} className="bg-white rounded-lg border border-gray-200 p-4">
                    {/* Editable Group Title */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {editingGroupTitle === category ? (
                          <input
                            type="text"
                            value={groupTitles[category] || category}
                            onChange={(e) => setGroupTitles({
                              ...groupTitles,
                              [category]: e.target.value
                            })}
                            onBlur={() => setEditingGroupTitle(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingGroupTitle(null);
                            }}
                            className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                            autoFocus
                          />
                        ) : (
                          <h3 
                            className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() => setEditingGroupTitle(category)}
                          >
                            {groupTitles[category] || category}
                          </h3>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {files.length} files
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add More
                      </Button>
                    </div>

                    {/* Image Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {files.map((file: any) => (
                        <div key={file.id} className="group relative">
                          {/* Image Thumbnail */}
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                            {file.mimeType?.includes('image') ? (
                              <img
                                src={`/uploads/products/${file.fileName}`}
                                alt={file.originalName}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => {
                                  setPreviewImage({
                                    src: `/uploads/products/${file.fileName}`,
                                    name: file.originalName
                                  });
                                  setShowImagePreview(true);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {getFileIcon(file.mimeType, file.originalName)}
                              </div>
                            )}

                            {/* Three-dot menu */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setPreviewImage({
                                        src: `/uploads/products/${file.fileName}`,
                                        name: file.originalName
                                      });
                                      setShowImagePreview(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Full Size
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`/uploads/products/${file.fileName}`}
                                      download={file.originalName}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </a>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteFile(file.id, file.fileName)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Inline Editable Comment Section */}
                          <div className="mt-2">
                            <div className="bg-gray-50 rounded p-2 min-h-[40px] flex items-center">
                              <input
                                type="text"
                                value={editingComment?.fileId === file.id ? editingComment.comment : (file.comment || '')}
                                placeholder="Nice"
                                onChange={(e) => {
                                  setEditingComment({ fileId: file.id, comment: e.target.value });
                                }}
                                onFocus={() => {
                                  if (!editingComment || editingComment.fileId !== file.id) {
                                    setEditingComment({ fileId: file.id, comment: file.comment || '' });
                                  }
                                }}
                                onBlur={() => {
                                  if (editingComment?.fileId === file.id && editingComment) {
                                    // Auto-save when clicking elsewhere
                                    updateCommentMutation.mutate({
                                      fileId: file.id,
                                      comment: editingComment.comment
                                    });
                                  }
                                }}
                                className="text-xs text-gray-700 flex-1 bg-transparent border-none outline-none placeholder-gray-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Project Moodboards</h3>
              <div className="flex space-x-3">
                <Button 
                  onClick={() => setIsMoodboardDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Create Moodboard
                </Button>
                <Button 
                  onClick={() => setIsUploadDialogOpen(true)}
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </div>
            </div>

            {/* Combined Moodboards and Uploaded Images Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Display Database Moodboards */}
              {projectMoodboards.map((moodboard: any) => (
                <div key={`moodboard-${moodboard.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Image Display Area */}
                  <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    {moodboard.imageUrls && moodboard.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
                        {moodboard.imageUrls.slice(0, 4).map((url: string, index: number) => (
                          <img 
                            key={index}
                            src={url} 
                            alt={`Moodboard ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              console.log('Image failed to load:', url);
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTG9hZGluZy4uLjwvdGV4dD4KPHN2Zz4=';
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', url);
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎨</div>
                        <p className="text-sm text-gray-500">No images yet</p>
                        <p className="text-xs text-gray-400 mt-1">Click to add images</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{moodboard.name}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{moodboard.keywords}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                        onClick={() => deleteMoodboardMutation.mutate(moodboard.id)}
                        disabled={deleteMoodboardMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span className="capitalize">{moodboard.roomType?.replace('-', ' ')}</span>
                      <span>{moodboard.sourceType === 'ai_generated' || moodboard.sourceType === 'ai' ? '🤖 AI Generated' : '📷 Real Photos'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Created {new Date(moodboard.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Display Uploaded Moodboard Images (only show if no duplicate in moodboards) */}
              {moodboardImages.filter((file: any) => 
                !projectMoodboards.some((mb: any) => 
                  mb.imageUrls && mb.imageUrls.includes(`/uploads/products/${file.fileName}`)
                )
              ).map((file: any) => (
                <div key={`upload-${file.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Image Display */}
                  <div className="h-48 bg-gray-100">
                    <img 
                      src={`/uploads/products/${file.fileName}`}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA3NEg2M0M2MS4zNDMxIDc0IDYwIDc1LjM0MzEgNjAgNzdWMTIzQzYwIDEyNC42NTcgNjEuMzQzMSAxMjYgNjMgMTI2SDEzN0MxMzguNjU3IDEyNiAxNDAgMTI0LjY1NyAxNDAgMTIzVjc3QzE0MCA3NS4zNDMxIDEzOC42NTcgNzQgMTM3IDc0SDExM001IDkxSDE0MIIgc3Ryb2tlPSIjOTlBM0E0IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">Uploaded Image</h4>
                        <p className="text-sm text-gray-600 truncate mt-1">{file.originalName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>Moodboard Image</span>
                      <span>📷 Uploaded</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Uploaded {new Date(file.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Show empty state only if no moodboards AND no uploaded images */}
            {projectMoodboards.length === 0 && moodboardImages.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200">
                  <div className="text-6xl mb-6">🎨</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">No moodboards created yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Create beautiful moodboards with AI-generated inspiration or curated real photos from design platforms, or upload your own images
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={() => setIsMoodboardDialogOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
                    >
                      <Star className="h-5 w-5 mr-2" />
                      Create Moodboard
                    </Button>
                    <Button 
                      onClick={() => setIsUploadDialogOpen(true)}
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 px-8 py-3"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Images
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Project Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            {/* Add New Note Form */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-title" className="text-sm font-medium">Title</Label>
                    <Input
                      id="note-title"
                      placeholder="First Meeting MoM"
                      className="w-full"
                      value={noteForm.watch('title') || ''}
                      onChange={(e) => noteForm.setValue('title', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="note-content" className="text-sm font-medium">
                      Note <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="note-content"
                      placeholder="Client wants bedroom to be in red and white them"
                      className="min-h-[120px] resize-none"
                      value={noteForm.watch('content') || ''}
                      onChange={(e) => noteForm.setValue('content', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Files</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        id="note-files"
                        multiple
                        accept="image/*,application/pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => setNoteFiles(e.target.files)}
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('note-files')?.click()}
                        className="text-sm"
                      >
                        Upload
                      </Button>
                      {noteFiles && noteFiles.length > 0 ? (
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-blue-600">
                            {noteFiles.length} file{noteFiles.length > 1 ? 's' : ''} selected
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNoteFiles(null)}
                            className="h-auto p-1 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No file selected</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleNoteSubmit}
                      disabled={!noteForm.watch('content') || createLogMutation.isPending}
                      style={{ backgroundColor: 'hsl(28, 100%, 25%)', color: 'white' }}
                      className="hover:opacity-90"
                    >
                      {createLogMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        'Add Note'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">All Notes</h3>
              
              {projectLogsQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading notes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(projectLogsQuery.data || []).map((log) => (
                    <Card key={log.id} className="bg-white border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {/* User Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {log.author ? log.author.split(' ').map(n => n[0]).join('').toUpperCase() : 'TU'}
                            </div>
                          </div>
                          
                          {/* Note Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-base font-medium text-gray-900 mb-1">
                                  {log.title || 'Meeting Note'}
                                </h4>
                                <p className="text-sm text-gray-700 mb-2">{log.content}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>{log.author || 'Test User'}</span>
                                  <span>
                                    {new Date(log.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: '2-digit',
                                      year: 'numeric'
                                    })} {new Date(log.createdAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                
                                {/* File Attachments */}
                                {log.attachments && log.attachments.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {log.attachments.map((attachment, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                                        onClick={() => setPreviewImage({ src: attachment.url, name: attachment.name })}
                                      >
                                        <Paperclip className="h-3 w-3 text-gray-500" />
                                        <span className="text-xs text-gray-600 truncate max-w-[100px]">
                                          {attachment.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Actions Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => deleteLogMutation.mutate(log.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {(projectLogsQuery.data || []).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No notes yet</p>
                      <p className="text-sm">Add your first note using the form above</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                      {stageProgress.completed} of {stageProgress.total} stages completed
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
                    {['prospect', 'recce-done', 'design-in-progress', 'design-approved', 'estimate-given', 'client-approved', 'production', 'installation', 'handover', 'completed'].map((stage, index) => (
                      <div key={stage} className="flex items-center space-x-3">
                        {project.stage === stage ? (
                          <CheckCircle2 className="h-5 w-5 text-amber-900" />
                        ) : index < ['prospect', 'recce-done', 'design-in-progress', 'design-approved', 'estimate-given', 'client-approved', 'production', 'installation', 'handover', 'completed'].indexOf(project.stage) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <span className={`text-sm ${project.stage === stage ? 'font-medium text-amber-900' : 'text-gray-600'}`}>
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Material Requests (Orders)</h3>
              <Link href={`/requests?projectId=${projectId}`}>
                <Button 
                  className="bg-amber-900 hover:bg-amber-800 text-white"
                  style={{ backgroundColor: 'hsl(28, 100%, 25%)', '&:hover': { backgroundColor: 'hsl(28, 100%, 20%)' } }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </Link>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : projectOrders.length > 0 ? (
              <div className="space-y-4">
                {projectOrders.map((order: any) => (
                  <Card key={order.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">
                            Order #{order.orderNumber}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            Client: {order.clientName}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            ₹{order.totalValue?.toLocaleString() || '0'}
                          </div>
                          <Badge 
                            variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'approved' ? 'secondary' :
                              order.status === 'pending' ? 'outline' : 'destructive'
                            }
                            className={
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>Priority: {order.priority}</span>
                          {order.items && (
                            <span>{order.items.length} items</span>
                          )}
                        </div>
                        <span>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {order.remarks && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Remarks:</span> {order.remarks}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Material Requests</h3>
                <p className="text-gray-500 mb-6">Create your first material request for this project</p>
                <Link href={`/requests?projectId=${projectId}`}>
                  <Button 
                    className="bg-amber-900 hover:bg-amber-800 text-white"
                    style={{ backgroundColor: 'hsl(28, 100%, 25%)', '&:hover': { backgroundColor: 'hsl(28, 100%, 20%)' } }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Order
                  </Button>
                </Link>
              </div>
            )}
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
                <Button type="button" className="btn-outline" onClick={() => setIsTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">Add Task</Button>
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
            <form onSubmit={noteForm.handleSubmit(handleNoteCreate)} className="space-y-4">
              <FormField
                control={noteForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter note title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={noteForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note *</FormLabel>
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
                <Button type="submit" className="btn-primary">Add Note</Button>
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
              onSubmit={uploadForm.handleSubmit(handleFileUpload)}
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
                        <SelectItem value="recce">Recce</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="drawing">Drawing</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="site-photos">Site Photos</SelectItem>
                        <SelectItem value="moodboard">Moodboard Images</SelectItem>
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
                  disabled={!selectedFiles || selectedFiles.length === 0 || fileUploadMutation.isPending}
                >
                  {fileUploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Note</DialogTitle>
          </DialogHeader>
          <Form {...noteForm}>
            <form onSubmit={noteForm.handleSubmit(handleNoteSubmit)} className="space-y-4">
              <FormField
                control={noteForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter note content..." {...field} />
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
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
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
                <Button type="submit" disabled={createLogMutation.isPending}>
                  {createLogMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Moodboard Dialog */}
      <Dialog open={isMoodboardDialogOpen} onOpenChange={setIsMoodboardDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Moodboard</DialogTitle>
            <DialogDescription>Create a moodboard for your project with AI inspiration or real photos</DialogDescription>
          </DialogHeader>
          <Form {...moodboardForm}>
            <form onSubmit={moodboardForm.handleSubmit(handleMoodboardCreate)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={moodboardForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moodboard Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Living Room Concept" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={moodboardForm.control}
                  name="roomType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="living-room">Living Room</SelectItem>
                          <SelectItem value="bedroom">Bedroom</SelectItem>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="bathroom">Bathroom</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="dining-room">Dining Room</SelectItem>
                          <SelectItem value="outdoor">Outdoor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={moodboardForm.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords & Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., modern, minimalist, warm colors, wood texture" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">Preview</label>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generatePreview}
                      disabled={isGeneratingPreview}
                    >
                      {isGeneratingPreview ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-2" />
                          Generate Preview
                        </>
                      )}
                    </Button>
                    {previewGenerated && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={regeneratePreview}
                        disabled={isGeneratingPreview}
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Preview Grid */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                  {isGeneratingPreview ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm text-gray-500">Generating preview images...</p>
                    </div>
                  ) : previewGenerated && previewImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                      {previewImages.map((imageUrl, index) => (
                        <img 
                          key={index}
                          src={imageUrl} 
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Eye className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">Click "Generate Preview" to see sample images</p>
                      <p className="text-xs text-gray-400 mt-1">Fill in all fields first</p>
                    </div>
                  )}
                </div>
              </div>

              <FormField
                control={moodboardForm.control}
                name="inspirationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspiration Source</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          field.value === 'ai' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          field.onChange('ai');
                          console.log('Selected AI inspiration, current value:', field.value);
                        }}
                      >
                        <div className="text-center">
                          <Star className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <h3 className="font-medium">AI Inspiration</h3>
                          <p className="text-sm text-gray-600 mt-1">Generate unique design concepts with AI</p>
                        </div>
                      </div>
                      <div 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          field.value === 'real' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          field.onChange('real');
                          console.log('Selected Real Photos, current value:', field.value);
                        }}
                      >
                        <div className="text-center">
                          <Camera className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <h3 className="font-medium">Real Photos</h3>
                          <p className="text-sm text-gray-600 mt-1">Curated photos from design platforms</p>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsMoodboardDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMoodboardMutation.isPending}>
                  {createMoodboardMutation.isPending ? "Creating..." : "Create Moodboard"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>



      {/* Image Preview Modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-semibold">
              {previewImage?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center p-6 pt-0">
            {previewImage && (
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 p-6 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowImagePreview(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewImage?.src) {
                  const link = document.createElement('a');
                  link.href = previewImage.src;
                  link.download = previewImage.name || 'image';
                  link.click();
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}