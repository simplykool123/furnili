<?php
/**
 * Test Login Functionality
 */
session_start();

echo "<!DOCTYPE html>
<html>
<head>
    <title>Login Test - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .test { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔐 Login Function Test</h1>";

try {
    require_once 'config/database.php';
    require_once 'includes/functions.php';
    require_once 'includes/auth.php';
    
    echo "<div class='test'>";
    echo "<h3>Test 1: Required Functions</h3>";
    
    $required_functions = ['isLoggedIn', 'getCurrentUser', 'sanitize', 'loginUser'];
    $missing_functions = [];
    
    foreach ($required_functions as $func) {
        if (function_exists($func)) {
            echo "<p class='success'>✓ Function $func() exists</p>";
        } else {
            echo "<p class='error'>✗ Function $func() missing</p>";
            $missing_functions[] = $func;
        }
    }
    
    if (empty($missing_functions)) {
        echo "<p class='success'>✓ All required functions available</p>";
    }
    echo "</div>";
    
    echo "<div class='test'>";
    echo "<h3>Test 2: Session Check</h3>";
    
    if (isLoggedIn()) {
        echo "<p class='success'>✓ User is logged in</p>";
        $user = getCurrentUser();
        if ($user) {
            echo "<p class='success'>✓ Current user: " . $user['name'] . " (" . $user['role'] . ")</p>";
        }
    } else {
        echo "<p>ℹ No user currently logged in (this is normal)</p>";
    }
    echo "</div>";
    
    echo "<div class='test'>";
    echo "<h3>Test 3: Database User Check</h3>";
    
    $db = Database::connect();
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
    $stmt->execute();
    $adminCount = $stmt->fetch()['count'];
    
    if ($adminCount > 0) {
        echo "<p class='success'>✓ Admin user exists in database</p>";
        
        // Test admin login
        $loginResult = loginUser('admin', 'admin123');
        if ($loginResult['success']) {
            echo "<p class='success'>✓ Admin login test successful</p>";
            echo "<p>User details: " . json_encode($loginResult['user'], JSON_PRETTY_PRINT) . "</p>";
        } else {
            echo "<p class='error'>✗ Admin login failed: " . $loginResult['message'] . "</p>";
        }
    } else {
        echo "<p class='error'>✗ No admin user found</p>";
        echo "<p><a href='database_setup.php'>Create Admin User</a></p>";
    }
    echo "</div>";
    
    echo "<h2>Test Summary</h2>";
    
    if (empty($missing_functions)) {
        echo "<p class='success'>✓ Login functionality is working correctly!</p>";
        echo "<p><a href='login.php'>Try Login Page</a> | <a href='index.php'>Go to Dashboard</a></p>";
    } else {
        echo "<p class='error'>✗ Some functions are missing. Please check the includes files.</p>";
    }
    
} catch (Exception $e) {
    echo "<div class='test'>";
    echo "<h3>Error</h3>";
    echo "<p class='error'>Test failed: " . $e->getMessage() . "</p>";
    echo "</div>";
}

echo "</body></html>";
?>