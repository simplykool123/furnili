import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, AlertTriangle } from "lucide-react";
import { insertMaterialRequestSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const requestFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  orderNumber: z.string().min(1, "Order number is required"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  remarks: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().optional(),
    category: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    brand: z.string(),
    size: z.string(),
    thickness: z.string(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.string().default("pcs")
  })).min(1, "At least one item is required")
});

type RequestFormData = z.infer<typeof requestFormSchema>;

interface Product {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  size?: string;
  thickness?: string;
  currentStock: number;
  unit: string;
  pricePerUnit?: number;
}

interface Category {
  id: number;
  name: string;
}

interface RequestFormSimplifiedProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RequestFormSimplified({ onClose, onSuccess }: RequestFormSimplifiedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products and categories
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      clientName: "",
      orderNumber: "",
      priority: "medium",
      remarks: "",
      items: [{ 
        description: "", 
        brand: "", 
        category: "",
        size: "", 
        thickness: "", 
        quantity: 1, 
        unit: "pcs" 
      }]
    }
  });

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/requests", "POST", data),
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Material request created successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    const requestData = {
      clientName: data.clientName,
      orderNumber: data.orderNumber,
      priority: data.priority,
      remarks: data.remarks || "",
      requestedBy: 1, // Will be set by backend from auth
      items: data.items.map((item: any) => ({
        description: item.description,
        brand: item.brand || "",
        size: item.size || "",
        thickness: item.thickness || "",
        quantity: item.quantity,
        unit: item.unit
      }))
    };

    createRequestMutation.mutate(requestData);
  };

  // Get filtered products based on category and brand selection
  const getFilteredProducts = (categoryFilter?: string, brandFilter?: string) => {
    return products.filter(product => {
      if (categoryFilter && product.category !== categoryFilter) return false;
      if (brandFilter && product.brand !== brandFilter) return false;
      return true;
    });
  };

  // Get unique brands for selected category
  const getBrandsForCategory = (categoryName?: string) => {
    const filteredProducts = categoryName 
      ? products.filter(p => p.category === categoryName)
      : products;
    const brands = Array.from(new Set(filteredProducts.map(p => p.brand).filter(Boolean)));
    return brands;
  };

  const handleCategoryChange = (categoryName: string, index: number) => {
    setValue(`items.${index}.category`, categoryName);
    setValue(`items.${index}.brand`, "");
    setValue(`items.${index}.description`, "");
    setValue(`items.${index}.size`, "");
    setValue(`items.${index}.thickness`, "");
  };

  const handleBrandChange = (brand: string, index: number) => {
    setValue(`items.${index}.brand`, brand);
    setValue(`items.${index}.description`, "");
    setValue(`items.${index}.size`, "");
    setValue(`items.${index}.thickness`, "");
  };

  const handleProductSelect = (productId: string, index: number) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setValue(`items.${index}.productId`, product.id);
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.brand`, product.brand || "");
      setValue(`items.${index}.size`, product.size || "");
      setValue(`items.${index}.thickness`, product.thickness || "");
      setValue(`items.${index}.unit`, product.unit || "pcs");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Tab' && field === 'quantity' && index === fields.length - 1) {
      e.preventDefault();
      append({ 
        description: "", 
        brand: "", 
        category: "",
        size: "", 
        thickness: "", 
        quantity: 1, 
        unit: "pcs" 
      });
    }
  };

  const downloadProductList = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,Name,Brand,Category,Size,Thickness,Stock\n" +
      products.map(p => 
        `${p.id},"${p.name}","${p.brand || ''}","${p.category || ''}","${p.size || ''}","${p.thickness || ''}",${p.currentStock}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if requested quantity exceeds stock
  const checkStockWarning = (productId: number | undefined, quantity: number) => {
    if (!productId) return false;
    const product = products.find(p => p.id === productId);
    return product && quantity > product.currentStock;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          {/* Client Name, Order No, Priority in one row */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register("clientName")}
                placeholder="e.g., ABC Construction Ltd."
                className={errors.clientName ? "border-red-500" : ""}
              />
              {errors.clientName && (
                <p className="text-sm text-red-600 mt-1">{errors.clientName.message}</p>
              )}
            </div>

            <div className="col-span-3">
              <Label htmlFor="orderNumber" className="text-sm">Order No *</Label>
              <Input
                id="orderNumber"
                {...register("orderNumber")}
                placeholder="e.g., ORD-2024-001"
                className={`text-sm ${errors.orderNumber ? "border-red-500" : ""}`}
              />
              {errors.orderNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.orderNumber.message}</p>
              )}
            </div>

            <div className="col-span-4">
              <Label htmlFor="priority" className="text-sm">Priority</Label>
              <Select 
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as "high" | "medium" | "low")}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Remarks in one line */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2">
              <Label htmlFor="remarks" className="text-sm font-medium">Remarks:</Label>
            </div>
            <div className="col-span-10">
              <Input
                id="remarks"
                {...register("remarks")}
                placeholder="Any additional notes or requirements..."
              />
            </div>
          </div>

          

          {/* Materials Table */}
          {errors.items && (
            <p className="text-sm text-red-600">{errors.items.message}</p>
          )}
          
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 bg-gray-50 border-b text-sm font-medium text-gray-700">
              <div className="px-2 py-2 border-r text-center">#</div>
              <div className="px-2 py-2 border-r col-span-2">Category</div>
              <div className="px-2 py-2 border-r col-span-2">Product</div>
              <div className="px-2 py-2 border-r col-span-2">Brand</div>
              <div className="px-2 py-2 border-r">Size</div>
              <div className="px-2 py-2 border-r">Thk.</div>
              <div className="px-2 py-2 border-r">Qty</div>
              <div className="px-2 py-2 text-center">Action</div>
            </div>
            
            {/* Data Rows */}
            {fields.map((field, index) => {
              const formValues = watch();
              const watchedCategory = formValues.items?.[index]?.category;
              const watchedBrand = formValues.items?.[index]?.brand;
              const watchedProductId = formValues.items?.[index]?.productId;
              const watchedQuantity = formValues.items?.[index]?.quantity || 0;
              const hasStockWarning = checkStockWarning(watchedProductId, watchedQuantity);
              
              return (
                <div key={field.id} className="grid grid-cols-12 border-b hover:bg-gray-50 text-sm">
                  {/* Row Number */}
                  <div className="px-2 py-1 border-r text-center text-gray-500 flex items-center justify-center">
                    {index + 1}
                  </div>
                  
                  {/* Category Selection */}
                  <div className="px-1 py-1 border-r col-span-2">
                    <Select onValueChange={(value) => handleCategoryChange(value, index)}>
                      <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Product Selection */}
                  <div className="px-1 py-1 border-r col-span-2">
                    <Select onValueChange={(value) => handleProductSelect(value, index)}>
                      <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredProducts(watchedCategory, watchedBrand).map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Brand Selection */}
                  <div className="px-1 py-1 border-r col-span-2">
                    <Select onValueChange={(value) => handleBrandChange(value, index)}>
                      <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getBrandsForCategory(watchedCategory).map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Size (Auto-filled from product) */}
                  <div className="px-1 py-1 border-r">
                    <Input
                      {...register(`items.${index}.size`)}
                      placeholder="8x4"
                      className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                  
                  {/* Thickness (Auto-filled from product) */}
                  <div className="px-1 py-1 border-r">
                    <Input
                      {...register(`items.${index}.thickness`)}
                      placeholder="18mm"
                      className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                  
                  {/* Quantity with Stock Warning */}
                  <div className="px-1 py-1 border-r">
                    <div className="flex items-center">
                      <Input
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        min="1"
                        step="1"
                        className={`border-0 h-8 text-xs text-right focus:ring-1 focus:ring-blue-500 ${hasStockWarning ? 'bg-red-50' : ''}`}
                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                      />
                      {hasStockWarning && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />
                      )}
                    </div>
                    {errors.items?.[index]?.quantity && (
                      <p className="text-xs text-red-600 mt-1">{errors.items[index]?.quantity?.message}</p>
                    )}
                    {hasStockWarning && (
                      <p className="text-xs text-red-600 mt-1">Exceeds stock!</p>
                    )}
                  </div>
                  
                  {/* Delete Action */}
                  <div className="px-1 py-1 text-center flex items-center justify-center">
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => append({ 
                          description: "", 
                          brand: "", 
                          category: "",
                          size: "", 
                          thickness: "", 
                          quantity: 1, 
                          unit: "pcs" 
                        })}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Row Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ 
                description: "", 
                brand: "", 
                category: "",
                size: "", 
                thickness: "", 
                quantity: 1, 
                unit: "pcs" 
              })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={createRequestMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createRequestMutation.isPending}
        >
          {createRequestMutation.isPending ? "Creating..." : "Create Request"}
        </Button>
      </div>
    </form>
  );
}