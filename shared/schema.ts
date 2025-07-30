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
  aadharNumber: text("aadhar_number"),
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
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Management Tables - Updated for User Requirements
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Auto-generated: P-181, P-182, etc.
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  stage: text("stage").notNull().default("prospect"), // prospect, recce-done, design-in-progress, design-approved, estimate-given, client-approved, production, installation, handover, completed, on-hold, lost
  budget: real("budget").default(0),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  state: text("state"),
  city: text("city"),
  location: text("location"),
  pincode: text("pincode"),
  completionPercentage: integer("completion_percentage").default(0),
  notes: text("notes"),
  files: text("files").array().default([]), // File URLs/paths
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectLogs = pgTable("project_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  logType: text("log_type").notNull(), // activity, note, milestone, issue, update
  title: text("title").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id),
  attachments: text("attachments").array().default([]),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Tables
export const crmCustomers = pgTable("crm_customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  status: text("status").default("prospect"), // active, inactive, prospect
  totalOrders: integer("total_orders").default(0),
  totalValue: real("total_value").default(0),
  lastContact: timestamp("last_contact"),
  source: text("source"), // website, referral, cold call, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  status: text("status").default("new"), // new, contacted, qualified, proposal, won, lost
  source: text("source"), // website, referral, advertisement, etc.
  value: real("value").default(0), // potential deal value
  assignedTo: text("assigned_to"), // staff member
  notes: text("notes"),
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 3 CRM Modules - Robust Relational Schema
export const projectQuotes = pgTable("project_quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(), // QT-001, QT-002, etc.
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  totalAmount: real("total_amount").default(0),
  validUntil: timestamp("valid_until"),
  status: text("status").default("draft"), // draft, sent, approved, rejected, expired
  terms: text("terms"),
  items: jsonb("items").default([]), // Quote line items with quantities, rates
  createdBy: integer("created_by").references(() => users.id),
  sentAt: timestamp("sent_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectOrders = pgTable("project_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(), // PO-001, PO-002, etc.
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  vendorName: text("vendor_name").notNull(),
  vendorContact: text("vendor_contact"),
  vendorEmail: text("vendor_email"),
  vendorAddress: text("vendor_address"),
  orderType: text("order_type").default("material"), // material, service, equipment
  totalAmount: real("total_amount").default(0),
  paidAmount: real("paid_amount").default(0),
  status: text("status").default("pending"), // pending, confirmed, shipped, delivered, completed, cancelled
  expectedDelivery: timestamp("expected_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  items: jsonb("items").default([]), // Order items with quantities, rates, specifications
  paymentTerms: text("payment_terms"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectFinances = pgTable("project_finances", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  entryType: text("entry_type").notNull(), // income, expense, budget_allocation
  category: text("category").notNull(), // materials, labor, equipment, overhead, payment_received
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  transactionDate: timestamp("transaction_date").defaultNow(),
  paymentMethod: text("payment_method"), // cash, cheque, bank_transfer, upi
  referenceNumber: text("reference_number"), // Receipt/Invoice number
  approvedBy: integer("approved_by").references(() => users.id),
  notes: text("notes"),
  attachments: text("attachments").array().default([]),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"), // monthly, quarterly, yearly
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectManpower = pgTable("project_manpower", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  workerId: integer("worker_id").references(() => users.id), // Link to existing staff or external worker
  workerName: text("worker_name").notNull(), // For external workers not in users table
  role: text("role").notNull(), // supervisor, mason, helper, electrician, plumber, etc.
  skillLevel: text("skill_level").default("intermediate"), // beginner, intermediate, expert
  dailyRate: real("daily_rate").default(0),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  contactNumber: text("contact_number"),
  address: text("address"),
  aadharNumber: text("aadhar_number"),
  bankDetails: text("bank_details"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectAttendance = pgTable("project_attendance", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  manpowerId: integer("manpower_id").references(() => projectManpower.id).notNull(),
  attendanceDate: timestamp("attendance_date").defaultNow(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  hoursWorked: real("hours_worked").default(0),
  overtimeHours: real("overtime_hours").default(0),
  status: text("status").default("present"), // present, absent, half_day, late, overtime
  workDescription: text("work_description"),
  location: text("location"), // GPS coordinates or site location
  approvedBy: integer("approved_by").references(() => users.id),
  notes: text("notes"),
  photos: text("photos").array().default([]), // Work progress photos
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").default(0),
  mimeType: text("mime_type"),
  category: text("category").default("general"), // drawings, photos, documents, contracts, permits
  description: text("description"),
  comment: text("comment"), // New field for image comments
  uploadedBy: integer("uploaded_by").references(() => users.id),
  isPublic: boolean("is_public").default(false), // Client can view
  version: integer("version").default(1),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled, on_hold
  category: text("category").default("general"), // design, procurement, construction, inspection, documentation
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: real("estimated_hours").default(0),
  actualHours: real("actual_hours").default(0),
  dependencies: text("dependencies").array().default([]), // Task IDs that must be completed first
  attachments: text("attachments").array().default([]),
  comments: jsonb("comments").default([]), // Task comments and updates
  tags: text("tags").array().default([]),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"), // daily, weekly, monthly
  reminderDate: timestamp("reminder_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Moodboards table for advanced moodboard system
export const moodboards = pgTable("moodboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(), // comma-separated tags/keywords
  roomType: text("room_type").notNull(), // Living Room, Bedroom, Kitchen, etc.
  imageUrls: text("image_urls").array().default([]), // array of image URLs (external APIs or uploaded)
  imageData: jsonb("image_data"), // metadata for images (source, alt text, etc.)
  linkedProjectId: integer("linked_project_id").references(() => projects.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  sourceType: text("source_type").default("real_photos"), // real_photos, ai_generated
  aiPrompt: text("ai_prompt"), // for AI-generated moodboards
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmDeals = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  customerId: integer("customer_id").references(() => crmCustomers.id),
  customerName: text("customer_name"), // denormalized for easier queries
  value: real("value").notNull(),
  stage: text("stage").default("prospecting"), // prospecting, qualification, proposal, negotiation, closed-won, closed-lost
  probability: integer("probability").default(50), // 0-100%
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  assignedTo: text("assigned_to"), // staff member
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // call, email, meeting, note, task
  subject: text("subject").notNull(),
  description: text("description"),
  relatedTo: text("related_to"), // customer, lead, deal
  relatedId: integer("related_id"),
  assignedTo: text("assigned_to"),
  status: text("status").default("pending"), // pending, completed, cancelled
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmQuotations = pgTable("crm_quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  items: jsonb("items").default([]),
  subtotal: real("subtotal").default(0),
  discount: real("discount").default(0),
  gst: real("gst").default(18),
  totalAmount: real("total_amount").default(0),
  status: text("status").default("draft"), // draft, sent, accepted, rejected
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmFollowUps = pgTable("crm_followups", {
  id: serial("id").primaryKey(),
  leadCustomerName: text("lead_customer_name").notNull(),
  leadCustomerPhone: text("lead_customer_phone"),
  followUpDate: timestamp("follow_up_date").notNull(),
  followUpTime: text("follow_up_time"),
  method: text("method").default("call"), // call, visit, whatsapp, email
  staffAssigned: text("staff_assigned"),
  notes: text("notes"),
  status: text("status").default("pending"), // pending, completed, missed
  outcome: text("outcome"),
  nextFollowUp: timestamp("next_follow_up"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const crmSiteVisits = pgTable("crm_site_visits", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  address: text("address").notNull(),
  locationLink: text("location_link"),
  assignedTo: text("assigned_to"),
  visitDate: timestamp("visit_date").notNull(),
  visitTime: text("visit_time"),
  purpose: text("purpose"),
  status: text("status").default("scheduled"), // scheduled, in-progress, completed, cancelled
  outcome: text("outcome"),
  notes: text("notes"),
  followUpRequired: boolean("follow_up_required").default(false),
  nextVisitDate: timestamp("next_visit_date"),
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
  projectId: integer("project_id").references(() => projects.id).notNull(),
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

// Task Management Table - Enhanced for Phase 1
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id), // Link to project
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  estimatedHours: integer("estimated_hours").default(0),
  actualHours: integer("actual_hours").default(0),
  tags: text("tags").array().default([]), // For categorization
  attachments: text("attachments").array().default([]), // File attachments
  comments: text("comments"), // Latest comment/note
  assignedTo: integer("assigned_to").references(() => users.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  updatedBy: integer("updated_by").references(() => users.id), // Track who last updated
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

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  code: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export const insertProjectLogSchema = createInsertSchema(projectLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMoodboardSchema = createInsertSchema(moodboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// CRM Insert Schemas
export const insertCrmCustomerSchema = createInsertSchema(crmCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmActivitySchema = createInsertSchema(crmActivities).omit({
  id: true,
  createdAt: true,
});

export const insertCrmQuotationSchema = createInsertSchema(crmQuotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmFollowUpSchema = createInsertSchema(crmFollowUps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmSiteVisitSchema = createInsertSchema(crmSiteVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase 3 CRM Module Schemas
export const insertProjectQuoteSchema = createInsertSchema(projectQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectOrderSchema = createInsertSchema(projectOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectFinanceSchema = createInsertSchema(projectFinances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectManpowerSchema = createInsertSchema(projectManpower).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectAttendanceSchema = createInsertSchema(projectAttendance).omit({
  id: true,  
  createdAt: true,
  updatedAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
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
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectLog = typeof projectLogs.$inferSelect;
export type InsertProjectLog = z.infer<typeof insertProjectLogSchema>;
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

// CRM Types
export type CrmCustomer = typeof crmCustomers.$inferSelect;
export type InsertCrmCustomer = z.infer<typeof insertCrmCustomerSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type CrmActivity = typeof crmActivities.$inferSelect;  
export type InsertCrmActivity = z.infer<typeof insertCrmActivitySchema>;
export type CrmQuotation = typeof crmQuotations.$inferSelect;
export type InsertCrmQuotation = z.infer<typeof insertCrmQuotationSchema>;
export type CrmFollowUp = typeof crmFollowUps.$inferSelect;
export type InsertCrmFollowUp = z.infer<typeof insertCrmFollowUpSchema>;
export type CrmSiteVisit = typeof crmSiteVisits.$inferSelect;
export type InsertCrmSiteVisit = z.infer<typeof insertCrmSiteVisitSchema>;

// Phase 3 CRM Module Types
export type ProjectQuote = typeof projectQuotes.$inferSelect;
export type InsertProjectQuote = z.infer<typeof insertProjectQuoteSchema>;
export type ProjectOrder = typeof projectOrders.$inferSelect;
export type InsertProjectOrder = z.infer<typeof insertProjectOrderSchema>;
export type ProjectFinance = typeof projectFinances.$inferSelect;
export type InsertProjectFinance = z.infer<typeof insertProjectFinanceSchema>;
export type ProjectManpower = typeof projectManpower.$inferSelect;
export type InsertProjectManpower = z.infer<typeof insertProjectManpowerSchema>;
export type ProjectAttendance = typeof projectAttendance.$inferSelect;
export type InsertProjectAttendance = z.infer<typeof insertProjectAttendanceSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

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
