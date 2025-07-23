<?php
/**
 * Database setup script for Furnili MS
 * Run this once to create database and tables
 */

require_once 'config/database.php';

echo "<h2>Furnili MS - Database Setup</h2>";

// Try to connect to MySQL without database first
try {
    $dsn = "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "<p style='color: green;'>✓ Connected to MySQL server</p>";
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "<p style='color: green;'>✓ Database '" . DB_NAME . "' created/verified</p>";
    
    // Switch to the database
    $pdo->exec("USE " . DB_NAME);
    
    // Read and execute SQL file
    $sqlFile = __DIR__ . '/database.sql';
    if (file_exists($sqlFile)) {
        $sql = file_get_contents($sqlFile);
        
        // Remove comments and split by semicolons
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($stmt) {
                return !empty($stmt) && !preg_match('/^(--|\/\*|\*)/', $stmt);
            }
        );
        
        foreach ($statements as $statement) {
            if (!empty(trim($statement))) {
                try {
                    $pdo->exec($statement);
                } catch (PDOException $e) {
                    // Ignore table already exists errors
                    if (strpos($e->getMessage(), 'already exists') === false) {
                        echo "<p style='color: orange;'>Warning: " . $e->getMessage() . "</p>";
                    }
                }
            }
        }
        
        echo "<p style='color: green;'>✓ Database structure created successfully</p>";
        
        // Verify admin user exists and fix password if needed
        $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE username = 'admin'");
        $stmt->execute();
        $admin = $stmt->fetch();
        
        if ($admin) {
            // Test password
            if (!password_verify('admin123', $admin['password'])) {
                // Update password
                $newHash = password_hash('admin123', PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $stmt->execute([$newHash, $admin['id']]);
                echo "<p style='color: blue;'>✓ Fixed admin password hash</p>";
            } else {
                echo "<p style='color: green;'>✓ Admin password is correct</p>";
            }
        } else {
            // Create admin user
            $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)");
            $stmt->execute(['admin', 'admin@furnili.com', $hashedPassword, 'System Administrator', 'admin']);
            echo "<p style='color: blue;'>✓ Created admin user</p>";
        }
        
        echo "<h3 style='color: green;'>Setup Complete!</h3>";
        echo "<p><strong>Default Login:</strong></p>";
        echo "<p>Username: <code>admin</code></p>";
        echo "<p>Password: <code>admin123</code></p>";
        echo "<p><a href='login.php' class='btn btn-primary'>Go to Login Page</a></p>";
        
    } else {
        echo "<p style='color: red;'>✗ database.sql file not found!</p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>✗ Database error: " . $e->getMessage() . "</p>";
    
    if (strpos($e->getMessage(), 'Access denied') !== false) {
        echo "<p style='color: orange;'>Please check your database credentials in config/database.php</p>";
    }
}
?>

<style>
body { font-family: Arial, sans-serif; margin: 20px; }
.btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
code { background: #f8f9fa; padding: 2px 5px; border-radius: 3px; }
</style>