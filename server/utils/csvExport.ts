import { Response } from "express";
import { storage } from "../storage";

export const exportProductsCSV = async (res: Response) => {
  try {
    const salesProducts = await storage.getAllSalesProducts();
    
    const csvHeaders = "ID,Name,Category,Description,Size,Unit Price,Tax,Active,Created At\n";
    
    const csvData = salesProducts.map(product => 
      `${product.id},"${product.name}","${product.category}","${product.description || ''}","${product.size || ''}",${product.unitPrice || 0},${product.taxPercentage || 0},${product.isActive},"${product.createdAt}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=inventory_report.csv");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
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
    const salesProducts = await storage.getAllSalesProducts();
    // Filter products that need attention - low price items or missing description
    const lowStockProducts = salesProducts.filter(p => !p.description || p.unitPrice < 5000);
    
    const csvHeaders = "ID,Name,Category,Description,Price,Status,Action Needed\n";
    
    const csvData = lowStockProducts.map(product => 
      `${product.id},"${product.name}","${product.category}","${product.description || 'Missing description'}",${product.unitPrice || 0},"Requires attention","${!product.description ? 'Add description' : 'Verify pricing'}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export low stock error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};