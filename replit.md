# Furnili Workforce Management System

## Overview
This project is a comprehensive workforce management platform, developed as a modern web application with a React frontend and an Express backend. Its primary purpose is to provide robust solutions for staff management, project tracking, inventory control, and financial oversight. Key capabilities include professional PDF export for quotes, mobile-first design, and role-based access control. The system aims to enhance operational efficiency and streamline workflows for businesses, maintaining a consistent Furnili brand identity.

## User Preferences
Preferred communication style: Simple, everyday language.
Form Layout Requirements: All popup forms must be optimized for screen size with compact layouts - space-y-3 form spacing, h-8 input heights, text-xs labels, max-w-[90vw] mobile width, reduced spacing between rows for maximum space efficiency.

## System Architecture

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
- **Authentication**: JWT-based authentication with role-based access control
- **File Processing**: Tesseract.js for OCR (Optical Character Recognition)

### Feature Specifications

#### Authentication & Authorization
- JWT token-based authentication with four distinct user roles: Admin, Manager, Staff, and Store Incharge.
- Role-based access control governs route and UI component visibility.
- **Project Management RBAC**: Regular users (staff/store_incharge) have read-only access - New Project button and Edit/Delete actions are hidden for non-admin/manager roles.
- **Product Management RBAC**: Store keepers have read-only access to product details with restricted add/edit/delete actions, but can perform stock adjustments through dedicated Stock Adjustment dialog. Regular users have full read-only access. Only admin and manager can add, edit, or delete products.
- **Material Request Creation**: All authenticated users can create material requests with proper role validation.
- **Master Data RBAC**: Master Data section in sidebar is completely hidden from staff and store_incharge users - only admin and manager can access Clients, Users, Sales Products, and Categories.
- **Project Details RBAC**: Quotes and Finances tabs are hidden from regular users (staff/store_incharge) in Project Detail view - only admin and manager can access financial modules.
- **Material Order Cost RBAC**: Material order cost information is hidden from regular users in the Orders tab - only admin and manager can view cost details while all users can see order status and information.
- **Project Information RBAC**: Notes and Details tabs are hidden from regular users (staff/store_incharge) - only admin and manager can access detailed project information and notes.
- **Client Contact RBAC**: Client contact information (phone numbers) in project headers is hidden from regular users - only admin and manager can view client contact details.
- **Dashboard Layout RBAC**: Staff and store keeper users have a streamlined dashboard with side-by-side "My Attendance | My Tasks" layout and optimized action buttons, while admin/manager users retain the full comprehensive dashboard.

#### Product Management
- Comprehensive product catalog including categories, brands, specifications, image upload, real-time stock tracking, SKU management, and low-stock alerts.
- Stock movement tracking with audit trails.

#### BOQ Processing System
- PDF upload with OCR (Tesseract.js) for automated text extraction.
- Intelligent parsing of quantities, units, rates, and descriptions.
- Product matching with existing inventory and auto-generation of material requests.

#### Material Request Workflow
- Lifecycle management: Submit → Pending → Approved → Issued → Completed.
- Supports multi-item requests with quantity validation and priority levels.
- BOQ reference linking for traceability and stock validation.
- **Dynamic Pricing**: New requests automatically use current product prices from inventory.
- **Fixed Cost Recording**: Once projects are completed, material costs are frozen in Project Finance for accurate historical tracking and profitability analysis.
- **Automatic Stock Management**: When material requests are marked as "issued", inventory stock is automatically deducted. If an issued request is cancelled/rejected/deleted, stock is automatically restored with complete audit trail via stock movements.

#### Reporting & Analytics
- Role-specific dashboards with key metrics.
- CSV export for various data types, including category-wise analysis and financial summaries.

#### Professional PDF Quote Generation
- Fixed and optimized PDF layout with exact specifications.
- Professional table format with seamless connectivity between sections.
- Consistent 31px row heights for totals and blank rows.
- Compact bottom section with 4px padding and 1.1 line-height.
- Company signature stamp (70px width) without horizontal lines.
- **CRITICAL**: PDF calculation logic is FINAL and correct - calculates from item line totals with proper packaging (2%), transportation (₹5,000), and GST (18%). Any discrepancies should be fixed in system/database values, NOT PDF calculations.

#### Quote Management Interface
- **Fixed Quote Action Buttons**: Edit, Delete, and View buttons now fully functional with proper dialog components.
- **Enhanced Quote Items Creation**: Resolved issue where quote items weren't saving during quote creation.
- **Database Schema Fix**: Made `sales_product_id` nullable to support manual item entries.
- **Complete CRUD Operations**: Added PUT and DELETE API routes for quote management with proper authentication.
- **Mobile-Optimized Dialogs**: All quote management dialogs follow mobile-first design principles.
- **Automated Quote Title Generation**: Quote titles are now automatically generated based on project names (e.g., "Estimate for 2BHK" where "2BHK" is extracted from project name). The system intelligently identifies meaningful parts like BHK patterns, property types, and business types.
- **Quote Status Management**: Added status editing functionality allowing users to change quote status from "draft" to "sent", "approved", "rejected", "expired" through EditQuote form.
- **WhatsApp PDF Sharing**: Integrated WhatsApp sharing functionality with PDF generation and professional message formatting.
- **Size Field Integration**: Added Size column to Sales Products with consistent field name across both Sales Products and Quote modules for seamless data consistency.

#### Staff Management & Payroll
- Comprehensive staff management including attendance tracking, ID details, salary information, and document storage.
- Admin check-in/out controls and automated payroll calculation with overtime and deductions.

#### Petty Cash Management
- Manual expense entry and OCR processing for UPI payment screenshots.
- Dashboard with filtering and search.
- Balance tracking with debit/credit indicators.

#### Project Management
- Table-based project dashboard with auto-generated project codes.
- Project creation with client, project, and address details.
- Advanced filtering by stage and client.
- Unified client database.
- Comprehensive project stages: Prospect → Recce Done → Design In Progress → Design Approved → Estimate Given → Client Approved → Production → Installation → Handover → Completed, with "On Hold" / "Lost" optional statuses.
- Integrated Quotes functionality as a sub-module within Project Management.

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