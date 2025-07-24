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
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-amber-900 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Stock Warnings ({stockWarnings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {stockWarnings.slice(0, 2).map((warning, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3 text-amber-600" />
                <div>
                  <div className="font-medium text-xs text-gray-900">{warning.productName}</div>
                  <div className="text-xs text-gray-600">
                    #{warning.orderNumber} • {warning.clientName}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-600 font-medium">
                  Need: {warning.requestedQuantity} | Have: {warning.availableStock}
                </div>
              </div>
            </div>
          ))}
          {stockWarnings.length > 2 && (
            <div className="text-center pt-1">
              <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                +{stockWarnings.length - 2} more
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}