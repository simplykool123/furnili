import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProjectQuotesProps {
  projectId: string;
}

interface Quote {
  id: number;
  quoteNumber: string;
  title: string;
  description?: string;
  clientId: number;
  clientName?: string;
  projectId?: number;
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  validUntil?: string;
  expirationDate?: string;
  paymentTerms: string;
  pricelist: string;
  terms?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteItem {
  id?: number;
  quoteId?: number;
  salesProductId?: number;
  itemName: string;
  description?: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder?: number;
  notes?: string;
}

interface QuoteFormData {
  clientId: number;
  title: string;
  description?: string;
  validUntil?: string;
  expirationDate?: string;
  paymentTerms: string;
  pricelist: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  terms?: string;
  notes?: string;
}

const quoteSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  validUntil: z.string().optional(),
  expirationDate: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  pricelist: z.string().min(1, "Pricelist is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

const quoteItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  uom: z.string().min(1, "UOM is required"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  discountPercentage: z.number().min(0).max(100),
  taxPercentage: z.number().min(0).max(100),
  size: z.string().optional(),
  salesProductId: z.string().optional(),
});

export default function ProjectQuotes({ projectId }: ProjectQuotesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project quotes
  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/quotes', 'project', projectId, searchTerm, statusFilter],
    queryFn: () => apiRequest(`/api/quotes?projectId=${projectId}&search=${searchTerm}&status=${statusFilter}`),
  });

  // Fetch project client data
  const { data: projectData } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: () => apiRequest(`/api/projects/${projectId}`),
  });

  // Fetch sales products for items
  const { data: salesProducts = [] } = useQuery({
    queryKey: ['/api/quotes/products/list'],
    queryFn: () => apiRequest('/api/quotes/products/list'),
  });

  // Create quote mutation
  const createMutation = useMutation({
    mutationFn: (data: QuoteFormData & { items: QuoteItem[] }) => 
      apiRequest('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          projectId: parseInt(projectId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setShowCreateDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating quote", description: error.message, variant: "destructive" });
    },
  });

  // Update quote mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuoteFormData & { items: QuoteItem[] } }) => 
      apiRequest(`/api/quotes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          projectId: parseInt(projectId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setShowEditDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating quote", description: error.message, variant: "destructive" });
    },
  });

  // Delete quote mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/quotes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setShowDeleteDialog(false);
      setSelectedQuote(null);
      toast({ title: "Quote deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting quote", description: error.message, variant: "destructive" });
    },
  });

  // Form setup
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      title: "",
      description: "",
      paymentTerms: "Immediate Payment",
      pricelist: "Public Pricelist (EGP)",
      discountType: "percentage",
      discountValue: 0,
      terms: "",
      notes: "",
      clientId: projectData?.clientId || 0,
    },
  });

  const itemForm = useForm({
    resolver: zodResolver(quoteItemSchema),
    defaultValues: {
      itemName: "",
      description: "",
      quantity: 1,
      uom: "pcs",
      unitPrice: 0,
      discountPercentage: 0,
      taxPercentage: 18,
    },
  });

  // Calculate line total for item
  const calculateLineTotal = (item: QuoteItem): number => {
    const baseAmount = item.quantity * item.unitPrice;
    const discountAmount = (baseAmount * item.discountPercentage) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = (afterDiscount * item.taxPercentage) / 100;
    return afterDiscount + taxAmount;
  };

  // Add item to quote
  const handleSaveItem = (data: any) => {
    const newItem: QuoteItem = {
      ...data,
      discountAmount: (data.quantity * data.unitPrice * data.discountPercentage) / 100,
      taxAmount: ((data.quantity * data.unitPrice - (data.quantity * data.unitPrice * data.discountPercentage) / 100) * data.taxPercentage) / 100,
      lineTotal: 0,
    };
    newItem.lineTotal = calculateLineTotal(newItem);

    if (editingItem) {
      // Update existing item
      const itemIndex = quoteItems.findIndex((item, index) => 
        editingItem.id ? item.id === editingItem.id : index === quoteItems.indexOf(editingItem)
      );
      if (itemIndex !== -1) {
        const updatedItems = [...quoteItems];
        updatedItems[itemIndex] = { ...editingItem, ...newItem };
        setQuoteItems(updatedItems);
      }
      setEditingItem(null);
    } else {
      // Add new item
      setQuoteItems([...quoteItems, newItem]);
    }

    setShowItemDialog(false);
    itemForm.reset();
  };

  // Remove item from quote
  const removeItem = (index: number) => {
    const newItems = quoteItems.filter((_, i) => i !== index);
    setQuoteItems(newItems);
  };

  // Add from sales product
  const addFromSalesProduct = (product: any) => {
    const newItem: QuoteItem = {
      itemName: product.name,
      description: product.description || "",
      quantity: 1,
      uom: product.uom || "pcs",
      unitPrice: product.unitPrice || 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 18,
      taxAmount: 0,
      lineTotal: 0,
      salesProductId: product.id,
    };
    newItem.lineTotal = calculateLineTotal(newItem);
    setQuoteItems([...quoteItems, newItem]);
  };

  // Handle product selection in item form
  const handleProductSelection = (productId: string) => {
    const selectedProduct = salesProducts.find((p: any) => p.id.toString() === productId);
    if (selectedProduct) {
      itemForm.setValue('itemName', selectedProduct.name);
      itemForm.setValue('description', selectedProduct.description || '');
      itemForm.setValue('unitPrice', selectedProduct.unitPrice || 0);
      itemForm.setValue('uom', selectedProduct.uom || 'pcs');
    }
  };

  // Calculate quote totals
  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);
    
    const totalDiscountAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.discountAmount || 0);
    }, 0);
    
    const totalTaxAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.taxAmount || 0);
    }, 0);
    
    const total = quoteItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    
    return {
      subtotal: subtotal || 0,
      totalDiscountAmount: totalDiscountAmount || 0,
      totalTaxAmount: totalTaxAmount || 0,
      total: total || 0,
      // Also provide alternative names for compatibility
      totalDiscount: totalDiscountAmount || 0,
      totalTax: totalTaxAmount || 0,
      grandTotal: total || 0,
    };
  };

  const totals = calculateTotals();

  // Export PDF function with professional Furnili format
  const handleExportPDF = async (quote: Quote) => {
    try {
      // Fetch quote items (you may need to implement this API endpoint)
      const quoteData = await apiRequest(`/api/quotes/${quote.id}/details`).catch(() => ({
        ...quote,
        items: quoteItems // fallback to current items
      }));

      const client = projectData?.client || { name: 'Client Name', address: 'Client Address' };
      const items = quoteData.items || [];
      
      // Create professional PDF content matching Furnili format
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 20px;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <div>
              <h1 style="font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 2px;">FURNILI</h1>
              <p style="font-size: 12px; margin: 0; letter-spacing: 1px;">BESPOKE MODULAR FURNITURE</p>
            </div>
          </div>

          <!-- Quotation Title -->
          <div style="text-align: center; margin: 20px 0;">
            <h2 style="font-size: 24px; font-weight: bold; margin: 0; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px;">Quotation</h2>
          </div>

          <!-- Client and Quote Details -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 60%;">
              <p style="margin: 0;"><strong>To,</strong></p>
              <p style="margin: 0; font-weight: bold;">${client.name}</p>
              <p style="margin: 0;">${client.address || 'Address'}</p>
            </div>
            <div style="width: 35%; text-align: right;">
              <p style="margin: 0;"><strong>Date :-</strong> ${new Date(quote.createdAt).toLocaleDateString('en-GB')}</p>
              <p style="margin: 0;"><strong>Est. No. :-</strong> ${quote.quoteNumber}</p>
              <p style="margin: 0;"><strong>GSTN :-</strong> 27AAKFF2192A1ZO</p>
              <p style="margin: 0;"><strong>PAN :-</strong> AAKFF2192A</p>
              <p style="margin: 0;"><strong>Contact Person :-</strong> ${client.name}</p>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px;">Sr. No.</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 150px;">Product</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center;">Item Description</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 80px;">SIZE</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 50px;">Qty</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 80px;">Rate</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 80px;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, index: number) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${item.itemName}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${item.description || ''}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.size || '-'}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${item.unitPrice.toFixed(0)}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${(item.quantity * item.unitPrice).toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Footer Totals -->
          <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <div style="width: 60%;">
              <h3 style="font-size: 14px; margin-bottom: 10px;">Furniture Specifications</h3>
              <p style="font-size: 10px; margin: 2px 0;">- All furniture will be manufactured using Said Materials</p>
              <p style="font-size: 10px; margin: 2px 0;">- All hardware considered of standard make.</p>
              <p style="font-size: 10px; margin: 2px 0;">- Standard laminates considered as per selection.</p>
              <p style="font-size: 10px; margin: 2px 0;">- Any modifications or changes in material selection may result in additional charges.</p>
              
              <h3 style="font-size: 14px; margin: 20px 0 10px 0;">Payment Terms</h3>
              <p style="font-size: 10px; margin: 2px 0;"><strong>30%</strong> Advance Payment: Due upon order confirmation.</p>
              <p style="font-size: 10px; margin: 2px 0;"><strong>50%</strong> Payment Before Delivery: To be settled prior to dispatch.</p>
              <p style="font-size: 10px; margin: 2px 0;"><strong>20%</strong> Payment on Delivery</p>
            </div>
            
            <div style="width: 35%;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">Total</td>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">₹${quote.subtotal?.toFixed(0) || quote.totalAmount.toFixed(0)}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">Packaging @ 2%</td>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">₹${((quote.subtotal || quote.totalAmount) * 0.02).toFixed(0)}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">Transportation</td>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">₹5,000</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">GST @ 18%</td>
                  <td style="border-bottom: 1px solid #000; padding: 5px; text-align: right;">₹${(quote.taxAmount || ((quote.subtotal || quote.totalAmount) * 0.18)).toFixed(0)}</td>
                </tr>
                <tr style="font-weight: bold; font-size: 12px;">
                  <td style="border-bottom: 2px solid #000; padding: 8px; text-align: right;">Grand Total</td>
                  <td style="border-bottom: 2px solid #000; padding: 8px; text-align: right;">₹${quote.totalAmount.toFixed(0)}</td>
                </tr>
              </table>
              
              <div style="margin-top: 20px;">
                <h4 style="font-size: 12px; margin-bottom: 10px;">Bank Details</h4>
                <p style="font-size: 10px; margin: 1px 0;"><strong>A/C Name:</strong> Furnili</p>
                <p style="font-size: 10px; margin: 1px 0;"><strong>Bank:</strong> ICICI Bank</p>
                <p style="font-size: 10px; margin: 1px 0;"><strong>Branch:</strong> Nigdi</p>
                <p style="font-size: 10px; margin: 1px 0;"><strong>A/C No.:</strong> 230505006647</p>
                <p style="font-size: 10px; margin: 1px 0;"><strong>IFSC:</strong> ICIC0002305</p>
              </div>
            </div>
          </div>

          <!-- Company Footer -->
          <div style="background-color: #2c3e50; color: white; padding: 15px; margin-top: 30px; text-align: center;">
            <h3 style="margin: 0; font-size: 16px;">Furnili - Bespoke Modular Furniture</h3>
            <p style="margin: 5px 0; font-size: 10px;">Sr.no - 31/1 , Pisoli Road, Near Mohan Marbel, Pisoli,, Pune - 411048</p>
            <p style="margin: 5px 0; font-size: 10px;">+91 98231 01223 | info@furnili.com</p>
          </div>
        </div>
      `;
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${quote.quoteNumber}_Furnili_Quote.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      // Import html2pdf dynamically
      const { default: html2pdf } = await import('html2pdf.js') as any;
      html2pdf().set(opt).from(element).save();
      
      toast({
        title: "Professional PDF Generated",
        description: "Furnili branded quote PDF downloaded successfully."
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Share quote function
  const handleShareQuote = async (quote: Quote) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Quote ${quote.quoteNumber}`,
          text: `${quote.title} - ₹${quote.totalAmount.toFixed(2)}`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `Quote ${quote.quoteNumber}: ${quote.title}\nAmount: ₹${quote.totalAmount.toFixed(2)}\nStatus: ${quote.status}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to Clipboard",
          description: "Quote details copied to clipboard."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle form submission
  const handleSubmit = (data: QuoteFormData) => {
    if (quoteItems.length === 0) {
      toast({ title: "Please add at least one item to the quote", variant: "destructive" });
      return;
    }

    const quoteTotals = calculateTotals();
    const quoteData = {
      ...data,
      clientId: projectData?.clientId || data.clientId,
      subtotal: quoteTotals.subtotal,
      discountAmount: quoteTotals.totalDiscountAmount,
      taxAmount: quoteTotals.totalTaxAmount,
      totalAmount: quoteTotals.total,
      items: quoteItems,
    };

    if (selectedQuote) {
      updateMutation.mutate({ id: selectedQuote.id, data: quoteData });
    } else {
      createMutation.mutate(quoteData);
    }
  };

  // Handle edit quote
  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    // Populate form with existing quote data
    form.setValue('title', quote.title);
    form.setValue('description', quote.description || '');
    form.setValue('status', quote.status);
    
    // Fetch and set quote items
    fetchQuoteItems(quote.id);
    setShowEditDialog(true);
  };

  // Fetch quote items for editing
  const fetchQuoteItems = async (quoteId: number) => {
    try {
      const response = await apiRequest(`/api/quotes/${quoteId}/items`);
      setQuoteItems(response || []);
    } catch (error) {
      console.error('Error fetching quote items:', error);
      setQuoteItems([]);
    }
  };

  // Handle update quote
  const handleUpdateQuote = async (data: z.infer<typeof quoteSchema>) => {
    if (!selectedQuote) return;

    try {
      const totals = calculateTotals();
      const quoteData = {
        ...data,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        taxAmount: totals.totalTax,
        totalAmount: totals.grandTotal,
        items: quoteItems
      };

      await apiRequest(`/api/quotes/${selectedQuote.id}`, {
        method: 'PUT',
        body: JSON.stringify(quoteData)
      });

      // Invalidate and refetch quotes
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });

      toast({
        title: "Quote Updated",
        description: "Quote has been updated successfully."
      });

      setShowEditDialog(false);
      setQuoteItems([]);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sent: "outline",
      approved: "default",
      rejected: "destructive",
      expired: "secondary",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Quote Button */}
      <div className="flex justify-end">
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
              <DialogDescription>
                Create a new quote for this project
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quote Title *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter quote title" className="h-8" />
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
                        <FormLabel className="text-xs">Payment Terms *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Immediate Payment">Immediate Payment</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="50% Advance, 50% on Completion">50% Advance, 50% on Completion</SelectItem>
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
                        <Textarea {...field} placeholder="Quote description" className="min-h-[60px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quote Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Quote Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowItemDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {/* Quick Add Products */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium">Quick Add Products:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {Array.isArray(salesProducts) && salesProducts.map((product: any) => (
                        <Button
                          key={product.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFromSalesProduct(product)}
                          className="justify-start text-left h-auto p-2"
                        >
                          <div>
                            <div className="font-medium text-xs truncate">{product.name}</div>
                            <div className="text-xs text-gray-500">₹{product.unitPrice}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Items List */}
                  {quoteItems.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                      {quoteItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-start p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.itemName}</div>
                            <div className="text-xs text-gray-600">
                              {item.quantity} {item.uom} × ₹{item.unitPrice} = ₹{item.lineTotal.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                setShowItemDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Totals */}
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{(totals.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Discount:</span>
                          <span>-₹{(totals.totalDiscountAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax:</span>
                          <span>₹{(totals.totalTaxAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>₹{(totals.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Quote"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes List */}
      <div className="grid gap-4">
        {quotes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No quotes found for this project.</p>
              <Button 
                className="mt-4" 
                onClick={() => setShowCreateDialog(true)}
              >
                Create Your First Quote
              </Button>
            </CardContent>
          </Card>
        ) : (
          quotes.map((quote: Quote) => (
            <Card key={quote.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{quote.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Quote #{quote.quoteNumber} • ₹{(quote.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(quote.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(quote.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedQuote(quote);
                        setShowViewDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExportPDF(quote)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleShareQuote(quote)}
                    >
                      <Share className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedQuote(quote);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the quote and all its items.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(quote.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Quote
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the quote item details' : 'Add a new item to the quote'}
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
              {/* Product Selection Dropdown */}
              <FormField
                control={itemForm.control}
                name="salesProductId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Select Product (Optional)</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleProductSelection(value);
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Choose from product catalog" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesProducts.map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={itemForm.control}
                name="itemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Item Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter item name" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={itemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Item description" className="min-h-[50px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={itemForm.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Size/Dimensions</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 1050 X 600 X 750" className="h-8" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={itemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Qty *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="1" 
                          className="h-8"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="uom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">UOM *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces</SelectItem>
                          <SelectItem value="sqft">Square Feet</SelectItem>
                          <SelectItem value="lm">Linear Meter</SelectItem>
                          <SelectItem value="kg">Kilogram</SelectItem>
                          <SelectItem value="set">Set</SelectItem>
                          <SelectItem value="lot">Lot</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Price *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="0" 
                          className="h-8"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={itemForm.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Discount %</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="0" 
                          className="h-8"
                          min="0"
                          max="100"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="taxPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tax %</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="18" 
                          className="h-8"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update Item" : "Add Item"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Quote Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Quote Details</DialogTitle>
            <DialogDescription>
              Quote information and items
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium">Quote Title</Label>
                  <p className="text-sm">{selectedQuote.title}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Quote Number</Label>
                  <p className="text-sm">{selectedQuote.quoteNumber}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Status</Label>
                  <p className="text-sm">{selectedQuote.status}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Total Amount</Label>
                  <p className="text-sm font-bold">₹{(selectedQuote.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
              
              {selectedQuote.description && (
                <div>
                  <Label className="text-xs font-medium">Description</Label>
                  <p className="text-sm">{selectedQuote.description}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => handleExportPDF(selectedQuote)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => handleShareQuote(selectedQuote)}>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
            <DialogDescription>
              Update quote details and items
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdateQuote)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Quote Title *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter quote title" className="h-8" />
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
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
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
                          <Textarea {...field} placeholder="Quote description" className="min-h-[60px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Items Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Quote Items</h3>
                      <Button type="button" onClick={() => setShowItemDialog(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                      {quoteItems.map((item, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                              <div>
                                <p className="font-medium">{item.itemName}</p>
                                <p className="text-muted-foreground text-xs">{item.description}</p>
                              </div>
                              <div>
                                <p>Size: {item.size || 'N/A'}</p>
                                <p>Qty: {item.quantity} {item.uom}</p>
                              </div>
                              <div>
                                <p>Rate: ₹{item.unitPrice}</p>
                                <p>Discount: {item.discountPercentage}%</p>
                              </div>
                              <div>
                                <p className="font-medium">₹{(item.lineTotal || 0).toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const item = quoteItems[index];
                                  setEditingItem(item);
                                  setEditingItemIndex(index);
                                  itemForm.reset({
                                    itemName: item.itemName,
                                    description: item.description,
                                    quantity: item.quantity,
                                    uom: item.uom,
                                    unitPrice: item.unitPrice,
                                    discountPercentage: item.discountPercentage,
                                    taxPercentage: item.taxPercentage,
                                    size: item.size,
                                    salesProductId: item.salesProductId?.toString() || "",
                                  });
                                  setShowItemDialog(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{(totals.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Discount:</span>
                          <span>₹{(totals.totalDiscount || totals.totalDiscountAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Tax:</span>
                          <span>₹{(totals.totalTax || totals.totalTaxAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base">
                          <span>Grand Total:</span>
                          <span>₹{(totals.grandTotal || totals.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Update Quote
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}