<?php
/**
 * Hostinger Setup & Configuration Script
 * Run this after uploading files to app.furnili.in
 */

echo "<!DOCTYPE html>
<html>
<head>
    <title>Hostinger Setup - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        .code { background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; }
        .step { background: #e7f3ff; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🚀 Furnili MS - Hostinger Setup</h1>
        <p>This script helps you configure the Furnili Management System on Hostinger hosting.</p>";

// Step 1: Check PHP version
echo "<div class='step'>
        <h3>Step 1: PHP Environment Check</h3>";

$phpVersion = phpversion();
echo "<p>PHP Version: <strong>$phpVersion</strong>";

if (version_compare($phpVersion, '7.4.0', '>=')) {
    echo " <span class='success'>✓ Compatible</span></p>";
} else {
    echo " <span class='error'>✗ Requires PHP 7.4+</span></p>";
}

// Check required extensions
$required_extensions = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'fileinfo'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<p class='success'>✓ $ext extension loaded</p>";
    } else {
        echo "<p class='error'>✗ $ext extension missing</p>";
    }
}

echo "</div>";

// Step 2: Database Configuration
echo "<div class='step'>
        <h3>Step 2: Database Configuration</h3>
        <p>You need to update the database settings in <code>config/database.php</code></p>
        
        <h4>Your Hostinger Database Details:</h4>
        <p>Go to your Hostinger control panel → Databases → MySQL Databases</p>
        
        <div class='code'>
// Update these lines in config/database.php:<br>
define('DB_HOST', 'localhost');<br>
define('DB_NAME', 'u123456789_furnili'); // Your actual database name<br>
define('DB_USER', 'u123456789_user');    // Your actual database username<br>
define('DB_PASS', 'your_password');      // Your actual database password<br>
        </div>";

// Test current database connection
echo "<h4>Current Database Connection Test:</h4>";
try {
    // Try to include the database config
    if (file_exists('config/database.php')) {
        include_once 'config/database.php';
        $db = Database::connect();
        echo "<p class='success'>✓ Database connection successful!</p>";
        
        // Test basic query
        $stmt = $db->query("SELECT 1 as test");
        echo "<p class='success'>✓ Database query test passed</p>";
        
    } else {
        echo "<p class='error'>✗ config/database.php not found</p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>✗ Database connection failed: " . $e->getMessage() . "</p>";
    echo "<p><strong>Common issues:</strong></p>
          <ul>
            <li>Wrong database name, username, or password</li>
            <li>Database not created in Hostinger control panel</li>
            <li>User not assigned to the database</li>
          </ul>";
}

echo "</div>";

// Step 3: File Permissions
echo "<div class='step'>
        <h3>Step 3: File Permissions & Directory Setup</h3>";

$directories = [
    'uploads' => 'For file uploads (products, receipts, BOQs)',
    'uploads/products' => 'Product images',
    'uploads/receipts' => 'Receipt screenshots', 
    'uploads/boq' => 'BOQ PDF files',
    'uploads/payslips' => 'Generated payslips'
];

foreach ($directories as $dir => $purpose) {
    if (!is_dir($dir)) {
        if (mkdir($dir, 0755, true)) {
            echo "<p class='success'>✓ Created directory: $dir ($purpose)</p>";
        } else {
            echo "<p class='error'>✗ Failed to create directory: $dir</p>";
        }
    } else {
        echo "<p class='success'>✓ Directory exists: $dir</p>";
    }
    
    if (is_writable($dir)) {
        echo "<p class='success'>✓ $dir is writable</p>";
    } else {
        echo "<p class='warning'>⚠ $dir is not writable - may need permission fix</p>";
    }
}

echo "</div>";

// Step 4: Database Tables Setup
echo "<div class='step'>
        <h3>Step 4: Database Tables Setup</h3>";

try {
    if (isset($db)) {
        // Check if tables exist
        $tables = [
            'users', 'products', 'material_requests', 'petty_cash_expenses', 
            'attendance', 'stock_movements', 'boq_uploads'
        ];
        
        $existing_tables = [];
        foreach ($tables as $table) {
            try {
                $stmt = $db->query("SELECT 1 FROM $table LIMIT 1");
                $existing_tables[] = $table;
                echo "<p class='success'>✓ Table '$table' exists</p>";
            } catch (Exception $e) {
                echo "<p class='error'>✗ Table '$table' missing</p>";
            }
        }
        
        if (count($existing_tables) < count($tables)) {
            echo "<p><strong>Missing tables detected!</strong></p>";
            echo "<p>You need to import the database schema. Use the SQL file provided or run the setup script.</p>";
            echo "<p><a href='database_setup.php' class='btn'>Run Database Setup</a></p>";
        } else {
            echo "<p class='success'>✓ All required tables exist!</p>";
        }
    }
} catch (Exception $e) {
    echo "<p class='error'>Cannot check tables without database connection</p>";
}

echo "</div>";

// Step 5: Create admin user
echo "<div class='step'>
        <h3>Step 5: Admin User Setup</h3>";

try {
    if (isset($db)) {
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        $stmt->execute();
        $adminCount = $stmt->fetch()['count'];
        
        if ($adminCount > 0) {
            echo "<p class='success'>✓ Admin user exists</p>";
        } else {
            echo "<p class='warning'>⚠ No admin user found</p>";
            echo "<p>Creating default admin user...</p>";
            
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password, name, role, is_active, created_at) 
                VALUES ('admin', 'admin@furnili.com', ?, 'Administrator', 'admin', 1, NOW())
            ");
            
            if ($stmt->execute([password_hash('admin123', PASSWORD_DEFAULT)])) {
                echo "<p class='success'>✓ Admin user created!</p>";
                echo "<p><strong>Login credentials:</strong><br>
                      Username: admin<br>
                      Password: admin123</p>";
            }
        }
    }
} catch (Exception $e) {
    echo "<p class='error'>Could not check/create admin user: " . $e->getMessage() . "</p>";
}

echo "</div>";

// Step 6: Final checks and next steps
echo "<div class='step'>
        <h3>Step 6: Final Setup & Next Steps</h3>";

echo "<h4>Security Checklist:</h4>
      <ul>
        <li>✓ Change default admin password after first login</li>
        <li>✓ Update JWT_SECRET in config/database.php</li>
        <li>✓ Disable DEVELOPMENT_MODE in production</li>
        <li>✓ Set proper file permissions (755 for directories, 644 for files)</li>
      </ul>";

echo "<h4>Test Your Installation:</h4>
      <p><a href='simple_test.php' target='_blank'>Run Simple Test</a></p>
      <p><a href='debug.php' target='_blank'>Run Full Debug</a></p>
      <p><a href='login.php' target='_blank'>Try Login Page</a></p>";

if (isset($db) && count($existing_tables ?? []) === count($tables ?? [])) {
    echo "<h4>🎉 Ready to Launch!</h4>
          <p class='success'>Your Furnili Management System appears to be configured correctly!</p>
          <p><a href='index.php' style='background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;'>Launch Dashboard</a></p>";
} else {
    echo "<h4>⚠ Additional Setup Required</h4>
          <p>Please resolve the issues above before launching the system.</p>";
}

echo "</div>";

echo "    </div>
      </body>
      </html>";
?>