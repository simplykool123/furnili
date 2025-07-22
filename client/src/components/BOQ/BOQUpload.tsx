import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { ocrService } from "@/lib/ocr";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, CheckCircle, AlertCircle, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BOQExtractedItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  matchedProductId?: number;
}

interface OCRResult {
  items: BOQExtractedItem[];
  projectName?: string;
  totalValue: number;
  client?: string;
  workOrderNumber?: string;
  workOrderDate?: string;
  description?: string;
}

export default function BOQUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOCRProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<OCRResult | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products for matching
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/products');
      return response.json();
    },
  });

  // Fetch BOQ uploads
  const { data: boqUploads, isLoading: isLoadingUploads } = useQuery({
    queryKey: ['/api/boq'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/boq');
      return response.json();
    },
  });

  const uploadBOQMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('boqFile', file);
      
      const response = await fetch('/api/boq/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload BOQ');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boq'] });
      toast({
        title: "BOQ uploaded successfully",
        description: "File has been uploaded and is being processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await authenticatedApiRequest('POST', '/api/requests', requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      toast({
        title: "Material request created",
        description: "Request has been created from BOQ data.",
      });
      setShowExtractedData(false);
      setExtractedData(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to create request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File too large",
        description: "File must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setOCRProgress(0);

    try {
      // Upload file first
      await uploadBOQMutation.mutateAsync(file);

      // Process with OCR
      const result = await ocrService.processBOQPDF(file, (progress) => {
        setOCRProgress(progress * 100);
      });

      setExtractedData(result);
      setShowExtractedData(true);
      
      toast({
        title: "OCR processing completed",
        description: `Extracted ${result.items.length} items from the BOQ.`,
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process BOQ file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setOCRProgress(0);
    }
  }, [uploadBOQMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
  });

  const updateExtractedItem = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    
    const updatedItems = [...extractedData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate amount if quantity or rate changed
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }
    
    const totalValue = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    
    setExtractedData({
      ...extractedData,
      items: updatedItems,
      totalValue,
    });
  };

  const createMaterialRequest = () => {
    if (!extractedData) return;

    const validItems = extractedData.items.filter(item => item.matchedProductId);
    
    if (validItems.length === 0) {
      toast({
        title: "No products matched",
        description: "Please match at least one item to a product.",
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      request: {
        clientName: extractedData.client || extractedData.projectName || 'BOQ Project',
        orderNumber: extractedData.workOrderNumber || `BOQ-${Date.now()}`,
        boqReference: `${extractedData.projectName || 'BOQ'}-${extractedData.workOrderNumber || Date.now()}`,
        remarks: `Created from BOQ: ${extractedData.projectName} (${validItems.length} items)${extractedData.description ? ` - ${extractedData.description}` : ''}`,
        priority: 'medium'
      },
      items: validItems.map(item => ({
        productId: item.matchedProductId,
        requestedQuantity: item.quantity,
        unitPrice: 0, // Will be fetched from product data
        totalPrice: 0 // Will be calculated by backend
      }))
    };

    createRequestMutation.mutate(requestData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload BOQ PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            {isDragActive ? (
              <p className="text-lg font-medium text-primary">Drop the PDF here...</p>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your BOQ PDF here
                </h3>
                <p className="text-gray-600 mb-4">or click to browse files</p>
                <Button type="button">Choose PDF File</Button>
                <p className="text-sm text-gray-500 mt-4">
                  Supported formats: PDF (Max size: 10MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Processing BOQ...</h4>
                <p className="text-sm text-gray-600">Extracting data using OCR technology</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={ocrProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">{Math.round(ocrProgress)}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data */}
      {showExtractedData && extractedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Extracted BOQ Data
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowExtractedData(false)}
                >
                  Close
                </Button>
                <Button onClick={createMaterialRequest}>
                  Create Material Request
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Project Information */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Project:</span>
                  <p className="text-gray-900">{extractedData.projectName || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Client:</span>
                  <p className="text-gray-900">{extractedData.client || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Work Order #:</span>
                  <p className="text-gray-900">{extractedData.workOrderNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Work Order Date:</span>
                  <p className="text-gray-900">{extractedData.workOrderDate || 'N/A'}</p>
                </div>
              </div>
              {extractedData.description && (
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="text-gray-900 text-sm mt-1">{extractedData.description}</p>
                </div>
              )}
              <div className="mt-3">
                <span className="font-medium text-gray-700">Total Items Extracted:</span>
                <span className="text-gray-900 ml-2">{extractedData.items.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Thickness</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Match Product</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.items.map((item, index) => {
                    // Parse product name, thickness, and size from description
                    const parseDescription = (desc: string) => {
                      // Example: "Gurjan Plywood - 18mm - 8 X 4 feet"
                      const parts = desc.split(' - ');
                      const productName = parts[0] || desc;
                      const thickness = parts.find(p => p.includes('mm')) || '';
                      const size = parts.find(p => p.includes('X') || p.includes('x') || p.includes('feet') || p.includes('ft')) || '';
                      return { productName, thickness, size };
                    };
                    
                    const parsed = parseDescription(item.description);
                    
                    return (
                      <TableRow key={index}>
                      <TableCell>
                        <input
                          type="text"
                          value={(item as any).productName || parsed.productName}
                          onChange={(e) => updateExtractedItem(index, 'productName', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded"
                          placeholder="Product Name"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={(item as any).thickness || parsed.thickness}
                          onChange={(e) => updateExtractedItem(index, 'thickness', e.target.value)}
                          className="w-20 p-2 border border-gray-300 rounded"
                          placeholder="18mm"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={(item as any).size || parsed.size}
                          onChange={(e) => updateExtractedItem(index, 'size', e.target.value)}
                          className="w-24 p-2 border border-gray-300 rounded"
                          placeholder="8x4 ft"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateExtractedItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 p-2 border border-gray-300 rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateExtractedItem(index, 'unit', e.target.value)}
                          className="w-20 p-2 border border-gray-300 rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.matchedProductId?.toString() || "none"}
                          onValueChange={(value) => updateExtractedItem(index, 'matchedProductId', (value && value !== 'none') ? parseInt(value) : undefined)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No match</SelectItem>
                            {products?.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} ({product.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total BOQ Value:</span>
                <span className="text-2xl font-bold text-primary">
                  ₹{extractedData.totalValue.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent BOQ Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUploads ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {boqUploads?.map((upload: any) => (
                <div key={upload.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">{upload.originalName}</p>
                      <p className="text-sm text-gray-600">
                        Uploaded {new Date(upload.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(upload.status)}
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!boqUploads || boqUploads.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No BOQ files uploaded yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
