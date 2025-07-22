import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { toast } from "@/hooks/use-toast";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Plus, Search, Filter, Download, Upload, Camera, Eye, Share2 } from "lucide-react";
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
  status: string;
  addedBy: number;
  createdAt: string;
  orderNo?: string; // Add orderNo field
  user?: { id: number; name: string; email: string; username?: string }; // Add username field
}

interface PettyCashStats {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  currentMonthExpenses: number;
}

const paymentModes = ["UPI", "GPay", "PhonePe", "Paytm", "Cash", "Bank Transfer", "Card", "Cheque"];
const categories = ["Material", "Transport", "Site", "Office", "Food", "Fuel", "Repair", "Other"];

export default function PettyCash() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  
  // Form state - Updated to match user requirements
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    paidTo: "", // Name of person/vendor
    paidBy: "", // Staff member who paid (linked to user)
    purpose: "", // Purpose/Description 
    orderNo: "", // Order No./Client Reference
    receiptImage: null as File | null,
    category: "", // Keep for filtering
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // Fetch expenses and stats
  const { data: expenses = [] } = useQuery({
    queryKey: ["/api/petty-cash"],
    queryFn: () => authenticatedApiRequest("GET", "/api/petty-cash"),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/petty-cash/stats"],
    queryFn: () => authenticatedApiRequest("GET", "/api/petty-cash/stats"),
  });

  // Fetch users for Paid By dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => authenticatedApiRequest("GET", "/api/users"),
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
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Expense added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add expense", variant: "destructive" });
      console.error("Error adding expense:", error);
    },
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      paidTo: "",
      paidBy: "",
      purpose: "",
      orderNo: "",
      receiptImage: null,
      category: "",
    });
  };

  // Enhanced OCR processing for UPI payment screenshots with improved parsing
  const processImageWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });
      
      const text = result.data.text;
      console.log('OCR Result:', text);
      
      const updatedData = { ...formData };
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Extract amount (look for standalone number, often on its own line)
      for (const line of lines) {
        const amountMatch = line.match(/^₹?[\s]?([0-9,]+\.?[0-9]*)$/);
        if (amountMatch) {
          const amount = amountMatch[1].replace(/,/g, '');
          updatedData.amount = amount;
          break;
        }
      }
      
      // Extract Paid By and Paid To from payment context
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Pattern: "Name paid" - extract the name before "paid"
        if (line.toLowerCase().includes('paid') && !line.toLowerCase().includes('securely')) {
          const paidByMatch = line.match(/^(.+?)\s+paid/i);
          if (paidByMatch) {
            const paidByName = paidByMatch[1].trim();
            // Find user ID by name
            const matchingUser = users.find((user: any) => 
              (user.name && user.name.toLowerCase().includes(paidByName.toLowerCase())) ||
              (user.username && user.username.toLowerCase().includes(paidByName.toLowerCase()))
            );
            if (matchingUser) {
              updatedData.paidBy = matchingUser.id.toString();
            }
          }
          
          // Next line after "paid" is usually the recipient
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            // Check if it looks like a name (contains letters, not email/UPI ID)
            if (/^[a-zA-Z\s]+$/.test(nextLine) && nextLine.length > 3 && !nextLine.includes('@')) {
              updatedData.paidTo = nextLine;
            }
          }
        }
      }
      
      // Extract purpose/description - look for descriptive text
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        // Skip technical lines and focus on descriptive content
        if (line.length > 5 && 
            !lowerLine.includes('paid') && 
            !lowerLine.includes('@') && 
            !lowerLine.includes('txn') &&
            !lowerLine.includes('powered') &&
            !lowerLine.includes('cred') &&
            !lowerLine.includes('securely') &&
            !/^[0-9,\.\s₹]+$/.test(line) &&
            !lowerLine.includes('jul') &&
            !lowerLine.includes('pm') &&
            line.includes(' ')) { // Ensure it has multiple words
          
          // Extract purpose and order details
          const purposeText = line;
          
          // Try to separate purpose and order number
          const orderMatch = purposeText.match(/(.+?)\s*[-–]\s*(.+?)\s+order/i);
          if (orderMatch) {
            updatedData.purpose = orderMatch[1].trim();
            updatedData.orderNo = orderMatch[2].trim() + " Order";
          } else {
            updatedData.purpose = purposeText;
          }
          break;
        }
      }
      
      // Extract date
      const dateMatch = text.match(/(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const monthNum = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(month.toUpperCase()) + 1;
        if (monthNum > 0) {
          const formattedDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          updatedData.date = formattedDate;
        }
      }
      
      setFormData(updatedData);
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
      setFormData(prev => ({ ...prev, receiptImage: file }));
      
      // Auto-process with OCR if it's an image
      if (file.type.startsWith('image/')) {
        processImageWithOCR(file);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('expenseDate', formData.date);
    formDataToSend.append('paidTo', formData.paidTo);
    formDataToSend.append('amount', formData.amount);
    formDataToSend.append('paidBy', formData.paidBy);
    formDataToSend.append('note', formData.purpose);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('orderNo', formData.orderNo);
    
    if (formData.receiptImage) {
      formDataToSend.append('receipt', formData.receiptImage);
    }
    
    addExpenseMutation.mutate(formDataToSend);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: PettyCashExpense) => {
    const matchesSearch = expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || expense.category === selectedCategory;
    const matchesPaymentMode = !selectedPaymentMode || selectedPaymentMode === 'all' || expense.paymentMode === selectedPaymentMode;
    const matchesDate = !dateFilter || expense.expenseDate.startsWith(dateFilter);
    
    return matchesSearch && matchesCategory && matchesPaymentMode && matchesDate;
  });

  // Export functions
  const exportToWhatsApp = () => {
    const text = filteredExpenses.map((expense: PettyCashExpense) => 
      `📄 ${expense.vendor}\n💰 ₹${expense.amount}\n📅 ${format(new Date(expense.expenseDate), 'dd MMM yyyy')}\n🏷️ ${expense.category}\n💳 ${expense.paymentMode || 'N/A'}\n${expense.description ? `📝 ${expense.description}\n` : ''}\n---`
    ).join('\n\n');
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`💰 Petty Cash Report\n\n${text}\n\n💸 Total: ₹${filteredExpenses.reduce((sum: number, exp: PettyCashExpense) => sum + exp.amount, 0)}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const exportToExcel = () => {
    const csvContent = [
      'Date,Paid To,Amount,Payment Mode,Category,Description',
      ...filteredExpenses.map((expense: PettyCashExpense) => 
        `${expense.expenseDate},"${expense.vendor}",${expense.amount},"${expense.paymentMode || 'N/A'}","${expense.category}","${expense.description || ''}"`
      )
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Petty Cash Management</h1>
          <p className="text-sm text-gray-600 mt-1">Track expenses and manage cash flow</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="sm:hidden">Add New Expense</span>
          <span className="hidden sm:inline">Add Expense</span>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{stats.totalExpenses?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{stats.totalIncome?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{stats.balance?.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.currentMonthExpenses?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:gap-4">
            <div className="lg:flex-1 lg:min-w-[200px] sm:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full lg:w-[150px]">
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
            <div>
              <Label htmlFor="payment-filter">Payment Mode</Label>
              <Select value={selectedPaymentMode} onValueChange={setSelectedPaymentMode}>
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full lg:w-[150px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:col-span-2 lg:col-span-1">
              <Button variant="outline" onClick={exportToWhatsApp} className="flex-1 sm:flex-none">
                <Share2 className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="flex-1 sm:flex-none">
                <Download className="mr-2 h-4 w-4" />
                Excel
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Order No.</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense: PettyCashExpense) => (
                <TableRow key={expense.id}>
                  <TableCell>{format(new Date(expense.expenseDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-semibold text-green-600">₹{expense.amount.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">{expense.vendor}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.user?.name || expense.user?.username || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{expense.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{expense.orderNo || '-'}</TableCell>
                  <TableCell>
                    {expense.receiptImageUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedImage(expense.receiptImageUrl!);
                          setShowImageDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-gray-400">No receipt</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No expenses found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                  placeholder="2700"
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
                  placeholder="Dolly Vikesh Oswal"
                  value={formData.paidTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paidBy">Paid By (Staff Member) *</Label>
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
                placeholder="Furnili powder coating for legs – Pintu order"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNo">Order No. / Client Reference</Label>
                <Input
                  id="orderNo"
                  placeholder="Pintu Order"
                  value={formData.orderNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, orderNo: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="category">Category (For Reports)</Label>
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

            {/* Proof Attachment with OCR */}
            <div>
              <Label htmlFor="receipt">Proof Attachment (GPay, CRED, Invoice, etc.)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {isProcessingOCR && (
                  <Badge variant="secondary">Processing OCR...</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                📱 Upload UPI payment screenshot for automatic data extraction (GPay, PhonePe, CRED)
              </p>
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
    </div>
  );
}