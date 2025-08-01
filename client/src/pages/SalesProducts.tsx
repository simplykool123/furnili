import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Package, Tag, DollarSign, Eye, Filter, Upload, Image, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SalesProduct } from "@shared/schema";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";

// Schema for sales product form
const salesProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  category: z.string().optional(),
  taxPercentage: z.number().min(0).max(100, "Tax percentage must be between 0-100").optional(),
  internalNotes: z.string().optional(),
});

type SalesProductFormData = z.infer<typeof salesProductSchema>;

// Product categories for filtering
const PRODUCT_CATEGORIES = [
  "Furniture", "Seating", "Storage", "Tables", "Cabinets", 
  "Lighting", "Decor", "Office", "Bedroom", "Kitchen"
];

function SalesProductForm({ 
  product, 
  onClose, 
  onSuccess 
}: { 
  product?: SalesProduct; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SalesProductFormData>({
    resolver: zodResolver(salesProductSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      unitPrice: product?.unitPrice || 0,
      category: product?.category || "",
      taxPercentage: product?.taxPercentage || 0,
      internalNotes: product?.internalNotes || "",
    },
  });

  const isMobile = window.innerWidth < 768;

  // Enhanced file handling with proper extensions and validation
  const processImageFile = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create a new file with proper extension if needed
    let processedFile = file;
    if (!file.name.includes('.')) {
      const extension = file.type.split('/')[1] || 'jpg';
      processedFile = new File([file], `image.${extension}`, { type: file.type });
    }

    setImageFile(processedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(processedFile);
  }, [toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Copy-paste functionality
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Generate proper filename for pasted images
          const timestamp = Date.now();
          const extension = item.type.split('/')[1] || 'png';
          const pastedFile = new File([file], `pasted-image-${timestamp}.${extension}`, { type: item.type });
          processImageFile(pastedFile);
        }
        break;
      }
    }
  }, [processImageFile]);

  // Drag and drop functionality
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  }, [processImageFile]);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Set up paste event listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Only handle paste if the form is open and focused
      if (document.activeElement?.closest('.sales-product-form')) {
        handlePaste(e);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [handlePaste]);

  const onSubmit = async (data: SalesProductFormData) => {
    setIsLoading(true);
    try {
      let imageUrl = product?.imageUrl || "";

      // Upload image if provided
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("type", "sales-product");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.filePath;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      // Create or update sales product
      const salesProductData = {
        ...data,
        imageUrl,
      };

      if (product) {
        await apiRequest(`/api/sales-products/${product.id}`, {
          method: "PUT",
          body: JSON.stringify(salesProductData),
        });
        toast({ title: "Success", description: "Sales product updated successfully" });
      } else {
        await apiRequest("/api/sales-products", {
          method: "POST",
          body: JSON.stringify(salesProductData),
        });
        toast({ title: "Success", description: "Sales product created successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/sales-products"] });
      onSuccess();
    } catch (error: any) {
      console.error('Save sales product error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save sales product",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sales-product-form flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="p-3 border-b bg-white flex-shrink-0">
        <h3 className="text-lg font-semibold">
          {product ? "Edit Sales Product" : "Add New Sales Product"}
        </h3>
      </div>

      {/* Form Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          
          {/* Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-medium text-gray-700">Product Name *</Label>
              <Input
                id="name"
                {...register("name")}
                className={`${errors.name ? "border-red-500" : ""} h-8 text-sm`}
                placeholder="Executive Workstation"
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-0.5">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs font-medium text-gray-700">Category</Label>
              <Select onValueChange={(value) => setValue("category", value)} defaultValue={product?.category}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price & Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="unitPrice" className="text-xs font-medium text-gray-700">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                {...register("unitPrice", { valueAsNumber: true })}
                className={`${errors.unitPrice ? "border-red-500" : ""} h-8 text-sm`}
                placeholder="25000"
              />
              {errors.unitPrice && (
                <p className="text-xs text-red-600 mt-0.5">{errors.unitPrice.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="taxPercentage" className="text-xs font-medium text-gray-700">Tax % (GST/VAT)</Label>
              <Input
                id="taxPercentage"
                type="number"
                step="0.01"
                {...register("taxPercentage", { valueAsNumber: true })}
                className={`${errors.taxPercentage ? "border-red-500" : ""} h-8 text-sm`}
                placeholder="18"
              />
              {errors.taxPercentage && (
                <p className="text-xs text-red-600 mt-0.5">{errors.taxPercentage.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description" className="text-xs font-medium text-gray-700">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              className={`${errors.description ? "border-red-500" : ""} text-sm min-h-[50px] resize-none`}
              placeholder="L-shaped workstation with overhead storage, premium laminate finish..."
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-0.5">{errors.description.message}</p>
            )}
          </div>

          {/* Internal Notes */}
          <div className="space-y-1">
            <Label htmlFor="internalNotes" className="text-xs font-medium text-gray-700">Internal Notes</Label>
            <Textarea
              id="internalNotes"
              {...register("internalNotes")}
              className={`${errors.internalNotes ? "border-red-500" : ""} text-sm min-h-[40px] resize-none`}
              placeholder="Cost: ₹18,000, Profit margin: 37%, Lead time: 2-3 weeks..."
            />
          </div>

          {/* Enhanced Image Upload with Copy-Paste */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-700">Product Image</Label>
            <div>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0"
                    onClick={removeImage}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  ref={dropzoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg text-center p-4 transition-colors ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <Package className="text-gray-400 mb-2 w-6 h-6" />
                    <p className="text-gray-600 mb-2 text-xs">Upload product image</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2">
                          <Upload className="w-3 h-3 mr-1" />
                          Browse
                        </div>
                      </label>
                      <div className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background h-7 px-2 text-gray-500">
                        <Copy className="w-3 h-3 mr-1" />
                        Paste (Ctrl+V)
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Drag & drop, browse, or paste. Max 5MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </form>
      </div>
      
      {/* Action Buttons */}
      <div className="p-3 border-t bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-8 text-sm"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="furnili-gradient hover:opacity-90 text-white flex-1 h-8 text-sm"
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? "Saving..." : product ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SalesProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SalesProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<SalesProduct | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales products
  const { data: salesProducts = [], isLoading } = useQuery<SalesProduct[]>({
    queryKey: ["/api/sales-products"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/sales-products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-products"] });
      toast({ title: "Success", description: "Sales product deleted successfully" });
      setProductToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sales product",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (product: SalesProduct) => {
    setProductToDelete(product);
  };

  // Filter products
  const filteredProducts = salesProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isMobile = window.innerWidth < 768;

  return (
    <FurniliLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Products</h1>
            <p className="text-gray-600">Manage sellable products for quotes and orders</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <FurniliButton size={isMobile ? "sm" : "default"}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </FurniliButton>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] p-0">
              <SalesProductForm
                onClose={() => setIsAddDialogOpen(false)}
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <FurniliCard>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </FurniliCard>

        {/* Products List */}
        <FurniliCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Products ({filteredProducts.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(28,100%,25%)] mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No sales products found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchTerm || selectedCategory ? "Try adjusting your filters" : "Add your first sales product"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Tax %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.description && (
                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category && (
                            <Badge variant="secondary">
                              <Tag className="w-3 h-3 mr-1" />
                              {product.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {formatCurrency(product.unitPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.taxPercentage ? `${product.taxPercentage}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              className="text-red-600 hover:text-red-700"
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
            )}
          </CardContent>
        </FurniliCard>

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] p-0">
            {editingProduct && (
              <SalesProductForm
                product={editingProduct}
                onClose={() => setEditingProduct(null)}
                onSuccess={() => setEditingProduct(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the sales product "{productToDelete?.name}" and remove it from all quotes and orders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>
                No, Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => productToDelete && deleteMutation.mutate(productToDelete.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </FurniliLayout>
  );
}