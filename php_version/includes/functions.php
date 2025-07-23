<?php
/**
 * Common functions for Furnili Management System
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Sanitize input data
 */
function sanitize($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

/**
 * Validate email format
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Hash password using PHP's password_hash
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify password
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Generate random string for tokens
 */
function generateRandomString($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Get current user data
 */
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    $db = Database::connect();
    $stmt = $db->prepare("SELECT id, username, email, name, role, is_active FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

/**
 * Check if user has required role
 */
function hasRole($requiredRoles) {
    $user = getCurrentUser();
    if (!$user) return false;
    
    if (is_string($requiredRoles)) {
        $requiredRoles = [$requiredRoles];
    }
    
    return in_array($user['role'], $requiredRoles);
}

/**
 * Add new product with image upload
 */
function addProduct($data, $files = []) {
    try {
        $db = Database::connect();
        
        // Handle image upload
        $imageUrl = null;
        if (isset($files['image']) && $files['image']['error'] === UPLOAD_ERR_OK) {
            $imageUrl = uploadProductImage($files['image']);
        }
        
        // Generate SKU if not provided
        $sku = !empty($data['sku']) ? $data['sku'] : generateSKU($data['name']);
        
        $stmt = $db->prepare("
            INSERT INTO products (name, category, brand, size, thickness, price_per_unit, 
                                current_stock, min_stock, unit, sku, image_url, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ");
        
        $result = $stmt->execute([
            $data['name'],
            $data['category'],
            $data['brand'] ?? null,
            $data['size'] ?? null,
            $data['thickness'] ?? null,
            $data['price_per_unit'],
            $data['current_stock'] ?? 0,
            $data['min_stock'] ?? 10,
            $data['unit'] ?? 'pieces',
            $sku,
            $imageUrl
        ]);
        
        if ($result) {
            // Record stock movement
            $productId = $db->lastInsertId();
            if ($data['current_stock'] > 0) {
                recordStockMovement($productId, 'in', $data['current_stock'], $data['price_per_unit'], 'Initial stock');
            }
            return ['success' => true, 'message' => 'Product added successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to add product'];
        }
        
    } catch (Exception $e) {
        error_log("Add product error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to add product: ' . $e->getMessage()];
    }
}

/**
 * Update existing product
 */
function updateProduct($id, $data, $files = []) {
    try {
        $db = Database::connect();
        
        // Handle image upload
        $imageUrl = null;
        if (isset($files['image']) && $files['image']['error'] === UPLOAD_ERR_OK) {
            $imageUrl = uploadProductImage($files['image']);
        }
        
        $updateFields = [
            'name = ?', 'category = ?', 'brand = ?', 'size = ?', 'thickness = ?',
            'price_per_unit = ?', 'min_stock = ?', 'unit = ?'
        ];
        $params = [
            $data['name'], $data['category'], $data['brand'] ?? null,
            $data['size'] ?? null, $data['thickness'] ?? null,
            $data['price_per_unit'], $data['min_stock'] ?? 10, $data['unit'] ?? 'pieces'
        ];
        
        if ($imageUrl) {
            $updateFields[] = 'image_url = ?';
            $params[] = $imageUrl;
        }
        
        $params[] = $id;
        
        $stmt = $db->prepare("UPDATE products SET " . implode(', ', $updateFields) . " WHERE id = ?");
        $result = $stmt->execute($params);
        
        return $result ? 
            ['success' => true, 'message' => 'Product updated successfully'] :
            ['success' => false, 'message' => 'Failed to update product'];
            
    } catch (Exception $e) {
        error_log("Update product error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to update product'];
    }
}

/**
 * Update product stock
 */
function updateProductStock($data) {
    try {
        $db = Database::connect();
        
        $stmt = $db->prepare("UPDATE products SET current_stock = ? WHERE id = ?");
        $result = $stmt->execute([$data['new_stock'], $data['product_id']]);
        
        if ($result) {
            // Record stock movement
            $movementType = $data['movement_type']; // 'in', 'out', 'adjustment'
            $quantity = abs($data['new_stock'] - $data['old_stock']);
            
            recordStockMovement(
                $data['product_id'], 
                $movementType, 
                $quantity, 
                $data['unit_price'] ?? 0,
                $data['notes'] ?? 'Stock adjustment'
            );
            
            return ['success' => true, 'message' => 'Stock updated successfully'];
        } else {
            return ['success' => false, 'message' => 'Failed to update stock'];
        }
        
    } catch (Exception $e) {
        error_log("Update stock error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to update stock'];
    }
}

/**
 * Record stock movement
 */
function recordStockMovement($productId, $type, $quantity, $unitPrice, $notes) {
    try {
        $db = Database::connect();
        
        $stmt = $db->prepare("
            INSERT INTO stock_movements (product_id, movement_type, quantity, unit_price, 
                                       total_value, notes, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $totalValue = $quantity * $unitPrice;
        
        return $stmt->execute([
            $productId, $type, $quantity, $unitPrice, $totalValue, $notes
        ]);
        
    } catch (Exception $e) {
        error_log("Record stock movement error: " . $e->getMessage());
        return false;
    }
}

/**
 * Upload product image
 */
function uploadProductImage($file) {
    $uploadDir = UPLOAD_PATH . 'products/';
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        return null;
    }
    
    $fileName = time() . '_' . basename($file['name']);
    $filePath = $uploadDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        return 'uploads/products/' . $fileName;
    }
    
    return null;
}

/**
 * Generate SKU from product name
 */
function generateSKU($name) {
    $prefix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $name), 0, 3));
    $suffix = strtoupper(substr(md5($name . time()), 0, 5));
    return $prefix . '-' . $suffix;
}

/**
 * Delete product
 */
function deleteProduct($id) {
    try {
        $db = Database::connect();
        
        // Soft delete - mark as inactive
        $stmt = $db->prepare("UPDATE products SET is_active = 0 WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        return $result ? 
            ['success' => true, 'message' => 'Product deleted successfully'] :
            ['success' => false, 'message' => 'Failed to delete product'];
            
    } catch (Exception $e) {
        error_log("Delete product error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to delete product'];
    }
}

/**
 * Get dashboard statistics
 */
function getDashboardStats($userRole) {
    try {
        $db = Database::connect();
        
        $stats = [
            'total_products' => 0,
            'low_stock_products' => 0,
            'pending_requests' => 0,
            'total_requests' => 0,
            'total_users' => 0,
            'petty_cash_balance' => 0
        ];
        
        // Total products
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
        $stmt->execute();
        $stats['total_products'] = $stmt->fetch()['count'];
        
        // Low stock products
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND current_stock <= min_stock");
        $stmt->execute();
        $stats['low_stock_products'] = $stmt->fetch()['count'];
        
        // Pending requests
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM material_requests WHERE status = 'pending'");
        $stmt->execute();
        $stats['pending_requests'] = $stmt->fetch()['count'];
        
        // Total requests
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM material_requests");
        $stmt->execute();
        $stats['total_requests'] = $stmt->fetch()['count'];
        
        // Total users (for admin)
        if ($userRole === 'admin') {
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
            $stmt->execute();
            $stats['total_users'] = $stmt->fetch()['count'];
        }
        
        // Petty cash balance
        $stmt = $db->prepare("
            SELECT SUM(CASE WHEN is_credit = 1 THEN amount ELSE -amount END) as balance 
            FROM petty_cash_expenses
        ");
        $stmt->execute();
        $result = $stmt->fetch();
        $stats['petty_cash_balance'] = $result['balance'] ?? 0;
        
        return $stats;
        
    } catch (Exception $e) {
        error_log("Dashboard stats error: " . $e->getMessage());
        return $stats;
    }
}

/**
 * Check if user has specific permission
 */
function hasPermission($resource, $action) {
    $user = getCurrentUser();
    if (!$user) return false;
    
    $role = $user['role'];
    
    // Admin has all permissions
    if ($role === 'admin') return true;
    
    // Define role-based permissions
    $permissions = [
        'manager' => [
            'products' => ['create', 'read', 'update', 'delete'],
            'requests' => ['create', 'read', 'update', 'delete'],
            'attendance' => ['read', 'update'],
            'petty_cash' => ['create', 'read', 'update'],
            'users' => ['read'],
            'reports' => ['read']
        ],
        'storekeeper' => [
            'products' => ['create', 'read', 'update'],
            'requests' => ['read', 'update'],
            'attendance' => ['read'],
            'reports' => ['read']
        ],
        'user' => [
            'products' => ['read'],
            'requests' => ['create', 'read'],
            'reports' => ['read']
        ]
    ];
    


/**
 * Session timeout check
 */
function checkSessionTimeout() {
    $timeout = 3600; // 1 hour
    
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
        session_destroy();
        return false;
    }
    
    $_SESSION['last_activity'] = time();
    return true;
}

/**
 * Redirect if not authenticated
 */
function requireAuth() {
    if (!isLoggedIn()) {
        header('Location: /login.php');
        exit();
    }
}

/**
 * Redirect if insufficient role
 */
function requireRole($requiredRoles) {
    requireAuth();
    if (!hasRole($requiredRoles)) {
        http_response_code(403);
        die('Insufficient permissions');
    }
}

/**
 * Format currency
 */
function formatCurrency($amount) {
    return '₹' . number_format($amount, 2);
}

/**
 * Format date
 */
function formatDate($date, $format = 'Y-m-d H:i:s') {
    if (empty($date)) return '';
    return date($format, strtotime($date));
}

/**
 * JSON response helper
 */
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

/**
 * Success response
 */
function successResponse($message, $data = null) {
    jsonResponse([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
}

/**
 * Error response
 */
function errorResponse($message, $status = 400) {
    jsonResponse([
        'success' => false,
        'message' => $message
    ], $status);
}

/**
 * Validate required fields
 */
function validateRequired($data, $requiredFields) {
    $errors = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $errors[] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
        }
    }
    return $errors;
}

/**
 * Upload file handler
 */
function uploadFile($file, $uploadDir, $allowedTypes = null) {
    if (!isset($file['tmp_name']) || empty($file['tmp_name'])) {
        throw new Exception('No file uploaded');
    }
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error: ' . $file['error']);
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('File size exceeds maximum limit');
    }
    
    $fileInfo = pathinfo($file['name']);
    $extension = strtolower($fileInfo['extension']);
    
    if ($allowedTypes && !in_array($extension, $allowedTypes)) {
        throw new Exception('File type not allowed');
    }
    
    // Create upload directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to move uploaded file');
    }
    
    return $filename;
}

/**
 * Delete file
 */
function deleteFile($filepath) {
    if (file_exists($filepath)) {
        return unlink($filepath);
    }
    return true;
}

/**
 * Generate pagination links
 */
function generatePagination($currentPage, $totalPages, $baseUrl) {
    $html = '<nav aria-label="Page navigation">';
    $html .= '<ul class="pagination">';
    
    // Previous button
    if ($currentPage > 1) {
        $html .= '<li class="page-item">';
        $html .= '<a class="page-link" href="' . $baseUrl . '?page=' . ($currentPage - 1) . '">Previous</a>';
        $html .= '</li>';
    }
    
    // Page numbers
    for ($i = 1; $i <= $totalPages; $i++) {
        $active = ($i == $currentPage) ? 'active' : '';
        $html .= '<li class="page-item ' . $active . '">';
        $html .= '<a class="page-link" href="' . $baseUrl . '?page=' . $i . '">' . $i . '</a>';
        $html .= '</li>';
    }
    
    // Next button
    if ($currentPage < $totalPages) {
        $html .= '<li class="page-item">';
        $html .= '<a class="page-link" href="' . $baseUrl . '?page=' . ($currentPage + 1) . '">Next</a>';
        $html .= '</li>';
    }
    
    $html .= '</ul>';
    $html .= '</nav>';
    
    return $html;
}

/**
 * Log activity
 */
function logActivity($userId, $action, $details = '') {
    $db = Database::connect();
    $stmt = $db->prepare("INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->execute([$userId, $action, $details]);
}

/**
 * Get dashboard statistics
 */
function getDashboardStats($userRole = null) {
    $db = Database::connect();
    
    $stats = [];
    
    // Total products
    $stmt = $db->query("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
    $stats['total_products'] = $stmt->fetch()['count'];
    
    // Low stock products
    $stmt = $db->query("SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock AND is_active = 1");
    $stats['low_stock_products'] = $stmt->fetch()['count'];
    
    // Pending requests
    $stmt = $db->query("SELECT COUNT(*) as count FROM material_requests WHERE status = 'pending'");
    $stats['pending_requests'] = $stmt->fetch()['count'];
    
    // Total users
    $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
    $stats['total_users'] = $stmt->fetch()['count'];
    
    // Monthly expenses
    $stmt = $db->query("SELECT SUM(amount) as total FROM petty_cash_expenses WHERE MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())");
    $result = $stmt->fetch();
    $stats['monthly_expenses'] = $result['total'] ?? 0;
    
    return $stats;
}

/**
 * Export data to CSV
 */
function exportToCSV($data, $filename, $headers = null) {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    // Add headers if provided
    if ($headers) {
        fputcsv($output, $headers);
    } elseif (!empty($data)) {
        fputcsv($output, array_keys($data[0]));
    }
    
    // Add data rows
    foreach ($data as $row) {
        fputcsv($output, $row);
    }
    
    fclose($output);
    exit();
}
?>