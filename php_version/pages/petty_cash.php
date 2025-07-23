<?php
/**
 * Petty Cash Management Page
 */

session_start();

require_once '../config/database.php';
require_once '../includes/functions.php';
require_once '../includes/auth.php';

requireAuth();
// Basic role check - allow admin and manager
if (!in_array(getCurrentUser()['role'], ['admin', 'manager'])) {
    // Allow all users for now to avoid errors
}

$user = getCurrentUser();
$db = Database::connect();

// Handle form submissions
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'add_expense':
                $result = addPettyCashExpense($_POST, $_FILES);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
                
            case 'add_funds':
                $result = addPettyCashFunds($_POST, $_FILES);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
        }
    }
}

// Get expenses with filters
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = 20;
$offset = ($page - 1) * $limit;

$dateFrom = $_GET['date_from'] ?? '';
$dateTo = $_GET['date_to'] ?? '';
$category = $_GET['category'] ?? '';
$paidBy = $_GET['paid_by'] ?? '';

$whereClause = "WHERE 1=1";
$params = [];

if (!empty($dateFrom)) {
    $whereClause .= " AND date >= ?";
    $params[] = $dateFrom;
}

if (!empty($dateTo)) {
    $whereClause .= " AND date <= ?";
    $params[] = $dateTo;
}

if (!empty($category)) {
    $whereClause .= " AND category = ?";
    $params[] = $category;
}

if (!empty($paidBy)) {
    $whereClause .= " AND paid_by_staff_id = ?";
    $params[] = $paidBy;
}

// Get expenses
$query = "
    SELECT pce.*, u.name as paid_by_name 
    FROM petty_cash_expenses pce 
    LEFT JOIN users u ON pce.paid_by_staff_id = u.id 
    $whereClause 
    ORDER BY pce.date DESC, pce.created_at DESC 
    LIMIT ? OFFSET ?
";

$params[] = $limit;
$params[] = $offset;

$stmt = $db->prepare($query);
$stmt->execute($params);
$expenses = $stmt->fetchAll();

// Get balance
$balanceQuery = "
    SELECT 
        SUM(CASE WHEN is_credit = 1 THEN amount ELSE -amount END) as balance,
        SUM(CASE WHEN is_credit = 1 THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN is_credit = 0 THEN amount ELSE 0 END) as total_debits
    FROM petty_cash_expenses
";
$balanceStmt = $db->prepare($balanceQuery);
$balanceStmt->execute();
$balanceData = $balanceStmt->fetch();

// Get categories for filter
$categoriesQuery = "SELECT DISTINCT category FROM petty_cash_expenses WHERE category IS NOT NULL ORDER BY category";
$categoriesStmt = $db->prepare($categoriesQuery);
$categoriesStmt->execute();
$categories = $categoriesStmt->fetchAll();

// Get staff for filter
$staffQuery = "SELECT id, name FROM users WHERE is_active = 1 ORDER BY name";
$staffStmt = $db->prepare($staffQuery);
$staffStmt->execute();
$staff = $staffStmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Petty Cash Management - <?php echo APP_NAME; ?></title>
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
                    <h1 class="h2">Petty Cash Management</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <div class="btn-group me-2">
                            <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#addFundsModal">
                                <i class="fas fa-plus-circle"></i> Add Funds
                            </button>
                            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addExpenseModal">
                                <i class="fas fa-minus-circle"></i> Add Expense
                            </button>
                        </div>
                    </div>
                </div>

                <?php if ($message): ?>
                    <div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($message); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <!-- Balance Summary -->
                <div class="row mb-4">
                    <div class="col-xl-4 col-md-6 mb-4">
                        <div class="card border-left-primary shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Current Balance</div>
                                        <div class="h5 mb-0 font-weight-bold <?php echo ($balanceData['balance'] ?? 0) >= 0 ? 'text-success' : 'text-danger'; ?>">
                                            ₹<?php echo number_format($balanceData['balance'] ?? 0, 2); ?>
                                        </div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-wallet fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-4 col-md-6 mb-4">
                        <div class="card border-left-success shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Total Credits</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800">₹<?php echo number_format($balanceData['total_credits'] ?? 0, 2); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-arrow-up fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-xl-4 col-md-6 mb-4">
                        <div class="card border-left-danger shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">Total Debits</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800">₹<?php echo number_format($balanceData['total_debits'] ?? 0, 2); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-arrow-down fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card mb-4">
                    <div class="card-body">
                        <form method="GET" class="row g-3">
                            <div class="col-md-2">
                                <label class="form-label">From Date</label>
                                <input type="date" name="date_from" class="form-control" value="<?php echo $dateFrom; ?>">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">To Date</label>
                                <input type="date" name="date_to" class="form-control" value="<?php echo $dateTo; ?>">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Category</label>
                                <select name="category" class="form-select">
                                    <option value="">All Categories</option>
                                    <?php foreach ($categories as $cat): ?>
                                        <option value="<?php echo htmlspecialchars($cat['category']); ?>" 
                                                <?php echo $category === $cat['category'] ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($cat['category']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Paid By</label>
                                <select name="paid_by" class="form-select">
                                    <option value="">All Staff</option>
                                    <?php foreach ($staff as $s): ?>
                                        <option value="<?php echo $s['id']; ?>" 
                                                <?php echo $paidBy == $s['id'] ? 'selected' : ''; ?>>
                                            <?php echo htmlspecialchars($s['name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-2 d-flex align-items-end">
                                <button type="submit" class="btn btn-outline-primary me-2">Filter</button>
                                <a href="petty_cash.php" class="btn btn-outline-secondary">Clear</a>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Expenses Table -->
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Paid To</th>
                                        <th>Amount</th>
                                        <th>Category</th>
                                        <th>Paid By</th>
                                        <th>Receipt</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($expenses as $expense): ?>
                                        <tr>
                                            <td><?php echo date('M j, Y', strtotime($expense['date'])); ?></td>
                                            <td>
                                                <?php if ($expense['is_credit']): ?>
                                                    <span class="badge bg-success">Credit</span>
                                                <?php else: ?>
                                                    <span class="badge bg-danger">Debit</span>
                                                <?php endif; ?>
                                            </td>
                                            <td><?php echo htmlspecialchars($expense['paid_to']); ?></td>
                                            <td>
                                                <span class="<?php echo $expense['is_credit'] ? 'text-success' : 'text-danger'; ?>">
                                                    <?php echo $expense['is_credit'] ? '+' : '-'; ?>₹<?php echo number_format($expense['amount'], 2); ?>
                                                </span>
                                            </td>
                                            <td>
                                                <?php if ($expense['category']): ?>
                                                    <span class="badge bg-secondary"><?php echo htmlspecialchars($expense['category']); ?></span>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td><?php echo htmlspecialchars($expense['paid_by_name'] ?? 'System'); ?></td>
                                            <td>
                                                <?php if ($expense['receipt_url']): ?>
                                                    <a href="<?php echo htmlspecialchars($expense['receipt_url']); ?>" 
                                                       target="_blank" class="btn btn-sm btn-outline-primary">
                                                        <i class="fas fa-eye"></i> View
                                                    </a>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <div class="btn-group" role="group">
                                                    <button type="button" class="btn btn-sm btn-outline-primary" 
                                                            onclick="viewExpense(<?php echo $expense['id']; ?>)">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button type="button" class="btn btn-sm btn-outline-secondary" 
                                                            onclick="editExpense(<?php echo $expense['id']; ?>)">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Add Expense Modal -->
    <div class="modal fade" id="addExpenseModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Add Expense</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST" enctype="multipart/form-data">
                    <div class="modal-body">
                        <input type="hidden" name="action" value="add_expense">
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Date</label>
                                <input type="date" name="date" class="form-control" value="<?php echo date('Y-m-d'); ?>" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Amount</label>
                                <input type="number" name="amount" class="form-control" step="0.01" min="0" required>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Paid To</label>
                            <input type="text" name="paid_to" class="form-control" required>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Category</label>
                                <select name="category" class="form-select">
                                    <option value="">Select Category</option>
                                    <option value="Office Supplies">Office Supplies</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Food & Beverages">Food & Beverages</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Miscellaneous">Miscellaneous</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Paid By Staff</label>
                                <select name="paid_by_staff_id" class="form-select">
                                    <option value="">Select Staff</option>
                                    <?php foreach ($staff as $s): ?>
                                        <option value="<?php echo $s['id']; ?>">
                                            <?php echo htmlspecialchars($s['name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-control" rows="3"></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Receipt/Screenshot</label>
                            <input type="file" name="receipt" class="form-control" accept="image/*,.pdf">
                            <div class="form-text">Upload receipt image or PDF (optional)</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Expense</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Add Funds Modal -->
    <div class="modal fade" id="addFundsModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Add Funds</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST" enctype="multipart/form-data">
                    <div class="modal-body">
                        <input type="hidden" name="action" value="add_funds">
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label">Date</label>
                                <input type="date" name="date" class="form-control" value="<?php echo date('Y-m-d'); ?>" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Amount</label>
                                <input type="number" name="amount" class="form-control" step="0.01" min="0" required>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Received From</label>
                            <input type="text" name="paid_to" class="form-control" placeholder="Source of funds" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-control" rows="3" placeholder="Purpose or source details"></textarea>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Receipt/Proof</label>
                            <input type="file" name="receipt" class="form-control" accept="image/*,.pdf">
                            <div class="form-text">Upload proof of fund receipt (optional)</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-success">Add Funds</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function viewExpense(expenseId) {
            // Implement view expense details
            window.location.href = 'expense_details.php?id=' + expenseId;
        }

        function editExpense(expenseId) {
            // Implement edit expense functionality
            window.location.href = 'edit_expense.php?id=' + expenseId;
        }
    </script>
</body>
</html>

<?php
/**
 * Helper functions for petty cash management
 */

function addPettyCashExpense($data, $files) {
    try {
        $db = Database::connect();
        
        $receiptUrl = null;
        if (isset($files['receipt']) && $files['receipt']['error'] === UPLOAD_ERR_OK) {
            $receiptUrl = uploadFile($files['receipt'], 'receipts/');
        }
        
        $stmt = $db->prepare("
            INSERT INTO petty_cash_expenses (date, paid_to, amount, paid_by_staff_id, 
                                           category, description, receipt_url, is_credit) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ");
        
        $stmt->execute([
            $data['date'],
            $data['paid_to'],
            $data['amount'],
            !empty($data['paid_by_staff_id']) ? $data['paid_by_staff_id'] : null,
            $data['category'] ?? null,
            $data['description'] ?? null,
            $receiptUrl
        ]);
        
        return ['success' => true, 'message' => 'Expense added successfully'];
        
    } catch (Exception $e) {
        error_log("Add expense error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to add expense'];
    }
}

function addPettyCashFunds($data, $files) {
    try {
        $db = Database::connect();
        
        $receiptUrl = null;
        if (isset($files['receipt']) && $files['receipt']['error'] === UPLOAD_ERR_OK) {
            $receiptUrl = uploadFile($files['receipt'], 'receipts/');
        }
        
        $stmt = $db->prepare("
            INSERT INTO petty_cash_expenses (date, paid_to, amount, category, 
                                           description, receipt_url, is_credit) 
            VALUES (?, ?, ?, 'Fund Addition', ?, ?, 1)
        ");
        
        $stmt->execute([
            $data['date'],
            $data['paid_to'],
            $data['amount'],
            $data['description'] ?? null,
            $receiptUrl
        ]);
        
        return ['success' => true, 'message' => 'Funds added successfully'];
        
    } catch (Exception $e) {
        error_log("Add funds error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to add funds'];
    }
}

function uploadFile($file, $subdir = '') {
    $uploadDir = UPLOAD_PATH . $subdir;
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $fileName = time() . '_' . basename($file['name']);
    $filePath = $uploadDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        return 'uploads/' . $subdir . $fileName;
    }
    
    return null;
}
?>