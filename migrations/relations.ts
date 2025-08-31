import { relations } from "drizzle-orm/relations";
import { users, auditLogs, bomCalculations, projects, bomItems, products, bomSettings, attendance, leaves, payroll, pettyCashExpenses, priceComparisons, clients, projectFiles, materialRequests, moodboards, projectLogs, projectManpower, projectOrders, projectQuotes, projectFinances, purchaseOrders, suppliers, requestItems, stockMovements, supplierProducts, quotes, tasks, boqUploads, projectTasks, purchaseOrderItems, quoteItems, salesProducts } from "./schema";

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	auditLogs: many(auditLogs),
	bomCalculations: many(bomCalculations),
	attendances_checkInBy: many(attendance, {
		relationName: "attendance_checkInBy_users_id"
	}),
	attendances_checkOutBy: many(attendance, {
		relationName: "attendance_checkOutBy_users_id"
	}),
	attendances_userId: many(attendance, {
		relationName: "attendance_userId_users_id"
	}),
	leaves_approvedBy: many(leaves, {
		relationName: "leaves_approvedBy_users_id"
	}),
	leaves_userId: many(leaves, {
		relationName: "leaves_userId_users_id"
	}),
	payrolls_processedBy: many(payroll, {
		relationName: "payroll_processedBy_users_id"
	}),
	payrolls_userId: many(payroll, {
		relationName: "payroll_userId_users_id"
	}),
	pettyCashExpenses_addedBy: many(pettyCashExpenses, {
		relationName: "pettyCashExpenses_addedBy_users_id"
	}),
	pettyCashExpenses_approvedBy: many(pettyCashExpenses, {
		relationName: "pettyCashExpenses_approvedBy_users_id"
	}),
	pettyCashExpenses_paidBy: many(pettyCashExpenses, {
		relationName: "pettyCashExpenses_paidBy_users_id"
	}),
	priceComparisons: many(priceComparisons),
	projectFiles: many(projectFiles),
	materialRequests_approvedBy: many(materialRequests, {
		relationName: "materialRequests_approvedBy_users_id"
	}),
	materialRequests_issuedBy: many(materialRequests, {
		relationName: "materialRequests_issuedBy_users_id"
	}),
	materialRequests_requestedBy: many(materialRequests, {
		relationName: "materialRequests_requestedBy_users_id"
	}),
	moodboards: many(moodboards),
	projectLogs: many(projectLogs),
	projectManpowers_createdBy: many(projectManpower, {
		relationName: "projectManpower_createdBy_users_id"
	}),
	projectManpowers_workerId: many(projectManpower, {
		relationName: "projectManpower_workerId_users_id"
	}),
	projectOrders: many(projectOrders),
	projectQuotes: many(projectQuotes),
	projectFinances_approvedBy: many(projectFinances, {
		relationName: "projectFinances_approvedBy_users_id"
	}),
	projectFinances_createdBy: many(projectFinances, {
		relationName: "projectFinances_createdBy_users_id"
	}),
	purchaseOrders: many(purchaseOrders),
	stockMovements_approvedBy: many(stockMovements, {
		relationName: "stockMovements_approvedBy_users_id"
	}),
	stockMovements_performedBy: many(stockMovements, {
		relationName: "stockMovements_performedBy_users_id"
	}),
	supplierProducts: many(supplierProducts),
	quotes: many(quotes),
	suppliers: many(suppliers),
	tasks_assignedBy: many(tasks, {
		relationName: "tasks_assignedBy_users_id"
	}),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_users_id"
	}),
	tasks_updatedBy: many(tasks, {
		relationName: "tasks_updatedBy_users_id"
	}),
	boqUploads: many(boqUploads),
	projectTasks_assignedTo: many(projectTasks, {
		relationName: "projectTasks_assignedTo_users_id"
	}),
	projectTasks_createdBy: many(projectTasks, {
		relationName: "projectTasks_createdBy_users_id"
	}),
}));

export const bomCalculationsRelations = relations(bomCalculations, ({one, many}) => ({
	user: one(users, {
		fields: [bomCalculations.calculatedBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [bomCalculations.projectId],
		references: [projects.id]
	}),
	bomItems: many(bomItems),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	bomCalculations: many(bomCalculations),
	pettyCashExpenses: many(pettyCashExpenses),
	projectFiles: many(projectFiles),
	materialRequests: many(materialRequests),
	moodboards: many(moodboards),
	projectLogs: many(projectLogs),
	projectManpowers: many(projectManpower),
	projectOrders: many(projectOrders),
	projectQuotes: many(projectQuotes),
	projectFinances: many(projectFinances),
	client: one(clients, {
		fields: [projects.clientId],
		references: [clients.id]
	}),
	stockMovements: many(stockMovements),
	quotes: many(quotes),
	tasks: many(tasks),
	projectTasks: many(projectTasks),
}));

export const bomItemsRelations = relations(bomItems, ({one}) => ({
	bomCalculation: one(bomCalculations, {
		fields: [bomItems.bomId],
		references: [bomCalculations.id]
	}),
}));

export const bomSettingsRelations = relations(bomSettings, ({one}) => ({
	product: one(products, {
		fields: [bomSettings.linkedProductId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	bomSettings: many(bomSettings),
	requestItems: many(requestItems),
	stockMovements: many(stockMovements),
	supplierProducts: many(supplierProducts),
	purchaseOrderItems: many(purchaseOrderItems),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	user_checkInBy: one(users, {
		fields: [attendance.checkInBy],
		references: [users.id],
		relationName: "attendance_checkInBy_users_id"
	}),
	user_checkOutBy: one(users, {
		fields: [attendance.checkOutBy],
		references: [users.id],
		relationName: "attendance_checkOutBy_users_id"
	}),
	user_userId: one(users, {
		fields: [attendance.userId],
		references: [users.id],
		relationName: "attendance_userId_users_id"
	}),
}));

export const leavesRelations = relations(leaves, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [leaves.approvedBy],
		references: [users.id],
		relationName: "leaves_approvedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [leaves.userId],
		references: [users.id],
		relationName: "leaves_userId_users_id"
	}),
}));

export const payrollRelations = relations(payroll, ({one}) => ({
	user_processedBy: one(users, {
		fields: [payroll.processedBy],
		references: [users.id],
		relationName: "payroll_processedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [payroll.userId],
		references: [users.id],
		relationName: "payroll_userId_users_id"
	}),
}));

export const pettyCashExpensesRelations = relations(pettyCashExpenses, ({one}) => ({
	user_addedBy: one(users, {
		fields: [pettyCashExpenses.addedBy],
		references: [users.id],
		relationName: "pettyCashExpenses_addedBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [pettyCashExpenses.approvedBy],
		references: [users.id],
		relationName: "pettyCashExpenses_approvedBy_users_id"
	}),
	user_paidBy: one(users, {
		fields: [pettyCashExpenses.paidBy],
		references: [users.id],
		relationName: "pettyCashExpenses_paidBy_users_id"
	}),
	project: one(projects, {
		fields: [pettyCashExpenses.projectId],
		references: [projects.id]
	}),
}));

export const priceComparisonsRelations = relations(priceComparisons, ({one}) => ({
	user: one(users, {
		fields: [priceComparisons.addedBy],
		references: [users.id]
	}),
}));

export const projectFilesRelations = relations(projectFiles, ({one}) => ({
	client: one(clients, {
		fields: [projectFiles.clientId],
		references: [clients.id]
	}),
	project: one(projects, {
		fields: [projectFiles.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectFiles.uploadedBy],
		references: [users.id]
	}),
}));

export const clientsRelations = relations(clients, ({many}) => ({
	projectFiles: many(projectFiles),
	projectOrders: many(projectOrders),
	projectQuotes: many(projectQuotes),
	projectFinances: many(projectFinances),
	projects: many(projects),
	quotes: many(quotes),
	projectTasks: many(projectTasks),
}));

export const materialRequestsRelations = relations(materialRequests, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [materialRequests.approvedBy],
		references: [users.id],
		relationName: "materialRequests_approvedBy_users_id"
	}),
	user_issuedBy: one(users, {
		fields: [materialRequests.issuedBy],
		references: [users.id],
		relationName: "materialRequests_issuedBy_users_id"
	}),
	project: one(projects, {
		fields: [materialRequests.projectId],
		references: [projects.id]
	}),
	user_requestedBy: one(users, {
		fields: [materialRequests.requestedBy],
		references: [users.id],
		relationName: "materialRequests_requestedBy_users_id"
	}),
	requestItems: many(requestItems),
	stockMovements: many(stockMovements),
}));

export const moodboardsRelations = relations(moodboards, ({one}) => ({
	user: one(users, {
		fields: [moodboards.createdBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [moodboards.linkedProjectId],
		references: [projects.id]
	}),
}));

export const projectLogsRelations = relations(projectLogs, ({one}) => ({
	user: one(users, {
		fields: [projectLogs.createdBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [projectLogs.projectId],
		references: [projects.id]
	}),
}));

export const projectManpowerRelations = relations(projectManpower, ({one}) => ({
	user_createdBy: one(users, {
		fields: [projectManpower.createdBy],
		references: [users.id],
		relationName: "projectManpower_createdBy_users_id"
	}),
	project: one(projects, {
		fields: [projectManpower.projectId],
		references: [projects.id]
	}),
	user_workerId: one(users, {
		fields: [projectManpower.workerId],
		references: [users.id],
		relationName: "projectManpower_workerId_users_id"
	}),
}));

export const projectOrdersRelations = relations(projectOrders, ({one}) => ({
	client: one(clients, {
		fields: [projectOrders.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [projectOrders.createdBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [projectOrders.projectId],
		references: [projects.id]
	}),
}));

export const projectQuotesRelations = relations(projectQuotes, ({one}) => ({
	client: one(clients, {
		fields: [projectQuotes.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [projectQuotes.createdBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [projectQuotes.projectId],
		references: [projects.id]
	}),
}));

export const projectFinancesRelations = relations(projectFinances, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [projectFinances.approvedBy],
		references: [users.id],
		relationName: "projectFinances_approvedBy_users_id"
	}),
	client: one(clients, {
		fields: [projectFinances.clientId],
		references: [clients.id]
	}),
	user_createdBy: one(users, {
		fields: [projectFinances.createdBy],
		references: [users.id],
		relationName: "projectFinances_createdBy_users_id"
	}),
	project: one(projects, {
		fields: [projectFinances.projectId],
		references: [projects.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	user: one(users, {
		fields: [purchaseOrders.createdBy],
		references: [users.id]
	}),
	supplier: one(suppliers, {
		fields: [purchaseOrders.supplierId],
		references: [suppliers.id]
	}),
	purchaseOrderItems: many(purchaseOrderItems),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	purchaseOrders: many(purchaseOrders),
	supplierProducts: many(supplierProducts),
	user: one(users, {
		fields: [suppliers.createdBy],
		references: [users.id]
	}),
}));

export const requestItemsRelations = relations(requestItems, ({one}) => ({
	product: one(products, {
		fields: [requestItems.productId],
		references: [products.id]
	}),
	materialRequest: one(materialRequests, {
		fields: [requestItems.requestId],
		references: [materialRequests.id]
	}),
}));

export const stockMovementsRelations = relations(stockMovements, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [stockMovements.approvedBy],
		references: [users.id],
		relationName: "stockMovements_approvedBy_users_id"
	}),
	materialRequest: one(materialRequests, {
		fields: [stockMovements.materialRequestId],
		references: [materialRequests.id]
	}),
	user_performedBy: one(users, {
		fields: [stockMovements.performedBy],
		references: [users.id],
		relationName: "stockMovements_performedBy_users_id"
	}),
	product: one(products, {
		fields: [stockMovements.productId],
		references: [products.id]
	}),
	project: one(projects, {
		fields: [stockMovements.projectId],
		references: [projects.id]
	}),
}));

export const supplierProductsRelations = relations(supplierProducts, ({one}) => ({
	user: one(users, {
		fields: [supplierProducts.createdBy],
		references: [users.id]
	}),
	product: one(products, {
		fields: [supplierProducts.productId],
		references: [products.id]
	}),
	supplier: one(suppliers, {
		fields: [supplierProducts.supplierId],
		references: [suppliers.id]
	}),
}));

export const quotesRelations = relations(quotes, ({one, many}) => ({
	client: one(clients, {
		fields: [quotes.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [quotes.createdBy],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [quotes.projectId],
		references: [projects.id]
	}),
	quoteItems: many(quoteItems),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	user_assignedBy: one(users, {
		fields: [tasks.assignedBy],
		references: [users.id],
		relationName: "tasks_assignedBy_users_id"
	}),
	user_assignedTo: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id],
		relationName: "tasks_assignedTo_users_id"
	}),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user_updatedBy: one(users, {
		fields: [tasks.updatedBy],
		references: [users.id],
		relationName: "tasks_updatedBy_users_id"
	}),
}));

export const boqUploadsRelations = relations(boqUploads, ({one}) => ({
	user: one(users, {
		fields: [boqUploads.uploadedBy],
		references: [users.id]
	}),
}));

export const projectTasksRelations = relations(projectTasks, ({one}) => ({
	user_assignedTo: one(users, {
		fields: [projectTasks.assignedTo],
		references: [users.id],
		relationName: "projectTasks_assignedTo_users_id"
	}),
	client: one(clients, {
		fields: [projectTasks.clientId],
		references: [clients.id]
	}),
	user_createdBy: one(users, {
		fields: [projectTasks.createdBy],
		references: [users.id],
		relationName: "projectTasks_createdBy_users_id"
	}),
	project: one(projects, {
		fields: [projectTasks.projectId],
		references: [projects.id]
	}),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderItems.poId],
		references: [purchaseOrders.id]
	}),
	product: one(products, {
		fields: [purchaseOrderItems.productId],
		references: [products.id]
	}),
}));

export const quoteItemsRelations = relations(quoteItems, ({one}) => ({
	quote: one(quotes, {
		fields: [quoteItems.quoteId],
		references: [quotes.id]
	}),
	salesProduct: one(salesProducts, {
		fields: [quoteItems.salesProductId],
		references: [salesProducts.id]
	}),
}));

export const salesProductsRelations = relations(salesProducts, ({many}) => ({
	quoteItems: many(quoteItems),
}));