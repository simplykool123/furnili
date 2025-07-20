import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
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
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
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
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to save product');
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const categories = [
    "Construction Materials",
    "Electrical Supplies", 
    "Plumbing Supplies",
    "Tools & Equipment",
    "Hardware & Fasteners",
    "Safety Equipment",
    "Cement & Concrete",
    "Steel & Metal",
  ];

  const units = [
    "pieces", "meters", "kg", "bags", "boxes", "liters", "tons", "feet", "inches", "sq.ft", "cubic.ft"
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
            placeholder="e.g., Steel Rods - 12mm"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select 
            value={watch("category")}
            onValueChange={(value) => setValue("category", value)}
          >
            <SelectTrigger className={errors.category ? "border-red-500" : ""}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            {...register("brand")}
            placeholder="e.g., Tata Steel"
          />
        </div>

        <div>
          <Label htmlFor="size">Size/Specification</Label>
          <Input
            id="size"
            {...register("size")}
            placeholder="e.g., 8 X 4 feet"
          />
        </div>

        <div>
          <Label htmlFor="thickness">Thickness</Label>
          <Input
            id="thickness"
            {...register("thickness")}
            placeholder="e.g., 12 mm, 6 mm, 16 mm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            {...register("sku")}
            placeholder="Auto-generated if empty"
          />
        </div>

        <div>
          <Label htmlFor="price">Price per Unit *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register("price")}
            className={errors.price ? "border-red-500" : ""}
            placeholder="0.00"
          />
          {errors.price && (
            <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="unit">Unit *</Label>
          <Select 
            value={watch("unit")}
            onValueChange={(value) => setValue("unit", value)}
          >
            <SelectTrigger className={errors.unit ? "border-red-500" : ""}>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit && (
            <p className="text-sm text-red-600 mt-1">{errors.unit.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="currentStock">Current Stock *</Label>
          <Input
            id="currentStock"
            type="number"
            {...register("currentStock")}
            className={errors.currentStock ? "border-red-500" : ""}
            placeholder="0"
          />
          {errors.currentStock && (
            <p className="text-sm text-red-600 mt-1">{errors.currentStock.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="minStock">Minimum Stock Level *</Label>
          <Input
            id="minStock"
            type="number"
            {...register("minStock")}
            className={errors.minStock ? "border-red-500" : ""}
            placeholder="10"
          />
          {errors.minStock && (
            <p className="text-sm text-red-600 mt-1">{errors.minStock.message}</p>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <Label>Product Image</Label>
        <div className="mt-2">
          {imagePreview ? (
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-32 h-32 object-cover rounded-lg border"
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload product image</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm">
                  Choose Image
                </Button>
              </Label>
              <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : product ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
