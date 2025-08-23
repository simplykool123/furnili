import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import { useToast } from "@/hooks/use-toast";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { 
  Calculator, 
  Download, 
  Share2, 
  Plus, 
  Trash2,
  FileDown,
  MessageSquare,
  Bed,
  Home,
  Archive,
  DoorOpen,
  Package,
  Table2,
  Sofa,
  PanelTop
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// BOM Calculation Form Schema
const bomCalculationSchema = z.object({
  unitType: z.string().min(1, "Unit type is required"),
  height: z.number().min(1, "Height must be greater than 0"),
  width: z.number().min(1, "Width must be greater than 0"), 
  depth: z.number().min(1, "Depth must be greater than 0"),
  unitOfMeasure: z.string().default("mm"),
  boardType: z.string().min(1, "Board type is required"),
  boardThickness: z.string().default("18mm"),
  finish: z.string().min(1, "Finish is required"),
  projectId: z.number().optional(),
  partsConfig: z.object({
    shelves: z.number().default(0),
    drawers: z.number().default(0),
    shutters: z.number().default(0),
    doors: z.number().default(0),
    backPanels: z.number().default(0),
    customParts: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
    })).default([]),
  }),
  notes: z.string().optional(),
});

type BomCalculationFormData = z.infer<typeof bomCalculationSchema>;

interface BomResult {
  id: number;
  calculationNumber: string;
  totalBoardArea: number;
  totalEdgeBanding2mm: number;
  totalEdgeBanding0_8mm: number;
  totalMaterialCost: number;
  totalHardwareCost: number;
  totalCost: number;
  items: BomItem[];
}

interface BomItem {
  id: number;
  itemType: string;
  itemCategory: string;
  partName: string;
  materialType?: string;
  length?: number;
  width?: number;
  thickness?: number;
  quantity: number;
  unit: string;
  edgeBandingType?: string;
  edgeBandingLength: number;
  unitRate: number;
  totalCost: number;
  description?: string;
}

const furnitureTypes = [
  { 
    id: "wardrobe", 
    name: "Wardrobes", 
    icon: Home, 
    description: "Built-in wardrobes and closets",
    defaultConfig: { shutters: 2, shelves: 3, drawers: 2, doors: 0, backPanels: 1 }
  },
  { 
    id: "bed", 
    name: "Beds", 
    icon: Bed, 
    description: "Bed frames and storage beds",
    defaultConfig: { shutters: 0, shelves: 0, drawers: 2, doors: 0, backPanels: 1 }
  },
  { 
    id: "storage_unit", 
    name: "Cabinets", 
    icon: Archive, 
    description: "Storage cabinets and units",
    defaultConfig: { shutters: 2, shelves: 4, drawers: 1, doors: 0, backPanels: 1 }
  },
  { 
    id: "door", 
    name: "Doors", 
    icon: DoorOpen, 
    description: "Interior and cabinet doors",
    defaultConfig: { shutters: 1, shelves: 0, drawers: 0, doors: 1, backPanels: 0 }
  },
  { 
    id: "shoe_rack", 
    name: "Shelving Units", 
    icon: Package, 
    description: "Open shelving and shoe racks",
    defaultConfig: { shutters: 0, shelves: 5, drawers: 0, doors: 0, backPanels: 1 }
  },
  { 
    id: "table", 
    name: "Tables", 
    icon: Table2, 
    description: "Dining and work tables",
    defaultConfig: { shutters: 0, shelves: 0, drawers: 1, doors: 0, backPanels: 0 }
  },
  { 
    id: "sofa", 
    name: "Sofas and Seating", 
    icon: Sofa, 
    description: "Sofa frames and seating",
    defaultConfig: { shutters: 0, shelves: 0, drawers: 1, doors: 0, backPanels: 0 }
  },
  { 
    id: "tv_panel", 
    name: "Paneling", 
    icon: PanelTop, 
    description: "Wall panels and partitions",
    defaultConfig: { shutters: 1, shelves: 2, drawers: 0, doors: 0, backPanels: 1 }
  },
];

const boardTypes = [
  { value: "pre_lam_particle_board", label: "Pre-Lam Particle Board" },
  { value: "mdf", label: "MDF" },
  { value: "ply", label: "Plywood" },
  { value: "solid_wood", label: "Solid Wood" },
  { value: "hdf", label: "HDF" },
];

const finishTypes = [
  { value: "laminate", label: "Laminate" },
  { value: "acrylic", label: "Acrylic" },
  { value: "paint", label: "Paint" },
  { value: "veneer", label: "Veneer" },
  { value: "membrane", label: "Membrane" },
  { value: "natural", label: "Natural Wood" },
];

const thicknessOptions = [
  { value: "6mm", label: "6mm" },
  { value: "12mm", label: "12mm" },
  { value: "18mm", label: "18mm" },
  { value: "25mm", label: "25mm" },
];

export default function BOMCalculator() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFurnitureType, setSelectedFurnitureType] = useState<string>("wardrobe");
  const [bomResult, setBomResult] = useState<BomResult | null>(null);
  const [customParts, setCustomParts] = useState<{name: string, quantity: number}[]>([]);

  const selectedFurniture = furnitureTypes.find(f => f.id === selectedFurnitureType);

  const form = useForm<BomCalculationFormData>({
    resolver: zodResolver(bomCalculationSchema),
    defaultValues: {
      unitType: selectedFurnitureType,
      unitOfMeasure: "mm",
      boardThickness: "18mm",
      partsConfig: selectedFurniture?.defaultConfig || {
        shelves: 0,
        drawers: 0,
        shutters: 0,
        doors: 0,
        backPanels: 0,
        customParts: [],
      },
    },
  });

  // Update form when furniture type changes
  useEffect(() => {
    if (selectedFurniture) {
      form.setValue('unitType', selectedFurniture.id);
      form.setValue('partsConfig', {
        ...selectedFurniture.defaultConfig,
        customParts: []
      });
    }
  }, [selectedFurnitureType, selectedFurniture, form]);

  // Fetch projects for project linking
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000,
  });

  const calculateBOMMutation = useMutation({
    mutationFn: async (data: BomCalculationFormData) => {
      return await apiRequest('/api/bom/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: BomResult) => {
      setBomResult(data);
      // Invalidate any BOM-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/bom'] });
      toast({
        title: "BOM Calculated",
        description: `Successfully calculated BOM ${data.calculationNumber}`,
      });
    },
    onError: (error: Error) => {
      console.error('BOM Calculation Error:', error);
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate BOM",
        variant: "destructive",
      });
    },
  });

  const exportBOMMutation = useMutation({
    mutationFn: async ({ bomId, format }: { bomId: number, format: 'excel' | 'pdf' }) => {
      const response = await fetch(`/api/bom/${bomId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to export BOM');
      }
      
      // For file downloads, create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BOM-${bomId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "BOM exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export BOM",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BomCalculationFormData) => {
    // Add custom parts to the parts config
    const submitData = {
      ...data,
      partsConfig: {
        ...data.partsConfig,
        customParts: customParts,
      }
    };
    calculateBOMMutation.mutate(submitData);
  };

  const addCustomPart = () => {
    setCustomParts([...customParts, { name: "", quantity: 1 }]);
  };

  const updateCustomPart = (index: number, field: 'name' | 'quantity', value: string | number) => {
    const updated = [...customParts];
    if (field === 'name') {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = value as number;
    }
    setCustomParts(updated);
  };

  const removeCustomPart = (index: number) => {
    setCustomParts(customParts.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (bomResult) {
      exportBOMMutation.mutate({ bomId: bomResult.id, format });
    }
  };

  const handleWhatsAppShare = () => {
    if (bomResult) {
      const message = `BOM Calculation ${bomResult.calculationNumber}\n` +
        `Total Cost: ${formatCurrency(bomResult.totalCost)}\n` +
        `Board Area: ${bomResult.totalBoardArea} sq.ft\n` +
        `View full details: ${window.location.origin}/bom-calculator`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <ResponsiveLayout title="BOM Calculator">
      {/* Hero Section */}
      <div className="bg-[hsl(28,100%,25%)] text-white py-8 px-4 mb-6 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            HOW MUCH MATERIALS WOULD YOU NEED?
          </h1>
          <p className="text-white/90">Calculate furniture material requirements</p>
        </div>
      </div>

      {/* Furniture Type Selector */}
      <div className="bg-card shadow-sm border rounded-lg mb-6">
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[hsl(28,100%,25%)] text-white px-3 py-1 rounded-full text-sm font-medium">
              Select Furniture Type
            </div>
          </div>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4 lg:grid-cols-8'}`}>
            {furnitureTypes.map((furniture) => {
              const IconComponent = furniture.icon;
              const isSelected = selectedFurnitureType === furniture.id;
              
              return (
                <button
                  key={furniture.id}
                  onClick={() => setSelectedFurnitureType(furniture.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    isSelected 
                      ? 'border-[hsl(28,100%,25%)] bg-[hsl(28,100%,25%)] text-white shadow-lg' 
                      : 'border-border bg-card hover:border-[hsl(28,100%,25%)]/30 hover:bg-accent text-foreground'
                  }`}
                >
                  <IconComponent className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-white' : 'text-[hsl(28,100%,25%)]'}`} />
                  <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}>
                    {furniture.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {selectedFurniture && <selectedFurniture.icon className="w-6 h-6 text-furnili-brown" />}
                <div>
                  <div>{selectedFurniture?.name} Calculator</div>
                  <div className="text-sm text-muted-foreground font-normal">{selectedFurniture?.description}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Dimensions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Dimensions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="unitOfMeasure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                                <SelectItem value="ft">Feet (ft)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Link to Project (Optional)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {projects.map((project: any) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name} ({project.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2400"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1200"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="depth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Depth</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="600"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configuration</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedFurniture?.defaultConfig.shelves !== undefined && (
                        <FormField
                          control={form.control}
                          name="partsConfig.shelves"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shelves</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedFurniture?.defaultConfig.drawers !== undefined && (
                        <FormField
                          control={form.control}
                          name="partsConfig.drawers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Drawers</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedFurniture?.defaultConfig.shutters !== undefined && (
                        <FormField
                          control={form.control}
                          name="partsConfig.shutters"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shutters</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedFurniture?.defaultConfig.doors !== undefined && (
                        <FormField
                          control={form.control}
                          name="partsConfig.doors"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Doors</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedFurniture?.defaultConfig.backPanels !== undefined && (
                        <FormField
                          control={form.control}
                          name="partsConfig.backPanels"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Back Panels</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Custom Parts */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Custom Parts</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCustomPart}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Part
                        </Button>
                      </div>
                      {customParts.map((part, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="Part name"
                            value={part.name}
                            onChange={(e) => updateCustomPart(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={part.quantity}
                            onChange={(e) => updateCustomPart(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomPart(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Materials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="boardType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Board Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select board type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {boardTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="boardThickness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thickness</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {thicknessOptions.map((thickness) => (
                                  <SelectItem key={thickness.value} value={thickness.value}>
                                    {thickness.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="finish"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Finish</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select finish" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {finishTypes.map((finish) => (
                                  <SelectItem key={finish.value} value={finish.value}>
                                    {finish.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional specifications..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={calculateBOMMutation.isPending}
                    className="w-full bg-furnili-brown hover:bg-furnili-brown/90 text-lg py-6"
                  >
                    {calculateBOMMutation.isPending ? "Calculating..." : "Calculate BOM"}
                    <Calculator className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {bomResult ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileDown className="w-5 h-5 text-furnili-brown" />
                      BOM Results - {bomResult.calculationNumber}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('excel')}
                        disabled={exportBOMMutation.isPending}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('pdf')}
                        disabled={exportBOMMutation.isPending}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWhatsAppShare}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium">Board Area</p>
                      <p className="text-xl font-bold text-foreground">{bomResult.totalBoardArea.toFixed(1)} sq.ft</p>
                    </div>
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium">Edge Band 2mm</p>
                      <p className="text-xl font-bold text-foreground">{bomResult.totalEdgeBanding2mm.toFixed(1)} ft</p>
                    </div>
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium">Edge Band 0.8mm</p>
                      <p className="text-xl font-bold text-foreground">{bomResult.totalEdgeBanding0_8mm.toFixed(1)} ft</p>
                    </div>
                    <div className="text-center p-4 bg-furnili-brown/10 rounded-lg">
                      <p className="text-sm text-furnili-brown font-medium">Total Cost</p>
                      <p className="text-2xl font-bold text-furnili-brown">{formatCurrency(bomResult.totalCost)}</p>
                    </div>
                  </div>

                  {/* BOM Table */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Bill of Materials</h3>
                    
                    {isMobile ? (
                      <MobileTable
                        data={bomResult.items}
                        columns={[
                          {
                            key: 'partName',
                            label: 'Part',
                            render: (value: any, item: BomItem) => (
                              <div>
                                <div className="font-medium text-sm">{item.partName}</div>
                                <div className="text-xs text-gray-600">
                                  {item.itemCategory} - {item.quantity} {item.unit}
                                </div>
                                {item.length && item.width && (
                                  <div className="text-xs text-gray-500">
                                    {item.length}×{item.width} mm
                                  </div>
                                )}
                              </div>
                            )
                          },
                          {
                            key: 'cost',
                            label: 'Cost',
                            render: (value: any, item: BomItem) => (
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(item.totalCost)}</div>
                                <div className="text-xs text-gray-600">
                                  @ {formatCurrency(item.unitRate)}/{item.unit}
                                </div>
                                {item.edgeBandingType && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {item.edgeBandingType} Edge
                                  </Badge>
                                )}
                              </div>
                            )
                          }
                        ]}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Part Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Size (mm)</TableHead>
                              <TableHead>Qty</TableHead>
                              <TableHead>Edge Band</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bomResult.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.partName}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{item.itemCategory}</Badge>
                                </TableCell>
                                <TableCell>
                                  {item.length && item.width ? 
                                    `${item.length} × ${item.width}` : 
                                    '-'
                                  }
                                </TableCell>
                                <TableCell>{item.quantity} {item.unit}</TableCell>
                                <TableCell>
                                  {item.edgeBandingType ? (
                                    <Badge variant="outline">{item.edgeBandingType}</Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitRate)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.totalCost)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Cost Summary */}
                    <div className="border-t pt-4">
                      <div className="flex justify-end">
                        <div className="w-full md:w-1/2">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Material Cost:</span>
                              <span>{formatCurrency(bomResult.totalMaterialCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hardware Cost:</span>
                              <span>{formatCurrency(bomResult.totalHardwareCost)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total Tentative Cost:</span>
                              <span className="text-furnili-brown">{formatCurrency(bomResult.totalCost)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Calculations Yet</h3>
                  <p className="text-muted-foreground">Fill in the form and calculate to see your BOM results here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}