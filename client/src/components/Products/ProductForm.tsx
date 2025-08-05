import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  size: z.string().optional(),
  thickness: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  currentStock: z.coerce.number().int().min(0, "Stock must be non-negative"),
  minStock: z.coerce.number().int().min(0, "Minimum stock must be non-negative"),
  unit: z.string().min(1, "Unit is required"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: number;
  name: string;
  category: string;
  brand?: string;
  size?: string;
  thickness?: string;
  sku?: string;
  price: number;
  currentStock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
}

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  isMobile?: boolean;
}

export default function ProductForm({ product, onClose, isMobile = false }: ProductFormProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      category: product?.category || "",
      brand: product?.brand || "",
      size: product?.size || "",
      thickness: product?.thickness || "",
      sku: product?.sku || "",
      price: product?.price || 0,
      currentStock: product?.currentStock || 0,
      minStock: product?.minStock || 10,
      unit: product?.unit || "pieces",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.location.href = '/login';
          return;
        }
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Failed to save product');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: product ? "Product updated" : "Product created",
        description: product ? "Product has been successfully updated." : "Product has been successfully created.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      
      // Append all form fields with proper type conversion
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        
        // Convert numbers properly
        if (typeof value === 'number') {
          formData.append(key, value.toString());
        } else {
          formData.append(key, value.toString());
        }
      });
      
      // Append image if selected
      if (selectedImage) {
        formData.append('image', selectedImage);
      }
      
      createProductMutation.mutate(formData);
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Handle paste events for image upload
  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    }
  };

  // Handle drag and drop events
  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Process image file with proper extension handling
  const processImageFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create a new file with proper extension if needed
    let processedFile = file;
    
    // If file is pasted and doesn't have proper name/extension, generate one
    if (!file.name || file.name === 'image.png' || file.name === 'blob') {
      const extension = getExtensionFromMimeType(file.type);
      const newName = `pasted-image-${Date.now()}.${extension}`;
      processedFile = new File([file], newName, { type: file.type });
    }

    setSelectedImage(processedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(processedFile);
  };

  // Get file extension from MIME type
  const getExtensionFromMimeType = (mimeType: string): string => {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg'; // fallback
    }
  };

  // Fetch categories from API
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const units = [
    "pieces", "meters", "kg", "bags", "boxes", "liters", "tons", "feet", "inches", "sq.ft", "cubic.ft"
  ];

  return (
    <div className={`${isMobile ? 'h-full flex flex-col' : 'h-full flex flex-col'}`}>
      <div className={`${isMobile ? 'flex-1 overflow-y-auto p-3' : 'flex-1 overflow-y-auto py-3 px-4'}`}>
        <form onSubmit={handleSubmit(onSubmit)} className={`${isMobile ? 'space-y-2 pb-4' : 'space-y-4 pb-4'}`}>
          {/* Product Name - Full Width */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium mb-1">Product Name *</Label>
            <Input
              id="name"
              {...register("name")}
              className={`${errors.name ? "border-red-500" : ""} h-9 text-sm`}
              placeholder="e.g., Calibrated ply"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-0.5">{errors.name.message}</p>
            )}
          </div>

          {/* Category & Brand - Two columns on mobile, same row */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>
            <div>
              <Label htmlFor="category" className="text-sm font-medium mb-1">Category *</Label>
              <Select 
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger className={`${errors.category ? "border-red-500" : ""} h-9 text-sm`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-red-600 mt-0.5">{errors.category.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="brand" className="text-sm font-medium mb-1">Brand</Label>
              <Input
                id="brand"
                {...register("brand")}
                className="h-9 text-sm"
                placeholder="e.g., ebco"
              />
            </div>
          </div>

          {/* Size & Thickness - Two columns on mobile, same row */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>
            <div>
              <Label htmlFor="size" className="text-sm font-medium mb-1">Size/Specification</Label>
              <Input
                id="size"
                {...register("size")}
                className="h-9 text-sm"
                placeholder="e.g., 8 X 4 feet"
              />
            </div>

            <div>
              <Label htmlFor="thickness" className="text-sm font-medium mb-1">Thickness</Label>
              <Input
                id="thickness"
                {...register("thickness")}
                className="h-9 text-sm"
                placeholder="e.g., 12 mm, 6 mm, 16 mm"
              />
            </div>
          </div>

          {/* SKU - Hidden on mobile since it's auto-generated */}
          {!isMobile && (
            <div>
              <Label htmlFor="sku" className="text-sm font-medium mb-1">SKU</Label>
              <Input
                id="sku"
                {...register("sku")}
                placeholder="Auto-generated if empty"
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Price & Unit - Two columns on mobile, same row */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>

            <div>
              <Label htmlFor="price" className="text-sm font-medium mb-1">Price per Unit *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
                className={`${errors.price ? "border-red-500" : ""} h-9 text-sm`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-xs text-red-600 mt-0.5">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit" className="text-sm font-medium mb-1">Unit *</Label>
              <Select 
                value={watch("unit")}
                onValueChange={(value) => setValue("unit", value)}
              >
                <SelectTrigger className={`${errors.unit ? "border-red-500" : ""} h-9 text-sm`}>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-xs text-red-600 mt-0.5">{errors.unit.message}</p>
              )}
            </div>
          </div>

          {/* Current Stock & Minimum Stock - Two columns on mobile, same row */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-4'}`}>
            <div>
              <Label htmlFor="currentStock" className="text-sm font-medium mb-1">Current Stock *</Label>
              <Input
                id="currentStock"
                type="number"
                {...register("currentStock")}
                className={`${errors.currentStock ? "border-red-500" : ""} h-9 text-sm`}
                placeholder="0"
              />
              {errors.currentStock && (
                <p className="text-xs text-red-600 mt-0.5">{errors.currentStock.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="minStock" className="text-sm font-medium mb-1">Minimum Stock Level *</Label>
              <Input
                id="minStock"
                type="number"
                {...register("minStock")}
                className={`${errors.minStock ? "border-red-500" : ""} h-9 text-sm`}
                placeholder="10"
              />
              {errors.minStock && (
                <p className="text-xs text-red-600 mt-0.5">{errors.minStock.message}</p>
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label className="text-sm font-medium mb-1">Product Image</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className={`object-contain rounded-lg border bg-gray-50 p-1 ${isMobile ? "w-24 h-24" : "w-32 h-32"}`}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className={`border-2 border-dashed border-gray-300 rounded-lg text-center ${isMobile ? "p-3" : "p-6"} relative`}
                  onPaste={handleImagePaste}
                  onDrop={handleImageDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  tabIndex={0}
                >
                  <Upload className={`text-gray-400 mx-auto mb-2 ${isMobile ? "w-6 h-6" : "w-8 h-8"}`} />
                  <p className={`text-gray-600 mb-2 ${isMobile ? "text-xs" : "text-sm"}`}>Upload product image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer inline-block">
                    <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                      Choose Image
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
                  <p className="text-xs text-gray-400 mt-1">Or copy & paste image here</p>
                </div>
              )}
            </div>
          </div>

        </form>
      </div>
      
      {/* Mobile-friendly Action Buttons */}
      <div className={`${isMobile ? 'p-3 border-t bg-white flex-shrink-0' : 'flex items-center justify-end space-x-4 pt-4 border-t flex-shrink-0'}`}>
        <div className={`${isMobile ? 'flex gap-2' : 'flex items-center space-x-4'}`}>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className={`${isMobile ? 'flex-1 h-10 text-sm' : ''}`}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className={`furnili-gradient hover:opacity-90 text-white ${isMobile ? 'flex-1 h-10 text-sm' : ''}`}
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? "Saving..." : product ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
