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

  // Reset form to initial state
  const resetFormData = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      paidTo: "",
      paidBy: user ? user.id.toString() : "",
      purpose: "",
      projectId: "",
      orderNo: "",
      receiptImage: null,
      category: "",
    });
  };

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



  // Simple OCR processing functions
  const extractAmount = (text: string): string => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for amounts with rupee symbol first
    for (const line of lines) {
      const amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (amount >= 1 && amount <= 100000) {
          return amountMatch[1].replace(/,/g, '');
        }
      }
    }
    
    // Fallback: look for "Rs" format
    for (const line of lines) {
      const amountMatch = line.match(/rs\.?\s?([0-9,]+\.?[0-9]*)/i);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (amount >= 1 && amount <= 100000) {
          return amountMatch[1].replace(/,/g, '');
        }
      }
    }
    
    return '';
  };

  const extractRecipient = (text: string): string => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for "To" patterns
    for (const line of lines) {
      const toMatch = line.match(/to\s+([a-zA-Z\s]+)/i);
      if (toMatch && toMatch[1].length > 2 && toMatch[1].length < 50) {
        return toMatch[1].trim();
      }
    }
    
    // Look for business names (all caps)
    for (const line of lines) {
      if (/^[A-Z][A-Z\s&]+[A-Z]$/.test(line) && line.length > 3 && line.length < 50) {
        return line.trim();
      }
    }
    
    return '';
  };

  const extractDescription = (text: string): string => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Filter out obvious system/transaction lines and corrupted text
    const cleanLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      
      // Skip system lines
      if (lowerLine.includes('google pay') ||
          lowerLine.includes('upi') ||
          lowerLine.includes('transaction') ||
          lowerLine.includes('completed') ||
          lowerLine.includes('success') ||
          lowerLine.includes('powered by') ||
          lowerLine.includes('@') ||
          /^₹[\d,]+/.test(line) ||
          /^\d+$/.test(line) ||
          /^\d{1,2}\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line) ||
          /^\d{1,2}:\d{2}/.test(line) ||
          line.length < 3) {
        return false;
      }
      
      // Skip corrupted OCR patterns
      if (/£\d+|[£¥€]\d+|hore|bank.*\d{4}|0720\s*[vV]|[fF][eE][hH]\s*\+|\+orc|sank\s*\d{4}/i.test(line)) {
        return false;
      }
      
      return true;
    });
    
    // Find the most relevant description line
    for (const line of cleanLines) {
      const lowerLine = line.toLowerCase();
      
      // Prioritize lines with business terms
      const businessTerms = ['furnili', 'steel', 'wood', 'material', 'hardware', 'purchase', 'order', 'supply'];
      if (businessTerms.some(term => lowerLine.includes(term))) {
        return line.trim();
      }
    }
    
    // Return first meaningful line if no business terms found
    if (cleanLines.length > 0) {
      return cleanLines[0].trim();
    }
    
    return '';
  };

  const extractDate = (text: string): string => {
    const dateMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const monthNum = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month.toLowerCase()) + 1;
      if (monthNum > 0) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return '';
  };




  // Simple OCR processing
  const processImageWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {} // console.log(m)
      });
      
      const text = result.data.text;
      const updatedData = { ...formData };
      
      // Extract basic information using simple functions
      const extractedAmount = extractAmount(text);
      if (extractedAmount) {
        updatedData.amount = extractedAmount;
      }
      
      const extractedRecipient = extractRecipient(text);
      if (extractedRecipient) {
        updatedData.paidTo = extractedRecipient;
      }
      
      const extractedDate = extractDate(text);
      if (extractedDate) {
        updatedData.date = extractedDate;
      }
      
      const extractedDescription = extractDescription(text);
      if (extractedDescription) {
        updatedData.purpose = extractedDescription;
      } else if (extractedRecipient) {
        updatedData.purpose = `Payment to ${extractedRecipient}`;
      }

      setFormData(updatedData);
      toast({ title: "Image processed successfully!" });
    } catch (error) {
      console.error('OCR Error:', error);
      toast({ title: "Failed to process image", variant: "destructive" });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Petty Cash Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{stats.data ? stats.data.totalExpenses.toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{stats.data ? stats.data.totalIncome.toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{stats.data ? stats.data.currentBalance.toLocaleString() : 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              {expenses.isLoading ? (
                <div className="text-center py-4">Loading expenses...</div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No expenses found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id} className="border rounded p-3 hover:bg-muted/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{expense.purpose}</div>
                          <div className="text-sm text-muted-foreground">
                            {expense.paidTo} • {format(new Date(expense.date), "PPP")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{expense.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{expense.category}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Income Records</h2>
            <Button onClick={() => setShowAddFundsDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-4 text-muted-foreground">
                Income tracking functionality
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-4 text-muted-foreground">
                Reports functionality
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="paidTo">Paid To</Label>
              <Input
                id="paidTo"
                placeholder="Vendor or person name"
                value={formData.paidTo}
                onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="Expense description"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="receipt">Receipt Image</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFormData({ ...formData, receiptImage: file });
                  if (file) {
                    processImageWithOCR(file);
                  }
                }}
              />
              {isProcessingOCR && (
                <div className="text-sm text-muted-foreground mt-1">
                  Processing image with OCR...
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const expenseData = new FormData();
                expenseData.append('date', formData.date);
                expenseData.append('amount', formData.amount);
                expenseData.append('paidTo', formData.paidTo);
                expenseData.append('paidBy', formData.paidBy);
                expenseData.append('purpose', formData.purpose);
                expenseData.append('category', formData.category);
                if (formData.receiptImage) {
                  expenseData.append('receiptImage', formData.receiptImage);
                }
                addExpenseMutation.mutate(expenseData);
              }}
              disabled={!formData.amount || !formData.paidTo || addExpenseMutation.isPending}
            >
              {addExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="funds-date">Date</Label>
              <Input
                id="funds-date"
                type="date"
                value={fundsFormData.date}
                onChange={(e) => setFundsFormData({ ...fundsFormData, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="funds-amount">Amount</Label>
              <Input
                id="funds-amount"
                type="number"
                placeholder="Enter amount"
                value={fundsFormData.amount}
                onChange={(e) => setFundsFormData({ ...fundsFormData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="funds-source">Source</Label>
              <Input
                id="funds-source"
                placeholder="Source of funds"
                value={fundsFormData.source}
                onChange={(e) => setFundsFormData({ ...fundsFormData, source: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="funds-purpose">Purpose</Label>
              <Input
                id="funds-purpose"
                placeholder="Income description"
                value={fundsFormData.purpose}
                onChange={(e) => setFundsFormData({ ...fundsFormData, purpose: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFundsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const fundsData = new FormData();
                fundsData.append('date', fundsFormData.date);
                fundsData.append('amount', fundsFormData.amount);
                fundsData.append('source', fundsFormData.source);
                fundsData.append('purpose', fundsFormData.purpose);
                addFundsMutation.mutate(fundsData);
              }}
              disabled={!fundsFormData.amount || !fundsFormData.source || addFundsMutation.isPending}
            >
              {addFundsMutation.isPending ? 'Adding...' : 'Add Income'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
