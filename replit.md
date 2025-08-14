# Furnili Management System

## Overview
The Furnili Management System is a comprehensive web application designed to enhance operational efficiency and streamline workflows for businesses. Developed with a React frontend and Express backend, it provides robust solutions for staff management, project tracking, inventory control, and financial oversight. Key capabilities include professional PDF export for quotes, mobile-first design, and role-based access control, all while maintaining a consistent Furnili brand identity. The system aims to be a modern, integrated platform for business management.

## User Preferences
Preferred communication style: Simple, everyday language.
Form Layout Requirements: All popup forms must be optimized for screen size with compact layouts - space-y-3 form spacing, h-8 input heights, text-xs labels, max-w-[90vw] mobile width, reduced spacing between rows for maximum space efficiency.

## System Architecture

### Recent Changes (August 2025)
- **Complete Reports System Rewrite**: Successfully rebuilt entire Reports page from scratch with proper frontend-backend integration, real-time data fetching using React Query, comprehensive error handling, and dedicated API endpoints for dashboard statistics and CSV exports with proper authentication and file formatting - now showing real inventory data with category breakdown, stock health indicators, working CSV exports, proper filter functionality for date range, report type, and category selection, and comprehensive detailed reports for all types including new Sales Report from Sales Products table
- **Scan to OCR Implementation**: Successfully implemented comprehensive OCR functionality using Tesseract.js for processing BOQ documents from images (PNG/JPG), with streamlined interface focused on mobile-captured document processing and automatic text extraction
- **Security Enhancement**: Successfully implemented Row Level Security (RLS) policies for all 40+ database tables to address Supabase security warnings, maintaining Express backend functionality
- **Purchase Order PDF Format**: Fixed Purchase Order PDF to match Quote PDF format exactly - added company logo, professional authority signature with digital signature image, consistent colors, enhanced footer layout, Discount column, removed "Brand:" prefix, and matched totals structure for complete professional branding consistency
- **Navigation Restructure**: Reorganized navigation with "Products" as main category containing Raw Materials, Stock Movement, Purchase Orders, and Compare Material subcategories for better logical grouping and user experience
- **UI Text Improvements**: Updated UI text labels for better conciseness: "Inventory Movement" → "Stock Movement", "Product Comparison" → "Compare Material", "Display Settings" → "Theme & Layout", "System Flowchart" → "Workflow", "Products" → "Raw Materials" - applied consistently across sidebar navigation, page titles, and headers for cleaner interface
- **Workflow Diagram Fix**: Successfully resolved system flowchart loading issues by implementing fetch API with inline SVG rendering, replacing problematic img tag approach with direct content loading and enhanced error handling. Eliminated visual artifacts (black diagonal marks) by simplifying SVG connecting lines
- **Dashboard Icon Standardization**: Successfully standardized all KPI card icons to consistent h-5 w-5 size across the entire dashboard - fixed icon size inconsistencies in Products, Low Stock Alert, Today's Attendance, Requests, Monthly Expenses, Check In/Out, Material Request, Stock Movement, and all other dashboard cards for uniform visual appearance
- **3-Column Dashboard Layout**: Successfully implemented horizontal layout with Ongoing Projects | Critical Stock Alerts | Recent Activity positioned side-by-side in responsive 3-column grid for admin/manager users - standardized consistent styling with compact one-liner items, uniform headers, and reduced gap spacing for maximum visual organization
- **Simplified Dashboard Design**: Removed excessive "bubble" styling from task displays, project lists, and activity feeds - converted to clean line-separated format with minimal rounded elements, border dividers, and simple hover effects for reduced visual clutter
- **Compact Task Display**: Optimized dashboard task section to show only the next 2-3 most urgent tasks as clean one-liners sorted by priority and due date, with "View All Tasks" moved to small clickable text on the right side for maximum space efficiency
- **Runtime Error Resolution**: Fixed "userRole is not defined" error by replacing with currentUser?.role in ProjectDetail.tsx
- **Category Management Fix**: Resolved category editing bug where changes showed "saved successfully" but didn't reflect in UI - corrected API call format from (url, method, data) to proper options object with enhanced cache invalidation and refetch strategies
- **Category Sorting**: Implemented alphabetical sorting for categories list to display items in consistent name-based order
- **Sales Products Table Fix**: Fixed size column text wrapping issue by removing whitespace-nowrap and implementing break-words with improved column width distribution for better readability
- **BOQ Processing Enhancement**: Implemented real PDF text extraction using pdf-parse library replacing hardcoded sample data with actual document parsing - enhanced extraction patterns to handle both Goods and Hardware sections with proper metadata extraction (project name, client, work order details)
- **Excel BOM Processing**: Successfully implemented comprehensive Excel BOQ upload supporting both generic BOQ formats and specialized BOM reports with intelligent parsing of project details (client name, work order number, date), automatic header detection, and precise data extraction from structured columns (description, brand, type, quantity, unit, unit price, total price)
- **Storage Interface Optimization**: Completed comprehensive implementation of missing DatabaseStorage methods including categories, clients, BOQ uploads, attendance, payroll, quotes, and other modules
- **Build System Health**: Resolved 40+ TypeScript errors and build warnings by implementing all missing storage interface methods
- **Code Quality**: Eliminated duplicate method definitions and cleaned up storage implementation
- **Bundle Optimization**: Current bundle size stable at ~1.9MB with successful production builds
- **Purchase Order System**: Fully functional with deletion, stock reversal, and inventory tracking capabilities
- **Mobile Optimization**: Implemented comprehensive mobile-first design with MobileLayout, MobileSidebar, MobileTable, MobileForm, and MobileDashboard components
- **Performance Improvements**: Added debounced event handlers, lazy loading, GPU acceleration, and mobile-specific CSS optimizations
- **Touch-First UI**: Enhanced touch targets, removed hover states on mobile, optimized form inputs to prevent zoom on iOS

### UI/UX Decisions
The system adheres to a professional and consistent UI/UX based on the "Furnili Design System," featuring a unified component library, a consistent brown theme (hsl(28, 100%, 25%)), and professional color variables. Design elements like consistent styling, proper spacing, and modern card-based layouts are prioritized. The UI is mobile-responsive, with layouts, forms, and tables optimized for various screen sizes.

### Technical Implementations

#### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

#### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Authentication**: JWT-based authentication
- **File Processing**: Tesseract.js for OCR

### Feature Specifications

#### Authentication & Authorization
- JWT token-based authentication with four distinct user roles: Admin, Manager, Staff, and Store Incharge.
- Role-based access control governs route and UI component visibility for features such as Project Management, Product Management, Material Request creation, Master Data access, Project Details (Quotes/Finances/Notes), Material Order Cost, Client Contact information, Dashboard Layout, and Inventory Movement deletion.

#### Product Management
- Comprehensive product catalog with categories, brands, specifications, image upload, real-time stock tracking, SKU management, and low-stock alerts.
- Unified stock management integrated with the centralized Inventory Movement system for audit trails.

#### BOQ Processing System
- PDF upload with OCR for automated text extraction.
- Intelligent parsing of quantities, units, rates, and descriptions.
- Product matching with existing inventory and auto-generation of material requests.

#### Material Request Workflow
- Lifecycle management: Submit → Pending → Approved → Issued → Completed.
- Supports multi-item requests with quantity validation and priority levels.
- BOQ reference linking for traceability and stock validation.
- Dynamic pricing using current product prices and fixed cost recording upon project completion.
- Automatic stock deduction when issued and restoration if cancelled/rejected/deleted, with audit trails.
- Role-based workflow: Admin/Manager can approve and issue, Store Incharge can issue approved requests.

#### Reporting & Analytics
- Role-specific dashboards with key metrics.
- CSV export for various data types, including category-wise analysis and financial summaries.

#### Professional PDF Quote Generation
- Fixed and optimized PDF layout with precise specifications for tables, spacing, and company signature.
- Critical calculation logic for quotes includes item line totals with packaging (2%), transportation (₹5,000), and GST (18%).

#### Quote Management Interface
- Complete CRUD operations for quotes with functional action buttons and enhanced item creation.
- Mobile-optimized dialogs.
- Automated quote title generation based on project names.
- Quote status management (draft, sent, approved, rejected, expired).
- Integrated WhatsApp sharing for PDFs.
- Consistent 'Size' field integration across Sales Products and Quotes.
- Resolved client data loading issues in PDF export with cache-bypass endpoint implementation.

#### Staff Management & Payroll
- Comprehensive staff management including attendance tracking, ID details, salary information, and document storage.
- Admin check-in/out controls and automated payroll calculation with overtime and deductions.

#### Petty Cash Management
- Manual expense entry and OCR processing for UPI payment screenshots.
- Dashboard with filtering and search, and balance tracking.

#### Project Management
- Table-based project dashboard with auto-generated project codes.
- Project creation with client, project, and address details.
- Advanced filtering by stage and client with a unified client database.
- Comprehensive project stages: Prospect to Completed, with optional "On Hold" / "Lost" statuses.
- Integrated Quotes functionality as a sub-module.

#### Purchase Order Management
- Complete CRUD operations for purchase orders with supplier management, PO creation, and audit logging.
- Mobile-optimized dialogs and status management (draft, sent, received, cancelled).
- Auto-generation functionality for low-stock items.
- Integrated supplier database with contact management.
- Auto-populate products feature loads all supplier's linked products with complete details (category, brand, price).
- Form validation and real-time total calculations with proper field binding.
- Fixed stock movement creation during PO receipt with proper database constraints and cache invalidation.
- Complete PO deletion workflow with automatic stock reversal and inventory movement tracking for received orders.

### Layout Consistency
All main application pages use the standard FurniliLayout component for consistent navigation and branding:
- Dashboard, Products, Categories, BOQ, Material Requests, Projects, Inventory Movement, Purchase Orders, and Suppliers all implement the unified sidebar navigation system.
- Login pages intentionally exclude the layout for focused authentication experience.
- Layout provides collapsible sidebar, header navigation, and consistent Furnili branding across all modules.

## External Dependencies

### Frontend
- **UI Components**: Radix UI
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **File Upload**: React Dropzone
- **OCR Processing**: Tesseract.js (client-side)
- **Date Manipulation**: date-fns
- **Charts**: Recharts

### Backend
- **Database**: PostgreSQL (via @neondatabase/serverless or standard pg driver)
- **Authentication**: bcryptjs, jsonwebtoken
- **File Upload**: Multer
- **Session Management**: connect-pg-simple
- **Validation**: Zod