import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, Receipt, DollarSign, TrendingUp, Calendar, Upload } from "lucide-react";

export default function PettyCash() {
  const { toast } = useToast();
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "",
    receipt: null as File | null,
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/petty-cash"],
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ["/api/petty-cash/stats"],
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return authenticatedApiRequest("/api/petty-cash", {
        method: "POST",
        body: formData,
        headers: {}, // Remove Content-Type to let browser set it for FormData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      setIsAddingExpense(false);
      setExpenseForm({ description: "", amount: "", category: "", receipt: null });
      toast({
        title: "Expense added",
        description: "The expense has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("description", expenseForm.description);
    formData.append("amount", expenseForm.amount);
    formData.append("category", expenseForm.category);
    
    if (expenseForm.receipt) {
      formData.append("receipt", expenseForm.receipt);
    }

    addExpenseMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExpenseForm(prev => ({ ...prev, receipt: file }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const totalExpenses = expenses?.reduce((sum: number, expense: any) => sum + expense.amount, 0) || 0;
  const thisMonthExpenses = monthlyStats?.thisMonth || 0;
  const lastMonthExpenses = monthlyStats?.lastMonth || 0;
  const percentageChange = lastMonthExpenses > 0 
    ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Petty Cash Tracker</h1>
        <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter expense description"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={expenseForm.category}
                  onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office-supplies">Office Supplies</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="meals">Meals & Entertainment</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="receipt">Receipt (Optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload receipt image or PDF for OCR processing
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingExpense(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addExpenseMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{thisMonthExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Change</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(percentageChange) >= 0 ? "+" : ""}{percentageChange}%
            </div>
            <p className="text-xs text-muted-foreground">
              From last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Expense entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Added By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((expense: any) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {expense.category.replace("-", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">₹{expense.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {expense.receiptImageUrl ? (
                      <Button variant="outline" size="sm">
                        <Receipt className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      "No receipt"
                    )}
                  </TableCell>
                  <TableCell>{expense.addedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}