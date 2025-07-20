import { type Response } from "express";
import { storage } from "../storage";

export async function exportProductsCSV(res: Response, filters?: any) {
  try {
    const products = await storage.getAllProducts(filters);
    
    const csvHeaders = [
      'ID', 'Name', 'Category', 'Brand', 'Size', 'SKU', 'Price', 
      'Current Stock', 'Min Stock', 'Unit', 'Stock Status', 'Created At'
    ];
    
    const csvRows = products.map(product => [
      product.id,
      `"${product.name}"`,
      `"${product.category}"`,
      `"${product.brand || ''}"`,
      `"${product.size || ''}"`,
      `"${product.sku || ''}"`,
      product.price,
      product.currentStock,
      product.minStock,
      `"${product.unit}"`,
      `"${product.stockStatus}"`,
      product.createdAt?.toISOString().split('T')[0] || ''
    ]);
    
    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export products', error: error });
  }
}

export async function exportRequestsCSV(res: Response, filters?: any) {
  try {
    const requests = await storage.getAllMaterialRequests(filters);
    
    const csvHeaders = [
      'ID', 'Client Name', 'Order Number', 'Requested By', 'Status', 
      'Priority', 'Total Value', 'BOQ Reference', 'Created At', 'Approved At'
    ];
    
    const csvRows = requests.map(request => [
      request.id,
      `"${request.clientName}"`,
      `"${request.orderNumber}"`,
      `"${request.requestedByUser.name}"`,
      `"${request.status}"`,
      `"${request.priority}"`,
      request.totalValue,
      `"${request.boqReference || ''}"`,
      request.createdAt?.toISOString().split('T')[0] || '',
      request.approvedAt?.toISOString().split('T')[0] || ''
    ]);
    
    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="requests_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export requests', error: error });
  }
}

export async function exportLowStockCSV(res: Response) {
  try {
    const products = await storage.getLowStockProducts();
    
    const csvHeaders = [
      'ID', 'Name', 'Category', 'Current Stock', 'Min Stock', 
      'Stock Deficit', 'Unit', 'Price', 'Total Value'
    ];
    
    const csvRows = products.map(product => [
      product.id,
      `"${product.name}"`,
      `"${product.category}"`,
      product.currentStock,
      product.minStock,
      product.minStock - product.currentStock,
      `"${product.unit}"`,
      product.price,
      product.price * product.currentStock
    ]);
    
    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="low_stock_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export low stock data', error: error });
  }
}
