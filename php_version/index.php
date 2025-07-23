<?php
/**
 * Furnili Management System - Main Entry Point
 * PHP/MySQL Version
 */

// Enable error reporting for debugging white screen issues
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Check if critical files exist
$required_files = [
    'config/database.php',
    'includes/functions.php', 
    'includes/auth.php'
];

foreach ($required_files as $file) {
    if (!file_exists($file)) {
        die("Critical file missing: $file<br><a href='debug.php'>Run Debug</a>");
    }
}

// Start session first
session_start();

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

// Check session timeout
if (isLoggedIn() && !checkSessionTimeout()) {
    header('Location: login.php');
    exit();
}

// Redirect to login if not authenticated
if (!isLoggedIn()) {
    header('Location: login.php');
    exit();
}

$user = getCurrentUser();

// Initialize stats with defaults
$stats = [
    'total_products' => 0,
    'low_stock_products' => 0,
    'pending_requests' => 0,
    'total_requests' => 0,
    'total_users' => 0,
    'petty_cash_balance' => 0
];

// Try to get dashboard stats
try {
    $dashboardStats = getDashboardStats($user['role']);
    if ($dashboardStats) {
        $stats = array_merge($stats, $dashboardStats);
    }
} catch (Exception $e) {
    // Log error but continue with default stats
    error_log("Dashboard stats error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - <?php echo APP_NAME; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>
    <?php include 'includes/header.php'; ?>
    
    <div class="container-fluid">
        <div class="row">
            <?php include 'includes/sidebar.php'; ?>
            
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Dashboard</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <div class="btn-group me-2">
                            <button type="button" class="btn btn-sm btn-outline-secondary">
                                <i class="fas fa-download"></i> Export Data
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Dashboard Statistics -->
                <div class="row mb-4">
                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-primary shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Products</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo number_format($stats['total_products']); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-boxes fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-warning shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Low Stock Items</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo number_format($stats['low_stock_products']); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-exclamation-triangle fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-info shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Pending Requests</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo number_format($stats['pending_requests']); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-clipboard-list fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-success shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Monthly Expenses</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo formatCurrency($stats['petty_cash_balance'] ?? 0); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-rupee-sign fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="row">
                    <div class="col-lg-6">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Recent Products</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered" width="100%" cellspacing="0">
                                        <thead>
                                            <tr>
                                                <th>Product Name</th>
                                                <th>Stock</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php
                                            try {
                                                $db = Database::connect();
                                                $stmt = $db->prepare("SELECT name, current_stock, min_stock FROM products WHERE is_active = 1 ORDER BY id DESC LIMIT 5");
                                                $stmt->execute();
                                                $products = $stmt->fetchAll();
                                                
                                                if ($products) {
                                                    foreach ($products as $product) {
                                                        $status = $product['current_stock'] <= $product['min_stock'] ? 'Low Stock' : 'In Stock';
                                                        $statusClass = $product['current_stock'] <= $product['min_stock'] ? 'badge bg-warning' : 'badge bg-success';
                                                        echo "<tr>";
                                                        echo "<td>" . htmlspecialchars($product['name']) . "</td>";
                                                        echo "<td>" . $product['current_stock'] . "</td>";
                                                        echo "<td><span class='$statusClass'>$status</span></td>";
                                                        echo "</tr>";
                                                    }
                                                } else {
                                                    echo "<tr><td colspan='3' class='text-center'>No products found</td></tr>";
                                                }
                                            } catch (Exception $e) {
                                                echo "<tr><td colspan='3' class='text-center text-danger'>Error loading products</td></tr>";
                                            }
                                            ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-6">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Quick Actions</h6>
                            </div>
                            <div class="card-body">
                                <div class="d-grid gap-2">
                                    <a href="products.php" class="btn btn-primary">
                                        <i class="fas fa-plus-circle me-2"></i>Add New Product
                                    </a>
                                    <a href="requests.php" class="btn btn-info">
                                        <i class="fas fa-clipboard-list me-2"></i>Material Requests
                                    </a>
                                    <a href="attendance.php" class="btn btn-success">
                                        <i class="fas fa-clock me-2"></i>Staff Attendance
                                    </a>
                                    <a href="petty_cash.php" class="btn btn-warning">
                                        <i class="fas fa-wallet me-2"></i>Petty Cash
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
                            <div class="card-header py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Recent Products</h6>
                            </div>
                            <div class="card-body">
                                <?php
                                $db = Database::connect();
                                $stmt = $db->query("SELECT name, category, current_stock, created_at FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5");
                                $recentProducts = $stmt->fetchAll();
                                ?>
                                <?php if (empty($recentProducts)): ?>
                                    <p class="text-muted">No products found.</p>
                                <?php else: ?>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Category</th>
                                                    <th>Stock</th>
                                                    <th>Added</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($recentProducts as $product): ?>
                                                <tr>
                                                    <td><?php echo htmlspecialchars($product['name']); ?></td>
                                                    <td><?php echo htmlspecialchars($product['category']); ?></td>
                                                    <td><?php echo number_format($product['current_stock']); ?></td>
                                                    <td><?php echo formatDate($product['created_at'], 'M d'); ?></td>
                                                </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Recent Requests</h6>
                            </div>
                            <div class="card-body">
                                <?php
                                $stmt = $db->query("SELECT mr.request_number, mr.client_name, mr.status, mr.requested_date, u.name as requested_by 
                                                   FROM material_requests mr 
                                                   LEFT JOIN users u ON mr.user_id = u.id 
                                                   ORDER BY mr.requested_date DESC LIMIT 5");
                                $recentRequests = $stmt->fetchAll();
                                ?>
                                <?php if (empty($recentRequests)): ?>
                                    <p class="text-muted">No requests found.</p>
                                <?php else: ?>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Request #</th>
                                                    <th>Client</th>
                                                    <th>Status</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($recentRequests as $request): ?>
                                                <tr>
                                                    <td><?php echo htmlspecialchars($request['request_number']); ?></td>
                                                    <td><?php echo htmlspecialchars($request['client_name']); ?></td>
                                                    <td>
                                                        <span class="badge bg-<?php echo getStatusColor($request['status']); ?>">
                                                            <?php echo ucfirst($request['status']); ?>
                                                        </span>
                                                    </td>
                                                    <td><?php echo formatDate($request['requested_date'], 'M d'); ?></td>
                                                </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/main.js"></script>
</body>
</html>

<?php
function getStatusColor($status) {
    switch ($status) {
        case 'pending': return 'warning';
        case 'approved': return 'info';
        case 'completed': return 'success';
        case 'rejected': return 'danger';
        default: return 'secondary';
    }
}
?>