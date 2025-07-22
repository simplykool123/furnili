import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download } from "lucide-react";
import { insertMaterialRequestSchema, type InsertMaterialRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const requestFormSchema = insertMaterialRequestSchema.extend({
  items: z.array(z.object({
    productId: z.number().optional(),
    description: z.string().min(1, "Description is required"),
    brand: z.string(),
    type: z.string(),
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
  specifications?: any;
}

interface RequestFormSimplifiedProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RequestFormSimplified({ onClose, onSuccess }: RequestFormSimplifiedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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
        type: "", 
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
        type: item.type || "",
        size: item.size || "",
        thickness: item.thickness || "",
        quantity: item.quantity,
        unit: item.unit
      }))
    };

    createRequestMutation.mutate(requestData);
  };

  const handleProductSelect = (productId: string, index: number) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setValue(`items.${index}.productId`, product.id);
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.brand`, product.brand || "");
      setValue(`items.${index}.type`, product.specifications?.type || "");
      setValue(`items.${index}.size`, product.specifications?.size || "");
      setValue(`items.${index}.thickness`, product.specifications?.thickness || "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Tab' && field === 'thickness' && index === fields.length - 1) {
      e.preventDefault();
      append({ 
        description: "", 
        brand: "", 
        type: "", 
        size: "", 
        thickness: "", 
        quantity: 1, 
        unit: "pcs" 
      });
    }
  };

  const downloadProductList = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,Name,Brand,Category,Type,Size,Thickness\n" +
      products.map(p => 
        `${p.id},"${p.name}","${p.brand || ''}","${p.category || ''}","${p.specifications?.type || ''}","${p.specifications?.size || ''}","${p.specifications?.thickness || ''}"`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Material Request</CardTitle>
        </CardHeader>
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

          {/* Download Products Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadProductList}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Product List
            </Button>
          </div>

          {/* Materials Table */}
          {errors.items && (
            <p className="text-sm text-red-600">{errors.items.message}</p>
          )}
          
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 bg-gray-50 border-b text-sm font-medium text-gray-700">
              <div className="px-2 py-2 border-r text-center">#</div>
              <div className="px-2 py-2 border-r col-span-3">Product/Description</div>
              <div className="px-2 py-2 border-r col-span-2">Brand</div>
              <div className="px-2 py-2 border-r">Type</div>
              <div className="px-2 py-2 border-r">Size</div>
              <div className="px-2 py-2 border-r">Thk.</div>
              <div className="px-2 py-2 border-r">Qty</div>
              <div className="px-2 py-2 text-center">Action</div>
            </div>
            
            {/* Data Rows */}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 border-b hover:bg-gray-50 text-sm">
                {/* Row Number */}
                <div className="px-2 py-1 border-r text-center text-gray-500 flex items-center justify-center">
                  {index + 1}
                </div>
                
                {/* Product Selection / Description */}
                <div className="px-1 py-1 border-r col-span-3">
                  <Select onValueChange={(value) => handleProductSelect(value, index)}>
                    <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    {...register(`items.${index}.description`)}
                    placeholder="Or type description..."
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500 mt-1"
                  />
                  {errors.items?.[index]?.description && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.description?.message}</p>
                  )}
                </div>
                
                {/* Brand */}
                <div className="px-1 py-1 border-r col-span-2">
                  <Input
                    {...register(`items.${index}.brand`)}
                    placeholder="e.g., Master"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                {/* Type */}
                <div className="px-1 py-1 border-r">
                  <Input
                    {...register(`items.${index}.type`)}
                    placeholder="Material"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                {/* Size */}
                <div className="px-1 py-1 border-r">
                  <Input
                    {...register(`items.${index}.size`)}
                    placeholder="8x4"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                {/* Thickness */}
                <div className="px-1 py-1 border-r">
                  <Input
                    {...register(`items.${index}.thickness`)}
                    placeholder="18mm"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'thickness')}
                  />
                </div>
                
                {/* Quantity */}
                <div className="px-1 py-1 border-r">
                  <Input
                    type="number"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    min="1"
                    step="1"
                    className="border-0 h-8 text-xs text-right focus:ring-1 focus:ring-blue-500"
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.quantity?.message}</p>
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
                        type: "", 
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
            ))}
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
                type: "", 
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