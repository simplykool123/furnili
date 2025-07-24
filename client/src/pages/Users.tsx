import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Shield, Edit3 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "staff", "store_incharge"]),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const [showAddUser, setShowAddUser] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      window.location.href = '/';
    }
  }, [currentUser]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/users');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
      role: "staff",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      return await authenticatedApiRequest('POST', '/api/auth/register', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User created",
        description: "User has been created successfully.",
      });
      setShowAddUser(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return await authenticatedApiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Staff member deleted",
        description: "The staff member has been permanently removed from the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await authenticatedApiRequest('PATCH', `/api/users/${id}`, { isActive });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: isActive ? "Staff member activated" : "Staff member deactivated",
        description: isActive 
          ? "The staff member has been reactivated and can now access the system."
          : "The staff member has been deactivated and cannot access the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update staff status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const getRoleBadge = (role: string) => {
    const roleInfo = {
      admin: { style: "bg-red-100 text-red-800 hover:bg-red-100", label: "🔑 Admin", desc: "Full Access" },
      staff: { style: "bg-blue-100 text-blue-800 hover:bg-blue-100", label: "👷 Staff", desc: "Daily Operations" },
      store_incharge: { style: "bg-green-100 text-green-800 hover:bg-green-100", label: "🧰 Store Incharge", desc: "Inventory Manager" },
    };
    
    const info = roleInfo[role as keyof typeof roleInfo] || roleInfo.staff;
    
    return (
      <Badge className={info.style}>
        <Shield className="w-3 h-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Add User Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">System Users ({users?.length || 0})</h2>
            <p className="text-sm text-muted-foreground">Manage user accounts and roles</p>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Future: Open edit user dialog
                              toast({
                                title: "Edit functionality",
                                description: "Edit user functionality will be available soon.",
                              });
                            }}
                          >
                            Edit
                          </Button>
                          
                          {/* Toggle Active/Inactive Status */}
                          <Button
                            variant={user.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              if (user.id === currentUser?.id) {
                                toast({
                                  title: "Cannot deactivate yourself",
                                  description: "You cannot deactivate your own account.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              const action = user.isActive ? "deactivate" : "activate";
                              if (confirm(`${action === "deactivate" ? "⚠️ Deactivate" : "✅ Activate"} Staff Member\n\nAre you sure you want to ${action} "${user.name}"?\n\n${action === "deactivate" 
                                ? "They will lose access to the system but their data will be preserved." 
                                : "They will regain access to the system with their existing role and permissions."}`)) {
                                toggleUserStatusMutation.mutate({ 
                                  id: user.id, 
                                  isActive: !user.isActive 
                                });
                              }
                            }}
                            disabled={user.id === currentUser?.id || toggleUserStatusMutation.isPending}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          
                          {/* Permanent Delete - Only for truly removing users */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (user.id === currentUser?.id) {
                                toast({
                                  title: "Cannot delete yourself",
                                  description: "You cannot delete your own account.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              const confirmDelete = confirm(
                                `🚨 PERMANENT DELETE\n\nAre you sure you want to PERMANENTLY delete "${user.name}"?\n\n⚠️ THIS ACTION CANNOT BE UNDONE!\n\nThis will completely remove:\n• User account and login access\n• All associated data and records\n• Staff information and documents\n• Attendance history and payroll data\n\nConsider using "Deactivate" instead to preserve data.\n\nClick OK only if you want to permanently delete this user.`
                              );
                              
                              if (confirmDelete) {
                                // Additional confirmation for critical users
                                if (user.role === 'admin' && !confirm(`🚨 ADMIN USER WARNING!\n\n"${user.name}" has ADMIN privileges!\n\nDeleting this account may affect system administration capabilities.\n\nThis is your FINAL warning. Click OK to proceed with permanent deletion.`)) {
                                  return;
                                }
                                
                                toast({
                                  title: "Permanently deleting staff member...",
                                  description: `Removing ${user.name} from the system forever.`,
                                });
                                
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            disabled={user.id === currentUser?.id || deleteUserMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Add User Dialog */}
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent aria-describedby="add-user-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New User
              </DialogTitle>
              <p id="add-user-description" className="sr-only">
                Form to create a new user account with name, email, and role
              </p>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    className={errors.name ? "border-red-500" : ""}
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    {...register("username")}
                    className={errors.username ? "border-red-500" : ""}
                    placeholder="johndoe"
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                  placeholder="john@company.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  className={errors.password ? "border-red-500" : ""}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select 
                  value={watch("role")}
                  onValueChange={(value) => setValue("role", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">🔑 Admin (Full Access)</SelectItem>
                    <SelectItem value="staff">👷 Staff (Daily Operations)</SelectItem>
                    <SelectItem value="store_incharge">🧰 Store Incharge (Inventory Manager)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
