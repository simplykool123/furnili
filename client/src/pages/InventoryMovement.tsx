import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, ArrowUp, ArrowDown, Package, TrendingUp, TrendingDown } from "lucide-react";

export default function InventoryMovement() {
  const { toast } = useToast();
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [movementForm, setMovementForm] = useState({
    productId: "",
    movementType: "",
    quantity: "",
    reason: "",
    referenceNumber: "",
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ["/api/inventory/movements"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const addMovementMutation = useMutation({
    mutationFn: async (movementData: any) => {
      return authenticatedApiRequest("/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify(movementData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddingMovement(false);
      setMovementForm({
        productId: "",
        movementType: "",
        quantity: "",
        reason: "",
        referenceNumber: "",
      });
      toast({
        title: "Stock movement recorded",
        description: "The inventory movement has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to record movement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!movementForm.productId || !movementForm.movementType || !movementForm.quantity) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(movementForm.quantity);
    if (quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    addMovementMutation.mutate({
      ...movementForm,
      productId: parseInt(movementForm.productId),
      quantity,
    });
  };

  const getMovementTypeColor = (type: string) => {
    return type === "inward" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const movementStats = {
    totalMovements: movements?.length || 0,
    inwardMovements: movements?.filter((m: any) => m.movementType === "inward").length || 0,
    outwardMovements: movements?.filter((m: any) => m.movementType === "outward").length || 0,
    todayMovements: movements?.filter((m: any) => {
      const today = new Date().toDateString();
      return new Date(m.createdAt).toDateString() === today;
    }).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Movement</h1>
        <Dialog open={isAddingMovement} onOpenChange={setIsAddingMovement}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" />
              Record Movement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record Stock Movement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="productId">Product *</Label>
                <Select 
                  value={movementForm.productId}
                  onValueChange={(value) => setMovementForm(prev => ({ ...prev, productId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product: any) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} (Current: {product.currentStock} {product.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="movementType">Movement Type *</Label>
                <Select 
                  value={movementForm.movementType}
                  onValueChange={(value) => setMovementForm(prev => ({ ...prev, movementType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select movement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inward">Inward (Stock In)</SelectItem>
                    <SelectItem value="outward">Outward (Stock Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Select 
                  value={movementForm.reason}
                  onValueChange={(value) => setMovementForm(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementForm.movementType === "inward" ? (
                      <>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="return">Return from Customer</SelectItem>
                        <SelectItem value="transfer-in">Transfer In</SelectItem>
                        <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="sale">Sale</SelectItem>
                        <SelectItem value="material-request">Material Request</SelectItem>
                        <SelectItem value="transfer-out">Transfer Out</SelectItem>
                        <SelectItem value="damage">Damage/Loss</SelectItem>
                        <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={movementForm.referenceNumber}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  placeholder="Invoice/Order number (optional)"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingMovement(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addMovementMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {addMovementMutation.isPending ? "Recording..." : "Record Movement"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Movement Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movementStats.totalMovements}</div>
            <p className="text-xs text-muted-foreground">
              All time movements
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inward Movements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movementStats.inwardMovements}</div>
            <p className="text-xs text-muted-foreground">
              Stock received
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outward Movements</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movementStats.outwardMovements}</div>
            <p className="text-xs text-muted-foreground">
              Stock issued
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Movements</CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movementStats.todayMovements}</div>
            <p className="text-xs text-muted-foreground">
              Movements today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements?.map((movement: any) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(movement.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {movement.productName || `Product ${movement.productId}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {movement.movementType === "inward" ? (
                        <ArrowUp className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <Badge className={getMovementTypeColor(movement.movementType)}>
                        {movement.movementType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {movement.movementType === "inward" ? "+" : "-"}{movement.quantity}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {movement.reason?.replace("-", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {movement.referenceNumber || "—"}
                  </TableCell>
                  <TableCell>
                    {movement.recordedBy || "System"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}