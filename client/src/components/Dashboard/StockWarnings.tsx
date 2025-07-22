import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { authService } from "@/lib/auth";

interface MaterialRequest {
  id: number;
  clientName: string;
  orderNumber: string;
  status: string;
  items: any[];
}

interface Product {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  currentStock: number;
  unit: string;
}

interface StockWarning {
  productId: number;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  requestId: number;
  clientName: string;
  orderNumber: string;
}

export default function StockWarnings() {
  const user = authService.getUser();
  
  // Only show to store incharge and admins
  if (!user || !['admin', 'store_incharge'].includes(user.role)) {
    return null;
  }

  const { data: requests = [] } = useQuery<MaterialRequest[]>({
    queryKey: ["/api/requests"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Calculate stock warnings
  const stockWarnings: StockWarning[] = [];
  
  requests.forEach(request => {
    if (request.status === 'pending') {
      request.items?.forEach((item: any) => {
        const product = products.find(p => p.name === item.description);
        if (product && item.quantity > product.currentStock) {
          stockWarnings.push({
            productId: product.id,
            productName: product.name,
            requestedQuantity: item.quantity,
            availableStock: product.currentStock,
            requestId: request.id,
            clientName: request.clientName,
            orderNumber: request.orderNumber
          });
        }
      });
    }
  });

  if (stockWarnings.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="w-5 h-5" />
          Stock Warnings ({stockWarnings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stockWarnings.slice(0, 5).map((warning, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
            <div className="flex items-start gap-3">
              <Package className="w-4 h-4 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-gray-900">{warning.productName}</p>
                <p className="text-xs text-gray-600">
                  Request: {warning.orderNumber} - {warning.clientName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="destructive" className="text-xs">
                    Need: {warning.requestedQuantity}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Stock: {warning.availableStock}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-red-600">
                -{warning.requestedQuantity - warning.availableStock}
              </p>
              <p className="text-xs text-gray-500">Short</p>
            </div>
          </div>
        ))}
        {stockWarnings.length > 5 && (
          <p className="text-xs text-gray-600 text-center pt-2">
            And {stockWarnings.length - 5} more warnings...
          </p>
        )}
      </CardContent>
    </Card>
  );
}