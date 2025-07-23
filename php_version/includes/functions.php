<?php
/**
 * Core Functions for Furnili Management System
 * PHP/MySQL Version - Clean version without syntax errors
 */

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

// hasPermission() function is defined in auth.php to avoid redeclaration error

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
 * Format file size
 */
function formatFileSize($size) {
    if ($size < 1024) return $size . ' B';
    if ($size < 1048576) return round($size / 1024, 2) . ' KB';
    if ($size < 1073741824) return round($size / 1048576, 2) . ' MB';
    return round($size / 1073741824, 2) . ' GB';
}

/**
 * Pagination helper
 */
function paginate($currentPage, $totalPages, $baseUrl) {
    if ($totalPages <= 1) return '';
    
    $html = '<nav aria-label="Page navigation">';
    $html .= '<ul class="pagination justify-content-center">';
    
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