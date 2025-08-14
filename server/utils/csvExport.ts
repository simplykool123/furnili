import { Response } from "express";
import { storage } from "../storage";

export const exportProductsCSV = async (res: Response) => {
  try {
    const products = await storage.getAllProducts(); // Use main products
    
    if (!products || products.length === 0) {
      throw new Error("No products found for export");
    }
    
    const csvHeaders = "ID,Name,Category,Description,SKU,Price,Stock Quantity,Min Stock Level,Active,Created At\n";
    
    const csvData = products.map(product => 
      `${product.id},"${(product.name || '').replace(/"/g, '""')}","${(product.category || '').replace(/"/g, '""')}","${(product.description || '').replace(/"/g, '""')}","${(product.sku || '').replace(/"/g, '""')}",${product.price || 0},${product.stockQuantity || 0},${product.minStockLevel || 0},${product.isActive || false},"${product.createdAt || ''}"`
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
      `${request.id},"${(request.clientName || '').replace(/"/g, '""')}","${(request.orderNumber || '').replace(/"/g, '""')}","${(request.status || '').replace(/"/g, '""')}","${(request.priority || '').replace(/"/g, '""')}",${request.totalValue || 0},"${request.requestedBy || ''}","${request.createdAt || ''}"`
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
    const products = await storage.getAllProducts(); // Use main products
    
    if (!products || products.length === 0) {
      throw new Error("No products found for low stock analysis");
    }
    
    // Filter products with stock below minimum threshold
    const lowStockProducts = products.filter(p => (p.stockQuantity || 0) < (p.minStockLevel || 10));
    
    if (lowStockProducts.length === 0) {
      // Create empty CSV with headers
      const csvHeaders = "ID,Name,Category,Current Stock,Min Stock Level,Status,Action Needed\n";
      const noDataRow = ",,,,,'No low stock items found',''";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    const csvHeaders = "ID,Name,Category,Current Stock,Min Stock Level,Status,Action Needed\n";
    
    const csvData = lowStockProducts.map(product => 
      `${product.id},"${(product.name || '').replace(/"/g, '""')}","${(product.category || '').replace(/"/g, '""')}",${product.stockQuantity || 0},${product.minStockLevel || 10},"Low Stock","Reorder required"`
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

export const exportAttendanceCSV = async (res: Response, month?: number, year?: number) => {
  try {
    const attendance = await storage.getAllAttendance();
    
    if (!attendance || attendance.length === 0) {
      // Create empty CSV with headers when no data
      const csvHeaders = "Date,Employee Name,Employee ID,Check In,Check Out,Total Hours,Status,Notes\n";
      const noDataRow = ",,,,,'No attendance records found',,";
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=attendance_report.csv");
      res.setHeader("Cache-Control", "no-cache");
      res.send(csvHeaders + noDataRow);
      return;
    }
    
    // Filter by month and year if provided
    let filteredAttendance = attendance;
    if (month && year) {
      filteredAttendance = attendance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year;
      });
    }
    
    // Get user details for each attendance record
    const attendanceWithUsers = await Promise.all(
      filteredAttendance.map(async (record) => {
        const user = await storage.getUser(record.userId);
        return {
          ...record,
          userName: user ? user.name || user.username : 'Unknown User'
        };
      })
    );
    
    const csvHeaders = "Date,Employee Name,Employee ID,Check In,Check Out,Total Hours,Status,Notes\n";
    
    const csvData = attendanceWithUsers.map(record => {
      const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const totalHours = record.totalHours || 0;
      
      return `"${record.date ? new Date(record.date).toLocaleDateString() : ''}","${(record.userName || '').replace(/"/g, '""')}","${record.userId || ''}","${checkInTime}","${checkOutTime}","${totalHours}","${record.status || 'present'}","${(record.notes || '').replace(/"/g, '""')}"`;
    }).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=attendance_report.csv");
    res.setHeader("Cache-Control", "no-cache");
    res.send(csvHeaders + csvData);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ message: "Export failed", error: (error as Error).message });
  }
};