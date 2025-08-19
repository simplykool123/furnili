import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import { Plus, Search, Filter, Download, Upload, Camera, Eye, Share2, Pencil, Trash2, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet, Calendar } from "lucide-react";
import { ClientFreeOCR } from '@/utils/freeOcr';

interface PettyCashExpense {
  id: number;
  expenseDate: string;
  vendor: string; // This was paidTo in frontend but API returns vendor
  amount: number;
  paymentMode?: string;
  description?: string; // This was note in frontend but API returns description
  category: string;
  receiptImageUrl?: string;
  status: string; // "expense" or "income"
  addedBy: number;
  createdAt: string;
  projectId?: number; // Project ID for expense tracking
  orderNo?: string; // Legacy field for backward compatibility
  user?: { id: number; name: string; email: string; username?: string }; // Add username field
  project?: { id: number; code: string; name: string }; // Project information
}

interface PettyCashStats {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  currentMonthExpenses: number;
}

interface PersonalPettyCashStats {
  myExpenses: number;
  cashGivenToMe: number;
  myBalance: number;
  thisMonth: number;
}

const paymentModes = ["UPI", "GPay", "PhonePe", "Paytm", "Cash", "Bank Transfer", "Card", "Cheque"];
const categories = ["Material", "Transport", "Site", "Office", "Food", "Fuel", "Repair", "Tools", "Other"];

export default function PettyCash() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaidBy, setSelectedPaidBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [showStaffBalances, setShowStaffBalances] = useState(false);
  const [showExpenseDetailsDialog, setShowExpenseDetailsDialog] = useState(false);
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<PettyCashExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<PettyCashExpense | null>(null);
  
  // Mobile optimization hook
  const isMobile = useIsMobile();
  
  // Get current user
  const user = authService.getUser();
  
  // Form state - Updated to match user requirements
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    paidTo: "", // Name of person/vendor
    paidBy: user ? user.id.toString() : "", // Default to current logged-in user
    purpose: "", // Purpose/Description 
    projectId: "", // Project ID for expense tracking
    orderNo: "", // Legacy field for backward compatibility
    receiptImage: null as File | null,
    category: "", // Keep for filtering
  });

  // Add funds form state
  const [fundsFormData, setFundsFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    source: "", // Source of funds
    receivedBy: "", // Staff member who received the funds
    purpose: "", // Purpose/Description 
    receiptImage: null as File | null,
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // Reset form to initial state


  // Reset funds form to initial state
  const resetFundsFormData = () => {
    setFundsFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      source: "",
      receivedBy: "",
      purpose: "",
      receiptImage: null,
    });
  };

  // Edit expense mutation
  const editExpenseMutation = useMutation({
    mutationFn: async ({ id, expenseData }: { id: number, expenseData: FormData }) => {
      const token = authService.getToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch(`/api/petty-cash/${id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: expenseData,
      });
      
      if (!response.ok) throw new Error('Update failed');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setShowEditDialog(false);
      setEditingExpense(null);
      toast({ title: "Success", description: "Expense updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update expense", variant: "destructive" });
    }
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return authenticatedApiRequest("DELETE", `/api/petty-cash/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setExpenseToDelete(null);
      toast({ title: "Success", description: "Expense deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete expense", variant: "destructive" });
    }
  });

  // Handler functions
  const handleShowExpenseDetails = (expense: PettyCashExpense) => {
    setSelectedExpenseDetails(expense);
    setShowExpenseDetailsDialog(true);
  };

  const handleEditExpense = (expense: PettyCashExpense) => {
    setEditingExpense(expense);
    setFormData({
      date: format(new Date(expense.expenseDate), "yyyy-MM-dd"),
      amount: expense.amount.toString(),
      paidTo: expense.vendor || '',
      paidBy: expense.user?.id?.toString() || '',
      purpose: expense.description || '',
      projectId: expense.projectId?.toString() || '', // Use projectId from expense
      orderNo: expense.orderNo || '',
      receiptImage: null,
      category: expense.category
    });
    setShowEditDialog(true);
  };

  const handleDeleteExpense = (expense: PettyCashExpense) => {
    setExpenseToDelete(expense);
  };

  // Fetch expenses and stats - filter by user for staff role
  const { data: expenses = [] } = useQuery({
    queryKey: user?.role === 'staff' ? ["/api/petty-cash", { userId: user.id }] : ["/api/petty-cash"],
    queryFn: () => {
      const url = user?.role === 'staff' ? `/api/petty-cash?userId=${user.id}` : "/api/petty-cash";
      return authenticatedApiRequest("GET", url);
    },
  });

  // Fetch stats - personal for staff, global for others
  const { data: stats } = useQuery({
    queryKey: user?.role === 'staff' ? ["/api/petty-cash/my-stats"] : ["/api/petty-cash/stats"],
    queryFn: () => {
      const endpoint = user?.role === 'staff' ? "/api/petty-cash/my-stats" : "/api/petty-cash/stats";
      return authenticatedApiRequest("GET", endpoint);
    },
  });

  const { data: staffBalances = [] } = useQuery({
    queryKey: ["/api/petty-cash/staff-balances"],
    queryFn: () => authenticatedApiRequest("GET", "/api/petty-cash/staff-balances"),
  });

  // Fetch users for Paid By dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => authenticatedApiRequest("GET", "/api/users"),
  });

  // Fetch projects for Project ID dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => authenticatedApiRequest("GET", "/api/projects"),
  });

  // Create expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: FormData) => {
      // For FormData, we need to handle it specially
      const token = authService.getToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch("/api/petty-cash", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: expenseData, // FormData - don't stringify or set Content-Type
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setShowAddDialog(false);
      resetFormData();
      toast({ title: "Expense added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add expense", variant: "destructive" });
      // console.error("Error adding expense:", error);
    },
  });

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async (fundsData: FormData) => {
      const token = authService.getToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch("/api/petty-cash/funds", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: fundsData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setShowAddFundsDialog(false);
      resetFundsFormData();
      toast({ title: "Funds added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add funds", variant: "destructive" });
      // console.error("Error adding funds:", error);
    },
  });



  // Platform detection for specialized OCR parsing
  const detectPlatformType = (text: string): string => {
    if (text.includes('google pay') || text.includes('gpay')) return 'googlepay';
    if (text.includes('phonepe') || text.includes('phone pe')) return 'phonepe';
    if (text.includes('paytm')) return 'paytm';
    if (text.includes('amazon pay') || text.includes('amazonpay')) return 'amazonpay';
    if (text.includes('bhim upi') || text.includes('bhim')) return 'bhimupi';
    if (text.includes('cred') || text.includes('paid securely by')) return 'cred';
    if (text.includes('bank') || text.includes('neft') || text.includes('rtgs')) return 'bank';
    if (text.includes('cash') || text.includes('receipt')) return 'cash';
    return 'generic';
  };

  // Enhanced amount extraction with platform-specific patterns
  const extractAmountByPlatform = (lines: string[], platform: string): string => {
    console.log('OCR Debug - Platform:', platform);
    console.log('OCR Debug - All lines:', lines);
    
    // For GPay, first look for prominent amounts (usually larger and with currency symbols)
    // Sort lines by potential prominence (currency symbols, larger numbers)
    const sortedLines = [...lines].sort((a, b) => {
      // Prioritize lines with rupee symbols
      const aHasRupee = /₹/.test(a);
      const bHasRupee = /₹/.test(b);
      if (aHasRupee && !bHasRupee) return -1;
      if (bHasRupee && !aHasRupee) return 1;
      
      // Then prioritize lines with larger numbers
      const aNum = (a.match(/\d+/) || ['0'])[0];
      const bNum = (b.match(/\d+/) || ['0'])[0];
      return parseInt(bNum) - parseInt(aNum);
    });
    
    console.log('OCR Debug - Sorted lines:', sortedLines);
    
    for (const line of sortedLines) {
      let amountMatch = null;
      
      switch (platform) {
        case 'googlepay':
          console.log('OCR Debug - Processing GPay line:', line);
          
          // Google Pay: Prioritize rupee symbol amounts first, then contextual amounts
          // Skip amounts that appear to be part of dates (like 25/07/2025)
          if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(line) && // Skip date formats
              !/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line)) { // Skip date formats
            
            // Priority 1: ₹ symbol amounts (most likely transaction amount)
            amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
            console.log('OCR Debug - Priority 1 (₹) match:', amountMatch);
            
            // Priority 2: Context-based amounts with keywords
            if (!amountMatch) {
              amountMatch = line.match(/(?:paid|amount|sent|received)\s*₹?\s?([0-9,]+\.?[0-9]*)/i);
              console.log('OCR Debug - Priority 2 (context) match:', amountMatch);
            }
            
            // Priority 3: Rs format
            if (!amountMatch) {
              amountMatch = line.match(/rs\.?\s?([0-9,]+\.?[0-9]*)/i);
              console.log('OCR Debug - Priority 3 (Rs) match:', amountMatch);
            }
            
            // Priority 4: Standalone large numbers (likely transaction amounts)
            if (!amountMatch && !/^\d{1,2}$/.test(line.trim())) { // Skip small single/double digit numbers
              const standaloneMatch = line.match(/^([0-9,]+\.?[0-9]*)$/);
              if (standaloneMatch) {
                const num = parseFloat(standaloneMatch[1].replace(/,/g, ''));
                if (num >= 50) { // Only accept larger standalone numbers as likely amounts
                  amountMatch = standaloneMatch;
                }
              }
              console.log('OCR Debug - Priority 4 (standalone) match:', amountMatch);
            }
            
            // Priority 5: Any number followed by common currency indicators
            if (!amountMatch) {
              amountMatch = line.match(/([0-9,]+\.?[0-9]*)\s*(?:rupees?|rs\.?|₹)/i);
              console.log('OCR Debug - Priority 5 (currency indicators) match:', amountMatch);
            }
          }
          break;
        case 'phonepe':
          // PhonePe: "₹500 sent", "Amount ₹500"
          amountMatch = line.match(/(?:amount|sent|paid)?\s*₹\s?([0-9,]+\.?[0-9]*)/i);
          break;
        case 'paytm':
          // Paytm: "₹500.00", "Amount: Rs 500"
          amountMatch = line.match(/(?:amount|rs|₹)\s?([0-9,]+\.?[0-9]*)/i);
          break;
        case 'cred':
          // CRED: "₹600", "₹12,000" format - more flexible matching
          amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
          break;
        case 'bank':
          // Bank: "Debited ₹500", "Amount: INR 500"
          amountMatch = line.match(/(?:debited|credited|amount|inr)\s*₹?\s?([0-9,]+\.?[0-9]*)/i);
          break;
        default:
          // Generic patterns - try multiple formats
          amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
          if (!amountMatch) {
            amountMatch = line.match(/rs\.?\s?([0-9,]+\.?[0-9]*)/i);
          }
          if (!amountMatch) {
            // Try standalone number that could be amount
            amountMatch = line.match(/^([0-9,]+\.?[0-9]*)$/);
          }
      }
      
      if (amountMatch) {
        console.log('OCR Debug - Found amount match:', amountMatch);
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        console.log('OCR Debug - Parsed amount:', amount);
        
        // More flexible amount range for GPay - sometimes smaller amounts are valid
        const minAmount = platform === 'googlepay' ? 1 : 10;
        
        // Validate reasonable amount range and exclude transaction IDs/years
        if (amount >= minAmount && amount <= 100000 && // Reasonable transaction amount range
            amount !== 2025 && amount !== 2024 && amount !== 2023 && // Exclude common years
            String(amount).length <= 6) { // Exclude long transaction IDs like 109214778705
          console.log('OCR Debug - Valid amount found:', amountMatch[1]);
          return amountMatch[1].replace(/,/g, '');
        } else {
          console.log('OCR Debug - Amount rejected (out of range or transaction ID):', amount);
        }
      }
    }

    console.log('OCR Debug - No valid amount found in any line');
    
    // Last resort: look for any reasonable numbers that might be amounts
    for (const line of lines) {
      const numbers = line.match(/\b\d{2,5}\b/g); // Look for 2-5 digit numbers
      if (numbers) {
        for (const numStr of numbers) {
          const num = parseInt(numStr);
          if (num >= 10 && num <= 50000 && // Reasonable expense range
              numStr !== '2025' && numStr !== '2024' && numStr !== '2023') {
            console.log('OCR Debug - Found fallback amount:', numStr);
            return numStr;
          }
        }
      }
    }

    return '';
  };

  // Enhanced recipient/vendor name extraction
  const extractRecipientByPlatform = (lines: string[], platform: string): string => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      let recipient = '';
      
      switch (platform) {
        case 'googlepay':
          if (line.includes('to ') && !line.includes('powered')) {
            recipient = lines[i].replace(/.*to\s+/i, '').trim();
          }
          // Also look for uppercase business names
          else if (/^[A-Z][A-Z\s&]+[A-Z]$/.test(lines[i]) && lines[i].length > 3) {
            recipient = lines[i].trim();
          }
          break;
        case 'phonepe':
          if (line.includes('sent to') || line.includes('paid to')) {
            recipient = lines[i].replace(/.*(?:sent to|paid to)\s+/i, '').trim();
          }
          break;
        case 'paytm':
          if (line.includes('paid to') || line.includes('sent to')) {
            recipient = lines[i].replace(/.*(?:paid to|sent to)\s+/i, '').trim();
          }
          break;
        case 'cred':
          // CRED: Look for recipient name (usually largest text after payer info)
          if (!line.includes('paid') && !line.includes('@') && !line.includes('cred') && 
              line.length > 5 && /^[A-Z][a-z\s]+/.test(line)) {
            recipient = line.trim();
          }
          break;
        case 'bank':
          if (line.includes('beneficiary') || line.includes('payee')) {
            recipient = lines[i + 1] || '';
          }
          break;
      }
      
      if (recipient && recipient.length > 2 && recipient.length < 50) {
        return recipient.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      }
    }
    return '';
  };

  // Enhanced date extraction with platform-specific formats
  const extractDateByPlatform = (text: string, platform: string): string => {
    let dateMatch = null;
    
    switch (platform) {
      case 'googlepay':
      case 'phonepe':
        // Format: "15 Aug 2025, 2:30 PM"
        dateMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
        break;
      case 'paytm':
        // Format: "Aug 15, 2025"
        dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})/i);
        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          dateMatch = [null, day, month, year];
        }
        break;
      case 'bank':
        // Format: "15/08/2025" or "15-08-2025"
        dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthName = monthNames[parseInt(month) - 1];
          dateMatch = [null, day, monthName, year];
        }
        break;
      default:
        dateMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
    }
    
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const monthNum = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month?.toLowerCase() || '') + 1;
      if (monthNum > 0) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    return '';
  };

  // Enhanced OCR processing with multi-platform support
  const processImageWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    try {
      console.log('OCR Debug - Using Universal Receipt OCR System');
      
      // Use new Universal Receipt OCR system with comprehensive detection
      const ocrResult = await ClientFreeOCR.processPaymentScreenshot(file);
      
      if (!ocrResult || !ocrResult.text) {
        throw new Error('No text extracted from image');
      }
      
      console.log('OCR Debug - Universal OCR Results:', {
        platform: ocrResult.platform,
        amount: ocrResult.amount,
        description: ocrResult.description,
        recipient: ocrResult.recipient,
        confidence: ocrResult.confidence
      });
      
      const updatedData = { ...formData };
      
      // Use Universal OCR results
      if (ocrResult.amount && parseFloat(ocrResult.amount) > 0) {
        updatedData.amount = ocrResult.amount;
      }
      
      // Use Universal OCR recipient extraction
      if (ocrResult.recipient && ocrResult.recipient.trim().length > 0) {
        updatedData.paidTo = ocrResult.recipient;
      }
      
      // Use Universal OCR date extraction
      if (ocrResult.date) {
        updatedData.date = ocrResult.date;
      }
      
      // Use Universal OCR description extraction
      if (ocrResult.description && ocrResult.description.trim().length > 0) {
        updatedData.purpose = ocrResult.description;
      }
      
      // Fallback date extraction if not provided by Universal OCR
      if (!ocrResult.date) {
        const text = ocrResult.text;
        const dateMatch = text.match(/(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const monthNum = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(month.toUpperCase()) + 1;
          if (monthNum > 0) {
            const formattedDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            updatedData.date = formattedDate;
          }
        }
      }
      
      setFormData(prev => ({ ...updatedData, receiptImage: prev.receiptImage }));
      toast({ 
        title: "Universal OCR extraction completed", 
        description: `Amount: ₹${updatedData.amount}, Purpose: ${updatedData.purpose}` 
      });
      
    } catch (error) {
      console.error('Universal OCR Error:', error);
      toast({ title: "OCR processing failed", description: "Please fill the details manually", variant: "destructive" });
    }
    setIsProcessingOCR(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    console.log('Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    setFormData(prev => ({ ...prev, receiptImage: file }));
    
    // Auto-process with OCR if it's an image
    if (file.type.startsWith('image/')) {
      processImageWithOCR(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      processFile(imageFile);
    } else {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        // Create a new file with proper naming for pasted images
        const timestamp = Date.now();
        const extension = file.type.includes('png') ? '.png' : '.jpg';
        const renamedFile = new File([file], `pasted-receipt-${timestamp}${extension}`, {
          type: file.type,
          lastModified: Date.now(),
        });
        
        console.log('Pasted image details:', {
          originalName: file.name,
          newName: renamedFile.name,
          type: renamedFile.type,
          size: renamedFile.size
        });
        
        processFile(renamedFile);
        toast({ title: "Image pasted", description: "Processing with OCR...", });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('expenseDate', formData.date);
    formDataToSend.append('vendor', formData.paidTo);
    formDataToSend.append('amount', formData.amount);
    formDataToSend.append('paidBy', formData.paidBy);
    formDataToSend.append('description', formData.purpose);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('projectId', formData.projectId);
    formDataToSend.append('orderNo', formData.orderNo);
    
    if (formData.receiptImage) {
      formDataToSend.append('receipt', formData.receiptImage);
    }
    
    addExpenseMutation.mutate(formDataToSend);
  };

  // Filtering logic
  const filteredExpenses = expenses?.filter((expense) => {
    const matchesSearch = expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.paidBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All Categories' || expense.category === selectedCategory;
    const matchesPaidBy = selectedPaidBy === 'All Staff' || expense.paidBy === selectedPaidBy;
    
    if (dateFilter !== 'All Time') {
      const expenseDate = new Date(expense.expenseDate);
      const today = new Date();
      
      switch (dateFilter) {
        case 'Today':
          return matchesSearch && matchesCategory && matchesPaidBy && 
                 expenseDate.toDateString() === today.toDateString();
        case 'This Week':
          const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
          return matchesSearch && matchesCategory && matchesPaidBy && expenseDate >= weekStart;
        case 'This Month':
          return matchesSearch && matchesCategory && matchesPaidBy &&
                 expenseDate.getMonth() === today.getMonth() && 
                 expenseDate.getFullYear() === today.getFullYear();
        default:
          return matchesSearch && matchesCategory && matchesPaidBy;
      }
    }
    
    return matchesSearch && matchesCategory && matchesPaidBy;
  }) || [];

  // Get unique categories and staff for filter dropdowns
  const categories = Array.from(new Set(expenses?.map(e => e.category).filter(Boolean))) || [];
  const staffMembers = Array.from(new Set(expenses?.map(e => e.paidBy).filter(Boolean))) || [];

  const resetFormData = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      paidTo: '',
      paidBy: users[0]?.username || '',
      purpose: '',
      projectId: '',
      orderNo: '',
      receiptImage: null,
      category: '',
    });
  };

  return (
    <FurniliLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Petty Cash Management</h1>
            <p className="text-sm text-gray-600 mt-1">Track expenses and manage cash flow</p>
          </div>
          
          <div className="flex gap-3">
            <FurniliButton
              onClick={() => setShowAddFundsDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Funds
            </FurniliButton>
            <FurniliButton
              onClick={() => {
                resetFormData();
                setShowAddExpenseDialog(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </FurniliButton>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FurniliCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">₹{stats.totalIncome?.toLocaleString() || '0'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </FurniliCard>

            <FurniliCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">₹{stats.totalExpenses?.toLocaleString() || '0'}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </FurniliCard>

            <FurniliCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Balance</p>
                  <p className={`text-2xl font-bold ${(stats.totalIncome || 0) - (stats.totalExpenses || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{((stats.totalIncome || 0) - (stats.totalExpenses || 0)).toLocaleString()}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
            </FurniliCard>
          </div>
        )}

        {/* Filters and Search */}
        <FurniliCard className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Categories">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPaidBy} onValueChange={setSelectedPaidBy}>
              <SelectTrigger>
                <SelectValue placeholder="Staff Member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Staff">All Staff</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Time">All Time</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FurniliCard>

        {/* Expenses List */}
        <FurniliCard className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <div className="text-sm text-gray-600">
                Showing {filteredExpenses.length} of {expenses?.length || 0} transactions
              </div>
            </div>

            {isExpensesLoading ? (
              <div className="text-center py-8">Loading expenses...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No expenses found</div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${expense.status === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {expense.status === 'income' ? (
                          <TrendingUp className={`h-5 w-5 ${expense.status === 'income' ? 'text-green-600' : 'text-red-600'}`} />
                        ) : (
                          <TrendingDown className={`h-5 w-5 ${expense.status === 'income' ? 'text-green-600' : 'text-red-600'}`} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{expense.vendor}</div>
                        <div className="text-sm text-gray-600">{expense.description || 'No description'}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(expense.expenseDate), 'dd/MM/yyyy')} • {expense.paidBy}
                          {expense.category && ` • ${expense.category}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`text-lg font-semibold ${expense.status === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {expense.status === 'income' ? '+' : ''}₹{expense.amount.toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedExpenseDetails(expense);
                            setShowExpenseDetailsDialog(true);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {expense.receiptImageUrl && (
                          <button
                            onClick={() => {
                              setSelectedImage(expense.receiptImageUrl || "");
                              setShowImageDialog(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Receipt"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpenseToDelete(expense)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FurniliCard>

        {/* Add Expense Dialog */}
        <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Record a new petty cash expense with receipt details</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="amount" className="text-xs">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="h-8"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date" className="text-xs">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="h-8"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="paidTo" className="text-xs">Paid To *</Label>
                  <Input
                    id="paidTo"
                    type="text"
                    value={formData.paidTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                    placeholder="Vendor/Supplier name"
                    className="h-8"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paidBy" className="text-xs">Paid By *</Label>
                  <Select value={formData.paidBy} onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="purpose" className="text-xs">Purpose / Description *</Label>
                <textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="What was this expense for?"
                  className="w-full min-h-[60px] p-2 border rounded-md resize-none text-sm"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="projectId" className="text-xs">Project ID *</Label>
                  <Select value={formData.projectId} onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.code} - {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Materials">Materials</SelectItem>
                      <SelectItem value="Food">Food & Beverages</SelectItem>
                      <SelectItem value="Office">Office Supplies</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Proof Attachment (GPay, CRED, Invoice, etc.)</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  {formData.receiptImage ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Upload className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        {formData.receiptImage.name}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-600">
                        <input
                          type="file"
                          id="receipt-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        <label
                          htmlFor="receipt-upload"
                          className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                        >
                          Upload UPI payment screenshot for automatic data extraction (GPay, PhonePe, CRED)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                {isProcessingOCR && (
                  <div className="text-center py-2">
                    <div className="inline-flex items-center space-x-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Processing image with OCR...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddExpenseDialog(false)}
                  disabled={addExpenseMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addExpenseMutation.isPending || !formData.amount || !formData.paidTo || !formData.purpose}
                  className="bg-primary hover:bg-primary/90"
                >
                  {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Funds Dialog */}
        <Dialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funds to Petty Cash</DialogTitle>
              <DialogDescription>Record incoming funds to the petty cash</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleFundsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="funds-amount">Amount (₹) *</Label>
                  <Input
                    id="funds-amount"
                    type="number"
                    step="0.01"
                    value={fundsFormData.amount}
                    onChange={(e) => setFundsFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="funds-date">Date *</Label>
                  <Input
                    id="funds-date"
                    type="date"
                    value={fundsFormData.date}
                    onChange={(e) => setFundsFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="funds-source">Source *</Label>
                <Input
                  id="funds-source"
                  type="text"
                  value={fundsFormData.source}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="e.g., Bank transfer, Cash from office"
                  required
                />
              </div>

              <div>
                <Label htmlFor="funds-purpose">Purpose</Label>
                <Input
                  id="funds-purpose"
                  type="text"
                  value={fundsFormData.purpose}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Reason for adding funds"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddFundsDialog(false)}
                  disabled={addFundsMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addFundsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {addFundsMutation.isPending ? "Adding..." : "Add Funds"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Receipt Image</DialogTitle>
            </DialogHeader>
            {selectedImage && (
              <div className="flex justify-center">
                <img 
                  src={selectedImage} 
                  alt="Receipt" 
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Expense Details Dialog */}
        <Dialog open={showExpenseDetailsDialog} onOpenChange={setShowExpenseDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
            </DialogHeader>
            {selectedExpenseDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      {selectedExpenseDetails.status === 'income' ? 'Source' : 'Vendor'}
                    </div>
                    <div className="text-sm">{selectedExpenseDetails.vendor}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Amount</div>
                    <div className={`text-sm font-bold ${
                      selectedExpenseDetails.status === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedExpenseDetails.status === 'income' ? '+' : ''}₹{selectedExpenseDetails.amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Date</div>
                    <div className="text-sm">{format(new Date(selectedExpenseDetails.expenseDate), 'dd/MM/yyyy')}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Project</div>
                    <div className="text-sm">
                      {selectedExpenseDetails.projectId && selectedExpenseDetails.project ? 
                        `${selectedExpenseDetails.project.code} - ${selectedExpenseDetails.project.name}` : 
                        selectedExpenseDetails.projectId ? selectedExpenseDetails.projectId : '-'
                      }
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {selectedExpenseDetails.status === 'income' ? 'Purpose' : 'Description'}
                  </div>
                  <div className="text-sm">{selectedExpenseDetails.description || '-'}</div>
                </div>

                {selectedExpenseDetails.receiptImageUrl && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Receipt</div>
                    <div className="flex justify-center">
                      <img 
                        src={selectedExpenseDetails.receiptImageUrl}
                        alt="Receipt" 
                        className="max-w-full max-h-[200px] object-contain rounded-lg border cursor-pointer"
                        onClick={() => {
                          setSelectedImage(selectedExpenseDetails.receiptImageUrl || "");
                          setShowImageDialog(true);
                          setShowExpenseDetailsDialog(false);
                        }}
                        title="Click to view full size"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
              <br />
              <strong>Amount:</strong> ₹{expenseToDelete?.amount}
              <br />
              <strong>Vendor:</strong> {expenseToDelete?.vendor}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => expenseToDelete && deleteExpenseMutation.mutate(expenseToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </FurniliLayout>
  );
}
