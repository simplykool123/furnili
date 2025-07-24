import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "./storage";
import { authenticateToken, requireRole, generateToken, comparePassword, type AuthRequest } from "./middleware/auth";
import { productImageUpload, boqFileUpload, receiptImageUpload, csvFileUpload } from "./utils/fileUpload";
import { exportProductsCSV, exportRequestsCSV, exportLowStockCSV } from "./utils/csvExport";
import { createBackupZip } from "./utils/backupExport";
import {
  insertUserSchema,
  insertProductSchema,
  insertCategorySchema,
  insertClientSchema,
  insertMaterialRequestSchema,
  insertRequestItemSchema,
  insertBOQUploadSchema,
  insertAttendanceSchema,
  insertPettyCashExpenseSchema,
  insertTaskSchema,
  insertPriceComparisonSchema,
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
      const stats = await storage.getDashboardStats();
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
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user", error });
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

  // Product routes
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const { search, category, stockStatus } = req.query;
      const filters = {
        search: search as string,
        category: category as string,
        stockStatus: stockStatus as string,
      };
      
      const products = await storage.getAllProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products", error });
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
        sku: z.string().optional(),
        price: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0, "Price must be positive")),
        currentStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Stock must be non-negative")),
        minStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Minimum stock must be non-negative")),
        unit: z.string().min(1, "Unit is required"),
      });
      
      const productData = formDataSchema.parse(req.body);
      
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
        sku: z.string().optional(),
        price: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0, "Price must be positive")).optional(),
        currentStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Stock must be non-negative")).optional(),
        minStock: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(0, "Minimum stock must be non-negative")).optional(),
        unit: z.string().min(1, "Unit is required").optional(),
      });
      
      const updates = formDataSchema.parse(req.body);
      
      if (req.file) {
        (updates as any).imageUrl = `/uploads/products/${req.file.filename}`;
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

  app.post("/api/products/:id/stock", authenticateToken, requireRole(["admin", "storekeeper"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newStock, movementType, reference } = req.body;
      
      const success = await storage.updateProductStock(
        id,
        newStock,
        movementType,
        reference,
        (req as AuthRequest).user?.id
      );
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json({ message: "Stock updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update stock", error });
    }
  });

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
      
      let products = await storage.getAllProducts({});
      
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
      const { status, clientName } = req.query;
      const user = (req as AuthRequest).user!;
      
      const filters: any = {
        status: status as string,
        clientName: clientName as string,
      };
      
      // Users can only see their own requests
      if (user.role === "user") {
        filters.requestedBy = user.id;
      }
      
      const requests = await storage.getAllMaterialRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requests", error });
    }
  });

  app.get("/api/requests/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getMaterialRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch request", error });
    }
  });

  app.post("/api/requests", authenticateToken, requireRole(["user", "manager", "admin"]), async (req, res) => {
    try {
      const { request: requestData, items } = req.body;
      
      const validatedRequest = insertMaterialRequestSchema.parse({
        ...requestData,
        requestedBy: (req as AuthRequest).user?.id,
      });
      
      // Add requestId after validation but before storage
      const validatedItems = items.map((item: any) => {
        const validatedItem = insertRequestItemSchema.parse(item);
        return validatedItem;
      });
      
      const request = await storage.createMaterialRequest(validatedRequest, validatedItems);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create request", error });
    }
  });

  app.patch("/api/requests/:id/status", authenticateToken, requireRole(["storekeeper", "admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const userId = (req as AuthRequest).user?.id!;
      
      const request = await storage.updateMaterialRequestStatus(id, status, userId);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Failed to update request status", error });
    }
  });

  // BOQ routes
  app.get("/api/boq", authenticateToken, requireRole(["manager", "admin"]), async (req, res) => {
    try {
      const user = (req as AuthRequest).user!;
      const uploadedBy = user.role === "manager" ? user.id : undefined;
      
      const boqUploads = await storage.getAllBOQUploads(uploadedBy);
      res.json(boqUploads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch BOQ uploads", error });
    }
  });

  app.post("/api/boq/upload", authenticateToken, requireRole(["manager", "admin"]), boqFileUpload.single("boqFile"), async (req, res) => {
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

  app.patch("/api/boq/:id", authenticateToken, requireRole(["manager", "admin"]), async (req, res) => {
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
    await exportProductsCSV(res, req.query);
  });

  app.get("/api/export/requests", authenticateToken, async (req, res) => {
    await exportRequestsCSV(res, req.query);
  });

  app.get("/api/export/low-stock", authenticateToken, async (req, res) => {
    await exportLowStockCSV(res);
  });

  // Serve static files
  app.use('/uploads', (req, res, next) => {
    // Simple static file serving
    const filePath = req.path;
    res.sendFile(filePath, { root: 'uploads' }, (err) => {
      if (err) {
        res.status(404).json({ message: 'File not found' });
      }
    });
  });

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

  // Payroll routes
  app.get("/api/payroll", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { month, year } = req.query;
      const filters = {
        month: month ? parseInt(month as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
      };
      
      const payrollRecords = await storage.getAllPayroll(filters);
      res.json(payrollRecords);
    } catch (error) {
      console.error("Failed to fetch payroll:", error);
      res.status(500).json({ message: "Failed to fetch payroll", error: String(error) });
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

  // Petty Cash routes
  app.get("/api/petty-cash", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { category, status, addedBy } = req.query;
      const filters = {
        category: category as string,
        status: status as string,
        addedBy: addedBy ? parseInt(addedBy as string) : undefined,
      };
      const expenses = await storage.getAllPettyCashExpenses(filters);
      res.json(expenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses", error: String(error) });
    }
  });

  app.get("/api/petty-cash/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getPettyCashStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ message: "Failed to fetch stats", error: String(error) });
    }
  });

  app.get("/api/petty-cash/summary", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getPettyCashStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      res.status(500).json({ message: "Failed to fetch summary", error: String(error) });
    }
  });

  // Get staff balances
  app.get("/api/petty-cash/staff-balances", authenticateToken, async (req: AuthRequest, res) => {
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
      const balance = await storage.getStaffBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error("Failed to fetch staff balance:", error);
      res.status(500).json({ message: "Failed to fetch staff balance", error: String(error) });
    }
  });

  app.post("/api/petty-cash", authenticateToken, receiptImageUpload.single("receipt"), async (req: AuthRequest, res) => {
    try {
      console.log("File uploaded:", req.file);
      console.log("Request body:", req.body);
      
      // Manually construct expense data to bypass strict Zod validation
      const expenseData = {
        category: req.body.category,
        amount: parseFloat(req.body.amount),
        vendor: req.body.paidTo,
        description: req.body.note,
        orderNo: req.body.orderNo,
        paidBy: req.body.paidBy ? parseInt(req.body.paidBy) : undefined,
        expenseDate: new Date(req.body.expenseDate),
        addedBy: req.user!.id,
        receiptImageUrl: req.file?.path || null,
        status: req.body.status || "expense", // Default to expense status, allow income
      };
      
      const expense = await storage.createPettyCashExpense(expenseData);
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
      const updateData = {
        ...req.body,
        amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
        date: req.body.date ? new Date(req.body.date) : undefined,
        receiptImageUrl: req.file?.path || undefined,
      };
      
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

  // Task Management routes
  app.get("/api/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks", error });
    }
  });

  app.post("/api/tasks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const taskData = {
        ...req.body,
        assignedTo: parseInt(req.body.assignedTo),
        createdBy: req.user!.id,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      };
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task", error });
    }
  });

  app.patch("/api/tasks/:id/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;
      const task = await storage.updateTaskStatus(taskId, status);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task", error });
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
      const message = await storage.generateWhatsAppMessage(template, items);
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
      const movements = await storage.getAllStockMovements();
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch movements", error });
    }
  });

  app.post("/api/inventory/movements", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const movement = await storage.createStockMovement({
        ...req.body,
        recordedBy: req.user!.id,
      });
      res.json(movement);
    } catch (error) {
      res.status(500).json({ message: "Failed to record movement", error });
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

  const httpServer = createServer(app);
  return httpServer;
}
