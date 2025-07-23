<?php
// Simple test file to check basic PHP functionality
echo "<!DOCTYPE html>
<html>
<head>
    <title>Simple PHP Test</title>
</head>
<body>
    <h1>PHP Test Results</h1>
    <p>PHP Version: " . phpversion() . "</p>
    <p>Current Time: " . date('Y-m-d H:i:s') . "</p>
    <p>Server: " . $_SERVER['SERVER_SOFTWARE'] . "</p>
    
    <h2>File Check</h2>";

$files_to_check = [
    'config/database.php',
    'includes/functions.php', 
    'includes/auth.php',
    'index.php',
    'login.php'
];

foreach ($files_to_check as $file) {
    if (file_exists($file)) {
        echo "<p style='color: green;'>✓ $file exists</p>";
    } else {
        echo "<p style='color: red;'>✗ $file missing</p>";
    }
}

echo "
    <h2>Database Test</h2>";

try {
    // Simple database connection test
    $host = 'localhost';
    $dbname = 'furnili_db'; // Change this as needed
    $username = 'root';
    $password = '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    echo "<p style='color: green;'>✓ Database connection successful</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>✗ Database connection failed: " . $e->getMessage() . "</p>";
}

echo "
    <h2>Next Steps</h2>
    <p><a href='debug.php'>Run Full Debug</a></p>
    <p><a href='login.php'>Try Login Page</a></p>
    <p><a href='index.php'>Try Dashboard</a></p>
</body>
</html>";
?>