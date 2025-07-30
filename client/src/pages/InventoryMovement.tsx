import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, ArrowDownCircle, Package, Calendar, User, Hash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FurniliLayout from "@/components/Layout/FurniliLayout";

const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["inward", "outward"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function InventoryMovement() {
  const [showAddMovement, setShowAddMovement] = useState(false);
  const { isMobile } = useIsMobile();
  const [activeTab, setActiveTab] = useState("recent");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: "inward",
      quantity: 1,
    },
  });

  // Fetch products for dropdown
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/products');
      return response.json();
    },
  });

  // Fetch movements
  const { data: movements, isLoading } = useQuery({
    queryKey: ['/api/inventory/movements'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/inventory/movements');
      return response.json();
    },
  });

  // Create movement mutation
  const createMovementMutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      const response = await authenticatedApiRequest('POST', '/api/inventory/movements', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory movement recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowAddMovement(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record movement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MovementFormData) => {
    createMovementMutation.mutate(data);
  };

  const getMovementTypeIcon = (type: string) => {
    return type === 'inward' ? (
      <ArrowUpCircle className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDownCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getMovementTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'inward' ? 'default' : 'destructive'}>
        {type === 'inward' ? 'Inward' : 'Outward'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProductName = (productId: number) => {
    const product = products?.find((p: any) => p.id === productId);
    return product ? product.name : `Product #${productId}`;
  };

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
    <FurniliLayout
      title="Inventory Movement"
      subtitle="Track and manage stock movements"
    >
      <div className="space-y-6">
        {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inward Today</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {movements?.filter((m: any) => 
                m.type === 'inward' && 
                new Date(m.createdAt).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Today's inward movements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outward Today</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {movements?.filter((m: any) => 
                m.type === 'outward' && 
                new Date(m.createdAt).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Today's outward movements</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Movement Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Movement History</h3>
        <Button onClick={() => setShowAddMovement(true)}>
          <Package className="w-4 h-4 mr-2" />
          Record Movement
        </Button>
      </div>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements?.map((movement: any) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getMovementTypeIcon(movement.type)}
                        {getMovementTypeBadge(movement.type)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getProductName(movement.productId)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        movement.type === 'inward' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.type === 'inward' ? '+' : '-'}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell>{movement.reason}</TableCell>
                    <TableCell>{movement.reference || '-'}</TableCell>
                    <TableCell>{formatDate(movement.createdAt)}</TableCell>
                    <TableCell>{movement.userName || 'System'}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No movements recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Movement Dialog */}
      <Dialog open={showAddMovement} onOpenChange={setShowAddMovement}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Inventory Movement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="productId">Product *</Label>
              <Select 
                value={watch("productId")}
                onValueChange={(value) => setValue("productId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product: any) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} (Stock: {product.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-red-600 mt-1">{errors.productId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Movement Type *</Label>
              <Select 
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as "inward" | "outward")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inward">Inward (Stock In)</SelectItem>
                  <SelectItem value="outward">Outward (Stock Out)</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input 
                type="number" 
                {...register("quantity")}
                placeholder="Enter quantity"
                min="1"
              />
              {errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Select 
                value={watch("reason")}
                onValueChange={(value) => setValue("reason", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {watch("type") === "inward" ? (
                    <>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Return">Return</SelectItem>
                      <SelectItem value="Transfer In">Transfer In</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Sale">Sale</SelectItem>
                      <SelectItem value="Issue">Issue</SelectItem>
                      <SelectItem value="Transfer Out">Transfer Out</SelectItem>
                      <SelectItem value="Damage">Damage</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.reason && (
                <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input 
                {...register("reference")}
                placeholder="Invoice/PO number, etc."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input 
                {...register("notes")}
                placeholder="Additional notes"
              />
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddMovement(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? "Recording..." : "Record Movement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </FurniliLayout>
  );
}