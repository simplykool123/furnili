<?php
/**
 * Database Setup Script - Creates all required tables
 */

echo "<!DOCTYPE html>
<html>
<head>
    <title>Database Setup - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .sql { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Database Setup - Furnili Management System</h1>";

try {
    require_once 'config/database.php';
    $db = Database::connect();
    
    echo "<p class='success'>✓ Database connection successful</p>";
    
    // SQL for creating all tables
    $sql_tables = [
        'users' => "
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role ENUM('admin', 'manager', 'storekeeper', 'user') DEFAULT 'user',
                employee_id VARCHAR(20),
                phone VARCHAR(15),
                aadhar_number VARCHAR(12),
                salary DECIMAL(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'products' => "
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                category VARCHAR(100),
                brand VARCHAR(100),
                size VARCHAR(50),
                thickness VARCHAR(50),
                price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
                current_stock INT DEFAULT 0,
                min_stock INT DEFAULT 10,
                unit VARCHAR(20) DEFAULT 'pieces',
                sku VARCHAR(50) UNIQUE,
                image_url VARCHAR(255),
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_brand (brand),
                INDEX idx_sku (sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'material_requests' => "
            CREATE TABLE IF NOT EXISTS material_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                description TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
                priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
                notes TEXT,
                boq_reference VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_status (status),
                INDEX idx_priority (priority),
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'petty_cash_expenses' => "
            CREATE TABLE IF NOT EXISTS petty_cash_expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expense_date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                is_credit BOOLEAN DEFAULT 0,
                paid_to VARCHAR(200),
                paid_by VARCHAR(100),
                category VARCHAR(100),
                receipt_image VARCHAR(255),
                ocr_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_date (expense_date),
                INDEX idx_category (category),
                INDEX idx_type (is_credit)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'attendance' => "
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                check_in TIMESTAMP NOT NULL,
                check_out TIMESTAMP NULL,
                break_time_minutes INT DEFAULT 0,
                total_hours DECIMAL(4,2),
                overtime_hours DECIMAL(4,2) DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_date (user_id, check_in),
                INDEX idx_date (check_in)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'stock_movements' => "
            CREATE TABLE IF NOT EXISTS stock_movements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
                quantity INT NOT NULL,
                unit_price DECIMAL(10,2) DEFAULT 0,
                total_value DECIMAL(12,2) DEFAULT 0,
                notes TEXT,
                reference_type VARCHAR(50),
                reference_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                INDEX idx_product (product_id),
                INDEX idx_type (movement_type),
                INDEX idx_date (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ",
        
        'boq_uploads' => "
            CREATE TABLE IF NOT EXISTS boq_uploads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_size INT,
                user_id INT NOT NULL,
                status ENUM('uploaded', 'processing', 'completed', 'failed') DEFAULT 'uploaded',
                extracted_text LONGTEXT,
                processed_data JSON,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_status (status),
                INDEX idx_user (user_id),
                INDEX idx_date (upload_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        "
    ];
    
    echo "<h2>Creating Database Tables...</h2>";
    
    foreach ($sql_tables as $table_name => $sql) {
        try {
            $db->exec($sql);
            echo "<p class='success'>✓ Table '$table_name' created successfully</p>";
        } catch (PDOException $e) {
            echo "<p class='error'>✗ Error creating table '$table_name': " . $e->getMessage() . "</p>";
        }
    }
    
    // Create default admin user if not exists
    echo "<h2>Creating Default Admin User...</h2>";
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
    $stmt->execute();
    $adminExists = $stmt->fetch()['count'] > 0;
    
    if (!$adminExists) {
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password, name, role, employee_id, is_active, created_at) 
            VALUES ('admin', 'admin@furnili.com', ?, 'System Administrator', 'admin', 'EMP001', 1, NOW())
        ");
        
        if ($stmt->execute([password_hash('admin123', PASSWORD_DEFAULT)])) {
            echo "<p class='success'>✓ Default admin user created</p>";
            echo "<p><strong>Login Credentials:</strong><br>
                  Username: admin<br>
                  Password: admin123</p>";
        } else {
            echo "<p class='error'>✗ Failed to create admin user</p>";
        }
    } else {
        echo "<p class='success'>✓ Admin user already exists</p>";
    }
    
    echo "<h2>Database Setup Complete!</h2>";
    echo "<p class='success'>All tables have been created successfully.</p>";
    echo "<p><a href='test_data.php?generate=test_data'>Generate Test Data</a> | 
          <a href='login.php'>Go to Login</a> | 
          <a href='index.php'>Go to Dashboard</a></p>";
    
} catch (Exception $e) {
    echo "<p class='error'>Database setup failed: " . $e->getMessage() . "</p>";
    echo "<p>Please check your database configuration in config/database.php</p>";
    echo "<p><a href='hostinger_setup.php'>Back to Setup</a></p>";
}

echo "</body></html>";
?>