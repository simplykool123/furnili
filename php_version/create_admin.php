<?php
/**
 * Create Admin User - Ensures admin user exists with correct password
 */
session_start();

echo "<!DOCTYPE html>
<html>
<head>
    <title>Create Admin User - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        .section { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>👤 Create Admin User</h1>";

try {
    require_once 'config/database.php';
    require_once 'includes/functions.php';
    require_once 'includes/auth.php';
    
    $db = Database::connect();
    
    echo "<div class='section'>";
    echo "<h3>Step 1: Check Existing Admin User</h3>";
    
    $stmt = $db->prepare("SELECT id, username, password, name, role FROM users WHERE username = 'admin'");
    $stmt->execute();
    $existingAdmin = $stmt->fetch();
    
    if ($existingAdmin) {
        echo "<p class='info'>Admin user already exists</p>";
        echo "<p>ID: " . $existingAdmin['id'] . "</p>";
        echo "<p>Username: " . $existingAdmin['username'] . "</p>";
        echo "<p>Name: " . $existingAdmin['name'] . "</p>";
        echo "<p>Role: " . $existingAdmin['role'] . "</p>";
        
        // Test password
        if (password_verify('admin123', $existingAdmin['password'])) {
            echo "<p class='success'>✓ Password 'admin123' is correct</p>";
        } else {
            echo "<p class='error'>✗ Password 'admin123' does not match stored hash</p>";
            echo "<p>Stored hash: " . substr($existingAdmin['password'], 0, 50) . "...</p>";
            echo "<p>Hash length: " . strlen($existingAdmin['password']) . "</p>";
            
            // Update password
            echo "<h4>Updating Admin Password</h4>";
            $newHash = password_hash('admin123', PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
            if ($stmt->execute([$newHash, $existingAdmin['id']])) {
                echo "<p class='success'>✓ Admin password updated successfully</p>";
                echo "<p>New hash: " . substr($newHash, 0, 50) . "...</p>";
            } else {
                echo "<p class='error'>✗ Failed to update password</p>";
            }
        }
    } else {
        echo "<p class='info'>No admin user found, creating one...</p>";
        
        // Create admin user
        $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password, name, role, employee_id, is_active, created_at) 
            VALUES ('admin', 'admin@furnili.com', ?, 'System Administrator', 'admin', 'EMP001', 1, NOW())
        ");
        
        if ($stmt->execute([$hashedPassword])) {
            echo "<p class='success'>✓ Admin user created successfully</p>";
            echo "<p>Username: admin</p>";
            echo "<p>Password: admin123</p>";
            echo "<p>Email: admin@furnili.com</p>";
            echo "<p>Role: admin</p>";
        } else {
            echo "<p class='error'>✗ Failed to create admin user</p>";
        }
    }
    echo "</div>";
    
    echo "<div class='section'>";
    echo "<h3>Step 2: Test Login Function</h3>";
    
    $loginTest = loginUser('admin', 'admin123');
    
    if ($loginTest['success']) {
        echo "<p class='success'>✓ Login test successful!</p>";
        echo "<p>User data returned:</p>";
        echo "<pre>" . print_r($loginTest['user'], true) . "</pre>";
        
        // Check session
        if (isLoggedIn()) {
            echo "<p class='success'>✓ Session created successfully</p>";
            echo "<p>Session data:</p>";
            echo "<pre>" . print_r($_SESSION, true) . "</pre>";
        } else {
            echo "<p class='error'>✗ Session not created properly</p>";
        }
        
    } else {
        echo "<p class='error'>✗ Login test failed: " . $loginTest['message'] . "</p>";
    }
    echo "</div>";
    
    echo "<div class='section'>";
    echo "<h3>Step 3: Ready to Login</h3>";
    if ($loginTest['success']) {
        echo "<p class='success'>✓ Admin user is ready for login!</p>";
        echo "<p><strong>Login Credentials:</strong></p>";
        echo "<ul>";
        echo "<li><strong>Username:</strong> admin</li>";
        echo "<li><strong>Password:</strong> admin123</li>";
        echo "</ul>";
        echo "<p><a href='login.php' style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;'>Go to Login Page</a></p>";
        echo "<p><a href='debug_login.php'>Debug Login Process</a></p>";
    } else {
        echo "<p class='error'>Please resolve the issues above before attempting to login.</p>";
    }
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='section'>";
    echo "<h3>Error</h3>";
    echo "<p class='error'>Error: " . $e->getMessage() . "</p>";
    echo "<p>Please check your database configuration and try again.</p>";
    echo "</div>";
}

echo "</body></html>";
?>