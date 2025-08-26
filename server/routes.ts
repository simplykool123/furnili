import express, { type Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { z } from "zod";
// OpenAI import removed - AI generation functionality simplified
import { storage } from "./storage";
import { authenticateToken, requireRole, generateToken, comparePassword, type AuthRequest } from "./middleware/auth";
import { productImageUpload, boqFileUpload, receiptImageUpload, csvFileUpload, projectFileUpload } from "./utils/fileUpload";
import { 
  exportProductsCSV, 
  exportRequestsCSV, 
  exportLowStockCSV, 
  exportAttendanceCSV,
  exportQuotesCSV,
  exportSuppliersCSV,
  exportStockMovementsCSV,
  exportUserActivityCSV
} from "./utils/csvExport";
import { createBackupZip } from "./utils/backupExport";
import { canOrderMaterials, getMaterialRequestEligibleProjects, getStageDisplayName } from "./utils/projectStageValidation";
import { setupQuotesRoutes } from "./quotesRoutes";
// ObjectStorageService removed - using local storage only
import { db } from "./db";
import { calculateBOM, generateBOMNumber, convertDimensions, DEFAULT_RATES, calculateWardrobeBOM, calculateSheetOptimization } from "./utils/bomCalculations";
import { optimizeSheetCutting, OptimizedPanel, SheetDimensions } from "./utils/advanced-nesting";

import { eq, and, gt } from "drizzle-orm";
import { projectFiles, users, suppliers, products, purchaseOrders, purchaseOrderItems, stockMovements, bomCalculations, bomItems } from "@shared/schema";

// OpenAI client removed - AI functionality simplified
import {
  insertUserSchema,
  insertProductSchema,
  insertCategorySchema,
  insertClientSchema,
  insertProjectSchema,
  insertProjectLogSchema,
  insertMaterialRequestSchema,
  insertRequestItemSchema,
  insertBOQUploadSchema,
  insertAttendanceSchema,
  insertPettyCashExpenseSchema,
  insertTaskSchema,
  insertPriceComparisonSchema,

  insertMoodboardSchema,
  insertSalesProductSchema,
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertSupplierSchema,

  insertSupplierProductSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
} from "@shared/schema";

// Helper function to get rate from products table or fallback to default
const getBoardRate = async (boardType: string, thickness: string): Promise<number> => {
  try {
    // Try to find matching product in database first
    const searchName = `${thickness} ${boardType}`.toLowerCase();
    const [product] = await db.select()
      .from(products)
      .where(eq(products.isActive, true))
      .limit(1);
    
    // Look for products with matching thickness and board type
    const matchingProducts = await db.select()
      .from(products)  
      .where(eq(products.isActive, true));
    
    const match = matchingProducts.find(p => 
      p.thickness?.includes(thickness.replace('mm', '')) && 
      p.name.toLowerCase().includes(boardType.toLowerCase())
    );
    
    if (match && match.pricePerUnit) {
      return match.pricePerUnit;
    }
  } catch (error) {
    console.log('Could not fetch product pricing, using defaults');
  }
  
  // Fallback to hardcoded rates
  const cleanThickness = thickness.replace('mm', '');
  const cleanBoardType = boardType.toLowerCase();
  
  if (cleanBoardType.includes('ply')) {
    const key = `${cleanThickness}mm_plywood` as keyof typeof DEFAULT_RATES.board;
    return DEFAULT_RATES.board[key] || DEFAULT_RATES.board['18mm_plywood'];
  }
  if (cleanBoardType.includes('mdf')) {
    const key = `${cleanThickness}mm_mdf` as keyof typeof DEFAULT_RATES.board;
    return DEFAULT_RATES.board[key] || DEFAULT_RATES.board['18mm_mdf'];  
  }
  
  return 80; // final fallback
};

// ✅ ADVANCED SHEET OPTIMIZATION WRAPPER
function calculateAdvancedSheetOptimization(boardPanels: any[]) {
  // Convert BOM panels to advanced optimizer format
  const optimizedPanels: OptimizedPanel[] = boardPanels.map((panel, index) => ({
    id: `panel_${index}`,
    width: panel.length || 600,  // mm
    height: panel.width || 300,  // mm  
    thickness: panel.thickness,
    quantity: panel.qty || 1,
    allowRotation: true
  }));

  // Standard plywood sheet dimensions (8x4 feet = 2440x1220mm)
  const sheetDimensions: SheetDimensions = {
    width: 2440,  // 8 feet
    height: 1220, // 4 feet  
    thickness: 18 // most common thickness
  };

  // Run advanced optimization
  const result = optimizeSheetCutting(optimizedPanels, sheetDimensions, {
    cutWidth: 3,        // 3mm saw kerf
    margin: 5,          // 5mm safety margin
    allowRotation: true
  });

  console.log('=== ADVANCED SHEET OPTIMIZATION RESULTS ===');
  console.log(`Total sheets needed: ${result.sheets.length}`);
  console.log(`Total utilization: ${(result.totalUtilization * 100).toFixed(1)}%`);
  console.log(`Total waste area: ${result.totalWaste.toFixed(0)} mm²`);
  console.log(`Optimization time: ${result.optimizationTime}ms`);
  
  result.sheets.forEach((sheet, index) => {
    console.log(`Sheet ${index + 1}: ${sheet.placedPanels.length} panels, ${(sheet.utilization * 100).toFixed(1)}% utilized`);
  });

  // Convert back to legacy format for compatibility
  return {
    sheets: result.sheets.map((sheet, index) => ({
      id: index + 1,
      utilization: sheet.utilization,
      waste: sheet.wasteArea,
      panels: sheet.placedPanels.length,
      placements: sheet.placedPanels
    })),
    totalSheets: result.sheets.length,
    totalUtilization: result.totalUtilization,
    totalWaste: result.totalWaste,
    unplacedPanels: result.unplacedPanels.length,
    algorithmUsed: 'Advanced Forward-Looking Greedy',
    optimizationTime: result.optimizationTime
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Try to find user by username first, then by email if it looks like an email
      let user = await storage.getUserByUsername(username);
      if (!user && username.includes('@')) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUser(user.id, { 
        lastLogin: new Date()
      });

      const token = generateToken({ 
        id: user.id, 
        username: user.username, 
        role: user.role 
      });

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/user", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Get user info for role-based filtering
      const currentUser = await storage.getUser(req.user!.id);
      const userRole = currentUser?.role || 'staff';
      
      // Get basic dashboard stats with role-based filtering
      const basicStats = await storage.getDashboardStats(userRole);
      
      // Initialize default values
      let todayAttendanceCount = 0;
      let activeUsersCount = 0;
      let monthlyExpenses = 0;
      
      try {
        // Get today's attendance count
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayAttendance = await storage.getAttendanceByDate(todayStr);
        todayAttendanceCount = todayAttendance.filter(att => att.status === 'present').length;
      } catch (attendanceError) {
        console.error('Error fetching today attendance:', attendanceError);
      }
      
      try {
        // Get total active users count for Staff & Payroll
        const allUsers = await storage.getAllUsers();
        activeUsersCount = allUsers.filter(user => user.isActive).length;
      } catch (usersError) {
        console.error('Error fetching users:', usersError);
      }
      
      try {
        // Get current month expenses
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        monthlyExpenses = await storage.getMonthlyExpenses(currentMonth, currentYear);
      } catch (expensesError) {
        console.error('Error fetching monthly expenses:', expensesError);
      }
      
      const stats = {
        ...basicStats,
        todayAttendance: todayAttendanceCount,
        activeTasks: activeUsersCount, // Using active users count for Staff & Payroll
        monthlyExpenses: monthlyExpenses,
        totalUsers: activeUsersCount,
        activeUsers: activeUsersCount
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard activity
  app.get("/api/dashboard/activity", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Ensure all activity items have properly formatted string values
      const activities = [
        { description: "New product added: Steel Rods", time: "2 hours ago" },
        { description: "Stock movement: Cement bags", time: "3 hours ago" },
        { description: "Task completed: Inventory check", time: "1 day ago" },
        { description: "User checked in: John Staff", time: "1 day ago" }
      ].map(activity => ({
        description: String(activity.description),
        time: String(activity.time)
      }));
      
      res.json(activities);
    } catch (error) {
      console.error("Dashboard activity error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userDataWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };

      const user = await storage.createUser(userDataWithHashedPassword);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed", error });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res) => {
    res.json(req.user);
  });

  // Change password endpoint for users
  app.post("/api/auth/change-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Get the current user from database to verify current password
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password in database
      await storage.updateUser(req.user!.id, { password: hashedNewPassword });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password", error: String(error) });
    }
  });

  // User management routes
  app.get("/api/users", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users", error });
    }
  });

  app.patch("/api/users/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Handle joiningDate conversion before validation
      if (req.body.joiningDate && typeof req.body.joiningDate === 'string') {
        req.body.joiningDate = new Date(req.body.joiningDate);
      }
      
      const updates = insertUserSchema.partial().parse(req.body);
      
      // If password is being updated, hash it
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return sanitized user (no password)
      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Update user error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user", error });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Make user inactive instead of deleting
      const updated = await storage.updateUser(id, { isActive: false });
      
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Staff member deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate user", error });
    }
  });

  // Category routes
  app.get("/api/categories", authenticateToken, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories", error });
    }
  });

  app.post("/api/categories", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category", error });
    }
  });

  app.put("/api/categories/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertCategorySchema.partial().parse(req.body);
      
      const category = await storage.updateCategory(id, updates);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category", error });
    }
  });

  app.get("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category", error });
    }
  });

  app.delete("/api/categories/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category", error });
    }
  });

  // Client routes
  app.get("/api/clients", authenticateToken, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients", error });
    }
  });

  app.post("/api/clients", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client", error });
    }
  });

  app.get("/api/clients/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client", error });
    }
  });

  app.put("/api/clients/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertClientSchema.partial().parse(req.body);
      
      const client = await storage.updateClient(id, updates);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client", error });
    }
  });

  app.delete("/api/clients/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client", error });
    }
  });

  // Product routes
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const { search, category, stockStatus } = req.query;
      const filters = {
        search: search as string,
        category: category as string,
        stockStatus: stockStatus as string,
      };
      
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products", error });
    }
  });

  // Product search endpoint for autocomplete
  app.get("/api/products/search", authenticateToken, async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return res.json([]);
      }

      const products = await storage.getAllProducts();
      
      // Filter products by name containing the query (case insensitive)
      const searchTerm = query.toLowerCase();
      const matchingProducts = products
        .filter(product => 
          product.name.toLowerCase().includes(searchTerm)
        )
        .slice(0, 10) // Limit to 10 suggestions
        .map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand
        }));

      res.json(matchingProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to search products", error });
    }
  });

  app.get("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product", error });
    }
  });

  app.post("/api/products", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const productSchema = z.object({
        name: z.string().min(1, "Product name is required"),
        category: z.string().min(1, "Category is required"),
        brand: z.string().optional(),
        size: z.string().optional(),
        thickness: z.string().optional(),
        sku: z.string().optional(),
        price: z.number().min(0, "Price must be positive"),
        currentStock: z.number().int().min(0, "Stock must be non-negative"),
        minStock: z.number().int().min(0, "Minimum stock must be non-negative"),
        unit: z.string().min(1, "Unit is required"),
        productType: z.enum(['raw_material', 'finishing_good', 'assembly', 'seasonal']).default('raw_material'),
        imageUrl: z.string().optional(),
      });
      
      const validatedData = productSchema.parse(req.body);
      
      // Map 'price' to 'pricePerUnit' to match schema
      const productData = {
        ...validatedData,
        pricePerUnit: validatedData.price,
      };
      delete (productData as any).price;
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product", error });
    }
  });

  app.put("/api/products/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const productUpdateSchema = z.object({
        name: z.string().min(1, "Product name is required").optional(),
        category: z.string().min(1, "Category is required").optional(),
        brand: z.string().optional(),
        size: z.string().optional(),
        thickness: z.string().optional(),
        sku: z.string().optional(),
        price: z.number().min(0, "Price must be positive").optional(),
        currentStock: z.number().int().min(0, "Stock must be non-negative").optional(),
        minStock: z.number().int().min(0, "Minimum stock must be non-negative").optional(),
        unit: z.string().min(1, "Unit is required").optional(),
        productType: z.enum(['raw_material', 'finishing_good', 'assembly', 'seasonal']).optional(),
        imageUrl: z.string().optional(),
      });
      
      const validatedUpdates = productUpdateSchema.parse(req.body);
      
      // Map 'price' to 'pricePerUnit' to match schema
      const updates: any = { ...validatedUpdates };
      if (validatedUpdates.price !== undefined) {
        updates.pricePerUnit = validatedUpdates.price;
        delete updates.price;
      }
      
      const product = await storage.updateProduct(id, updates);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product", error });
    }
  });

  app.delete("/api/products/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product", error });
    }
  });

  // Stock adjustment API removed - now handled by unified Inventory Movement system at /api/inventory/movements

  // Bulk import/export routes
  app.post("/api/products/bulk-import", authenticateToken, requireRole(["admin", "manager"]), csvFileUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { parse } = await import("csv-parse");
      const fs = await import("fs");
      
      const results: any[] = [];
      const errors: string[] = [];
      let successful = 0;
      let failed = 0;

      const records = await new Promise<any[]>((resolve, reject) => {
        const output: any[] = [];
        fs.createReadStream(req.file!.path)
          .pipe(parse({ 
            columns: true, 
            skip_empty_lines: true,
            trim: true 
          }))
          .on('data', (data) => output.push(data))
          .on('error', reject)
          .on('end', () => resolve(output));
      });

      for (const record of records) {
        try {
          const productData = {
            name: record.name?.trim(),
            category: record.category?.trim(),
            brand: record.brand?.trim() || null,
            size: record.size?.trim() || null,
            sku: record.sku?.trim() || null,
            pricePerUnit: parseFloat(record.pricePerUnit || record.price || "0"),
            currentStock: parseInt(record.currentStock || record.stock || "0", 10),
            minStock: parseInt(record.minStock || "10", 10),
            unit: record.unit?.trim() || "pieces",
          };

          // Validate required fields
          if (!productData.name || !productData.category || productData.pricePerUnit <= 0) {
            errors.push(`Row with name "${productData.name || 'Unknown'}": Missing required fields or invalid price`);
            failed++;
            continue;
          }

          await storage.createProduct(productData);
          successful++;
        } catch (error: any) {
          errors.push(`Row with name "${record.name || 'Unknown'}": ${error.message}`);
          failed++;
        }
      }

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        successful,
        failed,
        errors: errors.slice(0, 10), // Limit errors to first 10
        total: records.length
      });
    } catch (error: any) {
      // Cleanup uploaded file if it exists
      if (req.file) {
        const fs = await import("fs");
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      res.status(500).json({ message: "Import failed", error: error.message });
    }
  });

  app.get("/api/products/bulk-export", authenticateToken, async (req, res) => {
    try {
      const { format = 'csv', fields = '', filter = 'all', category = '' } = req.query;
      
      let products = await storage.getAllProducts();
      
      // Apply filters
      if (filter === 'low-stock') {
        products = products.filter(p => p.currentStock <= p.minStock);
      } else if (filter === 'category' && category) {
        products = products.filter(p => p.category === category);
      }

      // Select fields
      const selectedFields = fields ? (fields as string).split(',') : [
        'name', 'category', 'brand', 'size', 'sku', 'pricePerUnit', 'currentStock', 'minStock', 'unit'
      ];

      const exportData = products.map(product => {
        const row: any = {};
        selectedFields.forEach(field => {
          if (field === 'stockStatus') {
            row[field] = product.currentStock <= product.minStock ? 'Low Stock' : 'In Stock';
          } else if (field === 'createdAt') {
            row[field] = product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '';
          } else {
            row[field] = (product as any)[field] || '';
          }
        });
        return row;
      });

      if (format === 'excel') {
        // For now, export as CSV with Excel-friendly format
        const { stringify } = await import("csv-stringify");
        const csvString = await new Promise<string>((resolve, reject) => {
          stringify(exportData, { 
            header: true,
            quoted: true 
          }, (err, output) => {
            if (err) reject(err);
            else resolve(output);
          });
        });
        
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
        res.send(csvString);
      } else {
        // CSV format
        const { stringify } = await import("csv-stringify");
        const csvString = await new Promise<string>((resolve, reject) => {
          stringify(exportData, { 
            header: true 
          }, (err, output) => {
            if (err) reject(err);
            else resolve(output);
          });
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
        res.send(csvString);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Export failed", error: error.message });
    }
  });

  // Project Activities Routes
  app.get("/api/projects/:projectId/activities", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { projectId } = req.params;
      const activities = await storage.getProjectLogs(parseInt(projectId));
      res.json(activities);
    } catch (error) {
      console.error('Project activities error:', error);
      res.status(500).json({ 
        message: "Failed to fetch project activities", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/projects/:projectId/activities", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, type, priority } = req.body;
      const user = req.user!;

      const activity = await storage.createProjectLog({
        projectId: parseInt(projectId),
        logType: type,
        title,
        description,
        createdBy: user.id,
        isImportant: priority === 'high'
      });

      res.json(activity);
    } catch (error) {
      console.error('Create activity error:', error);
      res.status(500).json({ 
        message: "Failed to create activity", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.put("/api/projects/:projectId/activities/:activityId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { activityId } = req.params;
      const { title, description, type, priority } = req.body;

      const activity = await storage.updateProjectLog(parseInt(activityId), {
        title,
        description,
        logType: type,
        isImportant: priority === 'high'
      });

      res.json(activity);
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ 
        message: "Failed to update activity", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.delete("/api/projects/:projectId/activities/:activityId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { activityId } = req.params;
      await storage.deleteProjectLog(parseInt(activityId));
      res.json({ success: true });
    } catch (error) {
      console.error('Delete activity error:', error);
      res.status(500).json({ 
        message: "Failed to delete activity", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Calendar events endpoint (updated to use combined activities)
  app.get("/api/calendar/events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { projectId, allProjects } = req.query;
      
      // Get tasks and projects for calendar events
      const events: any[] = [];
      
      if (projectId) {
        // Get project-specific events
        const projectTasks = await storage.getTasks(Number(projectId));
        const project = await storage.getProject(Number(projectId));
        
        // Add task events
        projectTasks.forEach(task => {
          if (task.dueDate) {
            events.push({
              id: `task-${task.id}`,
              title: task.title,
              date: new Date(task.dueDate),
              type: 'task',
              projectId: Number(projectId),
              projectName: project?.name,
              status: task.status,
              assignedTo: task.assignedTo,
              description: task.description
            });
          }
        });
      } else if (allProjects === 'true') {
        // Get all project events
        const allTasks = await storage.getAllTasks();
        const projects = await storage.getAllProjects();
        
        // Add task events from all projects
        for (const task of allTasks) {
          if (task.dueDate) {
            const project = projects.find(p => p.id === task.projectId);
            events.push({
              id: `task-${task.id}`,
              title: task.title,
              date: new Date(task.dueDate),
              type: 'task',
              projectId: task.projectId,
              projectName: project?.name,
              status: task.status,
              assignedTo: task.assignedTo,
              description: task.description
            });
          }
        }
        
        // Add project milestone events
        projects.forEach(project => {
          if (project.startDate) {
            events.push({
              id: `project-start-${project.id}`,
              title: `${project.name} - Start`,
              date: new Date(project.startDate),
              type: 'milestone',
              projectId: project.id,
              projectName: project.name,
              status: project.stage
            });
          }
          if (project.endDate) {
            events.push({
              id: `project-end-${project.id}`,
              title: `${project.name} - Deadline`,
              date: new Date(project.endDate),
              type: 'milestone',
              projectId: project.id,
              projectName: project.name,
              status: project.stage
            });
          }
        });
      }
      
      res.json(events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (error) {
      console.error('Calendar events error:', error);
      res.status(500).json({ 
        message: "Failed to fetch calendar events", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Material request routes
  app.get("/api/requests", authenticateToken, async (req, res) => {
    try {
      const { status, clientName, projectId } = req.query;
      const user = (req as AuthRequest).user!;
      
      
      const filters: any = {
        status: status as string,
        clientName: clientName as string,
      };
      
      // Users can only see their own requests
      if (user.role === "user") {
        filters.requestedBy = user.id;
      }
      
      let requests;
      if (projectId) {
        // Get requests for specific project
        console.log(`DEBUG: Getting requests for project ${projectId}`);
        requests = await storage.getMaterialRequestsByProject(parseInt(projectId as string));
      } else {
        // Get all requests with filters
        requests = await storage.getAllMaterialRequests();
      }
      
      // FINAL TEST: Check complete structure
      const req2 = requests.find(r => r.id === 2);
      const req3 = requests.find(r => r.id === 3);
      console.log(`FINAL: Request 2 has ${req2?.items?.length || 0} items, requested by: ${req2?.requestedByUser?.username || 'Unknown'}`);
      console.log(`FINAL: Request 3 has ${req3?.items?.length || 0} items, requested by: ${req3?.requestedByUser?.username || 'Unknown'}`);
      
      res.json(requests);
    } catch (error) {
      console.error(`DEBUG: Error in /api/requests:`, error);
      res.status(500).json({ message: "Failed to fetch requests", error });
    }
  });

  app.get("/api/requests/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DEBUG: Fetching request ${id} via API`);
      console.log(`DEBUG: About to call storage.getMaterialRequest(${id})`);
      const request = await storage.getMaterialRequest(id);
      console.log(`DEBUG: storage.getMaterialRequest(${id}) returned:`, request ? 'request with ' + (request.items?.length || 0) + ' items' : 'null');
      
      if (!request) {
        console.log(`DEBUG: Request ${id} not found`);
        return res.status(404).json({ message: "Request not found" });
      }
      
      console.log(`DEBUG: Returning request ${id} with ${request.items?.length || 0} items`);
      res.json(request);
    } catch (error) {
      console.error(`DEBUG: Error fetching request:`, error);
      res.status(500).json({ message: "Failed to fetch request", error });
    }
  });

  app.post("/api/requests", authenticateToken, requireRole(["staff", "user", "manager", "admin"]), async (req, res) => {
    try {
      console.log("*** POST /api/requests - ROUTE HANDLER START ***");
      const { request: requestData, items } = req.body;
      console.log("*** POST /api/requests - Request Data:", JSON.stringify(requestData));
      console.log("*** POST /api/requests - Items:", JSON.stringify(items));
      
      // Validate project stage before creating request
      if (requestData.projectId) {
        const project = await storage.getProject(requestData.projectId);
        if (!project) {
          return res.status(400).json({ message: "Project not found" });
        }
        
        if (!canOrderMaterials(project.stage)) {
          return res.status(400).json({ 
            message: `Material requests can only be created for projects in stages: Client Approved, Production, Installation, or Handover. Current stage: ${getStageDisplayName(project.stage)}` 
          });
        }
      }
      
      const validatedRequest = insertMaterialRequestSchema.parse({
        ...requestData,
        requestedBy: (req as AuthRequest).user?.id,
      });
      console.log("*** POST /api/requests - Validated Request:", JSON.stringify(validatedRequest));
      
      // Add requestId after validation but before storage
      const validatedItems = items.map((item: any) => {
        const validatedItem = insertRequestItemSchema.parse(item);
        return validatedItem;
      });
      console.log("*** POST /api/requests - Validated Items:", JSON.stringify(validatedItems));
      
      console.log("*** POST /api/requests - About to call storage.createMaterialRequest ***");
      const request = await storage.createMaterialRequest(validatedRequest, validatedItems);
      console.log("*** POST /api/requests - Request created successfully:", JSON.stringify(request));
      res.status(201).json(request);
    } catch (error) {
      console.error("*** POST /api/requests - ERROR:", error);
      if (error instanceof z.ZodError) {
        console.error("*** POST /api/requests - Zod validation error:", error.errors);
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error("*** POST /api/requests - Generic error:", error);
      res.status(500).json({ message: "Failed to create request", error: String(error) });
    }
  });

  app.patch("/api/requests/:id/status", authenticateToken, requireRole(["store_incharge", "admin", "manager"]), async (req, res) => {
    console.log('=== STATUS UPDATE ROUTE CALLED ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('User:', (req as AuthRequest).user);
    
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const userId = (req as AuthRequest).user?.id!;
      
      console.log(`Status update attempt: ID=${id}, Status=${status}, UserId=${userId}`);
      console.log('Storage method exists?', typeof storage.updateMaterialRequestStatus);
      
      const request = await storage.updateMaterialRequestStatus(id, status, userId);
      
      console.log(`Status update result:`, request ? 'Success' : 'No request found');
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({ message: "Failed to update request status", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete material request
  app.delete("/api/requests/:id", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DEBUG: DELETE route called for request ID: ${id}`);
      console.log(`DEBUG: User role: ${(req as AuthRequest).user?.role}`);
      
      console.log(`DEBUG: About to call storage.deleteMaterialRequest(${id})`);
      console.log(`DEBUG: Storage method type: ${typeof storage.deleteMaterialRequest}`);
      
      const success = await storage.deleteMaterialRequest(id);
      console.log(`DEBUG: Delete operation result: ${success}`);
      
      if (!success) {
        console.log(`DEBUG: Delete failed, returning 404`);
        return res.status(404).json({ message: "Request not found" });
      }
      
      console.log(`DEBUG: Delete successful, returning success message`);
      res.json({ message: "Request deleted successfully" });
    } catch (error) {
      console.error(`DEBUG: Delete route error:`, error);
      res.status(500).json({ message: "Failed to delete request", error });
    }
  });

  // Get projects eligible for material requests
  app.get("/api/eligible-projects", authenticateToken, async (req, res) => {
    try {
      const allProjects = await storage.getAllProjects();
      console.log("Eligible Projects Query - Total projects:", allProjects.length);
      
      if (allProjects.length > 0) {
        const sampleProject = allProjects[0];
        console.log("Sample project structure:", {
          id: sampleProject.id,
          name: sampleProject.name,
          stage: sampleProject.stage,
          isActive: sampleProject.isActive,
          is_active: sampleProject.is_active,
          client_name: sampleProject.client_name,
          projectCode: sampleProject.code,
          clientId: sampleProject.clientId,
          client_id: sampleProject.client_id
        });
      }
      
      const eligibleProjects = getMaterialRequestEligibleProjects(allProjects);
      console.log("Eligible Projects Query - Filtered result count:", eligibleProjects.length);
      
      // Transform projects to match frontend interface
      const transformedProjects = eligibleProjects.map(project => ({
        id: project.id,
        projectCode: project.code,
        name: project.name,
        stage: project.stage,
        client_name: project.client_name,
        clientId: project.client_id
      }));
      
      console.log("Sending transformed projects:", transformedProjects.length);
      res.json(transformedProjects);
    } catch (error) {
      console.error("Error fetching eligible projects:", error);
      res.status(500).json({ message: "Failed to fetch eligible projects", error });
    }
  });



  // Combined Activities API for calendar and timeline views
  app.get("/api/activities/combined", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const activities: any[] = [];

      // Get project logs (activities)
      const projectLogs = await storage.getAllProjectLogs();
      activities.push(...projectLogs.map((log: any) => ({
        id: log.id,
        type: 'project_log',
        title: log.title,
        description: log.description,
        date: new Date(log.createdAt),
        projectName: log.projectName,
        projectId: log.projectId,
        createdBy: log.createdByName,
        logType: log.logType,
        isImportant: log.isImportant
      })));

      // Get tasks
      const tasks = await storage.getAllTasks();
      activities.push(...tasks.map((task: any) => ({
        id: task.id,
        type: 'task',
        title: task.title,
        description: task.description,
        date: new Date(task.createdAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        status: task.status,
        priority: task.priority,
        projectName: task.projectName,
        projectId: task.projectId,
        assignedTo: task.assignedToName || task.assignedToOther
      })));

      // Get CRM activities
      const crmActivities = await storage.getAllCRMActivities();
      activities.push(...crmActivities.map((activity: any) => ({
        id: activity.id,
        type: 'crm_activity',
        title: activity.subject,
        description: activity.description,
        date: new Date(activity.createdAt),
        dueDate: activity.dueDate ? new Date(activity.dueDate) : null,
        status: activity.status,
        assignedTo: activity.assignedTo,
        createdBy: activity.createdByName
      })));

      res.json(activities);
    } catch (error) {
      console.error('Combined activities error:', error);
      res.status(500).json({ 
        message: "Failed to fetch activities", 
        error 
      });
    }
  });

  // Activity statistics for dashboard
  app.get("/api/activities/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Get all tasks for statistics
      const tasks = await storage.getAllTasks();
      const projectLogs = await storage.getAllProjectLogs();
      const crmActivities = await storage.getAllCRMActivities();
      
      const today = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(today.getDate() + 7);
      
      let overdue = 0;
      let dueToday = 0;
      let thisWeek = 0;
      
      tasks.forEach((task: any) => {
        if (task.dueDate && task.status !== 'completed') {
          const dueDate = new Date(task.dueDate);
          
          if (dueDate < today) {
            overdue++;
          } else if (dueDate.toDateString() === today.toDateString()) {
            dueToday++;
          } else if (dueDate <= weekFromNow) {
            thisWeek++;
          }
        }
      });

      // CRM activities processing would go here when table exists

      const stats = {
        total: tasks.length + projectLogs.length + crmActivities.length,
        overdue,
        dueToday,
        thisWeek
      };

      res.json(stats);
    } catch (error) {
      console.error('Activity stats error:', error);
      res.status(500).json({ 
        message: "Failed to fetch activity statistics", 
        error 
      });
    }
  });

  // BOQ routes
  app.get("/api/boq", authenticateToken, requireRole(["manager", "admin", "staff"]), async (req, res) => {
    try {
      const user = (req as AuthRequest).user!;
      const uploadedBy = (user.role === "manager" || user.role === "staff") ? user.id : undefined;
      
      const boqUploads = await storage.getAllBOQUploads();
      res.json(boqUploads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch BOQ uploads", error });
    }
  });

  app.post("/api/boq/upload", authenticateToken, requireRole(["manager", "admin", "staff"]), boqFileUpload.single("boqFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const boqData = insertBOQUploadSchema.parse({
        filename: req.file.filename,
        originalName: req.file.originalname,
        uploadedBy: (req as AuthRequest).user?.id,
        status: "processing",
      });
      
      const boq = await storage.createBOQUpload(boqData);
      res.status(201).json(boq);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to upload BOQ", error });
    }
  });

  // New endpoint for PDF text extraction
  app.post("/api/boq/extract-text", authenticateToken, requireRole(["manager", "admin", "staff"]), boqFileUpload.single("pdfFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      // Extract text from PDF
      const pdfBuffer = req.file.buffer;
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        return res.status(400).json({ message: "Invalid PDF file" });
      }

      // Use dynamic import in a try-catch to handle the module loading issue
      let data;
      try {
        // Try to load pdf-parse without triggering the test file issue
        const { spawn } = await import('child_process');
        const fs = await import('fs');
        const path = await import('path');
        const { promisify } = await import('util');
        
        // Create a temporary file for the PDF
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `pdf_${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);
        
        // Use a simple text extraction approach
        // For now, return a helpful error message directing to OCR
        fs.unlinkSync(tempFilePath); // Clean up temp file
        
        throw new Error('PDF text extraction temporarily disabled due to library issues');
        
      } catch (parseError) {
        // PDF text extraction failed - this is expected for image-based PDFs
        throw new Error('Could not extract text from PDF. This may be a scanned PDF - please save as an image (PNG/JPG) and upload that for OCR processing instead.');
      }
      
      res.json({ text: data.text });
    } catch (error) {
      console.error('PDF text extraction error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to extract text from PDF. For scanned PDFs, please save as an image (PNG/JPG) and upload that instead.",
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.patch("/api/boq/:id", authenticateToken, requireRole(["manager", "admin", "staff"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const boq = await storage.updateBOQUpload(id, updates);
      
      if (!boq) {
        return res.status(404).json({ message: "BOQ upload not found" });
      }
      
      res.json(boq);
    } catch (error) {
      res.status(500).json({ message: "Failed to update BOQ", error });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthRequest).user!;
      const stats = await storage.getDashboardStats(user.role);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats", error });
    }
  });

  // Get dashboard tasks for current user (pending and in_progress tasks assigned to them)
  app.get("/api/dashboard/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Fetch all tasks assigned to the current user, then filter for pending and in_progress
      const allTasks = await storage.getAllTasks({ assignedTo: user.id });
      
      // Filter for pending and in_progress tasks only
      const activeTasks = allTasks.filter(task => 
        task.status === 'pending' || task.status === 'in_progress'
      );
      
      // Include assigned by user information
      const tasksWithUsers = await Promise.all(
        activeTasks.map(async (task) => {
          const assignedByUser = await storage.getUser(task.assignedBy);
          return {
            ...task,
            assignedUser: { id: user.id, name: user.name, username: user.username },
            assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
          };
        })
      );
      
      res.json(tasksWithUsers);
    } catch (error) {
      console.error("Failed to fetch dashboard tasks:", error);
      res.status(500).json({ message: "Failed to fetch dashboard tasks", error: String(error) });
    }
  });

  app.get("/api/dashboard/low-stock", authenticateToken, async (req, res) => {
    try {
      const lowStockProducts = await storage.getLowStockProducts();
      // Transform products to ensure no complex objects are rendered as React children
      const transformedProducts = lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        currentStock: product.currentStock,
        minStock: product.minStock,
        stockStatus: product.currentStock <= product.minStock ? 'low-stock' : 'in-stock'
      }));
      res.json(transformedProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock products", error });
    }
  });

  // Reports Dashboard API
  app.get("/api/reports/dashboard", authenticateToken, async (req, res) => {
    try {
      const { dateRange, category, type } = req.query;
      
      let products = await storage.getAllProducts();
      const materialRequests = await storage.getAllMaterialRequests();
      
      // Apply date filter if specified
      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }
        
        products = products.filter(p => {
          const productDate = p.createdAt ? new Date(p.createdAt) : new Date();
          return productDate >= startDate;
        });
      }
      
      // Apply category filter if specified
      if (category && category !== 'all') {
        products = products.filter(p => p.category === category);
      }
      
      // Calculate summary statistics
      const totalProducts = products.length;
      const totalValue = products.reduce((sum, p) => {
        const price = Number(p.price) || 0;
        const stock = Number(p.stockQuantity) || 0;
        return sum + (price * stock);
      }, 0);
      const lowStockItems = products.filter(p => {
        const stock = Number(p.stockQuantity) || 0;
        const minStock = Number(p.minStockLevel) || 10;
        return stock < minStock;
      }).length;
      const pendingRequests = materialRequests.filter(r => r.status === 'pending').length;
      
      // Calculate category summary
      const categoryMap = new Map();
      
      products.forEach(product => {
        const categoryName = product.category || 'Uncategorized';
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            category: categoryName,
            totalItems: 0,
            totalValue: 0,
            inStock: 0,
            lowStock: 0,
            stockHealth: 0
          });
        }
        
        const categoryData = categoryMap.get(categoryName);
        categoryData.totalItems++;
        
        const price = Number(product.price) || 0;
        const stock = Number(product.stockQuantity) || 0;
        const minStock = Number(product.minStockLevel) || 10;
        
        categoryData.totalValue += (price * stock);
        
        // Use actual stock levels for health indicator
        if (stock >= minStock) {
          categoryData.inStock++;
        } else {
          categoryData.lowStock++;
        }
        
        // Calculate stock health percentage
        categoryData.stockHealth = categoryData.totalItems > 0 
          ? (categoryData.inStock / categoryData.totalItems) * 100 
          : 0;
      });
      
      const categorySummary = Array.from(categoryMap.values());
      
      // Prepare detailed data based on report type
      let detailedData = [];
      
      if (type === 'inventory') {
        // Detailed product list for inventory reports
        detailedData = products.map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          sku: product.sku || '',
          price: Number(product.price) || 0,
          stockQuantity: Number(product.stockQuantity) || 0,
          minStockLevel: Number(product.minStockLevel) || 10,
          stockStatus: (Number(product.stockQuantity) || 0) >= (Number(product.minStockLevel) || 10) ? 'In Stock' : 'Low Stock',
          totalValue: (Number(product.price) || 0) * (Number(product.stockQuantity) || 0),
          description: product.description || ''
        }));
      } else if (type === 'requests') {
        // Detailed material requests
        detailedData = materialRequests.map(request => ({
          id: request.id,
          clientName: request.clientName || '',
          orderNumber: request.orderNumber || '',
          status: request.status || '',
          priority: request.priority || 'Medium',
          totalValue: Number(request.totalValue) || 0,
          requestedBy: request.requestedBy || '',
          createdAt: request.createdAt || '',
          items: request.items || []
        }));
      } else if (type === 'low-stock') {
        // Detailed low stock items
        const lowStockProducts = products.filter(p => {
          const stock = Number(p.stockQuantity) || 0;
          const minStock = Number(p.minStockLevel) || 10;
          return stock < minStock;
        });
        
        detailedData = lowStockProducts.map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          sku: product.sku || '',
          currentStock: Number(product.stockQuantity) || 0,
          minStockLevel: Number(product.minStockLevel) || 10,
          deficit: (Number(product.minStockLevel) || 10) - (Number(product.stockQuantity) || 0),
          price: Number(product.price) || 0,
          reorderValue: ((Number(product.minStockLevel) || 10) - (Number(product.stockQuantity) || 0)) * (Number(product.price) || 0)
        }));
      } else if (type === 'financial') {
        // Financial summary with product values
        detailedData = products.map(product => ({
          id: product.id,
          name: product.name,
          category: product.category,
          price: Number(product.price) || 0,
          stockQuantity: Number(product.stockQuantity) || 0,
          totalValue: (Number(product.price) || 0) * (Number(product.stockQuantity) || 0),
          lastUpdated: product.updatedAt || product.createdAt || ''
        }));
      } else if (type === 'sales') {
        // Sales report from Sales Products table
        const salesProducts = await storage.getAllSalesProducts();
        
        // Apply date filter to sales products
        let filteredSalesProducts = salesProducts;
        if (dateRange && dateRange !== 'all') {
          const now = new Date();
          let startDate: Date;
          
          switch (dateRange) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'quarter':
              startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
              break;
            case 'year':
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            default:
              startDate = new Date(0);
          }
          
          filteredSalesProducts = salesProducts.filter(p => {
            const productDate = p.createdAt ? new Date(p.createdAt) : new Date();
            return productDate >= startDate;
          });
        }
        
        detailedData = filteredSalesProducts.map(salesProduct => ({
          id: salesProduct.id,
          name: salesProduct.name,
          category: salesProduct.category || 'Uncategorized',
          size: salesProduct.size || '',
          description: salesProduct.description || '',
          unitPrice: Number(salesProduct.unitPrice) || 0,
          quantitySold: Number(salesProduct.quantitySold) || 0,
          totalSales: (Number(salesProduct.unitPrice) || 0) * (Number(salesProduct.quantitySold) || 0),
          createdAt: salesProduct.createdAt || '',
          lastUpdated: salesProduct.updatedAt || salesProduct.createdAt || ''
        }));
      }
      
      res.json({
        totalProducts,
        totalValue,
        lowStockItems,
        pendingRequests,
        categorySummary,
        detailedData, // Generic detailed data based on report type
        reportType: type,
        filters: { dateRange, category, type }
      });
    } catch (error) {
      console.error('Reports dashboard error:', error);
      res.status(500).json({ message: "Failed to fetch reports data", error: String(error) });
    }
  });

  // Export routes with better error handling
  app.get("/api/reports/export/inventory", authenticateToken, async (req, res) => {
    try {
      await exportProductsCSV(res);
    } catch (error) {
      console.error('Inventory export error:', error);
      res.status(500).json({ message: "Export failed", error: String(error) });
    }
  });

  app.get("/api/reports/export/requests", authenticateToken, async (req, res) => {
    try {
      await exportRequestsCSV(res);
    } catch (error) {
      console.error('Requests export error:', error);
      res.status(500).json({ message: "Export failed", error: String(error) });
    }
  });

  app.get("/api/reports/export/low-stock", authenticateToken, async (req, res) => {
    try {
      await exportLowStockCSV(res);
    } catch (error) {
      console.error('Low stock export error:', error);
      res.status(500).json({ message: "Export failed", error: String(error) });
    }
  });

  // Generic file upload endpoint for sales products and other uses
  app.post("/api/upload", authenticateToken, productImageUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      const { type } = req.body;
      const file = req.file;
      
      console.log('Upload request - user:', req.user?.id);
      console.log('Upload request - type:', type);
      console.log('Upload request - file:', file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer ? 'present' : 'missing'
      } : 'none');
      
      if (!file || !file.buffer) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Save to local storage - no cloud dependencies
      const fs = await import('fs');
      const path = await import('path');
      
      const getExtension = (mimetype: string) => {
        switch (mimetype) {
          case 'image/jpeg': return 'jpg';
          case 'image/jpg': return 'jpg';
          case 'image/png': return 'png';
          case 'image/gif': return 'gif';
          case 'image/webp': return 'webp';
          default: return 'png';
        }
      };

      const extension = getExtension(file.mimetype);
      const filename = `upload-${Date.now()}.${extension}`;
      const uploadPath = `uploads/${filename}`;

      // Ensure directory exists
      const uploadDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Write file to disk
      fs.writeFileSync(uploadPath, file.buffer);
      
      const filePath = `/uploads/${filename}`;
      
      console.log('Image saved locally:', uploadPath, '-> URL:', filePath);
      
      res.json({ 
        success: true,
        filePath,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file", error: String(error) });
    }
  });

  // Serve static files from uploads directory (for legacy files)
  app.use('/uploads', express.static('uploads'));

  // Local file serving - all images served from /uploads

  // Attendance routes
  app.get("/api/attendance", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { month, year, userId } = req.query;
      const filters = {
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
        userId: userId ? parseInt(userId as string) : undefined,
      };
      
      const attendance = await storage.getAllAttendance(filters);
      
      // Include user information
      const attendanceWithUsers = await Promise.all(
        attendance.map(async (att) => {
          const user = await storage.getUser(att.userId);
          return {
            ...att,
            user: user ? { id: user.id, name: user.name, email: user.email } : null,
          };
        })
      );
      
      res.json(attendanceWithUsers);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance", error: String(error) });
    }
  });

  app.get("/api/attendance/today", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const attendance = await storage.getTodayAttendance();
      res.json(attendance);
    } catch (error) {
      console.error("Failed to fetch today's attendance:", error);
      res.status(500).json({ message: "Failed to fetch today's attendance", error: String(error) });
    }
  });

  app.get("/api/attendance/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { month, year, userId } = req.query;
      const stats = await storage.getAttendanceStats(
        userId ? parseInt(userId as string) : undefined,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined
      );
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch attendance stats:", error);
      res.status(500).json({ message: "Failed to fetch attendance stats", error: String(error) });
    }
  });

  app.post("/api/attendance/checkin", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { location, notes } = req.body;
      const attendance = await storage.checkIn(req.user!.id, undefined, location, notes);
      res.json(attendance);
    } catch (error) {
      console.error("Check-in failed:", error);
      res.status(500).json({ message: "Check-in failed", error: String(error) });
    }
  });

  app.post("/api/attendance/checkout", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Find today's attendance for the user
      const todayAttendance = await storage.getTodayAttendance();
      const userAttendance = todayAttendance.find(a => a.userId === req.user!.id && !a.checkOutTime);
      
      if (!userAttendance) {
        return res.status(404).json({ message: "No active check-in found for today" });
      }
      
      const attendance = await storage.checkOut(userAttendance.id);
      res.json(attendance);
    } catch (error) {
      console.error("Check-out failed:", error);
      res.status(500).json({ message: "Check-out failed", error: String(error) });
    }
  });

  // Admin attendance management
  app.post("/api/attendance/admin-checkin", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const { userId, location, notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const attendance = await storage.checkIn(userId, req.user!.id, location, notes);
      res.json(attendance);
    } catch (error) {
      console.error("Admin check-in failed:", error);
      res.status(500).json({ message: "Admin check-in failed", error: String(error) });
    }
  });

  app.post("/api/attendance/admin-checkout", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const { attendanceId, notes } = req.body;
      
      if (!attendanceId) {
        return res.status(400).json({ message: "Attendance ID is required" });
      }
      
      const attendance = await storage.checkOut(attendanceId, req.user!.id);
      
      if (notes) {
        await storage.updateAttendance(attendanceId, { notes });
      }
      
      res.json(attendance);
    } catch (error) {
      console.error("Admin check-out failed:", error);
      res.status(500).json({ message: "Admin check-out failed", error: String(error) });
    }
  });

  app.post("/api/attendance/mark", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.markAttendance(attendanceData);
      res.json(attendance);
    } catch (error) {
      console.error("Mark attendance failed:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attendance data", errors: error.errors });
      }
      res.status(500).json({ message: "Mark attendance failed", error: String(error) });
    }
  });

  app.post("/api/attendance/bulk-update", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const { userId, month, year, attendanceData } = req.body;
      
      if (!userId || !month || !year || !attendanceData) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const results = await storage.bulkUpdateMonthlyAttendance(userId, month, year, attendanceData);
      res.json(results);
    } catch (error) {
      console.error("Bulk attendance update failed:", error);
      res.status(500).json({ message: "Bulk attendance update failed", error: String(error) });
    }
  });

  // Update single attendance record
  app.patch("/api/attendance/:id", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      const result = await storage.updateAttendance(id, updateData);
      if (!result) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  // Export attendance records as CSV
  app.get("/api/attendance/export", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const { month, year } = req.query;
      
      const monthNum = month && typeof month === 'string' ? parseInt(month) : undefined;
      const yearNum = year && typeof year === 'string' ? parseInt(year) : undefined;
      
      await exportAttendanceCSV(res, monthNum, yearNum);
    } catch (error) {
      console.error("Export attendance failed:", error);
      res.status(500).json({ message: "Export failed", error: String(error) });
    }
  });

  // Get employees for filtering
  app.get("/api/reports/employees", authenticateToken, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const employees = users.map((user: any) => ({
        id: user.id,
        name: user.name || user.username || 'Unknown User'
      }));
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // Comprehensive Reports Data Endpoint
  app.get("/api/reports/data", authenticateToken, async (req, res) => {
    try {
      const { type, month, year, category, employee } = req.query;
      const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      
      let reportData: any = {
        reportType: type,
        detailedData: [],
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        pendingRequests: 0,
        totalPettyCash: 0,
        completedProjects: 0,
        totalAttendance: 0,
        totalPurchaseOrders: 0,
        totalSalesValue: 0,
        totalQuotes: 0,
        totalSuppliers: 0,
        totalStockMovements: 0,
        totalUserActivity: 0,
        summary: {}
      };

      switch (type) {
        case 'inventory':
          const products = await storage.getAllProducts();
          // Filter products by creation/update date and category
          reportData.detailedData = products.filter((p: any) => {
            // Category filter
            const categoryMatch = category === 'all' || !category || p.category === category;
            
            // Date filter - check if product was created or updated in the specified month/year
            let dateMatch = true;
            if (p.createdAt || p.updatedAt) {
              const productDate = new Date(p.updatedAt || p.createdAt);
              dateMatch = productDate.getMonth() + 1 === monthNum && productDate.getFullYear() === yearNum;
            }
            
            return categoryMatch && dateMatch;
          });
          reportData.totalProducts = reportData.detailedData.length;
          reportData.totalValue = reportData.detailedData.reduce((sum: number, p: any) => 
            sum + ((p.pricePerUnit || 0) * (p.currentStock || 0)), 0
          );
          reportData.lowStockItems = reportData.detailedData.filter((p: any) => 
            (p.currentStock || 0) <= (p.minStock || 0)
          ).length;
          break;

        case 'material-requests':
          const allRequests = await storage.getAllMaterialRequests();
          const filteredRequests = allRequests.filter((r: any) => {
            const requestDate = new Date(r.createdAt);
            return requestDate.getMonth() + 1 === monthNum && requestDate.getFullYear() === yearNum;
          });
          reportData.detailedData = filteredRequests;
          reportData.pendingRequests = filteredRequests.filter((r: any) => r.status === 'pending').length;
          break;

        case 'low-stock':
          const allProducts = await storage.getAllProducts();
          reportData.detailedData = allProducts.filter((p: any) => (p.currentStock || 0) <= (p.minStock || 0));
          reportData.lowStockItems = reportData.detailedData.length;
          break;

        case 'petty-cash':
          const expenses = await storage.getPettyCashExpenses();
          const monthlyExpenses = expenses.filter((e: any) => {
            const expenseDate = new Date(e.expenseDate);
            return expenseDate.getMonth() + 1 === monthNum && expenseDate.getFullYear() === yearNum;
          });
          reportData.detailedData = monthlyExpenses;
          reportData.totalPettyCash = monthlyExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
          break;

        case 'projects':
          const projects = await storage.getAllProjects();
          reportData.detailedData = projects;
          reportData.completedProjects = projects.filter((p: any) => p.stage === 'completed').length;
          break;

        case 'sales':
          const salesProducts = await storage.getAllSalesProducts();
          const monthlySales = salesProducts.filter((s: any) => {
            const saleDate = new Date(s.createdAt);
            return saleDate.getMonth() + 1 === monthNum && saleDate.getFullYear() === yearNum;
          });
          reportData.detailedData = category === 'all' || !category ? 
            monthlySales : monthlySales.filter((s: any) => s.category === category);
          reportData.totalSalesValue = reportData.detailedData.reduce((sum: number, s: any) => 
            sum + s.unitPrice, 0
          );
          break;

        case 'attendance':
          const attendance = await storage.getAllAttendance();
          const monthlyAttendance = attendance.filter((a: any) => {
            const attDate = new Date(a.date);
            return attDate.getMonth() + 1 === monthNum && attDate.getFullYear() === yearNum;
          });
          
          // Get user details for each attendance record
          const attendanceWithUsers = await Promise.all(
            monthlyAttendance.map(async (record: any) => {
              const user = await storage.getUser(record.userId);
              return {
                ...record,
                userName: user ? user.name || user.username : 'Unknown User'
              };
            })
          );
          
          // Filter by employee name if specified
          let filteredAttendance = attendanceWithUsers;
          if (employee && employee !== 'all') {
            filteredAttendance = attendanceWithUsers.filter((a: any) => 
              a.userName.toLowerCase().includes((employee as string).toLowerCase())
            );
          }
          
          reportData.detailedData = filteredAttendance;
          reportData.totalAttendance = filteredAttendance.filter((a: any) => a.status === 'present').length;
          break;

        case 'purchase-orders':
          const purchaseOrders = await storage.getAllPurchaseOrders();
          const monthlyPOs = purchaseOrders.filter((po: any) => {
            const poDate = new Date(po.createdAt);
            return poDate.getMonth() + 1 === monthNum && poDate.getFullYear() === yearNum;
          });
          reportData.detailedData = monthlyPOs;
          reportData.totalPurchaseOrders = monthlyPOs.length;
          reportData.totalValue = monthlyPOs.reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0);
          break;

        case 'financial':
          // Comprehensive financial summary
          const allExpenses = await storage.getPettyCashExpenses();
          const monthlyFinExpenses = allExpenses.filter((e: any) => {
            const expenseDate = new Date(e.expenseDate);
            return expenseDate.getMonth() + 1 === monthNum && expenseDate.getFullYear() === yearNum;
          });
          
          const allPOs = await storage.getAllPurchaseOrders();
          const monthlyFinPOs = allPOs.filter((po: any) => {
            const poDate = new Date(po.createdAt);
            return poDate.getMonth() + 1 === monthNum && poDate.getFullYear() === yearNum;
          });

          const allSales = await storage.getAllSalesProducts();
          const monthlyFinSales = allSales.filter((s: any) => {
            const saleDate = new Date(s.createdAt);
            return saleDate.getMonth() + 1 === monthNum && saleDate.getFullYear() === yearNum;
          });

          reportData.summary = {
            totalExpenses: monthlyFinExpenses.reduce((sum: number, e: any) => sum + e.amount, 0),
            totalPurchases: monthlyFinPOs.reduce((sum: number, po: any) => sum + po.totalAmount, 0),
            totalSales: monthlyFinSales.reduce((sum: number, s: any) => sum + s.unitPrice, 0),
            expensesByCategory: monthlyFinExpenses.reduce((acc: any, e: any) => {
              acc[e.category] = (acc[e.category] || 0) + e.amount;
              return acc;
            }, {})
          };
          
          reportData.detailedData = [
            ...monthlyFinExpenses.map((e: any) => ({ ...e, type: 'expense' })),
            ...monthlyFinPOs.map((po: any) => ({ ...po, type: 'purchase' })),
            ...monthlyFinSales.map((s: any) => ({ ...s, type: 'sales' }))
          ];
          break;

        case 'quotes':
          const quotes = await storage.getAllQuotes();
          const monthlyQuotes = quotes.filter((q: any) => {
            const quoteDate = new Date(q.createdAt);
            return quoteDate.getMonth() + 1 === monthNum && quoteDate.getFullYear() === yearNum;
          });
          
          // Get project and client details for each quote
          const quotesWithDetails = await Promise.all(
            monthlyQuotes.map(async (quote: any) => {
              const project = quote.projectId ? await storage.getProject(quote.projectId) : null;
              const client = quote.clientId ? await storage.getClient(quote.clientId) : null;
              return {
                ...quote,
                projectName: project ? project.name : 'N/A',
                clientName: client ? client.name : 'N/A'
              };
            })
          );
          
          reportData.detailedData = quotesWithDetails;
          reportData.totalQuotes = quotesWithDetails.length;
          reportData.totalValue = quotesWithDetails.reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0);
          break;

        case 'suppliers':
          const suppliers = await storage.getAllSuppliers();
          reportData.detailedData = suppliers.map((s: any) => ({
            ...s,
            productsCount: 0 // Could be enhanced to count actual supplier products
          }));
          reportData.totalSuppliers = suppliers.length;
          break;

        case 'stock-movements':
          const stockMovements = await storage.getAllStockMovements();
          const monthlyMovements = stockMovements.filter((sm: any) => {
            const movementDate = new Date(sm.createdAt);
            return movementDate.getMonth() + 1 === monthNum && movementDate.getFullYear() === yearNum;
          });
          
          // Get product and user details for each movement
          const movementsWithDetails = monthlyMovements.map((movement: any) => {
            return {
              ...movement,
              userName: movement.performedByName || 'Unknown User'
            };
          });
          
          reportData.detailedData = movementsWithDetails;
          reportData.totalStockMovements = movementsWithDetails.length;
          break;

        case 'user-activity':
          // For now, we'll use audit logs if available, otherwise create a simplified version
          try {
            const auditLogs = await storage.getAllAuditLogs();
            const monthlyLogs = auditLogs.filter((log: any) => {
              const logDate = new Date(log.createdAt);
              return logDate.getMonth() + 1 === monthNum && logDate.getFullYear() === yearNum;
            });
            
            const logsWithUsers = await Promise.all(
              monthlyLogs.map(async (log: any) => {
                const user = await storage.getUser(log.userId);
                return {
                  ...log,
                  userName: user ? user.name || user.username : 'Unknown User'
                };
              })
            );
            
            reportData.detailedData = logsWithUsers;
            reportData.totalUserActivity = logsWithUsers.length;
          } catch (error) {
            // If audit logs don't exist, create basic activity data
            reportData.detailedData = [];
            reportData.totalUserActivity = 0;
          }
          break;

        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      res.json(reportData);
    } catch (error) {
      console.error('Reports data error:', error);
      res.status(500).json({ message: "Failed to fetch report data", error: (error as Error).message });
    }
  });

  // Enhanced Export CSV route for all report types
  app.get("/api/reports/export", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const { type, category, month, year } = req.query;
      const monthNum = month ? parseInt(month as string) : undefined;
      const yearNum = year ? parseInt(year as string) : undefined;
      
      if (type === "inventory") {
        return exportProductsCSV(res, category as string);
      } else if (type === "material-requests") {
        return exportRequestsCSV(res);
      } else if (type === "low-stock") {
        return exportLowStockCSV(res);
      } else if (type === "attendance") {
        return exportAttendanceCSV(res, monthNum, yearNum);
      } else if (type === "quotes") {
        return exportQuotesCSV(res, monthNum, yearNum);
      } else if (type === "suppliers") {
        return exportSuppliersCSV(res);
      } else if (type === "stock-movements") {
        return exportStockMovementsCSV(res, monthNum, yearNum);
      } else if (type === "user-activity") {
        return exportUserActivityCSV(res, monthNum, yearNum);
      } else {
        return res.status(400).json({ message: "Invalid export type" });
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Export failed", error: (error as Error).message });
    }
  });

  // Payroll routes - Get payroll records
  app.get("/api/payroll", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { month, year, userId } = req.query;
      
      const monthNum = month && typeof month === 'string' ? parseInt(month) : undefined;
      const yearNum = year && typeof year === 'string' ? parseInt(year) : undefined;
      const userIdNum = userId && typeof userId === 'string' ? parseInt(userId) : undefined;
      
      const payrolls = await storage.getAllPayrolls(monthNum, yearNum, userIdNum);
      res.json(payrolls);
    } catch (error) {
      console.error("Failed to fetch payroll records:", error);
      res.status(500).json({ message: "Failed to fetch payroll records", error: String(error) });
    }
  });

  app.post("/api/payroll/generate", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const { userId, month, year } = req.body;
      
      if (!userId || !month || !year) {
        return res.status(400).json({ message: "User ID, month, and year are required" });
      }
      
      const payroll = await storage.generatePayroll(userId, month, year);
      res.json(payroll);
    } catch (error) {
      console.error("Payroll generation failed:", error);
      res.status(500).json({ message: "Payroll generation failed", error: String(error) });
    }
  });

  app.post("/api/payroll/:id/process", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const processedPayroll = await storage.processPayroll(id, req.user!.id);
      
      if (!processedPayroll) {
        return res.status(404).json({ message: "Payroll not found" });
      }
      
      res.json(processedPayroll);
    } catch (error) {
      console.error("Payroll processing failed:", error);
      res.status(500).json({ message: "Payroll processing failed", error: String(error) });
    }
  });

  // Update payroll with manual adjustments
  app.patch("/api/payroll/:id", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const payrollId = parseInt(req.params.id);
      const updates = req.body;
      
      if (!payrollId) {
        return res.status(400).json({ message: "Payroll ID is required" });
      }
      
      const updatedPayroll = await storage.updatePayroll(payrollId, updates);
      
      if (!updatedPayroll) {
        return res.status(404).json({ message: "Payroll not found" });
      }
      
      res.json(updatedPayroll);
    } catch (error) {
      console.error("Failed to update payroll:", error);
      res.status(500).json({ message: "Failed to update payroll", error: String(error) });
    }
  });

  // Petty Cash routes
  app.get("/api/petty-cash", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { category, status, addedBy, userId, projectId } = req.query;
      const filters = {
        category: category as string,
        status: status as string,
        addedBy: addedBy ? parseInt(addedBy as string) : undefined,
        projectId: projectId ? parseInt(projectId as string) : undefined,
      };
      
      // For staff and store_incharge users, automatically filter to show only their own expenses
      if (req.user!.role === 'staff' || req.user!.role === 'store_incharge') {
        filters.addedBy = req.user!.id;
      } else if (userId) {
        // Allow filtering by userId for admin/manager roles
        filters.addedBy = parseInt(userId as string);
      }
      
      const expenses = await storage.getAllPettyCashExpenses(filters);
      res.json(expenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses", error: String(error) });
    }
  });

  app.get("/api/petty-cash/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // For staff and store_incharge users, show only their personal stats
      if (req.user!.role === 'staff' || req.user!.role === 'store_incharge') {
        const personalStats = await storage.getPersonalPettyCashStats(req.user!.id);
        res.json(personalStats);
      } else {
        // Admin and manager can see global stats
        const stats = await storage.getPettyCashStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ message: "Failed to fetch stats", error: String(error) });
    }
  });

  // Personal stats for staff users
  app.get("/api/petty-cash/my-stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const personalStats = await storage.getPersonalPettyCashStats(userId);
      res.json(personalStats);
    } catch (error) {
      console.error("Failed to fetch personal stats:", error);
      res.status(500).json({ message: "Failed to fetch personal stats", error: String(error) });
    }
  });

  app.get("/api/petty-cash/summary", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // For staff and store_incharge users, show only their personal summary
      if (req.user!.role === 'staff' || req.user!.role === 'store_incharge') {
        const personalStats = await storage.getPersonalPettyCashStats(req.user!.id);
        res.json(personalStats);
      } else {
        // Admin and manager can see global summary
        const stats = await storage.getPettyCashStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      res.status(500).json({ message: "Failed to fetch summary", error: String(error) });
    }
  });

  // Get staff balances (admin/manager only)
  app.get("/api/petty-cash/staff-balances", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const balances = await storage.getAllStaffBalances();
      res.json(balances);
    } catch (error) {
      console.error("Failed to fetch staff balances:", error);
      res.status(500).json({ message: "Failed to fetch staff balances", error: String(error) });
    }
  });

  // Get individual staff balance
  app.get("/api/petty-cash/staff-balance/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Staff and store_incharge can only access their own balance
      if ((req.user!.role === 'staff' || req.user!.role === 'store_incharge') && userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied: Can only view your own balance" });
      }
      
      const balance = await storage.getStaffBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error("Failed to fetch staff balance:", error);
      res.status(500).json({ message: "Failed to fetch staff balance", error: String(error) });
    }
  });

  app.post("/api/petty-cash", authenticateToken, receiptImageUpload.single("receipt"), async (req: AuthRequest, res) => {
    try {
      // console.log("=== PETTY CASH EXPENSE SUBMISSION ===");
      // console.log("File uploaded:", req.file ? {
      //   originalname: req.file.originalname,
      //   mimetype: req.file.mimetype,
      //   size: req.file.size,
      //   path: req.file.path,
      //   fieldname: req.file.fieldname
      // } : "No file");
      // console.log("Request body:", req.body);
      
      // First create the expense without image to get the ID
      const expenseData = {
        category: req.body.category || null,
        amount: parseFloat(req.body.amount),
        vendor: req.body.vendor || null,
        description: req.body.description || null,
        projectId: req.body.projectId && req.body.projectId !== "" ? parseInt(req.body.projectId) : null,
        orderNo: req.body.orderNo || null,
        paidBy: req.body.paidBy && req.body.paidBy !== "" ? parseInt(req.body.paidBy) : null,
        expenseDate: new Date(req.body.expenseDate),
        addedBy: req.user!.id,
        receiptImageUrl: null,
        status: req.body.status || "expense", // Default to expense status, allow income
      };
      
      // console.log("Constructed expense data:", expenseData);
      
      const expense = await storage.createPettyCashExpense(expenseData);
      // console.log("Expense created successfully:", expense.id);
      
      // If there's an uploaded file, rename it with the expense ID
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        
        // Get file extension from mimetype or original name
        let extension = '.png'; // default
        if (req.file.mimetype === 'image/jpeg') extension = '.jpg';
        else if (req.file.mimetype === 'image/png') extension = '.png';
        else if (req.file.originalname) {
          const ext = path.extname(req.file.originalname);
          if (ext) extension = ext;
        }
        
        // Create new filename with zero-padded ID: 001.png, 012.jpg, etc.
        const paddedId = expense.id.toString().padStart(3, '0');
        const newFileName = `${paddedId}${extension}`;
        const newPath = `uploads/receipts/${newFileName}`;
        
        // Move file from temp location to new name
        fs.renameSync(req.file.path, newPath);
        // console.log(`Receipt image renamed from ${req.file.path} to ${newPath}`);
        
        // Update expense with new image path
        await storage.updatePettyCashExpense(expense.id, {
          receiptImageUrl: newPath
        });
        
        // Return updated expense
        const updatedExpenses = await storage.getPettyCashExpenses();
        const updatedExpense = updatedExpenses.find(e => e.id === expense.id);
        res.json(updatedExpense || expense);
      } else {
        res.json(expense);
      }
    } catch (error) {
      console.error("Failed to add expense:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add expense", error: String(error) });
    }
  });

  // Add funds endpoint (income)
  app.post("/api/petty-cash/funds", authenticateToken, receiptImageUpload.single("receipt"), async (req: AuthRequest, res) => {
    try {
      console.log("Funds file uploaded:", req.file);
      console.log("Funds request body:", req.body);
      
      // First create the funds entry without image to get the ID
      const fundsData = {
        category: "", // Funds don't need category
        amount: parseFloat(req.body.amount),
        vendor: req.body.paidTo, // Source of funds
        description: req.body.note,
        orderNo: "",
        paidBy: req.body.receivedBy ? parseInt(req.body.receivedBy) : undefined, // Staff member who received funds
        expenseDate: new Date(req.body.expenseDate),
        addedBy: req.user!.id,
        receiptImageUrl: null,
        status: "income", // Always income for funds
      };
      
      const funds = await storage.createPettyCashExpense(fundsData);
      console.log("Funds entry created successfully:", funds.id);
      
      // If there's an uploaded file, rename it with the funds ID
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        
        // Get file extension from mimetype or original name
        let extension = '.png'; // default
        if (req.file.mimetype === 'image/jpeg') extension = '.jpg';
        else if (req.file.mimetype === 'image/png') extension = '.png';
        else if (req.file.originalname) {
          const ext = path.extname(req.file.originalname);
          if (ext) extension = ext;
        }
        
        // Create new filename with zero-padded ID: 001.png, 012.jpg, etc.
        const paddedId = funds.id.toString().padStart(3, '0');
        const newFileName = `${paddedId}${extension}`;
        const newPath = `uploads/receipts/${newFileName}`;
        
        // Move file from temp location to new name
        fs.renameSync(req.file.path, newPath);
        // console.log(`Receipt image renamed from ${req.file.path} to ${newPath}`);
        
        // Update funds with new image path
        await storage.updatePettyCashExpense(funds.id, {
          receiptImageUrl: newPath
        });
        
        // Return updated funds entry
        const updatedFunds = await storage.getPettyCashExpenses();
        const updatedFund = updatedFunds.find(f => f.id === funds.id);
        res.json(updatedFund || funds);
      } else {
        res.json(funds);
      }
    } catch (error) {
      console.error("Failed to add funds:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid funds data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add funds", error: String(error) });
    }
  });

  app.put("/api/petty-cash/:id", authenticateToken, receiptImageUpload.single("receipt"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Properly construct update data with correct field names and type conversions
      const updateData: any = {};
      
      if (req.body.amount !== undefined) {
        updateData.amount = parseFloat(req.body.amount);
      }
      
      if (req.body.projectId !== undefined) {
        updateData.projectId = req.body.projectId ? parseInt(req.body.projectId) : null;
      }
      
      if (req.body.vendor !== undefined) {
        updateData.vendor = req.body.vendor;
      }
      
      if (req.body.description !== undefined) {
        updateData.description = req.body.description;
      }
      
      if (req.body.category !== undefined) {
        updateData.category = req.body.category;
      }
      
      if (req.body.paidBy !== undefined) {
        updateData.paidBy = req.body.paidBy ? parseInt(req.body.paidBy) : null;
      }
      
      if (req.body.expenseDate !== undefined) {
        updateData.expenseDate = new Date(req.body.expenseDate);
      }
      
      console.log("Update data being sent:", updateData);
      
      // Update the expense first
      const expense = await storage.updatePettyCashExpense(id, updateData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // If there's an uploaded file, rename it with the expense ID
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        
        // Get file extension from mimetype or original name
        let extension = '.png'; // default
        if (req.file.mimetype === 'image/jpeg') extension = '.jpg';
        else if (req.file.mimetype === 'image/png') extension = '.png';
        else if (req.file.originalname) {
          const ext = path.extname(req.file.originalname);
          if (ext) extension = ext;
        }
        
        // Create new filename with zero-padded ID: 001.png, 012.jpg, etc.
        const paddedId = id.toString().padStart(3, '0');
        const newFileName = `${paddedId}${extension}`;
        const newPath = `uploads/receipts/${newFileName}`;
        
        // Move file from temp location to new name
        fs.renameSync(req.file.path, newPath);
        // console.log(`Receipt image renamed from ${req.file.path} to ${newPath}`);
        
        // Update expense with new image path
        await storage.updatePettyCashExpense(id, {
          receiptImageUrl: newPath
        });
        
        // Return updated expense
        const updatedExpenses = await storage.getPettyCashExpenses();
        const updatedExpense = updatedExpenses.find(e => e.id === id);
        res.json(updatedExpense || expense);
      } else {
        res.json(expense);
      }
    } catch (error) {
      console.error("Failed to update expense:", error);
      res.status(500).json({ message: "Failed to update expense", error: String(error) });
    }
  });

  app.delete("/api/petty-cash/:id", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePettyCashExpense(id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Failed to delete expense:", error);
      res.status(500).json({ message: "Failed to delete expense", error: String(error) });
    }
  });

  // Moodboard routes
  app.get("/api/moodboards", authenticateToken, async (req, res) => {
    try {
      const { linkedProjectId, createdBy } = req.query;
      const filters = {
        linkedProjectId: linkedProjectId ? parseInt(linkedProjectId as string) : undefined,
        createdBy: createdBy ? parseInt(createdBy as string) : undefined,
      };
      
      const moodboards = await storage.getAllMoodboards(filters);
      res.json(moodboards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch moodboards", error });
    }
  });

  app.get("/api/moodboards/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const moodboard = await storage.getMoodboard(id);
      
      if (!moodboard) {
        return res.status(404).json({ message: "Moodboard not found" });
      }
      
      res.json(moodboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch moodboard", error });
    }
  });

  app.post("/api/moodboards", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const moodboardData = insertMoodboardSchema.parse({
        ...req.body,
        createdBy: user.id,
      });
      
      const moodboard = await storage.createMoodboard(moodboardData);
      res.status(201).json(moodboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create moodboard", error });
    }
  });

  app.put("/api/moodboards/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const moodboard = await storage.updateMoodboard(id, updates);
      
      if (!moodboard) {
        return res.status(404).json({ message: "Moodboard not found" });
      }
      
      res.json(moodboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to update moodboard", error });
    }
  });

  app.delete("/api/moodboards/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMoodboard(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Moodboard not found" });
      }
      
      res.json({ message: "Moodboard deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete moodboard", error });
    }
  });

  // Get moodboards for a specific project
  app.get("/api/projects/:projectId/moodboards", authenticateToken, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const moodboards = await storage.getMoodboardsByProject(projectId);
      res.json(moodboards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project moodboards", error });
    }
  });

  // Task Management routes
  app.get("/api/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const filters: any = {};
      
      // Role-based filtering: Staff and Store Keepers only see their own tasks, Admin/Manager see all
      if (user.role === 'staff' || user.role === 'store_incharge') {
        filters.assignedTo = user.id;
      }
      
      // Optional filters from query params
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.assignedTo) {
        filters.assignedTo = parseInt(req.query.assignedTo as string);
      }
      if (req.query.projectId) {
        filters.projectId = parseInt(req.query.projectId as string);
      }
      
      const tasks = await storage.getAllTasks(filters);
      
      // Include assigned user and project information for better display
      const tasksWithUsers = await Promise.all(
        tasks.map(async (task) => {
          const assignedUser = await storage.getUser(task.assignedTo);
          const assignedByUser = await storage.getUser(task.assignedBy);
          return {
            ...task,
            assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, username: assignedUser.username } : null,
            assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
            // Project information is already included from the storage query
            project: task.projectId ? {
              id: task.projectId,
              name: task.projectName,
              code: task.projectCode,
              stage: task.projectStage
            } : null,
          };
        })
      );
      
      res.json(tasksWithUsers);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks", error: String(error) });
    }
  });

  app.get("/api/tasks/my", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const tasks = await storage.getAllTasks({ assignedTo: user.id });
      
      // Include assigned user and project information
      const tasksWithUsers = await Promise.all(
        tasks.map(async (task) => {
          const assignedByUser = await storage.getUser(task.assignedBy);
          return {
            ...task,
            assignedUser: { id: user.id, name: user.name, username: user.username },
            assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
            project: task.projectId ? {
              id: task.projectId,
              name: task.projectName,
              code: task.projectCode,
              stage: task.projectStage
            } : null,
          };
        })
      );
      
      res.json(tasksWithUsers);
    } catch (error) {
      console.error("Failed to fetch my tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks", error: String(error) });
    }
  });

  app.get("/api/tasks/today", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const allTasks = await storage.getAllTasks({ assignedTo: user.id });
      
      // Filter tasks due today
      const todayTasks = allTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= today && dueDate < tomorrow;
      });
      
      // Include user information
      const tasksWithUsers = await Promise.all(
        todayTasks.map(async (task) => {
          const assignedByUser = await storage.getUser(task.assignedBy);
          return {
            ...task,
            assignedUser: { id: user.id, name: user.name, username: user.username },
            assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
          };
        })
      );
      
      res.json(tasksWithUsers);
    } catch (error) {
      console.error("Failed to fetch today's tasks:", error);
      res.status(500).json({ message: "Failed to fetch today's tasks", error: String(error) });
    }
  });

  // Get notification tasks (pending/in-progress for current user)
  app.get("/api/tasks/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      // Only fetch for staff members, not admins
      if (user.role === 'admin') {
        return res.json([]);
      }
      
      const allTasks = await storage.getAllTasks({ assignedTo: user.id });
      
      // Filter only pending and in-progress tasks
      const pendingTasks = allTasks.filter(task => 
        task.status === 'pending' || task.status === 'in_progress'
      );
      
      // Include assigned user information for better display
      const tasksWithUsers = await Promise.all(
        pendingTasks.map(async (task) => {
          const assignedByUser = await storage.getUser(task.assignedBy);
          return {
            ...task,
            assignedUser: { id: user.id, name: user.name, username: user.username },
            assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
          };
        })
      );
      
      res.json(tasksWithUsers);
    } catch (error) {
      console.error("Failed to fetch notification tasks:", error);
      res.status(500).json({ message: "Failed to fetch notification tasks", error: String(error) });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        assignedTo: parseInt(req.body.assignedTo),
        assignedBy: req.user!.id,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
      });
      
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Failed to create task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task", error: String(error) });
    }
  });

  // Get single task by ID
  app.get("/api/tasks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const user = req.user!;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Permission check: Only admin, assigned user, or task creator can view task details
      if (user.role !== 'admin' && task.assignedTo !== user.id && task.assignedBy !== user.id) {
        return res.status(403).json({ message: "You don't have permission to view this task" });
      }
      
      // Include user information
      const assignedUser = await storage.getUser(task.assignedTo);
      const assignedByUser = await storage.getUser(task.assignedBy);
      
      const taskWithUsers = {
        ...task,
        assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, username: assignedUser.username } : null,
        assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
        project: task.projectId ? {
          id: task.projectId,
          name: task.projectName,
          code: task.projectCode,
          stage: task.projectStage
        } : null,
      };
      
      res.json(taskWithUsers);
    } catch (error) {
      console.error("Failed to fetch task:", error);
      res.status(500).json({ message: "Failed to fetch task", error: String(error) });
    }
  });

  app.patch("/api/tasks/:id/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;
      const user = req.user!;
      
      // Validate status
      if (!['pending', 'in_progress', 'done'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Get the task to check permissions
      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Permission check: Only assigned user or admin can update status
      if (user.role !== 'admin' && existingTask.assignedTo !== user.id) {
        return res.status(403).json({ message: "You can only update tasks assigned to you" });
      }
      
      const updateData: any = { status };
      
      // Set completedAt when marking as done
      if (status === 'done' && existingTask.status !== 'done') {
        updateData.completedAt = new Date();
      } else if (status !== 'done') {
        updateData.completedAt = null;
      }
      
      const task = await storage.updateTask(taskId, updateData);
      res.json(task);
    } catch (error) {
      console.error("Failed to update task status:", error);
      res.status(500).json({ message: "Failed to update task", error: String(error) });
    }
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const user = req.user!;
      
      // Get the task to check permissions
      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Permission check: Only admin or task creator can update full task details
      if (user.role !== 'admin' && existingTask.assignedBy !== user.id) {
        return res.status(403).json({ message: "You can only update tasks you created" });
      }
      
      const updates = insertTaskSchema.partial().parse({
        ...req.body,
        assignedTo: req.body.assignedTo ? parseInt(req.body.assignedTo) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      });
      
      const task = await storage.updateTask(taskId, updates);
      res.json(task);
    } catch (error) {
      console.error("Failed to update task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task", error: String(error) });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const deleted = await storage.deleteTask(taskId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Failed to delete task:", error);
      res.status(500).json({ message: "Failed to delete task", error: String(error) });
    }
  });

  // Project Management Routes - Phase 1
  app.get("/api/projects", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { stage, clientId } = req.query;
      const filters: any = {};
      
      if (stage) filters.stage = stage as string;
      if (clientId) filters.clientId = parseInt(clientId as string);
      
      const projects = await storage.getAllProjects(filters);
      res.json(projects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: String(error) });
    }
  });

  app.post("/api/projects", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Failed to create project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project", error: String(error) });
    }
  });

  app.get("/api/projects/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log("API Route: Fetching project with ID:", projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        console.log("API Route: Project not found for ID:", projectId);
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log("API Route: Project found, client_name:", project.client_name, "client_mobile:", project.client_mobile);
      res.json(project);
    } catch (error) {
      console.error("Failed to fetch project:", error);
      res.status(500).json({ message: "Failed to fetch project", error: String(error) });
    }
  });

  app.patch("/api/projects/:id", authenticateToken, requireRole(["admin", "manager"]), async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      
      const project = await storage.updateProject(projectId, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Failed to update project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project", error: String(error) });
    }
  });

  app.delete("/api/projects/:id", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const deleted = await storage.deleteProject(projectId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Failed to delete project:", error);
      res.status(500).json({ message: "Failed to delete project", error: String(error) });
    }
  });

  // Project Files Routes
  app.get("/api/projects/:id/files", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error("Failed to fetch project files:", error);
      res.status(500).json({ message: "Failed to fetch project files", error: String(error) });
    }
  });

  app.post("/api/projects/:id/files", authenticateToken, projectFileUpload.array('files', 10), async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { category, title, clientVisible } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = [];
      for (const file of files) {
        const fileData = {
          projectId,
          clientId: null as number | null, // Will be set based on project
          fileName: file.filename,
          originalName: file.originalname,
          filePath: `uploads/projects/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: category || 'general',
          description: title,
          uploadedBy: req.user!.id,
          isPublic: clientVisible === 'true',
        };

        const uploadedFile = await storage.createProjectFile(fileData);
        uploadedFiles.push(uploadedFile);
      }

      res.json({ message: "Files uploaded successfully", files: uploadedFiles });
    } catch (error) {
      console.error("Failed to upload files:", error);
      res.status(500).json({ message: "Failed to upload files", error: String(error) });
    }
  });

  // Alternative upload route for note attachments  
  app.post("/api/projects/:projectId/upload", authenticateToken, projectFileUpload.array('files', 10), async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { category, title, clientVisible, type } = req.body;
      const files = req.files as Express.Multer.File[];
      
      console.log('Upload request - projectId:', projectId);
      console.log('Upload request - user:', req.user?.id);
      console.log('Upload request - files:', files?.length || 0);
      console.log('Upload request - body:', req.body);
      
      if (!files || files.length === 0) {
        console.log('No files uploaded, returning empty response');
        return res.json({ message: "No files uploaded", files: [] });
      }

      const uploadedFiles = [];
      for (const file of files) {
        const fileData = {
          projectId,
          clientId: null,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: `uploads/projects/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: type === 'note-attachment' ? 'note-attachment' : (category || 'general'),
          description: title || `Attachment from ${type || 'upload'}`,
          uploadedBy: req.user!.id,
          isPublic: clientVisible === 'true',
        };

        const uploadedFile = await storage.createProjectFile(fileData);
        uploadedFiles.push(uploadedFile);
      }

      console.log('Uploaded files:', uploadedFiles);
      res.json({ message: "Files uploaded successfully", files: uploadedFiles });
    } catch (error) {
      console.error("Failed to upload files:", error);
      res.status(500).json({ message: "Failed to upload files", error: String(error) });
    }
  });

  // Delete project file
  app.delete("/api/projects/:projectId/files/:fileId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);
      
      // Get file info first to delete from filesystem
      const file = await storage.getProjectFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete from filesystem
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join('uploads/projects', file.fileName);
      
      try {
        await fs.unlink(filePath);
      } catch (fsError) {
        console.warn('File not found on filesystem:', filePath);
      }

      // Delete from database
      const success = await storage.deleteProjectFile(fileId);
      if (!success) {
        return res.status(404).json({ message: "Failed to delete file from database" });
      }
      
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file", error: String(error) });
    }
  });

  // Update file comment and/or description
  app.put("/api/files/:fileId/comment", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const { comment, description } = req.body;
      
      // Build update object based on what fields are provided
      const updateData: any = { updatedAt: new Date() };
      if (comment !== undefined) updateData.comment = comment;
      if (description !== undefined) updateData.description = description;
      
      // Direct database update for flexibility
      const result = await db.update(projectFiles)
        .set(updateData)
        .where(eq(projectFiles.id, fileId));
        
      if (!result.rowCount || result.rowCount === 0) {
        return res.status(404).json({ message: "File not found or update failed" });
      }
      
      res.json({ message: "File updated successfully" });
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: "Failed to update file", error: String(error) });
    }
  });

  // Batch update file titles (descriptions)
  app.put("/api/projects/:projectId/files/batch-update-title", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { fileIds, description } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: "fileIds array is required" });
      }

      if (!description || typeof description !== 'string') {
        return res.status(400).json({ message: "description is required" });
      }

      // Temporary workaround - update files individually
      let successCount = 0;
      for (const fileId of fileIds) {
        const result = await db.update(projectFiles)
          .set({ description, updatedAt: new Date() })
          .where(eq(projectFiles.id, fileId));
        if (result.rowCount && result.rowCount > 0) {
          successCount++;
        }
      }
      const success = successCount > 0;
      if (!success) {
        return res.status(404).json({ message: "Files not found or update failed" });
      }

      res.json({ message: "File descriptions updated successfully" });
    } catch (error) {
      console.error("Error batch updating file descriptions:", error);
      res.status(500).json({ message: "Failed to update file descriptions", error: String(error) });
    }
  });

  // Project Log Routes
  app.get("/api/projects/:id/logs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const logs = await storage.getProjectLogs(projectId);
      res.json(logs);
    } catch (error) {
      console.error("Failed to fetch project logs:", error);
      res.status(500).json({ message: "Failed to fetch project logs", error: String(error) });
    }
  });

  app.post("/api/projects/:id/logs", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const logData = {
        ...req.body,
        projectId,
        createdBy: req.user!.id,
      };
      
      const log = await storage.createProjectLog(logData);
      res.json(log);
    } catch (error) {
      console.error("Failed to create project log:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project log", error: String(error) });
    }
  });

  app.put("/api/projects/:projectId/logs/:logId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const logId = parseInt(req.params.logId);
      const projectId = parseInt(req.params.projectId);
      
      const updatedLogData = {
        ...req.body,
        projectId,
        createdBy: req.user!.id
      };
      
      const updatedLog = await storage.updateProjectLog(logId, updatedLogData);
      
      if (updatedLog) {
        res.json(updatedLog);
      } else {
        res.status(404).json({ message: "Log not found" });
      }
    } catch (error) {
      console.error("Failed to update project log:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project log", error: String(error) });
    }
  });

  app.delete("/api/projects/:projectId/logs/:logId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const logId = parseInt(req.params.logId);
      const success = await storage.deleteProjectLog(logId);
      
      if (success) {
        res.json({ message: "Project log deleted successfully" });
      } else {
        res.status(404).json({ message: "Project log not found" });
      }
    } catch (error) {
      console.error("Failed to delete project log:", error);
      res.status(500).json({ message: "Failed to delete project log", error: String(error) });
    }
  });

  // Price Comparison routes
  app.get("/api/price-comparisons", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const comparisons = await storage.getAllPriceComparisons();
      res.json(comparisons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comparisons", error });
    }
  });

  app.post("/api/price-comparisons", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const comparison = await storage.createPriceComparison({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ message: "Failed to create comparison", error });
    }
  });

  // WhatsApp Export routes
  app.post("/api/whatsapp/generate-message", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { template, items } = req.body;
      // Generate simple WhatsApp message for now
      const message = `Template: ${template}\nItems: ${items.length} items`;
      res.json({ message });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate message", error });
    }
  });

  app.post("/api/whatsapp/send", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // This would integrate with WhatsApp Business API
      // For now, just return success
      res.json({ success: true, message: "Message prepared for WhatsApp" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message", error });
    }
  });

  // OCR Enhancement API endpoints
  app.post("/api/ocr/analyze", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { text, documentType, customPatterns } = req.body;
      
      // AI-powered field extraction based on document type
      const extractedFields: any = {}; // Simple implementation for now
      
      res.json({
        success: true,
        extractedFields,
        confidence: 85,
        suggestions: []
      });
    } catch (error) {
      console.error('OCR Analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze OCR text' });
    }
  });

  app.post("/api/ocr/save-template", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, documentType, patterns, description } = req.body;
      
      // Save custom OCR template for future use
      const template = {
        id: Date.now(),
        name,
        documentType,
        patterns,
        description,
        createdBy: req.user!.id,
        createdAt: new Date().toISOString()
      };
      
      res.json({ success: true, template });
    } catch (error) {
      console.error('Save template error:', error);
      res.status(500).json({ error: 'Failed to save OCR template' });
    }
  });

  app.get("/api/ocr/templates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Return saved OCR templates for the user
      const templates: any[] = [];
      
      res.json({ success: true, templates });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ error: 'Failed to fetch OCR templates' });
    }
  });

  // Inventory Movement routes
  app.get("/api/inventory/movements", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log('Fetching stock movements...');
      const movements = await storage.getAllStockMovements();
      console.log(`Found ${movements.length} movements`);
      res.json(movements);
    } catch (error) {
      console.error('Stock movements API error:', error);
      res.status(500).json({ message: "Failed to fetch movements", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Inventory Optimization Routes
  app.get("/api/inventory/optimization", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { generateInventoryOptimizationReport } = await import("./utils/inventoryOptimization");
      const report = await generateInventoryOptimizationReport();
      res.json(report);
    } catch (error) {
      console.error('Inventory optimization error:', error);
      res.status(500).json({ 
        message: "Failed to generate optimization report", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/inventory/reorder-points", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { calculateOptimalReorderPoints } = await import("./utils/inventoryOptimization");
      const reorderPoints = await calculateOptimalReorderPoints();
      res.json(reorderPoints);
    } catch (error) {
      console.error('Reorder points calculation error:', error);
      res.status(500).json({ 
        message: "Failed to calculate reorder points", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/inventory/dead-stock", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { identifyDeadStock } = await import("./utils/inventoryOptimization");
      const deadStock = await identifyDeadStock();
      res.json(deadStock);
    } catch (error) {
      console.error('Dead stock identification error:', error);
      res.status(500).json({ 
        message: "Failed to identify dead stock", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/inventory/seasonal-forecast", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { generateSeasonalForecast } = await import("./utils/inventoryOptimization");
      const forecast = await generateSeasonalForecast();
      res.json(forecast);
    } catch (error) {
      console.error('Seasonal forecast error:', error);
      res.status(500).json({ 
        message: "Failed to generate seasonal forecast", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/inventory/movements", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Map frontend fields to database fields including enhanced fields
      const movementData = {
        productId: parseInt(req.body.productId),
        movementType: req.body.type, // Map 'type' to 'movementType'
        quantity: req.body.quantity,
        previousStock: 0, // Will be calculated
        newStock: 0, // Will be calculated
        reference: req.body.reference || null,
        notes: req.body.notes || null,
        // Enhanced fields for better tracking
        projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
        reason: req.body.reason || 'General',
        destination: req.body.destination || null,
        vendor: req.body.vendor || null,
        invoiceNumber: req.body.invoiceNumber || null,
        costPerUnit: req.body.costPerUnit ? parseFloat(req.body.costPerUnit) : null,
        totalCost: null as number | null, // Will be calculated if costPerUnit is provided
        performedBy: req.user!.id,
      };

      // Get current product stock and calculate new stock
      const product = await storage.getProduct(movementData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      movementData.previousStock = product.currentStock;
      
      // Calculate new stock based on movement type
      let newStock;
      if (movementData.movementType === 'in') {
        newStock = product.currentStock + movementData.quantity;
      } else {
        newStock = Math.max(0, product.currentStock - movementData.quantity);
      }
      
      movementData.newStock = newStock;

      // Calculate total cost if cost per unit is provided
      if (movementData.costPerUnit) {
        movementData.totalCost = movementData.costPerUnit * movementData.quantity;
      }

      // Update product stock first
      await storage.updateProduct(movementData.productId, { 
        currentStock: newStock
      });

      // Create movement record
      const movement = await storage.createStockMovement(movementData);
      res.json(movement);
    } catch (error) {
      console.error('Create stock movement API error:', error);  
      res.status(500).json({ message: "Failed to record movement", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete inventory movement (Admin only)
  app.delete("/api/inventory/movements/:id", authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const movementId = parseInt(req.params.id);
      
      // Get the movement details first to reverse the stock change
      const movement = await storage.getStockMovement(movementId);
      if (!movement) {
        return res.status(404).json({ message: "Movement not found" });
      }

      // Get the product to update stock
      const product = await storage.getProduct(movement.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Reverse the stock change
      let reversedStock;
      if (movement.movementType === 'in' || movement.movementType === 'inward') {
        // If it was an inward movement, subtract the quantity back
        reversedStock = product.currentStock - movement.quantity;
      } else {
        // If it was an outward movement, add the quantity back
        reversedStock = product.currentStock + movement.quantity;
      }

      // Update product stock
      await storage.updateProduct(movement.productId, { 
        currentStock: Math.max(0, reversedStock)
      });

      // Delete the movement record
      await storage.deleteStockMovement(movementId);

      res.json({ 
        message: "Movement deleted successfully", 
        reversedStock: Math.max(0, reversedStock) 
      });
    } catch (error) {
      console.error('Delete stock movement API error:', error);
      res.status(500).json({ message: "Failed to delete movement", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Sales Products routes
  app.get("/api/sales-products", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const category = req.query.category as string;
      const products = await storage.getAllSalesProducts(category);
      res.json(products);
    } catch (error) {
      console.error("Get sales products error:", error);
      res.status(500).json({ message: "Failed to fetch sales products" });
    }
  });

  // Get unique product categories
  app.get("/api/sales-products/categories", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const categories = await storage.getSalesProductCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get product categories error:", error);
      res.status(500).json({ message: "Failed to fetch product categories" });
    }
  });

  // Get product image endpoint
  app.get("/api/sales-products/:id/image", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getSalesProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // If product has an image URL, redirect to the static file
      if (product.imageUrl) {
        // Remove leading slash if present and redirect to uploads route
        const imagePath = product.imageUrl.startsWith('/') ? product.imageUrl.substring(1) : product.imageUrl;
        return res.redirect(`/${imagePath}`);
      }

      // If no image, return 404
      res.status(404).json({ message: "No image found for this product" });
    } catch (error) {
      console.error("Get product image error:", error);
      res.status(500).json({ message: "Failed to fetch product image" });
    }
  });

  app.post("/api/sales-products", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertSalesProductSchema.parse(req.body);
      const product = await storage.createSalesProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Create sales product error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sales product" });
    }
  });

  app.put("/api/sales-products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const validatedData = insertSalesProductSchema.partial().parse(req.body);
      const product = await storage.updateSalesProduct(productId, validatedData);
      
      if (!product) {
        return res.status(404).json({ message: "Sales product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Update sales product error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sales product" });
    }
  });

  app.delete("/api/sales-products/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const success = await storage.deleteSalesProduct(productId);
      if (!success) {
        return res.status(404).json({ message: "Sales product not found" });
      }
      
      res.json({ message: "Sales product deleted successfully" });
    } catch (error) {
      console.error("Delete sales product error:", error);
      res.status(500).json({ message: "Failed to delete sales product" });
    }
  });

  // Quotes routes
  app.get("/api/quotes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quotes = await storage.getAllQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Get quotes error:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/projects/:projectId/quotes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const quotes = await storage.getQuotesByProject(projectId);
      res.json(quotes);
    } catch (error) {
      console.error("Get project quotes error:", error);
      res.status(500).json({ message: "Failed to fetch project quotes" });
    }
  });

  app.post("/api/quotes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { items, ...quoteData } = req.body;
      
      const validatedData = insertQuoteSchema.parse({
        ...quoteData,
        createdBy: req.user!.id,
      });
      
      // Create quote first
      const quote = await storage.createQuote(validatedData);
      
      // Create quote items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await storage.updateQuoteItems(quote.id, items);
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Create quote error:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get("/api/quotes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuoteWithItems(quoteId);
      res.json(quote);
    } catch (error) {
      console.error("Get quote error:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Update quote
  app.put("/api/quotes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { items, ...quoteData } = req.body;
      
      // Update quote first
      const updatedQuote = await storage.updateQuote(quoteId, quoteData);
      
      // Update quote items if provided
      if (items && Array.isArray(items)) {
        await storage.updateQuoteItems(quoteId, items);
      }
      
      res.json(updatedQuote);
    } catch (error) {
      console.error("Update quote error:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Delete quote
  app.delete("/api/quotes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      await storage.deleteQuote(quoteId);
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Delete quote error:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Get quote details with items
  app.get("/api/quotes/:id/details", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuoteWithItems(quoteId);
      res.json(quote);
    } catch (error) {
      console.error("Get quote details error:", error);
      res.status(500).json({ message: "Failed to fetch quote details" });
    }
  });

  // Get quote items
  app.get("/api/quotes/:id/items", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const items = await storage.getQuoteItems(quoteId);
      res.json(items);
    } catch (error) {
      console.error("Get quote items error:", error);
      res.status(500).json({ message: "Failed to fetch quote items" });
    }
  });

  // Update quote
  app.put("/api/quotes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { items, ...quoteData } = req.body;
      
      // Update quote
      const updatedQuote = await storage.updateQuote(quoteId, quoteData);
      
      // Update quote items if provided
      if (items && Array.isArray(items)) {
        await storage.updateQuoteItems(quoteId, items);
      }
      
      res.json(updatedQuote);
    } catch (error) {
      console.error("Update quote error:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // AI Image Generation functionality removed for simplicity - moodboards now use manual uploads only

  // Purchase Order System Routes

  // Supplier routes
  app.get("/api/suppliers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { search, preferred } = req.query;
      const filters: any = {};
      if (search) filters.search = search as string;
      if (preferred !== undefined) filters.preferred = preferred === 'true';
      
      const suppliers = await storage.getAllSuppliers(filters);
      res.json(suppliers);
    } catch (error) {
      console.error("Get suppliers error:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const supplier = await storage.getSupplier(supplierId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("Get supplier error:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertSupplierSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Create supplier error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedSupplier = await storage.updateSupplier(supplierId, updates);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(updatedSupplier);
    } catch (error) {
      console.error("Update supplier error:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const success = await storage.deleteSupplier(supplierId);
      
      if (!success) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Purchase Order routes
  app.get("/api/purchase-orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { status, supplierId, autoGenerated } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (supplierId) filters.supplierId = parseInt(supplierId as string);
      if (autoGenerated !== undefined) filters.autoGenerated = autoGenerated === 'true';
      
      const pos = await storage.getAllPurchaseOrders(filters);
      res.json(pos);
    } catch (error) {
      console.error("Get purchase orders error:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      const po = await storage.getPurchaseOrder(poId);
      
      if (!po) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      res.json(po);
    } catch (error) {
      console.error("Get purchase order error:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post("/api/purchase-orders", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const { items, ...poData } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Purchase order must have at least one item" });
      }
      
      const validatedPO = insertPurchaseOrderSchema.parse({
        ...poData,
        createdBy: req.user!.id
      });
      
      const validatedItems = items.map((item: any) => 
        insertPurchaseOrderItemSchema.parse(item)
      );
      
      const po = await storage.createPurchaseOrder(validatedPO, validatedItems);
      res.status(201).json(po);
    } catch (error) {
      console.error("Create purchase order error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.put("/api/purchase-orders/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      
      // Check if PO exists and is in draft status
      const existingPO = await storage.getPurchaseOrder(poId);
      if (!existingPO) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      if (existingPO.status !== 'draft') {
        return res.status(400).json({ message: "Can only edit draft purchase orders" });
      }
      
      const updates = req.body;
      const updatedPO = await storage.updatePurchaseOrder(poId, updates);
      
      res.json(updatedPO);
    } catch (error) {
      console.error("Update purchase order error:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.post("/api/purchase-orders/:id/send", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      
      const updatedPO = await storage.updatePurchaseOrderStatus(poId, 'sent', req.user!.id);
      
      if (!updatedPO) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // TODO: Implement email sending functionality here
      
      res.json({ 
        message: "Purchase order sent successfully",
        po: updatedPO 
      });
    } catch (error) {
      console.error("Send purchase order error:", error);
      res.status(500).json({ message: "Failed to send purchase order" });
    }
  });

  app.post("/api/purchase-orders/:id/receive", authenticateToken, requireRole(['admin', 'manager', 'store_incharge']), async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      const { receivedItems } = req.body;
      
      if (!receivedItems || !Array.isArray(receivedItems)) {
        return res.status(400).json({ message: "Received items data is required" });
      }
      
      const success = await storage.receivePurchaseOrder(poId, receivedItems, req.user!.id);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to receive purchase order" });
      }
      
      res.json({ message: "Purchase order received successfully" });
    } catch (error) {
      console.error("Receive purchase order error:", error);
      res.status(500).json({ message: "Failed to receive purchase order" });
    }
  });

  app.post("/api/purchase-orders/:id/cancel", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      
      const updatedPO = await storage.updatePurchaseOrderStatus(poId, 'cancelled', req.user!.id);
      
      if (!updatedPO) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      res.json({ 
        message: "Purchase order cancelled successfully",
        po: updatedPO 
      });
    } catch (error) {
      console.error("Cancel purchase order error:", error);
      res.status(500).json({ message: "Failed to cancel purchase order" });
    }
  });

  // Auto PO generation
  app.post("/api/purchase-orders/auto-generate", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const pos = await storage.generateAutoPurchaseOrders(req.user!.id);
      
      res.json({
        message: `Generated ${pos.length} purchase orders for low stock items`,
        orders: pos
      });
    } catch (error) {
      console.error("Auto generate purchase orders error:", error);
      res.status(500).json({ message: "Failed to generate purchase orders" });
    }
  });

  // Audit logs
  app.get("/api/audit-logs", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const { tableName, recordId, userId } = req.query;
      const filters: any = {};
      if (tableName) filters.tableName = tableName as string;
      if (recordId) filters.recordId = parseInt(recordId as string);
      if (userId) filters.userId = parseInt(userId as string);
      
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });





  // Supplier-Product Relationship Routes
  app.get("/api/suppliers/:id/products", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const products = await storage.getSupplierProducts(supplierId);
      res.json(products);
    } catch (error) {
      console.error("Get supplier products error:", error);
      res.status(500).json({ message: "Failed to fetch supplier products" });
    }
  });

  app.get("/api/products/:id/suppliers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      const suppliers = await storage.getProductSuppliers(productId);
      res.json(suppliers);
    } catch (error) {
      console.error("Get product suppliers error:", error);
      res.status(500).json({ message: "Failed to fetch product suppliers" });
    }
  });

  app.post("/api/supplier-products", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertSupplierProductSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const supplierProduct = await storage.createSupplierProduct(validatedData);
      res.status(201).json(supplierProduct);
    } catch (error) {
      console.error("Create supplier-product relationship error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier-product relationship" });
    }
  });

  app.put("/api/supplier-products/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const relationshipId = parseInt(req.params.id);
      const updates = req.body;
      
      const supplierProduct = await storage.updateSupplierProduct(relationshipId, updates);
      
      if (!supplierProduct) {
        return res.status(404).json({ message: "Supplier-product relationship not found" });
      }
      
      res.json(supplierProduct);
    } catch (error) {
      console.error("Update supplier-product relationship error:", error);
      res.status(500).json({ message: "Failed to update supplier-product relationship" });
    }
  });

  app.delete("/api/supplier-products/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const relationshipId = parseInt(req.params.id);
      const deleted = await storage.deleteSupplierProduct(relationshipId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Supplier-product relationship not found" });
      }
      
      res.json({ message: "Supplier-product relationship deleted successfully" });
    } catch (error) {
      console.error("Delete supplier-product relationship error:", error);
      res.status(500).json({ message: "Failed to delete supplier-product relationship" });
    }
  });

  // Supplier Auto-suggestion for Products
  app.post("/api/products/suggest-suppliers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { productIds } = req.body;
      
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ message: "Product IDs array is required" });
      }
      
      const suggestions = await storage.getSuggestedSuppliersForProducts(productIds);
      res.json(suggestions);
    } catch (error) {
      console.error("Get suggested suppliers error:", error);
      res.status(500).json({ message: "Failed to get supplier suggestions" });
    }
  });



  // Backup routes
  app.get("/api/backups/download-all", authenticateToken, requireRole(['admin']), async (req: AuthRequest, res) => {
    try {
      console.log('Generating backup ZIP for user:', req.user!.username);
      
      const zipBuffer = await createBackupZip();
      const filename = `furnili_backup_${new Date().toISOString().split('T')[0]}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', zipBuffer.length);
      
      res.send(zipBuffer);
    } catch (error) {
      console.error('Backup generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate backup", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Setup quotes routes
  setupQuotesRoutes(app);

  // Purchase Order PDF generation
  app.get("/api/purchase-orders/:id/pdf", authenticateToken, async (req, res) => {
    try {
      const poId = parseInt(req.params.id);

      // Get PO with all details
      const poData = await db
        .select({
          po: purchaseOrders,
          supplier: suppliers,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
        .where(eq(purchaseOrders.id, poId))
        .limit(1);

      if (poData.length === 0) {
        return res.status(404).json({ error: "Purchase Order not found" });
      }

      // Get PO items
      const items = await db
        .select({
          item: purchaseOrderItems,
          product: products,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.poId, poId))
        .orderBy(purchaseOrderItems.id);

      const po = poData[0];

      // Generate HTML for PDF
      const html = generatePurchaseOrderPDFHTML(po, items);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        html: html,
        filename: `PurchaseOrder_${po.po.poNumber}_${po.supplier?.name || 'Supplier'}.pdf`
      });

    } catch (error) {
      console.error("Error generating purchase order PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Update Purchase Order
  app.put("/api/purchase-orders/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      const { items, ...poData } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Purchase order must have at least one item" });
      }
      
      const validatedPO = insertPurchaseOrderSchema.omit({ createdBy: true }).parse(poData);
      const validatedItems = items.map((item: any) => 
        insertPurchaseOrderItemSchema.omit({ poId: true }).parse(item)
      );
      
      // Calculate total amount from items
      const totalAmount = validatedItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
      
      // Update PO
      await db.update(purchaseOrders)
        .set({ ...validatedPO, totalAmount, updatedAt: new Date() })
        .where(eq(purchaseOrders.id, poId));
      
      // Delete existing items
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
      
      // Insert new items
      const itemsWithPOId = validatedItems.map(item => ({ 
        ...item, 
        poId: poId,
        totalPrice: item.qty * item.unitPrice
      }));
      
      await db.insert(purchaseOrderItems).values(itemsWithPOId);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'po.updated',
        tableName: 'purchase_orders',
        recordId: poId,
        metadata: { itemCount: items.length, totalAmount }
      });
      
      res.json({ message: "Purchase order updated successfully" });
    } catch (error) {
      console.error("Update purchase order error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  // Delete Purchase Order
  app.delete("/api/purchase-orders/:id", authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
    try {
      const poId = parseInt(req.params.id);
      
      // Get PO details for audit log
      const po = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
      
      if (po.length === 0) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      // If PO was received, reverse the stock movements
      if (po[0].status === 'received') {
        console.log(`Reversing stock for received PO ${po[0].poNumber}`);
        
        // Get all received items
        const receivedItems = await db.select()
          .from(purchaseOrderItems)
          .where(and(
            eq(purchaseOrderItems.poId, poId),
            gt(purchaseOrderItems.receivedQty, 0)
          ));
        
        // Reverse stock for each received item
        for (const item of receivedItems) {
          if (item.receivedQty && item.receivedQty > 0) {
            // Get current product stock
            const product = await db.select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);
            
            if (product[0]) {
              const currentStock = product[0].currentStock || 0;
              const reversedStock = Math.max(0, currentStock - item.receivedQty);
              
              // Update product stock
              await db.update(products)
                .set({ currentStock: reversedStock })
                .where(eq(products.id, item.productId));
              
              // Create reverse stock movement
              await db.insert(stockMovements).values({
                productId: item.productId,
                movementType: 'out',
                quantity: item.receivedQty,
                previousStock: currentStock,
                newStock: reversedStock,
                reason: `PO Deletion - ${item.description}`,
                reference: `PO-${poId}-DELETED`,
                performedBy: req.user!.id,
                vendor: '',
                notes: `Stock reversed due to Purchase Order ${po[0].poNumber} deletion`
              });
              
              console.log(`Stock reversed for product ${item.productId}: ${currentStock} → ${reversedStock} (-${item.receivedQty})`);
            }
          }
        }
      }
      
      // Delete PO items first (foreign key constraint)
      await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
      
      // Delete PO
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'po.deleted',
        tableName: 'purchase_orders',
        recordId: poId,
        metadata: { 
          poNumber: po[0].poNumber,
          statusWhenDeleted: po[0].status,
          stockReversed: po[0].status === 'received'
        }
      });
      
      res.json({ 
        message: "Purchase order deleted successfully",
        stockReversed: po[0].status === 'received'
      });
    } catch (error) {
      console.error("Delete purchase order error:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Removed cloud storage - all files now stored locally

  // Upload product image - LOCAL STORAGE
  app.post("/api/products/upload-image", authenticateToken, requireRole(['admin', 'manager']), productImageUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      // Get file extension from mimetype
      const getExtension = (mimetype: string) => {
        switch (mimetype) {
          case 'image/jpeg': return 'jpg';
          case 'image/jpg': return 'jpg';
          case 'image/png': return 'png';
          case 'image/gif': return 'gif';
          case 'image/webp': return 'webp';
          default: return 'png';
        }
      };

      const extension = getExtension(req.file.mimetype);
      const filename = `${productId}-${Date.now()}.${extension}`;
      const uploadPath = `uploads/products/${filename}`;

      // Save file locally using fs
      const fs = await import('fs');
      const path = await import('path');
      
      // Ensure directory exists
      const uploadDir = path.dirname(uploadPath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Write file to disk
      fs.writeFileSync(uploadPath, req.file.buffer);

      // Return local URL
      const imageUrl = `/uploads/products/${filename}`;

      console.log('Image saved locally:', uploadPath, '-> URL:', imageUrl);

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading product image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });



  // BOM Calculator routes
  app.post("/api/bom/calculate", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const bomData = req.body;
      
      // Convert dimensions if needed
      const { height, width, depth } = convertDimensions(
        bomData.height,
        bomData.width,
        bomData.depth,
        bomData.unitOfMeasure
      );

      // Calculate BOM using the calculation engine
      const calculationInput = {
        ...bomData,
        height,
        width,
        depth,
      };

      // ✅ Use new wardrobe-specific calculation with exact user formulas
      const bomResult = calculateWardrobeBOM(bomData);
      
      // Get pricing from products table
      const boardRate = await getBoardRate(bomData.boardType, bomData.boardThickness);
      
      // Generate simple calculation number (no database for now)
      const calculationNumber = `BOM-${Date.now()}`;

      // COMPLETELY NEW BOM LOGIC - CLEAN AND SIMPLE
      const bomItemsData = [];
      
      // 1. BOARD ITEMS - Only actual board panels (no laminate items)
      const boardPanels = bomResult.panels.filter(panel => 
        !panel.panel.toLowerCase().includes('laminate')
      );
      
      boardPanels.forEach(panel => {
        bomItemsData.push({
          id: Math.random(),
          itemType: 'material' as const,
          itemCategory: 'Board',
          partName: panel.panel,
          materialType: `${bomData.boardThickness} ${bomData.boardType.toUpperCase()}`,
          length: Math.round(panel.length),
          width: Math.round(panel.width),
          thickness: parseInt(bomData.boardThickness.replace('mm', '')),
          quantity: panel.qty,
          unit: 'pieces',
          edgeBandingType: panel.edge_banding,
          edgeBandingLength: panel.edgeBandingLength,
          unitRate: boardRate,
          totalCost: panel.area_sqft * boardRate,
          area_sqft: panel.area_sqft,
        });
      });
      
      // 2. LAMINATE ITEMS - Only if finish is laminate
      if (bomData.finish === 'laminate') {
        // Calculate total area for inner laminate (all panels except shutters/doors get single side)
        const innerPanels = boardPanels.filter(panel => 
          !panel.panel.toLowerCase().includes('shutter') && 
          !panel.panel.toLowerCase().includes('door') &&
          !panel.panel.toLowerCase().includes('front')
        );
        
        // Calculate total area for outer laminate (shutters/doors get both sides)
        const outerPanels = boardPanels.filter(panel => 
          panel.panel.toLowerCase().includes('shutter') || 
          panel.panel.toLowerCase().includes('door') ||
          panel.panel.toLowerCase().includes('front')
        );
        
        if (innerPanels.length > 0) {
          const totalInnerArea = innerPanels.reduce((sum, panel) => sum + panel.area_sqft, 0);
          const totalInnerQty = innerPanels.reduce((sum, panel) => sum + panel.qty, 0);
          
          bomItemsData.push({
            id: Math.random(),
            itemType: 'material' as const,
            itemCategory: 'Laminate',
            partName: 'Inner Surface Laminate',
            materialType: 'Inner Surface Laminate',
            length: 0,
            width: 0,
            thickness: 1,
            quantity: totalInnerQty,
            unit: 'pieces',
            edgeBandingType: 'None',
            edgeBandingLength: 0,
            unitRate: 65,
            totalCost: totalInnerArea * 65,
            area_sqft: totalInnerArea,
          });
        }
        
        if (outerPanels.length > 0) {
          const totalOuterArea = outerPanels.reduce((sum, panel) => sum + panel.area_sqft, 0);
          const totalOuterQty = outerPanels.reduce((sum, panel) => sum + panel.qty, 0);
          
          bomItemsData.push({
            id: Math.random(),
            itemType: 'material' as const,
            itemCategory: 'Laminate',
            partName: 'Outer Surface Laminate',
            materialType: 'Outer Surface Laminate',
            length: 0,
            width: 0,
            thickness: 1,
            quantity: totalOuterQty * 2, // Both sides
            unit: 'pieces',
            edgeBandingType: 'None',
            edgeBandingLength: 0,
            unitRate: 85,
            totalCost: totalOuterArea * 2 * 85,
            area_sqft: totalOuterArea * 2,
          });
        }
        
        // ✅ LAMINATE ADHESIVE (Fevicol SR 750ml): 1 bottle covers 32 sqft laminate area
        const totalLaminateArea = bomResult.totalLaminateArea;
        
        if (totalLaminateArea > 0) {
          const bottlesNeeded = Math.ceil(totalLaminateArea / 32); // 1 bottle per 32 sqft
          bomItemsData.push({
            id: Math.random(),
            itemType: 'material' as const,
            itemCategory: 'Adhesive',
            partName: 'Fevicol SR (750ml)',
            materialType: 'Laminate Adhesive',
            length: 0,
            width: 0,
            thickness: 0,
            quantity: bottlesNeeded,
            unit: 'bottles',
            edgeBandingType: 'None',
            edgeBandingLength: 0,
            unitRate: 85,
            totalCost: bottlesNeeded * 85,
            area_sqft: 0,
          });
        }
      }
      
      // 3. EDGE BANDING GLUE - ₹3 per meter  
      const totalEdgeBandingLength = bomResult.totalEdgeBanding2mm + bomResult.totalEdgeBanding0_8mm;
      if (totalEdgeBandingLength > 0) {
        const roundedLength = Math.round(totalEdgeBandingLength * 0.3048 * 100) / 100; // Convert feet to meters
        bomItemsData.push({
          id: Math.random(),
          itemType: 'material' as const,
          itemCategory: 'Adhesive',
          partName: 'Edge Banding Glue',
          materialType: 'PVC Edge Adhesive',
          length: 0,
          width: 0,
          thickness: 0,
          quantity: roundedLength,
          unit: 'meters',
          edgeBandingType: 'None',
          edgeBandingLength: 0,
          unitRate: 3,
          totalCost: roundedLength * 3,
          area_sqft: 0,
        });
      }
      
      // 4. HARDWARE ITEMS
      bomResult.hardware.forEach(hardware => {
        bomItemsData.push({
          id: Math.random(),
          itemType: 'hardware' as const,
          itemCategory: 'Hardware',
          partName: hardware.item,
          materialType: hardware.item,
          length: 0,
          width: 0,
          thickness: 0,
          quantity: hardware.qty,
          unit: 'pieces',
          edgeBandingType: 'None',
          edgeBandingLength: 0,
          unitRate: hardware.unit_rate,
          totalCost: hardware.total_cost,
          area_sqft: 0,
        });
      });

      // Save BOM calculation to database
      const [savedBom] = await db.insert(bomCalculations).values({
        calculationNumber: calculationNumber,
        unitType: bomData.unitType,
        height: bomData.height,
        width: bomData.width,
        depth: bomData.depth,
        boardType: bomData.boardType,
        boardThickness: bomData.boardThickness,
        finish: bomData.finish,
        totalBoardArea: bomResult.totalBoardArea,
        totalEdgeBanding2mm: bomResult.totalEdgeBanding2mm,
        totalEdgeBanding0_8mm: bomResult.totalEdgeBanding0_8mm,
        totalMaterialCost: bomResult.material_cost,
        totalHardwareCost: bomResult.hardware_cost,
        totalCost: bomResult.total_cost,
        notes: bomData.notes || '',
        projectId: bomData.projectId || null,
        createdBy: req.user?.id || 1,
      }).returning();

      // Save BOM items to database
      if (bomItemsData.length > 0) {
        await db.insert(bomItems).values(
          bomItemsData.map(item => ({
            bomId: savedBom.id,
            partName: item.partName,
            itemType: item.itemType,
            itemCategory: item.itemCategory,
            quantity: Math.round(item.quantity), // Round to integer as database expects integer
            unit: item.unit,
            length: 'length' in item && item.length ? Math.round(item.length) : null, // Round to integer
            width: 'width' in item && item.width ? Math.round(item.width) : null, // Round to integer  
            materialType: 'materialType' in item ? item.materialType : null,
            edgeBandingType: 'edgeBandingType' in item ? item.edgeBandingType : null,
            edgeBandingLength: Math.round((item.edgeBandingLength || 0) * 100) / 100, // Round to 2 decimal places
            unitRate: Math.round((item.unitRate || 0) * 100) / 100, // Round to 2 decimal places
            totalCost: Math.round((item.totalCost || 0) * 100) / 100, // Round to 2 decimal places
            areaSqft: Math.round((item.area_sqft || 0) * 100) / 100, // Round to 2 decimal places
          }))
        );
      }

      // ✅ USE ADVANCED SHEET OPTIMIZATION WITH FORWARD-LOOKING ALGORITHM
      const sheetOptimization = calculateAdvancedSheetOptimization(boardPanels);

      // Return calculation results with database ID and optimization data
      res.json({
        id: savedBom.id,
        calculationNumber,
        totalBoardArea: bomResult.totalBoardArea,
        boardAreaByThickness: bomResult.boardAreaByThickness,
        totalEdgeBanding2mm: bomResult.totalEdgeBanding2mm,
        totalEdgeBanding0_8mm: bomResult.totalEdgeBanding0_8mm,
        totalMaterialCost: bomResult.material_cost,
        totalHardwareCost: bomResult.hardware_cost,
        totalCost: bomResult.total_cost,
        sheetOptimization,
        items: bomItemsData,
      });
    } catch (error) {
      console.error("BOM calculation error:", error);
      res.status(500).json({ message: "Failed to calculate BOM" });
    }
  });

  app.get("/api/bom/:id/export", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const bomId = parseInt(req.params.id);
      const format = req.query.format as string;

      if (!bomId || !format) {
        return res.status(400).json({ message: "BOM ID and format are required" });
      }

      // Get BOM data from database
      const [bom] = await db.select()
        .from(bomCalculations)
        .where(eq(bomCalculations.id, bomId));

      if (!bom) {
        return res.status(404).json({ message: "BOM not found" });
      }

      const items = await db.select()
        .from(bomItems)
        .where(eq(bomItems.bomId, bomId));

      if (format === 'excel') {
        // Create Excel workbook using a simple CSV format for now
        let csvContent = 'Part Name,Type,Quantity,Unit,Size,Material,Edge Banding,Unit Rate,Total Cost\n';
        
        items.forEach(item => {
          const size = item.length && item.width ? `${item.length}x${item.width}mm` : '';
          csvContent += `"${item.partName}","${item.itemType}",${item.quantity},"${item.unit}","${size}","${item.materialType || ''}","${item.edgeBandingType || ''}",${item.unitRate || 0},${item.totalCost}\n`;
        });

        // Add summary
        csvContent += '\nSUMMARY\n';
        csvContent += `Total Board Area,${bom.totalBoardArea} sq.ft\n`;
        csvContent += `Total Edge Banding 2mm,${bom.totalEdgeBanding2mm} ft\n`;
        csvContent += `Total Edge Banding 0.8mm,${bom.totalEdgeBanding0_8mm} ft\n`;
        csvContent += `Total Material Cost,₹${bom.totalMaterialCost}\n`;
        csvContent += `Total Hardware Cost,₹${bom.totalHardwareCost}\n`;
        csvContent += `TOTAL COST,₹${bom.totalCost}\n`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=BOM-${bom.calculationNumber}.csv`);
        res.send(csvContent);
      } else if (format === 'pdf') {
        // Simple text PDF that works
        let pdfContent = `FURNILI - BILL OF MATERIALS\n`;
        pdfContent += `================================\n\n`;
        pdfContent += `BOM Number: ${bom.calculationNumber}\n`;
        pdfContent += `Furniture: ${bom.unitType}\n`;
        pdfContent += `Dimensions: ${bom.height} x ${bom.width} x ${bom.depth} mm\n`;
        pdfContent += `Board: ${bom.boardType} - ${bom.boardThickness}\n`;
        pdfContent += `Finish: ${bom.finish}\n\n`;
        
        pdfContent += `MATERIALS:\n`;
        pdfContent += `${'='.repeat(80)}\n`;
        items.forEach(item => {
          const size = item.length && item.width ? ` (${item.length}x${item.width}mm)` : '';
          pdfContent += `${item.partName}${size}\n`;
          pdfContent += `  Qty: ${item.quantity} ${item.unit} | Rate: ₹${item.unitRate} | Cost: ₹${item.totalCost}\n\n`;
        });
        
        pdfContent += `${'='.repeat(80)}\n`;
        pdfContent += `SUMMARY:\n`;
        pdfContent += `Total Board Area: ${bom.totalBoardArea} sq.ft\n`;
        pdfContent += `Material Cost: ₹${bom.totalMaterialCost}\n`;
        pdfContent += `Hardware Cost: ₹${bom.totalHardwareCost}\n`;
        pdfContent += `TOTAL COST: ₹${bom.totalCost}\n`;
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=BOM-${bom.calculationNumber}.txt`);
        res.send(pdfContent);
      } else {
        res.status(400).json({ message: "Invalid format" });
      }
    } catch (error) {
      console.error("BOM export error:", error);
      res.status(500).json({ message: "Failed to export BOM" });
    }
  });

  // Get BOM calculation history
  app.get("/api/bom/history", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const calculations = await db.select({
        id: bomCalculations.id,
        calculationNumber: bomCalculations.calculationNumber,
        unitType: bomCalculations.unitType,
        totalCost: bomCalculations.totalCost,
        createdAt: bomCalculations.createdAt,
        createdBy: bomCalculations.createdBy,
      })
      .from(bomCalculations)
      .orderBy(bomCalculations.createdAt)
      .limit(limit)
      .offset(offset);

      const total = await db.select({ count: sql`count(*)` })
        .from(bomCalculations);

      res.json({
        calculations,
        pagination: {
          page,
          limit,
          total: Number(total[0].count),
          totalPages: Math.ceil(Number(total[0].count) / limit),
        }
      });
    } catch (error) {
      console.error("BOM history error:", error);
      res.status(500).json({ message: "Failed to get BOM history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Generate BOM PDF HTML
function generateBOMPDFHTML(bom: any, items: any[]): string {
  const currentDate = new Date().toLocaleDateString('en-IN');
  
  // Group items by category for better organization
  const boards = items.filter(item => item.itemType === 'material');
  const hardware = items.filter(item => item.itemType === 'hardware');
  const edgeBanding = items.filter(item => item.itemType === 'edge_banding');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>BOM ${bom.calculationNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 10px; color: #333; font-size: 11px; background: white; }
        .header { border-bottom: 2px solid #8B4513; padding-bottom: 15px; margin-bottom: 20px; }
        .header-flex { display: table; width: 100%; }
        .company-info { display: table-cell; width: 50%; vertical-align: top; }
        .bom-info { display: table-cell; width: 50%; text-align: right; vertical-align: top; }
        .company-name { font-size: 24px; font-weight: bold; color: #8B4513; margin-bottom: 5px; }
        .company-details { font-size: 11px; color: #666; }
        .bom-number { font-size: 20px; font-weight: bold; color: #8B4513; }
        .furniture-details { margin: 20px 0; background: #f8f8f8; padding: 15px; border-radius: 5px; }
        .section-title { font-weight: bold; color: #8B4513; margin: 20px 0 10px 0; font-size: 14px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
        .items-table th { background: #8B4513; color: white; font-weight: bold; }
        .items-table tr:nth-child(even) { background: #f9f9f9; }
        .summary-section { margin-top: 30px; }
        .summary-table { width: 100%; max-width: 400px; margin-left: auto; }
        .summary-table td { padding: 8px; border: 1px solid #ddd; }
        .summary-table .label { background: #f5f5f5; font-weight: bold; }
        .total-row { font-weight: bold; font-size: 14px; background: #8B4513; color: white; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-flex">
          <div class="company-info">
            <div class="company-name">FURNILI</div>
            <div class="company-details">
              Professional Furniture Solutions<br>
              Email: info@furnili.com<br>
              Phone: +91 XXX XXX XXXX
            </div>
          </div>
          <div class="bom-info">
            <div class="bom-number">BOM ${bom.calculationNumber}</div>
            <div style="margin-top: 10px; font-size: 11px;">
              Date: ${currentDate}<br>
              Status: ${bom.status || 'Draft'}
            </div>
          </div>
        </div>
      </div>

      <div class="furniture-details">
        <strong>Furniture Details:</strong><br>
        Type: ${bom.unitType.replace(/_/g, ' ').toUpperCase()}<br>
        Dimensions: ${bom.height} × ${bom.width} × ${bom.depth} mm<br>
        Board: ${bom.boardType.replace(/_/g, ' ')} - ${bom.boardThickness}<br>
        Finish: ${bom.finish}<br>
        ${bom.notes ? `Notes: ${bom.notes}` : ''}
      </div>

      ${boards.length > 0 ? `
      <div class="section-title">Board Components</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Part Name</th>
            <th>Dimensions (mm)</th>
            <th>Qty</th>
            <th>Edge Banding</th>
            <th>Area (sq.ft)</th>
            <th>Rate/sq.ft</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${boards.map(item => `
            <tr>
              <td>${item.partName}</td>
              <td>${item.length && item.width ? `${item.length} × ${item.width}` : '-'}</td>
              <td>${item.quantity}</td>
              <td>${item.edgeBandingType || 'None'}</td>
              <td>${item.areaSqft || 0}</td>
              <td>₹${item.unitRate || 0}</td>
              <td>₹${item.totalCost}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      ${hardware.length > 0 ? `
      <div class="section-title">Hardware Components</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Hardware Item</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Rate/Unit</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          ${hardware.map(item => `
            <tr>
              <td>${item.partName}</td>
              <td>${item.itemCategory}</td>
              <td>${item.quantity}</td>
              <td>${item.unit}</td>
              <td>₹${item.unitRate || 0}</td>
              <td>₹${item.totalCost}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      ${edgeBanding.length > 0 ? `
      <div class="section-title">Edge Banding</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Length (ft)</th>
            <th>Rate/ft</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          ${edgeBanding.map(item => `
            <tr>
              <td>${item.partName}</td>
              <td>${item.edgeBandingLength || 0}</td>
              <td>₹${item.unitRate || 0}</td>
              <td>₹${item.totalCost}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      <div class="summary-section">
        <div class="section-title">Cost Summary</div>
        <table class="summary-table">
          <tr>
            <td class="label">Total Board Area:</td>
            <td>${bom.totalBoardArea} sq.ft</td>
          </tr>
          <tr>
            <td class="label">Edge Banding 2mm:</td>
            <td>${bom.totalEdgeBanding2mm} ft</td>
          </tr>
          <tr>
            <td class="label">Edge Banding 0.8mm:</td>
            <td>${bom.totalEdgeBanding0_8mm} ft</td>
          </tr>
          <tr>
            <td class="label">Material Cost:</td>
            <td>₹${bom.totalMaterialCost}</td>
          </tr>
          <tr>
            <td class="label">Hardware Cost:</td>
            <td>₹${bom.totalHardwareCost}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL COST:</td>
            <td>₹${bom.totalCost}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <div>Generated by FURNILI Management System on ${currentDate}</div>
        <div style="margin-top: 5px;">This is a computer-generated BOM and does not require signature.</div>
      </div>
    </body>
    </html>
  `;
}

// Generate Purchase Order PDF HTML (EXACT copy of Quote PDF format)
function generatePurchaseOrderPDFHTML(po: any, items: any[]): string {
  const { po: poData, supplier, createdBy } = po;
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.item.qty * item.item.unitPrice), 0);
  const gst = subtotal * 0.18; // 18% GST
  const total = subtotal + gst;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Order ${poData.poNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #8B4513; padding-bottom: 20px; }
        .company-info { flex: 1; }
        .quote-info { flex: 1; text-align: right; }
        .company-name { font-size: 24px; font-weight: bold; color: #8B4513; margin-bottom: 5px; }
        .company-details { font-size: 12px; color: #666; }
        .quote-number { font-size: 20px; font-weight: bold; color: #8B4513; }
        .client-section { margin: 20px 0; }
        .client-title { font-weight: bold; color: #8B4513; margin-bottom: 10px; }
        .client-details { background: #f8f8f8; padding: 15px; border-radius: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background: #8B4513; color: white; font-weight: bold; }
        .items-table tr:nth-child(even) { background: #f9f9f9; }
        .totals-section { margin-top: 20px; text-align: right; }
        .totals-table { margin-left: auto; }
        .totals-table td { padding: 5px 10px; }
        .total-row { font-weight: bold; font-size: 16px; background: #8B4513; color: white; }
        .terms { margin-top: 30px; font-size: 12px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <img src="/assets/furnili-logo.png" alt="FURNILI Logo" style="height: 60px; margin-bottom: 10px;">
          <div class="company-name">FURNILI</div>
          <div class="company-details">
            Professional Furniture Solutions<br>
            Email: info@furnili.com<br>
            Phone: +91 XXX XXX XXXX
          </div>
        </div>
        <div class="quote-info">
          <div class="quote-number">Purchase Order ${poData.poNumber}</div>
          <div>Date: ${new Date(poData.createdAt).toLocaleDateString()}</div>
          <div>Status: ${poData.status.charAt(0).toUpperCase() + poData.status.slice(1)}</div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-title">Supplier Information:</div>
        <div class="client-details">
          <strong>${supplier?.name || 'N/A'}</strong><br>
          ${supplier?.email || ''}<br>
          ${supplier?.phone || ''}<br>
          ${supplier?.address || ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item Details</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Rate</th>
            <th>Discount</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(({ item, product }) => `
            <tr>
              <td>
                <strong>${item.description}</strong>
                ${product ? `<br><small>${product.brand || product.name}</small>` : ''}
                ${item.sku ? `<br><small>SKU: ${item.sku}</small>` : ''}
              </td>
              <td>${item.qty}</td>
              <td>Nos</td>
              <td>₹${item.unitPrice.toFixed(2)}</td>
              <td>0%</td>
              <td>₹${(item.qty * item.unitPrice).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-section">
        <table class="totals-table">
          <tr><td>Sub Total:</td><td>₹${subtotal.toFixed(2)}</td></tr>
          <tr><td>Discount (0%):</td><td>-₹0.00</td></tr>
          <tr><td>GST:</td><td>₹${gst.toFixed(2)}</td></tr>
          <tr class="total-row"><td>Total:</td><td>₹${total.toFixed(2)}</td></tr>
        </table>
      </div>

      ${poData.notes ? `
        <div class="terms">
          <strong>Terms & Conditions:</strong><br>
          ${poData.notes}
        </div>
      ` : ''}

      <div class="footer">
        <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 50px;">
          <div style="text-align: left;">
            <p><strong>For FURNILI</strong></p>
            <img src="/assets/furnili-signature-stamp.png" alt="Authority Signature" style="height: 80px; margin: 10px 0;">
            <p><strong>Authorized Signatory</strong></p>
          </div>
          <div style="text-align: center; font-size: 11px; color: #666; flex: 1;">
            Generated by ${createdBy?.name || 'System'} on ${new Date().toLocaleDateString()}<br>
            This is a computer-generated purchase order with digital signature.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
