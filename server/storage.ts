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
  type MaterialRequestWithItems,
  type ProductWithStock,
  type BOQExtractedItem,
} from "@shared/schema";
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

  // Payroll operations
  getPayroll(id: number): Promise<Payroll | undefined>;
  getUserPayroll(userId: number, month?: number, year?: number): Promise<Payroll[]>;
  getAllPayroll(filters?: { month?: number; year?: number; status?: string }): Promise<Payroll[]>;
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
  getDashboardStats(userRole: string): Promise<{
    totalProducts: number;
    pendingRequests: number;
    lowStockItems: number;
    totalValue: number;
    recentRequests: MaterialRequestWithItems[];
    lowStockProducts: ProductWithStock[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private categories: Map<number, Category> = new Map();
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
      absentDays: workingDays - presentDays,
      totalHours,
      overtimeHours,
      holidays,
      workingDays,
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
      status: 'expense', // Default status
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
        const expenseDate = new Date(e.date);
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
      sku: "STL-12MM-001",
      pricePerUnit: 450.00,
      currentStock: 15,
      minStock: 50,
      unit: "pieces",
      imageUrl: null,
      createdAt: new Date(),
    });

    this.products.set(2, {
      id: 2,
      name: "Cement - OPC 53",
      category: "Cement & Concrete",
      brand: "UltraTech",
      size: "50kg bags",
      sku: "CEM-OPC53-001",
      price: 380.00,
      currentStock: 8,
      minStock: 25,
      unit: "bags",
      imageUrl: null,
      createdAt: new Date(),
    });

    this.products.set(3, {
      id: 3,
      name: "PVC Pipes - 4 inch",
      category: "Plumbing Supplies",
      brand: "Supreme",
      size: "4 inch diameter",
      sku: "PVC-4IN-001",
      price: 180.00,
      currentStock: 125,
      minStock: 50,
      unit: "meters",
      imageUrl: null,
      createdAt: new Date(),
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
    const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const newRequest: MaterialRequest = {
      ...request,
      id,
      totalValue,
      createdAt: new Date(),
    };

    this.materialRequests.set(id, newRequest);
    
    const requestItemsWithIds = items.map(item => ({ ...item, requestId: id }));
    this.requestItems.set(id, requestItemsWithIds);

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
}

export const storage = new MemStorage();
