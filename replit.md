# Comprehensive Inventory Management System

## Overview
This is a full-featured inventory management system designed as a web application with a React frontend and Express backend. It provides multi-user authentication, role-based access control, inventory tracking, staff management, financial tracking, and task allocation. The system aims to offer comprehensive inventory and staff management capabilities for businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system features a professional and consistent UI/UX based on the "Furnili Design System." This includes a unified component library (FurniliLayout, FurniliCard, FurniliButton, FurniliStatsCard) with a consistent brown theme (hsl(28, 100%, 25%)). It utilizes professional color variables and consistent styling across components, ensuring a coherent visual identity with proper spacing and modern card-based layouts. The UI is designed to be mobile-responsive, optimizing layouts, forms, and tables for various screen sizes.

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
- JWT token-based authentication.
- Four distinct user roles: Admin, Manager, Storekeeper, and User, with role-based access control for routes and UI components.

#### Product Management
- Comprehensive product catalog with categories, brands, and specifications.
- Image upload, real-time stock tracking, SKU management, and low-stock alerts.
- Stock movement tracking with audit trails.

#### BOQ Processing System
- PDF upload functionality with drag-and-drop.
- Tesseract.js OCR for automated text extraction from PDFs.
- Intelligent parsing of quantities, units, rates, and descriptions.
- Product matching to link BOQ items with existing inventory.
- Auto-generation of material requests from processed BOQs.

#### Material Request Workflow
- Lifecycle management: Submit → Pending → Approved → Issued → Completed.
- Support for multi-item requests with quantity validation and priority levels (High, Medium, Low).
- BOQ reference linking for traceability and real-time stock validation.

#### Reporting & Analytics
- Role-specific dashboards with key metrics.
- CSV export functionality for various data types.
- Category-wise analysis, financial summaries, and stock movement tracking.

#### Staff Management & Payroll
- Comprehensive staff management including attendance tracking, Aadhar numbers, employee IDs, salary details, and document storage.
- Admin check-in/out controls for staff.
- Automated payroll calculation with overtime and deductions, and pay slip generation.

#### Petty Cash Management
- Manual expense entry with category, paid to, amount, and paid by (staff).
- OCR processing using Tesseract.js for UPI payment screenshots to auto-extract transaction details.
- Dashboard with filtering and search capabilities.
- Balance tracking with debit/credit indicators and a feature to add funds.

#### Project Management
- Full table-based project dashboard with auto-generated project codes.
- Project creation with client, project, and address details.
- Advanced filtering by stage, client, and search.
- Unified client database across modules.
- Project stages updated to a comprehensive workflow: Prospect → Recce Done → Design In Progress → Design Approved → Estimate Given → Client Approved → Production → Installation → Handover → Completed, with "On Hold" / "Lost" optional statuses.

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

### Development Tools
- **Build Tools**: esbuild, Vite
- **Type Checking**: TypeScript
- **Database Migrations**: Drizzle Kit