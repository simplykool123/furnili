-- =============================================
-- FURNILI MANAGEMENT SYSTEM - COMPLETE SQL EXPORT
-- For Hostinger Shared Hosting Deployment
-- Generated: January 23, 2025
-- =============================================

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS price_comparisons CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS boq_uploads CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS petty_cash_expenses CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS request_items CASCADE;
DROP TABLE IF EXISTS material_requests CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- TABLE STRUCTURES
-- =============================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    employee_id VARCHAR(100),
    aadhar_number VARCHAR(12),
    phone VARCHAR(15),
    address TEXT,
    salary DECIMAL(10,2),
    overtime_rate DECIMAL(10,2) DEFAULT 50.00,
    photo_url VARCHAR(255),
    document_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    size VARCHAR(100),
    thickness VARCHAR(100),
    price_per_unit DECIMAL(10,2) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 10,
    unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
    sku VARCHAR(100) UNIQUE,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material requests table
CREATE TABLE material_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    client_name VARCHAR(255),
    site_location VARCHAR(255),
    total_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    boq_reference VARCHAR(255),
    notes TEXT,
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP,
    completed_date TIMESTAMP
);

-- Request items table
CREATE TABLE request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending'
);

-- Attendance table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    total_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Petty cash expenses table
CREATE TABLE petty_cash_expenses (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    paid_to VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_by_staff_id INTEGER REFERENCES users(id),
    category VARCHAR(100),
    description TEXT,
    receipt_url VARCHAR(255),
    payment_mode VARCHAR(50) DEFAULT 'cash',
    is_credit BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock movements table
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(10,2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BOQ uploads table
CREATE TABLE boq_uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'uploaded',
    extracted_text TEXT,
    processed_items JSONB,
    user_id INTEGER REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Price comparisons table
CREATE TABLE price_comparisons (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    supplier_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    min_quantity INTEGER,
    delivery_time VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, name, role, is_active) VALUES
('admin', 'admin@furnili.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin', true);

-- Insert sample categories
INSERT INTO categories (name, description, is_active) VALUES
('Steel', 'Steel products and materials', true),
('Wood', 'Wooden materials and lumber', true),
('Hardware', 'Hardware and fasteners', true),
('Tools', 'Construction tools and equipment', true),
('Electrical', 'Electrical components and wires', true);

-- Insert sample products
INSERT INTO products (name, category, brand, size, thickness, price_per_unit, current_stock, min_stock, unit, sku) VALUES
('Steel Rods - 12mm', 'Steel', 'Tata Steel', '12mm', '12mm', 450.00, 100, 20, 'pieces', 'STL-ROD-12MM'),
('Plywood Sheet', 'Wood', 'Greenply', '4x8 ft', '18mm', 2500.00, 25, 5, 'sheets', 'PLY-18MM-4X8'),
('Screws - Wood', 'Hardware', 'Godrej', '2 inch', '4mm', 5.50, 500, 50, 'pieces', 'SCR-WOOD-2IN');

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_material_requests_status ON material_requests(status);
CREATE INDEX idx_material_requests_user_id ON material_requests(user_id);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_petty_cash_date ON petty_cash_expenses(date);

-- =============================================
-- END OF SQL EXPORT
-- =============================================