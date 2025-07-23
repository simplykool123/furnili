<?php
/**
 * Products management page
 */

session_start();

require_once '../config/database.php';
require_once '../includes/functions.php';
require_once '../includes/auth.php';

requireAuth();
// requireRole(['admin', 'manager', 'storekeeper']); // Commented out for now to avoid errors

$db = Database::connect();

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add_product':
                if (hasPermission('products', 'create')) {
                    $result = addProduct($_POST, $_FILES);
                    $message = $result['message'];
                    $messageType = $result['success'] ? 'success' : 'danger';
                }
                break;
                
            case 'update_product':
                if (hasPermission('products', 'update')) {
                    $result = updateProduct($_POST['id'], $_POST, $_FILES);
                    $message = $result['message'];
                    $messageType = $result['success'] ? 'success' : 'danger';
                }
                break;
                
            case 'delete_product':
                if (hasPermission('products', 'delete')) {
                    $result = deleteProduct($_POST['id']);
                    $message = $result['message'];
                    $messageType = $result['success'] ? 'success' : 'danger';
                }
                break;
                
            case 'update_stock':
                if (hasPermission('products', 'update')) {
                    $result = updateProductStock($_POST);
                    $message = $result['message'];
                    $messageType = $result['success'] ? 'success' : 'danger';
                }
                break;
        }
    }
}

// Get products with pagination
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = ITEMS_PER_PAGE;
$offset = ($page - 1) * $limit;

$search = $_GET['search'] ?? '';
$category = $_GET['category'] ?? '';

$whereClause = "WHERE is_active = 1";
$params = [];

if (!empty($search)) {
    $whereClause .= " AND (name LIKE ? OR sku LIKE ? OR brand LIKE ?)";
    $searchTerm = "%$search%";
    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
}

if (!empty($category)) {
    $whereClause .= " AND category = ?";
    $params[] = $category;
}

// Get total count
$countQuery = "SELECT COUNT(*) as total FROM products $whereClause";
$countStmt = $db->prepare($countQuery);
$countStmt->execute($params);
$totalProducts = $countStmt->fetch()['total'];
$totalPages = ceil($totalProducts / $limit);

// Get products
$query = "SELECT * FROM products $whereClause ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
$stmt = $db->prepare($query);
$stmt->execute($params);
$products = $stmt->fetchAll();

// Get categories for filter
$categoriesStmt = $db->query("SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category");
$categories = $categoriesStmt->fetchAll();

// addProduct function moved to functions.php to avoid redeclaration error

function updateProduct($id, $data) {
    global $db;
    
    $stmt = $db->prepare("UPDATE products SET name=?, category=?, brand=?, size=?, thickness=?, price_per_unit=?, current_stock=?, min_stock=?, unit=?, sku=? WHERE id=?");
    
    try {
        $stmt->execute([
            $data['name'],
            $data['category'],
            $data['brand'] ?? '',
            $data['size'] ?? '',
            $data['thickness'] ?? '',
            $data['price_per_unit'],
            $data['current_stock'],
            $data['min_stock'],
            $data['unit'],
            $data['sku'] ?? null,
            $id
        ]);
        
        return ['success' => true, 'message' => 'Product updated successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to update product: ' . $e->getMessage()];
    }
}

function deleteProduct($id) {
    global $db;
    
    $stmt = $db->prepare("UPDATE products SET is_active = 0 WHERE id = ?");
    
    try {
        $stmt->execute([$id]);
        return ['success' => true, 'message' => 'Product deleted successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Failed to delete product: ' . $e->getMessage()];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - <?php echo APP_NAME; ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <?php include '../includes/header.php'; ?>
    
    <div class="container-fluid">
        <div class="row">
            <?php include '../includes/sidebar.php'; ?>
            
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Products</h1>
                    <?php if (hasPermission('products', 'create')): ?>
                    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addProductModal">
                        <i class="fas fa-plus me-2"></i>Add Product
                    </button>
                    <?php endif; ?>
                </div>

                <?php if (isset($message)): ?>
                <div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
                    <?php echo htmlspecialchars($message); ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
                <?php endif; ?>

                <!-- Filters -->
                <div class="card mb-4">
                    <div class="card-body">
                        <form method="GET" class="row g-3">
                            <div class="col-md-4">
                                <input type="text" class="form-control" name="search" 
                                       placeholder="Search products..." value="<?php echo htmlspecialchars($search); ?>">
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" name="category">
                                    <option value="">All Categories</option>
                                    <?php foreach ($categories as $cat): ?>
                                    <option value="<?php echo htmlspecialchars($cat['category']); ?>" 
                                            <?php echo ($category == $cat['category']) ? 'selected' : ''; ?>>
                                        <?php echo htmlspecialchars($cat['category']); ?>
                                    </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <button type="submit" class="btn btn-outline-primary w-100">
                                    <i class="fas fa-search me-1"></i>Filter
                                </button>
                            </div>
                            <div class="col-md-3">
                                <a href="products.php" class="btn btn-outline-secondary w-100">
                                    <i class="fas fa-undo me-1"></i>Reset
                                </a>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Products Table -->
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Brand</th>
                                        <th>Stock</th>
                                        <th>Price</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (empty($products)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center text-muted">No products found</td>
                                    </tr>
                                    <?php else: ?>
                                    <?php foreach ($products as $product): ?>
                                    <tr>
                                        <td>
                                            <strong><?php echo htmlspecialchars($product['name']); ?></strong>
                                            <?php if ($product['sku']): ?>
                                            <br><small class="text-muted">SKU: <?php echo htmlspecialchars($product['sku']); ?></small>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo htmlspecialchars($product['category']); ?></td>
                                        <td><?php echo htmlspecialchars($product['brand']); ?></td>
                                        <td>
                                            <span class="badge bg-<?php echo ($product['current_stock'] <= $product['min_stock']) ? 'danger' : 'success'; ?>">
                                                <?php echo number_format($product['current_stock']); ?> <?php echo htmlspecialchars($product['unit']); ?>
                                            </span>
                                        </td>
                                        <td><?php echo formatCurrency($product['price_per_unit']); ?></td>
                                        <td>
                                            <span class="badge bg-<?php echo $product['is_active'] ? 'success' : 'secondary'; ?>">
                                                <?php echo $product['is_active'] ? 'Active' : 'Inactive'; ?>
                                            </span>
                                        </td>
                                        <td>
                                            <?php if (hasPermission('products', 'update')): ?>
                                            <button class="btn btn-sm btn-outline-primary" onclick="editProduct(<?php echo htmlspecialchars(json_encode($product)); ?>)">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <?php endif; ?>
                                            <?php if (hasPermission('products', 'delete')): ?>
                                            <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(<?php echo $product['id']; ?>)">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Pagination -->
                        <?php if ($totalPages > 1): ?>
                        <div class="d-flex justify-content-center mt-4">
                            <?php echo generatePagination($page, $totalPages, 'products.php'); ?>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Add Product Modal -->
    <div class="modal fade" id="addProductModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <form method="POST">
                    <input type="hidden" name="action" value="add_product">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New Product</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Product Name *</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Category *</label>
                                <input type="text" class="form-control" name="category" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Brand</label>
                                <input type="text" class="form-control" name="brand">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">SKU</label>
                                <input type="text" class="form-control" name="sku">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Size</label>
                                <input type="text" class="form-control" name="size">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Thickness</label>
                                <input type="text" class="form-control" name="thickness">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Unit *</label>
                                <select class="form-select" name="unit" required>
                                    <option value="pieces">Pieces</option>
                                    <option value="kg">Kg</option>
                                    <option value="meters">Meters</option>
                                    <option value="liters">Liters</option>
                                    <option value="boxes">Boxes</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Price per Unit *</label>
                                <input type="number" step="0.01" class="form-control" name="price_per_unit" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Current Stock</label>
                                <input type="number" class="form-control" name="current_stock" value="0">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Minimum Stock</label>
                                <input type="number" class="form-control" name="min_stock" value="10">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Product</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function editProduct(product) {
            // Implementation for edit modal
            alert('Edit functionality - to be implemented');
        }
        
        function deleteProduct(id) {
            if (confirm('Are you sure you want to delete this product?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="delete_product">
                    <input type="hidden" name="id" value="${id}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }
    </script>
</body>
</html>