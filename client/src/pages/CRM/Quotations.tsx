import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, FileText, Download, Send, Eye, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface QuotationItem {
  id: number;
  product: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  gst: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  validUntil: string;
  notes: string;
  createdAt: string;
}

export default function Quotations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([{ id: 1, product: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm();

  // Fetch quotations
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['/api/crm/quotations'],
    queryFn: () => authenticatedApiRequest('GET', '/api/crm/quotations')
  });

  // Mutation for creating/updating quotations
  const quotationMutation = useMutation({
    mutationFn: (data: any) => {
      const url = editingQuotation ? `/api/crm/quotations/${editingQuotation.id}` : '/api/crm/quotations';
      const method = editingQuotation ? 'PATCH' : 'POST';
      
      return authenticatedApiRequest(method, url, {
        ...data,
        items: quotationItems,
        subtotal: calculateSubtotal(),
        totalAmount: calculateTotal()
      });
    },
    onSuccess: () => {
      toast({
        title: `Quotation ${editingQuotation ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/quotations'] });
      setIsDialogOpen(false);
      form.reset();
      setEditingQuotation(null);
      setQuotationItems([{ id: 1, product: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingQuotation ? 'update' : 'create'} quotation`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    form.reset(quotation);
    setQuotationItems(quotation.items || [{ id: 1, product: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
    setIsDialogOpen(true);
  };

  const addQuotationItem = () => {
    const newId = Math.max(...quotationItems.map(item => item.id), 0) + 1;
    setQuotationItems([...quotationItems, { id: newId, product: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  };

  const updateQuotationItem = (id: number, field: string, value: any) => {
    setQuotationItems(items => items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate total when quantity, unitPrice, or discount changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
          updatedItem.total = (updatedItem.quantity * updatedItem.unitPrice) - updatedItem.discount;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removeQuotationItem = (id: number) => {
    if (quotationItems.length > 1) {
      setQuotationItems(items => items.filter(item => item.id !== id));
    }
  };

  const calculateSubtotal = () => {
    return quotationItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = parseFloat(form.watch('discount') || '0');
    const gst = parseFloat(form.watch('gst') || '18');
    
    const afterDiscount = subtotal - discount;
    const gstAmount = (afterDiscount * gst) / 100;
    return afterDiscount + gstAmount;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={`${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'} capitalize`}>
        {status}
      </Badge>
    );
  };

  const generateQuotationNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QT${year}${month}${day}${random}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600">Create and manage customer quotations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingQuotation(null);
              form.reset({ quotationNumber: generateQuotationNumber(), gst: 18 });
              setQuotationItems([{ id: 1, product: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuotation ? 'Edit' : 'Create New'} Quotation</DialogTitle>
              <DialogDescription>
                {editingQuotation ? 'Update quotation details and items.' : 'Create a new quotation for your customer with product details and pricing.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => quotationMutation.mutate(data))} className="space-y-6">
              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quotationNumber">Quotation Number *</Label>
                  <Input {...form.register('quotationNumber', { required: true })} placeholder="Auto-generated" />
                </div>
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input {...form.register('validUntil')} type="date" />
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input {...form.register('customerName', { required: true })} placeholder="Customer name" />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Customer Phone</Label>
                  <Input {...form.register('customerPhone')} placeholder="Phone number" />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input {...form.register('customerEmail')} type="email" placeholder="Email address" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => form.setValue('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quotation Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Quotation Items</Label>
                  <Button type="button" variant="outline" onClick={addQuotationItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {quotationItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-4">
                        <Label className="text-xs">Product/Service</Label>
                        <Input
                          value={item.product}
                          onChange={(e) => updateQuotationItem(item.id, 'product', e.target.value)}
                          placeholder="Product name"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuotationItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateQuotationItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Discount</Label>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateQuotationItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Total</Label>
                        <div className="text-sm font-medium p-2 bg-gray-50 rounded">
                          ₹{item.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeQuotationItem(item.id)}
                          disabled={quotationItems.length === 1}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount">Overall Discount</Label>
                  <Input {...form.register('discount')} type="number" placeholder="0" />
                </div>
                <div>
                  <Label htmlFor="gst">GST (%)</Label>
                  <Input {...form.register('gst')} type="number" placeholder="18" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                  <div className="text-lg font-bold text-green-600 p-2 bg-green-50 rounded">
                    ₹{calculateTotal().toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes & Terms</Label>
                <Textarea {...form.register('notes')} placeholder="Additional notes, terms and conditions" rows={3} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={quotationMutation.isPending}>
                  {quotationMutation.isPending ? 'Saving...' : 'Save Quotation'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Quotations ({quotations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation: Quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{quotation.customerName}</p>
                      <p className="text-sm text-gray-600">{quotation.customerPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{quotation.items?.length || 0} items</TableCell>
                  <TableCell className="font-semibold text-green-600">₹{quotation.totalAmount?.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                  <TableCell>
                    {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not set'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(quotation)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {quotations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No quotations found. Create your first quotation to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}