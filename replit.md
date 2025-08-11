# Furnili Management System

## Overview
The Furnili Management System is a comprehensive web application designed to enhance operational efficiency and streamline workflows for businesses. Developed with a React frontend and Express backend, it provides robust solutions for staff management, project tracking, inventory control, and financial oversight. Key capabilities include professional PDF export for quotes, mobile-first design, and role-based access control, all while maintaining a consistent Furnili brand identity. The system aims to be a modern, integrated platform for business management.

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