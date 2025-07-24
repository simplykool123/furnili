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
    <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Stock Availability Warnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stockWarnings.slice(0, 3).map((warning, index) => (
            <div key={`${warning.requestId}-${warning.productId}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{warning.productName}</div>
                  <div className="text-sm text-gray-600">
                    Request #{warning.orderNumber} • {warning.clientName}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="destructive" className="mb-1">
                  Insufficient Stock
                </Badge>
                <div className="text-sm text-gray-600">
                  Need: {warning.requestedQuantity} • Available: {warning.availableStock}
                </div>
              </div>
            </div>
          ))}
          {stockWarnings.length > 3 && (
            <div className="text-center pt-2">
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                +{stockWarnings.length - 3} more warnings
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}