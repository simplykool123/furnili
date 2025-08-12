// Working storage implementation with proper database operations
import { db } from './db';
import { 
  users, 
  categories, 
  clients, 
  products, 
  materialRequests, 
  requestItems, 
  projects, 
  projectFiles,
  pettyCashExpenses,
  attendance,
  stockMovements,
  payroll,
  salesProducts,
  quotes,
  quoteItems,
  moodboards,
  tasks,
  suppliers,

  supplierProducts,
  purchaseOrders,
  purchaseOrderItems,
  auditLogs
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, sql, like, or, inArray } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import type {
  User,
  InsertUser,
  Category,
  InsertCategory,
  Client,
  InsertClient,
  Product,
  InsertProduct,
  MaterialRequest,
  InsertMaterialRequest,
  RequestItem,
  InsertRequestItem,
  ProjectFile,
  InsertProjectFile,
  PettyCashExpense,
  InsertPettyCashExpense,
  Attendance,
  InsertAttendance,
  Project,
  InsertProject,
  StockMovement,
  InsertStockMovement,
  Payroll,
  InsertPayroll,
  SalesProduct,
  InsertSalesProduct,
  Quote,
  InsertQuote,
  QuoteItem,
  InsertQuoteItem,
  MaterialRequestWithItems,
  ProductWithStock,
  Moodboard,
  InsertMoodboard,
  Task,
  InsertTask,
  Supplier,
  InsertSupplier,

  SupplierProduct,
  InsertSupplierProduct,
  PurchaseOrder,
  InsertPurchaseOrder,
  PurchaseOrderItem,
  InsertPurchaseOrderItem,
  PurchaseOrderWithDetails,
  AuditLog,
  InsertAuditLog,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(filters?: { category?: string; stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock' }): Promise<ProductWithStock[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Material Request operations
  getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined>;
  getAllMaterialRequests(): Promise<MaterialRequestWithItems[]>;
  createMaterialRequest(request: InsertMaterialRequest, items: InsertRequestItem[]): Promise<MaterialRequestWithItems>;
  updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined>;
  updateMaterialRequestStatus(id: number, status: string, userId: number): Promise<MaterialRequest | undefined>;
  deleteMaterialRequest(id: number): Promise<boolean>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Dashboard operations
  getDashboardStats(userRole: string): Promise<{
    totalProducts: number;
    pendingRequests: number;
    lowStockItems: number;
    totalValue: number;
    recentRequests: MaterialRequestWithItems[];
    lowStockProducts: ProductWithStock[];
  }>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getMonthlyExpenses(month: number, year: number): Promise<number>;

  // Petty Cash operations
  getAllPettyCashExpenses(filters?: { category?: string; status?: string; addedBy?: number; projectId?: number; month?: number; year?: number }): Promise<PettyCashExpense[]>;
  createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense>;
  updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined>;
  deletePettyCashExpense(id: number): Promise<boolean>;

  // Task operations
  getAllTasks(filters?: { assignedTo?: number; status?: string; projectId?: number }): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: string, userId: number): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Stock Movement operations
  getAllStockMovements(): Promise<StockMovement[]>;
  getStockMovement(id: number): Promise<StockMovement | undefined>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  deleteStockMovement(id: number): Promise<boolean>;
  
  // Request Item operations
  createRequestItem(item: InsertRequestItem): Promise<RequestItem>;
  getRequestItems(requestId: number): Promise<RequestItem[]>;

  // Client operations
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Project File operations
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, updates: Partial<ProjectFile>): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<void>;

  // Project Log operations
  getProjectLogs(projectId: number): Promise<any[]>;
  createProjectLog(log: any): Promise<any>;
  updateProjectLog(id: number, updates: any): Promise<any>;
  deleteProjectLog(id: number): Promise<boolean>;

  // BOQ operations
  getAllBOQUploads(): Promise<any[]>;
  createBOQUpload(upload: any): Promise<any>;
  updateBOQUpload(id: number, updates: any): Promise<any>;

  // Attendance operations
  getAllAttendance(): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  markAttendance(userId: number, date: string, checkIn: Date, checkOut?: Date): Promise<Attendance>;
  bulkUpdateMonthlyAttendance(updates: any[]): Promise<boolean>;

  // Payroll operations  
  getAllPayroll(): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined>;

  // Additional operations
  getLowStockProducts(): Promise<Product[]>;
  getSalesProductCategories(): Promise<string[]>;
  getAllPriceComparisons(): Promise<any[]>;
  createPriceComparison(comparison: any): Promise<any>;

  // Material Request operations
  getAllMaterialRequests(): Promise<MaterialRequest[]>;
  getMaterialRequest(id: number): Promise<MaterialRequest | undefined>;
  getMaterialRequestsByProject(projectId: number): Promise<MaterialRequest[]>;

  // Quote operations
  getAllQuotes(): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getQuoteWithItems(id: number): Promise<any>;
  getQuotesByProject(projectId: number): Promise<Quote[]>;
  getQuoteItems(quoteId: number): Promise<QuoteItem[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, updates: Partial<InsertQuote>): Promise<Quote | undefined>;
  updateQuoteItems(quoteId: number, items: InsertQuoteItem[]): Promise<boolean>;
  deleteQuote(id: number): Promise<boolean>;
  
  // Sales Product operations
  getAllSalesProducts(): Promise<SalesProduct[]>;
  getSalesProduct(id: number): Promise<SalesProduct | undefined>;
  createSalesProduct(product: InsertSalesProduct): Promise<SalesProduct>;
  updateSalesProduct(id: number, updates: Partial<InsertSalesProduct>): Promise<SalesProduct | undefined>;
  deleteSalesProduct(id: number): Promise<boolean>;

  // Moodboard operations
  getAllMoodboards(filters?: { linkedProjectId?: number; createdBy?: number }): Promise<Moodboard[]>;
  getMoodboard(id: number): Promise<Moodboard | undefined>;
  getMoodboardsByProject(projectId: number): Promise<Moodboard[]>;
  createMoodboard(moodboard: InsertMoodboard): Promise<Moodboard>;
  updateMoodboard(id: number, updates: Partial<InsertMoodboard>): Promise<Moodboard | undefined>;
  deleteMoodboard(id: number): Promise<boolean>;

  // Purchase Order System operations
  // Suppliers
  getAllSuppliers(filters?: { search?: string; preferred?: boolean }): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Purchase Orders
  getAllPurchaseOrders(filters?: { status?: string; supplierId?: number; autoGenerated?: boolean }): Promise<PurchaseOrderWithDetails[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  updatePurchaseOrderStatus(id: number, status: string, userId: number): Promise<PurchaseOrder | undefined>;
  receivePurchaseOrder(id: number, receivedItems: { id: number; receivedQty: number }[], userId: number): Promise<boolean>;
  
  // Purchase Order Items
  getPurchaseOrderItems(poId: number): Promise<(PurchaseOrderItem & { product: Product })[]>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { tableName?: string; recordId?: number; userId?: number }): Promise<AuditLog[]>;
  
  // Auto PO Generation
  generateAutoPurchaseOrders(userId: number): Promise<PurchaseOrder[]>;
}

class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!user.employeeId) {
      const lastUser = await db.select({ id: users.id }).from(users).orderBy(desc(users.id)).limit(1);
      const nextId = lastUser[0] ? lastUser[0].id + 1 : 1;
      user.employeeId = `FUN-${nextId.toString().padStart(3, '0')}`;
    }
    
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isActive, true));
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.update(categories).set({ isActive: false }).where(eq(categories.id, id));
    return true;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getAllProducts(filters?: { category?: string; stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock' }): Promise<ProductWithStock[]> {
    const result = await db.select().from(products).where(eq(products.isActive, true));
    
    const productsWithStock: ProductWithStock[] = result.map(product => ({
      ...product,
      stockStatus: product.currentStock <= 0 ? 'out-of-stock' :
                   product.currentStock <= product.minStock ? 'low-stock' : 'in-stock'
    }));

    if (filters?.category) {
      return productsWithStock.filter(p => p.category === filters.category);
    }

    if (filters?.stockStatus) {
      return productsWithStock.filter(p => p.stockStatus === filters.stockStatus);
    }

    return productsWithStock;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    if (!product.sku) {
      const lastProduct = await db.select({ id: products.id }).from(products).orderBy(desc(products.id)).limit(1);
      const nextId = lastProduct[0] ? lastProduct[0].id + 1 : 1;
      product.sku = `PRD-${nextId.toString().padStart(4, '0')}`;
    }
    
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: number): Promise<boolean> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    return true;
  }

  // Material Request operations
  async getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined> {
    // Get the request first
    const request = await db.select().from(materialRequests).where(eq(materialRequests.id, id)).limit(1);
    if (!request[0]) return undefined;


    // Get items with products using raw SQL - Updated to use products (raw materials/inventory)
    const itemsResult = await db.execute(sql`
      SELECT 
        ri.id, ri.request_id, ri.product_id, ri.requested_quantity, ri.approved_quantity, ri.unit_price, ri.total_price,
        p.name as product_name, p.category as product_category, p.brand as product_brand,
        p.size as product_size, p.thickness as product_thickness, p.unit as product_unit,
        p.price_per_unit as product_price_per_unit, p.current_stock as product_current_stock
      FROM request_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.request_id = ${id}
    `);

    const itemsRaw = itemsResult.rows || [];

    const items = itemsRaw.map((row: any) => ({
      id: row.id,
      requestId: row.request_id,
      productId: row.product_id,
      requestedQuantity: row.requested_quantity,
      approvedQuantity: row.approved_quantity,
      unitPrice: row.unit_price,
      totalPrice: row.total_price,
      product: {
        id: row.product_id,
        name: row.product_name,
        category: row.product_category,
        brand: row.product_brand,
        size: row.product_size,
        thickness: row.product_thickness,
        unit: row.product_unit,
        pricePerUnit: row.product_price_per_unit,
        currentStock: row.product_current_stock,
      }
    }));

    // Get user names for request
    const requestedByUser = request[0].requestedBy ? await this.getUser(request[0].requestedBy) : undefined;
    const approvedByUser = request[0].approvedBy ? await this.getUser(request[0].approvedBy) : undefined;
    const issuedByUser = request[0].issuedBy ? await this.getUser(request[0].issuedBy) : undefined;

    const result = {
      ...request[0],
      requestedByUser,
      approvedByUser,
      issuedByUser,
      items,
    };

    return result;
  }

  async getAllMaterialRequests(): Promise<MaterialRequestWithItems[]> {
    const requests = await db.select().from(materialRequests).orderBy(desc(materialRequests.createdAt));
    
    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const fullRequest = await this.getMaterialRequest(request.id);
        return fullRequest!;
      })
    );

    return requestsWithItems;
  }

  async getMaterialRequestsByProject(projectId: number): Promise<MaterialRequestWithItems[]> {
    const requests = await db.select().from(materialRequests)
      .where(eq(materialRequests.projectId, projectId))
      .orderBy(desc(materialRequests.createdAt));
    
    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const fullRequest = await this.getMaterialRequest(request.id);
        return fullRequest!;
      })
    );

    return requestsWithItems;
  }

  async createMaterialRequest(request: InsertMaterialRequest, items: InsertRequestItem[]): Promise<MaterialRequestWithItems> {
    try {
      
      if (!request.orderNumber) {
        const lastRequest = await db.select({ id: materialRequests.id }).from(materialRequests).orderBy(desc(materialRequests.id)).limit(1);
        const nextId = lastRequest[0] ? lastRequest[0].id + 1 : 1;
        request.orderNumber = `REQ-${nextId.toString().padStart(4, '0')}`;
      }
      
      const result = await db.insert(materialRequests).values(request).returning();
      const createdRequest = result[0];
      
    
    // Create request items with the correct requestId and calculate pricing
    const createdItems: (RequestItem & { product: Product })[] = [];
    let totalRequestValue = 0;
    for (const item of items) {
      
      // Fetch product details first to get pricing
      const product = await this.getProduct(item.productId);
      if (!product) {
        console.error(`*** createMaterialRequest: Product with ID ${item.productId} not found ***`);
        throw new Error(`Product with ID ${item.productId} not found`);
      }
      
      // Calculate pricing
      const unitPrice = product.pricePerUnit;
      const totalPrice = unitPrice * item.requestedQuantity;
      totalRequestValue += totalPrice;
      
      
      const itemWithRequestId = {
        ...item,
        requestId: createdRequest.id,
        unitPrice: unitPrice,
        totalPrice: totalPrice
      };
      
      
      try {
        const createdItem = await this.createRequestItem(itemWithRequestId);
        
        const itemWithProduct = {
          ...createdItem,
          product: product
        };
        
        createdItems.push(itemWithProduct);
      } catch (itemError) {
        console.error(`*** createMaterialRequest: Error creating item:`, itemError);
        throw itemError;
      }
    }
    
    
    // Update the material request with the calculated total value
    const updateResult = await db.update(materialRequests)
      .set({ totalValue: totalRequestValue })
      .where(eq(materialRequests.id, createdRequest.id))
      .returning();
    
    
      // Get user details for the complete response
      const requestedByUser = await this.getUser(createdRequest.requestedBy);
      if (!requestedByUser) {
        console.error(`*** createMaterialRequest: User with ID ${createdRequest.requestedBy} not found ***`);
        throw new Error(`User with ID ${createdRequest.requestedBy} not found`);
      }
      
      // Return the complete request with items and user details, including the updated totalValue
      const requestWithItems: MaterialRequestWithItems = {
        ...createdRequest,
        totalValue: totalRequestValue, // Use the calculated value instead of the original 0
        items: createdItems,
        requestedByUser: {
          name: requestedByUser.name,
          email: requestedByUser.email
        }
      };
      
      return requestWithItems;
    } catch (error) {
      console.error(`*** createMaterialRequest: MAJOR ERROR ***`, error);
      throw error;
    }
  }

  async updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined> {
    const result = await db.update(materialRequests).set(updates).where(eq(materialRequests.id, id)).returning();
    return result[0];
  }

  async updateMaterialRequestStatus(id: number, status: string, userId: number): Promise<MaterialRequest | undefined> {
    const updateData: any = { status };
    
    // Set specific fields based on the status
    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    } else if (status === 'issued') {
      updateData.issuedBy = userId;
      updateData.issuedAt = new Date();
      
      // Create inventory movements for issued requests
      await this.createInventoryMovementsForIssuedRequest(id, userId);
    }
    
    const result = await db.update(materialRequests)
      .set(updateData)
      .where(eq(materialRequests.id, id))
      .returning();
    return result[0];
  }

  private async createInventoryMovementsForIssuedRequest(requestId: number, userId: number): Promise<void> {
    try {
      // Get the request details with items
      const request = await this.getMaterialRequest(requestId);
      if (!request || !request.items) {
        console.error(`Failed to get request ${requestId} for inventory movements`);
        return;
      }

      // Get the user name for the movements
      const user = await this.getUser(userId);
      const userName = user?.name || 'Unknown';

      // Create inventory movements for each item
      for (const item of request.items) {
        if (!item.product || !item.requestedQuantity) continue;

        // Get current stock for the product
        const product = await this.getProduct(item.productId);
        if (!product) {
          console.error(`Product ${item.productId} not found for inventory movement`);
          continue;
        }

        const previousStock = product.currentStock || 0;
        const newStock = previousStock - item.requestedQuantity;

        // Create inventory movement record
        await db.insert(stockMovements).values({
          productId: item.productId,
          movementType: 'out',
          quantity: item.requestedQuantity,
          previousStock,
          newStock,
          reference: `Material Request ${request.orderNumber}`,
          notes: `Stock issued for client project`,
          performedBy: userId,
          materialRequestId: requestId,
          reason: 'General',
          createdAt: new Date()
        });

        // Update product stock
        await db.update(products)
          .set({ currentStock: newStock })
          .where(eq(products.id, item.productId));

        console.log(`Created inventory movement: ${item.product.name} -${item.requestedQuantity} (${previousStock} → ${newStock})`);
      }

      console.log(`Successfully created inventory movements for request ${request.orderNumber}`);
    } catch (error) {
      console.error(`Error creating inventory movements for request ${requestId}:`, error);
      throw error;
    }
  }

  async deleteMaterialRequest(id: number): Promise<boolean> {
    await db.delete(requestItems).where(eq(requestItems.requestId, id));
    await db.delete(materialRequests).where(eq(materialRequests.id, id));
    return true;
  }

  // Quote operations
  async getQuotesByProject(projectId: number): Promise<Quote[]> {
    const result = await db.select().from(quotes)
      .where(eq(quotes.projectId, projectId))
      .orderBy(desc(quotes.createdAt));
    return result;
  }

  async getQuoteWithItems(quoteId: number): Promise<any> {
    // Get the quote first
    const quote = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (!quote[0]) return undefined;

    // Get quote items with product details using raw SQL
    const itemsResult = await db.execute(sql`
      SELECT 
        qi.id, qi.quote_id, qi.sales_product_id, qi.item_name, qi.description, 
        qi.quantity, qi.uom, qi.unit_price, qi.line_total,
        sp.name as product_name, sp.category as product_category, 
        sp.size as product_size, sp.unit_price as product_price, sp.description as product_description
      FROM quote_items qi
      LEFT JOIN sales_products sp ON qi.sales_product_id = sp.id
      WHERE qi.quote_id = ${quoteId}
    `);

    const itemsRaw = itemsResult.rows || [];

    const items = itemsRaw.map((row: any) => ({
      id: row.id,
      quoteId: row.quote_id,
      salesProductId: row.sales_product_id,
      itemName: row.item_name,
      description: row.description,
      quantity: row.quantity,
      uom: row.uom,
      unitPrice: row.unit_price,
      lineTotal: row.line_total,
      product: {
        id: row.sales_product_id,
        name: row.product_name || row.item_name,
        category: row.product_category,
        size: row.product_size,
        price: row.product_price,
        description: row.product_description || row.description
      }
    }));

    return {
      ...quote[0],
      items
    };
  }

  // Project operations
  async getProject(id: number): Promise<any | undefined> {
    const result = await db.select()
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(projects.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const row = result[0];
    return {
      ...row.projects,
      client_name: row.clients?.name || null,
      client_mobile: row.clients?.mobile || null,
      client_email: row.clients?.email || null,
      client_address: row.clients?.address1 || null
    };
  }

  async getAllProjects(): Promise<any[]> {
    const result = await db.select()
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .orderBy(desc(projects.createdAt));
    
    return result.map(row => ({
      ...row.projects,
      client_name: row.clients?.name || null,
      client_mobile: row.clients?.mobile || null,
      client_email: row.clients?.email || null,
      client_address: row.clients?.address1 || null,
      city: row.projects.siteCity || row.clients?.city || null
    }));
  }

  async createProject(project: InsertProject): Promise<Project> {
    if (!project.code) {
      const lastProject = await db.select({ id: projects.id }).from(projects).orderBy(desc(projects.id)).limit(1);
      const nextId = lastProject[0] ? lastProject[0].id + 1 : 1;
      project.code = `FUN-${nextId.toString().padStart(4, '0')}`;
    }
    
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const result = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<boolean> {
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Remove duplicate category operations - already defined earlier

  // Dashboard operations
  async getDashboardStats(userRole: string): Promise<{
    totalProducts: number;
    pendingRequests: number;
    lowStockItems: number;
    totalValue: number;
    recentRequests: MaterialRequestWithItems[];
    lowStockProducts: ProductWithStock[];
  }> {
    const allProducts = await this.getAllProducts();
    const allRequests = await this.getAllMaterialRequests();
    const lowStockProducts = allProducts.filter(p => p.stockStatus === 'low-stock');
    
    const pendingRequests = allRequests.filter(r => r.status === 'pending');
    const recentRequests = allRequests.slice(0, 5);
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.currentStock), 0);

    return {
      totalProducts: allProducts.length,
      pendingRequests: pendingRequests.length,
      lowStockItems: lowStockProducts.length,
      totalValue,
      recentRequests,
      lowStockProducts,
    };
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    return db.select().from(attendance).where(
      and(
        gte(attendance.date, startOfDay),
        lte(attendance.date, endOfDay)
      )
    );
  }

  async getMonthlyExpenses(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const expenses = await db.select().from(pettyCashExpenses).where(
      and(
        gte(pettyCashExpenses.expenseDate, startDate),
        lte(pettyCashExpenses.expenseDate, endDate)
      )
    );
    
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  // Petty Cash operations
  async getAllPettyCashExpenses(filters?: { category?: string; status?: string; addedBy?: number; projectId?: number; month?: number; year?: number }): Promise<PettyCashExpense[]> {
    let query = db.select().from(pettyCashExpenses);
    
    // Apply filters if provided
    if (filters) {
      let whereClause = null;
      
      if (filters.category) {
        whereClause = whereClause ? and(whereClause, eq(pettyCashExpenses.category, filters.category)) 
                                  : eq(pettyCashExpenses.category, filters.category);
      }
      
      if (filters.status) {
        whereClause = whereClause ? and(whereClause, eq(pettyCashExpenses.status, filters.status))
                                  : eq(pettyCashExpenses.status, filters.status);
      }
      
      if (filters.addedBy) {
        whereClause = whereClause ? and(whereClause, eq(pettyCashExpenses.addedBy, filters.addedBy))
                                  : eq(pettyCashExpenses.addedBy, filters.addedBy);
      }
      
      if (filters.projectId) {
        whereClause = whereClause ? and(whereClause, eq(pettyCashExpenses.projectId, filters.projectId))
                                  : eq(pettyCashExpenses.projectId, filters.projectId);
      }
      
      if (filters.month && filters.year) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
        const dateCondition = and(
          gte(pettyCashExpenses.expenseDate, startDate),
          lte(pettyCashExpenses.expenseDate, endDate)
        );
        whereClause = whereClause ? and(whereClause, dateCondition) : dateCondition;
      }
      
      if (whereClause) {
        query = query.where(whereClause);
      }
    }
    
    const results = await query.orderBy(desc(pettyCashExpenses.expenseDate));
    
    // Add user information by fetching users separately
    const resultsWithUsers = await Promise.all(
      results.map(async (expense) => {
        let user = null;
        if (expense.addedBy) {
          try {
            user = await this.getUser(expense.addedBy);
            if (user) {
              user = {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username
              };
            }
          } catch (error) {
            console.log(`Failed to fetch user ${expense.addedBy}:`, error);
          }
        }
        
        return {
          ...expense,
          user
        };
      })
    );
    
    return resultsWithUsers as any;
  }

  async createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense> {
    const result = await db.insert(pettyCashExpenses).values(expense).returning();
    return result[0];
  }

  // Task operations
  async getAllTasks(filters?: { assignedTo?: number; status?: string; projectId?: number }): Promise<Task[]> {
    let query = db.select().from(tasks);
    
    const whereConditions = [];
    if (filters?.assignedTo) {
      whereConditions.push(eq(tasks.assignedTo, filters.assignedTo));
    }
    if (filters?.status) {
      whereConditions.push(eq(tasks.status, filters.status));
    }
    if (filters?.projectId) {
      whereConditions.push(eq(tasks.projectId, filters.projectId));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    return await query.orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<Task | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'completed') {
      updateData.completedDate = new Date();
    }
    
    const result = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // Stock Movement operations
  async getAllStockMovements(): Promise<any[]> {
    const movements = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productName: products.name,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        previousStock: stockMovements.previousStock,
        newStock: stockMovements.newStock,
        reference: stockMovements.reference,
        vendor: stockMovements.vendor,
        costPerUnit: stockMovements.costPerUnit,
        totalCost: stockMovements.totalCost,
        notes: stockMovements.notes,
        performedBy: stockMovements.performedBy,
        performedByName: users.username,
        projectId: stockMovements.projectId,
        materialRequestId: stockMovements.materialRequestId,
        reason: stockMovements.reason,
        destination: stockMovements.destination,
        invoiceNumber: stockMovements.invoiceNumber,
        batchNumber: stockMovements.batchNumber,
        expiryDate: stockMovements.expiryDate,
        location: stockMovements.location,
        approvedBy: stockMovements.approvedBy,
        createdAt: stockMovements.createdAt,
        // Material Request details
        requestOrderNumber: materialRequests.orderNumber,
        requestStatus: materialRequests.status,
        clientName: materialRequests.clientName,
        projectName: projects.name,
        // Extract order number from reference field if material request is not linked
        extractedOrderNumber: sql<string>`CASE 
          WHEN ${materialRequests.orderNumber} IS NOT NULL THEN ${materialRequests.orderNumber}
          WHEN ${stockMovements.reference} ~ 'Material Request [A-Z0-9-]+' THEN 
            regexp_replace(${stockMovements.reference}, '.*Material Request ([A-Z0-9-]+).*', '\\1', 'g')
          ELSE NULL 
        END`,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.performedBy, users.id))
      .leftJoin(materialRequests, eq(stockMovements.materialRequestId, materialRequests.id))
      .leftJoin(projects, eq(materialRequests.projectId, projects.id))
      .orderBy(desc(stockMovements.createdAt));

    return movements;
  }

  // Request Item operations
  async createRequestItem(item: InsertRequestItem): Promise<RequestItem> {
    const result = await db.insert(requestItems).values([item]).returning();
    return result[0];
  }

  async getRequestItems(requestId: number): Promise<RequestItem[]> {
    return db.select({
      id: requestItems.id,
      requestId: requestItems.requestId,
      productId: requestItems.productId,
      requestedQuantity: requestItems.requestedQuantity,
      approvedQuantity: requestItems.approvedQuantity,
      unitPrice: requestItems.unitPrice,
      totalPrice: requestItems.totalPrice,
      productName: products.name,
      productBrand: products.brand,
      productCategory: products.category,
      productUnit: products.unit
    })
    .from(requestItems)
    .leftJoin(products, eq(requestItems.productId, products.id))
    .where(eq(requestItems.requestId, requestId));
  }

  // Client operations
  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.isActive, true)).orderBy(asc(clients.name));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(client).returning();
    return result[0];
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return result[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    await db.update(clients).set({ isActive: false }).where(eq(clients.id, id));
    return true;
  }

  // Project File operations
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return db.select().from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const result = await db.insert(projectFiles).values(file).returning();
    return result[0];
  }

  async updateProjectFile(id: number, updates: Partial<ProjectFile>): Promise<ProjectFile> {
    const result = await db.update(projectFiles)
      .set(updates)
      .where(eq(projectFiles.id, id))
      .returning();
    return result[0];
  }

  async deleteProjectFile(id: number): Promise<void> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // Project File operations (missing methods)
  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return result[0];
  }

  // Project Log operations
  async getProjectLogs(projectId: number): Promise<any[]> {
    // Return empty array for now - can be implemented later with activity tracking
    return [];
  }

  async createProjectLog(log: any): Promise<any> {
    // Stub method - return the log object as is
    return { id: Date.now(), ...log };
  }

  async updateProjectLog(id: number, updates: any): Promise<any> {
    // Stub method - return updated object
    return { id, ...updates };
  }

  async deleteProjectLog(id: number): Promise<boolean> {
    // Stub method - always return true
    return true;
  }

  // BOQ operations
  async getAllBOQUploads(): Promise<any[]> {
    // Stub method - return empty array
    return [];
  }

  async createBOQUpload(upload: any): Promise<any> {
    // Stub method - return the upload object with id
    return { id: Date.now(), ...upload };
  }

  async updateBOQUpload(id: number, updates: any): Promise<any> {
    // Stub method - return updated object
    return { id, ...updates };
  }

  // Additional missing methods
  async getLowStockProducts(): Promise<Product[]> {
    return db.select().from(products)
      .where(and(
        eq(products.isActive, true),
        sql`${products.currentStock} <= ${products.minStock}`
      ));
  }

  async getSalesProductCategories(): Promise<string[]> {
    // Stub method - return some default categories
    return ['Office Furniture', 'Seating', 'Desks', 'Storage'];
  }

  async getAllPriceComparisons(): Promise<any[]> {
    // Stub method - return empty array
    return [];
  }

  async createPriceComparison(comparison: any): Promise<any> {
    // Stub method - return the comparison object with id
    return { id: Date.now(), ...comparison };
  }

  // Petty Cash missing methods
  async updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined> {
    const result = await db.update(pettyCashExpenses).set(updates).where(eq(pettyCashExpenses.id, id)).returning();
    return result[0];
  }

  async deletePettyCashExpense(id: number): Promise<boolean> {
    await db.delete(pettyCashExpenses).where(eq(pettyCashExpenses.id, id));
    return true;
  }

  // Stock Movement missing methods
  async getStockMovement(id: number): Promise<StockMovement | undefined> {
    const result = await db.select().from(stockMovements).where(eq(stockMovements.id, id)).limit(1);
    return result[0];
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const result = await db.insert(stockMovements).values(movement).returning();
    return result[0];
  }

  async deleteStockMovement(id: number): Promise<boolean> {
    await db.delete(stockMovements).where(eq(stockMovements.id, id));
    return true;
  }

  // Attendance missing methods
  async getAllAttendance(): Promise<Attendance[]> {
    return db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const result = await db.update(attendance).set(updates).where(eq(attendance.id, id)).returning();
    return result[0];
  }

  async markAttendance(userId: number, date: string, checkIn: Date, checkOut?: Date): Promise<Attendance> {
    const attendanceData: InsertAttendance = {
      userId,
      date,
      checkIn,
      checkOut: checkOut || null,
      status: 'present'
    };
    return this.createAttendance(attendanceData);
  }

  async bulkUpdateMonthlyAttendance(updates: any[]): Promise<boolean> {
    // Stub method - process updates in batch
    for (const update of updates) {
      await this.updateAttendance(update.id, update.data);
    }
    return true;
  }

  // Payroll missing methods  
  async getAllPayroll(): Promise<Payroll[]> {
    return db.select().from(payroll).orderBy(desc(payroll.createdAt));
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const result = await db.insert(payroll).values(payrollData).returning();
    return result[0];
  }

  async updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const result = await db.update(payroll).set(updates).where(eq(payroll.id, id)).returning();
    return result[0];
  }

  // Quote operations (missing methods)
  async getAllQuotes(): Promise<Quote[]> {
    return db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    return result[0];
  }

  async getQuoteItems(quoteId: number): Promise<QuoteItem[]> {
    return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const result = await db.insert(quotes).values(quote).returning();
    return result[0];
  }

  async updateQuote(id: number, updates: Partial<InsertQuote>): Promise<Quote | undefined> {
    const result = await db.update(quotes).set(updates).where(eq(quotes.id, id)).returning();
    return result[0];
  }

  async updateQuoteItems(quoteId: number, items: InsertQuoteItem[]): Promise<boolean> {
    // Delete existing items
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
    
    // Insert new items
    if (items.length > 0) {
      await db.insert(quoteItems).values(items);
    }
    
    return true;
  }

  async deleteQuote(id: number): Promise<boolean> {
    // Delete quote items first
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
    
    // Delete quote
    await db.delete(quotes).where(eq(quotes.id, id));
    
    return true;
  }

  // Missing Petty Cash methods
  async getPettyCashStats(): Promise<any> {
    const expenses = await db.select().from(pettyCashExpenses);
    
    // Filter by status instead of amount sign
    const totalSpent = expenses.filter(e => e.status === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totalReceived = expenses.filter(e => e.status === 'income').reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate current month expenses
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    
    const currentMonthExpenses = expenses
      .filter(e => {
        const expenseDate = new Date(e.expenseDate);
        return expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd && e.status === 'expense';
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    return { 
      totalExpenses: totalSpent,
      totalIncome: totalReceived, 
      balance: totalReceived - totalSpent,
      currentMonthExpenses
    };
  }

  async getPersonalPettyCashStats(userId: number): Promise<any> {
    const expenses = await db.select().from(pettyCashExpenses).where(eq(pettyCashExpenses.addedBy, userId));
    
    // Filter by status instead of amount sign
    const totalSpent = expenses.filter(e => e.status === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totalReceived = expenses.filter(e => e.status === 'income').reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate current month expenses for this user
    const currentDate = new Date();
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    
    const thisMonth = expenses
      .filter(e => {
        const expenseDate = new Date(e.expenseDate);
        return expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd && e.status === 'expense';
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    return { 
      myExpenses: totalSpent,
      cashGivenToMe: totalReceived, 
      myBalance: totalReceived - totalSpent,
      thisMonth
    };
  }

  async getAllStaffBalances(): Promise<any[]> {
    const allUsers = await db.select().from(users);
    const result = await Promise.all(allUsers.map(async (user) => {
      const stats = await this.getPersonalPettyCashStats(user.id);
      return { 
        userId: user.id,
        userName: user.name || user.username,
        received: stats.cashGivenToMe || 0,
        spent: stats.myExpenses || 0,
        balance: stats.myBalance || 0
      };
    }));
    return result;
  }

  async getStaffBalance(userId: number): Promise<number> {
    const stats = await this.getPersonalPettyCashStats(userId);
    return stats.balance;
  }

  // Remove duplicate attendance methods - already defined above

  async getTodayAttendance(userId?: number): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    let query = db.select().from(attendance)
      .where(sql`DATE(check_in_time) = ${today}`);
    
    if (userId) {
      query = query.where(eq(attendance.userId, userId)) as any;
    }
    
    return query;
  }

  async getAttendanceStats(month: number, year: number): Promise<any> {
    return { totalDays: 30, presentDays: 25, absentDays: 5 };
  }

  async checkIn(userId: number): Promise<any> {
    const result = await db.insert(attendance).values({
      userId,
      checkInTime: new Date(),
      date: new Date()
    }).returning();
    return result[0];
  }

  async checkOut(userId: number): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.update(attendance)
      .set({ checkOutTime: new Date() })
      .where(and(
        eq(attendance.userId, userId),
        sql`DATE(check_in_time) = ${today}`
      ))
      .returning();
    return result[0];
  }

  // Payroll methods
  async getAllPayrolls(month?: number, year?: number, userId?: number): Promise<any[]> {
    // Build where conditions array
    const whereConditions = [];
    if (month !== undefined) {
      whereConditions.push(eq(payroll.month, month));
    }
    if (year !== undefined) {
      whereConditions.push(eq(payroll.year, year));
    }
    if (userId !== undefined) {
      whereConditions.push(eq(payroll.userId, userId));
    }

    // Build the query
    let query = db.select()
      .from(payroll)
      .leftJoin(users, eq(payroll.userId, users.id));

    // Apply combined where conditions if any exist
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const results = await query;
    
    return results.map((row: any) => ({
      ...row.payroll,
      userName: row.users?.name || row.users?.username || 'Unknown User',
      userEmail: row.users?.email || '',
      userRole: row.users?.role || ''
    }));
  }

  async generatePayroll(data: any): Promise<any> {
    const result = await db.insert(payroll).values(data).returning();
    return result[0];
  }

  async processPayroll(id: number): Promise<any> {
    const result = await db.update(payroll)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(payroll.id, id))
      .returning();
    return result[0];
  }

  // Sales Product operations
  async getAllSalesProducts(): Promise<SalesProduct[]> {
    return await db.select().from(salesProducts).where(eq(salesProducts.isActive, true)).orderBy(asc(salesProducts.name));
  }

  async getSalesProduct(id: number): Promise<SalesProduct | undefined> {
    const result = await db.select().from(salesProducts).where(eq(salesProducts.id, id)).limit(1);
    return result[0];
  }

  async createSalesProduct(product: InsertSalesProduct): Promise<SalesProduct> {
    const result = await db.insert(salesProducts).values(product).returning();
    return result[0];
  }

  async updateSalesProduct(id: number, updates: Partial<InsertSalesProduct>): Promise<SalesProduct | undefined> {
    const result = await db.update(salesProducts).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(salesProducts.id, id)).returning();
    return result[0];
  }

  async deleteSalesProduct(id: number): Promise<boolean> {
    const result = await db.update(salesProducts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesProducts.id, id))
      .returning();
    return result.length > 0;
  }

  // Moodboard operations
  async getAllMoodboards(filters?: { linkedProjectId?: number; createdBy?: number }): Promise<Moodboard[]> {
    let query = db.select().from(moodboards);
    
    const whereConditions = [];
    if (filters?.linkedProjectId) {
      whereConditions.push(eq(moodboards.linkedProjectId, filters.linkedProjectId));
    }
    if (filters?.createdBy) {
      whereConditions.push(eq(moodboards.createdBy, filters.createdBy));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    return await query.orderBy(desc(moodboards.createdAt));
  }

  async getMoodboard(id: number): Promise<Moodboard | undefined> {
    const result = await db.select().from(moodboards).where(eq(moodboards.id, id)).limit(1);
    return result[0];
  }

  async getMoodboardsByProject(projectId: number): Promise<Moodboard[]> {
    return await db.select().from(moodboards)
      .where(eq(moodboards.linkedProjectId, projectId))
      .orderBy(desc(moodboards.createdAt));
  }

  async createMoodboard(moodboard: InsertMoodboard): Promise<Moodboard> {
    const result = await db.insert(moodboards).values(moodboard).returning();
    return result[0];
  }

  async updateMoodboard(id: number, updates: Partial<InsertMoodboard>): Promise<Moodboard | undefined> {
    const result = await db.update(moodboards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(moodboards.id, id))
      .returning();
    return result[0];
  }

  async deleteMoodboard(id: number): Promise<boolean> {
    const result = await db.delete(moodboards).where(eq(moodboards.id, id)).returning();
    return result.length > 0;
  }

  // Purchase Order System operations
  
  // Supplier operations
  async getAllSuppliers(filters?: { search?: string; preferred?: boolean }): Promise<Supplier[]> {
    let query = db.select().from(suppliers);
    
    const whereConditions = [eq(suppliers.isActive, true)];
    
    if (filters?.search) {
      whereConditions.push(
        or(
          like(suppliers.name, `%${filters.search}%`),
          like(suppliers.contactPerson, `%${filters.search}%`),
          like(suppliers.email, `%${filters.search}%`)
        )!
      );
    }
    
    if (filters?.preferred !== undefined) {
      whereConditions.push(eq(suppliers.preferred, filters.preferred));
    }
    
    return await query.where(and(...whereConditions)).orderBy(desc(suppliers.preferred), asc(suppliers.name));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(supplier).returning();
    
    // Create audit log
    await this.createAuditLog({
      userId: supplier.createdBy,
      action: 'supplier.created',
      tableName: 'suppliers',
      recordId: result[0].id,
      metadata: { name: supplier.name }
    });
    
    return result[0];
  }

  async updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const result = await db.update(suppliers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return result[0];
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.update(suppliers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return result.length > 0;
  }

  // Purchase Order operations
  async getAllPurchaseOrders(filters?: { status?: string; supplierId?: number; autoGenerated?: boolean }): Promise<PurchaseOrderWithDetails[]> {
    let query = db.select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      sentAt: purchaseOrders.sentAt,
      receivedAt: purchaseOrders.receivedAt,
      autoGenerated: purchaseOrders.autoGenerated,
      createdBy: purchaseOrders.createdBy,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplier: suppliers,
      createdByUser: { id: users.id, name: users.name, email: users.email }
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(users, eq(purchaseOrders.createdBy, users.id));
    
    const whereConditions = [];
    if (filters?.status) {
      whereConditions.push(eq(purchaseOrders.status, filters.status));
    }
    if (filters?.supplierId) {
      whereConditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
    }
    if (filters?.autoGenerated !== undefined) {
      whereConditions.push(eq(purchaseOrders.autoGenerated, filters.autoGenerated));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    const result = await query.orderBy(desc(purchaseOrders.createdAt));
    
    // Get items for each PO
    const posWithItems = [];
    for (const po of result) {
      const items = await this.getPurchaseOrderItems(po.id);
      posWithItems.push({
        ...po,
        items
      });
    }
    
    return posWithItems;
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined> {
    const result = await db.select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      sentAt: purchaseOrders.sentAt,
      receivedAt: purchaseOrders.receivedAt,
      autoGenerated: purchaseOrders.autoGenerated,
      createdBy: purchaseOrders.createdBy,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplier: suppliers,
      createdByUser: { id: users.id, name: users.name, email: users.email }
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
    .where(eq(purchaseOrders.id, id))
    .limit(1);
    
    if (result.length === 0) return undefined;
    
    const po = result[0];
    const items = await this.getPurchaseOrderItems(po.id);
    
    return {
      ...po,
      items
    };
  }

  async createPurchaseOrder(po: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrder> {
    // Generate PO number with FUR-25-101 format
    const lastPO = await db.select({ id: purchaseOrders.id }).from(purchaseOrders).orderBy(desc(purchaseOrders.id)).limit(1);
    const nextId = lastPO[0] ? lastPO[0].id + 1 : 1;
    const poNumber = `FUR-25-${(100 + nextId).toString()}`;
    
    // Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    
    // Create PO
    const poResult = await db.insert(purchaseOrders)
      .values({ ...po, poNumber, totalAmount })
      .returning();
    
    const createdPO = poResult[0];
    
    // Create PO items
    const itemsWithPOId = items.map(item => ({ 
      ...item, 
      poId: createdPO.id,
      totalPrice: item.qty * item.unitPrice
    }));
    
    await db.insert(purchaseOrderItems).values(itemsWithPOId);
    
    // Create audit log
    await this.createAuditLog({
      userId: po.createdBy,
      action: 'po.created',
      tableName: 'purchase_orders',
      recordId: createdPO.id,
      metadata: { poNumber, itemCount: items.length, totalAmount }
    });
    
    return createdPO;
  }

  async updatePurchaseOrder(id: number, updates: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const result = await db.update(purchaseOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return result[0];
  }

  async updatePurchaseOrderStatus(id: number, status: string, userId: number): Promise<PurchaseOrder | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'received') {
      updateData.receivedAt = new Date();
    }
    
    const result = await db.update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id))
      .returning();
    
    if (result[0]) {
      await this.createAuditLog({
        userId,
        action: `po.${status}`,
        tableName: 'purchase_orders',
        recordId: id,
        metadata: { status }
      });
    }
    
    return result[0];
  }

  async receivePurchaseOrder(id: number, receivedItems: { id: number; receivedQty: number }[], userId: number): Promise<boolean> {
    try {
      // Update received quantities for items
      for (const item of receivedItems) {
        await db.update(purchaseOrderItems)
          .set({ receivedQty: item.receivedQty })
          .where(eq(purchaseOrderItems.id, item.id));
      }
      
      // Update PO status to received
      await this.updatePurchaseOrderStatus(id, 'received', userId);
      
      // Update product stock based on received items
      for (const item of receivedItems) {
        const poItem = await db.select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, item.id))
          .limit(1);
        
        if (poItem[0] && item.receivedQty > 0) {
          // Get current stock
          const product = await db.select()
            .from(products)
            .where(eq(products.id, poItem[0].productId))
            .limit(1);
          
          if (product[0]) {
            const currentStock = product[0].currentStock || 0; // Ensure not null
            const newStock = currentStock + item.receivedQty;
            
            // Update product stock
            await db.update(products)
              .set({ currentStock: newStock })
              .where(eq(products.id, poItem[0].productId));
            
            // Create stock movement with all required fields
            await db.insert(stockMovements).values({
              productId: poItem[0].productId,
              movementType: 'in',
              quantity: item.receivedQty,
              previousStock: currentStock,
              newStock: newStock,
              reason: `PO Receipt - ${poItem[0].description}`,
              reference: `PO-${id}`,
              performedBy: userId,
              vendor: '', // Will be filled by supplier name if needed
              notes: `Purchase order receipt for ${poItem[0].description}`
            });
          }
        }
      }
      
      await this.createAuditLog({
        userId,
        action: 'po.received',
        tableName: 'purchase_orders',
        recordId: id,
        metadata: { receivedItemsCount: receivedItems.length }
      });
      
      return true;
    } catch (error) {
      console.error('Error receiving purchase order:', error);
      return false;
    }
  }

  async getPurchaseOrderItems(poId: number): Promise<(PurchaseOrderItem & { product: Product })[]> {
    const result = await db.select({
      id: purchaseOrderItems.id,
      poId: purchaseOrderItems.poId,
      productId: purchaseOrderItems.productId,
      sku: purchaseOrderItems.sku,
      description: purchaseOrderItems.description,
      qty: purchaseOrderItems.qty,
      unitPrice: purchaseOrderItems.unitPrice,
      totalPrice: purchaseOrderItems.totalPrice,
      expectedDeliveryDate: purchaseOrderItems.expectedDeliveryDate,
      receivedQty: purchaseOrderItems.receivedQty,
      createdAt: purchaseOrderItems.createdAt,
      product: products
    })
    .from(purchaseOrderItems)
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.poId, poId));
    
    return result;
  }

  // Audit Log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(filters?: { tableName?: string; recordId?: number; userId?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    const whereConditions = [];
    if (filters?.tableName) {
      whereConditions.push(eq(auditLogs.tableName, filters.tableName));
    }
    if (filters?.recordId) {
      whereConditions.push(eq(auditLogs.recordId, filters.recordId));
    }
    if (filters?.userId) {
      whereConditions.push(eq(auditLogs.userId, filters.userId));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    return await query.orderBy(desc(auditLogs.createdAt));
  }

  // Auto PO Generation with Intelligent Supplier Selection
  async generateAutoPurchaseOrders(userId: number): Promise<PurchaseOrder[]> {
    // Find products with low stock (current_stock < minimum_stock_level)
    const lowStockProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      currentStock: products.currentStock,
      minimumStockLevel: products.minimumStockLevel,
      price: products.price,
      brand: products.brand
    })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        sql`current_stock < minimum_stock_level`
      )
    );
    
    if (lowStockProducts.length === 0) {
      return [];
    }
    
    // Group products by supplier using supplier-product relationships
    const productSupplierMap = new Map<number, { supplier: Supplier; products: Array<any>; relationships: Array<any> }>();
    
    for (const product of lowStockProducts) {
      // Find suppliers for this product
      const productSuppliers = await db.select()
        .from(supplierProducts)
        .leftJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
        .where(and(
          eq(supplierProducts.productId, product.id),
          eq(supplierProducts.isActive, true),
          eq(suppliers.isActive, true)
        ))
        .orderBy(desc(supplierProducts.isPreferred), asc(supplierProducts.unitPrice));
      
      let selectedSupplier = null;
      let selectedRelationship = null;
      
      if (productSuppliers.length > 0) {
        // Use the best supplier (preferred first, then lowest price)
        selectedSupplier = productSuppliers[0].suppliers!;
        selectedRelationship = productSuppliers[0].supplier_products!;
      } else if (product.brand) {
        // If no direct supplier-product relationship, try to find by brand
        const brandSuppliers = await db.select()
          .from(supplierBrands)
          .leftJoin(suppliers, eq(supplierBrands.supplierId, suppliers.id))
          .leftJoin(brands, eq(supplierBrands.brandId, brands.id))
          .where(and(
            eq(brands.name, product.brand),
            eq(supplierBrands.isActive, true),
            eq(suppliers.isActive, true)
          ))
          .orderBy(desc(supplierBrands.isPrimarySupplier))
          .limit(1);
        
        if (brandSuppliers.length > 0) {
          selectedSupplier = brandSuppliers[0].suppliers!;
        }
      }
      
      if (!selectedSupplier) {
        // Fall back to preferred supplier
        const fallbackSuppliers = await db.select()
          .from(suppliers)
          .where(and(eq(suppliers.preferred, true), eq(suppliers.isActive, true)))
          .limit(1);
        
        if (fallbackSuppliers.length > 0) {
          selectedSupplier = fallbackSuppliers[0];
        }
      }
      
      if (selectedSupplier) {
        if (!productSupplierMap.has(selectedSupplier.id)) {
          productSupplierMap.set(selectedSupplier.id, {
            supplier: selectedSupplier,
            products: [],
            relationships: []
          });
        }
        
        productSupplierMap.get(selectedSupplier.id)!.products.push(product);
        if (selectedRelationship) {
          productSupplierMap.get(selectedSupplier.id)!.relationships.push(selectedRelationship);
        }
      }
    }
    
    if (productSupplierMap.size === 0) {
      throw new Error('No suppliers found for low stock products');
    }
    
    // Create separate POs for each supplier
    const createdPOs: PurchaseOrder[] = [];
    
    for (const [supplierId, supplierData] of productSupplierMap) {
      const { supplier, products: supplierProducts, relationships } = supplierData;
      
      // Create PO items for this supplier's products
      const items: InsertPurchaseOrderItem[] = supplierProducts.map((product, index) => {
        const relationship = relationships[index];
        const qtyNeeded = Math.max(1, (product.minimumStockLevel || 10) - product.currentStock);
        
        // Add 10% buffer to quantity for better stock management
        const orderQty = Math.ceil(qtyNeeded * 1.1);
        
        return {
          poId: 0, // Will be set when PO is created
          productId: product.id,
          sku: product.sku || '',
          description: product.name,
          qty: Math.max(orderQty, relationship?.minOrderQty || 1),
          unitPrice: relationship?.unitPrice || product.price || 0
        };
      });
      
      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
      
      // Create the auto PO
      const po: InsertPurchaseOrder = {
        supplierId: supplier.id,
        status: 'draft',
        notes: `Auto-generated PO for ${supplierProducts.length} low stock item${supplierProducts.length !== 1 ? 's' : ''}`,
        autoGenerated: true,
        totalAmount,
        createdBy: userId
      };
      
      const createdPO = await this.createPurchaseOrder(po, items);
      createdPOs.push(createdPO);
    }
    
    return createdPOs;
  }





  // Supplier-Product Relationship Methods
  async getSupplierProducts(supplierId: number): Promise<(SupplierProduct & { product: Product })[]> {
    const result = await db.select()
      .from(supplierProducts)
      .leftJoin(products, eq(supplierProducts.productId, products.id))
      .where(and(eq(supplierProducts.supplierId, supplierId), eq(supplierProducts.isActive, true)));

    return result.map(row => ({
      ...row.supplier_products,
      product: row.products!
    }));
  }

  async getProductSuppliers(productId: number): Promise<(SupplierProduct & { supplier: Supplier })[]> {
    const result = await db.select()
      .from(supplierProducts)
      .leftJoin(suppliers, eq(supplierProducts.supplierId, suppliers.id))
      .where(and(eq(supplierProducts.productId, productId), eq(supplierProducts.isActive, true)));

    return result.map(row => ({
      ...row.supplier_products,
      supplier: row.suppliers!
    }));
  }

  async createSupplierProduct(supplierProduct: InsertSupplierProduct): Promise<SupplierProduct> {
    const result = await db.insert(supplierProducts).values(supplierProduct).returning();
    return result[0];
  }

  async updateSupplierProduct(id: number, updates: Partial<InsertSupplierProduct>): Promise<SupplierProduct | undefined> {
    const result = await db.update(supplierProducts).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(supplierProducts.id, id)).returning();
    return result[0];
  }

  async deleteSupplierProduct(id: number): Promise<boolean> {
    const result = await db.update(supplierProducts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(supplierProducts.id, id))
      .returning();
    return result.length > 0;
  }

  // Supplier Auto-suggestion for Products
  async getSuggestedSuppliersForProducts(productIds: number[]): Promise<{ productId: number; suppliers: Supplier[] }[]> {
    const products = await db.select().from(products).where(inArray(products.id, productIds));
    
    const suggestions = await Promise.all(products.map(async (product) => {
      // Get preferred suppliers since brand relationship is removed
      const preferredSuppliersResult = await db.select()
        .from(suppliers)
        .where(and(eq(suppliers.preferred, true), eq(suppliers.isActive, true)));
      
      return {
        productId: product.id,
        suppliers: preferredSuppliersResult
      };
    }));
    
    return suggestions;
  }
}

export const storage = new DatabaseStorage();