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
import { AIReceiptProcessor } from '@/components/ai-ocr/AIReceiptProcessor';

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
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Data fetching will be handled by existing queries below

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

  // Filter expenses based on search criteria
  const filteredExpenses = expenses.filter((expense: PettyCashExpense) => {
    const matchesSearch = !searchTerm || 
      expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;
    
    const matchesPaidBy = selectedPaidBy === "all" || 
      expense.addedBy.toString() === selectedPaidBy;
    
    const matchesDate = !dateFilter || 
      expense.expenseDate.startsWith(dateFilter);
    
    return matchesSearch && matchesCategory && matchesPaidBy && matchesDate;
  });

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

  // Simple categorization helper - moved from old OCR code
  const categorizeFromText = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('transport') || lowerText.includes('cargo') || 
        lowerText.includes('fuel') || lowerText.includes('logistics')) return 'Transport';
    if (lowerText.includes('repair') || lowerText.includes('service') || 
        lowerText.includes('maintenance')) return 'Repair';
    if (lowerText.includes('hardware') || lowerText.includes('material') || 
        lowerText.includes('steel') || lowerText.includes('cement')) return 'Material';
    if (lowerText.includes('food') || lowerText.includes('lunch') || 
        lowerText.includes('restaurant')) return 'Food';
    if (lowerText.includes('tool') || lowerText.includes('equipment')) return 'Tools';
    if (lowerText.includes('office') || lowerText.includes('stationary')) return 'Office';
    if (lowerText.includes('site') || lowerText.includes('construction')) return 'Site';
    
    return 'Other';
  };

  // AI OCR Handler Functions
  const handleReceiptUpload = async (file: File) => {
    try {
      setProcessing(true);
      setOcrResult(null);
      
      const { AIReceiptProcessor } = await import('@/components/ai-ocr/AIReceiptProcessor');
      const result = await AIReceiptProcessor.processReceipt(file);
      
      setOcrResult(result);
      toast({
        title: "✅ AI Processing Complete",
        description: `Extracted data with ${result.confidence}% confidence`,
      });
    } catch (error) {
      console.error('Receipt processing error:', error);
      toast({
        title: "❌ Processing Failed",
        description: error.message || "Could not process receipt",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const confirmOcrResult = () => {
    if (ocrResult) {
      setFormData({
        ...formData,
        date: ocrResult.date,
        amount: ocrResult.amount.toString(),
        paidTo: ocrResult.vendor,
        purpose: ocrResult.description,
        category: ocrResult.category
      });
      setOcrResult(null);
      toast({
        title: "✅ Data Applied",
        description: "AI-extracted data filled into form",
      });
    }
  };

  return (
    <FurniliLayout
      title={user?.role === 'staff' ? "My Petty Cash" : "Petty Cash Management"}
      subtitle={user?.role === 'staff' ? "Track my expenses and cash received" : "Track expenses and manage cash flow"}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <h2 className="text-xl font-semibold">Petty Cash Management</h2>
            <p className="text-sm text-gray-600">AI-powered receipt processing</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setShowAddDialog(true)} className={`flex-1 sm:flex-none ${isMobile ? 'h-9 text-sm' : ''}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
            <Button onClick={() => setShowAddDialog(true)} variant="outline" className={`flex-1 sm:flex-none ${isMobile ? 'h-9 text-sm' : ''}`}>
              <Camera className="mr-2 h-4 w-4" />
              Scan Receipt
            </Button>
          </div>
        </div>

        {/* AI OCR Processing Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Receipt Processing</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Receipt</h3>
                <p className="text-sm text-gray-600 mb-4">
                  AI system will automatically extract amount, vendor, date, and category
                </p>
                
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleReceiptUpload(file);
                      }
                    }}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label htmlFor="receipt-upload">
                    <Button asChild className="cursor-pointer">
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Select Image
                      </span>
                    </Button>
                  </label>
                  
                  <p className="text-xs text-gray-500">
                    Supports UPI screenshots, bills, invoices - JPG, PNG formats
                  </p>
                </div>
              </div>

              {processing && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm font-medium text-blue-800">AI Processing Receipt...</p>
                  <p className="text-xs text-blue-600">Extracting data using intelligent OCR</p>
                </div>
              )}

              {ocrResult && (
                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-green-800">✅ AI Extraction Complete</h4>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {ocrResult.confidence}% Confidence
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Amount:</span>
                      <span className="ml-2 text-green-700 font-semibold">₹{ocrResult.amount}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Vendor:</span>
                      <span className="ml-2">{ocrResult.vendor}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Payment:</span>
                      <span className="ml-2">{ocrResult.paymentMode}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <span className="ml-2">{ocrResult.category}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button onClick={confirmOcrResult} size="sm">
                      ✓ Accept & Save
                    </Button>
                    <Button onClick={() => setOcrResult(null)} variant="outline" size="sm">
                      Edit Manually
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Demo Message */}
        <Card className="p-6 text-center bg-gradient-to-r from-blue-50 to-green-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI OCR System Active</h3>
          <p className="text-gray-600 mb-4">
            Advanced receipt processing with intelligent data extraction
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center space-x-2">
              <Camera className="h-4 w-4 text-blue-600" />
              <span>UPI Screenshots</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Eye className="h-4 w-4 text-green-600" />
              <span>Bill Recognition</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Search className="h-4 w-4 text-purple-600" />
              <span>Smart Categories</span>
            </div>
          </div>
        </Card>
      </div>
    </FurniliLayout>
  );
}
