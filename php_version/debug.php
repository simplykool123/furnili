<?php
/**
 * Debug Script for PHP Installation Issues
 * This script helps diagnose white screen problems
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h1>PHP Debug Information</h1>";
echo "<h2>PHP Version: " . phpversion() . "</h2>";

// Check if basic PHP is working
echo "<h3>1. Basic PHP Test</h3>";
echo "<p style='color: green;'>✓ PHP is working - you can see this message</p>";

// Check database connection
echo "<h3>2. Database Connection Test</h3>";
try {
    // Database configuration
    $host = 'localhost';
    $dbname = 'furnili_db';  // Change this to your actual database name
    $username = 'root';      // Change this to your database username
    $password = '';          // Change this to your database password
    
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    echo "<p style='color: green;'>✓ Database connection successful</p>";
    
    // Test query
    $stmt = $pdo->query("SELECT 1 as test");
    $result = $stmt->fetch();
    echo "<p style='color: green;'>✓ Database query test passed</p>";
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>✗ Database connection failed: " . $e->getMessage() . "</p>";
    echo "<p><strong>Common fixes:</strong></p>";
    echo "<ul>";
    echo "<li>Check database name, username, and password</li>";
    echo "<li>Ensure MySQL service is running</li>";
    echo "<li>Check database permissions</li>";
    echo "</ul>";
}

// Check required extensions
echo "<h3>3. Required PHP Extensions</h3>";
$required_extensions = ['pdo', 'pdo_mysql', 'json', 'mbstring', 'fileinfo', 'gd'];

foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<p style='color: green;'>✓ $ext extension loaded</p>";
    } else {
        echo "<p style='color: red;'>✗ $ext extension missing</p>";
    }
}

// Check file permissions
echo "<h3>4. File Permissions Test</h3>";
$directories_to_check = [
    '.',
    'config',
    'includes',
    'pages',
    'uploads'
];

foreach ($directories_to_check as $dir) {
    if (is_dir($dir)) {
        if (is_readable($dir)) {
            echo "<p style='color: green;'>✓ Directory '$dir' is readable</p>";
        } else {
            echo "<p style='color: red;'>✗ Directory '$dir' is not readable</p>";
        }
        
        if (is_writable($dir)) {
            echo "<p style='color: green;'>✓ Directory '$dir' is writable</p>";
        } else {
            echo "<p style='color: orange;'>⚠ Directory '$dir' is not writable (may be needed for uploads)</p>";
        }
    } else {
        echo "<p style='color: orange;'>⚠ Directory '$dir' does not exist</p>";
    }
}

// Check critical files
echo "<h3>5. Critical Files Check</h3>";
$critical_files = [
    'config/database.php',
    'includes/functions.php',
    'includes/auth.php',
    'index.php',
    'login.php'
];

foreach ($critical_files as $file) {
    if (file_exists($file)) {
        echo "<p style='color: green;'>✓ File '$file' exists</p>";
        
        // Check for PHP syntax errors
        $output = shell_exec("php -l $file 2>&1");
        if (strpos($output, 'No syntax errors') !== false) {
            echo "<p style='color: green;'>✓ File '$file' has no syntax errors</p>";
        } else {
            echo "<p style='color: red;'>✗ File '$file' has syntax errors:</p>";
            echo "<pre style='background: #ffeeee; padding: 10px;'>$output</pre>";
        }
    } else {
        echo "<p style='color: red;'>✗ File '$file' missing</p>";
    }
}

// Check PHP configuration
echo "<h3>6. PHP Configuration</h3>";
$php_settings = [
    'memory_limit',
    'max_execution_time',
    'upload_max_filesize',
    'post_max_size',
    'session.save_path'
];

foreach ($php_settings as $setting) {
    $value = ini_get($setting);
    echo "<p><strong>$setting:</strong> $value</p>";
}

// Test session functionality
echo "<h3>7. Session Test</h3>";
session_start();
if (session_status() == PHP_SESSION_ACTIVE) {
    echo "<p style='color: green;'>✓ Session started successfully</p>";
    $_SESSION['test'] = 'working';
    if (isset($_SESSION['test'])) {
        echo "<p style='color: green;'>✓ Session variables working</p>";
    }
} else {
    echo "<p style='color: red;'>✗ Session failed to start</p>";
}

// Check .htaccess file
echo "<h3>8. .htaccess File Check</h3>";
if (file_exists('.htaccess')) {
    echo "<p style='color: green;'>✓ .htaccess file exists</p>";
    echo "<pre style='background: #f5f5f5; padding: 10px;'>";
    echo htmlspecialchars(file_get_contents('.htaccess'));
    echo "</pre>";
} else {
    echo "<p style='color: orange;'>⚠ .htaccess file not found</p>";
    echo "<p>Creating basic .htaccess file...</p>";
    
    $htaccess_content = "RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^/]+)/?$ $1.php [L,QSA]

# Enable error display for debugging
php_flag display_errors On
php_value error_reporting 'E_ALL'

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection \"1; mode=block\"
";
    
    if (file_put_contents('.htaccess', $htaccess_content)) {
        echo "<p style='color: green;'>✓ .htaccess file created</p>";
    } else {
        echo "<p style='color: red;'>✗ Failed to create .htaccess file</p>";
    }
}

// Test specific page load
echo "<h3>9. Page Load Test</h3>";
echo "<p>Testing individual pages:</p>";

$pages_to_test = ['index.php', 'login.php'];

foreach ($pages_to_test as $page) {
    if (file_exists($page)) {
        echo "<p><a href='$page' target='_blank' style='color: blue;'>Test $page</a></p>";
    }
}

// Error log check
echo "<h3>10. Error Log Check</h3>";
$error_log_locations = [
    ini_get('error_log'),
    '/var/log/apache2/error.log',
    '/var/log/php_errors.log',
    'error.log'
];

foreach ($error_log_locations as $log_file) {
    if ($log_file && file_exists($log_file) && is_readable($log_file)) {
        echo "<p style='color: green;'>✓ Found error log: $log_file</p>";
        
        $recent_errors = shell_exec("tail -20 '$log_file' 2>/dev/null");
        if ($recent_errors) {
            echo "<p><strong>Recent errors:</strong></p>";
            echo "<pre style='background: #ffeeee; padding: 10px; max-height: 200px; overflow-y: scroll;'>";
            echo htmlspecialchars($recent_errors);
            echo "</pre>";
        }
        break;
    }
}

echo "<h3>11. Recommendations</h3>";
echo "<div style='background: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3;'>";
echo "<p><strong>If you're still seeing a white screen:</strong></p>";
echo "<ol>";
echo "<li>Check your hosting control panel for PHP error logs</li>";
echo "<li>Ensure your hosting supports PHP 7.4 or higher</li>";
echo "<li>Verify database credentials in config/database.php</li>";
echo "<li>Contact your hosting provider about PHP configuration</li>";
echo "<li>Try accessing individual files directly (login.php, debug.php)</li>";
echo "</ol>";
echo "</div>";

echo "<h3>12. Quick Fix Creator</h3>";
echo "<p>Creating a minimal test file...</p>";

$minimal_test = '<?php
echo "<!DOCTYPE html><html><head><title>Minimal Test</title></head><body>";
echo "<h1>Furnili System Status</h1>";
echo "<p>PHP is working: " . phpversion() . "</p>";
echo "<p>Current time: " . date("Y-m-d H:i:s") . "</p>";

try {
    $host = "localhost";
    $dbname = "furnili_db";
    $username = "root";
    $password = "";
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    echo "<p style=\"color: green;\">Database connection: OK</p>";
} catch (Exception $e) {
    echo "<p style=\"color: red;\">Database connection: FAILED - " . $e->getMessage() . "</p>";
}

echo "<p><a href=\"login.php\">Go to Login</a> | <a href=\"index.php\">Go to Dashboard</a></p>";
echo "</body></html>";
?>';

if (file_put_contents('test.php', $minimal_test)) {
    echo "<p style='color: green;'>✓ Created minimal test file: <a href='test.php' target='_blank'>test.php</a></p>";
}

?>

<style>
body { font-family: Arial, sans-serif; margin: 20px; }
h1 { color: #333; }
h2 { color: #666; }
h3 { color: #999; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
</style>