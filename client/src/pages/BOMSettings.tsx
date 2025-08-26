import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, DollarSign, Package, Link } from 'lucide-react';
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

// 🎯 DEFAULT BOM MATERIALS - Map to your existing products
const DEFAULT_BOM_MATERIALS = {
  board: [
    { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
    { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
    { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
    { type: '6mm_mdf', name: '6mm MDF', category: 'board' },
    { type: '18mm_particle_board', name: '18mm Particle Board', category: 'board' },
    { type: 'pre_lam_particle_board', name: 'Pre-Lam Particle Board', category: 'board' },
  ],
  hardware: [
    { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
    { type: 'normal_hinge', name: 'Normal Hinge', category: 'hardware' },
    { type: 'drawer_slide_soft_close', name: 'Drawer Slide (Soft Close)', category: 'hardware' },
    { type: 'ss_handle', name: 'SS Handle', category: 'hardware' },
    { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
    { type: 'minifix', name: 'Minifix', category: 'hardware' },
    { type: 'dowel', name: 'Dowel', category: 'hardware' },
  ],
  laminate: [
    { type: 'outer_laminate', name: 'Outer Surface Laminate', category: 'laminate' },
    { type: 'inner_laminate', name: 'Inner Surface Laminate', category: 'laminate' },
    { type: 'acrylic_finish', name: 'Acrylic Finish', category: 'laminate' },
    { type: 'veneer_finish', name: 'Veneer Finish', category: 'laminate' },
  ],
  edge_banding: [
    { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    { type: '0.8mm', name: '0.8mm Edge Banding', category: 'edge_banding' },
    { type: '3mm', name: '3mm Edge Banding', category: 'edge_banding' },
  ]
};

export default function BOMSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch existing BOM settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['/api/bom/settings'],
    queryFn: () => apiRequest('/api/bom/settings'),
  });

  // Fetch all products for mapping
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products'),
  });

  // Create/Update BOM setting
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (data.id) {
        return apiRequest(`/api/bom/settings/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        return apiRequest('/api/bom/settings', { method: 'POST', body: JSON.stringify(data) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bom/settings'] });
      toast({ title: 'Settings saved successfully!' });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    }
  });

  // Get all BOM materials in flat array
  const allBomMaterials = Object.values(DEFAULT_BOM_MATERIALS).flat();

  // Create settings map for quick lookup
  const settingsMap = settings.reduce((acc: any, setting: any) => {
    acc[setting.bomMaterialType] = setting;
    return acc;
  }, {});

  const handleSaveSetting = (materialType: string, linkedProductId: number | null, useRealPricing: boolean) => {
    const material = allBomMaterials.find(m => m.type === materialType);
    if (!material) return;

    const existingSetting = settingsMap[materialType];
    
    const data = {
      id: existingSetting?.id,
      bomMaterialType: materialType,
      bomMaterialCategory: material.category,
      bomMaterialName: material.name,
      linkedProductId,
      useRealPricing,
    };

    saveMutation.mutate(data);
  };

  const getMaterialStatus = (materialType: string) => {
    const setting = settingsMap[materialType];
    if (setting && setting.useRealPricing && setting.linkedProductId) {
      const product = products.find((p: any) => p.id === setting.linkedProductId);
      return {
        status: 'mapped',
        product: product,
        realPrice: product?.pricePerUnit
      };
    } else if (setting && setting.linkedProductId) {
      return { status: 'configured', product: products.find((p: any) => p.id === setting.linkedProductId) };
    }
    return { status: 'default' };
  };

  const MaterialCard = ({ material }: { material: any }) => {
    const status = getMaterialStatus(material.type);
    const setting = settingsMap[material.type];

    return (
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{material.name}</CardTitle>
            <Badge variant={status.status === 'mapped' ? 'default' : status.status === 'configured' ? 'secondary' : 'outline'}>
              {status.status === 'mapped' ? 'Real Price' : status.status === 'configured' ? 'Configured' : 'Default'}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {status.status === 'mapped' && status.product ? 
              `Linked to: ${status.product.name} (₹${status.realPrice})` :
              status.status === 'configured' && status.product ?
              `Linked to: ${status.product.name} (Disabled)` :
              'Using hardcoded DEFAULT_RATES'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {status.status === 'mapped' ? <DollarSign className="h-4 w-4 text-green-600" /> :
               status.status === 'configured' ? <Link className="h-4 w-4 text-blue-600" /> :
               <Package className="h-4 w-4 text-gray-400" />}
              <span className="text-xs text-muted-foreground">
                {material.category}
              </span>
            </div>
            <Dialog open={isDialogOpen && selectedMaterial === material.type} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setSelectedMaterial(null);
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMaterial(material.type)}
                  data-testid={`button-configure-${material.type}`}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Configure
                </Button>
              </DialogTrigger>
              <MaterialConfigDialog 
                material={material}
                setting={setting}
                products={products}
                onSave={handleSaveSetting}
              />
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading BOM settings...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BOM Settings</h1>
          <p className="text-muted-foreground">
            Map BOM materials to your existing products for real pricing instead of hardcoded rates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(DEFAULT_BOM_MATERIALS).map(([category, materials]) => 
          materials.map(material => (
            <MaterialCard key={material.type} material={material} />
          ))
        )}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Default:</strong> Uses hardcoded DEFAULT_RATES for calculations</p>
          <p>• <strong>Configured:</strong> Linked to product but real pricing disabled</p>
          <p>• <strong>Real Price:</strong> Uses actual product prices from your inventory</p>
          <p>• When real pricing is enabled, BOM calculations will use current product prices automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MaterialConfigDialog({ material, setting, products, onSave }: {
  material: any;
  setting: any;
  products: any[];
  onSave: (materialType: string, linkedProductId: number | null, useRealPricing: boolean) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string>(setting?.linkedProductId?.toString() || '');
  const [useRealPricing, setUseRealPricing] = useState(setting?.useRealPricing || false);

  const handleSave = () => {
    onSave(
      material.type,
      selectedProductId && selectedProductId !== 'none' ? parseInt(selectedProductId) : null,
      useRealPricing
    );
  };

  const selectedProduct = products.find(p => p.id.toString() === selectedProductId && selectedProductId !== 'none');

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Configure {material.name}</DialogTitle>
        <DialogDescription>
          Link this BOM material to an existing product for real pricing.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="product-select">Linked Product</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-full" data-testid="select-product">
              <SelectValue placeholder="Select a product..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No product linked</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name} - ₹{product.pricePerUnit} ({product.currentStock} in stock)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm"><strong>Selected:</strong> {selectedProduct.name}</p>
            <p className="text-sm"><strong>Price:</strong> ₹{selectedProduct.pricePerUnit} per {selectedProduct.unit}</p>
            <p className="text-sm"><strong>Stock:</strong> {selectedProduct.currentStock} units</p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="use-real-pricing"
            checked={useRealPricing}
            onCheckedChange={setUseRealPricing}
            disabled={!selectedProductId || selectedProductId === 'none'}
            data-testid="switch-real-pricing"
          />
          <Label htmlFor="use-real-pricing">Enable Real Pricing</Label>
        </div>
        
        {useRealPricing && selectedProduct && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✅ BOM calculations will use <strong>₹{selectedProduct.pricePerUnit}</strong> instead of default rates.
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSave} data-testid="button-save-settings">
          Save Settings
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}