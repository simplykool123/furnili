# Comprehensive Inventory Management System

## Overview

This is a full-featured inventory management system built as a web application with React frontend and Express backend. The system includes multi-user authentication, role-based access control, inventory tracking, staff management, financial tracking, and task allocation. It's designed for businesses that need comprehensive inventory and staff management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

- ✅ Added category management system with database schema and API
- ✅ Created Categories page with create, edit, delete functionality  
- ✅ Updated ProductForm to use dynamic categories from database
- ✅ Fixed navigation to include Categories menu item
- ✅ Updated product filters to use dynamic categories
- ✅ **Major Feature**: Implemented comprehensive bulk product import/export functionality
  - CSV/Excel file import with validation and error reporting
  - Customizable export with field selection and filtering options
  - Template download for proper import formatting
  - Role-based permissions (Admin/Manager for import, all users for export)
- ✅ **Critical Fix**: Resolved React rendering error in Dashboard and Header components
  - Fixed issue where product objects were being rendered directly as React children
  - Updated data structures and display logic for proper array handling
- ✅ **Major Enhancement**: Transformed attendance module into comprehensive staff management & payroll system
  - Enhanced database schema with Aadhar numbers, employee IDs, salary details, document storage
  - Admin check-in/out controls for all staff members
  - Comprehensive attendance dashboard with real-time stats
  - Staff management with photos, documents, and personal details
  - Automated payroll calculation with overtime and deductions
  - Pay slip generation and processing system
  - 5-tab interface: Dashboard, Check In/Out, Attendance Records, Staff Management, Payroll
- ✅ **Compact Material Request Form**: Redesigned with tab-friendly grid layout
  - Description, Brand, Type, Size, Thickness columns
  - Automatic row addition on tab navigation
  - Streamlined data entry for fast material requests
- 🔄 Implementing comprehensive multi-user login system with Admin/Staff roles
- 🔄 Adding inventory inward/outward management with automatic quantity tracking
- 🔄 Creating petty cash tracker with OCR receipt processing
- 🔄 Developing task allocation system for staff management

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight routing library)
- **State Management**: TanStack React Query for server state
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Drizzle but can work with other SQL databases)
- **Authentication**: JWT-based authentication with role-based access control
- **File Processing**: Tesseract.js for OCR processing of BOQ PDFs

### Key Components

#### Authentication & Authorization
- JWT token-based authentication system
- Four distinct user roles with specific permissions:
  - **Admin**: Full system control, user management, all features
  - **Manager**: Product management, BOQ uploads, material requests
  - **Storekeeper**: Inventory management, request approval/rejection
  - **User**: Submit material requests, view request history
- Role-based route protection and UI component rendering

#### Product Management
- Complete product catalog with categories, brands, specifications
- Image upload support with file storage
- Real-time stock tracking with automated low-stock alerts
- SKU management and inventory control
- Stock movement tracking with audit trails

#### BOQ Processing System
- PDF upload with drag-and-drop interface
- Tesseract.js OCR integration for automated text extraction
- Intelligent parsing of quantities, units, rates, and descriptions
- Product matching system to link BOQ items with existing inventory
- Auto-generation of material requests from processed BOQs

#### Material Request Workflow
- Complete lifecycle management: Submit → Pending → Approved → Issued → Completed
- Multi-item requests with quantity validation
- Priority levels (High, Medium, Low) for request management
- BOQ reference linking for traceability
- Real-time stock validation during request creation

#### Reporting & Analytics
- Role-specific dashboards with relevant metrics
- CSV export functionality for all data types
- Category-wise analysis and financial summaries
- Low stock alerts and recommendations
- Stock movement tracking with detailed audit trails

## Data Flow

1. **User Authentication**: JWT tokens stored in localStorage, validated on each request
2. **Product Management**: CRUD operations through REST API with real-time updates
3. **BOQ Processing**: File upload → OCR processing → Data extraction → Product matching → Request generation
4. **Material Requests**: Creation → Validation → Approval workflow → Inventory updates
5. **Reporting**: Data aggregation → CSV generation → Download/export functionality

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives for accessible components
- **Form Handling**: React Hook Form with Zod validation
- **File Upload**: React Dropzone for drag-and-drop functionality
- **OCR Processing**: Tesseract.js for client-side text recognition
- **Date Handling**: date-fns for date manipulation
- **Charts**: Recharts for data visualization

### Backend Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connections
- **Authentication**: bcryptjs for password hashing, jsonwebtoken for JWT
- **File Upload**: Multer for handling multipart/form-data
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Validation**: Zod for runtime type checking and validation

### Development Dependencies
- **Build Tools**: esbuild for backend bundling, Vite for frontend
- **Type Checking**: TypeScript compiler with strict mode
- **Database Migrations**: Drizzle Kit for schema management

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR (Hot Module Replacement)
- tsx for running TypeScript backend in development
- File watching and automatic restart capabilities
- Development-specific error overlays and debugging tools

### Production Build
- Frontend: Vite builds optimized static assets to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js` 
- Single production command serves both frontend and backend
- Static file serving for uploaded images and BOQ files

### Self-Hosting Considerations
- **Database**: PostgreSQL instance required (local or cloud)
- **File Storage**: Local filesystem storage for uploads
- **Environment Variables**: DATABASE_URL and JWT_SECRET required
- **Network**: Designed for LAN/private network deployment
- **Offline Capability**: All processing happens locally, no external API dependencies for core functionality

### Configuration Requirements
- PostgreSQL database with connection string
- File system write permissions for uploads directory
- Node.js runtime environment
- Environment variables for database and JWT configuration

The system is architected to be completely self-contained, requiring only a PostgreSQL database and Node.js runtime to operate fully offline in enterprise or private network environments.