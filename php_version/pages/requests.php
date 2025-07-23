<?php
/**
 * Material Requests Management Page
 */

session_start();

require_once '../config/database.php';
require_once '../includes/functions.php';
require_once '../includes/auth.php';

requireAuth();
$user = getCurrentUser();
$db = Database::connect();

// Handle form submissions
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'create_request':
                $result = createMaterialRequest($_POST, $user['id']);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
                
            case 'update_status':
                if (hasPermission('requests', 'update')) {
                    $result = updateRequestStatus($_POST['request_id'], $_POST['status']);
                    $message = $result['message'];
                    $messageType = $result['success'] ? 'success' : 'danger';
                }
                break;
        }
    }
}

// Get requests with filters
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = 20;
$offset = ($page - 1) * $limit;

$status = $_GET['status'] ?? '';
$priority = $_GET['priority'] ?? '';

$whereClause = "WHERE 1=1";
$params = [];

if (!empty($status)) {
    $whereClause .= " AND status = ?";
    $params[] = $status;
}

if (!empty($priority)) {
    $whereClause .= " AND priority = ?";
    $params[] = $priority;
}

// Role-based filtering
if ($user['role'] === 'user') {
    $whereClause .= " AND user_id = ?";
    $params[] = $user['id'];
}

// Get requests
$query = "SELECT mr.*, u.name as requested_by 
          FROM material_requests mr 
          JOIN users u ON mr.user_id = u.id 
          $whereClause 
          ORDER BY mr.requested_date DESC 
          LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;

$stmt = $db->prepare($query);
$stmt->execute($params);
$requests = $stmt->fetchAll();

// Get total count for pagination
$countQuery = "SELECT COUNT(*) as total FROM material_requests mr $whereClause";
$countStmt = $db->prepare($countQuery);
$countStmt->execute(array_slice($params, 0, -2)); // Remove limit and offset
$totalRequests = $countStmt->fetch()['total'];
$totalPages = ceil($totalRequests / $limit);

// Get products for new request form
$productsQuery = "SELECT id, name, current_stock, price_per_unit FROM products WHERE is_active = 1 ORDER BY name";
$productsStmt = $db->prepare($productsQuery);
$productsStmt->execute();
$products = $productsStmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Material Requests - <?php echo APP_NAME; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="../assets/css/style.css" rel="stylesheet">
</head>
<body>
    <?php include '../includes/header.php'; ?>
    
    <div class="container-fluid">
        <div class="row">
            <?php include '../includes/sidebar.php'; ?>
            
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Material Requests</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#newRequestModal">
                            <i class="fas fa-plus"></i> New Request
                        </button>
                    </div>
                </div>

                <?php if ($message): ?>
                    <div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($message); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <!-- Filters -->
                <div class="card mb-4">
                    <div class="card-body">
                        <form method="GET" class="row g-3">
                            <div class="col-md-3">
                                <label class="form-label">Status</label>
                                <select name="status" class="form-select">
                                    <option value="">All Status</option>
                                    <option value="pending" <?php echo $status === 'pending' ? 'selected' : ''; ?>>Pending</option>
                                    <option value="approved" <?php echo $status === 'approved' ? 'selected' : ''; ?>>Approved</option>
                                    <option value="rejected" <?php echo $status === 'rejected' ? 'selected' : ''; ?>>Rejected</option>
                                    <option value="issued" <?php echo $status === 'issued' ? 'selected' : ''; ?>>Issued</option>
                                    <option value="completed" <?php echo $status === 'completed' ? 'selected' : ''; ?>>Completed</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Priority</label>
                                <select name="priority" class="form-select">
                                    <option value="">All Priority</option>
                                    <option value="low" <?php echo $priority === 'low' ? 'selected' : ''; ?>>Low</option>
                                    <option value="medium" <?php echo $priority === 'medium' ? 'selected' : ''; ?>>Medium</option>
                                    <option value="high" <?php echo $priority === 'high' ? 'selected' : ''; ?>>High</option>
                                </select>
                            </div>
                            <div class="col-md-3 d-flex align-items-end">
                                <button type="submit" class="btn btn-outline-primary me-2">Filter</button>
                                <a href="requests.php" class="btn btn-outline-secondary">Clear</a>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Requests Table -->
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Request #</th>
                                        <th>Requested By</th>
                                        <th>Client/Site</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($requests as $request): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($request['request_number']); ?></td>
                                            <td><?php echo htmlspecialchars($request['requested_by']); ?></td>
                                            <td>
                                                <?php if ($request['client_name']): ?>
                                                    <strong><?php echo htmlspecialchars($request['client_name']); ?></strong><br>
                                                    <small class="text-muted"><?php echo htmlspecialchars($request['site_location'] ?? ''); ?></small>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <span class="badge bg-<?php 
                                                    echo match($request['status']) {
                                                        'pending' => 'warning',
                                                        'approved' => 'success',
                                                        'rejected' => 'danger',
                                                        'issued' => 'info',
                                                        'completed' => 'dark',
                                                        default => 'secondary'
                                                    };
                                                ?>">
                                                    <?php echo ucfirst($request['status']); ?>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge bg-<?php 
                                                    echo match($request['priority']) {
                                                        'high' => 'danger',
                                                        'medium' => 'warning',
                                                        'low' => 'secondary',
                                                        default => 'secondary'
                                                    };
                                                ?>">
                                                    <?php echo ucfirst($request['priority']); ?>
                                                </span>
                                            </td>
                                            <td><?php echo date('M j, Y', strtotime($request['requested_date'])); ?></td>
                                            <td>₹<?php echo number_format($request['total_amount'], 2); ?></td>
                                            <td>
                                                <div class="btn-group" role="group">
                                                    <button type="button" class="btn btn-sm btn-outline-primary" 
                                                            onclick="viewRequest(<?php echo $request['id']; ?>)">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <?php if (hasPermission('requests', 'update') && $request['status'] === 'pending'): ?>
                                                        <button type="button" class="btn btn-sm btn-outline-success" 
                                                                onclick="updateStatus(<?php echo $request['id']; ?>, 'approved')">
                                                            <i class="fas fa-check"></i>
                                                        </button>
                                                        <button type="button" class="btn btn-sm btn-outline-danger" 
                                                                onclick="updateStatus(<?php echo $request['id']; ?>, 'rejected')">
                                                            <i class="fas fa-times"></i>
                                                        </button>
                                                    <?php endif; ?>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination -->
                        <?php if ($totalPages > 1): ?>
                            <nav aria-label="Requests pagination">
                                <ul class="pagination justify-content-center">
                                    <li class="page-item <?php echo $page <= 1 ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $page - 1; ?>&status=<?php echo $status; ?>&priority=<?php echo $priority; ?>">Previous</a>
                                    </li>
                                    <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                        <li class="page-item <?php echo $i === $page ? 'active' : ''; ?>">
                                            <a class="page-link" href="?page=<?php echo $i; ?>&status=<?php echo $status; ?>&priority=<?php echo $priority; ?>"><?php echo $i; ?></a>
                                        </li>
                                    <?php endfor; ?>
                                    <li class="page-item <?php echo $page >= $totalPages ? 'disabled' : ''; ?>">
                                        <a class="page-link" href="?page=<?php echo $page + 1; ?>&status=<?php echo $status; ?>&priority=<?php echo $priority; ?>">Next</a>
                                    </li>
                                </ul>
                            </nav>
                        <?php endif; ?>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- New Request Modal -->
    <div class="modal fade" id="newRequestModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">New Material Request</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST">
                    <div class="modal-body">
                        <input type="hidden" name="action" value="create_request">
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Client Name</label>
                                <input type="text" name="client_name" class="form-control">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Site Location</label>
                                <input type="text" name="site_location" class="form-control">
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Priority</label>
                                <select name="priority" class="form-select" required>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">BOQ Reference (Optional)</label>
                                <input type="text" name="boq_reference" class="form-control">
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Notes</label>
                            <textarea name="notes" class="form-control" rows="3"></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Request Items</label>
                            <div id="request-items">
                                <div class="row mb-2 request-item">
                                    <div class="col-md-5">
                                        <select name="products[]" class="form-select" required>
                                            <option value="">Select Product</option>
                                            <?php foreach ($products as $product): ?>
                                                <option value="<?php echo $product['id']; ?>" 
                                                        data-price="<?php echo $product['price_per_unit']; ?>"
                                                        data-stock="<?php echo $product['current_stock']; ?>">
                                                    <?php echo htmlspecialchars($product['name']); ?> 
                                                    (Stock: <?php echo $product['current_stock']; ?>)
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <input type="number" name="quantities[]" class="form-control" 
                                               placeholder="Quantity" min="1" required>
                                    </div>
                                    <div class="col-md-3">
                                        <input type="number" name="unit_prices[]" class="form-control" 
                                               placeholder="Unit Price" step="0.01" readonly>
                                    </div>
                                    <div class="col-md-1">
                                        <button type="button" class="btn btn-outline-danger btn-sm remove-item">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline-primary btn-sm" id="add-item">
                                <i class="fas fa-plus"></i> Add Item
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Request</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Add item functionality
        document.getElementById('add-item').addEventListener('click', function() {
            const container = document.getElementById('request-items');
            const firstItem = container.querySelector('.request-item');
            const newItem = firstItem.cloneNode(true);
            
            // Clear values
            newItem.querySelectorAll('input, select').forEach(input => {
                input.value = '';
            });
            
            container.appendChild(newItem);
            updateRemoveButtons();
        });

        // Remove item functionality
        document.addEventListener('click', function(e) {
            if (e.target.closest('.remove-item')) {
                const items = document.querySelectorAll('.request-item');
                if (items.length > 1) {
                    e.target.closest('.request-item').remove();
                    updateRemoveButtons();
                }
            }
        });

        function updateRemoveButtons() {
            const items = document.querySelectorAll('.request-item');
            items.forEach((item, index) => {
                const removeBtn = item.querySelector('.remove-item');
                removeBtn.style.display = items.length > 1 ? 'block' : 'none';
            });
        }

        // Update price when product is selected
        document.addEventListener('change', function(e) {
            if (e.target.name === 'products[]') {
                const option = e.target.selectedOptions[0];
                const priceInput = e.target.closest('.request-item').querySelector('input[name="unit_prices[]"]');
                priceInput.value = option.dataset.price || '';
            }
        });

        function updateStatus(requestId, status) {
            if (confirm('Are you sure you want to ' + status + ' this request?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="update_status">
                    <input type="hidden" name="request_id" value="${requestId}">
                    <input type="hidden" name="status" value="${status}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function viewRequest(requestId) {
            // Implement view request details
            window.location.href = 'request_details.php?id=' + requestId;
        }

        // Initialize
        updateRemoveButtons();
    </script>
</body>
</html>

<?php
/**
 * Helper functions for material requests
 */

function createMaterialRequest($data, $userId) {
    try {
        $db = Database::connect();
        $db->beginTransaction();
        
        // Generate request number
        $requestNumber = 'REQ-' . date('Y') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        
        // Create main request
        $stmt = $db->prepare("
            INSERT INTO material_requests (request_number, user_id, client_name, site_location, 
                                         priority, boq_reference, notes, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        
        $stmt->execute([
            $requestNumber,
            $userId,
            $data['client_name'] ?? null,
            $data['site_location'] ?? null,
            $data['priority'] ?? 'medium',
            $data['boq_reference'] ?? null,
            $data['notes'] ?? null
        ]);
        
        $requestId = $db->lastInsertId();
        $totalAmount = 0;
        
        // Add request items
        if (isset($data['products']) && is_array($data['products'])) {
            for ($i = 0; $i < count($data['products']); $i++) {
                if (!empty($data['products'][$i]) && !empty($data['quantities'][$i])) {
                    $productId = $data['products'][$i];
                    $quantity = (int)$data['quantities'][$i];
                    $unitPrice = (float)($data['unit_prices'][$i] ?? 0);
                    $totalPrice = $quantity * $unitPrice;
                    $totalAmount += $totalPrice;
                    
                    // Get product name
                    $productStmt = $db->prepare("SELECT name FROM products WHERE id = ?");
                    $productStmt->execute([$productId]);
                    $product = $productStmt->fetch();
                    
                    $itemStmt = $db->prepare("
                        INSERT INTO request_items (request_id, product_id, product_name, quantity, unit_price, total_price) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    
                    $itemStmt->execute([
                        $requestId,
                        $productId,
                        $product['name'],
                        $quantity,
                        $unitPrice,
                        $totalPrice
                    ]);
                }
            }
        }
        
        // Update total amount
        $updateStmt = $db->prepare("UPDATE material_requests SET total_amount = ? WHERE id = ?");
        $updateStmt->execute([$totalAmount, $requestId]);
        
        $db->commit();
        return ['success' => true, 'message' => 'Material request created successfully'];
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Create request error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to create request'];
    }
}

function updateRequestStatus($requestId, $status) {
    try {
        $db = Database::connect();
        
        $stmt = $db->prepare("UPDATE material_requests SET status = ? WHERE id = ?");
        $stmt->execute([$status, $requestId]);
        
        return ['success' => true, 'message' => 'Request status updated successfully'];
        
    } catch (Exception $e) {
        error_log("Update status error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to update request status'];
    }
}
?>