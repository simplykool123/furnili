import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, 
  FileText, 
  Share2, 
  Trash2, 
  Edit, 
  Download,
  Clock,
  IndianRupee,
  Calendar
} from "lucide-react";
import type { Quote, QuoteItem, SelectClient } from "@/types";
import { QuoteEditor } from "./QuoteEditor";

interface ProjectQuotesProps {
  projectId: number;
}

export default function ProjectQuotes({ projectId }: ProjectQuotesProps) {
  const [showQuoteEditor, setShowQuoteEditor] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharingQuote, setSharingQuote] = useState<Quote | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch quotes for this project
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", projectId],
    queryFn: () => apiRequest(`/api/quotes?projectId=${projectId}`),
  });

  // Fetch quote items for calculations
  const { data: quoteItems = [] } = useQuery({
    queryKey: ["quote-items"],
    queryFn: () => apiRequest("/api/quote-items"),
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteId: number) => apiRequest(`/api/quotes/${quoteId}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete quote",
        variant: "destructive",
      });
    }
  });

  const deleteQuote = (quoteId: number) => {
    deleteQuoteMutation.mutate(quoteId);
  };

  const handleCreateQuote = () => {
    setEditingQuote(null);
    setShowQuoteEditor(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setShowQuoteEditor(true);
  };

  const handleCloseEditor = () => {
    setShowQuoteEditor(false);
    setEditingQuote(null);
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  };

  const handleShareQuote = (quote: Quote) => {
    setSharingQuote(quote);
    setShowShareDialog(true);
  };

  // Calculate totals for a quote
  const calculateTotals = (quoteId?: number) => {
    if (!quoteId) return { subtotal: 0, totalDiscountAmount: 0, totalTaxAmount: 0, total: 0 };

    const items = quoteItems.filter((item: QuoteItem) => item.quoteId === quoteId);
    
    const subtotal = items.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);

    const totalDiscountAmount = items.reduce((sum, item) => {
      return sum + (item.discountAmount || 0);
    }, 0);

    const totalTaxAmount = items.reduce((sum, item) => {
      return sum + (item.taxAmount || 0);
    }, 0);

    const total = items.reduce(
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

  // Export PDF function using server's finalized format
  const handleExportPDF = async (quote: Quote) => {
    try {
      // Get the properly formatted HTML from server
      const response = await apiRequest(`/api/quotes/${quote.id}/pdf`);
      const { html, filename } = response;

      console.log("PDF Response received:", { html: html?.substring(0, 100) + "...", filename });

      // Create element and set the server-generated HTML
      const element = document.createElement("div");
      element.innerHTML = html;

      // Import html2pdf and generate PDF
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename || `Quote_${quote.quoteNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export PDF function for WhatsApp sharing
  const downloadPDFAndShare = async (quoteId: number, clientPhone?: string) => {
    try {
      console.log("Starting downloadPDFAndShare with quoteId:", quoteId, "clientPhone:", clientPhone);
      
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) {
        toast({
          title: "Error",
          description: "Quote not found",
          variant: "destructive",
        });
        return;
      }

      // Get the properly formatted HTML from server
      const response = await apiRequest(`/api/quotes/${quoteId}/pdf`);
      const { html, filename } = response;

      console.log("PDF Response received:", { html: html?.substring(0, 100) + "...", filename });

      // Create element and set the server-generated HTML
      const element = document.createElement("div");
      element.innerHTML = html;

      // Import html2pdf and generate PDF
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename || `Quote_${quote.quoteNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(element).save();

      // Prepare WhatsApp message
      const phoneNumber = clientPhone?.replace(/\D/g, '') || '';
      const message = encodeURIComponent(
        `Hello! Please find the quotation for your furniture requirement.\n\n` +
        `📄 Quote Number: ${quote.quoteNumber}\n` +
        `📅 Date: ${new Date(quote.createdAt).toLocaleDateString('en-GB')}\n` +
        `💰 Total Amount: ₹${quote.totalAmount?.toLocaleString()}\n\n` +
        `The PDF has been downloaded to your device. Please attach it to this chat.\n\n` +
        `For any queries, feel free to contact us.\n\n` +
        `Best regards,\nFurnili Team`
      );

      // Open WhatsApp with pre-filled message
      const whatsappUrl = phoneNumber 
        ? `https://wa.me/91${phoneNumber}?text=${message}`
        : `https://wa.me/?text=${message}`;
      
      // Small delay to ensure PDF download completes
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 1000);

      toast({
        title: "Success",
        description: "PDF downloaded successfully. WhatsApp is opening...",
      });

    } catch (error) {
      console.error("Download and share error:", error);
      toast({
        title: "Error",
        description: "Failed to download PDF or open WhatsApp. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quotes</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quotes</h3>
        <Button onClick={handleCreateQuote} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Quote
        </Button>
      </div>

      <div className="grid gap-4">
        {quotes.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No quotes created yet</p>
            <Button onClick={handleCreateQuote}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Quote
            </Button>
          </Card>
        ) : (
          quotes.map((quote: Quote) => {
            const totals = calculateTotals(quote.id);
            
            return (
              <Card key={quote.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-lg">{quote.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {quote.quoteNumber}
                      </Badge>
                      <Badge 
                        variant={quote.status === 'sent' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {quote.status || 'draft'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(quote.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4" />
                        <span>₹{(totals.total || quote.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Valid till: {quote.validTill ? new Date(quote.validTill).toLocaleDateString('en-GB') : 'Not set'}</span>
                      </div>
                    </div>

                    {quote.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {quote.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditQuote(quote)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit Quote</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportPDF(quote)}
                            className="h-8 w-8 p-0"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Export PDF</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShareQuote(quote)}
                            className="h-8 w-8 p-0"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Share via WhatsApp</p>
                        </TooltipContent>
                      </Tooltip>

                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Quote</p>
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{quote.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteQuote(quote.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TooltipProvider>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Quote Editor Dialog */}
      {showQuoteEditor && (
        <Dialog open={showQuoteEditor} onOpenChange={setShowQuoteEditor}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuote ? `Edit Quote - ${editingQuote.quoteNumber}` : "Create New Quote"}
              </DialogTitle>
            </DialogHeader>
            <QuoteEditor
              quoteId={editingQuote?.id}
              projectId={projectId}
              onSave={handleCloseEditor}
              onCancel={handleCloseEditor}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Quote</DialogTitle>
            <DialogDescription>
              Share quote {sharingQuote?.quoteNumber} via WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">{sharingQuote?.title}</h4>
                <p className="text-sm text-gray-500">₹{sharingQuote?.totalAmount?.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => downloadPDFAndShare(sharingQuote?.id!, sharingQuote?.clientPhone)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF & Open WhatsApp
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                PDF will be downloaded to your device. WhatsApp will open with a pre-filled message. 
                You can then attach the downloaded PDF manually.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}