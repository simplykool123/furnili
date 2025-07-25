import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // admin, staff, store_incharge
  phone: text("phone"),
  // Staff Management Fields
  aadharNumber: text("aadhar_number").unique(),
  employeeId: text("employee_id").unique(),
  department: text("department"),
  designation: text("designation"),
  joiningDate: timestamp("joining_date"),
  basicSalary: real("basic_salary").default(0),
  allowances: real("allowances").default(0), // HRA, DA, etc.
  profilePhotoUrl: text("profile_photo_url"),
  aadharCardUrl: text("aadhar_card_url"),
  documentsUrls: text("documents_urls").array().default([]), // Additional documents
  bankAccountNumber: text("bank_account_number"),
  ifscCode: text("ifsc_code"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyContactPhone: text("emergency_contact_phone"),
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

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Staff Attendance Table - Enhanced for Payroll
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(), // Date of attendance
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  workingHours: real("working_hours").default(0), // Calculated hours
  overtimeHours: real("overtime_hours").default(0), // Hours above 8
  status: text("status").notNull().default("present"), // present, absent, half_day, late, on_leave
  leaveType: text("leave_type"), // sick, casual, earned, emergency
  checkInBy: integer("check_in_by").references(() => users.id), // Admin who checked in
  checkOutBy: integer("check_out_by").references(() => users.id), // Admin who checked out
  location: text("location"), // Check-in location if needed
  notes: text("notes"),
  isManualEntry: boolean("is_manual_entry").default(false), // Admin manual entry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monthly Payroll Table
export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  basicSalary: real("basic_salary").notNull(),
  allowances: real("allowances").default(0),
  overtimePay: real("overtime_pay").default(0),
  bonus: real("bonus").default(0),
  deductions: real("deductions").default(0), // PF, ESI, tax, etc.
  netSalary: real("net_salary").notNull(),
  totalWorkingDays: integer("total_working_days").default(30),
  actualWorkingDays: real("actual_working_days").notNull(),
  totalHours: real("total_hours").default(0),
  overtimeHours: real("overtime_hours").default(0),
  leaveDays: integer("leave_days").default(0),
  paySlipUrl: text("pay_slip_url"), // Generated PDF
  status: text("status").notNull().default("draft"), // draft, processed, paid
  processedBy: integer("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave Management Table
export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leaveType: text("leave_type").notNull(), // sick, casual, earned, emergency, maternity
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  appliedAt: timestamp("applied_at").defaultNow(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  documentUrl: text("document_url"), // Medical certificate, etc.
});

// Petty Cash Expenses Table
export const pettyCashExpenses = pgTable("petty_cash_expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // food, transport, office_supplies, etc.
  amount: real("amount").notNull(),
  vendor: text("vendor"),
  description: text("description"),
  orderNo: text("order_no"), // Order No./Client Reference
  paidBy: integer("paid_by").references(() => users.id), // Staff member who paid
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
export const insertUserSchema = createInsertSchema(users, {
  joiningDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
}).omit({
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
  requestId: true, // This will be set by the server
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
  updatedAt: true,
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({
  id: true,
  appliedAt: true,
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

export const insertClientSchema = createInsertSchema(clients).omit({
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
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
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
