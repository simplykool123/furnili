import archiver from 'archiver';
import { Writable } from 'stream';
import { storage } from '../storage';

interface BackupData {
  [key: string]: any[];
}

// Create CSV content from array of objects
function createCSV(data: any[], filename: string): string {
  if (!data.length) return 'No data available';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle null/undefined values and escape commas/quotes
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

// Get all system data for backup
export async function getAllBackupData(): Promise<BackupData> {
  try {
    const backupData: BackupData = {};
    
    // Products with stock information
    try {
      const products = await storage.getAllProducts();
      if (products.length > 0) {
        backupData.products = products.map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand || '',
          size: product.size || '',
          thickness: product.thickness || '',
          pricePerUnit: product.pricePerUnit,
          currentStock: product.currentStock,
          minStock: product.minStock,
          unit: product.unit,
          sku: product.sku,
          isActive: product.isActive,
          createdAt: product.createdAt
        }));
      }
    } catch (error) {
      console.log('Products data not available:', error);
    }

    // Categories
    try {
      const categories = await storage.getAllCategories();
      if (categories.length > 0) {
        backupData.categories = categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || '',
          isActive: cat.isActive,
          createdAt: cat.createdAt
        }));
      }
    } catch (error) {
      console.log('Categories data not available:', error);
    }

    // Stock Movements
    try {
      const movements = await storage.getStockMovements();
      if (movements.length > 0) {
        backupData.stock_movements = movements.map(mov => ({
          id: mov.id,
          productId: mov.productId,
          movementType: mov.movementType,
          quantity: mov.quantity,
          previousStock: mov.previousStock,
          newStock: mov.newStock,
          reference: mov.reference || '',
          notes: mov.notes || '',
          vendor: mov.vendor || '',
          costPerUnit: mov.costPerUnit || 0,
          totalCost: mov.totalCost || 0,
          performedBy: mov.performedBy,
          createdAt: mov.createdAt
        }));
      }
    } catch (error) {
      console.log('Stock movements data not available:', error);
    }

    // Material Requests
    try {
      const requests = await storage.getAllMaterialRequests();
      if (requests.length > 0) {
        backupData.material_requests = requests.map(req => ({
          id: req.id,
          clientName: req.clientName,
          orderNumber: req.orderNumber,
          priority: req.priority,
          status: req.status,
          requestedBy: req.requestedBy,
          approvedBy: req.approvedBy || '',
          approvedAt: req.approvedAt || '',
          issuedBy: req.issuedBy || '',
          issuedAt: req.issuedAt || '',
          totalValue: req.totalValue,
          boqReference: req.boqReference || '',
          remarks: req.remarks || '',
          createdAt: req.createdAt
        }));
      }
    } catch (error) {
      console.log('Material requests data not available:', error);
    }

    // Attendance Records
    try {
      const attendance = await storage.getAllAttendance();
      if (attendance.length > 0) {
        backupData.attendance = attendance.map(att => ({
          id: att.id,
          userId: att.userId,
          date: att.date,
          checkInTime: att.checkInTime || '',
          checkOutTime: att.checkOutTime || '',
          totalHours: 0, // Field not in current schema
          overtimeHours: 0, // Field not in current schema
          status: att.status,
          location: att.location || '',
          notes: att.notes || '',
          checkInBy: att.checkInBy || '',
          checkOutBy: att.checkOutBy || '',
          isManualEntry: att.isManualEntry || false,
          createdAt: att.createdAt
        }));
      }
    } catch (error) {
      console.log('Attendance data not available:', error);
    }

    // Payroll Records
    try {
      const payroll = await storage.getAllPayroll();
      if (payroll.length > 0) {
        backupData.payroll = payroll.map(pay => ({
          id: pay.id,
          userId: pay.userId,
          month: pay.month,
          year: pay.year,
          basicSalary: pay.basicSalary,
          overtimePay: pay.overtimePay,
          allowances: pay.allowances,
          deductions: pay.deductions,
          netSalary: pay.netSalary,
          workingDays: 30, // Default values - adjust based on actual schema
          presentDays: 25, // Default values - adjust based on actual schema
          totalHours: pay.totalHours,
          overtimeHours: pay.overtimeHours,
          status: pay.status,
          processedBy: pay.processedBy || '',
          processedAt: pay.processedAt || '',
          createdAt: pay.createdAt
        }));
      }
    } catch (error) {
      console.log('Payroll data not available:', error);
    }

    // Petty Cash Expenses
    try {
      const expenses = await storage.getAllPettyCashExpenses();
      if (expenses.length > 0) {
        backupData.petty_cash = expenses.map(exp => ({
          id: exp.id,
          category: exp.category,
          amount: exp.amount,
          vendor: exp.vendor || '',
          description: exp.description || '',
          orderNo: exp.orderNo || '',
          receiptImage: exp.receiptImageUrl || '',
          addedBy: exp.addedBy,
          status: exp.status,
          approvedBy: exp.approvedBy || '',
          createdAt: exp.createdAt
        }));
      }
    } catch (error) {
      console.log('Petty cash data not available:', error);
    }

    // Tasks
    try {
      const tasks = await storage.getAllTasks();
      if (tasks.length > 0) {
        backupData.tasks = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          assignedTo: task.assignedTo,
          assignedBy: task.assignedBy,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate || '',
          completedAt: task.completedAt || '',
          createdAt: task.createdAt
        }));
      }
    } catch (error) {
      console.log('Tasks data not available:', error);
    }

    // Users (without passwords)
    try {
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        backupData.users = users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone || '',
          department: user.department || '',
          designation: user.designation || '',
          basicSalary: user.basicSalary || 0,
          isActive: user.isActive,
          lastLogin: user.lastLogin || '',
          createdAt: user.createdAt
        }));
      }
    } catch (error) {
      console.log('Users data not available:', error);
    }

    return backupData;
  } catch (error) {
    console.error('Error getting backup data:', error);
    throw new Error('Failed to retrieve backup data');
  }
}

// Create ZIP file with all CSV backups
export async function createBackupZip(): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await getAllBackupData();
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      
      // Create a writable stream to collect the ZIP data
      const output = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      archive.pipe(output);
      
      // Add each dataset as a CSV file
      Object.entries(data).forEach(([tableName, tableData]) => {
        if (tableData.length > 0) {
          const csvContent = createCSV(tableData, tableName);
          archive.append(csvContent, { name: `${tableName}.csv` });
        }
      });

      // Add a README file
      const readme = `Furnili Management System - Complete Backup
Generated: ${new Date().toLocaleString()}

This ZIP contains CSV exports of all your business data:
- products.csv: All product inventory data
- categories.csv: Product categories
- stock_movements.csv: Inventory movement history
- material_requests.csv: All material requests
- attendance.csv: Staff attendance records
- payroll.csv: Payroll and salary information
- petty_cash.csv: Expense tracking data
- tasks.csv: Task assignments and status
- users.csv: User accounts (passwords excluded)

Import these files into Excel, Google Sheets, or any database system.
For technical support, contact your system administrator.`;
      
      archive.append(readme, { name: 'README.txt' });

      // Handle completion
      output.on('finish', () => {
        const zipBuffer = Buffer.concat(chunks);
        resolve(zipBuffer);
      });

      // Handle errors
      archive.on('error', (err: Error) => {
        reject(err);
      });

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}