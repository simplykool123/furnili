import express, { type Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { z } from "zod";
// OpenAI import removed - AI generation functionality simplified
import { storage } from "./storage";
import { authenticateToken, requireRole, generateToken, comparePassword, type AuthRequest } from "./middleware/auth";
import { productImageUpload, boqFileUpload, receiptImageUpload, csvFileUpload, projectFileUpload } from "./utils/fileUpload";
import { exportProductsCSV, exportRequestsCSV, exportLowStockCSV } from "./utils/csvExport";
import { createBackupZip } from "./utils/backupExport";
import { canOrderMaterials, getMaterialRequestEligibleProjects, getStageDisplayName } from "./utils/projectStageValidation";
import { setupQuotesRoutes } from "./quotesRoutes";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { projectFiles } from "@shared/schema";

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
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
} from "@shared/schema";

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

  app.post("/api/products", authenticateToken, requireRole(["admin", "manager"]), productImageUpload.single("image"), async (req, res) => {
    try {
      // Convert FormData strings to proper types
      const formDataSchema = z.object({
        name: z.string().min(1, "Product name is required"),
        category: z.string().min(1, "Category is required"),
        brand: z.string().optional(),
        size: z.string().optional(),
        thickness: z.string().optional(),
        sku: z.string().optional(),
        price: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0, "Price must be positive")),
        currentStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Stock must be non-negative")),
        minStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Minimum stock must be non-negative")),
        unit: z.string().min(1, "Unit is required"),
      });
      
      const validatedData = formDataSchema.parse(req.body);
      
      // Map 'price' to 'pricePerUnit' to match schema
      const productData = {
        ...validatedData,
        pricePerUnit: validatedData.price,
      };
      delete (productData as any).price;
      
      if (req.file) {
        (productData as any).imageUrl = `/uploads/products/${req.file.filename}`;
      }
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product", error });
    }
  });

  app.put("/api/products/:id", authenticateToken, requireRole(["admin", "manager"]), productImageUpload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Convert FormData strings to proper types for updates
      const formDataSchema = z.object({
        name: z.string().min(1, "Product name is required").optional(),
        category: z.string().min(1, "Category is required").optional(),
        brand: z.string().optional(),
        size: z.string().optional(),
        thickness: z.string().optional(),
        sku: z.string().optional(),
        price: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0, "Price must be positive")).optional(),
        currentStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Stock must be non-negative")).optional(),
        minStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Minimum stock must be non-negative")).optional(),
        unit: z.string().min(1, "Unit is required").optional(),
      });
      
      const validatedUpdates = formDataSchema.parse(req.body);
      
      // Map 'price' to 'pricePerUnit' to match schema
      const updates: any = { ...validatedUpdates };
      if (validatedUpdates.price !== undefined) {
        updates.pricePerUnit = validatedUpdates.price;
        delete updates.price;
      }
      
      if (req.file) {
        updates.imageUrl = `/uploads/products/${req.file.filename}`;
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

  // Export routes
  app.get("/api/export/products", authenticateToken, async (req, res) => {
    await exportProductsCSV(res);
  });

  app.get("/api/export/requests", authenticateToken, async (req, res) => {
    await exportRequestsCSV(res);
  });

  app.get("/api/export/low-stock", authenticateToken, async (req, res) => {
    await exportLowStockCSV(res);
  });

  // Generic file upload endpoint for sales products and other uses
  app.post("/api/upload", authenticateToken, productImageUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      const { type } = req.body;
      const file = req.file;
      
      console.log('Upload request - user:', req.user?.id);
      console.log('Upload request - type:', type);
      console.log('Upload request - file:', file ? {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      } : 'none');
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // For sales products and other general uploads
      const filePath = `/uploads/products/${file.filename}`;
      
      res.json({ 
        success: true,
        filePath,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file", error: String(error) });
    }
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static('uploads'));

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
      console.log("=== PETTY CASH EXPENSE SUBMISSION ===");
      console.log("File uploaded:", req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        fieldname: req.file.fieldname
      } : "No file");
      console.log("Request body:", req.body);
      
      // Manually construct expense data to bypass strict Zod validation
      const expenseData = {
        category: req.body.category,
        amount: parseFloat(req.body.amount),
        vendor: req.body.vendor, // Changed from paidTo to vendor
        description: req.body.description, // Changed from note to description
        projectId: req.body.projectId ? parseInt(req.body.projectId) : undefined,
        orderNo: req.body.orderNo,
        paidBy: req.body.paidBy ? parseInt(req.body.paidBy) : undefined,
        expenseDate: new Date(req.body.expenseDate),
        addedBy: req.user!.id,
        receiptImageUrl: req.file?.path || null,
        status: req.body.status || "expense", // Default to expense status, allow income
      };
      
      console.log("Constructed expense data:", expenseData);
      
      const expense = await storage.createPettyCashExpense(expenseData);
      console.log("Expense created successfully:", expense.id);
      res.json(expense);
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
      
      const fundsData = {
        category: "", // Funds don't need category
        amount: parseFloat(req.body.amount),
        vendor: req.body.paidTo, // Source of funds
        description: req.body.note,
        orderNo: "",
        paidBy: req.body.receivedBy ? parseInt(req.body.receivedBy) : undefined, // Staff member who received funds
        expenseDate: new Date(req.body.expenseDate),
        addedBy: req.user!.id,
        receiptImageUrl: req.file?.path || null,
        status: "income", // Always income for funds
      };
      
      const funds = await storage.createPettyCashExpense(fundsData);
      res.json(funds);
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
      
      if (req.file) {
        updateData.receiptImageUrl = req.file.path;
      }
      
      console.log("Update data being sent:", updateData);
      
      const expense = await storage.updatePettyCashExpense(id, updateData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
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
      
      // Include assigned user information for better display
      const tasksWithUsers = await Promise.all(
        tasks.map(async (task) => {
          const assignedUser = await storage.getUser(task.assignedTo);
          const assignedByUser = await storage.getUser(task.assignedBy);
          return {
            ...task,
            assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, username: assignedUser.username } : null,
            assignedByUser: assignedByUser ? { id: assignedByUser.id, name: assignedByUser.name, username: assignedByUser.username } : null,
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
      
      // Include assigned user information
      const tasksWithUsers = await Promise.all(
        tasks.map(async (task) => {
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
      const filePath = path.join('uploads/products', file.fileName);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
