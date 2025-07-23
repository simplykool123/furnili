<?php
/**
 * Database Configuration for Furnili Management System
 * PHP/MySQL Version
 */

// Database configuration for app.furnili.in - UPDATE WITH YOUR HOSTINGER DETAILS
define('DB_HOST', 'localhost');        // Always 'localhost' for Hostinger
define('DB_NAME', 'u123456789_furnili'); // Your Hostinger database name (replace with actual)
define('DB_USER', 'u123456789_furnili'); // Your Hostinger database username (replace with actual)
define('DB_PASS', 'your_db_password');   // Your Hostinger database password (replace with actual)
define('DB_CHARSET', 'utf8mb4');

// Application configuration
define('APP_NAME', 'Furnili MS');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'https://app.furnili.in'); // Your production domain

// File upload configuration
define('UPLOAD_PATH', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif']);
define('ALLOWED_DOCUMENT_TYPES', ['pdf', 'doc', 'docx', 'xls', 'xlsx']);

// Security configuration  
define('JWT_SECRET', 'your-secret-key-change-this-in-production');
define('SESSION_TIMEOUT', 3600); // 1 hour in seconds
define('PASSWORD_MIN_LENGTH', 6);

// Development mode
define('DEVELOPMENT_MODE', true);

// Pagination
define('ITEMS_PER_PAGE', 20);

// Database connection class
class Database {
    private static $connection = null;
    
    public static function connect() {
        if (self::$connection === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                self::$connection = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                if (defined('DEVELOPMENT_MODE') && DEVELOPMENT_MODE) {
                    die("<h3>Database Connection Error:</h3><p>" . $e->getMessage() . "</p>
                         <p><strong>Please check:</strong></p>
                         <ul>
                         <li>Database name: " . DB_NAME . "</li>
                         <li>Database user: " . DB_USER . "</li>
                         <li>Database host: " . DB_HOST . "</li>
                         <li>Make sure MySQL service is running</li>
                         <li>Check database credentials</li>
                         </ul>
                         <p><a href='debug.php'>Run Debug Script</a></p>");
                } else {
                    die("Database connection failed. Please check your configuration.");
                }
            }
        }
        return self::$connection;
    }
    
    public static function disconnect() {
        self::$connection = null;
    }
}

// Production mode for app.furnili.in
define('DEVELOPMENT_MODE', true); // Enable for debugging white screen issues

// Error reporting for development (enable for debugging)
if (defined('DEVELOPMENT_MODE') && DEVELOPMENT_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
?>