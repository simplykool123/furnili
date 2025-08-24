import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Sofa, FileDown, Download, FileSpreadsheet, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

// Define furniture types with their configurations
const furnitureTypes = [
  { id: 'wardrobe', name: 'Wardrobe', icon: '👔' },
  { id: 'kitchen', name: 'Kitchen', icon: '🏠' },
  { id: 'tv_unit', name: 'TV Unit', icon: '📺' },
  { id: 'bed', name: 'Bed', icon: '🛏️' },
  { id: 'office', name: 'Office', icon: '💼' },
  { id: 'storage', name: 'Storage', icon: '📦' },
];

// Form schema
import { z } from "zod";

const bomFormSchema = z.object({
  unitOfMeasure: z.string(),
  projectId: z.number().optional(),
  height: z.number().min(0.1),
  width: z.number().min(0.1),
  depth: z.number().min(0.1),
  boardType: z.string(),
  boardThickness: z.string(),
  finish: z.string(),
  notes: z.string().optional(),
});

type BOMFormData = z.infer<typeof bomFormSchema>;

export default function BOMCalculator() {
  const [selectedFurnitureType, setSelectedFurnitureType] = useState('wardrobe');
  const [bomResult, setBomResult] = useState<any>(null);

  const form = useForm<BOMFormData>({
    resolver: zodResolver(bomFormSchema),
    defaultValues: {
      unitOfMeasure: "ft",
      height: 7,
      width: 4,
      depth: 2,
      boardType: "ply",
      boardThickness: "18mm",
      finish: "laminate",
      notes: "",
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
  });

  const selectedFurniture = furnitureTypes.find(f => f.id === selectedFurnitureType);

  // Calculate BOM mutation
  const calculateBOMMutation = useMutation({
    mutationFn: (data: BOMFormData) =>
      apiRequest('/api/bom/calculate', { 
        method: 'POST', 
        body: { 
          ...data,
          furnitureType: selectedFurnitureType
        } 
      }),
    onSuccess: (data) => {
      setBomResult(data);
    },
  });

  // Export mutation
  const exportBOMMutation = useMutation({
    mutationFn: async ({ type }: { type: 'excel' | 'pdf' }) => {
      if (!bomResult?.calculationNumber) throw new Error('No BOM result to export');
      
      const response = await apiRequest(`/api/bom/export/${type}/${bomResult.calculationNumber}`, {
        method: 'GET',
        responseType: 'blob'
      });
      
      return { blob: response, type };
    },
    onSuccess: ({ blob, type }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOM_${bomResult.calculationNumber}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  const onSubmit = (data: BOMFormData) => {
    calculateBOMMutation.mutate(data);
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    exportBOMMutation.mutate({ type });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="mx-auto max-w-7xl space-y-3">
        
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-[hsl(28,100%,25%)] flex items-center justify-center gap-2">
            <Calculator className="w-5 h-5" />
            BOM Calculator
          </h1>
        </div>

        {/* Furniture Type Selector */}
        <div className="flex justify-center">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border">
            {furnitureTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedFurnitureType === type.id ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 text-xs ${
                  selectedFurnitureType === type.id 
                    ? "bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]" 
                    : ""
                }`}
                onClick={() => setSelectedFurnitureType(type.id)}
              >
                <span className="mr-1">{type.icon}</span>
                {type.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          
        {/* Input Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1">
              <Sofa className="w-4 h-4 text-furnili-brown" />
              {selectedFurniture?.name} Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                  
                  {/* Basic Form - Simple & Working */}
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ft">Feet</SelectItem>
                              <SelectItem value="mm">mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Project (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-7 text-xs">
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
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Height</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-7 text-xs"
                              placeholder="7"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Width</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-7 text-xs"
                              placeholder="4"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="depth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Depth</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-7 text-xs"
                              placeholder="2"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="boardType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Board Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ply">Plywood</SelectItem>
                              <SelectItem value="mdf">MDF</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="boardThickness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Thickness</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="18mm">18mm</SelectItem>
                              <SelectItem value="12mm">12mm</SelectItem>
                              <SelectItem value="6mm">6mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="finish"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Finish</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="laminate">Laminate</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Simple Notes Field */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Any additional specifications..."
                            className="h-7 text-xs"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Compact Submit Button */}
                  <Button
                    type="submit"
                    data-testid="button-calculate-bom"
                    disabled={calculateBOMMutation.isPending}
                    className="w-full bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] text-white py-2 text-sm"
                  >
                    {calculateBOMMutation.isPending ? "Calculating..." : "Calculate"}
                    <Calculator className="w-4 h-4 ml-1" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

        {/* Results Section */}
        <div>
            {bomResult ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-1">
                      <FileDown className="w-4 h-4 text-furnili-brown" />
                      Results - {bomResult.calculationNumber}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('excel')}
                        disabled={exportBOMMutation.isPending}
                        className="h-7 px-2 text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('pdf')}
                        disabled={exportBOMMutation.isPending}
                        className="h-7 px-2 text-xs"
                      >
                        <FileDown className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-1">

                  {/* Compact Material Purchase List */}
                  <Card className="mb-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        Purchase Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="text-xs space-y-1">
                        {Object.entries(bomResult.boardAreaByThickness || {}).map(([thickness, area]) => (
                          <div key={thickness} className="flex justify-between">
                            <span>{Math.ceil((area * 1.1) / 32)} sheets ({thickness})</span>
                            <span className="font-mono">{area.toFixed(2)} sq ft</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Compact BOM Table */}
                  <Card className="mb-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <FileSpreadsheet className="w-4 h-4" />
                        Bill of Materials
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 px-2 font-medium">Item</th>
                              <th className="text-right py-1 px-2 font-medium">Qty</th>
                              <th className="text-right py-1 px-2 font-medium">L×W×T</th>
                              <th className="text-right py-1 px-2 font-medium">Area</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bomResult.items?.map((item: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="py-1 px-2">{item.description}</td>
                                <td className="text-right py-1 px-2">{item.quantity}</td>
                                <td className="text-right py-1 px-2 font-mono">
                                  {item.length}×{item.width}×{item.thickness}
                                </td>
                                <td className="text-right py-1 px-2 font-mono">
                                  {item.area.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Compact Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <Calculator className="w-4 h-4" />
                        Cost Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Material Cost:</span>
                            <span className="font-mono">₹{bomResult.materialCost?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Labor Cost:</span>
                            <span className="font-mono">₹{bomResult.laborCost?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transport:</span>
                            <span className="font-mono">₹{bomResult.transportCost?.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-mono">₹{bomResult.subtotal?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST (18%):</span>
                            <span className="font-mono">₹{bomResult.gstAmount?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Total:</span>
                            <span className="font-mono">₹{bomResult.totalCost?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground text-sm">
                    Enter dimensions and select options to calculate BOM
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
        </div>
      </div>
    </div>
  );
}