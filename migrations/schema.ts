import { pgTable, foreignKey, serial, integer, text, jsonb, timestamp, unique, real, boolean, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	action: text().notNull(),
	tableName: text("table_name").notNull(),
	recordId: integer("record_id").notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_users_id_fk"
		}),
]);

export const bomCalculations = pgTable("bom_calculations", {
	id: serial().primaryKey().notNull(),
	calculationNumber: text("calculation_number").notNull(),
	unitType: text("unit_type").notNull(),
	height: real().notNull(),
	width: real().notNull(),
	depth: real().notNull(),
	unitOfMeasure: text("unit_of_measure").default('mm').notNull(),
	partsConfig: jsonb("parts_config").default({}),
	boardType: text("board_type").notNull(),
	boardThickness: text("board_thickness").default('18mm').notNull(),
	finish: text().notNull(),
	calculatedBy: integer("calculated_by").notNull(),
	projectId: integer("project_id"),
	totalBoardArea: real("total_board_area").default(0),
	totalEdgeBanding2Mm: real("total_edge_banding_2mm").default(0),
	totalEdgeBanding08Mm: real("total_edge_banding_0_8mm").default(0),
	totalMaterialCost: real("total_material_cost").default(0),
	totalHardwareCost: real("total_hardware_cost").default(0),
	totalCost: real("total_cost").default(0),
	status: text().default('draft'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.calculatedBy],
			foreignColumns: [users.id],
			name: "bom_calculations_calculated_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "bom_calculations_project_id_projects_id_fk"
		}),
	unique("bom_calculations_calculation_number_unique").on(table.calculationNumber),
]);

export const bomBoardRates = pgTable("bom_board_rates", {
	id: serial().primaryKey().notNull(),
	boardType: text("board_type").notNull(),
	thickness: text().notNull(),
	finish: text().notNull(),
	ratePerSqft: real("rate_per_sqft").notNull(),
	supplier: text(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
});

export const bomItems = pgTable("bom_items", {
	id: serial().primaryKey().notNull(),
	bomId: integer("bom_id").notNull(),
	itemType: text("item_type").notNull(),
	itemCategory: text("item_category").notNull(),
	partName: text("part_name").notNull(),
	materialType: text("material_type"),
	length: real(),
	width: real(),
	thickness: real(),
	quantity: integer().default(1).notNull(),
	unit: text().default('pieces').notNull(),
	edgeBandingType: text("edge_banding_type"),
	edgeBandingLength: real("edge_banding_length").default(0),
	unitRate: real("unit_rate").default(0),
	totalCost: real("total_cost").default(0),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.bomId],
			foreignColumns: [bomCalculations.id],
			name: "bom_items_bom_id_bom_calculations_id_fk"
		}),
]);

export const bomHardwareRates = pgTable("bom_hardware_rates", {
	id: serial().primaryKey().notNull(),
	itemName: text("item_name").notNull(),
	category: text().notNull(),
	subcategory: text(),
	unit: text().notNull(),
	currentRate: real("current_rate").notNull(),
	supplier: text(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
}, (table) => [
	unique("bom_hardware_rates_item_name_unique").on(table.itemName),
]);

export const bomSettings = pgTable("bom_settings", {
	id: serial().primaryKey().notNull(),
	bomMaterialType: text("bom_material_type").notNull(),
	bomMaterialCategory: text("bom_material_category").notNull(),
	bomMaterialName: text("bom_material_name").notNull(),
	linkedProductId: integer("linked_product_id"),
	useRealPricing: boolean("use_real_pricing").default(false).notNull(),
	customDefaultPrice: numeric("custom_default_price", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.linkedProductId],
			foreignColumns: [products.id],
			name: "bom_settings_linked_product_id_products_id_fk"
		}),
	unique("bom_settings_bom_material_type_unique").on(table.bomMaterialType),
]);

export const attendance = pgTable("attendance", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	checkInTime: timestamp("check_in_time", { mode: 'string' }),
	checkOutTime: timestamp("check_out_time", { mode: 'string' }),
	workingHours: real("working_hours").default(0),
	overtimeHours: real("overtime_hours").default(0),
	status: text().default('present').notNull(),
	leaveType: text("leave_type"),
	checkInBy: integer("check_in_by"),
	checkOutBy: integer("check_out_by"),
	location: text(),
	notes: text(),
	isManualEntry: boolean("is_manual_entry").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.checkInBy],
			foreignColumns: [users.id],
			name: "attendance_check_in_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.checkOutBy],
			foreignColumns: [users.id],
			name: "attendance_check_out_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "attendance_user_id_users_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text(),
	mobile: text().notNull(),
	city: text().notNull(),
	contactPerson: text("contact_person"),
	phone: text(),
	address1: text(),
	address2: text(),
	state: text(),
	pinCode: text("pin_code"),
	gstNumber: text("gst_number"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("clients_name_unique").on(table.name),
]);

export const leaves = pgTable("leaves", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	leaveType: text("leave_type").notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	totalDays: integer("total_days").notNull(),
	reason: text().notNull(),
	status: text().default('pending').notNull(),
	appliedAt: timestamp("applied_at", { mode: 'string' }).defaultNow(),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	documentUrl: text("document_url"),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "leaves_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "leaves_user_id_users_id_fk"
		}),
]);

export const payroll = pgTable("payroll", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	month: integer().notNull(),
	year: integer().notNull(),
	basicSalary: real("basic_salary").notNull(),
	allowances: real().default(0),
	overtimePay: real("overtime_pay").default(0),
	bonus: real().default(0),
	deductions: real().default(0),
	netSalary: real("net_salary").notNull(),
	totalWorkingDays: integer("total_working_days").default(30),
	actualWorkingDays: real("actual_working_days").notNull(),
	totalHours: real("total_hours").default(0),
	overtimeHours: real("overtime_hours").default(0),
	leaveDays: integer("leave_days").default(0),
	paySlipUrl: text("pay_slip_url"),
	status: text().default('draft').notNull(),
	processedBy: integer("processed_by"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "payroll_processed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payroll_user_id_users_id_fk"
		}),
]);

export const pettyCashExpenses = pgTable("petty_cash_expenses", {
	id: serial().primaryKey().notNull(),
	category: text().notNull(),
	amount: real().notNull(),
	vendor: text(),
	description: text(),
	projectId: integer("project_id"),
	orderNo: text("order_no"),
	paidBy: integer("paid_by"),
	receiptImageUrl: text("receipt_image_url"),
	extractedData: jsonb("extracted_data"),
	expenseDate: timestamp("expense_date", { mode: 'string' }).notNull(),
	addedBy: integer("added_by").notNull(),
	approvedBy: integer("approved_by"),
	status: text().default('expense').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	productImageUrl: text("product_image_url"),
	billImageUrl: text("bill_image_url"),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "petty_cash_expenses_added_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "petty_cash_expenses_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.paidBy],
			foreignColumns: [users.id],
			name: "petty_cash_expenses_paid_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "petty_cash_expenses_project_id_projects_id_fk"
		}),
]);

export const priceComparisons = pgTable("price_comparisons", {
	id: serial().primaryKey().notNull(),
	productName: text("product_name").notNull(),
	size: text(),
	thickness: text(),
	brand: text().notNull(),
	price: real().notNull(),
	vendor: text(),
	imageUrl: text("image_url"),
	addedBy: integer("added_by").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "price_comparisons_added_by_users_id_fk"
		}),
]);

export const projectFiles = pgTable("project_files", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	clientId: integer("client_id"),
	fileName: text("file_name").notNull(),
	originalName: text("original_name").notNull(),
	filePath: text("file_path").notNull(),
	fileSize: integer("file_size").default(0),
	mimeType: text("mime_type"),
	category: text().default('general'),
	description: text(),
	comment: text(),
	uploadedBy: integer("uploaded_by"),
	isPublic: boolean("is_public").default(false),
	version: integer().default(1),
	tags: text().array().default([""]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "project_files_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_files_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "project_files_uploaded_by_users_id_fk"
		}),
]);

export const materialRequests = pgTable("material_requests", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	clientName: text("client_name").notNull(),
	orderNumber: text("order_number").default(').notNull(),
	requestedBy: integer("requested_by").notNull(),
	status: text().default('pending').notNull(),
	priority: text().default('medium').notNull(),
	boqReference: text("boq_reference"),
	remarks: text(),
	totalValue: real("total_value").default(0).notNull(),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	issuedBy: integer("issued_by"),
	issuedAt: timestamp("issued_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "material_requests_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.issuedBy],
			foreignColumns: [users.id],
			name: "material_requests_issued_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "material_requests_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [users.id],
			name: "material_requests_requested_by_users_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	brand: text(),
	size: text(),
	thickness: text(),
	sku: text(),
	pricePerUnit: real("price_per_unit").notNull(),
	currentStock: integer("current_stock").default(0).notNull(),
	minStock: integer("min_stock").default(10).notNull(),
	unit: text().default('pieces').notNull(),
	imageUrl: text("image_url"),
	productType: text("product_type").default('raw_material').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("products_sku_unique").on(table.sku),
]);

export const moodboards = pgTable("moodboards", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	keywords: text().notNull(),
	roomType: text("room_type").notNull(),
	imageUrls: text("image_urls").array().default([""]),
	imageData: jsonb("image_data"),
	linkedProjectId: integer("linked_project_id"),
	createdBy: integer("created_by").notNull(),
	sourceType: text("source_type").default('manual_upload'),
	isPublic: boolean("is_public").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "moodboards_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.linkedProjectId],
			foreignColumns: [projects.id],
			name: "moodboards_linked_project_id_projects_id_fk"
		}),
]);

export const projectLogs = pgTable("project_logs", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id"),
	logType: text("log_type").notNull(),
	title: text().notNull(),
	description: text(),
	createdBy: integer("created_by"),
	attachments: text().array().default([""]),
	isImportant: boolean("is_important").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_logs_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_logs_project_id_projects_id_fk"
		}),
]);

export const projectManpower = pgTable("project_manpower", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	workerId: integer("worker_id"),
	workerName: text("worker_name").notNull(),
	role: text().notNull(),
	skillLevel: text("skill_level").default('intermediate'),
	dailyRate: real("daily_rate").default(0),
	startDate: timestamp("start_date", { mode: 'string' }).defaultNow(),
	endDate: timestamp("end_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	contactNumber: text("contact_number"),
	address: text(),
	aadharNumber: text("aadhar_number"),
	bankDetails: text("bank_details"),
	notes: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_manpower_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_manpower_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.workerId],
			foreignColumns: [users.id],
			name: "project_manpower_worker_id_users_id_fk"
		}),
]);

export const projectOrders = pgTable("project_orders", {
	id: serial().primaryKey().notNull(),
	orderNumber: text("order_number").notNull(),
	projectId: integer("project_id").notNull(),
	clientId: integer("client_id"),
	vendorName: text("vendor_name").notNull(),
	vendorContact: text("vendor_contact"),
	vendorEmail: text("vendor_email"),
	vendorAddress: text("vendor_address"),
	orderType: text("order_type").default('material'),
	totalAmount: real("total_amount").default(0),
	paidAmount: real("paid_amount").default(0),
	status: text().default('pending'),
	expectedDelivery: timestamp("expected_delivery", { mode: 'string' }),
	actualDelivery: timestamp("actual_delivery", { mode: 'string' }),
	items: jsonb().default([]),
	paymentTerms: text("payment_terms"),
	deliveryAddress: text("delivery_address"),
	notes: text(),
	attachments: text().array().default([""]),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "project_orders_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_orders_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_orders_project_id_projects_id_fk"
		}),
	unique("project_orders_order_number_unique").on(table.orderNumber),
]);

export const projectQuotes = pgTable("project_quotes", {
	id: serial().primaryKey().notNull(),
	quoteNumber: text("quote_number").notNull(),
	projectId: integer("project_id").notNull(),
	clientId: integer("client_id").notNull(),
	title: text().notNull(),
	description: text(),
	subtotal: real().default(0),
	taxAmount: real("tax_amount").default(0),
	totalAmount: real("total_amount").default(0),
	validUntil: timestamp("valid_until", { mode: 'string' }),
	status: text().default('draft'),
	terms: text(),
	items: jsonb().default([]),
	createdBy: integer("created_by"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectedAt: timestamp("rejected_at", { mode: 'string' }),
	notes: text(),
	attachments: text().array().default([""]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "project_quotes_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_quotes_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_quotes_project_id_projects_id_fk"
		}),
	unique("project_quotes_quote_number_unique").on(table.quoteNumber),
]);

export const projectFinances = pgTable("project_finances", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	clientId: integer("client_id").notNull(),
	entryType: text("entry_type").notNull(),
	category: text().notNull(),
	description: text().notNull(),
	amount: real().notNull(),
	transactionDate: timestamp("transaction_date", { mode: 'string' }).defaultNow(),
	paymentMethod: text("payment_method"),
	referenceNumber: text("reference_number"),
	approvedBy: integer("approved_by"),
	notes: text(),
	attachments: text().array().default([""]),
	isRecurring: boolean("is_recurring").default(false),
	recurringFrequency: text("recurring_frequency"),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "project_finances_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "project_finances_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_finances_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_finances_project_id_projects_id_fk"
		}),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: serial().primaryKey().notNull(),
	poNumber: text("po_number").notNull(),
	supplierId: integer("supplier_id").notNull(),
	status: text().default('draft').notNull(),
	totalAmount: real("total_amount").default(0).notNull(),
	notes: text(),
	expectedDeliveryDate: timestamp("expected_delivery_date", { mode: 'string' }),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	receivedAt: timestamp("received_at", { mode: 'string' }),
	autoGenerated: boolean("auto_generated").default(false).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "purchase_orders_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchase_orders_supplier_id_suppliers_id_fk"
		}),
	unique("purchase_orders_po_number_unique").on(table.poNumber),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	clientId: integer("client_id").notNull(),
	stage: text().default('prospect').notNull(),
	budget: real().default(0),
	differentSiteLocation: boolean("different_site_location").default(false),
	siteAddressLine1: text("site_address_line_1"),
	siteAddressLine2: text("site_address_line_2"),
	siteState: text("site_state"),
	siteCity: text("site_city"),
	siteLocation: text("site_location"),
	sitePincode: text("site_pincode"),
	completionPercentage: integer("completion_percentage").default(0),
	notes: text(),
	files: text().array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "projects_client_id_clients_id_fk"
		}),
	unique("projects_code_unique").on(table.code),
]);

export const salesProducts = pgTable("sales_products", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	imageUrl: text("image_url"),
	size: text(),
	unitPrice: real("unit_price").default(0).notNull(),
	category: text(),
	taxPercentage: real("tax_percentage").default(0),
	internalNotes: text("internal_notes"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const requestItems = pgTable("request_items", {
	id: serial().primaryKey().notNull(),
	requestId: integer("request_id").notNull(),
	productId: integer("product_id").notNull(),
	requestedQuantity: integer("requested_quantity").notNull(),
	approvedQuantity: integer("approved_quantity"),
	unitPrice: real("unit_price").notNull(),
	totalPrice: real("total_price").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "request_items_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [materialRequests.id],
			name: "request_items_request_id_material_requests_id_fk"
		}),
]);

export const stockMovements = pgTable("stock_movements", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	movementType: text("movement_type").notNull(),
	quantity: integer().notNull(),
	previousStock: integer("previous_stock").notNull(),
	newStock: integer("new_stock").notNull(),
	reference: text(),
	vendor: text(),
	costPerUnit: real("cost_per_unit"),
	totalCost: real("total_cost"),
	notes: text(),
	performedBy: integer("performed_by").notNull(),
	projectId: integer("project_id"),
	materialRequestId: integer("material_request_id"),
	reason: text().default('General').notNull(),
	destination: text(),
	invoiceNumber: text("invoice_number"),
	batchNumber: text("batch_number"),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	location: text(),
	approvedBy: integer("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "stock_movements_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.materialRequestId],
			foreignColumns: [materialRequests.id],
			name: "stock_movements_material_request_id_material_requests_id_fk"
		}),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "stock_movements_performed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "stock_movements_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "stock_movements_project_id_projects_id_fk"
		}),
]);

export const supplierProducts = pgTable("supplier_products", {
	id: serial().primaryKey().notNull(),
	supplierId: integer("supplier_id").notNull(),
	productId: integer("product_id").notNull(),
	isPreferred: boolean("is_preferred").default(false).notNull(),
	leadTimeDays: integer("lead_time_days").default(7),
	minOrderQty: integer("min_order_qty").default(1),
	unitPrice: real("unit_price").default(0),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "supplier_products_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "supplier_products_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "supplier_products_supplier_id_suppliers_id_fk"
		}),
]);

export const quotes = pgTable("quotes", {
	id: serial().primaryKey().notNull(),
	quoteNumber: text("quote_number").notNull(),
	projectId: integer("project_id"),
	clientId: integer("client_id").notNull(),
	title: text().notNull(),
	description: text(),
	subtotal: real().default(0),
	discountType: text("discount_type").default('percentage'),
	discountValue: real("discount_value").default(0),
	discountAmount: real("discount_amount").default(0),
	taxAmount: real("tax_amount").default(0),
	totalAmount: real("total_amount").default(0),
	status: text().default('draft').notNull(),
	validUntil: timestamp("valid_until", { mode: 'string' }),
	expirationDate: timestamp("expiration_date", { mode: 'string' }),
	paymentTerms: text("payment_terms").default('Immediate Payment'),
	pricelist: text().default('Public Pricelist (EGP)'),
	terms: text(),
	notes: text(),
	furnitureSpecifications: text("furniture_specifications").default('All furniture will be manufactured using Said Materials
- All hardware considered of standard make.
- Standard laminates considered as per selection.
- Any modifications or changes in material selection may result in additional charges.'),
	packingChargesType: text("packing_charges_type").default('percentage'),
	packingChargesValue: real("packing_charges_value").default(2),
	packingChargesAmount: real("packing_charges_amount").default(0),
	transportationCharges: real("transportation_charges").default(5000),
	createdBy: integer("created_by").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "quotes_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "quotes_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "quotes_project_id_projects_id_fk"
		}),
	unique("quotes_quote_number_unique").on(table.quoteNumber),
]);

export const suppliers = pgTable("suppliers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	contactPerson: text("contact_person"),
	phone: text(),
	email: text(),
	address: text(),
	paymentTerms: text("payment_terms").default('30 days'),
	gstin: text(),
	preferred: boolean().default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "suppliers_created_by_users_id_fk"
		}),
	unique("suppliers_name_unique").on(table.name),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	role: text().default('staff').notNull(),
	phone: text(),
	aadharNumber: text("aadhar_number"),
	employeeId: text("employee_id"),
	department: text(),
	designation: text(),
	joiningDate: timestamp("joining_date", { mode: 'string' }),
	basicSalary: real("basic_salary").default(0),
	allowances: real().default(0),
	profilePhotoUrl: text("profile_photo_url"),
	aadharCardUrl: text("aadhar_card_url"),
	documentsUrls: text("documents_urls").array().default([""]),
	bankAccountNumber: text("bank_account_number"),
	ifscCode: text("ifsc_code"),
	address: text(),
	emergencyContact: text("emergency_contact"),
	emergencyContactPhone: text("emergency_contact_phone"),
	isActive: boolean("is_active").default(true).notNull(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
	unique("users_employee_id_unique").on(table.employeeId),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	projectId: integer("project_id"),
	status: text().default('pending').notNull(),
	priority: text().default('medium').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	startDate: timestamp("start_date", { mode: 'string' }),
	completedDate: timestamp("completed_date", { mode: 'string' }),
	estimatedHours: integer("estimated_hours").default(0),
	actualHours: integer("actual_hours").default(0),
	tags: text().array().default([""]),
	attachments: text().array().default([""]),
	comments: text(),
	assignedTo: integer("assigned_to"),
	assignedToOther: text("assigned_to_other"),
	assignedBy: integer("assigned_by").notNull(),
	updatedBy: integer("updated_by"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "tasks_assigned_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tasks_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "tasks_updated_by_users_id_fk"
		}),
]);

export const boqUploads = pgTable("boq_uploads", {
	id: serial().primaryKey().notNull(),
	filename: text().notNull(),
	originalName: text("original_name").notNull(),
	uploadedBy: integer("uploaded_by").notNull(),
	status: text().default('processing').notNull(),
	extractedData: jsonb("extracted_data"),
	projectName: text("project_name"),
	boqReference: text("boq_reference"),
	totalValue: real("total_value"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "boq_uploads_uploaded_by_users_id_fk"
		}),
]);

export const projectTasks = pgTable("project_tasks", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	clientId: integer("client_id"),
	title: text().notNull(),
	description: text(),
	assignedTo: integer("assigned_to"),
	createdBy: integer("created_by"),
	priority: text().default('medium'),
	status: text().default('pending'),
	category: text().default('general'),
	startDate: timestamp("start_date", { mode: 'string' }),
	dueDate: timestamp("due_date", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	estimatedHours: real("estimated_hours").default(0),
	actualHours: real("actual_hours").default(0),
	dependencies: text().array().default([""]),
	attachments: text().array().default([""]),
	comments: jsonb().default([]),
	tags: text().array().default([""]),
	isRecurring: boolean("is_recurring").default(false),
	recurringFrequency: text("recurring_frequency"),
	reminderDate: timestamp("reminder_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "project_tasks_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "project_tasks_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_tasks_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_tasks_project_id_projects_id_fk"
		}),
]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
	id: serial().primaryKey().notNull(),
	poId: integer("po_id").notNull(),
	productId: integer("product_id").notNull(),
	sku: text(),
	description: text().notNull(),
	qty: integer().notNull(),
	unitPrice: real("unit_price").notNull(),
	totalPrice: real("total_price").notNull(),
	expectedDeliveryDate: timestamp("expected_delivery_date", { mode: 'string' }),
	receivedQty: integer("received_qty").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_items_po_id_purchase_orders_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "purchase_order_items_product_id_products_id_fk"
		}),
]);

export const quoteItems = pgTable("quote_items", {
	id: serial().primaryKey().notNull(),
	quoteId: integer("quote_id").notNull(),
	salesProductId: integer("sales_product_id"),
	itemName: text("item_name").notNull(),
	description: text(),
	quantity: real().default(1).notNull(),
	uom: text().default('pcs'),
	unitPrice: real("unit_price").default(0).notNull(),
	discountPercentage: real("discount_percentage").default(0),
	discountAmount: real("discount_amount").default(0),
	taxPercentage: real("tax_percentage").default(0),
	taxAmount: real("tax_amount").default(0),
	lineTotal: real("line_total").default(0).notNull(),
	sortOrder: integer("sort_order").default(0),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.quoteId],
			foreignColumns: [quotes.id],
			name: "quote_items_quote_id_quotes_id_fk"
		}),
	foreignKey({
			columns: [table.salesProductId],
			foreignColumns: [salesProducts.id],
			name: "quote_items_sales_product_id_sales_products_id_fk"
		}),
]);
