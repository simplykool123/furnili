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
  quoteItems
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, sql, like, or } from "drizzle-orm";
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
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined>;

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

  // Task operations
  getAllTasks(assignedTo?: number): Promise<any[]>;

  // Stock Movement operations
  getAllStockMovements(): Promise<StockMovement[]>;
  
  // Request Item operations
  createRequestItem(item: InsertRequestItem): Promise<RequestItem>;
  getRequestItems(requestId: number): Promise<RequestItem[]>;

  // Client operations
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;

  // Project File operations
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, updates: Partial<ProjectFile>): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<void>;

  // Project Log operations
  getProjectLogs(projectId: number): Promise<any[]>;

  // Material Request operations
  getAllMaterialRequests(): Promise<MaterialRequest[]>;
  getMaterialRequest(id: number): Promise<MaterialRequest | undefined>;
  getMaterialRequestsByProject(projectId: number): Promise<MaterialRequest[]>;

  // Quote operations
  getQuotesByProject(projectId: number): Promise<Quote[]>;
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


    // Get items with products using raw SQL to ensure it works
    const itemsResult = await db.execute(sql`
      SELECT 
        ri.id, ri.request_id, ri.product_id, ri.requested_quantity, ri.approved_quantity, ri.unit_price, ri.total_price,
        p.name as product_name, p.category as product_category, p.brand as product_brand, p.current_stock as product_stock
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
        currentStock: row.product_stock,
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
    }
    
    const result = await db.update(materialRequests)
      .set(updateData)
      .where(eq(materialRequests.id, id))
      .returning();
    return result[0];
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

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return result[0];
  }

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

  // Task operations (simplified implementation)
  async getAllTasks(assignedTo?: number): Promise<any[]> {
    // Return empty array for now - tasks can be implemented later
    return [];
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
    return db.select().from(requestItems).where(eq(requestItems.requestId, requestId));
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

  // Project Log operations
  async getProjectLogs(projectId: number): Promise<any[]> {
    // Return empty array for now - can be implemented later with activity tracking
    return [];
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

  // Missing attendance methods
  async getAllAttendance(): Promise<any[]> {
    const result = await db.select().from(attendance);
    return result;
  }

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
}

export const storage = new DatabaseStorage();