import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Save, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define the form schema
const quoteFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  clientId: z.number().min(1, "Client is required"),
  projectId: z.number().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected", "expired"]).default("draft"),
  validUntil: z.string().optional(),
  furnitureSpecifications: z.string().default("To be customized as per your requirements with quality materials and professional finish."),
  paymentTerms: z.string().default("30% Advance Payment: Due upon order confirmation.\n50% Payment Before Delivery: To be settled prior to dispatch.\n20% Payment on Delivery"),
  packingChargesType: z.enum(["percentage", "fixed"]).default("percentage"),
  packingChargesValue: z.number().min(0).default(2),
  transportationCharges: z.number().min(0).default(5000),
  notes: z.string().optional(),
});

const quoteItemSchema = z.object({
  salesProductId: z.number().optional(),
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  uom: z.string().default("pcs"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  taxPercentage: z.number().min(0).max(100).default(18),
  notes: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;
type QuoteItemData = z.infer<typeof quoteItemSchema>;

interface QuoteEditorProps {
  quoteId?: number;
  projectId?: number;
  clientId?: number;
  onSave?: () => void;
  onCancel?: () => void;
}

export function QuoteEditor({ quoteId, projectId, clientId, onSave, onCancel }: QuoteEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<QuoteItemData[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: "",
      description: "",
      clientId: clientId || 0,
      projectId: projectId || 0,
      status: "draft",
      furnitureSpecifications: "To be customized as per your requirements with quality materials and professional finish.",
      paymentTerms: "30% Advance Payment: Due upon order confirmation.\n50% Payment Before Delivery: To be settled prior to dispatch.\n20% Payment on Delivery",
      packingChargesType: "percentage",
      packingChargesValue: 2,
      transportationCharges: 5000,
    },
  });

  // Fetch clients for selection
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/quotes/clients/list"],
  });

  // Fetch sales products for item selection
  const { data: salesProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/quotes/products/list"],
  });

  // Fetch existing quote data if editing
  const { data: quoteData } = useQuery<any>({
    queryKey: ["/api/quotes", quoteId, "details"],
    enabled: !!quoteId,
  });

  // Load quote data when editing
  useEffect(() => {
    if (quoteData) {
      const quote = quoteData.quote;
      form.reset({
        title: quote.title,
        description: quote.description || "",
        clientId: quote.clientId,
        projectId: quote.projectId || undefined,
        status: quote.status,
        validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : "",
        furnitureSpecifications: quote.furnitureSpecifications || "To be customized as per your requirements with quality materials and professional finish.",
        paymentTerms: quote.paymentTerms || "30% Advance Payment: Due upon order confirmation.\n50% Payment Before Delivery: To be settled prior to dispatch.\n20% Payment on Delivery",
        packingChargesType: quote.packingChargesType || "percentage",
        packingChargesValue: quote.packingChargesValue || 2,
        transportationCharges: quote.transportationCharges || 5000,
        notes: quote.notes || "",
      });

      if ((quoteData as any)?.items && (quoteData as any).items.length > 0) {
        setItems((quoteData as any).items.map((item: any) => ({
          salesProductId: item.item.salesProductId,
          itemName: item.item.itemName,
          description: item.item.description || "",
          quantity: item.item.quantity,
          uom: item.item.uom,
          unitPrice: item.item.unitPrice,
          taxPercentage: item.item.taxPercentage,
          notes: item.item.notes || "",
        })));
      }
    }
  }, [quoteData, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const payload = {
        ...data,
        items: items.map((item, index) => ({
          ...item,
          sortOrder: index,
          lineTotal: calculateItemTotal(item),
        })),
        subtotal: calculateSubtotal(),
        taxAmount: calculateTaxAmount(),
        totalAmount: calculateTotalAmount(),
      };

      if (quoteId) {
        return apiRequest(`/api/quotes/${quoteId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        return apiRequest("/api/quotes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Quote ${quoteId ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      onSave?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${quoteId ? "update" : "create"} quote`,
        variant: "destructive",
      });
    },
  });

  const calculateItemTotal = (item: QuoteItemData) => {
    const baseAmount = item.quantity * item.unitPrice;
    const taxAmount = baseAmount * (item.taxPercentage / 100);
    return baseAmount + taxAmount;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTaxAmount = () => {
    return items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.unitPrice;
      return sum + (baseAmount * (item.taxPercentage / 100));
    }, 0);
  };

  const calculatePackingCharges = () => {
    const formValues = form.getValues();
    const subtotal = calculateSubtotal();
    
    if (formValues.packingChargesType === "percentage") {
      return subtotal * (formValues.packingChargesValue / 100);
    }
    return formValues.packingChargesValue;
  };

  const calculateTotalAmount = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = calculateTaxAmount();
    const packingCharges = calculatePackingCharges();
    const formValues = form.getValues();
    
    return subtotal + taxAmount + packingCharges + formValues.transportationCharges;
  };

  const addItem = () => {
    setItems([...items, {
      itemName: "",
      description: "",
      quantity: 1,
      uom: "pcs",
      unitPrice: 0,
      taxPercentage: 18,
      notes: "",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updatedItem: Partial<QuoteItemData>) => {
    setItems(items.map((item, i) => i === index ? { ...item, ...updatedItem } : item));
  };

  const selectProduct = (index: number, productId: number) => {
    const product = (salesProducts as any[]).find((p: any) => p.id === productId);
    if (product) {
      updateItem(index, {
        salesProductId: productId,
        itemName: product.name,
        description: product.description || "",
        unitPrice: product.unitPrice,
        taxPercentage: product.taxPercentage || 18,
      });
    }
  };

  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Quote Preview</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              <FileText className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={() => form.handleSubmit((data) => saveMutation.mutate(data))()}>
              <Save className="h-4 w-4 mr-2" />
              Save Quote
            </Button>
          </div>
        </div>
        
        {/* PDF-style preview will go here */}
        <div className="bg-white border rounded-lg p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-xl font-bold text-[hsl(28,100%,25%)]">FURNILI</h1>
              <p className="text-sm text-gray-600">Quote</p>
            </div>
            
            {/* Quote details preview */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Quote No:</strong> {(quoteData as any)?.quote?.quoteNumber || "Will be generated"}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>Valid Until:</strong> {form.watch("validUntil") || "N/A"}</p>
                <p><strong>Status:</strong> <Badge variant="outline">{form.watch("status")}</Badge></p>
              </div>
            </div>
            
            {/* Items table preview */}
            <div className="space-y-2">
              <h4 className="font-semibold">Items</h4>
              <div className="border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{item.itemName}</td>
                        <td className="p-2 text-center">{item.quantity} {item.uom}</td>
                        <td className="p-2 text-right">₹{item.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right">₹{calculateItemTotal(item).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Totals preview */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{calculateSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Packing & Forwarding ({form.watch("packingChargesValue")}{form.watch("packingChargesType") === "percentage" ? "%" : ""}):</span>
                <span>₹{calculatePackingCharges().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Transportation:</span>
                <span>₹{form.watch("transportationCharges").toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>GST @ 18%:</span>
                <span>₹{calculateTaxAmount().toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Grand Total:</span>
                <span>₹{calculateTotalAmount().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[hsl(28,100%,25%)]">
          {quoteId ? "Edit Quote" : "Create New Quote"}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => setPreviewMode(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={form.handleSubmit((data) => saveMutation.mutate(data))}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Quote"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quote Title *</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8" placeholder="Enter quote title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Client *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(clients as any[]).map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
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
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Valid Until</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-8" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-[60px]" placeholder="Quote description..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Quote Items</CardTitle>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No items added yet. Click "Add Item" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">Item {index + 1}</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium">Select Product (Optional)</label>
                          <Select onValueChange={(value) => selectProduct(index, parseInt(value))}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Choose from catalog" />
                            </SelectTrigger>
                            <SelectContent>
                              {(salesProducts as any[]).map((product: any) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name} - ₹{product.unitPrice.toLocaleString()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium">Item Name *</label>
                          <Input
                            value={item.itemName}
                            onChange={(e) => updateItem(index, { itemName: e.target.value })}
                            className="h-8"
                            placeholder="Enter item name"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Description</label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, { description: e.target.value })}
                            className="h-8"
                            placeholder="Item description"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Quantity *</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Unit</label>
                          <Input
                            value={item.uom}
                            onChange={(e) => updateItem(index, { uom: e.target.value })}
                            className="h-8"
                            placeholder="pcs, sqft, etc."
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Unit Price *</label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium">Tax %</label>
                          <Input
                            type="number"
                            value={item.taxPercentage}
                            onChange={(e) => updateItem(index, { taxPercentage: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-medium">Notes</label>
                          <Input
                            value={item.notes}
                            onChange={(e) => updateItem(index, { notes: e.target.value })}
                            className="h-8"
                            placeholder="Item-specific notes"
                          />
                        </div>
                      </div>

                      <div className="text-right text-sm font-medium">
                        Line Total: ₹{calculateItemTotal(item).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editable Content Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="furnitureSpecifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Furniture Specifications</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[80px]" 
                        placeholder="Describe furniture specifications, materials, finish, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Payment Terms</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[80px]" 
                        placeholder="Enter payment terms and conditions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="packingChargesType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Packing Charges Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="packingChargesValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Packing Charges {form.watch("packingChargesType") === "percentage" ? "(%)" : "(₹)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-8"
                          min="0"
                          step="0.01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transportationCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Transportation Charges (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="h-8"
                          min="0"
                          step="0.01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[60px]" 
                        placeholder="Any additional notes or conditions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Packing & Forwarding ({form.watch("packingChargesValue")}
                    {form.watch("packingChargesType") === "percentage" ? "%" : ""}):
                  </span>
                  <span className="font-medium">₹{calculatePackingCharges().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transportation:</span>
                  <span className="font-medium">₹{form.watch("transportationCharges").toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST @ 18%:</span>
                  <span className="font-medium">₹{calculateTaxAmount().toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-[hsl(28,100%,25%)]">
                  <span>Grand Total:</span>
                  <span>₹{calculateTotalAmount().toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}