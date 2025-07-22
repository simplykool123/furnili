import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // admin, staff
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand"),
  size: text("size"),
  thickness: text("thickness"), // e.g., "12 mm", "6 mm", "16 mm"
  sku: text("sku").unique(),
  pricePerUnit: real("price_per_unit").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(10),
  unit: text("unit").notNull().default("pieces"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materialRequests = pgTable("material_requests", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  orderNumber: text("order_number").notNull(),
  requestedBy: integer("requested_by").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, issued, completed, rejected
  priority: text("priority").notNull().default("medium"), // high, medium, low
  boqReference: text("boq_reference"),
  remarks: text("remarks"),
  totalValue: real("total_value").notNull().default(0),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  issuedAt: timestamp("issued_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const requestItems = pgTable("request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => materialRequests.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  requestedQuantity: integer("requested_quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

export const boqUploads = pgTable("boq_uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  extractedData: jsonb("extracted_data"),
  projectName: text("project_name"),
  boqReference: text("boq_reference"),
  totalValue: real("total_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  movementType: text("movement_type").notNull(), // inward, outward, adjustment
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reference: text("reference"), // request ID, purchase order, etc.
  vendor: text("vendor"), // For inward movements
  costPerUnit: real("cost_per_unit"), // Purchase cost for inward movements
  totalCost: real("total_cost"), // Total cost for the movement
  notes: text("notes"),
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff Attendance Table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  workingHours: real("working_hours"), // Calculated hours
  status: text("status").notNull().default("checked_in"), // checked_in, checked_out
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Petty Cash Expenses Table
export const pettyCashExpenses = pgTable("petty_cash_expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // food, transport, office_supplies, etc.
  amount: real("amount").notNull(),
  vendor: text("vendor"),
  description: text("description"),
  receiptImageUrl: text("receipt_image_url"), // Google Pay screenshot
  extractedData: jsonb("extracted_data"), // OCR extracted data
  expenseDate: timestamp("expense_date").notNull(),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Management Table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // todo, in_progress, done
  priority: text("priority").notNull().default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  assignedTo: integer("assigned_to").references(() => users.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Price Comparison Table for Multiple Brands
export const priceComparisons = pgTable("price_comparisons", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  size: text("size"),
  thickness: text("thickness"),
  brand: text("brand").notNull(),
  price: real("price").notNull(),
  vendor: text("vendor"),
  imageUrl: text("image_url"),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialRequestSchema = createInsertSchema(materialRequests).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approvedAt: true,
  issuedBy: true,
  issuedAt: true,
});

export const insertRequestItemSchema = createInsertSchema(requestItems).omit({
  id: true,
});

export const insertBOQUploadSchema = createInsertSchema(boqUploads).omit({
  id: true,
  createdAt: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertPettyCashExpenseSchema = createInsertSchema(pettyCashExpenses).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceComparisonSchema = createInsertSchema(priceComparisons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type PettyCashExpense = typeof pettyCashExpenses.$inferSelect;
export type InsertPettyCashExpense = z.infer<typeof insertPettyCashExpenseSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type PriceComparison = typeof priceComparisons.$inferSelect;
export type InsertPriceComparison = z.infer<typeof insertPriceComparisonSchema>;
export type MaterialRequest = typeof materialRequests.$inferSelect;
export type InsertMaterialRequest = z.infer<typeof insertMaterialRequestSchema>;
export type RequestItem = typeof requestItems.$inferSelect;
export type InsertRequestItem = z.infer<typeof insertRequestItemSchema>;
export type BOQUpload = typeof boqUploads.$inferSelect;
export type InsertBOQUpload = z.infer<typeof insertBOQUploadSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

// Extended types for API responses
export type MaterialRequestWithItems = MaterialRequest & {
  items: (RequestItem & { product: Product })[];
  requestedByUser: { name: string; email: string };
  approvedByUser?: { name: string; email: string };
  issuedByUser?: { name: string; email: string };
};

export type ProductWithStock = Product & {
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
};

export type BOQExtractedItem = {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  matchedProductId?: number;
};
