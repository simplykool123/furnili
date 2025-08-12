import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building2, Link, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import type { Brand, Supplier, SupplierBrand } from "@shared/schema";

export default function Brands() {
  const [selectedTab, setSelectedTab] = useState("brands");
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [showCreateRelationModal, setShowCreateRelationModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch brands
  const { data: brands = [], isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch supplier-brand relationships
  const { data: supplierBrands = [] } = useQuery<SupplierBrand[]>({
    queryKey: ["/api/supplier-brands"],
  });

  return (
    <FurniliLayout 
      title="Brand Management" 
      subtitle="Manage brands and supplier relationships"
      actions={
        <div className="flex gap-2">
          {selectedTab === "brands" ? (
            <Dialog open={showCreateBrandModal} onOpenChange={setShowCreateBrandModal}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Brand</DialogTitle>
                  <DialogDescription>
                    Create a new brand for your product catalog
                  </DialogDescription>
                </DialogHeader>
                <CreateBrandForm 
                  onClose={() => setShowCreateBrandModal(false)}
                  onSuccess={() => {
                    setShowCreateBrandModal(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={showCreateRelationModal} onOpenChange={setShowCreateRelationModal}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Link Supplier & Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Link Supplier & Brand</DialogTitle>
                  <DialogDescription>
                    Associate a supplier with a brand they carry
                  </DialogDescription>
                </DialogHeader>
                <CreateSupplierBrandForm 
                  suppliers={suppliers}
                  brands={brands}
                  onClose={() => setShowCreateRelationModal(false)}
                  onSuccess={() => {
                    setShowCreateRelationModal(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/supplier-brands"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      <div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="relationships">Supplier-Brand Links</TabsTrigger>
          </TabsList>

          <TabsContent value="brands" className="mt-4">
            {brandsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(28,100%,25%)]" />
              </div>
            ) : brands.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No brands</h3>
                <p className="text-gray-500 mb-4">
                  Get started by adding your first brand
                </p>
                <Button onClick={() => setShowCreateBrandModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand: Brand) => (
                  <Card key={brand.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[hsl(28,100%,25%)]">{brand.name}</h3>
                        <p className="text-sm text-gray-600">{brand.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    
                    {brand.website && (
                      <p className="text-xs text-blue-600 mb-2">
                        <a href={brand.website} target="_blank" rel="noopener noreferrer">
                          {brand.website}
                        </a>
                      </p>
                    )}
                    
                    {brand.country && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Country: {brand.country}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingBrand(brand);
                          setShowCreateBrandModal(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="relationships" className="mt-4">
            <div className="grid gap-4">
              {suppliers.map((supplier: Supplier) => (
                <SupplierBrandCard 
                  key={supplier.id} 
                  supplier={supplier} 
                  brands={brands}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Brand Modal */}
        {editingBrand && (
          <Dialog open={!!editingBrand} onOpenChange={() => setEditingBrand(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Brand</DialogTitle>
                <DialogDescription>
                  Update brand information
                </DialogDescription>
              </DialogHeader>
              <CreateBrandForm 
                brand={editingBrand}
                onClose={() => setEditingBrand(null)}
                onSuccess={() => {
                  setEditingBrand(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </FurniliLayout>
  );
}

// Create Brand Form Component
function CreateBrandForm({ brand, onClose, onSuccess }: {
  brand?: Brand;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: brand?.name || "",
    description: brand?.description || "",
    website: brand?.website || "",
    country: brand?.country || "",
  });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => 
      brand 
        ? apiRequest(`/api/brands/${brand.id}`, { method: "PUT", body: JSON.stringify(data) })
        : apiRequest("/api/brands", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Brand ${brand ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${brand ? 'update' : 'create'} brand`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Brand Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter brand name"
          className="h-8"
          required
        />
      </div>
      
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brand description"
          className="h-16 text-xs"
          rows={3}
        />
      </div>
      
      <div>
        <Label>Website</Label>
        <Input
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://example.com"
          className="h-8"
        />
      </div>
      
      <div>
        <Label>Country</Label>
        <Input
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          placeholder="Country of origin"
          className="h-8"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Saving..." : brand ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

// Create Supplier-Brand Relationship Form
function CreateSupplierBrandForm({ suppliers, brands, onClose, onSuccess }: {
  suppliers: Supplier[];
  brands: Brand[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    supplierId: "",
    brandId: "",
    isPrimarySupplier: false,
    notes: "",
  });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/supplier-brands", { 
        method: "POST", 
        body: JSON.stringify({
          supplierId: parseInt(data.supplierId),
          brandId: parseInt(data.brandId),
          isPrimarySupplier: data.isPrimarySupplier,
          notes: data.notes,
        })
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier-brand relationship created successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create supplier-brand relationship",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierId || !formData.brandId) {
      toast({
        title: "Error",
        description: "Please select both supplier and brand",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Supplier *</Label>
        <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Brand *</Label>
        <Select value={formData.brandId} onValueChange={(value) => setFormData({ ...formData, brandId: value })}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id.toString()}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPrimary"
          checked={formData.isPrimarySupplier}
          onChange={(e) => setFormData({ ...formData, isPrimarySupplier: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="isPrimary" className="text-sm">Primary supplier for this brand</Label>
      </div>
      
      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Optional notes"
          className="h-16 text-xs"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create Link"}
        </Button>
      </div>
    </form>
  );
}

// Supplier Brand Card Component
function SupplierBrandCard({ supplier, brands }: {
  supplier: Supplier;
  brands: Brand[];
}) {
  const { data: supplierBrands = [] } = useQuery<(SupplierBrand & { brand: Brand })[]>({
    queryKey: ["/api/suppliers", supplier.id, "brands"],
    queryFn: () => apiRequest(`/api/suppliers/${supplier.id}/brands`),
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-[hsl(28,100%,25%)]" />
          <h3 className="font-semibold text-[hsl(28,100%,25%)]">{supplier.name}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {supplierBrands.length} brands
        </Badge>
      </div>
      
      {supplierBrands.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {supplierBrands.map((sb) => (
            <Badge 
              key={sb.id} 
              variant="secondary" 
              className={`text-xs ${sb.isPrimarySupplier ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
            >
              {sb.brand.name}
              {sb.isPrimarySupplier && <span className="ml-1">★</span>}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No brands linked</p>
      )}
    </Card>
  );
}