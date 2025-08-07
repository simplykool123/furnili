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
  ProjectFile,
  InsertProjectFile,
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
  createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest>;
  updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined>;
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
  getAllPettyCashExpenses(month?: number, year?: number): Promise<PettyCashExpense[]>;
  createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense>;

  // Task operations
  getAllTasks(assignedTo?: number): Promise<any[]>;

  // Stock Movement operations
  getAllStockMovements(): Promise<StockMovement[]>;
  
  // Request Item operations
  createRequestItem(item: InsertRequestItem): Promise<RequestItem>;
  getRequestItems(requestId: number): Promise<RequestItem[]>;
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
    const requestResult = await db.select().from(materialRequests).where(eq(materialRequests.id, id)).limit(1);
    if (!requestResult[0]) return undefined;

    const request = requestResult[0];
    const items = await db.select().from(requestItems).where(eq(requestItems.requestId, id));
    
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await this.getProduct(item.productId);
        return { 
          ...item, 
          product: product!,
          requestedQuantity: item.requestedQuantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        };
      })
    );

    return {
      ...request,
      requestedByUser: undefined,
      approvedByUser: undefined,
      issuedByUser: undefined,
      items: itemsWithProducts,
    };
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

  async createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest> {
    if (!request.orderNumber) {
      const lastRequest = await db.select({ id: materialRequests.id }).from(materialRequests).orderBy(desc(materialRequests.id)).limit(1);
      const nextId = lastRequest[0] ? lastRequest[0].id + 1 : 1;
      request.orderNumber = `REQ-${nextId.toString().padStart(4, '0')}`;
    }
    
    const result = await db.insert(materialRequests).values(request).returning();
    return result[0];
  }

  async updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined> {
    const result = await db.update(materialRequests).set(updates).where(eq(materialRequests.id, id)).returning();
    return result[0];
  }

  async deleteMaterialRequest(id: number): Promise<boolean> {
    await db.delete(requestItems).where(eq(requestItems.requestId, id));
    await db.delete(materialRequests).where(eq(materialRequests.id, id));
    return true;
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
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
  async getAllPettyCashExpenses(month?: number, year?: number): Promise<PettyCashExpense[]> {
    let query = db.select().from(pettyCashExpenses);
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query = query.where(
        and(
          gte(pettyCashExpenses.expenseDate, startDate),
          lte(pettyCashExpenses.expenseDate, endDate)
        )
      );
    }
    
    return query.orderBy(desc(pettyCashExpenses.expenseDate));
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
  async getAllStockMovements(): Promise<StockMovement[]> {
    return db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt));
  }

  // Request Item operations
  async createRequestItem(item: InsertRequestItem): Promise<RequestItem> {
    const result = await db.insert(requestItems).values(item).returning();
    return result[0];
  }

  async getRequestItems(requestId: number): Promise<RequestItem[]> {
    return db.select().from(requestItems).where(eq(requestItems.requestId, requestId));
  }
}

export const storage = new DatabaseStorage();