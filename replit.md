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