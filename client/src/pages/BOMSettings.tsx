import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Settings, DollarSign, Package, Link, Filter, Search, Home, Bed, Archive, Package as Cabinet, PanelTop, Table2, Sofa } from 'lucide-react';
import ResponsiveLayout from '@/components/Layout/ResponsiveLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Furniture-specific material mapping
const FURNITURE_MATERIALS = {
  wardrobe: {
    name: "Wardrobes & Closets",
    icon: Home,
    materials: [
      // Boards
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: '18mm_particle_board', name: '18mm Particle Board', category: 'board' },
      { type: 'pre_lam_particle_board', name: 'Pre-Lam Particle Board', category: 'board' },
      // Hardware
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'normal_hinge', name: 'Normal Hinge', category: 'hardware' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'ss_handle', name: 'SS Handle', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'door_lock', name: 'Door Lock', category: 'hardware' },
      // Laminate & Finish
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: 'inner_laminate', name: 'Inner Laminate', category: 'laminate' },
      { type: 'acrylic_finish', name: 'Acrylic Finish', category: 'laminate' },
      { type: 'veneer_finish', name: 'Veneer Finish', category: 'laminate' },
      // Edge Banding
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
      { type: '0.8mm', name: '0.8mm Edge Banding', category: 'edge_banding' },
    ]
  },
  bed: {
    name: "Beds & Storage Beds",
    icon: Bed,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'ss_handle', name: 'SS Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  kitchen_cabinet: {
    name: "Kitchen Cabinets",
    icon: Cabinet,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: 'inner_laminate', name: 'Inner Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
      { type: '0.8mm', name: '0.8mm Edge Banding', category: 'edge_banding' },
    ]
  },
  tv_unit: {
    name: "TV Units & Entertainment",
    icon: PanelTop,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  storage_unit: {
    name: "Storage Cabinets",
    icon: Archive,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  bookshelf: {
    name: "Bookshelves",
    icon: Table2,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  dresser: {
    name: "Dressers",
    icon: Sofa,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  }
};

export default function BOMSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFurnitureType, setSelectedFurnitureType] = useState<string>('wardrobe');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch existing BOM settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['/api/products'], // Use existing products API
    queryFn: () => apiRequest('/api/products'),
  });

  // Create/Update BOM setting - Simplified to use existing product system
  const updateProductMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest(`/api/products/${data.productId}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
          ...data.product,
          bomMaterialType: data.materialType,
          isForBOMPricing: true 
        }) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Material linked successfully!' });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to link material', variant: 'destructive' });
    }
  });

  // Get current furniture type materials
  const currentMaterials = FURNITURE_MATERIALS[selectedFurnitureType as keyof typeof FURNITURE_MATERIALS]?.materials || [];
  
  // Filter materials by search
  const filteredMaterials = currentMaterials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get mapped products for current materials
  const getMappedProduct = (materialType: string) => {
    return settings.find((product: any) => 
      product.bomMaterialType === materialType && product.isForBOMPricing
    );
  };

  const handleLinkMaterial = (materialType: string, productId: number) => {
    const product = settings.find((p: any) => p.id === productId);
    if (product) {
      updateProductMutation.mutate({
        productId,
        materialType,
        product: { ...product, bomMaterialType: materialType, isForBOMPricing: true }
      });
    }
  };

  const handleUnlinkMaterial = (materialType: string) => {
    const mappedProduct = getMappedProduct(materialType);
    if (mappedProduct) {
      updateProductMutation.mutate({
        productId: mappedProduct.id,
        materialType: null,
        product: { ...mappedProduct, bomMaterialType: null, isForBOMPricing: false }
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading BOM settings...</div>;
  }

  const currentFurnitureType = FURNITURE_MATERIALS[selectedFurnitureType as keyof typeof FURNITURE_MATERIALS];

  return (
    <ResponsiveLayout
      title="BOM Material Settings"
      subtitle="Configure real pricing for materials by linking them to your product inventory"
    >
      <div className="space-y-6">
        {/* Furniture Type Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Select Furniture Type
            </CardTitle>
            <CardDescription>
              Choose the furniture type to configure its specific materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(FURNITURE_MATERIALS).map(([key, furniture]) => {
                const Icon = furniture.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedFurnitureType(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedFurnitureType === key 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-xs font-medium">{furniture.name}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentFurnitureType && <currentFurnitureType.icon className="h-5 w-5" />}
              {currentFurnitureType?.name} Materials
              <Badge variant="secondary">{filteredMaterials.length} materials</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const mappedProduct = getMappedProduct(material.type);
                  return (
                    <TableRow key={material.type}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {material.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {mappedProduct ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Real Price
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Package className="h-3 w-3 mr-1" />
                            Default Rate
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {mappedProduct ? (
                          <span className="text-sm">{mappedProduct.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mappedProduct ? (
                          <span className="font-medium">₹{mappedProduct.pricePerUnit}</span>
                        ) : (
                          <span className="text-muted-foreground">Default</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen && selectedMaterial?.type === material.type} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (!open) setSelectedMaterial(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMaterial(material)}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              {mappedProduct ? 'Edit' : 'Link'}
                            </Button>
                          </DialogTrigger>
                          <MaterialLinkDialog 
                            material={material}
                            mappedProduct={mappedProduct}
                            products={settings}
                            onLink={handleLinkMaterial}
                            onUnlink={handleUnlinkMaterial}
                          />
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}

function MaterialLinkDialog({ material, mappedProduct, products, onLink, onUnlink }: {
  material: any;
  mappedProduct: any;
  products: any[];
  onLink: (materialType: string, productId: number) => void;
  onUnlink: (materialType: string) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string>(mappedProduct?.id?.toString() || '');

  const relevantProducts = products.filter((product: any) => 
    product.name.toLowerCase().includes(material.name.toLowerCase()) ||
    product.category?.toLowerCase().includes(material.category.toLowerCase()) ||
    product.name.toLowerCase().includes(material.category.toLowerCase())
  );

  const handleSave = () => {
    if (selectedProductId && selectedProductId !== 'none') {
      onLink(material.type, parseInt(selectedProductId));
    } else {
      onUnlink(material.type);
    }
  };

  const selectedProduct = products.find(p => p.id.toString() === selectedProductId);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Link {material.name}</DialogTitle>
        <DialogDescription>
          Select a product from your inventory to use its real price for BOM calculations.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="product-select">Select Product</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a product..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No product linked (use default rates)</SelectItem>
              <SelectItem value="suggested" disabled>--- Suggested Products ---</SelectItem>
              {relevantProducts.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name} - ₹{product.pricePerUnit} ({product.currentStock} in stock)
                </SelectItem>
              ))}
              {products.length > relevantProducts.length && (
                <>
                  <SelectItem value="all" disabled>--- All Products ---</SelectItem>
                  {products.filter(p => !relevantProducts.includes(p)).map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} - ₹{product.pricePerUnit} ({product.currentStock} in stock)
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm"><strong>Selected:</strong> {selectedProduct.name}</p>
            <p className="text-sm"><strong>Price:</strong> ₹{selectedProduct.pricePerUnit} per {selectedProduct.unit}</p>
            <p className="text-sm"><strong>Stock:</strong> {selectedProduct.currentStock} units</p>
            <p className="text-sm"><strong>Category:</strong> {selectedProduct.category}</p>
          </div>
        )}
        
        {selectedProduct && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✅ BOM calculations will use <strong>₹{selectedProduct.pricePerUnit}</strong> instead of default rates.
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSave}>
          Save Configuration
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}