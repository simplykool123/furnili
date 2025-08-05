import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Search, Grid3X3, List, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import MobileFilters from "@/components/Mobile/MobileFilters";

interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  size: string;
  thickness: string;
  sku: string;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  isActive: boolean;
}

export default function ProductTable() {
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    stockStatus: "",
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState("");
  // Remove movementType state since it's now calculated automatically
  const [reference, setReference] = useState("");
  const { isMobile } = useIsMobile();
  const user = authService.getUser();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can see pricing information and perform actions
  const canSeePricing = user && ['admin', 'manager'].includes(user.role);
  const canEditProducts = user && ['admin', 'manager'].includes(user.role);
  const canAdjustStock = user && ['admin', 'manager', 'store_incharge'].includes(user.role);

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      
      return await authenticatedApiRequest('GET', `/api/products?${params}`);
    },
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return await authenticatedApiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setProductToDelete(null);
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stockAdjustMutation = useMutation({
    mutationFn: async ({ productId, quantity, movementType, reference, notes }: {
      productId: number;
      quantity: number;
      movementType: string;
      reference: string;
      notes?: string;
    }) => {
      // Use the unified Inventory Movement API instead of the old stock API
      return await authenticatedApiRequest('POST', `/api/inventory/movements`, {
        productId: productId.toString(),
        type: movementType,
        quantity,
        reason: "Adjustment",
        reference,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movements'] });
      setStockAdjustProduct(null);
      setNewStockValue("");
      setReference("");
      toast({
        title: "Stock adjusted",
        description: "Stock movement has been recorded and product stock updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Stock adjustment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Trigger the global edit product modal
    window.dispatchEvent(new CustomEvent('openEditProductModal', { detail: product }));
  };

  const handleStockAdjust = (product: Product) => {
    setStockAdjustProduct(product);
    setNewStockValue(product.currentStock.toString());
  };

  const handleStockUpdate = () => {
    if (!stockAdjustProduct) return;
    
    const newStock = parseInt(newStockValue);
    if (isNaN(newStock) || newStock < 0) {
      toast({
        title: "Invalid stock value",
        description: "Please enter a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    // Calculate the difference to determine movement quantity
    const currentStock = stockAdjustProduct.currentStock;
    const difference = newStock - currentStock;
    
    if (difference === 0) {
      toast({
        title: "No change needed",
        description: "The new stock value is the same as the current stock.",
        variant: "default",
      });
      setStockAdjustProduct(null);
      return;
    }

    // Determine movement type based on whether stock is increasing or decreasing
    const adjustmentType = difference > 0 ? "in" : "out";
    const quantity = Math.abs(difference);

    stockAdjustMutation.mutate({
      productId: stockAdjustProduct.id,
      quantity,
      movementType: adjustmentType,
      reference: reference || `Stock adjustment by ${user?.name}`,
      notes: `Stock adjusted from ${currentStock} to ${newStock} (${difference > 0 ? '+' : ''}${difference})`
    });
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">In Stock</Badge>;
      case 'low-stock':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Low Stock</Badge>;
      case 'out-of-stock':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Out of Stock</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  // Mobile table columns configuration
  const baseMobileColumns = [
    {
      key: 'name',
      label: 'Product Name',
      priority: 'high' as const,
    },
    {
      key: 'sku',
      label: 'SKU',
      priority: 'high' as const,
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      priority: 'high' as const,
      render: (value: string, row: Product) => getStockStatusBadge(value),
    },
    {
      key: 'category',
      label: 'Category',
      priority: 'medium' as const,
    },
    {
      key: 'brand',
      label: 'Brand',
      priority: 'medium' as const,
    },
    {
      key: 'currentStock',
      label: 'Current Stock',
      priority: 'medium' as const,
      render: (value: number, row: Product) => `${value} ${row.unit}`,
    },
    {
      key: 'size',
      label: 'Size',
      priority: 'low' as const,
    },
    {
      key: 'thickness',
      label: 'Thickness',
      priority: 'low' as const,
    },
  ];

  // Add price column only for admin users
  const mobileColumns = canSeePricing 
    ? [
        ...baseMobileColumns.slice(0, 6), // Insert price after currentStock
        {
          key: 'pricePerUnit',
          label: 'Price per Unit',
          priority: 'low' as const,
          render: (value: number) => `₹${value?.toFixed(2)}`,
        },
        ...baseMobileColumns.slice(6) // Add remaining columns after price
      ]
    : baseMobileColumns;

  // Mobile filter configuration
  const mobileFilters = [
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search products, SKU, brand...',
      value: filters.search,
      onChange: (value: string) => setFilters(prev => ({ ...prev, search: value })),
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select' as const,
      value: filters.category,
      onChange: (value: string) => setFilters(prev => ({ ...prev, category: value })),
      options: categories.map(cat => ({ value: cat.name, label: cat.name })),
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      type: 'select' as const,
      value: filters.stockStatus,
      onChange: (value: string) => setFilters(prev => ({ ...prev, stockStatus: value })),
      options: [
        { value: 'in-stock', label: 'In Stock' },
        { value: 'low-stock', label: 'Low Stock' },
        { value: 'out-of-stock', label: 'Out of Stock' },
      ],
    },
  ];

  const filteredProducts = products?.filter((product: Product) => {
    const matchesSearch = filters.search === "" || 
      product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.sku.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.brand.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCategory = filters.category === "" || filters.category === "all" || product.category === filters.category;
    const matchesStockStatus = filters.stockStatus === "" || filters.stockStatus === "all" || product.stockStatus === filters.stockStatus;
    
    return matchesSearch && matchesCategory && matchesStockStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const GridView = () => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products?.map((product: Product) => (
        <Card key={product.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Product Image */}
              <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="space-y-1">
                <h3 className="font-medium text-sm truncate" title={product.name}>
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500">{product.category}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{product.brand || '-'}</span>
                  {canSeePricing && (
                    <span className="font-medium">₹{(product.pricePerUnit || 0).toFixed(0)}</span>
                  )}
                </div>
              </div>
              
              {/* Stock & Status */}
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-medium">{product.currentStock}</span>
                  <span className="text-gray-500"> {product.unit}</span>
                </div>
                {getStockStatusBadge(product.stockStatus)}
              </div>
              
              {/* Actions - Show based on user permissions */}
              {(canEditProducts || canAdjustStock) && (
                <div className="flex items-center gap-1">
                  {canEditProducts && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1 h-7 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductToDelete(product)}
                        className="h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </>
                  )}
                  {canAdjustStock && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStockAdjust(product)}
                      className={`${canEditProducts ? 'h-7 px-2' : 'flex-1 h-7 text-xs'}`}
                    >
                      <Package className="w-3 h-3 mr-1 text-blue-600" />
                      {canEditProducts ? '' : 'Stock'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[200px]">Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Thk.</TableHead>
            <TableHead>Stock</TableHead>
            {canSeePricing && <TableHead>Price</TableHead>}
            {(canEditProducts || canAdjustStock) && <TableHead className="w-[80px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map((product: Product) => (
            <TableRow key={product.id} className="text-sm">
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <Package className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs">{product.category}</TableCell>
              <TableCell className="text-xs">{product.brand || '-'}</TableCell>
              <TableCell className="text-xs">{product.size || '-'}</TableCell>
              <TableCell className="text-xs font-medium text-blue-600">{product.thickness || '-'}</TableCell>
              <TableCell className="text-xs">
                <div>
                  <span className="font-medium">{product.currentStock}</span>
                  <span className="text-gray-500 ml-1">{product.unit}</span>
                </div>
              </TableCell>
              {canSeePricing && (
                <TableCell className="text-xs font-medium">₹{(product.pricePerUnit || 0).toFixed(0)}</TableCell>
              )}
              {(canEditProducts || canAdjustStock) && (
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {canEditProducts && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductToDelete(product)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </>
                    )}
                    {canAdjustStock && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStockAdjust(product)}
                        className="h-6 w-6 p-0"
                        title="Adjust Stock"
                      >
                        <Package className="w-3 h-3 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mobile Filters */}
      {isMobile && (
        <MobileFilters
          filters={mobileFilters}
          onClearAll={() => setFilters({ search: '', category: '', stockStatus: '' })}
        />
      )}

      {/* Desktop Filters & Controls */}
      {!isMobile && (
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-xs h-8 text-sm"
            />
            <Select 
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filters.stockStatus}
              onValueChange={(value) => setFilters({ ...filters, stockStatus: value })}
            >
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Mobile Products Table */}
      {isMobile ? (
        <MobileTable
          data={filteredProducts}
          columns={mobileColumns}
          emptyMessage="No products found"
          itemActions={(canEditProducts || canAdjustStock) ? (product) => {
            const actions = [];
            if (canEditProducts) {
              actions.push(
                {
                  label: 'Edit',
                  icon: Edit,
                  onClick: () => handleEdit(product),
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  onClick: () => setProductToDelete(product),
                  destructive: true,
                }
              );
            }
            if (canAdjustStock) {
              actions.push({
                label: 'Adjust Stock',
                icon: Package,
                onClick: () => handleStockAdjust(product),
              });
            }
            return actions;
          } : undefined}
        />
      ) : (
        /* Desktop Products Display */
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Products ({filteredProducts?.length || 0})</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? <GridView /> : <ListView />}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{productToDelete?.name}" and remove it from inventory and all related records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDelete && deleteProductMutation.mutate(productToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!stockAdjustProduct} onOpenChange={() => setStockAdjustProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock - {stockAdjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <div className="text-sm font-medium text-gray-600">
                {stockAdjustProduct?.currentStock} {stockAdjustProduct?.unit}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newStock">New Stock Quantity</Label>
              <Input
                id="newStock"
                type="number"
                value={newStockValue}
                onChange={(e) => setNewStockValue(e.target.value)}
                placeholder="Enter new stock quantity"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Movement Preview</Label>
              <div className="text-sm p-2 bg-gray-50 rounded">
                {stockAdjustProduct && newStockValue ? (
                  (() => {
                    const currentStock = stockAdjustProduct.currentStock;
                    const newStock = parseInt(newStockValue);
                    const difference = newStock - currentStock;
                    
                    if (isNaN(newStock)) {
                      return "Enter a valid stock quantity to see movement preview";
                    }
                    
                    if (difference === 0) {
                      return "No stock movement needed";
                    }
                    
                    return (
                      <span className={difference > 0 ? 'text-green-600' : 'text-red-600'}>
                        {difference > 0 ? 'Stock In' : 'Stock Out'}: {Math.abs(difference)} {stockAdjustProduct.unit}
                        <br />
                        <span className="text-gray-600">
                          {currentStock} → {newStock} {stockAdjustProduct.unit}
                        </span>
                      </span>
                    );
                  })()
                ) : (
                  "Enter new stock quantity to see movement preview"
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Purchase order, issue reference, etc."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockAdjustProduct(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStockUpdate}
              disabled={stockAdjustMutation.isPending}
            >
              {stockAdjustMutation.isPending ? "Processing..." : "Record Movement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
