<?php
/**
 * Database Configuration for Furnili Management System
 * PHP/MySQL Version
 */

// Database configuration - UPDATE THESE VALUES FOR YOUR HOSTING
define('DB_HOST', 'localhost');        // Usually 'localhost' for shared hosting
define('DB_NAME', 'furnili_ms');       // Your database name
define('DB_USER', 'root');             // Your database username (default for local testing)
define('DB_PASS', '');                 // Your database password (empty for local testing)
define('DB_CHARSET', 'utf8mb4');

// Application configuration
define('APP_NAME', 'Furnili MS');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost/furnili'); // Update with your domain

// File upload configuration
define('UPLOAD_PATH', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif']);
define('ALLOWED_DOCUMENT_TYPES', ['pdf', 'doc', 'docx', 'xls', 'xlsx']);

// Security configuration
define('JWT_SECRET', 'your-secret-key-change-this-in-production');
define('SESSION_TIMEOUT', 3600); // 1 hour in seconds
define('PASSWORD_MIN_LENGTH', 6);

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
                die("Database connection failed. Please check your configuration.");
            }
        }
        return self::$connection;
    }
    
    public static function disconnect() {
        self::$connection = null;
    }
}

// Development mode for testing
define('DEVELOPMENT_MODE', true);

// Error reporting for development (disable in production)
if (defined('DEVELOPMENT_MODE') && DEVELOPMENT_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
?>