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
} from '../shared/schema';

import { db } from '../shared/db';
import { eq, desc, asc, gte, lte, and, or, sql, count, sum } from 'drizzle-orm';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Core interface that the system needs
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Product operations  
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  
  // Material Request operations
  getAllMaterialRequests(): Promise<MaterialRequest[]>;
  createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest>;
  
  // Project operations
  getAllProjects(filters?: any): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  
  // File operations
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;
  
  // Dashboard stats
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
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
  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return result[0];
  }

  // Material Request operations
  async getAllMaterialRequests(): Promise<any[]> {
    console.log('DEBUG: DatabaseStorage.getAllMaterialRequests called');
    
    try {
      const requests = await db.select().from(materialRequests).orderBy(desc(materialRequests.createdAt));
      console.log(`DEBUG: Found ${requests.length} requests in database`);
      
      const requestsWithItems = await Promise.all(
        requests.map(async (request: any) => {
          console.log(`DEBUG: Processing request ${request.id}`);
          const items = await this.getRequestItems(request.id);
          console.log(`DEBUG: Request ${request.id} has ${items.length} items with products`);
          return { ...request, items };
        })
      );
      
      console.log(`DEBUG: Returning ${requestsWithItems.length} requests with full details`);
      return requestsWithItems;
    } catch (error) {
      console.error('DEBUG: Error in getAllMaterialRequests:', error);
      return [];
    }
  }

  async getRequestItems(requestId: number): Promise<any[]> {
    const result = await db
      .select({
        id: requestItems.id,
        requestId: requestItems.requestId,
        productId: requestItems.productId,
        quantity: requestItems.quantity,
        unitPrice: requestItems.unitPrice,
        totalPrice: requestItems.totalPrice,
        product: {
          id: products.id,
          name: products.name,
          unit: products.unit,
        }
      })
      .from(requestItems)
      .leftJoin(products, eq(requestItems.productId, products.id))
      .where(eq(requestItems.requestId, requestId));

    return result;
  }

  async createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest> {
    const result = await db.insert(materialRequests).values(request).returning();
    return result[0];
  }

  // Project operations  
  async getAllProjects(filters?: { stage?: string; client?: string }): Promise<Project[]> {
    console.log('DatabaseStorage getAllProjects called with filters:', filters);
    
    try {
      let query = `
        SELECT 
          p.*,
          c.name as client_name,
          c.mobile as client_mobile,
          c.email as client_email,
          c.address as client_address
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        ORDER BY p.created_at DESC
      `;
      
      const result = await db.execute(sql.raw(query));
      console.log('DatabaseStorage Direct PG query executed successfully, result count:', result.rows.length);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        clientId: row.client_id,
        stage: row.stage,
        code: row.code,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        clientName: row.client_name,
        clientMobile: row.client_mobile,
        clientEmail: row.client_email,
        clientAddress: row.client_address
      }));
    } catch (error) {
      console.error('Error in DatabaseStorage getAllProjects:', error);
      return [];
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    console.log('DatabaseStorage getProject (FINAL) called with id:', id);
    
    try {
      const query = `
        SELECT 
          p.*,
          c.name as client_name,
          c.mobile as client_mobile,
          c.email as client_email,
          c.address as client_address
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = $1
      `;
      
      console.log('DatabaseStorage FINAL: About to execute query for id:', id);
      const result = await db.execute(sql.raw(query));
      console.log('DatabaseStorage FINAL: Query executed, rows returned:', result.rows.length);
      
      if (result.rows.length > 0) {
        const project = result.rows[0] as any;
        console.log('DatabaseStorage FINAL: Project client_name:', project.client_name);
        console.log('DatabaseStorage FINAL: Project client_mobile:', project.client_mobile);
        
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          clientId: project.client_id,
          stage: project.stage,
          code: project.code,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at),
          clientName: project.client_name,
          clientMobile: project.client_mobile,
          clientEmail: project.client_email,
          clientAddress: project.client_address
        };
      }
      
      return undefined;
    } catch (error) {
      console.error('DatabaseStorage FINAL: Error in getProject:', error);
      return undefined;
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const result = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return result[0];
  }

  // File operations
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return db.select().from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const result = await db.insert(projectFiles).values(file).returning();
    return result[0];
  }

  async updateProjectFile(id: number, updates: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const result = await db.update(projectFiles).set(updates).where(eq(projectFiles.id, id)).returning();
    return result[0];
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
    return true;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalProducts: number;
    pendingRequests: number;
    completedRequests: number;
    totalProjects: number;
    activeProjects: number;
    totalUsers: number;
    recentActivity: any[];
  }> {
    try {
      const [
        totalProducts,
        pendingRequests,
        completedRequests,
        totalProjects,
        activeProjects,
        totalUsers
      ] = await Promise.all([
        db.select({ count: count() }).from(products).where(eq(products.isActive, true)),
        db.select({ count: count() }).from(materialRequests).where(eq(materialRequests.status, 'pending')),
        db.select({ count: count() }).from(materialRequests).where(eq(materialRequests.status, 'completed')),
        db.select({ count: count() }).from(projects),
        db.select({ count: count() }).from(projects).where(eq(projects.stage, 'in_progress')),
        db.select({ count: count() }).from(users).where(eq(users.isActive, true))
      ]);

      return {
        totalProducts: totalProducts[0]?.count || 0,
        pendingRequests: pendingRequests[0]?.count || 0,
        completedRequests: completedRequests[0]?.count || 0,
        totalProjects: totalProjects[0]?.count || 0,
        activeProjects: activeProjects[0]?.count || 0,
        totalUsers: totalUsers[0]?.count || 0,
        recentActivity: []
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalProducts: 0,
        pendingRequests: 0,
        completedRequests: 0,
        totalProjects: 0,
        activeProjects: 0,
        totalUsers: 0,
        recentActivity: []
      };
    }
  }
}

export const storage = new DatabaseStorage();