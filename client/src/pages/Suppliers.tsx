import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Building, Phone, Mail, MapPin, Edit, Trash2, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import type { Supplier } from "@shared/schema";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  gstin: z.string().optional(),
  preferred: z.boolean().default(false),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      return apiRequest(`/api/suppliers?${params}`);
    }
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: SupplierFormData) => 
      apiRequest("/api/suppliers", { 
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
      setShowCreateModal(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierFormData> }) => 
      apiRequest(`/api/suppliers/${id}`, { 
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      setEditingSupplier(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  return (
    <FurniliLayout 
      title="Suppliers" 
      subtitle="Manage your supplier database"
      actions={
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Add a new supplier to your database
              </DialogDescription>
            </DialogHeader>
            <SupplierForm 
              onSubmit={(data) => createSupplierMutation.mutate(data)}
              onCancel={() => setShowCreateModal(false)}
              isLoading={createSupplierMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      }
    >
      <div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search suppliers by name, contact person, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Suppliers List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(28,100%,25%)]" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? "No suppliers match your search criteria"
              : "Get started by adding your first supplier"
            }
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-2">
                  <Building className="h-5 w-5 text-[hsl(28,100%,25%)] mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[hsl(28,100%,25%)]">{supplier.name}</h3>
                    {supplier.contactPerson && (
                      <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {supplier.preferred && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Preferred
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {supplier.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
              </div>

              {supplier.paymentTerms && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Payment Terms</p>
                  <p className="text-sm">{supplier.paymentTerms}</p>
                </div>
              )}

              {supplier.gstin && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">GSTIN</p>
                  <p className="text-sm font-mono">{supplier.gstin}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSupplier(supplier)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(supplier)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>
                Update supplier information
              </DialogDescription>
            </DialogHeader>
            <SupplierForm 
              supplier={editingSupplier}
              onSubmit={(data: SupplierFormData) => updateSupplierMutation.mutate({ 
                id: editingSupplier.id, 
                data 
              })}
              onCancel={() => setEditingSupplier(null)}
              isLoading={updateSupplierMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
      </div>
    </FurniliLayout>
  );
}

// Supplier Form Component
function SupplierForm({ 
  supplier, 
  onSubmit, 
  onCancel, 
  isLoading 
}: {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier ? {
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      paymentTerms: supplier.paymentTerms || "30 days",
      gstin: supplier.gstin || "",
      preferred: supplier.preferred,
    } : {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      paymentTerms: "30 days",
      gstin: "",
      preferred: false,
    }
  });

  const preferred = watch("preferred");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Supplier Name *</Label>
          <Input
            id="name"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
            placeholder="e.g., ABC Trading Co."
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input
            id="contactPerson"
            {...register("contactPerson")}
            placeholder="e.g., John Doe"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            {...register("phone")}
            placeholder="e.g., +91 9876543210"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
            placeholder="e.g., contact@supplier.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register("address")}
          placeholder="Complete address with city, state, pincode"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input
            id="paymentTerms"
            {...register("paymentTerms")}
            placeholder="e.g., 30 days, Net 15, COD"
          />
        </div>

        <div>
          <Label htmlFor="gstin">GSTIN</Label>
          <Input
            id="gstin"
            {...register("gstin")}
            placeholder="e.g., 22AAAAA0000A1Z5"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="preferred"
          checked={preferred}
          onCheckedChange={(checked) => setValue("preferred", !!checked)}
        />
        <Label htmlFor="preferred" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Mark as preferred supplier
        </Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : supplier ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  );
}