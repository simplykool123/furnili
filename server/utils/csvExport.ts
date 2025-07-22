import { Response } from "express";
import { storage } from "../storage";

export const exportProductsCSV = async (res: Response) => {
  try {
    const products = await storage.getAllProducts();
    
    const csvHeaders = "ID,Name,Category,Brand,Size,Thickness,SKU,Price Per Unit,Current Stock,Min Stock,Unit,Active,Created At\n";
    
    const csvData = products.map(product => 
      `${product.id},"${product.name}","${product.category}","${product.brand || ''}","${product.size || ''}","${product.thickness || ''}","${product.sku || ''}",${product.pricePerUnit},${product.currentStock},${product.minStock},"${product.unit}",${product.isActive},"${product.createdAt}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csvHeaders + csvData);
  } catch (error) {
    res.status(500).json({ message: "Export failed", error });
  }
};

export const exportRequestsCSV = async (res: Response) => {
  try {
    const requests = await storage.getAllMaterialRequests();
    
    const csvHeaders = "ID,Client Name,Order Number,Status,Priority,Total Value,Requested By,Created At\n";
    
    const csvData = requests.map(request => 
      `${request.id},"${request.clientName}","${request.orderNumber}","${request.status}","${request.priority}",${request.totalValue},${request.requestedBy},"${request.createdAt}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=material_requests.csv");
    res.send(csvHeaders + csvData);
  } catch (error) {
    res.status(500).json({ message: "Export failed", error });
  }
};

export const exportLowStockCSV = async (res: Response) => {
  try {
    const stats = await storage.getDashboardStats();
    const products = await storage.getAllProducts();
    const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);
    
    const csvHeaders = "ID,Name,Category,Current Stock,Min Stock,Shortage,Unit\n";
    
    const csvData = lowStockProducts.map(product => 
      `${product.id},"${product.name}","${product.category}",${product.currentStock},${product.minStock},${product.minStock - product.currentStock},"${product.unit}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
    res.send(csvHeaders + csvData);
  } catch (error) {
    res.status(500).json({ message: "Export failed", error });
  }
};