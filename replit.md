# Furnili Workforce Management System

## Overview
This is a professional workforce management platform designed as a modern web application with React frontend and Express backend. It provides comprehensive staff management, project tracking, inventory control, financial management, and role-based access control. The system features a clean, mobile-first design with the Furnili brand identity and optimized performance.

## Recent Changes (August 1, 2025)
✓ **COMPLETE AI FUNCTIONALITY REMOVAL**: Successfully removed all AI-related functionality from the moodboard system for maximum simplicity as requested by user
✓ **SIMPLIFIED MOODBOARD SYSTEM**: Moodboards now use manual image uploads only - no external AI dependencies, API keys, or complex provider systems
✓ **CLEANED DATABASE SCHEMA**: Removed AI-specific fields (aiPrompt) from moodboard schema, simplified sourceType to "manual_upload" only
✓ **REMOVED AI ENDPOINTS**: Eliminated entire AI image generation API endpoint (/api/generate-moodboard-images) and all related provider integrations
✓ **SIMPLIFIED DEPENDENCIES**: Removed OpenAI imports and initialization code from server routes for cleaner, lighter architecture
✓ **ENHANCED USER EXPERIENCE**: Moodboard creation now focuses purely on user-uploaded images without confusing AI options or setup requirements
✓ **MOBILE-FIRST DESIGN MAINTAINED**: All moodboard functionality remains fully mobile-optimized with compact layouts and responsive design
✓ **ICON SWAP COMPLETED**: Successfully swapped icons between System Settings (now Database icon) and Master Data (now Settings icon) as requested
✓ **IMAGE DISPLAY ISSUE RESOLVED PERMANENTLY**: Fixed all recurring image issues by addressing root causes - added @types/multer, proper projectFileUpload infrastructure, corrected database paths, and verified HTTP 200 file serving
✓ **MOODBOARD FORM MOBILE OPTIMIZATION**: Fully optimized moodboard creation form with compact mobile-friendly design - space-y-3 form spacing, h-8 input heights, text-xs labels, max-w-[90vw] mobile width, reduced padding and compact preview section
✓ **SIDEBAR NAVIGATION ENHANCEMENT**: Reorganized navigation with Master Data section positioned at the end containing Clients, Users, Sales Products, and Categories, while System Settings contains operational tools like Inventory Movement, OCR Wizard, Price Comparison, Display Settings, and Backups
✓ **PROJECTQUOTES ERROR RESOLUTION**: Fixed all undefined toFixed() errors with comprehensive null safety checks and enhanced totals calculation with fallback values for robust error prevention
✓ **ACCESSIBILITY COMPLIANCE**: Resolved dialog accessibility warnings by adding proper DialogTitle and aria-describedby attributes across all dialog components
✓ **QUOTES MODULE ARCHITECTURAL CORRECTION**: Successfully moved Quotes functionality from standalone module to integrated Project Management sub-module as per user requirements - Quotes now accessible via Project Details → Quotes tab
✓ **PROJECT-CENTRIC QUOTES INTEGRATION**: Quotes module now properly contextual within project management system, removing standalone navigation entry and integrating comprehensive quote management directly into project workflow
✓ **NAVIGATION CLEANUP**: Removed standalone Quotes route from main sidebar navigation and App.tsx routing, maintaining clean project-centric architecture
✓ **COMPONENT MODULARIZATION**: Created dedicated ProjectQuotes component (client/src/components/Project/ProjectQuotes.tsx) with full quote management functionality integrated into ProjectDetail interface
✓ **MOBILE-OPTIMIZED QUOTES TAB**: Quotes functionality maintains mobile-first design principles with compact layouts, responsive forms, and optimized mobile interface within project context

**Previous System Optimizations (July 31, 2025):**
✓ **Image Display System Fully Resolved**: Fixed all file upload, storage, and display issues across the platform
✓ **File Upload Configuration**: Updated multer to use proper diskStorage with file extensions instead of temporary files
✓ **Static File Serving**: Corrected MIME type handling and file path construction for all uploaded content
✓ **Database File References**: Repaired existing project file entries to use correct file paths
✓ **Receipt Image Display**: Fixed petty cash receipt images in both thumbnail and full-size dialog views
✓ **File Deletion Functionality**: Resolved ES module import issues in file deletion routes
✓ **Project Finances Receipt Images**: Fixed receipt image display in Project Detail → Finances tab with optimized 2-column layout
✓ **Dual Location Consistency**: Both main Petty Cash page and Project Finances show identical expense details dialogs with working receipt images
✓ **Dialog Scroll Optimization**: Implemented proper scrolling functionality for all large dialog forms (Product forms, Project creation, BOQ upload)
✓ **Compact Form Design**: Applied space-efficient styling across all dialog forms with reduced spacing, smaller input heights, and optimized layouts
✓ **Copy-Paste Image Upload**: Enhanced product image upload with clipboard paste support, drag-and-drop functionality, and proper file extension handling for pasted images
✓ **Delete Confirmation Standardization**: All modules now use consistent "Are you Freaking Sure?" AlertDialog pattern instead of window.confirm()
✓ **POPUP FORM OPTIMIZATION COMPLETED**: All dialog forms now use compact layouts with space-y-3 form spacing, h-8 input heights, text-xs labels, and max-w-[90vw] mobile width optimization across Users, Clients, SalesProducts, Projects, and PettyCash modules for maximum space efficiency
✓ **PROFESSIONAL QUOTES SYSTEM COMPLETED**: Comprehensive quote generation system implemented with enhanced database schema, full CRUD operations, professional PDF export with html2pdf.js, Excel format compliance (Item Details, Qty, UOM, Rate, Discount, Amount columns), auto-populated client details, sales product integration, discount calculations, tax handling, and mobile-optimized interface - fully functional and ready for deployment
✓ **MOBILE OPTIMIZATION COMPLETE**: Quotes system fully optimized for mobile with compact layouts, responsive grid systems, mobile-specific card views, optimized form layouts with reduced heights and spacing, mobile-friendly tables that switch to card format, compact stats display, and fully responsive dialogs - maximum mobile usability achieved

## User Preferences
Preferred communication style: Simple, everyday language.
**Form Layout Requirements**: All popup forms must be optimized for screen size with compact layouts - space-y-3 form spacing, h-8 input heights, text-xs labels, max-w-[90vw] mobile width, reduced spacing between rows for maximum space efficiency.

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
- Four distinct user roles: Admin, Manager, Staff, and Store Incharge, with role-based access control for routes and UI components.
- Manager Role: Team & module supervisor with permissions to view/manage teams, approve/review entries, access reports and pricing, but cannot access core settings, backups, or user management.

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