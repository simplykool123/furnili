import {
  users,
  products,
  materialRequests,
  requestItems,
  boqUploads,
  stockMovements,
  type User,
  type InsertUser,
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
  private products: Map<number, Product> = new Map();
  private materialRequests: Map<number, MaterialRequest> = new Map();
  private requestItems: Map<number, RequestItem[]> = new Map();
  private boqUploads: Map<number, BOQUpload> = new Map();
  private stockMovements: Map<number, StockMovement[]> = new Map();
  private currentId = 1;

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
      createdAt: new Date(),
    });

    this.users.set(2, {
      id: 2,
      username: "manager",
      email: "manager@demo.com",
      password: managerPassword,
      name: "John Manager",
      role: "manager",
      createdAt: new Date(),
    });

    this.users.set(3, {
      id: 3,
      username: "storekeeper",
      email: "keeper@demo.com",
      password: storekeepPassword,
      name: "Mike Storekeeper",
      role: "storekeeper",
      createdAt: new Date(),
    });

    this.users.set(4, {
      id: 4,
      username: "user",
      email: "user@demo.com",
      password: userPassword,
      name: "Sarah User",
      role: "user",
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
      price: 450.00,
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

    this.currentId = 5;
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
      lowStockProducts: lowStockProducts.slice(0, 5),
    };
  }
}

export const storage = new MemStorage();
