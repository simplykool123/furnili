import { Response } from "express";
import { storage } from "../storage";

export const exportProductsCSV = async (res: Response) => {
  try {
    const salesProducts = await storage.getAllSalesProducts();
    
    if (!salesProducts || salesProducts.length === 0) {
      throw new Error("No products found for export");
    }
    
    const csvHeaders = "ID,Name,Category,Description,Size,Unit Price,Tax,Active,Created At\n";
    
    const csvData = salesProducts.map(product => 
      `${product.id},"${(product.name || '').replace(/"/g, '""')}","${(product.category || '').replace(/"/g, '""')}","${(product.description || '').replace(/"/g, '""')}","${(product.size || '').replace(/"/g, '""')}",${product.unitPrice || 0},${product.taxPercentage || 0},${product.isActive},${product.createdAt ? new Date(product.createdAt).toISOString() : ''}`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=inventory_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportRequestsCSV = async (res: Response) => {
  try {
    const requests = await storage.getAllMaterialRequests();
    
    if (!requests || requests.length === 0) {
      throw new Error("No material requests found for export");
    }
    
    const csvHeaders = "ID,Client Name,Order Number,Status,Priority,Total Value,Requested By,Created At\n";
    
    const csvData = requests.map(request => 
      `${request.id},"${(request.clientName || '').replace(/"/g, '""')}","${(request.orderNumber || '').replace(/"/g, '""')}","${(request.status || '').replace(/"/g, '""')}","${(request.priority || '').replace(/"/g, '""')}",${request.totalValue || 0},${request.requestedBy || ''},${request.createdAt ? new Date(request.createdAt).toISOString() : ''}`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=material_requests.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export requests error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};

export const exportLowStockCSV = async (res: Response) => {
  try {
    const salesProducts = await storage.getAllSalesProducts();
    
    if (!salesProducts || salesProducts.length === 0) {
      throw new Error("No products found for low stock analysis");
    }
    
    // Filter products that need attention - low price items or missing description
    const lowStockProducts = salesProducts.filter(p => !p.description || p.unitPrice < 5000);
    
    if (lowStockProducts.length === 0) {
      // Create empty CSV with headers
      const csvHeaders = "ID,Name,Category,Description,Price,Status,Action Needed\n";
      const noDataRow = ",,,,,'No low stock items found',''";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    const csvHeaders = "ID,Name,Category,Description,Price,Status,Action Needed\n";
    
    const csvData = lowStockProducts.map(product => 
      `${product.id},"${(product.name || '').replace(/"/g, '""')}","${(product.category || '').replace(/"/g, '""')}","${(product.description || 'Missing description').replace(/"/g, '""')}",${product.unitPrice || 0},"Requires attention","${!product.description ? 'Add description' : 'Verify pricing'}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export low stock error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};