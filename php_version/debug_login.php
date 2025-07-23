<?php
/**
 * Debug Login Issues - Shows detailed login process
 */
session_start();

echo "<!DOCTYPE html>
<html>
<head>
    <title>Login Debug - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        .debug { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ccc; }
        pre { background: #f0f0f0; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🐛 Login Debug Tool</h1>
    <p>Debug login issues step by step</p>";

try {
    require_once 'config/database.php';
    require_once 'includes/functions.php';
    require_once 'includes/auth.php';
    
    echo "<div class='debug'>";
    echo "<h3>Step 1: Session Status</h3>";
    echo "<p>Session Status: " . (session_status() == PHP_SESSION_ACTIVE ? '<span class="success">Active</span>' : '<span class="error">Not Active</span>') . "</p>";
    echo "<p>Session ID: " . session_id() . "</p>";
    echo "<p>Current Session Data:</p>";
    echo "<pre>" . print_r($_SESSION, true) . "</pre>";
    echo "</div>";
    
    echo "<div class='debug'>";
    echo "<h3>Step 2: Database Connection</h3>";
    try {
        $db = Database::connect();
        echo "<p class='success'>✓ Database connected successfully</p>";
        
        // Check if admin user exists
        $stmt = $db->prepare("SELECT id, username, password, name, role FROM users WHERE username = 'admin'");
        $stmt->execute();
        $admin = $stmt->fetch();
        
        if ($admin) {
            echo "<p class='success'>✓ Admin user found</p>";
            echo "<p>Admin ID: " . $admin['id'] . "</p>";
            echo "<p>Admin Name: " . $admin['name'] . "</p>";
            echo "<p>Admin Role: " . $admin['role'] . "</p>";
            echo "<p>Password Hash Length: " . strlen($admin['password']) . "</p>";
        } else {
            echo "<p class='error'>✗ Admin user not found</p>";
        }
        
    } catch (Exception $e) {
        echo "<p class='error'>✗ Database error: " . $e->getMessage() . "</p>";
    }
    echo "</div>";
    
    echo "<div class='debug'>";
    echo "<h3>Step 3: Login Test</h3>";
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        
        echo "<p class='info'>Testing login with username: '$username'</p>";
        
        $result = loginUser($username, $password);
        
        echo "<p>Login Result:</p>";
        echo "<pre>" . print_r($result, true) . "</pre>";
        
        if ($result['success']) {
            echo "<p class='success'>✓ Login successful!</p>";
            echo "<p>Session after login:</p>";
            echo "<pre>" . print_r($_SESSION, true) . "</pre>";
            
            // Test isLoggedIn function
            if (isLoggedIn()) {
                echo "<p class='success'>✓ isLoggedIn() returns true</p>";
            } else {
                echo "<p class='error'>✗ isLoggedIn() returns false even after successful login</p>";
            }
            
        } else {
            echo "<p class='error'>✗ Login failed: " . $result['message'] . "</p>";
        }
    }
    echo "</div>";
    
    // Login form for testing
    echo "<div class='debug'>";
    echo "<h3>Test Login Form</h3>";
    echo "<form method='POST'>";
    echo "<p><label>Username: <input type='text' name='username' value='admin' required></label></p>";
    echo "<p><label>Password: <input type='password' name='password' value='admin123' required></label></p>";
    echo "<p><input type='submit' value='Test Login'></p>";
    echo "</form>";
    echo "</div>";
    
    echo "<div class='debug'>";
    echo "<h3>Current Login Status</h3>";
    if (isLoggedIn()) {
        echo "<p class='success'>✓ User is currently logged in</p>";
        $user = getCurrentUser();
        if ($user) {
            echo "<p>Current user details:</p>";
            echo "<pre>" . print_r($user, true) . "</pre>";
        }
        echo "<p><a href='index.php'>Go to Dashboard</a></p>";
    } else {
        echo "<p class='info'>No user currently logged in</p>";
        echo "<p><a href='login.php'>Go to Login Page</a></p>";
    }
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div class='debug'>";
    echo "<h3>Fatal Error</h3>";
    echo "<p class='error'>Error: " . $e->getMessage() . "</p>";
    echo "<p>File: " . $e->getFile() . "</p>";
    echo "<p>Line: " . $e->getLine() . "</p>";
    echo "</div>";
}

echo "</body></html>";
?>