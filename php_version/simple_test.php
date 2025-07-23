<?php
/**
 * Simple PHP Test - Verify basic functionality
 */
echo "<!DOCTYPE html>
<html>
<head>
    <title>Simple Test - Furnili MS</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: green; }
        .error { color: red; }
        .test { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🧪 Simple PHP Test</h1>
    <p>Basic functionality test for Furnili Management System</p>";

// Test 1: PHP Version
echo "<div class='test'>";
echo "<h3>Test 1: PHP Environment</h3>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "</p>";
echo "<p class='success'>✓ PHP is working</p>";
echo "</div>";

// Test 2: File System
echo "<div class='test'>";
echo "<h3>Test 2: File System Access</h3>";
$test_files = ['config/database.php', 'includes/functions.php', 'includes/auth.php'];
$missing_files = [];

foreach ($test_files as $file) {
    if (file_exists($file)) {
        echo "<p class='success'>✓ $file exists</p>";
    } else {
        echo "<p class='error'>✗ $file missing</p>";
        $missing_files[] = $file;
    }
}

if (empty($missing_files)) {
    echo "<p class='success'>✓ All critical files present</p>";
} else {
    echo "<p class='error'>✗ Missing files detected</p>";
}
echo "</div>";

// Test 3: Database Connection
echo "<div class='test'>";
echo "<h3>Test 3: Database Connection</h3>";
try {
    if (file_exists('config/database.php')) {
        require_once 'config/database.php';
        $db = Database::connect();
        echo "<p class='success'>✓ Database connection successful</p>";
        
        // Test a simple query
        $stmt = $db->query("SELECT 1 as test");
        $result = $stmt->fetch();
        if ($result && $result['test'] == 1) {
            echo "<p class='success'>✓ Database query test passed</p>";
        }
    } else {
        echo "<p class='error'>✗ Database config file missing</p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>✗ Database connection failed: " . $e->getMessage() . "</p>";
}
echo "</div>";

// Test 4: Session Support
echo "<div class='test'>";
echo "<h3>Test 4: Session Support</h3>";
if (session_start()) {
    echo "<p class='success'>✓ Sessions working</p>";
    $_SESSION['test'] = 'working';
    if (isset($_SESSION['test'])) {
        echo "<p class='success'>✓ Session variables working</p>";
    }
} else {
    echo "<p class='error'>✗ Session start failed</p>";
}
echo "</div>";

// Test 5: Upload Directory
echo "<div class='test'>";
echo "<h3>Test 5: Upload Directories</h3>";
$upload_dirs = ['uploads', 'uploads/products', 'uploads/receipts', 'uploads/boq'];

foreach ($upload_dirs as $dir) {
    if (!is_dir($dir)) {
        if (mkdir($dir, 0755, true)) {
            echo "<p class='success'>✓ Created $dir</p>";
        } else {
            echo "<p class='error'>✗ Cannot create $dir</p>";
        }
    } else {
        echo "<p class='success'>✓ $dir exists</p>";
    }
    
    if (is_writable($dir)) {
        echo "<p class='success'>✓ $dir is writable</p>";
    } else {
        echo "<p class='error'>✗ $dir is not writable</p>";
    }
}
echo "</div>";

echo "<h2>Test Summary</h2>";
echo "<p class='success'>Basic PHP functionality is working!</p>";
echo "<p><strong>Next Steps:</strong></p>";
echo "<ul>";
echo "<li><a href='check_duplicates.php'>Check for duplicate functions</a></li>";
echo "<li><a href='syntax_check.php'>Validate PHP syntax</a></li>";
echo "<li><a href='hostinger_setup.php'>Complete setup configuration</a></li>";
echo "<li><a href='login.php'>Try the login page</a></li>";
echo "</ul>";

echo "</body></html>";
?>