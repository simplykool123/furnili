<?php
/**
 * Test database connection and admin user
 */

require_once 'config/database.php';
require_once 'includes/functions.php';

echo "<h2>Furnili MS - Database Connection Test</h2>";

// Test database connection
try {
    $db = Database::connect();
    echo "<p style='color: green;'>✓ Database connection successful!</p>";
    
    // Test if users table exists
    $stmt = $db->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "<p style='color: green;'>✓ Users table exists!</p>";
        
        // Check admin user
        $stmt = $db->prepare("SELECT username, email, name, role FROM users WHERE username = 'admin'");
        $stmt->execute();
        $admin = $stmt->fetch();
        
        if ($admin) {
            echo "<p style='color: green;'>✓ Admin user found!</p>";
            echo "<pre>";
            print_r($admin);
            echo "</pre>";
            
            // Test password verification
            $stmt = $db->prepare("SELECT password FROM users WHERE username = 'admin'");
            $stmt->execute();
            $user = $stmt->fetch();
            
            if (password_verify('admin123', $user['password'])) {
                echo "<p style='color: green;'>✓ Password verification successful!</p>";
            } else {
                echo "<p style='color: red;'>✗ Password verification failed!</p>";
                echo "<p>Stored hash: " . $user['password'] . "</p>";
                
                // Generate new hash
                $newHash = password_hash('admin123', PASSWORD_DEFAULT);
                echo "<p>New hash for 'admin123': " . $newHash . "</p>";
                
                // Update the password
                $stmt = $db->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
                $stmt->execute([$newHash]);
                echo "<p style='color: blue;'>Updated admin password hash!</p>";
            }
        } else {
            echo "<p style='color: red;'>✗ Admin user not found!</p>";
            
            // Create admin user
            $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $stmt = $db->prepare("INSERT INTO users (username, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)");
            $stmt->execute(['admin', 'admin@furnili.com', $hashedPassword, 'System Administrator', 'admin']);
            echo "<p style='color: blue;'>Created admin user!</p>";
        }
    } else {
        echo "<p style='color: red;'>✗ Users table not found! Please import database.sql first.</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'>✗ Database error: " . $e->getMessage() . "</p>";
    
    if (strpos($e->getMessage(), 'Unknown database') !== false) {
        echo "<p style='color: orange;'>Please create the database 'furnili_ms' first.</p>";
    }
}

echo "<hr>";
echo "<p><a href='login.php'>→ Go to Login Page</a></p>";
?>