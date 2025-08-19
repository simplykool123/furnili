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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import { Plus, Search, Filter, Download, Upload, Camera, Eye, Share2, Pencil, Trash2, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet, Calendar } from "lucide-react";
import Tesseract from 'tesseract.js';

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
      resetForm();
      toast({ title: "Expense added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add expense", variant: "destructive" });
      console.error("Error adding expense:", error);
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
      resetFundsForm();
      toast({ title: "Funds added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add funds", variant: "destructive" });
      console.error("Error adding funds:", error);
    },
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      paidTo: "",
      paidBy: user ? user.id.toString() : "", // Always default to current user
      purpose: "",
      projectId: "",
      orderNo: "",
      receiptImage: null,
      category: "",
    });
  };

  const resetFundsForm = () => {
    setFundsFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      source: "",
      receivedBy: user ? user.id.toString() : "", // Default to current user
      purpose: "",
      receiptImage: null,
    });
  };

  // Platform detection for specialized OCR parsing
  const detectPlatformType = (text: string): string => {
    // CRED detection should come first and be more specific
    if (text.includes('cred') || text.includes('paid securely by') || text.includes('powered by lif')) return 'cred';
    if (text.includes('google pay') || text.includes('gpay')) return 'googlepay';
    if (text.includes('phonepe') || text.includes('phone pe')) return 'phonepe';
    if (text.includes('paytm')) return 'paytm';
    if (text.includes('amazon pay') || text.includes('amazonpay')) return 'amazonpay';
    if (text.includes('bhim upi') || text.includes('bhim')) return 'bhimupi';
    if (text.includes('bank') || text.includes('neft') || text.includes('rtgs')) return 'bank';
    if (text.includes('cash') || text.includes('receipt')) return 'cash';
    return 'generic';
  };

  // Enhanced amount extraction with platform-specific patterns
  const extractAmountByPlatform = (lines: string[], platform: string): string => {
    for (const line of lines) {
      let amountMatch = null;
      
      switch (platform) {
        case 'googlepay':
          // Google Pay: "₹500", "Amount: ₹500", "Paid ₹500", "Rs 500", "Rs. 500", standalone numbers
          amountMatch = line.match(/(?:paid|amount|rs\.?|₹)?\s*₹?\s?([0-9,]+\.?[0-9]*)/i);
          // Also try to match standalone currency amounts
          if (!amountMatch) {
            amountMatch = line.match(/^₹?\s?([0-9,]+\.?[0-9]*)$/);
          }
          // Try Rs format commonly used in Google Pay
          if (!amountMatch) {
            amountMatch = line.match(/rs\.?\s?([0-9,]+\.?[0-9]*)/i);
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
          // CRED: Enhanced pattern matching with robust regex fallback
          // Sometimes OCR doesn't capture the ₹ symbol clearly (shows as ¥ or missing)
          amountMatch = line.match(/[₹¥]\s?([0-9,]+\.?[0-9]*)/);
          if (!amountMatch) {
            // Robust fallback pattern: Rs, INR, or standalone amounts with optional /-
            amountMatch = line.match(/(?:Rs\.?|INR)?\s?(\d{2,6})(?:\/-)?/i);
          }
          if (!amountMatch) {
            // Try standalone number that could be amount (600, 12000, etc.)
            amountMatch = line.match(/^([0-9,]+\.?[0-9]*)$/);
          }
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
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        // Validate reasonable amount range
        if (amount >= 1 && amount <= 100000) {
          return amountMatch[1].replace(/,/g, '');
        }
      }
    }
    return '';
  };

  // Clean recipient name from OCR artifacts
  const cleanRecipient = (line: string): string => {
    return line
      .replace(/\.\.\.$/, "")  // Remove trailing triple dots
      .replace(/\.+$/, "")     // Remove any trailing dots
      .replace(/[^a-zA-Z0-9\s&]/g, '') // Remove special chars but keep &
      .trim();
  };

  // Extract amount using robust regex pattern
  const extractAmount = (text: string): string | null => {
    const regex = /(?:₹|Rs\.?|INR|¥)?\s?(\d{2,6})(?:\/-)?/i;
    const match = text.match(regex);
    if (match && match[1]) {
      const amount = parseInt(match[1]);
      // Validate reasonable expense range
      if (amount >= 50 && amount <= 50000) {
        return match[1];
      }
    }
    return null;
  };

  // Smart fallback for missing amounts - look around "paid" lines
  const fallbackAmountExtraction = (lines: string[]): string | null => {
    console.log('=== FALLBACK AMOUNT EXTRACTION ===');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes("paid")) {
        console.log(`Found "paid" at line ${i}: "${line}"`);
        
        // Check current line first
        const currentAmount = extractAmount(line);
        if (currentAmount) {
          console.log('Found amount in same line as "paid":', currentAmount);
          return currentAmount;
        }
        
        // Check next 2 lines after "paid"
        for (let j = 1; j <= 2; j++) {
          if (i + j < lines.length) {
            const nextLine = lines[i + j];
            const nextAmount = extractAmount(nextLine);
            if (nextAmount) {
              console.log(`Found amount ${j} line(s) after "paid": "${nextLine}" → ${nextAmount}`);
              return nextAmount;
            }
          }
        }
        
        // Check 1 line before "paid" as well
        if (i > 0) {
          const prevLine = lines[i - 1];
          const prevAmount = extractAmount(prevLine);
          if (prevAmount) {
            console.log(`Found amount 1 line before "paid": "${prevLine}" → ${prevAmount}`);
            return prevAmount;
          }
        }
      }
    }
    
    console.log('❌ Fallback amount extraction failed - no amounts found near "paid"');
    
    // Final fallback - look for standalone numbers that could be amounts
    console.log('=== FINAL AMOUNT FALLBACK ===');
    for (const line of lines) {
      // Look for clean number patterns (not dates, times, or IDs)
      const cleanNumber = line.match(/^\s*(\d{2,5})\s*$/);
      if (cleanNumber) {
        const amount = parseInt(cleanNumber[1]);
        if (amount >= 50 && amount <= 50000) {
          console.log(`Found standalone amount: "${line}" → ${amount}`);
          return cleanNumber[1];
        }
      }
      
      // Look for "amount" or "total" keywords
      const amountKeyword = line.match(/(?:amount|total|sum)[\s:]*(\d{2,5})/i);
      if (amountKeyword) {
        const amount = parseInt(amountKeyword[1]);
        if (amount >= 50 && amount <= 50000) {
          console.log(`Found amount with keyword: "${line}" → ${amount}`);
          return amountKeyword[1];
        }
      }
    }
    
    return null;
  };

  // Platform-specific data extractors
  const extractCredData = (lines: string[]) => {
    let recipient = "";
    let amount = "";
    let description = "";

    console.log('=== CRED SPECIFIC EXTRACTION ===');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`CRED Line ${i}: "${line}"`);

      // CRED recipient detection - business names, logistics companies
      if (!recipient && (
        line.includes("Cargo") || 
        line.includes("Logistics") ||
        line.includes("Hardware") ||
        line.includes("Galaxy") ||
        line.includes("Enterprise") ||
        (line.length > 8 && line.length < 40 && /^[A-Z]/.test(line) && 
         !line.includes('@') && !line.toLowerCase().includes('cred') &&
         !line.toLowerCase().includes('paid') && !line.includes('|'))
      )) {
        recipient = cleanRecipient(line);
        console.log('CRED: Found recipient:', recipient);
      }

      // CRED amount detection - look for currency symbols or patterns
      if (!amount && (/₹|Rs|INR|¥/.test(line))) {
        const extractedAmount = extractAmount(line);
        if (extractedAmount) {
          amount = extractedAmount;
          console.log('CRED: Found amount:', amount);
        }
      }

      // CRED description detection - service/business terms
      if (!description && (
        line.toLowerCase().includes("transport") || 
        line.toLowerCase().includes("repair") ||
        line.toLowerCase().includes("service") ||
        line.toLowerCase().includes("compressor") ||
        line.toLowerCase().includes("furnili") ||
        line.toLowerCase().includes("fuenlli") ||
        line.toLowerCase().includes("water") ||
        line.toLowerCase().includes("tanker") ||
        // Check for business-related terms
        (/repair|service|compressor|machine|water|tanker|transport|material|hardware/i.test(line) && line.length < 50)
      )) {
        description = line.trim();
        console.log('CRED: Found description:', description);
      }
    }

    // Apply smart fallback if amount is missing
    if (!amount) {
      console.log('CRED: No amount found, trying fallback extraction...');
      amount = fallbackAmountExtraction(lines) || "";
    }

    return { recipient, amount, description };
  };

  const extractGooglePayData = (lines: string[]) => {
    let recipient = "";
    let amount = "";
    let description = "";

    console.log('=== GOOGLE PAY SPECIFIC EXTRACTION ===');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Google Pay recipient - usually after "to " 
      if (!recipient && line.toLowerCase().includes('to ') && !line.toLowerCase().includes('powered')) {
        recipient = cleanRecipient(line.replace(/.*to\s+/i, '').trim());
        console.log('GooglePay: Found recipient:', recipient);
      }

      // Google Pay amount - big, prominent with ₹
      if (!amount && (/₹/.test(line) || /Rs/.test(line))) {
        const extractedAmount = extractAmount(line);
        if (extractedAmount) {
          amount = extractedAmount;
          console.log('GooglePay: Found amount:', amount);
        }
      }

      // Google Pay description - often in "for" or note sections
      if (!description && (line.toLowerCase().includes('for ') || 
          line.toLowerCase().includes('note:') ||
          /repair|service|payment|bill/i.test(line))) {
        description = line.replace(/.*(?:for|note:)\s*/i, '').trim();
        console.log('GooglePay: Found description:', description);
      }
    }

    // Apply smart fallback if amount is missing
    if (!amount) {
      console.log('GooglePay: No amount found, trying fallback extraction...');
      amount = fallbackAmountExtraction(lines) || "";
    }

    return { recipient, amount, description };
  };

  const extractPhonePeData = (lines: string[]) => {
    let recipient = "";
    let amount = "";
    let description = "";

    console.log('=== PHONEPE SPECIFIC EXTRACTION ===');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // PhonePe recipient - after "Paid to" or "sent to"
      if (!recipient && (line.toLowerCase().includes('paid to') || line.toLowerCase().includes('sent to'))) {
        recipient = cleanRecipient(line.replace(/.*(?:paid to|sent to)\s+/i, '').trim());
        console.log('PhonePe: Found recipient:', recipient);
      }

      // PhonePe amount - always after "Paid to" context
      if (!amount && (/₹/.test(line) || /Rs/.test(line))) {
        const extractedAmount = extractAmount(line);
        if (extractedAmount) {
          amount = extractedAmount;
          console.log('PhonePe: Found amount:', amount);
        }
      }

      // PhonePe description - in message or note field
      if (!description && (line.toLowerCase().includes('message:') || 
          /repair|service|payment|bill/i.test(line))) {
        description = line.replace(/.*message:\s*/i, '').trim();
        console.log('PhonePe: Found description:', description);
      }
    }

    // Apply smart fallback if amount is missing
    if (!amount) {
      console.log('PhonePe: No amount found, trying fallback extraction...');
      amount = fallbackAmountExtraction(lines) || "";
    }

    return { recipient, amount, description };
  };

  // Enhanced recipient/vendor name extraction
  const extractRecipientByPlatform = (lines: string[], platform: string): string => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      let recipient = '';
      
      switch (platform) {
        case 'googlepay':
          if (line.includes('to ') && !line.includes('powered')) {
            recipient = cleanRecipient(lines[i].replace(/.*to\s+/i, '').trim());
          }
          break;
        case 'phonepe':
          if (line.includes('sent to') || line.includes('paid to')) {
            recipient = cleanRecipient(lines[i].replace(/.*(?:sent to|paid to)\s+/i, '').trim());
          }
          break;
        case 'paytm':
          if (line.includes('paid to') || line.includes('sent to')) {
            recipient = cleanRecipient(lines[i].replace(/.*(?:paid to|sent to)\s+/i, '').trim());
          }
          break;
        case 'cred':
          // CRED: Look for recipient name - usually the business name line
          // Skip payer info, email addresses, platform mentions
          if (!line.toLowerCase().includes('paid') && 
              !line.includes('@') && 
              !line.toLowerCase().includes('cred') &&
              !line.toLowerCase().includes('powered') &&
              !line.toLowerCase().includes('securely') &&
              !line.includes('|') && // Skip transaction info
              line.length > 10 && 
              /^[A-Z]/.test(line) && // Starts with capital letter
              !/^\d/.test(line) && // Not starting with number
              !/vishal|sonigra/i.test(line)) { // Skip payer name
            // Clean up recipient name using the cleanup function
            recipient = cleanRecipient(lines[i]);
          }
          break;
        case 'bank':
          if (line.includes('beneficiary') || line.includes('payee')) {
            recipient = cleanRecipient(lines[i + 1] || '');
          }
          break;
      }
      
      if (recipient && recipient.length > 2 && recipient.length < 50) {
        return recipient;
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
      case 'cred':
        // CRED format: "16 |AUG 2025, 5:00PM | TXN ID: 559419149585" or "14 AUG 2025, 12:42PM | TXN ID: ..."
        dateMatch = text.match(/(\d{1,2})\s*\|?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
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
  const preprocessImageForOCR = async (file: File): Promise<File> => {
    try {
      console.log('=== PREPROCESSING IMAGE FOR BETTER OCR ===');
      
      // Create canvas for image preprocessing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Load image
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Scale up image for better text recognition (minimum 1200px on larger side)
            const scale = Math.max(1, 1200 / Math.max(img.width, img.height));
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // Draw original image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Get image data for processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            console.log('Preprocessing image: grayscale conversion, contrast enhancement, and binarization');
            
            // Apply image processing filters for better OCR
            for (let i = 0; i < data.length; i += 4) {
              // Convert to grayscale using luminance formula (better than simple averaging)
              const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
              
              // Enhance contrast and apply threshold (binarization for clear text)
              // This converts stylized ₹ symbols to clear black text on white background
              const enhanced = gray > 180 ? 255 : 0;
              
              data[i] = enhanced;     // Red
              data[i + 1] = enhanced; // Green  
              data[i + 2] = enhanced; // Blue
              // Alpha channel remains unchanged
            }
            
            // Apply the processed image data back to canvas
            ctx.putImageData(imageData, 0, 0);
            
            // Convert canvas to blob and create processed file
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Could not process image'));
                return;
              }
              
              const processedFile = new File([blob], 'processed_' + file.name, {
                type: 'image/png',
                lastModified: Date.now()
              });
              
              console.log('Image preprocessed successfully:', processedFile.name, 'Size:', processedFile.size);
              URL.revokeObjectURL(imageUrl);
              resolve(processedFile);
            }, 'image/png', 1.0);
            
          } catch (error) {
            URL.revokeObjectURL(imageUrl);
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Could not load image'));
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return file; // Return original file if preprocessing fails
    }
  };

  const processImageWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    try {
      // Preprocess image for better OCR accuracy (grayscale, contrast, binarization)
      const processedFile = await preprocessImageForOCR(file);
      console.log('Using preprocessed image for OCR:', processedFile.name);
      
      // Enhanced OCR settings with preprocessed image
      const result = await Tesseract.recognize(processedFile, 'eng', {
        logger: m => console.log(m)
      });
      
      const text = result.data.text;
      console.log('=== FULL OCR TEXT START ===');
      console.log(text);
      console.log('=== FULL OCR TEXT END ===');
      
      const updatedData = { ...formData };
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Detect platform type for specialized parsing
      const platformType = detectPlatformType(text.toLowerCase());
      console.log('=== PLATFORM DETECTION ===');
      console.log('Detected Platform:', platformType);
      console.log('=== ALL LINES ===');
      lines.forEach((line, index) => {
        console.log(`Line ${index}: "${line}"`);
      });
      
      // Use platform-specific extractors for better accuracy
      let extractedData = { recipient: "", amount: "", description: "" };
      
      switch (platformType) {
        case 'cred':
          extractedData = extractCredData(lines);
          break;
        case 'googlepay':
          extractedData = extractGooglePayData(lines);
          break;
        case 'phonepe':
          extractedData = extractPhonePeData(lines);
          break;
        default:
          // Fallback to old platform-specific extraction for other platforms
          const extractedAmount = extractAmountByPlatform(lines, platformType);
          const extractedRecipient = extractRecipientByPlatform(lines, platformType);
          let fallbackAmount = extractedAmount;
          
          // If still no amount found, try smart fallback
          if (!fallbackAmount) {
            console.log('Generic platform: No amount found, trying smart fallback...');
            fallbackAmount = fallbackAmountExtraction(lines) || "";
          }
          
          extractedData = { 
            amount: fallbackAmount, 
            recipient: extractedRecipient, 
            description: "" 
          };
      }
      
      console.log('=== PLATFORM-SPECIFIC EXTRACTION RESULTS ===');
      console.log('Amount:', extractedData.amount);
      console.log('Recipient:', extractedData.recipient);
      console.log('Description:', extractedData.description);
      
      // Apply extracted data to form
      if (extractedData.amount) {
        updatedData.amount = extractedData.amount;
      }
      
      if (extractedData.recipient) {
        updatedData.paidTo = extractedData.recipient;
      }
      
      if (extractedData.description) {
        updatedData.note = extractedData.description;
      }
      
      // Still extract date using the existing method
      const extractedDate = extractDateByPlatform(text, platformType);
      console.log('=== DATE EXTRACTION ===');
      console.log('Extracted Date:', extractedDate);
      if (extractedDate) {
        updatedData.date = extractedDate;
      }

      // Auto-categorize based on description and recipient
      let autoCategory = 'Other';
      const combinedText = (extractedData.description + ' ' + extractedData.recipient).toLowerCase();
      
      if (/transport|cargo|logistics|vehicle|fuel|petrol|diesel/i.test(combinedText)) {
        autoCategory = 'Transport';
      } else if (/repair|service|maintenance|compressor|machine|electric|plumber/i.test(combinedText)) {
        autoCategory = 'Repair';
      } else if (/hardware|material|steel|wood|cement|sand|brick|wire/i.test(combinedText)) {
        autoCategory = 'Material';
      } else if (/food|lunch|dinner|tea|breakfast|restaurant/i.test(combinedText)) {
        autoCategory = 'Food';
      } else if (/tool|equipment|drill|hammer|saw/i.test(combinedText)) {
        autoCategory = 'Tools';
      } else if (/office|stationary|paper|pen|computer/i.test(combinedText)) {
        autoCategory = 'Office';
      } else if (/site|construction|building|project/i.test(combinedText)) {
        autoCategory = 'Site';
      }
      
      if (autoCategory !== 'Other') {
        updatedData.category = autoCategory;
        console.log('Auto-categorized as:', autoCategory);
      }
        
      console.log('=== FINAL EXTRACTED DATA ===');
      console.log('Platform:', platformType);
      console.log('Amount:', updatedData.amount);
      console.log('Recipient:', updatedData.paidTo);
      console.log('Description:', updatedData.note);
      console.log('Category:', updatedData.category);
      console.log('Date:', updatedData.date);
      
      setFormData(prev => ({ ...updatedData, receiptImage: prev.receiptImage }));
      toast({ title: "Payment details extracted from screenshot", description: "Review and submit the expense" });
    } catch (error) {
      console.error('OCR Error:', error);
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
    formDataToSend.append('vendor', formData.paidTo); // Changed from paidTo to vendor
    formDataToSend.append('amount', formData.amount);
    formDataToSend.append('paidBy', formData.paidBy);
    formDataToSend.append('description', formData.purpose); // Changed from note to description
    formDataToSend.append('category', formData.category);
    formDataToSend.append('projectId', formData.projectId);
    formDataToSend.append('orderNo', formData.orderNo);
    
    if (formData.receiptImage) {
      console.log("Appending receipt file:", {
        name: formData.receiptImage.name,
        type: formData.receiptImage.type,
        size: formData.receiptImage.size
      });
      formDataToSend.append('receipt', formData.receiptImage);
    } else {
      console.log("No receipt file to append");
    }
    
    // Log all FormData entries for debugging
    console.log("FormData entries:");
    const entries = Array.from(formDataToSend.entries());
    entries.forEach(([key, value]) => {
      console.log(key, value);
    });
    
    addExpenseMutation.mutate(formDataToSend);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: PettyCashExpense) => {
    const matchesSearch = expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || expense.category === selectedCategory;
    const paidByName = expense.user?.name || expense.user?.username || '';
    const matchesPaidBy = !selectedPaidBy || selectedPaidBy === 'all' || paidByName === selectedPaidBy;
    const matchesDate = !dateFilter || expense.expenseDate.startsWith(dateFilter);
    
    return matchesSearch && matchesCategory && matchesPaidBy && matchesDate;
  });

  // Export functions
  const exportToWhatsApp = () => {
    // Calculate totals
    const totalIncome = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'income')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const totalExpenses = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'expense')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const netTotal = totalIncome - totalExpenses;

    const message = filteredExpenses.map((expense: PettyCashExpense) => 
      `${format(new Date(expense.expenseDate), 'dd MMM yyyy')} - ${expense.status === 'income' ? 'Credit' : 'Debit'} - ${expense.status === 'income' ? '+' : '-'}₹${expense.amount.toLocaleString()} - ${expense.vendor} - ${expense.category} - ${expense.description || ''}`
    ).join('\n');
    
    const totals = `\n\n📊 SUMMARY:\n💰 Total Income: +₹${totalIncome.toLocaleString()}\n💸 Total Expenses: -₹${totalExpenses.toLocaleString()}\n📈 Net Total: ${netTotal >= 0 ? '+' : ''}₹${netTotal.toLocaleString()}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`💰 Petty Cash Report\n📅 ${format(new Date(), 'dd MMM yyyy')}\n\n${message}${totals}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const exportToExcel = () => {
    // Calculate totals
    const totalIncome = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'income')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const totalExpenses = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'expense')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const netTotal = totalIncome - totalExpenses;

    const csvContent = [
      'Date,Type,Amount,Paid To/Source,Paid By,Purpose,Category,Project ID,Description',
      ...filteredExpenses.map((expense: PettyCashExpense) => 
        `${format(new Date(expense.expenseDate), 'dd MMM yyyy')},"${expense.status === 'income' ? 'Credit' : 'Debit'}","${expense.status === 'income' ? '+' : '-'}₹${expense.amount.toLocaleString()}","${expense.vendor}","${expense.user?.name || expense.user?.username || 'N/A'}","${expense.description || ''}","${expense.category}","${expense.projectId || '-'}","${expense.description || ''}"`
      ),
      '',
      'TOTALS:',
      `Total Income,+₹${totalIncome.toLocaleString()}`,
      `Total Expenses,-₹${totalExpenses.toLocaleString()}`,
      `Net Total,${netTotal >= 0 ? '+' : ''}₹${netTotal.toLocaleString()}`
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petty-cash-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <FurniliLayout
      title={user?.role === 'staff' ? "My Petty Cash" : "Petty Cash Management"}
      subtitle={user?.role === 'staff' ? "Track my expenses and cash received" : "Track expenses and manage cash flow"}
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
          </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowAddDialog(true)} className={`flex-1 sm:flex-none ${isMobile ? 'h-9 text-sm' : ''}`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          {user?.role !== 'staff' && (
            <Button onClick={() => setShowAddFundsDialog(true)} variant="outline" className={`flex-1 sm:flex-none bg-green-50 border-green-200 hover:bg-green-100 text-green-700 ${isMobile ? 'h-9 text-sm' : ''}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Funds
            </Button>
          )}
        </div>
      </div>
      {/* Stats Cards */}
      {stats && (
        <>
          {/* Mobile Compact Stats - Single Line */}
          {isMobile && (
            <Card className="p-3">
              {user?.role === 'staff' ? (
                // Personal stats for staff users
                (<div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">My Expenses</div>
                    <div className="text-sm font-bold text-red-600">-₹{(stats as PersonalPettyCashStats).myExpenses?.toLocaleString()}</div>
                    <div className="text-xs text-red-500">Money Spent</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Cash Given to Me</div>
                    <div className="text-sm font-bold text-green-600">+₹{(stats as PersonalPettyCashStats).cashGivenToMe?.toLocaleString()}</div>
                    <div className="text-xs text-green-500">Received</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">My Balance</div>
                    <div className={`text-sm font-bold ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats as PersonalPettyCashStats).myBalance >= 0 ? '+' : ''}₹{(stats as PersonalPettyCashStats).myBalance?.toLocaleString()}
                    </div>
                    <div className={`text-xs ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats as PersonalPettyCashStats).myBalance >= 0 ? 'Available' : 'Deficit'}
                    </div>
                  </div>
                </div>)
              ) : (
                // Global stats for admin users
                (<div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Total Expenses</div>
                    <div className="text-sm font-bold text-red-600">-₹{(stats as PettyCashStats).totalExpenses?.toLocaleString()}</div>
                    <div className="text-xs text-red-500">Money Out</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Total Funds</div>
                    <div className="text-sm font-bold text-green-600">+₹{(stats as PettyCashStats).totalIncome?.toLocaleString()}</div>
                    <div className="text-xs text-green-500">Money In</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Current Balance</div>
                    <div className={`text-sm font-bold ${(stats as PettyCashStats).balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats as PettyCashStats).balance >= 0 ? '+' : ''}₹{(stats as PettyCashStats).balance?.toLocaleString()}
                    </div>
                    <div className={`text-xs ${(stats as PettyCashStats).balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats as PettyCashStats).balance >= 0 ? 'Available' : 'Deficit'}
                    </div>
                  </div>
                </div>)
              )}
              {/* This Month Stats on Mobile */}
              <div className="mt-3 pt-3 border-t text-center">
                <div className="text-xs font-medium text-gray-600">This Month</div>
                <div className="text-lg font-bold">₹{user?.role === 'staff' ? 
                  (stats as PersonalPettyCashStats).thisMonth?.toLocaleString() : 
                  (stats as PettyCashStats).currentMonthExpenses?.toLocaleString()}</div>
              </div>
            </Card>
          )}
          
          {/* Desktop Stats Cards */}
          {!isMobile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {user?.role === 'staff' ? (
                // Personal stats cards for staff users
                (<>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">My Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">-₹{(stats as PersonalPettyCashStats).myExpenses?.toLocaleString()}</div>
                      <p className="text-xs text-red-500 mt-1">Money Spent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cash Given to Me</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">+₹{(stats as PersonalPettyCashStats).cashGivenToMe?.toLocaleString()}</div>
                      <p className="text-xs text-green-500 mt-1">Received</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">My Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(stats as PersonalPettyCashStats).myBalance >= 0 ? '+' : ''}₹{(stats as PersonalPettyCashStats).myBalance?.toLocaleString()}
                      </div>
                      <p className={`text-xs mt-1 ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(stats as PersonalPettyCashStats).myBalance >= 0 ? 'Available' : 'Deficit'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(stats as PersonalPettyCashStats).thisMonth?.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </>)
              ) : (
                // Global stats cards for admin users
                (<>
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Expenses (Debit)</p>
                          <p className="text-lg font-bold text-red-600">-₹{(stats as PettyCashStats).totalExpenses?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Money Out</p>
                        </div>
                        <div className="h-6 w-6 bg-red-100 rounded-full flex items-center justify-center">
                          <Download className="h-3 w-3 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Funds (Credit)</p>
                          <p className="text-lg font-bold text-green-600">+₹{(stats as PettyCashStats).totalIncome?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Money In</p>
                        </div>
                        <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                          <Upload className="h-3 w-3 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={`border-l-4 ${(stats as PettyCashStats).balance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                          <p className={`text-lg font-bold ${(stats as PettyCashStats).balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(stats as PettyCashStats).balance >= 0 ? '+' : ''}₹{(stats as PettyCashStats).balance?.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-500">Available Funds</p>
                        </div>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          (stats as PettyCashStats).balance >= 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <Wallet className={`h-3 w-3 ${(stats as PettyCashStats).balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">This Month</p>
                          <p className="text-lg font-bold text-gray-900">₹{(stats as PettyCashStats).currentMonthExpenses?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Monthly Damage</p>
                        </div>
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-3 w-3 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>)
              )}
            </div>
          )}
        </>
      )}

      {/* Staff Balances - Hide for staff users */}
      {user?.role !== 'staff' && staffBalances.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Individual Staff Balances</CardTitle>
                <p className="text-sm text-gray-600">Track funds received vs spent by each staff member</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStaffBalances(!showStaffBalances)}
                className="flex items-center gap-2"
              >
                {showStaffBalances ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showStaffBalances && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {staffBalances.map((staff: any) => (
                <div key={staff.userId} className="p-4 border rounded-lg bg-gray-50">
                  <div className="font-medium text-sm mb-2">{staff.userName}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-600">Received:</span>
                      <span className="font-medium text-green-600">+₹{(staff.received ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Spent:</span>
                      <span className="font-medium text-red-600">-₹{(staff.spent ?? 0).toLocaleString()}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-medium">Balance:</span>
                      <span className={`font-bold ${(staff.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(staff.balance ?? 0) >= 0 ? '+' : ''}₹{(staff.balance ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className={`${isMobile ? 'pt-4' : 'pt-6'}`}>
          <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:gap-4'}`}>
            <div className={`${isMobile ? '' : 'lg:flex-1 lg:min-w-[200px] sm:col-span-2'}`}>
              <Label htmlFor="search" className={`${isMobile ? 'text-sm' : ''}`}>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'h-9 text-sm' : ''}`}
                />
              </div>
            </div>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-3' : 'contents'}`}>
              <div>
                <Label htmlFor="category-filter" className={`${isMobile ? 'text-sm' : ''}`}>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className={`w-full ${isMobile ? 'h-9 text-sm' : 'lg:w-[150px]'}`}>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {user?.role !== 'staff' && (
                <div>
                  <Label htmlFor="paid-by-filter" className={`${isMobile ? 'text-sm' : ''}`}>Paid By</Label>
                  <Select value={selectedPaidBy} onValueChange={setSelectedPaidBy}>
                    <SelectTrigger className={`w-full ${isMobile ? 'h-9 text-sm' : 'lg:w-[150px]'}`}>
                      <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.name || user.username}>
                          {user.name || user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={`${user?.role === 'staff' ? 'col-span-1' : ''}`}>
                <Label htmlFor="date-filter" className={`${isMobile ? 'text-sm' : ''}`}>Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`w-full ${isMobile ? 'h-9 text-sm' : 'lg:w-[150px]'}`}
                />
              </div>
            </div>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:col-span-2 lg:col-span-1'}`}>
              <Button variant="outline" onClick={exportToWhatsApp} className={`${isMobile ? 'h-9 text-sm' : 'flex-1 sm:flex-none'}`}>
                <Share2 className="mr-2 h-4 w-4" />
                {isMobile ? 'WhatsApp' : 'WhatsApp'}
              </Button>
              <Button variant="outline" onClick={exportToExcel} className={`${isMobile ? 'h-9 text-sm' : 'flex-1 sm:flex-none'}`}>
                <Download className="mr-2 h-4 w-4" />
                {isMobile ? 'Excel' : 'Excel'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History ({filteredExpenses.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="py-2 px-3 w-20">Date</TableHead>
                  <TableHead className="py-2 px-3 w-16">Type</TableHead>
                  <TableHead className="py-2 px-3 w-20 text-right">Amount</TableHead>
                  <TableHead className="py-2 px-3 min-w-[120px]">Paid To/Source</TableHead>
                  <TableHead className="py-2 px-3 w-20">Paid / Received By</TableHead>
                  <TableHead className="py-2 px-3 min-w-[150px]">Purpose</TableHead>
                  <TableHead className="py-2 px-3 w-20">Category</TableHead>
                  <TableHead className="py-2 px-3 w-32">Project & Client</TableHead>
                  <TableHead className="py-2 px-3 w-16">Receipt</TableHead>
                  <TableHead className="py-2 px-3 w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense: PettyCashExpense) => (
                  <TableRow 
                    key={expense.id} 
                    className="text-xs hover:bg-gray-50 cursor-pointer" 
                    onClick={() => handleShowExpenseDetails(expense)}
                  >
                    <TableCell className="py-2 px-3 text-gray-700 text-xs">
                      {format(new Date(expense.expenseDate), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        expense.status === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {expense.status === 'income' ? 'Credit' : 'Debit'}
                      </span>
                    </TableCell>
                    <TableCell className={`py-2 px-3 font-bold text-right ${
                      expense.status === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {expense.status === 'income' ? '+' : '-'}₹{expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-3 font-medium max-w-[120px]">
                      <div className="truncate" title={expense.vendor}>{expense.vendor}</div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-gray-600">
                      <div className="truncate max-w-[80px]" title={expense.user?.name || expense.user?.username || 'N/A'}>
                        {expense.user?.name || expense.user?.username || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 max-w-[150px]">
                      <div className="truncate text-gray-700" title={expense.description || '-'}>
                        {expense.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px] px-1 py-0.5">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-gray-700 text-xs">
                      {expense.projectId && expense.project ? (
                        <div className="text-center" title={`${expense.project.name}`}>
                          <div className="font-medium">{expense.project.code}</div>
                          <div className="text-[10px] text-gray-500 truncate">{expense.project.name}</div>
                        </div>
                      ) : expense.projectId ? (
                        <div className="text-center">{expense.projectId}</div>
                      ) : (
                        <span className="text-gray-400 text-center block">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      {expense.receiptImageUrl ? (
                        <img 
                          src={expense.receiptImageUrl}
                          alt="Receipt"
                          className="w-6 h-6 object-cover rounded cursor-pointer border mx-auto"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            setSelectedImage(expense.receiptImageUrl || "");
                            setShowImageDialog(true);
                          }}
                          title="Click to view full image"
                        />
                      ) : (
                        <span className="text-gray-400 text-center block text-[10px]">No receipt</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Only show edit/delete for creator or admin */}
                        {(expense.addedBy === user?.id || user?.role === 'admin') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handleEditExpense(expense);
                              }}
                              title="Edit expense"
                              className="h-6 w-6 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handleDeleteExpense(expense);
                              }}
                              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                              title="Delete expense"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                </TableRow>
              ))}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No expenses found matching your filters
                  </TableCell>
                </TableRow>
              )}
              {/* Total Row */}
              {filteredExpenses.length > 0 && (
                <TableRow className="bg-gray-50 border-t-2">
                  <TableCell colSpan={2} className="py-3 px-3">
                    <div className="text-gray-700 text-xs font-medium">TOTAL</div>
                  </TableCell>
                  <TableCell className="py-3 px-3" colSpan={8}>
                    {(() => {
                      const totalIncome = filteredExpenses
                        .filter((expense: PettyCashExpense) => expense.status === 'income')
                        .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
                      const totalExpenses = filteredExpenses
                        .filter((expense: PettyCashExpense) => expense.status === 'expense')
                        .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
                      const netTotal = totalIncome - totalExpenses;
                      return (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex justify-between items-center bg-green-50 px-2 py-1.5 rounded border border-green-200">
                            <span className="text-green-700 text-xs">Received:</span>
                            <span className="text-green-600 text-xs font-semibold">+₹{totalIncome.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center bg-red-50 px-2 py-1.5 rounded border border-red-200">
                            <span className="text-red-700 text-xs">Spent:</span>
                            <span className="text-red-600 text-xs font-semibold">-₹{totalExpenses.toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between items-center px-2 py-1.5 rounded border ${
                            netTotal >= 0 
                              ? 'bg-green-100 border-green-300' 
                              : 'bg-red-100 border-red-300'
                          }`}>
                            <span className={`text-xs ${netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>Balance:</span>
                            <span className={`text-xs font-semibold ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {netTotal >= 0 ? '+' : ''}₹{netTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder=""
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            {/* Paid To and Paid By */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paidTo">Paid To *</Label>
                <Input
                  id="paidTo"
                  placeholder=""
                  value={formData.paidTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paidBy">Paid By *</Label>
                <Select 
                  value={formData.paidBy} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purpose and Order No */}
            <div>
              <Label htmlFor="purpose">Purpose / Description *</Label>
              <Textarea
                id="purpose"
                placeholder="For what Purpose"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectId">Project ID *</Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.code} - {project.name} ({project.client_name || 'No Client'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Enhanced Proof Attachment with Drag & Drop and Paste */}
            <div>
              <Label htmlFor="receipt">Proof Attachment (GPay, CRED, Invoice, etc.)</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isProcessingOCR ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onPaste={handlePaste}
                tabIndex={0}
              >
                {formData.receiptImage ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        {formData.receiptImage.name}
                      </span>
                    </div>
                    {isProcessingOCR && (
                      <Badge variant="secondary" className="animate-pulse">
                        Processing OCR...
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Drag & drop</strong> an image here, or{" "}
                      <label htmlFor="receipt" className="text-amber-600 cursor-pointer hover:underline">
                        choose file
                      </label>
                    </div>
                    <div className="text-xs text-gray-500">
                      Or press <kbd className="px-1 bg-gray-100 rounded">Ctrl+V</kbd> to paste screenshot
                    </div>
                  </div>
                )}
                <input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Camera className="h-2.5 w-2.5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">
                  Upload UPI payment screenshot for automatic data extraction (GPay, PhonePe, CRED)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addExpenseMutation.isPending || isProcessingOCR}>
                {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formPayload = new FormData();
            formPayload.append('expenseDate', formData.date);
            formPayload.append('amount', formData.amount);
            formPayload.append('vendor', formData.paidTo); // Changed from paidTo to vendor
            formPayload.append('paidBy', formData.paidBy);
            formPayload.append('description', formData.purpose); // Changed from note to description
            formPayload.append('projectId', formData.projectId);
            formPayload.append('orderNo', formData.orderNo);
            formPayload.append('category', formData.category);
            if (formData.receiptImage) {
              formPayload.append('receipt', formData.receiptImage);
            }
            editExpenseMutation.mutate({ id: editingExpense!.id, expenseData: formPayload });
          }} className="space-y-4">
            {/* Same form fields as add dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="2700"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-paidTo">Paid To *</Label>
                <Input
                  id="edit-paidTo"
                  placeholder="Dolly Vikesh Oswal"
                  value={formData.paidTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-paidBy">Paid By *</Label>
                <Select 
                  value={formData.paidBy}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-purpose">Purpose / Description *</Label>
              <Textarea
                id="edit-purpose"
                placeholder="Furnili powder coating for legs – Pintu order"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-projectId">Project ID *</Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.code} - {project.name} ({project.client_name || 'No Client'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-category">Category (For Reports)</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-receipt">Update Receipt Attachment</Label>
              <Input
                id="edit-receipt"
                type="file"
                accept="image/*"
                onChange={(e) => setFormData(prev => ({ ...prev, receiptImage: e.target.files?.[0] || null }))}
              />
              <p className="text-sm text-gray-500 mt-1">
                📱 Leave blank to keep existing receipt
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editExpenseMutation.isPending}>
                {editExpenseMutation.isPending ? "Updating..." : "Update Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Funds (Income)</DialogTitle>
            <p className="text-sm text-gray-600">Add money to petty cash fund</p>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formDataToSend = new FormData();
            formDataToSend.append('expenseDate', fundsFormData.date);
            formDataToSend.append('paidTo', fundsFormData.source);
            formDataToSend.append('amount', fundsFormData.amount);
            formDataToSend.append('note', fundsFormData.purpose);
            formDataToSend.append('receivedBy', fundsFormData.receivedBy);
            formDataToSend.append('status', 'income');
            
            if (fundsFormData.receiptImage) {
              formDataToSend.append('receipt', fundsFormData.receiptImage);
            }
            
            addFundsMutation.mutate(formDataToSend);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="funds-amount">Amount *</Label>
                <Input
                  id="funds-amount"
                  type="number"
                  placeholder="5000"
                  step="0.01"
                  value={fundsFormData.amount}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, amount: e.target.value }))}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="funds-source">Source *</Label>
                <Input
                  id="funds-source"
                  placeholder="Cash from office, Bank transfer, etc."
                  value={fundsFormData.source}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, source: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="funds-receivedBy">Received By (Staff) *</Label>
                <Select 
                  value={fundsFormData.receivedBy || ""} 
                  onValueChange={(value) => setFundsFormData(prev => ({ ...prev, receivedBy: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="funds-purpose">Purpose / Description *</Label>
              <Textarea
                id="funds-purpose"
                placeholder="Petty cash fund replenishment"
                value={fundsFormData.purpose}
                onChange={(e) => setFundsFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="funds-receipt">Proof Attachment (Optional)</Label>
              <Input
                id="funds-receipt"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFundsFormData(prev => ({ ...prev, receiptImage: file }));
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload bank transfer receipt, cash deposit slip, etc.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddFundsDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addFundsMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {addFundsMutation.isPending ? "Adding..." : "Add Funds"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog - Optimized Layout for Both Credit and Expense */}
      <Dialog open={showExpenseDetailsDialog} onOpenChange={setShowExpenseDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedExpenseDetails?.status === 'income' ? 'Credit Details' : 'Expense Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedExpenseDetails && (
            <div className="space-y-4">
              {/* Two columns layout for better space utilization */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {selectedExpenseDetails.status === 'income' ? 'Received By' : 'Paid By'}
                  </div>
                  <div className="text-sm">{selectedExpenseDetails.user?.name || selectedExpenseDetails.user?.username || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Category</div>
                  <div className="text-sm">{selectedExpenseDetails.category}</div>
                </div>
              </div>

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

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Receipt Image</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Receipt" 
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record for "₹{expenseToDelete?.amount} to {expenseToDelete?.vendor}" and remove it from all calculations.
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