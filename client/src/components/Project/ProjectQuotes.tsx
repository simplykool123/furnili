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
import { QuoteEditor } from "./QuoteEditor";

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
  clientPhone?: string;
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
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | undefined>();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // PDF Generation Function
  const generatePDF = async (quoteId: number) => {
    try {
      // Get the HTML content from the server
      const response = await apiRequest(`/api/quotes/${quoteId}/pdf`);
      
      if (response && response.html) {
        // Create a new window with the HTML content
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(response.html);
          newWindow.document.close();
          
          // Add a small delay then trigger print dialog
          setTimeout(() => {
            newWindow.print();
          }, 500);
          
          toast({
            title: "PDF Ready",
            description: "Quote PDF opened in new window. Use browser's print to save as PDF.",
          });
        }
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // WhatsApp Share Function
  const shareOnWhatsApp = async (quoteId: number, clientPhone?: string) => {
    try {
      // Get quote details for WhatsApp message
      const quoteDetails = await apiRequest(`/api/quotes/${quoteId}/details`);
      
      const message = `Hi! Please find the quote for ${quoteDetails.quote?.title || 'your project'}. 

*Quote Details:*
Quote #: ${quoteDetails.quote?.quoteNumber}
Total Amount: ₹${quoteDetails.quote?.totalAmount?.toLocaleString()}

You can download the PDF from our system or we can email it to you.

Thank you for choosing Furnili!`;
      
      // Format phone number (remove +91 if present, add if not)
      let phoneNumber = clientPhone || '';
      if (phoneNumber.startsWith('+91')) {
        phoneNumber = phoneNumber.substring(3);
      }
      if (phoneNumber && !phoneNumber.startsWith('91')) {
        phoneNumber = '91' + phoneNumber;
      }
      
      // Create WhatsApp URL
      const whatsappUrl = phoneNumber 
        ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "WhatsApp Opened",
        description: "Quote details shared via WhatsApp. Client can request PDF via the system.",
      });
    } catch (error) {
      console.error('WhatsApp share error:', error);
      toast({
        title: "Share Failed",
        description: "Unable to share quote. Please try again.",
        variant: "destructive",
      });
    }
  };

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
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 40px;">Sr. No.</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 120px;">Product </th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">Item Description</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 80px;">Size</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 50px;">Qty</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 60px;">Rate</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 90px;">Total Amount</th>
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
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;">
                    <div style="font-weight: bold; margin-bottom: 3px;">${item.itemName || product.name || "Product"}</div>
                    ${productImageUrl ? `<img src="${productImageUrl}" style="width: 70px; height: 50px; object-fit: cover; border: 1px solid #ccc;" onerror="this.style.display='none'" />` : '<div style="width: 70px; height: 50px; background-color: #f5f5f5; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999;">No Image</div>'}
                  </td>
                  <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;">${item.description || product.description || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${item.size || "-"}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${item.quantity || 0}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;">₹${(item.unitPrice || 0).toFixed(0)}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;">₹${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(0)}</td>
                </tr>
              `;
                })
                .join("")}
              <!-- Blank row to continue table format -->
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; height: 31px;"></td>
                <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;"></td>
              </tr>
            </tbody>
          </table>

          <!-- Unified Totals Table with Professional Layout -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <!-- Total Row with Total in Words -->
            <tr>
              <td style="border: 1px solid #000; border-top: none; padding: 6px 8px; vertical-align: middle; width: calc(100% - 280px); height: 31px;">
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
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; width: 190px; font-size: 11px;">Total</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; width: 90px; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  return itemsTotal.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <!-- Furniture Specifications Row with Other Calculations -->
            <tr>
              <td style="border: 1px solid #000; border-top: none; padding: 6px 8px; vertical-align: middle; width: calc(100% - 280px);" rowspan="4">
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
          <div style="display: flex; align-items: stretch;">
            <!-- Left: Payment Terms - Matches Furniture Specifications Width -->
            <div style="border: 1px solid #000; border-top: none; padding: 4px; flex: 1; border-right: none; display: flex; flex-direction: column; justify-content: center;">
              <div>
                <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 2px 0;">Payment Terms</h3>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">30% Advance Payment: Due upon order confirmation.</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">50% Payment Before Delivery: To be settled prior to dispatch.</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">20% Payment on Delivery</p>
              </div>
            </div>
            
            <!-- Middle: Bank Details - Exactly matches Size + Qty column widths (130px) -->
            <div style="border: 1px solid #000; border-top: none; padding: 4px; width: 130px; border-right: none; display: flex; flex-direction: column; justify-content: center;">
              <div>
                <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 2px 0;">Bank Details</h3>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">A/C Name: Furnili</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">Bank: ICICI Bank</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">Branch: Nigdi</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">A/C No.: 230505006647</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">IFSC: ICIC0002305</p>
              </div>
            </div>
            
            <!-- Right: Authorised Signatory - Matches Rate + Total Amount columns (150px) -->
            <div style="border: 1px solid #000; border-top: none; padding: 4px; width: 150px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <!-- Company stamp at top -->
              <div style="margin-bottom: 4px;">
                <img src="${window.location.origin}/assets/furnili-signature-stamp.png" style="width: 70px; height: auto;" alt="Furnili Signature Stamp" onerror="this.style.display='none'" />
              </div>
              
              <!-- Text without signature line -->
              <div style="text-align: center;">
                <p style="font-size: 9px; margin: 0 0 1px 0; font-weight: bold; line-height: 1.0;">Authorised Signatory</p>
                <p style="font-size: 9px; margin: 0; font-weight: bold; line-height: 1.0;">for FURNILI</p>
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

  // Render QuoteEditor if in editor mode
  if (showQuoteEditor) {
    return (
      <QuoteEditor
        quoteId={editingQuoteId}
        projectId={parseInt(projectId)}
        onSave={() => {
          setShowQuoteEditor(false);
          setEditingQuoteId(undefined);
          refetch(); // Refresh quotes list
        }}
        onCancel={() => {
          setShowQuoteEditor(false);
          setEditingQuoteId(undefined);
        }}
      />
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

        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setEditingQuoteId(undefined);
              setShowQuoteEditor(true);
            }}
            className="w-full sm:w-auto h-8 text-xs"
            variant="default"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Quote (Pro)
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-8 text-xs" variant="outline">
                <Plus className="h-3 w-3 mr-1" />
                Quick Quote
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
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Client *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="Search quotes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8">
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
      <div className="space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No quotes found. Create your first quote to get started.</p>
          </div>
        ) : (
          filteredQuotes.map((quote) => (
            <Card key={quote.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{quote.title}</h3>
                    {getStatusBadge(quote.status)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Quote #{quote.quoteNumber} • {quote.clientName}
                  </p>
                  <p className="text-xs text-gray-600">
                    Total: ₹{quote.totalAmount?.toLocaleString() || "0"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingQuoteId(quote.id);
                      setShowQuoteEditor(true);
                    }}
                    className="h-8 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generatePDF(quote.id)}
                    className="h-8 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => shareOnWhatsApp(quote.id, quote.clientPhone)}
                    className="h-8 text-xs bg-green-50 hover:bg-green-100 text-green-700"
                  >
                    <Share className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
