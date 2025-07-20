# Inventory Management & Material Request System

A comprehensive offline inventory management system with BOQ OCR processing, role-based access control, and material request workflows. Built with React, Express.js, and MongoDB for complete self-hosted deployment.

## 🌟 Features

### 🔐 Authentication & Role-Based Access
- **JWT-based authentication** with secure session management
- **Four user roles** with specific permissions:
  - **Admin**: Full system control, user management, all features
  - **Manager**: Product management, BOQ uploads, material requests
  - **Storekeeper**: Inventory management, request approval/rejection
  - **User**: Submit material requests, view request history

### 📦 Product Management
- Complete product catalog with categories, brands, and specifications
- Image upload support for product visualization
- Real-time stock tracking with automated low-stock alerts
- SKU management and barcode support
- Bulk import/export capabilities via CSV

### 📄 BOQ Processing with OCR
- **PDF upload support** with drag-and-drop interface
- **Tesseract.js OCR integration** for automated data extraction
- Intelligent parsing of:
  - Item descriptions and quantities
  - Units of measurement and rates
  - Total amounts and project details
- **Product matching system** to link BOQ items with inventory
- Auto-generation of material requests from processed BOQs

### 📥 Material Request Workflow
- **Complete request lifecycle** management:
  - Submit → Pending → Approved → Issued → Completed
- Multi-item requests with quantity and pricing details
- Priority levels (High, Medium, Low) for urgent requests
- BOQ reference linking for traceability
- **Real-time stock validation** during request creation
- Email notifications for status changes (configurable)

### 📊 Advanced Reporting & Analytics
- **Role-specific dashboards** with relevant metrics
- **CSV export functionality** for all data types:
  - Complete inventory reports
  - Material request logs by date/client
  - Low stock alerts and recommendations
  - Financial summaries and valuations
- **Category-wise analysis** with visual charts
- **Stock movement tracking** with audit trails

### 💻 Offline & Self-Hosted Deployment
- **No cloud dependencies** - runs completely on local infrastructure
- **MongoDB integration** for reliable data persistence
- **File storage** for uploaded images and documents
- **Multi-user support** with session management
- **Backup and restore** capabilities
- **Docker support** for containerized deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB 4.4+ (local installation)
- Git for version control

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd inventory-management-system
