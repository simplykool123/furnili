import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Edit, Trash2, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  size?: string; // Add size field for quote items
}

interface QuoteFormData {
  clientId: number;
  title: string;
  description?: string;
  validUntil?: string;
  expirationDate?: string;
  paymentTerms: string;
  pricelist: string;
  status?: string; // Add status field
  terms?: string;
  notes?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
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
  status: z.string().optional(),
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
  salesProductId: z.number().optional(),
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
  const {
    data: quotes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/quotes", "project", projectId, searchTerm, statusFilter],
    queryFn: () =>
      apiRequest(
        `/api/quotes?projectId=${projectId}&search=${searchTerm}&status=${statusFilter}`,
      ),
  });

  // Fetch project client data
  const { data: projectData } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: () => apiRequest(`/api/projects/${projectId}`),
  });

  // Fetch sales products for items
  const { data: salesProducts = [] } = useQuery({
    queryKey: ["/api/quotes/products/list"],
    queryFn: () => apiRequest("/api/quotes/products/list"),
  });

  // Create quote mutation
  const createMutation = useMutation({
    mutationFn: (data: QuoteFormData & { items: QuoteItem[] }) =>
      apiRequest("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          projectId: parseInt(projectId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setShowCreateDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update quote mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: QuoteFormData & { items: QuoteItem[] };
    }) =>
      apiRequest(`/api/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          projectId: parseInt(projectId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setShowEditDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete quote mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/quotes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setShowDeleteDialog(false);
      setSelectedQuote(null);
      toast({ title: "Quote deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting quote",
        description: error.message,
        variant: "destructive",
      });
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
      size: "",
      salesProductId: 0,
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

  // Handle product selection from dropdown
  const handleProductSelection = (productId: string) => {
    if (!productId) return;

    const selectedProduct = salesProducts.find(
      (p: any) => p.id.toString() === productId,
    );
    if (selectedProduct) {
      // Auto-populate product details
      itemForm.setValue("itemName", selectedProduct.name);
      itemForm.setValue(
        "description",
        selectedProduct.description ||
          selectedProduct.specifications ||
          `${selectedProduct.name} - Premium quality furniture product`,
      );
      itemForm.setValue("unitPrice", selectedProduct.unitPrice || 0);
      itemForm.setValue("uom", selectedProduct.unit || "pcs");

      // Set default quantity to 1 if not already set
      if (!itemForm.watch("quantity")) {
        itemForm.setValue("quantity", 1);
      }
    }
  };

  // Add item to quote
  const handleSaveItem = (data: any) => {
    const newItem: QuoteItem = {
      ...data,
      discountAmount:
        (data.quantity * data.unitPrice * data.discountPercentage) / 100,
      taxAmount:
        ((data.quantity * data.unitPrice -
          (data.quantity * data.unitPrice * data.discountPercentage) / 100) *
          data.taxPercentage) /
        100,
      lineTotal: 0,
    };
    newItem.lineTotal = calculateLineTotal(newItem);

    if (editingItem) {
      // Update existing item
      const itemIndex = quoteItems.findIndex((item, index) =>
        editingItem.id
          ? item.id === editingItem.id
          : index === quoteItems.indexOf(editingItem),
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

  // Calculate quote totals
  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    const totalDiscountAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.discountAmount || 0);
    }, 0);

    const totalTaxAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.taxAmount || 0);
    }, 0);

    const total = quoteItems.reduce(
      (sum, item) => sum + (item.lineTotal || 0),
      0,
    );

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
      // Fetch complete quote details including client and items
      const quoteDetailsResponse = await apiRequest(
        `/api/quotes/${quote.id}/details`,
      );

      // Extract client data from the quote details response
      const client = quoteDetailsResponse.client || {
        name: "Client Name",
        address: "Client Address",
      };
      const items = quoteDetailsResponse.items || [];

      console.log("Quote Details:", quoteDetailsResponse);
      console.log("Client Data:", client);
      console.log("Items Data:", items);

      // Create professional PDF content matching Furnili format
      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 15px;">
          <!-- Header with Logo Only -->
          <div style="display: flex; justify-content: flex-start; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
            <img src="${window.location.origin}/assets/furnili-logo.png" style="height: 45px;" alt="Furnili Logo" />
          </div>

          <!-- Quotation Title -->
          <div style="text-align: center; margin: 12px 0;">
            <h2 style="font-size: 20px; font-weight: bold; margin: 0; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 3px;">Quotation</h2>
          </div>

          <!-- Client and Quote Details -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <div style="width: 60%;">
              <p style="margin: 0; line-height: 1.3;"><strong>To,</strong></p>
              <p style="margin: 0; font-weight: bold; line-height: 1.3;">${client.name || "Client Name"}</p>
              <p style="margin: 0; line-height: 1.3;">${client.email || ""}</p>
              <p style="margin: 0; line-height: 1.3;">${client.mobile || ""}</p>
              <p style="margin: 0; line-height: 1.3;">${client.city || "Address"}</p>
            </div>
            <div style="width: 35%; text-align: right;">
              <p style="margin: 0; line-height: 1.3;"><strong>Date :-</strong> ${new Date(quote.createdAt).toLocaleDateString("en-GB")}</p>
              <p style="margin: 0; line-height: 1.3;"><strong>Est. No. :-</strong> ${quote.quoteNumber}</p>
              <p style="margin: 0; line-height: 1.3;"><strong>GSTN :-</strong> 27AAKFF2192A1ZO</p>
              <p style="margin: 0; line-height: 1.3;"><strong>PAN :-</strong> AAKFF2192A</p>
              <p style="margin: 0; line-height: 1.3;"><strong>Contact Person :-</strong> ${client.name}</p>
            </div>
          </div>

          <!-- Subject Line -->
          <div style="margin: 10px 0; display: flex; justify-content: center;">
            <div style="width: 75%; padding: 6px 0; border-bottom: 1px solid #000;">
              <p style="font-size: 12px; margin: 0; font-weight: bold;">Subject: ${quote.title || "Furniture Quotation"}</p>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0px; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 40px;">Sr. No.</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 120px;">Product </th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center;">Item Description</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 80px;">Size</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 50px;">Qty</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 60px;">Rate</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 90px;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((itemData: any, index: number) => {
                  const item = itemData.item || itemData; // Handle both nested and flat structures
                  const product = itemData.salesProduct || {};
                  const productImageUrl =
                    product.imageUrl && product.imageUrl.startsWith("/")
                      ? `${window.location.origin}${product.imageUrl}`
                      : product.imageUrl;

                  return `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 4px; vertical-align: top;">
                    <div style="font-weight: bold; margin-bottom: 3px;">${item.itemName || product.name || "Product"}</div>
                    ${productImageUrl ? `<img src="${productImageUrl}" style="width: 70px; height: 50px; object-fit: cover; border: 1px solid #ccc;" onerror="this.style.display='none'" />` : '<div style="width: 70px; height: 50px; background-color: #f5f5f5; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999;">No Image</div>'}
                  </td>
                  <td style="border: 1px solid #000; padding: 4px; vertical-align: top;">${item.description || product.description || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">${item.size || "-"}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top;">${item.quantity || 0}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: top;">₹${(item.unitPrice || 0).toFixed(0)}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: top;">₹${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(0)}</td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>

          <!-- Unified Totals Table with Professional Layout -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 0px;">
            <!-- Total Row with Total in Words -->
            <tr>
              <td style="border: 2px solid #000; padding: 6px 8px; vertical-align: middle; width: calc(100% - 280px); height: 31px;">
                <div style="display: flex; align-items: center; height: 100%; justify-content: flex-start;">
                  <span style="font-size: 12px; font-weight: bold;">Total in Words: </span>
                  <span style="font-size: 11px; font-style: italic; margin-left: 4px; font-weight: bold;">
                  ${(() => {
                    // Calculate grand total for words conversion
                    const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                    const packagingAmount = Math.round(itemsTotal * 0.02);
                    const transportationAmount = 5000;
                    const gstAmount = Math.round(itemsTotal * 0.18);
                    const grandTotal = itemsTotal + packagingAmount + transportationAmount + gstAmount;
                    
                    // Comprehensive number to words conversion
                    function numberToWords(num) {
                      if (num === 0) return 'Zero';
                      
                      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
                      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
                      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                      
                      function convertHundreds(n) {
                        let result = '';
                        if (n >= 100) {
                          result += ones[Math.floor(n / 100)] + ' Hundred';
                          n %= 100;
                          if (n > 0) result += ' ';
                        }
                        if (n >= 20) {
                          result += tens[Math.floor(n / 10)];
                          n %= 10;
                          if (n > 0) result += '-' + ones[n];
                        } else if (n >= 10) {
                          result += teens[n - 10];
                        } else if (n > 0) {
                          result += ones[n];
                        }
                        return result;
                      }
                      
                      let result = '';
                      
                      // Handle crores (10,000,000s)
                      if (num >= 10000000) {
                        result += convertHundreds(Math.floor(num / 10000000)) + ' Crore';
                        num %= 10000000;
                        if (num > 0) result += ' ';
                      }
                      
                      // Handle lakhs (100,000s)
                      if (num >= 100000) {
                        result += convertHundreds(Math.floor(num / 100000)) + ' Lakh';
                        num %= 100000;
                        if (num > 0) result += ' ';
                      }
                      
                      // Handle thousands
                      if (num >= 1000) {
                        result += convertHundreds(Math.floor(num / 1000)) + ' Thousand';
                        num %= 1000;
                        if (num > 0) result += ' ';
                      }
                      
                      // Handle remaining hundreds
                      if (num > 0) {
                        result += convertHundreds(num);
                      }
                      
                      return result.trim();
                    }
                    
                    const wordsAmount = numberToWords(grandTotal);
                    return wordsAmount + ' Rupees Only';
                  })()}
                  </span>
                </div>
              </td>
              <td style="border: 1px solid #000; border-left: none; padding: 6px 8px; text-align: right; vertical-align: middle; width: 190px; font-size: 11px;">Total</td>
              <td style="border: 1px solid #000; border-left: none; padding: 6px 8px; text-align: right; vertical-align: middle; width: 90px; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  return itemsTotal.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <!-- Furniture Specifications Row with Other Calculations -->
            <tr>
              <td style="border: 1px solid #000; border-top: none; padding: 6px 8px; vertical-align: top; width: calc(100% - 280px);" rowspan="4">
                <h3 style="font-size: 12px; font-weight: bold; margin: 0 0 6px 0;">Furniture Specifications</h3>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- All furniture will be manufactured using Said Materials</p>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- All hardware considered of standard make.</p>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- Standard laminates considered as per selection.</p>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- Any modifications or changes in material selection may result in additional charges.</p>
              </td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">Packaging @ 2%</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  const packagingAmount = Math.round(itemsTotal * 0.02);
                  return packagingAmount.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <tr>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">Transportation</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">₹5,000</td>
            </tr>
            
            <tr>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">GST @ 18%</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  const gstAmount = Math.round(itemsTotal * 0.18);
                  return gstAmount.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <tr style="font-weight: bold;">
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; background-color: #f0f0f0; font-size: 11px; font-weight: bold;">Grand Total</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; background-color: #f0f0f0; font-size: 11px; font-weight: bold;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  const packagingAmount = Math.round(itemsTotal * 0.02);
                  const transportationAmount = 5000;
                  const gstAmount = Math.round(itemsTotal * 0.18);
                  const grandTotal = itemsTotal + packagingAmount + transportationAmount + gstAmount;
                  return grandTotal.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
          </table>

          <!-- Bottom Section: 3-Part Layout with Borders - Aligned with Table Columns -->
          <div style="margin-top: 0px; display: flex; align-items: stretch;">
            <!-- Left: Payment Terms - Matches Furniture Specifications Width -->
            <div style="border: 1px solid #000; border-top: none; padding: 6px; flex: 1; border-right: none;">
              <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0;">Payment Terms</h3>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">30% Advance Payment: Due upon order confirmation.</p>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">50% Payment Before Delivery: To be settled prior to dispatch.</p>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">20% Payment on Delivery</p>
            </div>
            
            <!-- Middle: Bank Details - Exactly matches Size + Qty column widths (130px) -->
            <div style="border: 1px solid #000; border-top: none; padding: 6px; width: 130px; border-right: none;">
              <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0;">Bank Details</h3>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">A/C Name: Furnili</p>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">Bank: ICICI Bank</p>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">Branch: Nigdi</p>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">A/C No.: 230505006647</p>
              <p style="font-size: 9px; margin: 1px 0; line-height: 1.2;">IFSC: ICIC0002305</p>
            </div>
            
            <!-- Right: Authorised Signatory - Matches Rate + Total Amount columns (150px) -->
            <div style="border: 1px solid #000; border-top: none; padding: 6px; width: 150px; display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
              <div style="text-align: center;">
                <p style="font-size: 10px; margin: 0; font-weight: bold;">Authorised Signatory</p>
                <p style="font-size: 10px; margin: 0; font-weight: bold;">for FURNILI</p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; margin: 8px 0;">
                <img src="${window.location.origin}/assets/furnili-signature-stamp.png" style="height: 35px; width: auto; margin-bottom: 5px;" alt="Furnili Signature Stamp" onerror="this.style.display='none'" />
                <div style="height: 20px; width: 120px; border-bottom: 1px solid #000;"></div>
              </div>
            </div>
          </div>

          <!-- Black Footer -->
          <div style="background-color: #000; color: white; padding: 8px; margin-top: 0px; text-align: center;">
            <h3 style="margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 1px; color: white;">Furnili - Bespoke Modular Furniture</h3>
            <p style="margin: 4px 0 0 0; font-size: 10px;">Sr.no - 31/1, Pisoli Road, Near Mohan Marbel, Pisoli,, Pune - 411048</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold;">+91 9823 011 223 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; info@furnili.com</p>
          </div>
        </div>
      `;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${quote.quoteNumber}_Furnili_Quote.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };

      // Import html2pdf dynamically
      const { default: html2pdf } = await import("html2pdf.js");
      html2pdf().set(opt).from(element).save();

      toast({
        title: "Professional PDF Generated",
        description: "Furnili branded quote PDF downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
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
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `Quote ${quote.quoteNumber}: ${quote.title}\nAmount: ₹${quote.totalAmount.toFixed(2)}\nStatus: ${quote.status}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to Clipboard",
          description: "Quote details copied to clipboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleSubmit = (data: QuoteFormData) => {
    if (quoteItems.length === 0) {
      toast({
        title: "Please add at least one item to the quote",
        variant: "destructive",
      });
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
    form.setValue("title", quote.title);
    form.setValue("description", quote.description || "");
    form.setValue("status", quote.status);

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
      console.error("Error fetching quote items:", error);
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
        items: quoteItems,
      };

      await apiRequest(`/api/quotes/${selectedQuote.id}`, {
        method: "PUT",
        body: JSON.stringify(quoteData),
      });

      // Invalidate and refetch quotes
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });

      toast({
        title: "Quote Updated",
        description: "Quote has been updated successfully.",
      });

      setShowEditDialog(false);
      setQuoteItems([]);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
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

  // Filter quotes based on search and status
  const filteredQuotes = (quotes || [])
    .filter((quote: Quote) => {
      const matchesSearch =
        searchTerm === "" ||
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.description &&
          quote.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort(
      (a: Quote, b: Quote) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile-Optimized Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Quotes</h2>
          <p className="text-sm text-muted-foreground">
            Manage quotes for this project
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              New Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
              <DialogDescription>
                Create a new quote for this project
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Quote Title *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter quote title"
                            className="h-8"
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
                        <FormLabel className="text-xs">
                          Payment Terms *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Immediate Payment">
                              Immediate Payment
                            </SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="50% Advance, 50% on Completion">
                              50% Advance, 50% on Completion
                            </SelectItem>
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
                        <Textarea
                          {...field}
                          placeholder="Quote description"
                          className="min-h-[60px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quote Items Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Quote Items</h3>

                  {/* Simple Inline Product Addition */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                      {/* Product Selection */}
                      <div className="sm:col-span-2">
                        <Label className="text-xs font-medium">
                          Product Name
                        </Label>
                        <Select
                          onValueChange={(value) => {
                            const selectedProduct = salesProducts.find(
                              (p: any) => p.id.toString() === value,
                            );
                            if (selectedProduct) {
                              itemForm.setValue(
                                "salesProductId",
                                selectedProduct.id,
                              );
                              itemForm.setValue(
                                "itemName",
                                selectedProduct.name,
                              );
                              itemForm.setValue(
                                "description",
                                selectedProduct.description ||
                                  selectedProduct.specifications ||
                                  `${selectedProduct.name} - Premium quality`,
                              );
                              itemForm.setValue(
                                "unitPrice",
                                selectedProduct.unitPrice || 0,
                              );
                              itemForm.setValue(
                                "uom",
                                selectedProduct.unit || "pcs",
                              );
                              itemForm.setValue("quantity", 1);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesProducts.map((product: any) => (
                              <SelectItem
                                key={product.id}
                                value={product.id.toString()}
                              >
                                {product.name} - ₹{product.unitPrice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label className="text-xs font-medium">Qty</Label>
                        <Input
                          type="number"
                          placeholder="1"
                          className="h-8"
                          value={itemForm.watch("quantity") || ""}
                          onChange={(e) =>
                            itemForm.setValue(
                              "quantity",
                              parseFloat(e.target.value) || 1,
                            )
                          }
                        />
                      </div>

                      {/* Rate */}
                      <div>
                        <Label className="text-xs font-medium">Rate</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8"
                          value={itemForm.watch("unitPrice") || ""}
                          onChange={(e) =>
                            itemForm.setValue(
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>

                      {/* Add Button */}
                      <div>
                        <Button
                          type="button"
                          onClick={() => {
                            const formData = itemForm.getValues();
                            if (
                              formData.itemName &&
                              formData.quantity &&
                              formData.unitPrice
                            ) {
                              handleSaveItem(formData);
                              itemForm.reset({
                                itemName: "",
                                description: "",
                                quantity: 1,
                                uom: "pcs",
                                unitPrice: 0,
                                discountPercentage: 0,
                                taxPercentage: 18,
                                size: "",
                                salesProductId: 0,
                              });
                            }
                          }}
                          className="h-8 bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Auto-populated Description */}
                    {itemForm.watch("description") && (
                      <div className="mt-3 pt-3 border-t">
                        <Label className="text-xs font-medium text-green-700">
                          Auto-filled Description:
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">
                          {itemForm.watch("description")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  {quoteItems.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                      {quoteItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-start p-2 border rounded"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {item.itemName}
                            </div>
                            <div className="text-xs text-gray-600">
                              {item.quantity} {item.uom} × ₹{item.unitPrice} = ₹
                              {item.lineTotal.toFixed(2)}
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
                          <span>
                            -₹{(totals.totalDiscountAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax:</span>
                          <span>
                            ₹{(totals.totalTaxAmount || 0).toFixed(2)}
                          </span>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
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

      {/* Quote Statistics Summary */}
      {quotes && quotes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">{quotes.length}</div>
              <div className="text-xs text-muted-foreground">Total Quotes</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {quotes.filter((q: Quote) => q.status === "approved").length}
              </div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {quotes.filter((q: Quote) => q.status === "sent").length}
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">
                ₹
                {quotes
                  .reduce(
                    (sum: number, q: Quote) => sum + (q.totalAmount || 0),
                    0,
                  )
                  .toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Value</div>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile-Optimized Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search quotes by title or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
            <SelectValue placeholder="Status" />
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
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No quotes found for this project.
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Create Your First Quote
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map((quote: Quote) => (
            <Card key={quote.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base leading-tight">
                      {quote.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      #{quote.quoteNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(quote.status)}
                    <span className="text-sm font-medium">
                      ₹{(quote.totalAmount || 0).toFixed(0)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-start sm:items-center">
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(quote.createdAt).toLocaleDateString()}
                  </div>

                  {/* Mobile-Optimized Actions */}
                  <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedQuote(quote);
                        setShowViewDialog(true);
                      }}
                      className="flex-1 sm:flex-none h-7 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(quote)}
                      className="flex-1 sm:flex-none h-7 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareQuote(quote)}
                      className="flex-1 sm:flex-none h-7 text-xs"
                    >
                      <Share className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedQuote(quote);
                        const quoteItems = (quote as any).items || [];
                        setQuoteItems(quoteItems);
                        form.reset({
                          title: quote.title,
                          description: quote.description || "",
                          paymentTerms: quote.paymentTerms || "Net 30",
                          pricelist: quote.pricelist || "Standard",
                          discountType: "percentage",
                          discountValue: 0,
                          terms: quote.terms || "",
                          notes: quote.notes || "",
                          status: quote.status || "draft",
                        });
                        setShowEditDialog(true);
                      }}
                      className="flex-1 sm:flex-none h-7 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-7">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you Freaking Sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the quote and all its items.
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

      {/* Quote Management Dialogs */}

      {/* View Quote Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Quote Details</DialogTitle>
            <DialogDescription>Quote information and items</DialogDescription>
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
                  <p className="text-sm font-bold">
                    ₹{(selectedQuote.totalAmount || 0).toFixed(2)}
                  </p>
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
                <Button
                  variant="outline"
                  onClick={() => handleShareQuote(selectedQuote)}
                >
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
                <form
                  onSubmit={form.handleSubmit(handleUpdateQuote)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Quote Title *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter quote title"
                              className="h-8"
                            />
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
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
                          <Textarea
                            {...field}
                            placeholder="Quote description"
                            className="min-h-[60px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Quote</Button>
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
