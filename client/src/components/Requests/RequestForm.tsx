import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

const requestSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  orderNumber: z.string().min(1, "Order number is required"),
  priority: z.enum(["high", "medium", "low"]),
  boqReference: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().min(1, "Product is required"),
    requestedQuantity: z.number().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one item is required"),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  onClose: () => void;
}

export default function RequestForm({ onClose }: RequestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authService.getUser();

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/products');
      return response.json();
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      clientName: "",
      orderNumber: "",
      priority: "medium",
      boqReference: "",
      remarks: "",
      items: [{ productId: 0, requestedQuantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      // Calculate total value and prepare items
      const itemsWithDetails = data.items.map(item => {
        const product = products?.find((p: any) => p.id === item.productId);
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);
        
        return {
          productId: item.productId,
          requestedQuantity: item.requestedQuantity,
          unitPrice: product.price,
          totalPrice: product.price * item.requestedQuantity,
        };
      });

      const requestData = {
        request: {
          clientName: data.clientName,
          orderNumber: data.orderNumber,
          priority: data.priority,
          boqReference: data.boqReference || undefined,
          remarks: data.remarks || undefined,
        },
        items: itemsWithDetails,
      };

      const response = await authenticatedApiRequest('POST', '/api/requests', requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Request created",
        description: "Material request has been submitted successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    try {
      await createRequestMutation.mutateAsync(data);
    } catch (error) {
      console.error('Request submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const watchedItems = watch("items");
  
  const calculateTotal = () => {
    return watchedItems.reduce((total, item) => {
      const product = products?.find((p: any) => p.id === item.productId);
      if (product && item.requestedQuantity > 0) {
        return total + (product.price * item.requestedQuantity);
      }
      return total;
    }, 0);
  };

  const getProductInfo = (productId: number) => {
    return products?.find((p: any) => p.id === productId);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register("clientName")}
                className={errors.clientName ? "border-red-500" : ""}
                placeholder="e.g., ABC Construction Ltd."
              />
              {errors.clientName && (
                <p className="text-sm text-red-600 mt-1">{errors.clientName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="orderNumber">Order Number *</Label>
              <Input
                id="orderNumber"
                {...register("orderNumber")}
                className={errors.orderNumber ? "border-red-500" : ""}
                placeholder="e.g., ORD-2024-001"
              />
              {errors.orderNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.orderNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as "high" | "medium" | "low")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="boqReference">BOQ Reference</Label>
              <Input
                id="boqReference"
                {...register("boqReference")}
                placeholder="e.g., BOQ-2024-001"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              {...register("remarks")}
              placeholder="Any additional notes or requirements..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Requested Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ productId: 0, requestedQuantity: 1 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {errors.items && (
            <p className="text-sm text-red-600 mb-4">{errors.items.message}</p>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const product = getProductInfo(watchedItems[index]?.productId);
                const quantity = watchedItems[index]?.requestedQuantity || 0;
                const total = product ? product.price * quantity : 0;
                
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Select
                        value={watchedItems[index]?.productId?.toString() || ""}
                        onValueChange={(value) => setValue(`items.${index}.productId`, parseInt(value))}
                      >
                        <SelectTrigger className="min-w-[200px]">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.items?.[index]?.productId && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.items[index]?.productId?.message}
                        </p>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {product && (
                        <div>
                          <p className="font-medium">{product.currentStock} {product.unit}</p>
                          {product.currentStock < quantity && (
                            <p className="text-sm text-red-600">Insufficient stock</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        className="w-24"
                        {...register(`items.${index}.requestedQuantity`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.requestedQuantity && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.items[index]?.requestedQuantity?.message}
                        </p>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {product ? `₹${product.price.toFixed(2)}` : '-'}
                    </TableCell>
                    
                    <TableCell>
                      <p className="font-medium">₹{total.toFixed(2)}</p>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Request Value:</span>
              <span className="text-2xl font-bold text-primary">
                ₹{calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
