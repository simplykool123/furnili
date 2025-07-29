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
  crmCustomers,
  crmLeads,
  crmDeals,
  crmActivities,
  crmQuotations,
  crmFollowUps,
  crmSiteVisits,
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
  type CrmCustomer,
  type InsertCrmCustomer,
  type CrmLead,
  type InsertCrmLead,
  type CrmDeal,
  type InsertCrmDeal,
  type CrmActivity,
  type InsertCrmActivity,
  type CrmQuotation,
  type InsertCrmQuotation,
  type CrmFollowUp,
  type InsertCrmFollowUp,
  type CrmSiteVisit,
  type InsertCrmSiteVisit,
  type MaterialRequestWithItems,
  type ProductWithStock,
  type BOQExtractedItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
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
  bulkUpdateMonthlyAttendance(userId: number, month: number, year: number, attendanceData: any[]): Promise<Attendance[]>;
  getStaffUsers(): Promise<User[]>;

  // Payroll operations
  getPayroll(id: number): Promise<Payroll | undefined>;
  getUserPayroll(userId: number, month?: number, year?: number): Promise<Payroll[]>;
  getAllPayroll(filters?: { month?: number; year?: number; status?: string }): Promise<Payroll[]>;
  getAllPayrolls(month?: number, year?: number, userId?: number): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  generatePayroll(userId: number, month: number, year: number): Promise<Payroll>;
  processPayroll(id: number, processedBy: number): Promise<Payroll | undefined>;

  // Leave Management operations
  getLeave(id: number): Promise<Leave | undefined>;
  getUserLeaves(userId: number, year?: number): Promise<Leave[]>;
  getAllLeaves(filters?: { status?: string; leaveType?: string }): Promise<Leave[]>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: number, updates: Partial<InsertLeave>): Promise<Leave | undefined>;
  approveLeave(id: number, approvedBy: number): Promise<Leave | undefined>;
  rejectLeave(id: number, approvedBy: number, rejectionReason: string): Promise<Leave | undefined>;

  // Petty Cash operations
  getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined>;
  getAllPettyCashExpenses(filters?: { status?: string; category?: string; addedBy?: number }): Promise<PettyCashExpense[]>;
  createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense>;
  updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined>;
  approvePettyCashExpense(id: number, approvedBy: number): Promise<PettyCashExpense | undefined>;

  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(filters?: { assignedTo?: number; status?: string; assignedBy?: number }): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Price Comparison operations
  getAllPriceComparisons(productName?: string): Promise<PriceComparison[]>;
  createPriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison>;
  updatePriceComparison(id: number, updates: Partial<InsertPriceComparison>): Promise<PriceComparison | undefined>;
  deletePriceComparison(id: number): Promise<boolean>;

  // WhatsApp and Export operations  
  generateWhatsAppMessage(template: string, items: any[]): Promise<string>;
  
  // Additional missing operations
  updateTaskStatus(id: number, status: string): Promise<Task | undefined>;
  deletePettyCashExpense(id: number): Promise<boolean>;
  getPettyCashStats(): Promise<{ totalExpenses: number; totalIncome: number; balance: number; currentMonthExpenses: number }>;
  getStaffBalance(userId: number): Promise<{ received: number; spent: number; balance: number }>;
  getAllStaffBalances(): Promise<Array<{ userId: number; userName: string; received: number; spent: number; balance: number }>>;
  
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(filters?: {
    search?: string;
    category?: string;
    stockStatus?: string;
  }): Promise<ProductWithStock[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductStock(id: number, newStock: number, movementType: string, reference?: string, performedBy?: number): Promise<boolean>;
  getLowStockProducts(): Promise<ProductWithStock[]>;
  
  // Material request operations
  getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined>;
  getAllMaterialRequests(filters?: {
    status?: string;
    clientName?: string;
    requestedBy?: number;
  }): Promise<MaterialRequestWithItems[]>;
  createMaterialRequest(request: InsertMaterialRequest, items: InsertRequestItem[]): Promise<MaterialRequest>;
  updateMaterialRequestStatus(id: number, status: string, userId: number): Promise<MaterialRequest | undefined>;
  deleteMaterialRequest(id: number): Promise<boolean>;
  
  // BOQ operations
  getBOQUpload(id: number): Promise<BOQUpload | undefined>;
  getAllBOQUploads(uploadedBy?: number): Promise<BOQUpload[]>;
  createBOQUpload(boq: InsertBOQUpload): Promise<BOQUpload>;
  updateBOQUpload(id: number, updates: Partial<InsertBOQUpload>): Promise<BOQUpload | undefined>;
  
  // Stock movement operations
  getStockMovements(productId?: number): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  
  // Dashboard/Analytics
  getDashboardStats(userRole?: string): Promise<{
    totalProducts: number;
    pendingRequests: number;
    lowStockItems: number;
    totalValue: number;
    recentRequests: MaterialRequestWithItems[];
    lowStockProducts: ProductWithStock[];
  }>;

  // Payroll Operations (missing methods)
  getPayroll(id: number): Promise<Payroll | undefined>;
  getUserPayroll(userId: number, month?: number, year?: number): Promise<Payroll[]>;
  getAllPayroll(month?: number, year?: number): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  deletePayroll(id: number): Promise<boolean>;

  // Leave Operations (missing methods)
  getLeave(id: number): Promise<Leave | undefined>;
  getUserLeaves(userId: number): Promise<Leave[]>;
  getAllLeaves(): Promise<Leave[]>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: number, updates: Partial<InsertLeave>): Promise<Leave | undefined>;
  deleteLeave(id: number): Promise<boolean>;

  // Enhanced Attendance Operations
  checkIn(userId: number, checkInBy?: number, location?: string, notes?: string): Promise<Attendance>;
  checkOut(attendanceId: number, checkOutBy?: number): Promise<Attendance | undefined>;
  markAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  getUserAttendance(userId: number, month?: number, year?: number): Promise<Attendance[]>;
  getAllAttendance(month?: number, year?: number): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getMonthlyExpenses(month: number, year: number): Promise<number>;

  // CRM Operations
  getCrmCustomer(id: number): Promise<CrmCustomer | undefined>;
  getAllCrmCustomers(): Promise<CrmCustomer[]>;
  createCrmCustomer(customer: InsertCrmCustomer): Promise<CrmCustomer>;
  updateCrmCustomer(id: number, updates: Partial<InsertCrmCustomer>): Promise<CrmCustomer | undefined>;
  deleteCrmCustomer(id: number): Promise<boolean>;

  getCrmLead(id: number): Promise<CrmLead | undefined>;
  getAllCrmLeads(): Promise<CrmLead[]>;
  createCrmLead(lead: InsertCrmLead): Promise<CrmLead>;
  updateCrmLead(id: number, updates: Partial<InsertCrmLead>): Promise<CrmLead | undefined>;
  deleteCrmLead(id: number): Promise<boolean>;

  getCrmDeal(id: number): Promise<CrmDeal | undefined>;
  getAllCrmDeals(): Promise<CrmDeal[]>;
  createCrmDeal(deal: InsertCrmDeal): Promise<CrmDeal>;
  updateCrmDeal(id: number, updates: Partial<InsertCrmDeal>): Promise<CrmDeal | undefined>;
  deleteCrmDeal(id: number): Promise<boolean>;

  getCrmActivity(id: number): Promise<CrmActivity | undefined>;
  getAllCrmActivities(relatedTo?: string, relatedId?: number): Promise<CrmActivity[]>;
  createCrmActivity(activity: InsertCrmActivity): Promise<CrmActivity>;
  updateCrmActivity(id: number, updates: Partial<InsertCrmActivity>): Promise<CrmActivity | undefined>;
  deleteCrmActivity(id: number): Promise<boolean>;

  // CRM Quotations
  getCrmQuotation(id: number): Promise<CrmQuotation | undefined>;
  getAllCrmQuotations(): Promise<CrmQuotation[]>;
  createCrmQuotation(quotation: InsertCrmQuotation): Promise<CrmQuotation>;
  updateCrmQuotation(id: number, updates: Partial<InsertCrmQuotation>): Promise<CrmQuotation | undefined>;
  deleteCrmQuotation(id: number): Promise<boolean>;

  // CRM Follow-ups
  getCrmFollowUp(id: number): Promise<CrmFollowUp | undefined>;
  getAllCrmFollowUps(): Promise<CrmFollowUp[]>;
  createCrmFollowUp(followUp: InsertCrmFollowUp): Promise<CrmFollowUp>;
  updateCrmFollowUp(id: number, updates: Partial<InsertCrmFollowUp>): Promise<CrmFollowUp | undefined>;
  deleteCrmFollowUp(id: number): Promise<boolean>;

  // CRM Site Visits
  getCrmSiteVisit(id: number): Promise<CrmSiteVisit | undefined>;
  getAllCrmSiteVisits(): Promise<CrmSiteVisit[]>;
  createCrmSiteVisit(visit: InsertCrmSiteVisit): Promise<CrmSiteVisit>;
  updateCrmSiteVisit(id: number, updates: Partial<InsertCrmSiteVisit>): Promise<CrmSiteVisit | undefined>;
  deleteCrmSiteVisit(id: number): Promise<boolean>;

  getCrmStats(): Promise<{
    totalCustomers: number;
    activeLeads: number;
    pipelineValue: number;
    conversionRate: number;
  }>;

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

  // CRM Operations
  // Customer operations
  getCrmCustomer(id: number): Promise<CrmCustomer | undefined>;
  getAllCrmCustomers(): Promise<CrmCustomer[]>;
  createCrmCustomer(customer: InsertCrmCustomer): Promise<CrmCustomer>;
  updateCrmCustomer(id: number, updates: Partial<InsertCrmCustomer>): Promise<CrmCustomer | undefined>;
  deleteCrmCustomer(id: number): Promise<boolean>;

  // Lead operations
  getCrmLead(id: number): Promise<CrmLead | undefined>;
  getAllCrmLeads(): Promise<CrmLead[]>;
  createCrmLead(lead: InsertCrmLead): Promise<CrmLead>;
  updateCrmLead(id: number, updates: Partial<InsertCrmLead>): Promise<CrmLead | undefined>;
  deleteCrmLead(id: number): Promise<boolean>;

  // Deal operations
  getCrmDeal(id: number): Promise<CrmDeal | undefined>;
  getAllCrmDeals(): Promise<CrmDeal[]>;
  createCrmDeal(deal: InsertCrmDeal): Promise<CrmDeal>;
  updateCrmDeal(id: number, updates: Partial<InsertCrmDeal>): Promise<CrmDeal | undefined>;
  deleteCrmDeal(id: number): Promise<boolean>;

  // Activity operations
  getCrmActivity(id: number): Promise<CrmActivity | undefined>;
  getAllCrmActivities(relatedTo?: string, relatedId?: number): Promise<CrmActivity[]>;
  createCrmActivity(activity: InsertCrmActivity): Promise<CrmActivity>;
  updateCrmActivity(id: number, updates: Partial<InsertCrmActivity>): Promise<CrmActivity | undefined>;
  deleteCrmActivity(id: number): Promise<boolean>;

  // CRM Stats
  getCrmStats(): Promise<{
    totalCustomers: number;
    activeLeads: number;
    pipelineValue: number;
    conversionRate: number;
  }>;
}

export class MemStorage {
  private users: Map<number, User> = new Map();
  private categories: Map<number, Category> = new Map();
  private clients: Map<number, Client> = new Map();
  private products: Map<number, Product> = new Map();
  private materialRequests: Map<number, MaterialRequest> = new Map();
  private requestItems: Map<number, RequestItem[]> = new Map();
  private boqUploads: Map<number, BOQUpload> = new Map();
  private stockMovements: Map<number, StockMovement[]> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private pettyCashExpenses: Map<number, PettyCashExpense> = new Map();
  private tasks: Map<number, Task> = new Map();
  private priceComparisons: Map<number, PriceComparison> = new Map();
  private payroll: Map<number, Payroll> = new Map();
  private leaves: Map<number, Leave> = new Map();
  private currentId = 1;

  // Enhanced Attendance operations  
  async checkIn(userId: number, checkInBy?: number, location?: string, notes?: string): Promise<Attendance> {
    const id = this.currentId++;
    const now = new Date();
    
    const attendance: Attendance = {
      id,
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
      createdAt: now,
      updatedAt: now,
    };
    
    this.attendance.set(id, attendance);
    return attendance;
  }

  async checkOut(attendanceId: number, checkOutBy?: number): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(attendanceId);
    if (!attendance) return undefined;
    
    const checkOutTime = new Date();
    const workingHours = (checkOutTime.getTime() - attendance.checkInTime!.getTime()) / (1000 * 60 * 60);
    const overtimeHours = workingHours > 8 ? workingHours - 8 : 0;
    
    const updatedAttendance: Attendance = {
      ...attendance,
      checkOutTime,
      workingHours,
      overtimeHours,
      checkOutBy: checkOutBy || null,
      status: "present",
      updatedAt: new Date(),
    };
    
    this.attendance.set(attendanceId, updatedAttendance);
    return updatedAttendance;
  }

  async markAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = this.currentId++;
    const now = new Date();
    
    const newAttendance: Attendance = {
      id,
      ...attendance,
      createdAt: now,
      updatedAt: now,
    };
    
    this.attendance.set(id, newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;
    
    const updatedAttendance: Attendance = {
      ...attendance,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  async getUserAttendance(userId: number, month?: number, year?: number): Promise<Attendance[]> {
    const allAttendance = Array.from(this.attendance.values());
    let filtered = allAttendance.filter(a => a.userId === userId);
    
    if (month && year) {
      filtered = filtered.filter(a => {
        const date = new Date(a.date);
        return date.getMonth() + 1 === month && date.getFullYear() === year;
      });
    }
    
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getAllAttendance(filters?: { userId?: number; date?: string; month?: number; year?: number }): Promise<Attendance[]> {
    let allAttendance = Array.from(this.attendance.values());
    
    if (filters?.userId) {
      allAttendance = allAttendance.filter(a => a.userId === filters.userId);
    }
    
    if (filters?.date) {
      const targetDate = new Date(filters.date);
      allAttendance = allAttendance.filter(a => 
        a.date.toDateString() === targetDate.toDateString()
      );
    }
    
    if (filters?.month && filters?.year) {
      allAttendance = allAttendance.filter(a => {
        const date = new Date(a.date);
        return date.getMonth() + 1 === filters.month && date.getFullYear() === filters.year;
      });
    }
    
    return allAttendance.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allAttendance = Array.from(this.attendance.values());
    const todayAttendance = allAttendance.filter(a => {
      const attendanceDate = new Date(a.date);
      attendanceDate.setHours(0, 0, 0, 0);
      return attendanceDate.getTime() === today.getTime();
    });
    
    // Include user information
    const attendanceWithUsers = await Promise.all(
      todayAttendance.map(async (attendance) => {
        const user = await this.getUser(attendance.userId);
        return {
          ...attendance,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      })
    );
    
    return attendanceWithUsers;
  }

  async getAttendanceStats(userId?: number, month?: number, year?: number): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    totalHours: number;
    overtimeHours: number;
    holidays: number;
    workingDays: number;
  }> {
    const filters = { userId, month, year };
    const attendance = await this.getAllAttendance(filters);
    
    const presentDays = attendance.filter(a => a.status === "present").length;
    const totalHours = attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
    const overtimeHours = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    
    // Calculate working days and holidays in month if month/year specified
    let totalDays = attendance.length;
    let holidays = 0;
    let workingDays = 0;
    
    if (month && year) {
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Count Sundays as holidays
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month - 1, i);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0) { // Sunday
          holidays++;
        } else {
          workingDays++;
        }
      }
      
      totalDays = daysInMonth;
    }
    
    return {
      totalDays,
      presentDays,
      absentDays: Math.max(0, workingDays - presentDays), // Ensure non-negative
      totalHours,
      overtimeHours,
      holidays,
      workingDays: workingDays || totalDays, // Use totalDays as fallback
    };
  }

  // Petty Cash operations
  async getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined> {
    return this.pettyCashExpenses.get(id);
  }

  async getAllPettyCashExpenses(filters?: { status?: string; category?: string; addedBy?: number }): Promise<PettyCashExpense[]> {
    let allExpenses = Array.from(this.pettyCashExpenses.values());
    
    if (filters?.status) {
      allExpenses = allExpenses.filter(e => e.status === filters.status);
    }
    
    if (filters?.category) {
      allExpenses = allExpenses.filter(e => e.category === filters.category);
    }
    
    if (filters?.addedBy) {
      allExpenses = allExpenses.filter(e => e.addedBy === filters.addedBy);
    }
    
    // Include user information
    const expensesWithUsers = await Promise.all(
      allExpenses.map(async (expense) => {
        const user = await this.getUser(expense.addedBy);
        return {
          ...expense,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      })
    );
    
    return expensesWithUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense> {
    const id = this.currentId++;
    const now = new Date();
    
    const newExpense: PettyCashExpense = {
      id,
      ...expense,
      status: expense.status || 'expense', // Use provided status or default to expense
      createdAt: now,
      updatedAt: now,
    };
    
    this.pettyCashExpenses.set(id, newExpense);
    return newExpense;
  }

  async updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined> {
    const expense = this.pettyCashExpenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense: PettyCashExpense = {
      ...expense,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.pettyCashExpenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deletePettyCashExpense(id: number): Promise<boolean> {
    return this.pettyCashExpenses.delete(id);
  }

  async getPettyCashStats(): Promise<{
    totalExpenses: number;
    totalIncome: number;
    balance: number;
    currentMonthExpenses: number;
  }> {
    const allExpenses = Array.from(this.pettyCashExpenses.values());
    
    const totalExpenses = allExpenses
      .filter(e => e.status === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalIncome = allExpenses
      .filter(e => e.status === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthExpenses = allExpenses
      .filter(e => {
        const expenseDate = new Date(e.expenseDate);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               e.status === 'expense';
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      currentMonthExpenses,
    };
  }

  // Get individual staff balance
  async getStaffBalance(userId: number): Promise<{ received: number; spent: number; balance: number }> {
    const allExpenses = Array.from(this.pettyCashExpenses.values());
    
    // Money received by this staff member (income entries where paidBy = userId)
    const received = allExpenses
      .filter(e => e.status === 'income' && e.paidBy === userId)
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Money spent by this staff member (expense entries where paidBy = userId)  
    const spent = allExpenses
      .filter(e => e.status === 'expense' && e.paidBy === userId)
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      received,
      spent,
      balance: received - spent,
    };
  }

  // Get all staff balances
  async getAllStaffBalances(): Promise<Array<{ userId: number; userName: string; received: number; spent: number; balance: number }>> {
    const allUsers = Array.from(this.users.values());
    const balances = [];
    
    for (const user of allUsers) {
      const balance = await this.getStaffBalance(user.id);
      if (balance.received > 0 || balance.spent > 0) { // Only include users with transactions
        balances.push({
          userId: user.id,
          userName: user.name || user.username,
          ...balance,
        });
      }
    }
    
    return balances.sort((a, b) => b.balance - a.balance); // Sort by balance descending
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getAllTasks(filters?: { assignedTo?: number; status?: string; assignedBy?: number }): Promise<Task[]> {
    let allTasks = Array.from(this.tasks.values());
    
    if (filters?.assignedTo) {
      allTasks = allTasks.filter(t => t.assignedTo === filters.assignedTo);
    }
    
    if (filters?.status) {
      allTasks = allTasks.filter(t => t.status === filters.status);
    }
    
    if (filters?.assignedBy) {
      allTasks = allTasks.filter(t => t.assignedBy === filters.assignedBy);
    }
    
    return allTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentId++;
    const newTask: Task = {
      id,
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async updateTaskStatus(id: number, status: string): Promise<Task | undefined> {
    const result = await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  // WhatsApp message generation
  async generateWhatsAppMessage(template: string, items: any[]): Promise<string> {
    try {
      switch (template) {
        case 'low-stock':
          return this.generateLowStockMessage(items);
        case 'material-request':
          return this.generateMaterialRequestMessage(items);
        case 'price-comparison':
          return this.generatePriceComparisonMessage(items);
        case 'inventory-report':
          return this.generateInventoryReportMessage(items);
        case 'expense_report':
          return this.generateExpenseReportMessage(items);
        case 'inventory_update':
          return this.generateInventoryUpdateMessage(items);
        default:
          return `Generated WhatsApp message for ${items.length} items.`;
      }
    } catch (error) {
      console.error("WhatsApp message generation failed:", error);
      throw new Error("Failed to generate WhatsApp message");
    }
  }

  private generateLowStockMessage(products: any[]): string {
    const date = new Date().toLocaleDateString('en-IN');
    
    let message = `🚨 *Low Stock Alert* 🚨\n\n`;
    message += `📅 Date: ${date}\n\n`;
    message += `The following items need restocking:\n\n`;
    
    products.forEach((product, index) => {
      const currentStock = product.currentStock || product.stock || 0;
      const minStock = product.minStock || product.minimumStock || 0;
      message += `• *${product.name}*: ${currentStock}/${minStock} units\n`;
    });
    
    message += `\nPlease arrange for procurement immediately.\n\n`;
    message += `_Generated by Furnili MS_`;
    return message;
  }

  private generatePriceComparisonMessage(comparisons: any[]): string {
    const date = new Date().toLocaleDateString('en-IN');
    
    let message = `💰 *Price Comparison Report* 💰\n\n`;
    message += `📅 Date: ${date}\n\n`;
    message += `*Price Analysis:*\n\n`;
    
    comparisons.forEach((comp, index) => {
      message += `${index + 1}. *${comp.productName || comp.name}*\n`;
      if (comp.supplier1Price) message += `   Supplier 1: ₹${comp.supplier1Price.toLocaleString('en-IN')}\n`;
      if (comp.supplier2Price) message += `   Supplier 2: ₹${comp.supplier2Price.toLocaleString('en-IN')}\n`;
      if (comp.supplier3Price) message += `   Supplier 3: ₹${comp.supplier3Price.toLocaleString('en-IN')}\n`;
      message += `\n`;
    });
    
    message += `_Generated by Furnili MS_`;
    return message;
  }

  private generateInventoryReportMessage(products: any[]): string {
    const date = new Date().toLocaleDateString('en-IN');
    
    let message = `📊 *Inventory Report* 📊\n\n`;
    message += `📅 Date: ${date}\n\n`;
    message += `*Current Stock Status:*\n\n`;
    
    products.forEach((product, index) => {
      const currentStock = product.currentStock || product.stock || 0;
      const stockValue = (product.price || 0) * currentStock;
      message += `${index + 1}. *${product.name}*\n`;
      message += `   Stock: ${currentStock} ${product.unit || 'units'}\n`;
      message += `   Value: ₹${stockValue.toLocaleString('en-IN')}\n`;
      message += `\n`;
    });
    
    const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.currentStock || 0)), 0);
    message += `*Total Inventory Value: ₹${totalValue.toLocaleString('en-IN')}*\n\n`;
    message += `_Generated by Furnili MS_`;
    return message;
  }

  private generateExpenseReportMessage(expenses: any[]): string {
    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const date = new Date().toLocaleDateString('en-IN');
    
    let message = `💰 *Expense Report - ${date}*\n\n`;
    message += `📊 Total Expenses: ₹${total.toLocaleString('en-IN')}\n`;
    message += `📝 Number of Transactions: ${expenses.length}\n\n`;
    message += `*Details:*\n`;
    
    expenses.forEach((exp, index) => {
      message += `${index + 1}. ${exp.vendor || 'N/A'} - ₹${(exp.amount || 0).toLocaleString('en-IN')}\n`;
      if (exp.category) message += `   Category: ${exp.category}\n`;
    });
    
    message += `\n_Generated by Furnili MS_`;
    return message;
  }

  private generateMaterialRequestMessage(requests: any[]): string {
    const date = new Date().toLocaleDateString('en-IN');
    
    let message = `🔨 *Material Request - ${date}*\n\n`;
    message += `📦 Total Items: ${requests.length}\n\n`;
    message += `*Requested Items:*\n`;
    
    requests.forEach((req, index) => {
      message += `${index + 1}. ${req.name || req.description}\n`;
      if (req.quantity) message += `   Qty: ${req.quantity} ${req.unit || 'units'}\n`;
      if (req.priority) message += `   Priority: ${req.priority.toUpperCase()}\n`;
    });
    
    message += `\n_Generated by Furnili MS_`;
    return message;
  }

  private generateInventoryUpdateMessage(products: any[]): string {
    const date = new Date().toLocaleDateString('en-IN');
    
    let message = `📋 *Inventory Update - ${date}*\n\n`;
    message += `🏪 Products Updated: ${products.length}\n\n`;
    message += `*Stock Levels:*\n`;
    
    products.forEach((product, index) => {
      message += `${index + 1}. ${product.name}\n`;
      message += `   Stock: ${product.currentStock} units\n`;
      if (product.currentStock <= product.minStock) {
        message += `   ⚠️ LOW STOCK ALERT!\n`;
      }
    });
    
    message += `\n_Generated by Furnili MS_`;
    return message;
  }

  // Price Comparison operations
  async getAllPriceComparisons(productName?: string): Promise<PriceComparison[]> {
    let allComparisons = Array.from(this.priceComparisons.values());
    
    if (productName) {
      allComparisons = allComparisons.filter(p => 
        p.productName.toLowerCase().includes(productName.toLowerCase())
      );
    }
    
    return allComparisons
      .filter(p => p.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison> {
    const id = this.currentId++;
    const newComparison: PriceComparison = {
      id,
      ...comparison,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.priceComparisons.set(id, newComparison);
    return newComparison;
  }

  async updatePriceComparison(id: number, updates: Partial<InsertPriceComparison>): Promise<PriceComparison | undefined> {
    const comparison = this.priceComparisons.get(id);
    if (!comparison) return undefined;
    
    const updatedComparison: PriceComparison = {
      ...comparison,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.priceComparisons.set(id, updatedComparison);
    return updatedComparison;
  }

  async deletePriceComparison(id: number): Promise<boolean> {
    return this.priceComparisons.delete(id);
  }

  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const managerPassword = await bcrypt.hash("manager123", 10);
    const storekeepPassword = await bcrypt.hash("keeper123", 10);
    const userPassword = await bcrypt.hash("user123", 10);

    this.users.set(1, {
      id: 1,
      username: "admin",
      email: "admin@demo.com",
      password: adminPassword,
      name: "System Administrator",
      role: "admin",
      phone: "+91-9876543210",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    });

    this.users.set(2, {
      id: 2,
      username: "staff1",
      email: "staff1@demo.com",
      password: managerPassword,
      name: "John Staff Member",
      role: "staff",
      phone: "+91-9876543211",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    });

    this.users.set(3, {
      id: 3,
      username: "staff2",
      email: "staff2@demo.com",
      password: storekeepPassword,
      name: "Mike Staff Member",
      role: "staff",
      phone: "+91-9876543212",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    });

    this.users.set(4, {
      id: 4,
      username: "staff3",
      email: "staff3@demo.com",
      password: userPassword,
      name: "Sarah Staff Member",
      role: "staff",
      phone: "+91-9876543213",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
    });

    // Create sample products
    this.products.set(1, {
      id: 1,
      name: "Steel Rods - 12mm",
      category: "Construction Materials",
      brand: "Tata Steel",
      size: "12mm diameter",
      thickness: "12mm",
      sku: "STL-12MM-001",
      pricePerUnit: 450.00,
      currentStock: 15,
      minStock: 50,
      unit: "pieces",
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.products.set(2, {
      id: 2,
      name: "Cement - OPC 53",
      category: "Cement & Concrete",
      brand: "UltraTech",
      size: "50kg bags",
      thickness: null,
      sku: "CEM-OPC53-001",
      pricePerUnit: 380.00,
      currentStock: 8,
      minStock: 25,
      unit: "bags",
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.products.set(3, {
      id: 3,
      name: "PVC Pipes - 4 inch",
      category: "Plumbing Supplies",
      brand: "Supreme",
      size: "4 inch diameter",
      thickness: "4mm",
      sku: "PVC-4IN-001",
      pricePerUnit: 180.00,
      currentStock: 125,
      minStock: 50,
      unit: "meters",
      imageUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create default categories
    this.categories.set(1, {
      id: 1,
      name: "Construction Materials",
      description: "Basic construction materials like cement, steel, bricks",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(2, {
      id: 2,
      name: "Electrical Supplies",
      description: "Electrical components, wires, switches, fixtures",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(3, {
      id: 3,
      name: "Plumbing Supplies",
      description: "Pipes, fittings, valves, pumps",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(4, {
      id: 4,
      name: "Tools & Equipment",
      description: "Hand tools, power tools, machinery",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(5, {
      id: 5,
      name: "Hardware & Fasteners",
      description: "Bolts, screws, nails, hinges, locks",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(6, {
      id: 6,
      name: "Safety Equipment",
      description: "Safety gear, protective equipment, first aid",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(7, {
      id: 7,
      name: "Cement & Concrete",
      description: "Different types of cement, concrete mixes, additives",
      isActive: true,
      createdAt: new Date(),
    });

    this.categories.set(8, {
      id: 8,
      name: "Steel & Metal",
      description: "Steel bars, sheets, pipes, metal fabrication materials",
      isActive: true,
      createdAt: new Date(),
    });

    this.currentId = 10;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentId++;
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser: User = {
      ...user,
      id,
      password: hashedPassword,
      createdAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    if (updates.password) {
      updatedUser.password = await bcrypt.hash(updates.password, 10);
    }
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.isActive);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentId++;
    const newCategory: Category = {
      ...category,
      id,
      createdAt: new Date(),
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;

    const updatedCategory = { ...category, ...updates };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const category = this.categories.get(id);
    if (!category) return false;
    
    // Soft delete by setting isActive to false
    category.isActive = false;
    this.categories.set(id, category);
    return true;
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(c => c.isActive);
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(c => c.name === name && c.isActive);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.currentId++;
    const newClient: Client = {
      ...client,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...updates, updatedAt: new Date() };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client) return false;
    
    // Soft delete by setting isActive to false
    client.isActive = false;
    this.clients.set(id, client);
    return true;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getAllProducts(filters?: {
    search?: string;
    category?: string;
    stockStatus?: string;
  }): Promise<ProductWithStock[]> {
    let products = Array.from(this.products.values());

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.brand?.toLowerCase().includes(search)
      );
    }

    if (filters?.category) {
      products = products.filter(p => p.category === filters.category);
    }

    const productsWithStock: ProductWithStock[] = products.map(p => {
      let stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
      if (p.currentStock === 0) {
        stockStatus = 'out-of-stock';
      } else if (p.currentStock <= p.minStock) {
        stockStatus = 'low-stock';
      } else {
        stockStatus = 'in-stock';
      }

      return { ...p, stockStatus };
    });

    if (filters?.stockStatus) {
      return productsWithStock.filter(p => p.stockStatus === filters.stockStatus);
    }

    return productsWithStock;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const newProduct: Product = {
      ...product,
      id,
      sku: product.sku || `PRD-${id.toString().padStart(4, '0')}`,
      createdAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async updateProductStock(
    id: number,
    newStock: number,
    movementType: string,
    reference?: string,
    performedBy: number = 1
  ): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) return false;

    const previousStock = product.currentStock;
    const updatedProduct = { ...product, currentStock: newStock };
    this.products.set(id, updatedProduct);

    // Record stock movement
    const movement: StockMovement = {
      id: this.currentId++,
      productId: id,
      movementType,
      quantity: Math.abs(newStock - previousStock),
      previousStock,
      newStock,
      reference,
      performedBy,
      createdAt: new Date(),
    };

    const productMovements = this.stockMovements.get(id) || [];
    productMovements.push(movement);
    this.stockMovements.set(id, productMovements);

    return true;
  }

  async getLowStockProducts(): Promise<ProductWithStock[]> {
    return this.getAllProducts({ stockStatus: 'low-stock' });
  }

  // Material request operations
  async getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined> {
    const request = this.materialRequests.get(id);
    if (!request) return undefined;

    const items = this.requestItems.get(id) || [];
    const requestedByUser = await this.getUser(request.requestedBy);
    const approvedByUser = request.approvedBy ? await this.getUser(request.approvedBy) : undefined;
    const issuedByUser = request.issuedBy ? await this.getUser(request.issuedBy) : undefined;

    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await this.getProduct(item.productId);
        return { ...item, product: product! };
      })
    );

    return {
      ...request,
      items: itemsWithProducts,
      requestedByUser: { name: requestedByUser!.name, email: requestedByUser!.email },
      approvedByUser: approvedByUser ? { name: approvedByUser.name, email: approvedByUser.email } : undefined,
      issuedByUser: issuedByUser ? { name: issuedByUser.name, email: issuedByUser.email } : undefined,
    };
  }

  async getAllMaterialRequests(filters?: {
    status?: string;
    clientName?: string;
    requestedBy?: number;
  }): Promise<MaterialRequestWithItems[]> {
    let requests = Array.from(this.materialRequests.values());

    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }

    if (filters?.clientName) {
      requests = requests.filter(r => 
        r.clientName.toLowerCase().includes(filters.clientName!.toLowerCase())
      );
    }

    if (filters?.requestedBy) {
      requests = requests.filter(r => r.requestedBy === filters.requestedBy);
    }

    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const fullRequest = await this.getMaterialRequest(request.id);
        return fullRequest!;
      })
    );

    return requestsWithItems.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createMaterialRequest(
    request: InsertMaterialRequest,
    items: InsertRequestItem[]
  ): Promise<MaterialRequest> {
    const id = this.currentId++;
    
    // Enrich items with product prices if not provided
    const enrichedItems = items.map((item, index) => {
      const product = this.products.get(item.productId);
      const unitPrice = item.unitPrice || (product?.pricePerUnit || 0);
      const totalPrice = item.totalPrice || (unitPrice * item.requestedQuantity);
      
      return {
        id: this.currentId++,
        requestId: id,
        productId: item.productId,
        requestedQuantity: item.requestedQuantity,
        approvedQuantity: null,
        unitPrice,
        totalPrice,
      };
    });
    
    const totalValue = enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const newRequest: MaterialRequest = {
      ...request,
      id,
      totalValue,
      status: request.status || "pending",
      priority: request.priority || "medium",
      approvedBy: null,
      approvedAt: null,
      issuedBy: null,
      issuedAt: null,
      createdAt: new Date(),
    };

    this.materialRequests.set(id, newRequest);
    this.requestItems.set(id, enrichedItems);

    return newRequest;
  }

  async updateMaterialRequestStatus(
    id: number,
    status: string,
    userId: number
  ): Promise<MaterialRequest | undefined> {
    const request = this.materialRequests.get(id);
    if (!request) return undefined;

    const updates: Partial<MaterialRequest> = { status };
    
    if (status === 'approved') {
      updates.approvedBy = userId;
      updates.approvedAt = new Date();
    } else if (status === 'issued') {
      updates.issuedBy = userId;
      updates.issuedAt = new Date();
    }

    const updatedRequest = { ...request, ...updates };
    this.materialRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async deleteMaterialRequest(id: number): Promise<boolean> {
    const deleted = this.materialRequests.delete(id);
    this.requestItems.delete(id);
    return deleted;
  }

  // BOQ operations
  async getBOQUpload(id: number): Promise<BOQUpload | undefined> {
    return this.boqUploads.get(id);
  }

  async getAllBOQUploads(uploadedBy?: number): Promise<BOQUpload[]> {
    let uploads = Array.from(this.boqUploads.values());
    
    if (uploadedBy) {
      uploads = uploads.filter(b => b.uploadedBy === uploadedBy);
    }

    return uploads.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createBOQUpload(boq: InsertBOQUpload): Promise<BOQUpload> {
    const id = this.currentId++;
    const newBOQ: BOQUpload = {
      ...boq,
      id,
      createdAt: new Date(),
    };
    this.boqUploads.set(id, newBOQ);
    return newBOQ;
  }

  async updateBOQUpload(
    id: number,
    updates: Partial<InsertBOQUpload>
  ): Promise<BOQUpload | undefined> {
    const boq = this.boqUploads.get(id);
    if (!boq) return undefined;

    const updatedBOQ = { ...boq, ...updates };
    this.boqUploads.set(id, updatedBOQ);
    return updatedBOQ;
  }

  // Stock movement operations
  async getStockMovements(productId?: number): Promise<StockMovement[]> {
    if (productId) {
      return this.stockMovements.get(productId) || [];
    }

    const allMovements: StockMovement[] = [];
    this.stockMovements.forEach(movements => {
      allMovements.push(...movements);
    });

    return allMovements.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const id = this.currentId++;
    const newMovement: StockMovement = {
      ...movement,
      id,
      createdAt: new Date(),
    };

    const productMovements = this.stockMovements.get(movement.productId) || [];
    productMovements.push(newMovement);
    this.stockMovements.set(movement.productId, productMovements);

    return newMovement;
  }

  // Dashboard/Analytics
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
    const lowStockProducts = await this.getLowStockProducts();
    
    const pendingRequests = allRequests.filter(r => r.status === 'pending');
    const recentRequests = allRequests.slice(0, 5);
    
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.currentStock), 0);

    return {
      totalProducts: allProducts.length,
      pendingRequests: pendingRequests.length,
      lowStockItems: lowStockProducts.length,
      totalValue,
      recentRequests,
      lowStockProducts: lowStockProducts.slice(0, 5).map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        currentStock: product.currentStock,
        minStock: product.minStock,
        stockStatus: product.currentStock <= product.minStock ? 'low-stock' : 'in-stock'
      })),
    };
  }

  // Payroll operations
  async getAllPayrolls(month?: number, year?: number, userId?: number): Promise<Payroll[]> {
    try {
      console.error("=== PAYROLL DEBUG ===");
      console.error("Fetching payroll with filters:", { month, year, userId });
      
      // First try without any filters to see if we get any data
      const allRecords = await db.select().from(payroll);
      console.error("Total payroll records in DB:", allRecords.length);
      
      if (allRecords.length > 0) {
        console.error("Sample record:", allRecords[0]);
      }
      
      let query = db.select().from(payroll);
      
      if (month !== undefined || year !== undefined || userId !== undefined) {
        const conditions = [];
        if (month !== undefined) conditions.push(eq(payroll.month, month));
        if (year !== undefined) conditions.push(eq(payroll.year, year));
        if (userId !== undefined) conditions.push(eq(payroll.userId, userId));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      const results = await query;
      console.error("Filtered payroll query results:", results.length, "records found");
      console.error("=== END PAYROLL DEBUG ===");
      return results;
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      // Fall back to in-memory storage if database fails
      const allPayroll = Array.from(this.payroll.values());
      
      return allPayroll.filter(payroll => {
        if (month !== undefined && payroll.month !== month) return false;
        if (year !== undefined && payroll.year !== year) return false;
        if (userId !== undefined && payroll.userId !== userId) return false;
        return true;
      });
    }
  }

  async getAllPayroll(filters?: { month?: number; year?: number; status?: string }): Promise<Payroll[]> {
    const allPayroll = Array.from(this.payroll.values());
    
    if (!filters) return allPayroll;

    return allPayroll.filter(payroll => {
      if (filters.month !== undefined && payroll.month !== filters.month) return false;
      if (filters.year !== undefined && payroll.year !== filters.year) return false;
      if (filters.status && payroll.status !== filters.status) return false;
      return true;
    });
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const id = this.currentId++;
    const payroll: Payroll = {
      id,
      userId: payrollData.userId,
      month: payrollData.month,
      year: payrollData.year,
      basicSalary: payrollData.basicSalary,
      allowances: payrollData.allowances || 0,
      overtimePay: payrollData.overtimePay || 0,
      bonus: payrollData.bonus || 0,
      deductions: payrollData.deductions || 0,
      netSalary: payrollData.netSalary,
      totalWorkingDays: payrollData.totalWorkingDays || 30,
      actualWorkingDays: payrollData.actualWorkingDays,
      totalHours: payrollData.totalHours || 0,
      overtimeHours: payrollData.overtimeHours || 0,
      leaveDays: payrollData.leaveDays || 0,
      paySlipUrl: payrollData.paySlipUrl || null,
      status: payrollData.status || "draft",
      processedBy: payrollData.processedBy || null,
      processedAt: payrollData.processedAt || null,
      createdAt: new Date(),
    };
    this.payroll.set(id, payroll);
    return payroll;
  }

  async updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    try {
      // Get existing payroll from database
      const existingPayroll = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
      if (!existingPayroll[0]) return undefined;

      const current = existingPayroll[0];
      
      // If basic salary is being updated, recalculate net salary
      if (updates.basicSalary !== undefined && updates.basicSalary !== current.basicSalary) {
        const totalDaysInMonth = current.totalWorkingDays || 31; // Use stored total days or default
        const actualWorkingDays = current.actualWorkingDays || 0;
        
        // Recalculate net salary: Basic salary ÷ total days × working days  
        updates.netSalary = Math.round((updates.basicSalary / totalDaysInMonth) * actualWorkingDays);
      }

      // Update in database
      const updated = await db.update(payroll)
        .set(updates)
        .where(eq(payroll.id, id))
        .returning();
      
      return updated[0];
    } catch (error) {
      console.error("Error updating payroll:", error);
      // Fallback to in-memory storage
      const payrollRecord = this.payroll.get(id);
      if (!payrollRecord) return undefined;

      const updatedPayroll = { ...payrollRecord, ...updates };
      this.payroll.set(id, updatedPayroll);
      return updatedPayroll;
    }
  }

  async generatePayroll(userId: number, month: number, year: number): Promise<Payroll> {
    // Check if payroll already exists
    const existingPayroll = Array.from(this.payroll.values()).find(
      p => p.userId === userId && p.month === month && p.year === year
    );
    
    if (existingPayroll) {
      return existingPayroll;
    }

    // Get user details
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate attendance for the month - simplified version
    const allAttendance = Array.from(this.attendance.values()).filter(a => 
      a.userId === userId && 
      new Date(a.date).getMonth() + 1 === month && 
      new Date(a.date).getFullYear() === year
    );
    
    const presentDays = allAttendance.filter(a => a.status === 'present').length;
    const totalHours = allAttendance.reduce((sum, a) => sum + (a.workingHours || 8), 0);
    const overtimeHours = allAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const absentDays = allAttendance.filter(a => a.status === 'absent').length;
    
    // Basic salary from user profile or default
    const basicSalary = user.basicSalary || 25000;
    const allowances = user.allowances || 0;
    
    // Calculate working days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalWorkingDays = daysInMonth - Math.floor(daysInMonth / 7) * 2; // Approximate working days (excluding weekends)
    
    // Calculate salary based on attendance
    const dailySalary = basicSalary / totalWorkingDays;
    const earnedSalary = dailySalary * presentDays;
    
    // Calculate overtime pay (if any)
    const overtimePayAmount = overtimeHours * 50; // ₹50 per hour overtime
    
    // Basic deductions (can be enhanced later)
    const deductions = earnedSalary * 0.12; // 12% for PF, ESI, etc.
    
    const netSalary = earnedSalary + allowances + overtimePayAmount - deductions;

    const payrollData: InsertPayroll = {
      userId,
      month,
      year,
      basicSalary,
      allowances,
      overtimePay: overtimePayAmount,
      bonus: 0,
      deductions,
      netSalary,
      totalWorkingDays,
      actualWorkingDays: presentDays,
      totalHours,
      overtimeHours,
      leaveDays: absentDays,
      status: "generated",
    };

    return this.createPayroll(payrollData);
  }

  async processPayroll(id: number, processedBy: number): Promise<Payroll | undefined> {
    const payroll = this.payroll.get(id);
    if (!payroll) return undefined;

    const updatedPayroll = {
      ...payroll,
      status: "paid" as const,
      processedBy,
      processedAt: new Date(),
    };

    this.payroll.set(id, updatedPayroll);
    return updatedPayroll;
  }
}

import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";

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
      // Get the next available employee number
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
    return db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

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

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true));
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
    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  async getDashboardStats(): Promise<{
    totalProducts: number;
    pendingRequests: number;
    lowStockItems: number;
    totalValue: number;
    recentRequests: MaterialRequestWithItems[];
    lowStockProducts: ProductWithStock[];
  }> {
    const allProducts = await this.getAllProducts();
    const allRequests = await this.getAllMaterialRequests();
    
    const lowStockProducts = allProducts.filter(p => p.currentStock <= p.minStock);
    const pendingRequests = allRequests.filter(r => r.status === 'pending');
    const totalValue = allProducts.reduce((sum, p) => sum + (p.pricePerUnit * p.currentStock), 0);

    return {
      totalProducts: allProducts.length,
      pendingRequests: pendingRequests.length,
      lowStockItems: lowStockProducts.length,
      totalValue,
      recentRequests: allRequests.slice(0, 5),
      lowStockProducts: lowStockProducts.slice(0, 5).map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        currentStock: product.currentStock,
        minStock: product.minStock,
        stockStatus: product.currentStock <= product.minStock ? 'low-stock' : 'in-stock'
      })),
    };
  }

  // Material Request operations
  async getAllMaterialRequests(): Promise<MaterialRequestWithItems[]> {
    const requests = await db.select().from(materialRequests);
    const requestsWithItems = await Promise.all(requests.map(async (request) => {
      const items = await db.select().from(requestItems).where(eq(requestItems.requestId, request.id));
      return { ...request, items };
    }));
    return requestsWithItems;
  }

  async createMaterialRequest(request: InsertMaterialRequest): Promise<MaterialRequest> {
    const result = await db.insert(materialRequests).values(request).returning();
    return result[0];
  }

  // Stub implementations for other methods (can be implemented as needed)
  async getClient(id: number): Promise<Client | undefined> { return undefined; }
  async getAllClients(): Promise<Client[]> { return []; }
  async getClientByName(name: string): Promise<Client | undefined> { return undefined; }
  async createClient(client: InsertClient): Promise<Client> { throw new Error("Not implemented"); }
  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> { return undefined; }
  async deleteClient(id: number): Promise<boolean> { return false; }
  // Enhanced Attendance operations
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
    const checkInTime = new Date(attendanceRecord[0].checkInTime!);
    const workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    const overtimeHours = workingHours > 8 ? workingHours - 8 : 0;
    
    const result = await db.update(attendance)
      .set({
        checkOutTime,
        workingHours,
        overtimeHours,
        checkOutBy: checkOutBy || null,
        updatedAt: new Date(),
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
    const result = await db.update(attendance)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
    return result[0];
  }

  async getUserAttendance(userId: number, month?: number, year?: number): Promise<Attendance[]> {
    let query = db.select().from(attendance).where(eq(attendance.userId, userId));
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query = query.where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      )) as any;
    }
    
    return query.orderBy(desc(attendance.date));
  }

  async getAllAttendance(filters?: { userId?: number; date?: string; month?: number; year?: number }): Promise<Attendance[]> {
    let query = db.select().from(attendance);
    
    if (filters?.userId) {
      query = query.where(eq(attendance.userId, filters.userId));
    }
    
    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
      query = query.where(and(
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      )) as any;
    }
    
    return query.orderBy(desc(attendance.date));
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return db.select().from(attendance)
      .where(and(
        gte(attendance.date, startOfDay),
        lte(attendance.date, endOfDay)
      ))
      .orderBy(desc(attendance.checkInTime));
  }

  // Helper function to calculate working days (excluding Sundays)
  private calculateWorkingDaysInMonth(month: number, year: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month - 1, day);
      if (currentDay.getDay() !== 0) { // Not Sunday (0 = Sunday)
        workingDays++;
      }
    }
    
    return workingDays;
  }

  async getAttendanceStats(userId?: number, month?: number, year?: number): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    totalHours: number;
    overtimeHours: number;
  }> {
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    
    let query = db.select().from(attendance);
    
    if (userId) {
      query = query.where(eq(attendance.userId, userId));
    }
    
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    query = query.where(and(
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    )) as any;
    
    const records = await query;
    
    // Calculate working days (excluding Sundays) instead of total calendar days
    const totalDays = this.calculateWorkingDaysInMonth(currentMonth, currentYear);
    const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = totalDays - presentDays;
    const totalHours = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const overtimeHours = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    
    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      overtimeHours,
    };
  }

  async bulkUpdateMonthlyAttendance(userId: number, month: number, year: number, attendanceData: any[]): Promise<Attendance[]> {
    const results: Attendance[] = [];
    
    for (const dayData of attendanceData) {
      try {
        // Parse the date string properly
        const dateStr = dayData.date; // Expected format: "2025-07-24"
        const parsedDate = new Date(dateStr + 'T00:00:00.000Z');
        
        if (isNaN(parsedDate.getTime())) {
          console.error(`Invalid date format: ${dateStr}`);
          continue;
        }
        
        // Check if attendance record exists for this date
        const existing = await db.select().from(attendance)
          .where(and(
            eq(attendance.userId, userId),
            sql`DATE(${attendance.date}) = DATE(${parsedDate.toISOString()})`
          ))
          .limit(1);
        
        if (existing[0]) {
          // Update existing record
          const updated = await db.update(attendance)
            .set({
              status: dayData.status,
              hoursWorked: this.getHoursForStatus(dayData.status),
              notes: dayData.notes || null,
              isManualEntry: true,
              updatedAt: new Date(),
            })
            .where(eq(attendance.id, existing[0].id))
            .returning();
          
          if (updated[0]) results.push(updated[0]);
        } else {
          // Create new record with proper date handling
          const checkInTime = dayData.status === 'present' || dayData.status === 'late' ? 
            new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 9, 0, 0) : null;
          const checkOutTime = dayData.status === 'present' || dayData.status === 'late' || dayData.status === 'half_day' ? 
            new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 18, 0, 0) : null;
          
          const newRecord = await db.insert(attendance).values({
            userId,
            date: parsedDate,
            checkInTime,
            checkOutTime,
            hoursWorked: this.getHoursForStatus(dayData.status),
            overtimeHours: 0,
            status: dayData.status,
            leaveType: dayData.status === 'on_leave' ? 'sick' : null,
            checkInBy: null,
            checkOutBy: null,
            location: null,
            notes: dayData.notes || null,
            isManualEntry: true,
          }).returning();
          
          if (newRecord[0]) results.push(newRecord[0]);
        }
      } catch (error) {
        console.error(`Error processing attendance for date ${dayData.date}:`, error);
      }
    }
    
    // After updating attendance, automatically regenerate payroll for the affected month
    try {
      console.log(`Auto-regenerating payroll for user ${userId}, month ${month}, year ${year}`);
      await this.generatePayroll(userId, month, year);
    } catch (payrollError) {
      console.error('Error auto-regenerating payroll:', payrollError);
      // Don't fail the attendance update if payroll generation fails
    }
    
    return results;
  }

  private getHoursForStatus(status: string): number {
    switch (status) {
      case 'present': return 8;
      case 'half_day': return 4;
      case 'late': return 7.5;
      case 'absent': return 0;
      case 'on_leave': return 0;
      default: return 0;
    }
  }

  async generatePayroll(userId: number, month: number, year: number): Promise<Payroll> {
    // Get user details first to access salary
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendanceRecords = await db.select().from(attendance)
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ));
    
    // Calculate attendance details
    const presentDays = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
    const halfDays = attendanceRecords.filter(a => a.status === 'half_day').length;
    const absentDays = attendanceRecords.filter(a => a.status === 'absent').length;
    
    // Calculate working days: present + (half days × 0.5)
    const actualWorkingDays = presentDays + (halfDays * 0.5);
    
    // Calculate working days in month (excluding Sundays)
    const totalDaysInMonth = this.calculateWorkingDaysInMonth(month, year);
    
    // User's basic salary from profile (fallback to default)
    const basicSalary = user.basicSalary || 25000;
    
    // Formula: Basic salary ÷ total days × working days
    // Sundays are paid holidays by default (no deduction for Sundays)
    const netSalary = Math.round((basicSalary / totalDaysInMonth) * actualWorkingDays);

    const payrollData: InsertPayroll = {
      userId,
      month,
      year,
      basicSalary,
      allowances: 0, // No additional allowances
      overtimePay: 0, // Remove overtime as requested
      bonus: 0,
      deductions: 0, // No deductions for now
      netSalary,
      totalWorkingDays: totalDaysInMonth, // Total calendar days
      actualWorkingDays, // Actual working days (including 0.5 for half days)
      totalHours: presentDays * 8 + halfDays * 4, // Calculate total hours
      overtimeHours: 0, // Remove overtime
      leaveDays: absentDays,
      status: "generated",
    };

    // Check if payroll already exists and update, otherwise create new
    const existingPayroll = await db.select().from(payroll)
      .where(and(
        eq(payroll.userId, userId),
        eq(payroll.month, month),
        eq(payroll.year, year)
      )).limit(1);
    
    if (existingPayroll[0]) {
      // Update existing payroll with new calculations
      const updated = await db.update(payroll)
        .set(payrollData)
        .where(eq(payroll.id, existingPayroll[0].id))
        .returning();
      return updated[0];
    } else {
      // Create new payroll record
      const result = await db.insert(payroll).values(payrollData).returning();
      return result[0];
    }
  }

  async getPettyCashStats(): Promise<{
    totalExpenses: number;
    totalIncome: number;
    balance: number;
    currentMonthExpenses: number;
  }> {
    const allExpenses = await db.select().from(pettyCashExpenses);
    
    const totalExpenses = allExpenses
      .filter(e => e.status === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalIncome = allExpenses
      .filter(e => e.status === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthExpenses = allExpenses
      .filter(e => {
        const expenseDate = new Date(e.expenseDate);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear &&
               e.status === 'expense';
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      currentMonthExpenses,
    };
  }

  async getStaffUsers(): Promise<User[]> {
    return db.select().from(users).where(and(
      eq(users.isActive, true),
      sql`${users.role} != 'admin'`
    ));
  }
  async getPettyCashExpense(id: number): Promise<PettyCashExpense | undefined> {
    const result = await db.select().from(pettyCashExpenses).where(eq(pettyCashExpenses.id, id)).limit(1);
    return result[0];
  }

  async getAllPettyCashExpenses(filters?: { status?: string; category?: string; addedBy?: number }): Promise<PettyCashExpense[]> {
    let query = db.select().from(pettyCashExpenses);
    
    if (filters?.status) {
      query = query.where(eq(pettyCashExpenses.status, filters.status as 'expense' | 'income'));
    }
    
    if (filters?.category) {
      query = query.where(eq(pettyCashExpenses.category, filters.category));
    }
    
    if (filters?.addedBy) {
      query = query.where(eq(pettyCashExpenses.addedBy, filters.addedBy));
    }
    
    const expenses = await query.orderBy(desc(pettyCashExpenses.createdAt));
    
    // Add user information
    const expensesWithUsers = await Promise.all(
      expenses.map(async (expense) => {
        const user = await this.getUser(expense.addedBy);
        return {
          ...expense,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      })
    );
    
    return expensesWithUsers;
  }

  async createPettyCashExpense(expense: InsertPettyCashExpense): Promise<PettyCashExpense> {
    const result = await db.insert(pettyCashExpenses).values(expense).returning();
    return result[0];
  }

  async updatePettyCashExpense(id: number, updates: Partial<InsertPettyCashExpense>): Promise<PettyCashExpense | undefined> {
    const result = await db.update(pettyCashExpenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pettyCashExpenses.id, id))
      .returning();
    return result[0];
  }

  async deletePettyCashExpense(id: number): Promise<boolean> {
    const result = await db.delete(pettyCashExpenses).where(eq(pettyCashExpenses.id, id));
    return true;
  }

  async getStaffBalance(userId: number): Promise<{ received: number; spent: number; balance: number }> {
    const expenses = await db.select().from(pettyCashExpenses)
      .where(eq(pettyCashExpenses.addedBy, userId));
    
    const received = expenses
      .filter(e => e.status === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const spent = expenses
      .filter(e => e.status === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      received,
      spent,
      balance: received - spent,
    };
  }

  async getAllStaffBalances(): Promise<Array<{ userId: number; userName: string; received: number; spent: number; balance: number }>> {
    const allUsers = await this.getAllUsers();
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

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async getAllTasks(filters?: { assignedTo?: number; status?: string; assignedBy?: number }): Promise<Task[]> {
    let query = db.select().from(tasks);
    
    if (filters?.assignedTo) {
      query = query.where(eq(tasks.assignedTo, filters.assignedTo));
    }
    
    if (filters?.status) {
      query = query.where(eq(tasks.status, filters.status));
    }
    
    if (filters?.assignedBy) {
      query = query.where(eq(tasks.assignedBy, filters.assignedBy));
    }
    
    const result = await query.orderBy(desc(tasks.createdAt));
    return result;
  }
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }
  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set({...updates, updatedAt: new Date()}).where(eq(tasks.id, id)).returning();
    return result[0];
  }
  
  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }
  async getPriceComparison(id: number): Promise<PriceComparison | undefined> { return undefined; }
  async getAllPriceComparisons(): Promise<PriceComparison[]> { return []; }
  async createPriceComparison(comparison: InsertPriceComparison): Promise<PriceComparison> { throw new Error("Not implemented"); }
  async updatePriceComparison(id: number, updates: Partial<InsertPriceComparison>): Promise<PriceComparison | undefined> { return undefined; }
  async deletePriceComparison(id: number): Promise<boolean> { return false; }
  // Payroll operations - Database implementations
  async getAllPayrolls(month?: number, year?: number, userId?: number): Promise<Payroll[]> {
    try {
      let query = db.select().from(payroll);
      
      if (month !== undefined || year !== undefined || userId !== undefined) {
        const conditions = [];
        if (month !== undefined) conditions.push(eq(payroll.month, month));
        if (year !== undefined) conditions.push(eq(payroll.year, year));
        if (userId !== undefined) conditions.push(eq(payroll.userId, userId));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }
      
      const results = await query.orderBy(desc(payroll.createdAt));
      return results;
    } catch (error) {
      console.error("Error fetching payroll records from database:", error);
      return [];
    }
  }

  async getPayroll(id: number): Promise<Payroll | undefined> {
    const result = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
    return result[0];
  }
  
  async getUserPayroll(userId: number, month?: number, year?: number): Promise<Payroll[]> {
    let query = db.select().from(payroll).where(eq(payroll.userId, userId));
    
    if (month !== undefined) {
      query = query.where(and(eq(payroll.userId, userId), eq(payroll.month, month)));
    }
    
    if (year !== undefined) {
      const conditions = [eq(payroll.userId, userId), eq(payroll.year, year)];
      if (month !== undefined) {
        conditions.push(eq(payroll.month, month));
      }
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(payroll.createdAt));
  }
  
  async getAllPayroll(month?: number, year?: number): Promise<Payroll[]> {
    // For backward compatibility, delegate to getAllPayrolls
    return this.getAllPayrolls(month, year);
  }
  
  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const result = await db.insert(payroll).values(payrollData).returning();
    return result[0];
  }
  
  async updatePayroll(id: number, updates: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const result = await db.update(payroll)
      .set(updates)
      .where(eq(payroll.id, id))
      .returning();
    return result[0];
  }
  
  async deletePayroll(id: number): Promise<boolean> {
    await db.delete(payroll).where(eq(payroll.id, id));
    return true;
  }

  async processPayroll(id: number, processedBy: number): Promise<Payroll | undefined> {
    const result = await db.update(payroll)
      .set({ 
        status: 'paid' as const,
        processedBy,
        processedAt: new Date()
      })
      .where(eq(payroll.id, id))
      .returning();
    return result[0];
  }
  async getLeave(id: number): Promise<Leave | undefined> { return undefined; }
  async getUserLeaves(userId: number): Promise<Leave[]> { return []; }
  async getAllLeaves(): Promise<Leave[]> { return []; }
  async createLeave(leave: InsertLeave): Promise<Leave> { throw new Error("Not implemented"); }
  async updateLeave(id: number, updates: Partial<InsertLeave>): Promise<Leave | undefined> { return undefined; }
  async deleteLeave(id: number): Promise<boolean> { return false; }
  async getMaterialRequest(id: number): Promise<MaterialRequestWithItems | undefined> { return undefined; }
  async createRequestItem(item: InsertRequestItem): Promise<RequestItem> { throw new Error("Not implemented"); }
  async updateMaterialRequest(id: number, updates: Partial<InsertMaterialRequest>): Promise<MaterialRequest | undefined> { return undefined; }
  async deleteMaterialRequest(id: number): Promise<boolean> { return false; }
  async getBOQUpload(id: number): Promise<BOQUpload | undefined> {
    const result = await db.select().from(boqUploads).where(eq(boqUploads.id, id));
    return result[0];
  }
  async getBOQsByClient(clientId: number): Promise<BOQUpload[]> { return []; }
  async getAllBOQUploads(): Promise<BOQUpload[]> {
    return await db.select().from(boqUploads).orderBy(desc(boqUploads.createdAt));
  }
  async createBOQUpload(boq: InsertBOQUpload): Promise<BOQUpload> {
    const result = await db.insert(boqUploads).values(boq).returning();
    return result[0];
  }
  async updateBOQUpload(id: number, updates: Partial<InsertBOQUpload>): Promise<BOQUpload | undefined> {
    const result = await db.update(boqUploads).set(updates).where(eq(boqUploads.id, id)).returning();
    return result[0];
  }
  async deleteBOQUpload(id: number): Promise<boolean> { return false; }
  async getStockMovements(productId: number): Promise<StockMovement[]> { return []; }
  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> { throw new Error("Not implemented"); }
  async updateStock(productId: number, quantity: number, type: 'in' | 'out', reason: string): Promise<void> {}

  // Dashboard specific methods
  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
    
    const result = await db.select({
      id: attendance.id,
      userId: attendance.userId,
      date: attendance.date,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workingHours: attendance.workingHours,
      overtimeHours: attendance.overtimeHours,
      status: attendance.status,
      leaveType: attendance.leaveType,
      checkInBy: attendance.checkInBy,
      checkOutBy: attendance.checkOutBy,
      location: attendance.location,
      notes: attendance.notes,
      isManualEntry: attendance.isManualEntry,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    }).from(attendance)
      .where(and(
        gte(attendance.date, startOfDay),
        lte(attendance.date, endOfDay)
      ));
    
    return result;
  }

  async getMonthlyExpenses(month: number, year: number): Promise<number> {
    try {
      const result = await db.select({
        totalExpenses: sql<number>`COALESCE(SUM(amount), 0)`
      }).from(pettyCashExpenses)
        .where(sql`EXTRACT(MONTH FROM expense_date) = ${month} AND EXTRACT(YEAR FROM expense_date) = ${year}`);
      
      return Number(result[0]?.totalExpenses) || 0;
    } catch (error) {
      console.error('Error in getMonthlyExpenses:', error);
      return 0;
    }
  }

  // CRM Customer Operations
  async getCrmCustomer(id: number): Promise<CrmCustomer | undefined> {
    try {
      const result = await db.select().from(crmCustomers).where(eq(crmCustomers.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM customer:', error);
      return undefined;
    }
  }

  async getAllCrmCustomers(): Promise<CrmCustomer[]> {
    try {
      return await db.select().from(crmCustomers).orderBy(desc(crmCustomers.createdAt));
    } catch (error) {
      console.error('Error getting all CRM customers:', error);
      return [];
    }
  }

  async createCrmCustomer(customer: InsertCrmCustomer): Promise<CrmCustomer> {
    try {
      const result = await db.insert(crmCustomers).values(customer).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM customer:', error);
      throw error;
    }
  }

  async updateCrmCustomer(id: number, updates: Partial<InsertCrmCustomer>): Promise<CrmCustomer | undefined> {
    try {
      const result = await db.update(crmCustomers)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crmCustomers.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM customer:', error);
      return undefined;
    }
  }

  async deleteCrmCustomer(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmCustomers).where(eq(crmCustomers.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM customer:', error);
      return false;
    }
  }

  // CRM Lead Operations
  async getCrmLead(id: number): Promise<CrmLead | undefined> {
    try {
      const result = await db.select().from(crmLeads).where(eq(crmLeads.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM lead:', error);
      return undefined;
    }
  }

  async getAllCrmLeads(): Promise<CrmLead[]> {
    try {
      return await db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt));
    } catch (error) {
      console.error('Error getting all CRM leads:', error);
      return [];
    }
  }

  async createCrmLead(lead: InsertCrmLead): Promise<CrmLead> {
    try {
      const result = await db.insert(crmLeads).values(lead).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM lead:', error);
      throw error;
    }
  }

  async updateCrmLead(id: number, updates: Partial<InsertCrmLead>): Promise<CrmLead | undefined> {
    try {
      const result = await db.update(crmLeads)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crmLeads.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM lead:', error);
      return undefined;
    }
  }

  async deleteCrmLead(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmLeads).where(eq(crmLeads.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM lead:', error);
      return false;
    }
  }

  // CRM Deal Operations
  async getCrmDeal(id: number): Promise<CrmDeal | undefined> {
    try {
      const result = await db.select().from(crmDeals).where(eq(crmDeals.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM deal:', error);
      return undefined;
    }
  }

  async getAllCrmDeals(): Promise<CrmDeal[]> {
    try {
      return await db.select().from(crmDeals).orderBy(desc(crmDeals.createdAt));
    } catch (error) {
      console.error('Error getting all CRM deals:', error);
      return [];
    }
  }

  async createCrmDeal(deal: InsertCrmDeal): Promise<CrmDeal> {
    try {
      const result = await db.insert(crmDeals).values(deal).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM deal:', error);
      throw error;
    }
  }

  async updateCrmDeal(id: number, updates: Partial<InsertCrmDeal>): Promise<CrmDeal | undefined> {
    try {
      const result = await db.update(crmDeals)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crmDeals.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM deal:', error);
      return undefined;
    }
  }

  async deleteCrmDeal(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmDeals).where(eq(crmDeals.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM deal:', error);
      return false;
    }
  }

  // CRM Activity Operations
  async getCrmActivity(id: number): Promise<CrmActivity | undefined> {
    try {
      const result = await db.select().from(crmActivities).where(eq(crmActivities.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM activity:', error);
      return undefined;
    }
  }

  async getAllCrmActivities(relatedTo?: string, relatedId?: number): Promise<CrmActivity[]> {
    try {
      let query = db.select().from(crmActivities);
      
      if (relatedTo && relatedId) {
        query = query.where(and(
          eq(crmActivities.relatedTo, relatedTo),
          eq(crmActivities.relatedId, relatedId)
        ));
      }
      
      return await query.orderBy(desc(crmActivities.createdAt));
    } catch (error) {
      console.error('Error getting all CRM activities:', error);
      return [];
    }
  }

  async createCrmActivity(activity: InsertCrmActivity): Promise<CrmActivity> {
    try {
      const result = await db.insert(crmActivities).values(activity).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM activity:', error);
      throw error;
    }
  }

  async updateCrmActivity(id: number, updates: Partial<InsertCrmActivity>): Promise<CrmActivity | undefined> {
    try {
      const result = await db.update(crmActivities)
        .set(updates)
        .where(eq(crmActivities.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM activity:', error);
      return undefined;
    }
  }

  async deleteCrmActivity(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmActivities).where(eq(crmActivities.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM activity:', error);
      return false;
    }
  }

  // CRM Quotations Operations
  async getCrmQuotation(id: number): Promise<CrmQuotation | undefined> {
    try {
      const result = await db.select().from(crmQuotations).where(eq(crmQuotations.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM quotation:', error);
      return undefined;
    }
  }

  async getAllCrmQuotations(): Promise<CrmQuotation[]> {
    try {
      return await db.select().from(crmQuotations).orderBy(desc(crmQuotations.createdAt));
    } catch (error) {
      console.error('Error getting all CRM quotations:', error);
      return [];
    }
  }

  async createCrmQuotation(quotation: InsertCrmQuotation): Promise<CrmQuotation> {
    try {
      const result = await db.insert(crmQuotations).values(quotation).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM quotation:', error);
      throw error;
    }
  }

  async updateCrmQuotation(id: number, updates: Partial<InsertCrmQuotation>): Promise<CrmQuotation | undefined> {
    try {
      const result = await db.update(crmQuotations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crmQuotations.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM quotation:', error);
      return undefined;
    }
  }

  async deleteCrmQuotation(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmQuotations).where(eq(crmQuotations.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM quotation:', error);
      return false;
    }
  }

  // CRM Follow-ups Operations
  async getCrmFollowUp(id: number): Promise<CrmFollowUp | undefined> {
    try {
      const result = await db.select().from(crmFollowUps).where(eq(crmFollowUps.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM follow-up:', error);
      return undefined;
    }
  }

  async getAllCrmFollowUps(): Promise<CrmFollowUp[]> {
    try {
      return await db.select().from(crmFollowUps).orderBy(crmFollowUps.followUpDate);
    } catch (error) {
      console.error('Error getting all CRM follow-ups:', error);
      return [];
    }
  }

  async createCrmFollowUp(followUp: InsertCrmFollowUp): Promise<CrmFollowUp> {
    try {
      const result = await db.insert(crmFollowUps).values(followUp).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM follow-up:', error);
      throw error;
    }
  }

  async updateCrmFollowUp(id: number, updates: Partial<InsertCrmFollowUp>): Promise<CrmFollowUp | undefined> {
    try {
      const result = await db.update(crmFollowUps)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crmFollowUps.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM follow-up:', error);
      return undefined;
    }
  }

  async deleteCrmFollowUp(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmFollowUps).where(eq(crmFollowUps.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM follow-up:', error);
      return false;
    }
  }

  // CRM Site Visits Operations
  async getCrmSiteVisit(id: number): Promise<CrmSiteVisit | undefined> {
    try {
      const result = await db.select().from(crmSiteVisits).where(eq(crmSiteVisits.id, id));
      return result[0];
    } catch (error) {
      console.error('Error getting CRM site visit:', error);
      return undefined;
    }
  }

  async getAllCrmSiteVisits(): Promise<CrmSiteVisit[]> {
    try {
      return await db.select().from(crmSiteVisits).orderBy(crmSiteVisits.visitDate);
    } catch (error) {
      console.error('Error getting all CRM site visits:', error);
      return [];
    }
  }

  async createCrmSiteVisit(visit: InsertCrmSiteVisit): Promise<CrmSiteVisit> {
    try {
      const result = await db.insert(crmSiteVisits).values(visit).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating CRM site visit:', error);
      throw error;
    }
  }

  async updateCrmSiteVisit(id: number, updates: Partial<InsertCrmSiteVisit>): Promise<CrmSiteVisit | undefined> {
    try {
      const result = await db.update(crmSiteVisits)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(crmSiteVisits.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating CRM site visit:', error);
      return undefined;
    }
  }

  async deleteCrmSiteVisit(id: number): Promise<boolean> {
    try {
      const result = await db.delete(crmSiteVisits).where(eq(crmSiteVisits.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting CRM site visit:', error);
      return false;
    }
  }

  // CRM Stats
  async getCrmStats(): Promise<{
    totalCustomers: number;
    activeLeads: number;
    pipelineValue: number;
    conversionRate: number;
  }> {
    try {
      const [customers, leads, deals] = await Promise.all([
        db.select().from(crmCustomers),
        db.select().from(crmLeads),
        db.select().from(crmDeals)
      ]);

      const totalCustomers = customers.length;
      const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status || '')).length;
      const pipelineValue = deals
        .filter(d => !['closed-won', 'closed-lost'].includes(d.stage || ''))
        .reduce((sum, deal) => sum + (deal.value || 0), 0);
      
      const totalLeads = leads.length;
      const wonLeads = leads.filter(l => l.status === 'won').length;
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

      return {
        totalCustomers,
        activeLeads,
        pipelineValue,
        conversionRate
      };
    } catch (error) {
      console.error('Error getting CRM stats:', error);
      return {
        totalCustomers: 0,
        activeLeads: 0,
        pipelineValue: 0,
        conversionRate: 0
      };
    }
  }
}

export const storage = new DatabaseStorage();
