import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, Package, IndianRupee, Link, ArrowLeft, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 🎯 MATERIAL CATEGORIES FROM BOM CALCULATOR
const MATERIAL_MAPPINGS = {
  board: {
    title: "Board Materials",
    icon: Package,
    materials: [
      { key: "18mm_plywood", name: "18mm Plywood", unit: "sqft" },
      { key: "12mm_plywood", name: "12mm Plywood", unit: "sqft" },
      { key: "6mm_plywood", name: "6mm Plywood", unit: "sqft" },
      { key: "18mm_mdf", name: "18mm MDF", unit: "sqft" },
      { key: "12mm_mdf", name: "12mm MDF", unit: "sqft" },
      { key: "6mm_mdf", name: "6mm MDF", unit: "sqft" },
      { key: "18mm_particle_board", name: "18mm Particle Board", unit: "sqft" },
    ]
  },
  laminate: {
    title: "Laminate & Finishes",
    icon: Package,
    materials: [
      { key: "outer_laminate", name: "Outer Laminate", unit: "sqft" },
      { key: "inner_laminate", name: "Inner Laminate", unit: "sqft" },
      { key: "acrylic_finish", name: "Acrylic Finish", unit: "sqft" },
      { key: "veneer_finish", name: "Veneer Finish", unit: "sqft" },
      { key: "paint_finish", name: "Paint Finish", unit: "sqft" },
      { key: "membrane_foil", name: "Membrane Foil", unit: "sqft" },
    ]
  },
  hardware: {
    title: "Hardware Items",
    icon: Package,
    materials: [
      { key: "soft_close_hinge", name: "Soft Close Hinge", unit: "pieces" },
      { key: "normal_hinge", name: "Normal Hinge", unit: "pieces" },
      { key: "drawer_slide_soft_close", name: "Drawer Slide (Soft Close)", unit: "pieces" },
      { key: "ss_handle", name: "Stainless Steel Handle", unit: "pieces" },
      { key: "door_lock", name: "Door Lock", unit: "pieces" },
    ]
  }
};

interface Product {
  id: number;
  name: string;
  category: string;
  pricePerUnit: number;
  unit: string;
  thickness?: string;
  brand?: string;
}

export default function BOMSettings() {
  const { toast } = useToast();
  const [materialLinks, setMaterialLinks] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);

  // Fetch existing products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch current material links (you'll implement this API)
  const { data: currentLinks = {} } = useQuery<Record<string, number>>({
    queryKey: ['/api/bom/material-links'],
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const handleLinkChange = (materialKey: string, productId: string) => {
    setMaterialLinks(prev => ({
      ...prev,
      [materialKey]: productId ? parseInt(productId) : null
    }));
  };

  const handleSaveLinks = async () => {
    setSaving(true);
    try {
      // TODO: Implement save API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      toast({
        title: "Settings Saved",
        description: "Material-to-product links updated successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed", 
        description: "Failed to save material links",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getLinkedProduct = (materialKey: string) => {
    const linkedProductId = materialLinks[materialKey] ?? currentLinks[materialKey];
    return linkedProductId ? products.find(p => p.id === linkedProductId) : null;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Settings2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">BOM Material Settings</h1>
            <p className="text-muted-foreground text-sm">
              Link BOM calculation materials to your existing products for dynamic pricing
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSaveLinks} 
          disabled={saving}
          className="gap-2"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Links"}
        </Button>
      </div>

      {/* Material Categories */}
      <div className="space-y-6">
        {Object.entries(MATERIAL_MAPPINGS).map(([categoryKey, category]) => (
          <Card key={categoryKey}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <category.icon className="h-5 w-5" />
                {category.title}
              </CardTitle>
              <CardDescription>
                Link these materials to products in your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {category.materials.map((material) => {
                  const linkedProduct = getLinkedProduct(material.key);
                  
                  return (
                    <div key={material.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{material.name}</span>
                          <Badge variant="secondary">{material.unit}</Badge>
                          {linkedProduct && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Link className="h-3 w-3" />
                              <span>{linkedProduct.name}</span>
                              <Badge variant="outline" className="gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {linkedProduct.pricePerUnit}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-64">
                        <Select
                          value={linkedProduct?.id.toString() || ""}
                          onValueChange={(value) => handleLinkChange(material.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No Link</SelectItem>
                            {products
                              .filter(p => 
                                // Smart filtering: match category or thickness
                                p.category.toLowerCase().includes(categoryKey.toLowerCase()) ||
                                (material.name.includes('18mm') && p.thickness?.includes('18')) ||
                                (material.name.includes('12mm') && p.thickness?.includes('12')) ||
                                (material.name.includes('6mm') && p.thickness?.includes('6'))
                              )
                              .map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="truncate">{product.name}</span>
                                    <Badge variant="outline" className="ml-2 gap-1">
                                      <IndianRupee className="h-3 w-3" />
                                      {product.pricePerUnit}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}