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
import { Plus, MessageCircle, Send, Phone, Download, Copy } from "lucide-react";

export default function WhatsAppExport() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: materialRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/material-requests"],
  });

  const { data: priceComparisons, isLoading: comparisonsLoading } = useQuery({
    queryKey: ["/api/price-comparisons"],
  });

  const generateMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedApiRequest("/api/whatsapp/generate-message", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setCustomMessage(data.message);
      toast({
        title: "Message generated",
        description: "WhatsApp message has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedApiRequest("/api/whatsapp/send", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "WhatsApp message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const templates = {
    "low-stock": "Low Stock Alert",
    "material-request": "Material Request",
    "price-comparison": "Price Comparison",
    "inventory-report": "Inventory Report",
    "custom": "Custom Message"
  };

  const handleGenerateMessage = () => {
    if (!selectedTemplate) {
      toast({
        title: "Template required",
        description: "Please select a message template first.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      template: selectedTemplate,
      items: selectedItems,
      phoneNumber,
    };

    generateMessageMutation.mutate(data);
  };

  const handleSendMessage = () => {
    if (!phoneNumber || !customMessage) {
      toast({
        title: "Missing information",
        description: "Please enter phone number and message.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      phoneNumber,
      message: customMessage,
    };

    sendWhatsAppMutation.mutate(data);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(customMessage);
    toast({
      title: "Copied",
      description: "Message copied to clipboard.",
    });
  };

  const openWhatsApp = () => {
    if (!phoneNumber || !customMessage) {
      toast({
        title: "Missing information",
        description: "Please enter phone number and message.",
        variant: "destructive",
      });
      return;
    }

    const encodedMessage = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, "")}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleItemSelection = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const isLoading = productsLoading || requestsLoading || comparisonsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const getItemsForTemplate = () => {
    switch (selectedTemplate) {
      case "low-stock":
        return products?.filter((p: any) => p.currentStock <= p.minStock) || [];
      case "material-request":
        return materialRequests?.filter((r: any) => r.status === "pending") || [];
      case "price-comparison":
        return priceComparisons || [];
      case "inventory-report":
        return products || [];
      default:
        return [];
    }
  };

  const renderItemsTable = () => {
    const items = getItemsForTemplate();
    if (!items.length) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Select Items to Include</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(items.map((item: any) => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.name || item.clientName || item.productName}
                  </TableCell>
                  <TableCell>
                    {selectedTemplate === "low-stock" && (
                      `Stock: ${item.currentStock}/${item.minStock} ${item.unit}`
                    )}
                    {selectedTemplate === "material-request" && (
                      `Order: ${item.orderNumber}`
                    )}
                    {selectedTemplate === "price-comparison" && (
                      `Suppliers: ${item.suppliers?.length || 0}`
                    )}
                    {selectedTemplate === "inventory-report" && (
                      `Stock: ${item.currentStock} ${item.unit}`
                    )}
                  </TableCell>
                  <TableCell>
                    {selectedTemplate === "low-stock" && (
                      <Badge variant="destructive">Low Stock</Badge>
                    )}
                    {selectedTemplate === "material-request" && (
                      <Badge variant="secondary">{item.status}</Badge>
                    )}
                    {selectedTemplate === "price-comparison" && (
                      <Badge variant="default">Compared</Badge>
                    )}
                    {selectedTemplate === "inventory-report" && (
                      <Badge variant={item.currentStock > item.minStock ? "default" : "destructive"}>
                        {item.currentStock > item.minStock ? "In Stock" : "Low Stock"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">WhatsApp Export</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Message Composer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template">Message Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select message template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(templates).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            {selectedTemplate && selectedTemplate !== "custom" && (
              <Button
                onClick={handleGenerateMessage}
                disabled={generateMessageMutation.isPending}
                className="w-full"
              >
                {generateMessageMutation.isPending ? "Generating..." : "Generate Message"}
              </Button>
            )}

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                disabled={!customMessage}
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                onClick={openWhatsApp}
                disabled={!phoneNumber || !customMessage}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Open WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("low-stock");
                  handleGenerateMessage();
                }}
                className="justify-start"
              >
                <Badge className="mr-2 bg-red-100 text-red-800">Alert</Badge>
                Send Low Stock Alert
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("material-request");
                  handleGenerateMessage();
                }}
                className="justify-start"
              >
                <Badge className="mr-2 bg-blue-100 text-blue-800">Request</Badge>
                Share Material Requests
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("inventory-report");
                  handleGenerateMessage();
                }}
                className="justify-start"
              >
                <Badge className="mr-2 bg-green-100 text-green-800">Report</Badge>
                Send Inventory Report
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate("price-comparison");
                  handleGenerateMessage();
                }}
                className="justify-start"
              >
                <Badge className="mr-2 bg-purple-100 text-purple-800">Price</Badge>
                Share Price Comparisons
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Message Templates</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <div><strong>Low Stock:</strong> Alerts for items below minimum stock</div>
                <div><strong>Material Request:</strong> Pending material requests summary</div>
                <div><strong>Price Comparison:</strong> Supplier price comparisons</div>
                <div><strong>Inventory Report:</strong> Current inventory status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Selection */}
      {selectedTemplate && selectedTemplate !== "custom" && renderItemsTable()}

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Message Preview Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800">Low Stock Alert Template</h4>
              <p className="text-sm text-green-700 mt-1">
                🚨 Low Stock Alert 🚨<br/>
                The following items need restocking:<br/>
                • Steel Rods: 5/20 units<br/>
                • Cement Bags: 8/50 units<br/>
                Please arrange for procurement immediately.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800">Material Request Template</h4>
              <p className="text-sm text-blue-700 mt-1">
                📋 Material Request Update<br/>
                Order #MR001 - Building Project<br/>
                Status: Pending Approval<br/>
                Items: 15 (Total Value: ₹1,25,000)<br/>
                Please review and approve.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}