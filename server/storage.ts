import {
  users,
  categories,
  products,
  materialRequests,
  requestItems,
  boqUploads,
  stockMovements,
  attendance,
  pettyCashExpenses,
  tasks,
  priceComparisons,
  payroll,
  leaves,
  clients,
  projects,
  projectLogs,
  projectFiles,
  moodboards,
  salesProducts,
  quotes,
  quoteItems,

  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type MaterialRequest,
  type InsertMaterialRequest,
  type RequestItem,
  type InsertRequestItem,
  type BOQUpload,
  type InsertBOQUpload,
  type StockMovement,
  type InsertStockMovement,
  type Attendance,
  type InsertAttendance,
  type PettyCashExpense,
  type InsertPettyCashExpense,
  type Task,
  type InsertTask,
  type PriceComparison,
  type InsertPriceComparison,
  type Payroll,
  type InsertPayroll,
  type Leave,
  type InsertLeave,
  type Client,
  type InsertClient,
  type Project,
  type InsertProject,
  type ProjectLog,
  type InsertProjectLog,

  type ProjectQuote,
  type InsertProjectQuote,
  type ProjectOrder,
  type InsertProjectOrder,
  type ProjectFinance,
  type InsertProjectFinance,
  type ProjectManpower,
  type InsertProjectManpower,

  type ProjectFile,
  type InsertProjectFile,
  type ProjectTask,
  type InsertProjectTask,
  type Moodboard,
  type InsertMoodboard,
  type SalesProduct,
  type InsertSalesProduct,
  type Quote,
  type InsertQuote,
  type QuoteItem,
  type InsertQuoteItem,
  type MaterialRequestWithItems,
  type ProductWithStock,
  type BOQExtractedItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql, count, isNotNull, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  getCategory(id: number): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Enhanced Attendance operations
  checkIn(userId: number, checkInBy?: number, location?: string, notes?: string): Promise<Attendance>;
  checkOut(attendanceId: number, checkOutBy?: number): Promise<Attendance | undefined>;
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  getUserAttendance(userId: number, month?: number, year?: number): Promise<Attendance[]>;
  getAllAttendance(filters?: { userId?: number; date?: string; month?: number; year?: number }): Promise<Attendance[]>;
  getTodayAttendance(): Promise<Attendance[]>;
  getAttendanceStats(userId?: number, month?: number, year?: number): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    totalHours: number;
    overtimeHours: number;
  }>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  getProductByName(name: string): Promise<Product | undefined>;
  getProductsWithStock(): Promise<ProductWithStock[]>;
  searchProducts(query: string): Promise<Product[]>;
  getLowStockProducts(): Promise<Product[]>;

  // Stock Movement operations
  addStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  getStockHistory(productId: number): Promise<StockMovement[]>;
  getAllStockMovements(filters?: { productId?: number; type?: string; startDate?: Date; endDate?: Date }): Promise<StockMovement[]>;

  // Material Request operations
  createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest>;
  getAllMaterialRequests(filters?: { status?: string; projectId?: number; priority?: string }): Promise<MaterialRequestWithItems[]>;
  getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined>;
  updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined>;
  deleteMaterialRequest(id: number): Promise<boolean>;

  // Request Item operations
  createRequestItem(item: InsertRequestItem): Promise<RequestItem>;
  getRequestItems(requestId: number): Promise<RequestItem[]>;
  updateRequestItem(id: number, updates: Partial<InsertRequestItem>): Promise<RequestItem | undefined>;
  deleteRequestItem(id: number): Promise<boolean>;

  // BOQ operations
  createBOQUpload(boq: InsertBOQUpload): Promise<BOQUpload>;
  getAllBOQUploads(): Promise<BOQUpload[]>;
  getBOQUpload(id: number): Promise<BOQUpload | undefined>;
  updateBOQUpload(id: number, updates: Partial<InsertBOQUpload>): Promise<BOQUpload | undefined>;
  deleteBOQUpload(id: number): Promise<boolean>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectByCode(code: string): Promise<Project | undefined>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getProjectsByStage(stage: string): Promise<Project[]>;
  getProjectsByClient(clientId: number): Promise<Project[]>;

  // Project Log operations
  createProjectLog(log: InsertProjectLog): Promise<ProjectLog>;
  getProjectLogs(projectId: number): Promise<ProjectLog[]>;
  getAllProjectLogs(): Promise<ProjectLog[]>;
  updateProjectLog(id: number, updates: Partial<InsertProjectLog>): Promise<ProjectLog | undefined>;
  deleteProjectLog(id: number): Promise<boolean>;

  // Project File operations
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  getProjectFiles(projectId: number, category?: string): Promise<ProjectFile[]>;
  updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;

  // Payroll Operations
  getPayroll(id: number): Promise<Payroll | undefined>;
  getUserPayroll(userId: number, month: number, year: number): Promise<Payroll | undefined>;
  getAllPayroll(month?: number, year?: number): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  deletePayroll(id: number): Promise<boolean>;

  // Leave Operations
  getLeave(id: number): Promise<Leave | undefined>;
  getUserLeaves(userId: number, year?: number): Promise<Leave[]>;
  getAllLeaves(filters?: { status?: string; year?: number; month?: number }): Promise<Leave[]>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: number, updates: Partial<InsertLeave>): Promise<Leave | undefined>;
  deleteLeave(id: number): Promise<boolean>;
  getUserLeaveBalance(userId: number, year: number): Promise<{ casual: number; sick: number; earned: number }>;
  getUserAttendance(userId: number, month?: number, year?: number): Promise<Attendance[]>;
  getAllAttendance(filters?: { userId?: number; date?: string; month?: number; year?: number }): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getMonthlyExpenses(month: number, year: number): Promise<number>;

  // Petty Cash Operations  
  getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined>;
  getAllPettyCashExpenses(month?: number, year?: number): Promise<PettyCashExpense[]>;
  createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense>;
  updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined>;
  deletePettyCashExpense(id: number): Promise<boolean>;
  getStaffBalance(userId: number): Promise<{ received: number; spent: number; balance: number }>;
  getAllStaffBalances(): Promise<Array<{ userId: number; userName: string; received: number; spent: number; balance: number }>>;

  // Task Operations
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(assignedTo?: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Price Comparison Operations
  getPriceComparison(id: number): Promise<PriceComparison | undefined>;
  getAllPriceComparisons(): Promise<PriceComparison[]>;
  createPriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison>;
  updatePriceComparison(id: number, updates: Partial<InsertPriceComparison>): Promise<PriceComparison | undefined>;
  deletePriceComparison(id: number): Promise<boolean>;
}

// Database storage implementation using PostgreSQL
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
    // Auto-generate employee ID if not provided
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
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));
    return true;
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.name);
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

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.isActive, true)).orderBy(clients.name);
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.name, name)).limit(1);
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

  // Attendance operations
  async checkIn(userId: number, checkInBy?: number, location?: string, notes?: string): Promise<Attendance> {
    const now = new Date();
    const attendanceData: InsertAttendance = {
      userId,
      date: now,
      checkInTime: now,
      checkOutTime: null,
      workingHours: 0,
      overtimeHours: 0,
      status: "present",
      leaveType: null,
      checkInBy: checkInBy || null,
      checkOutBy: null,
      location: location || null,
      notes: notes || null,
      isManualEntry: !!checkInBy,
    };
    
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async checkOut(attendanceId: number, checkOutBy?: number): Promise<Attendance | undefined> {
    const attendanceRecord = await db.select().from(attendance).where(eq(attendance.id, attendanceId)).limit(1);
    if (!attendanceRecord[0]) return undefined;
    
    const checkOutTime = new Date();
    const workingHours = (checkOutTime.getTime() - attendanceRecord[0].checkInTime!.getTime()) / (1000 * 60 * 60);
    const overtimeHours = workingHours > 8 ? workingHours - 8 : 0;
    
    const result = await db.update(attendance)
      .set({
        checkOutTime,
        workingHours,
        overtimeHours,
        checkOutBy: checkOutBy || null,
        status: "present",
      })
      .where(eq(attendance.id, attendanceId))
      .returning();
    
    return result[0];
  }

  async markAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const result = await db.update(attendance).set(updates).where(eq(attendance.id, id)).returning();
    return result[0];
  }

  async getUserAttendance(userId: number, month?: number, year?: number): Promise<Attendance[]> {
    const conditions = [eq(attendance.userId, userId)];
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      conditions.push(gte(attendance.date, startDate));
      conditions.push(lte(attendance.date, endDate));
    }
    
    return db.select().from(attendance).where(and(...conditions)).orderBy(desc(attendance.date));
  }

  async getAllAttendance(filters?: { userId?: number; date?: string; month?: number; year?: number }): Promise<Attendance[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(attendance.userId, filters.userId));
    }
    
    if (filters?.date) {
      const targetDate = new Date(filters.date);
      conditions.push(eq(attendance.date, targetDate));
    }
    
    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      conditions.push(gte(attendance.date, startDate));
      conditions.push(lte(attendance.date, endDate));
    }
    
    return db.select().from(attendance)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendance.date));
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return db.select().from(attendance)
      .where(and(
        gte(attendance.date, today),
        lte(attendance.date, tomorrow)
      ))
      .orderBy(desc(attendance.checkInTime));
  }

  async getAttendanceStats(userId?: number, month?: number, year?: number): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    totalHours: number;
    overtimeHours: number;
  }> {
    let query = db.select().from(attendance);
    
    const conditions = [];
    if (userId) {
      conditions.push(eq(attendance.userId, userId));
    }
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      conditions.push(gte(attendance.date, startDate));
      conditions.push(lte(attendance.date, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const records = await query;
    
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = totalDays - presentDays;
    const totalHours = records.reduce((sum, r) => sum + (r.workingHours || 0), 0);
    const overtimeHours = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    
    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      overtimeHours,
    };
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    const targetDate = new Date(date);
    return db.select().from(attendance).where(eq(attendance.date, targetDate));
  }

  async getMonthlyExpenses(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const result = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(and(
        gte(pettyCashExpenses.expenseDate, startDate),
        lte(pettyCashExpenses.expenseDate, endDate)
      ));
    
    return Number(result[0]?.total) || 0;
  }

  // Product operations - placeholder implementations
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true));
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return db.select().from(products).where(and(
      eq(products.category, categoryId.toString()),
      eq(products.isActive, true)
    ));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
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

  async getProductByName(name: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.name, name)).limit(1);
    return result[0];
  }

  async getProductsWithStock(): Promise<ProductWithStock[]> {
    const productList = await db.select().from(products).where(eq(products.isActive, true));
    return productList.map(p => ({ 
      ...p, 
      stockStatus: p.currentStock <= p.minStock ? 'low-stock' : 
                   p.currentStock === 0 ? 'out-of-stock' : 'in-stock' as 'in-stock' | 'low-stock' | 'out-of-stock'
    }));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return db.select().from(products).where(sql`${products.name} ILIKE ${'%' + query + '%'}`);
  }

  async getLowStockProducts(): Promise<Product[]> {
    return db.select().from(products).where(sql`${products.currentStock} <= ${products.minStock}`);
  }

  // Stub implementations for remaining methods - these would need proper implementation
  async addStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const result = await db.insert(stockMovements).values(movement).returning();
    return result[0];
  }

  async getStockHistory(productId: number): Promise<StockMovement[]> {
    return db.select().from(stockMovements).where(eq(stockMovements.productId, productId)).orderBy(desc(stockMovements.createdAt));
  }

  async getAllStockMovements(filters?: { productId?: number; type?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    try {
      const conditions = [];
      if (filters?.productId) {
        conditions.push(eq(stockMovements.productId, filters.productId));
      }
      if (filters?.type) {
        conditions.push(eq(stockMovements.movementType, filters.type));
      }
      if (filters?.startDate) {
        conditions.push(gte(stockMovements.createdAt, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(stockMovements.createdAt, filters.endDate));
      }
      
      // First get the movements
      const rawMovements = await db.select()
        .from(stockMovements)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(stockMovements.createdAt));
      
      // Then enrich with product data
      const enrichedMovements = await Promise.all(
        rawMovements.map(async (movement) => {
          let productName = 'Unknown Product';
          let productCategory = 'Unknown Category';
          
          try {
            const product = await this.getProduct(movement.productId);
            if (product) {
              productName = product.name;
              productCategory = product.category;
            }
          } catch (error) {
            console.warn(`Failed to fetch product ${movement.productId}:`, error);
          }
          
          return {
            ...movement,
            productName,
            productCategory
          };
        })
      );
      
      return enrichedMovements;
    } catch (error) {
      console.error('Error in getAllStockMovements:', error);
      return [];
    }
  }

  // Stub implementations for remaining methods
  async createMaterialRequest(request: InsertMaterialRequest, items?: any[]): Promise<MaterialRequest> {
    const result = await db.insert(materialRequests).values(request).returning();
    
    // If items are provided, create them as well
    if (items && items.length > 0) {
      for (const item of items) {
        await this.createRequestItem({ ...item, requestId: result[0].id });
      }
    }
    
    return result[0];
  }

  async getMaterialRequestsByProject(projectId: number): Promise<MaterialRequestWithItems[]> {
    const requests = await db.select().from(materialRequests)
      .where(eq(materialRequests.projectId, projectId));
    
    return requests.map(r => ({ 
      ...r, 
      items: [],
      requestedByUser: { name: 'User', email: '' },
      approvedByUser: r.approvedBy ? { name: 'Approver', email: '' } : undefined
    }));
  }

  async updateMaterialRequestStatus(id: number, status: string, userId: number): Promise<MaterialRequest | undefined> {
    const updates: any = { status };
    
    if (status === 'approved') {
      updates.approvedBy = userId;
      updates.approvedAt = new Date();
    } else if (status === 'issued') {
      updates.issuedBy = userId;
      updates.issuedAt = new Date();
    }
    
    const result = await db.update(materialRequests).set(updates).where(eq(materialRequests.id, id)).returning();
    return result[0];
  }

  async getAllMaterialRequests(filters?: { status?: string; projectId?: number; priority?: string }): Promise<MaterialRequestWithItems[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(materialRequests.status, filters.status));
    }
    if (filters?.projectId) {
      conditions.push(eq(materialRequests.projectId, filters.projectId));
    }
    if (filters?.priority) {
      conditions.push(eq(materialRequests.priority, filters.priority));
    }
    
    const requests = await db.select().from(materialRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    // Load items for each request
    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const items = await this.getRequestItems(request.id);
        return {
          ...request,
          items,
          requestedByUser: { name: 'User', email: '' },
          approvedByUser: request.approvedBy ? { name: 'Approver', email: '' } : undefined
        };
      })
    );
    
    return requestsWithItems;
  }

  async getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined> {
    const result = await db.select().from(materialRequests).where(eq(materialRequests.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    const items = await this.getRequestItems(id);
    return { 
      ...result[0], 
      items,
      requestedByUser: { name: 'User', email: '' },
      approvedByUser: result[0].approvedBy ? { name: 'Approver', email: '' } : undefined
    };
  }

  async updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined> {
    const result = await db.update(materialRequests).set(updates).where(eq(materialRequests.id, id)).returning();
    return result[0];
  }

  async deleteMaterialRequest(id: number): Promise<boolean> {
    await db.delete(materialRequests).where(eq(materialRequests.id, id));
    return true;
  }

  async createRequestItem(item: InsertRequestItem): Promise<RequestItem> {
    const requestItemData = {
      productId: item.productId,
      requestedQuantity: item.requestedQuantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      approvedQuantity: item.approvedQuantity || null,
      requestId: item.requestId
    };
    const result = await db.insert(requestItems).values(requestItemData).returning();
    return result[0];
  }

  async getRequestItems(requestId: number): Promise<RequestItem[]> {
    return db.select().from(requestItems).where(eq(requestItems.requestId, requestId));
  }

  async updateRequestItem(id: number, updates: Partial<InsertRequestItem>): Promise<RequestItem | undefined> {
    const result = await db.update(requestItems).set(updates).where(eq(requestItems.id, id)).returning();
    return result[0];
  }

  async deleteRequestItem(id: number): Promise<boolean> {
    await db.delete(requestItems).where(eq(requestItems.id, id));
    return true;
  }

  async createBOQUpload(boq: InsertBOQUpload): Promise<BOQUpload> {
    const result = await db.insert(boqUploads).values(boq).returning();
    return result[0];
  }

  async getAllBOQUploads(): Promise<BOQUpload[]> {
    return db.select().from(boqUploads).orderBy(desc(boqUploads.createdAt));
  }

  async getBOQUpload(id: number): Promise<BOQUpload | undefined> {
    const result = await db.select().from(boqUploads).where(eq(boqUploads.id, id)).limit(1);
    return result[0];
  }

  async updateBOQUpload(id: number, updates: Partial<InsertBOQUpload>): Promise<BOQUpload | undefined> {
    const result = await db.update(boqUploads).set(updates).where(eq(boqUploads.id, id)).returning();
    return result[0];
  }

  async deleteBOQUpload(id: number): Promise<boolean> {
    await db.delete(boqUploads).where(eq(boqUploads.id, id));
    return true;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const projectData = {
      name: project.name,
      clientId: project.clientId,
      description: project.description,
      notes: project.notes,
      stage: project.stage || 'prospect',
      budget: project.budget || 0,
      differentSiteLocation: project.differentSiteLocation || false,
      siteAddressLine1: project.siteAddressLine1,
      siteAddressLine2: project.siteAddressLine2,
      siteState: project.siteState,
      siteCity: project.siteCity,
      siteLocation: project.siteLocation,
      sitePincode: project.sitePincode,
      completionPercentage: project.completionPercentage || 0,
      files: project.files || [],
      isActive: project.isActive !== undefined ? project.isActive : true
    };
    const result = await db.insert(projects).values(projectData).returning();
    return result[0];
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getProjectByCode(code: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.code, code)).limit(1);
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

  async getProjectsByStage(stage: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.stage, stage));
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProjectLog(log: InsertProjectLog): Promise<ProjectLog> {
    const result = await db.insert(projectLogs).values(log).returning();
    return result[0];
  }

  async getProjectLogs(projectId: number): Promise<ProjectLog[]> {
    return db.select().from(projectLogs).where(eq(projectLogs.projectId, projectId)).orderBy(desc(projectLogs.createdAt));
  }

  async getAllProjectLogs(): Promise<ProjectLog[]> {
    return db.select().from(projectLogs).orderBy(desc(projectLogs.createdAt));
  }

  async updateProjectLog(id: number, updates: Partial<InsertProjectLog>): Promise<ProjectLog | undefined> {
    const result = await db.update(projectLogs).set(updates).where(eq(projectLogs.id, id)).returning();
    return result[0];
  }

  async deleteProjectLog(id: number): Promise<boolean> {
    await db.delete(projectLogs).where(eq(projectLogs.id, id));
    return true;
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const result = await db.insert(projectFiles).values(file).returning();
    return result[0];
  }

  async getProjectFiles(projectId: number, category?: string): Promise<ProjectFile[]> {
    const conditions = [eq(projectFiles.projectId, projectId)];
    
    if (category) {
      conditions.push(eq(projectFiles.category, category));
    }
    
    return db.select().from(projectFiles)
      .where(and(...conditions))
      .orderBy(desc(projectFiles.createdAt));
  }

  async updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const result = await db.update(projectFiles).set(updates).where(eq(projectFiles.id, id)).returning();
    return result[0];
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
    return true;
  }

  // Payroll operations - stub implementations
  async getPayroll(id: number): Promise<Payroll | undefined> {
    const result = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
    return result[0];
  }

  async getUserPayroll(userId: number, month: number, year: number): Promise<Payroll | undefined> {
    const result = await db.select().from(payroll).where(and(
      eq(payroll.userId, userId),
      eq(payroll.month, month),
      eq(payroll.year, year)
    )).limit(1);
    return result[0];
  }

  async getAllPayroll(month?: number, year?: number): Promise<Payroll[]> {
    const conditions = [];
    if (month) {
      conditions.push(eq(payroll.month, month));
    }
    if (year) {
      conditions.push(eq(payroll.year, year));
    }
    
    return db.select().from(payroll)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payroll.createdAt));
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const result = await db.insert(payroll).values(payrollData).returning();
    return result[0];
  }

  async updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const result = await db.update(payroll).set(updates).where(eq(payroll.id, id)).returning();
    return result[0];
  }

  async deletePayroll(id: number): Promise<boolean> {
    await db.delete(payroll).where(eq(payroll.id, id));
    return true;
  }

  // Leave operations - stub implementations
  async getLeave(id: number): Promise<Leave | undefined> {
    const result = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
    return result[0];
  }

  async getUserLeaves(userId: number, year?: number): Promise<Leave[]> {
    const conditions = [eq(leaves.userId, userId)];
    
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      conditions.push(gte(leaves.startDate, startDate));
      conditions.push(lte(leaves.startDate, endDate));
    }
    
    return db.select().from(leaves)
      .where(and(...conditions))
      .orderBy(desc(leaves.appliedAt));
  }

  async getAllLeaves(filters?: { status?: string; year?: number; month?: number }): Promise<Leave[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(leaves.status, filters.status));
    }
    if (filters?.year) {
      const startDate = new Date(filters.year, 0, 1);
      const endDate = new Date(filters.year + 1, 0, 1);
      conditions.push(gte(leaves.startDate, startDate));
      conditions.push(lte(leaves.startDate, endDate));
    }
    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0);
      conditions.push(gte(leaves.startDate, startDate));
      conditions.push(lte(leaves.startDate, endDate));
    }
    
    return db.select().from(leaves)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leaves.appliedAt));
  }

  async createLeave(leave: InsertLeave): Promise<Leave> {
    const result = await db.insert(leaves).values(leave).returning();
    return result[0];
  }

  async updateLeave(id: number, updates: Partial<InsertLeave>): Promise<Leave | undefined> {
    const result = await db.update(leaves).set(updates).where(eq(leaves.id, id)).returning();
    return result[0];
  }

  async deleteLeave(id: number): Promise<boolean> {
    await db.delete(leaves).where(eq(leaves.id, id));
    return true;
  }

  async getUserLeaveBalance(userId: number, year: number): Promise<{ casual: number; sick: number; earned: number }> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    const userLeaves = await db.select().from(leaves)
      .where(and(
        eq(leaves.userId, userId),
        gte(leaves.startDate, startDate),
        lte(leaves.startDate, endDate),
        eq(leaves.status, 'approved')
      ));
    
    const casualTaken = userLeaves.filter(l => l.leaveType === 'casual').reduce((sum, l) => sum + l.totalDays, 0);
    const sickTaken = userLeaves.filter(l => l.leaveType === 'sick').reduce((sum, l) => sum + l.totalDays, 0);
    const earnedTaken = userLeaves.filter(l => l.leaveType === 'earned').reduce((sum, l) => sum + l.totalDays, 0);
    
    return {
      casual: Math.max(0, 12 - casualTaken), // Assuming 12 casual leaves per year
      sick: Math.max(0, 12 - sickTaken), // Assuming 12 sick leaves per year
      earned: Math.max(0, 21 - earnedTaken), // Assuming 21 earned leaves per year
    };
  }

  // Petty Cash operations
  async getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined> {
    const result = await db.select().from(pettyCashExpenses).where(eq(pettyCashExpenses.id, id)).limit(1);
    return result[0];
  }

  async getAllPettyCashExpenses(month?: number, year?: number): Promise<PettyCashExpense[]> {
    const conditions = [];
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      conditions.push(gte(pettyCashExpenses.expenseDate, startDate));
      conditions.push(lte(pettyCashExpenses.expenseDate, endDate));
    }
    
    return db.select().from(pettyCashExpenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(pettyCashExpenses.expenseDate));
  }

  async createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense> {
    const result = await db.insert(pettyCashExpenses).values(expense).returning();
    return result[0];
  }

  async updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined> {
    const result = await db.update(pettyCashExpenses).set(updates).where(eq(pettyCashExpenses.id, id)).returning();
    return result[0];
  }

  async deletePettyCashExpense(id: number): Promise<boolean> {
    await db.delete(pettyCashExpenses).where(eq(pettyCashExpenses.id, id));
    return true;
  }

  async getStaffBalance(userId: number): Promise<{ received: number; spent: number; balance: number }> {
    const received = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(and(
        eq(pettyCashExpenses.paidBy, userId),
        eq(pettyCashExpenses.status, 'income')
      ));
    
    const spent = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(and(
        eq(pettyCashExpenses.paidBy, userId),
        eq(pettyCashExpenses.status, 'expense')
      ));
    
    const receivedTotal = Number(received[0]?.total) || 0;
    const spentTotal = Number(spent[0]?.total) || 0;
    
    return {
      received: receivedTotal,
      spent: spentTotal,
      balance: receivedTotal - spentTotal,
    };
  }

  async getAllStaffBalances(): Promise<Array<{ userId: number; userName: string; received: number; spent: number; balance: number }>> {
    // This would require a complex join query in a real implementation
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    
    const balances = await Promise.all(
      allUsers.map(async (user) => {
        const balance = await this.getStaffBalance(user.id);
        return {
          userId: user.id,
          userName: user.name,
          ...balance,
        };
      })
    );
    
    return balances;
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async getAllTasks(assignedTo?: number): Promise<Task[]> {
    if (assignedTo) {
      return db.select().from(tasks)
        .where(eq(tasks.assignedTo, assignedTo))
        .orderBy(desc(tasks.createdAt));
    }
    
    return db.select().from(tasks)
      .orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    await db.delete(tasks).where(eq(tasks.id, id));
    return true;
  }

  // Price Comparison operations
  async getPriceComparison(id: number): Promise<PriceComparison | undefined> {
    const result = await db.select().from(priceComparisons).where(eq(priceComparisons.id, id)).limit(1);
    return result[0];
  }

  async getAllPriceComparisons(): Promise<PriceComparison[]> {
    return db.select().from(priceComparisons).orderBy(desc(priceComparisons.createdAt));
  }

  async createPriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison> {
    const result = await db.insert(priceComparisons).values(comparison).returning();
    return result[0];
  }

  async updatePriceComparison(id: number, updates: Partial<InsertPriceComparison>): Promise<PriceComparison | undefined> {
    const result = await db.update(priceComparisons).set(updates).where(eq(priceComparisons.id, id)).returning();
    return result[0];
  }

  async deletePriceComparison(id: number): Promise<boolean> {
    await db.delete(priceComparisons).where(eq(priceComparisons.id, id));
    return true;
  }

  async getDashboardStats(userRole: string): Promise<any> {
    try {
      // Get basic counts
      const totalProducts = await db.select({ count: sql`count(*)` }).from(products).where(eq(products.isActive, true));
      const totalProjects = await db.select({ count: sql`count(*)` }).from(projects).where(eq(projects.isActive, true));
      const totalUsers = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.isActive, true));
      
      // Get pending material requests
      const pendingRequests = await db.select({ count: sql`count(*)` }).from(materialRequests).where(eq(materialRequests.status, 'pending'));
      
      // Get low stock products
      const lowStockProducts = await db.select({ count: sql`count(*)` }).from(products).where(sql`${products.currentStock} <= ${products.minStock}`);
      
      return {
        totalProducts: Number(totalProducts[0]?.count) || 0,
        totalProjects: Number(totalProjects[0]?.count) || 0,
        totalUsers: Number(totalUsers[0]?.count) || 0,
        pendingRequests: Number(pendingRequests[0]?.count) || 0,
        lowStockProducts: Number(lowStockProducts[0]?.count) || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalProducts: 0,
        totalProjects: 0,
        totalUsers: 0,
        pendingRequests: 0,
        lowStockProducts: 0
      };
    }
  }

  // Additional methods to complete the application functionality
  async getAllSalesProducts(): Promise<any[]> {
    return db.select().from(salesProducts).where(eq(salesProducts.isActive, true));
  }

  async getSalesProduct(id: number): Promise<any> {
    const result = await db.select().from(salesProducts).where(eq(salesProducts.id, id)).limit(1);
    return result[0];
  }

  async createSalesProduct(product: any): Promise<any> {
    const result = await db.insert(salesProducts).values(product).returning();
    return result[0];
  }

  async updateSalesProduct(id: number, updates: any): Promise<any> {
    const result = await db.update(salesProducts).set(updates).where(eq(salesProducts.id, id)).returning();
    return result[0];
  }

  async deleteSalesProduct(id: number): Promise<boolean> {
    await db.update(salesProducts).set({ isActive: false }).where(eq(salesProducts.id, id));
    return true;
  }

  async getAllQuotes(): Promise<any[]> {
    return db.select().from(quotes).where(eq(quotes.isActive, true));
  }

  async getQuotesByProject(projectId: number): Promise<any[]> {
    return db.select().from(quotes).where(and(
      eq(quotes.projectId, projectId),
      eq(quotes.isActive, true)
    ));
  }

  async createQuote(quote: any): Promise<any> {
    const result = await db.insert(quotes).values(quote).returning();
    return result[0];
  }

  async updateQuote(id: number, updates: any): Promise<any> {
    const result = await db.update(quotes).set(updates).where(eq(quotes.id, id)).returning();
    return result[0];
  }

  async deleteQuote(id: number): Promise<boolean> {
    await db.update(quotes).set({ isActive: false }).where(eq(quotes.id, id));
    return true;
  }

  async getQuoteWithItems(id: number): Promise<any> {
    const quote = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote[0]) return undefined;
    
    const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
    return { ...quote[0], items };
  }

  async updateQuoteItems(quoteId: number, items: any[]): Promise<void> {
    // Delete existing items
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
    
    // Insert new items
    if (items && items.length > 0) {
      await db.insert(quoteItems).values(items.map(item => ({ ...item, quoteId })));
    }
  }

  async getQuoteItems(quoteId: number): Promise<any[]> {
    return db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async getAllMoodboards(): Promise<any[]> {
    return db.select().from(moodboards).orderBy(desc(moodboards.createdAt));
  }

  async getMoodboard(id: number): Promise<any> {
    const result = await db.select().from(moodboards).where(eq(moodboards.id, id)).limit(1);
    return result[0];
  }

  async createMoodboard(moodboard: any): Promise<any> {
    const result = await db.insert(moodboards).values(moodboard).returning();
    return result[0];
  }

  async updateMoodboard(id: number, updates: any): Promise<any> {
    const result = await db.update(moodboards).set(updates).where(eq(moodboards.id, id)).returning();
    return result[0];
  }

  async deleteMoodboard(id: number): Promise<boolean> {
    await db.delete(moodboards).where(eq(moodboards.id, id));
    return true;
  }

  async getMoodboardsByProject(projectId: number): Promise<any[]> {
    return db.select().from(moodboards).where(eq(moodboards.linkedProjectId, projectId));
  }

  async createStockMovement(movement: any): Promise<any> {
    const result = await db.insert(stockMovements).values(movement).returning();
    return result[0];
  }

  async getStockMovement(id: number): Promise<any> {
    const result = await db.select().from(stockMovements).where(eq(stockMovements.id, id)).limit(1);
    return result[0];
  }

  async deleteStockMovement(id: number): Promise<boolean> {
    await db.delete(stockMovements).where(eq(stockMovements.id, id));
    return true;
  }

  async getProjectFile(id: number): Promise<any> {
    const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return result[0];
  }

  // Additional petty cash and stats methods
  async getPettyCashStats(): Promise<any> {
    const totalExpenses = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(eq(pettyCashExpenses.status, 'expense'));
    
    const totalIncome = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(eq(pettyCashExpenses.status, 'income'));
    
    return {
      totalExpenses: Number(totalExpenses[0]?.total) || 0,
      totalIncome: Number(totalIncome[0]?.total) || 0,
      balance: (Number(totalIncome[0]?.total) || 0) - (Number(totalExpenses[0]?.total) || 0)
    };
  }

  async getPersonalPettyCashStats(userId: number): Promise<any> {
    const totalExpenses = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(and(
        eq(pettyCashExpenses.paidBy, userId),
        eq(pettyCashExpenses.status, 'expense')
      ));
    
    const totalIncome = await db.select({ total: sql`SUM(${pettyCashExpenses.amount})` })
      .from(pettyCashExpenses)
      .where(and(
        eq(pettyCashExpenses.paidBy, userId),
        eq(pettyCashExpenses.status, 'income')
      ));
    
    return {
      totalExpenses: Number(totalExpenses[0]?.total) || 0,
      totalIncome: Number(totalIncome[0]?.total) || 0,
      balance: (Number(totalIncome[0]?.total) || 0) - (Number(totalExpenses[0]?.total) || 0)
    };
  }

  // Sales product categories
  async getSalesProductCategories(): Promise<any[]> {
    const categories = await db.select({ category: salesProducts.category })
      .from(salesProducts)
      .where(eq(salesProducts.isActive, true))
      .groupBy(salesProducts.category);
    
    return categories.map(c => ({ name: c.category }));
  }

  // Additional payroll methods
  async getAllPayrolls(month?: number, year?: number): Promise<Payroll[]> {
    return this.getAllPayroll(month, year);
  }

  async generatePayroll(userId: number, month: number, year: number): Promise<any> {
    // Basic payroll generation logic
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const basicSalary = 25000; // Default salary
    const netSalary = basicSalary;
    
    const payrollData = {
      userId,
      month,
      year,
      basicSalary,
      netSalary,
      actualWorkingDays: 30,
      status: 'draft' as const
    };
    
    const result = await db.insert(payroll).values(payrollData).returning();
    return result[0];
  }

  async processPayroll(id: number, processedBy: number): Promise<any> {
    const result = await db.update(payroll)
      .set({ 
        status: 'processed',
        processedBy,
        processedAt: new Date()
      })
      .where(eq(payroll.id, id))
      .returning();
    
    return result[0];
  }

  async bulkUpdateMonthlyAttendance(month: number, year: number, updates: any[]): Promise<void> {
    // Bulk update logic for attendance
    for (const update of updates) {
      await db.update(attendance)
        .set(update.data)
        .where(eq(attendance.id, update.id));
    }
  }
}

export const storage = new DatabaseStorage();