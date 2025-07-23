<?php
/**
 * Data Backup and Export Page
 */

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

requireAuth();
requireRole(['admin', 'manager']);

$user = getCurrentUser();
$db = Database::connect();

// Handle backup requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    switch ($_POST['action']) {
        case 'backup_database':
            generateDatabaseBackup($_POST);
            break;
        case 'export_excel':
            exportToExcel($_POST);
            break;
        case 'export_csv':
            exportToCSV($_POST);
            break;
    }
}

// Get table statistics
$tableStats = getDatabaseStatistics();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Backup - <?php echo APP_NAME; ?></title>
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
                    <h1 class="h2">Data Backup & Export</h1>
                </div>

                <!-- Database Statistics -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Database Statistics</h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <?php foreach ($tableStats as $table => $stats): ?>
                                        <div class="col-md-3 mb-3">
                                            <div class="text-center">
                                                <div class="h3 text-primary"><?php echo number_format($stats['count']); ?></div>
                                                <div class="text-muted"><?php echo ucwords(str_replace('_', ' ', $table)); ?></div>
                                                <small class="text-muted">Last updated: <?php echo $stats['last_updated'] ?? 'N/A'; ?></small>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <!-- Full Database Backup -->
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-header bg-danger text-white">
                                <h5 class="mb-0"><i class="fas fa-database me-2"></i>Full Database Backup</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Create a complete SQL dump of your database including structure and data.</p>
                                
                                <form method="POST">
                                    <input type="hidden" name="action" value="backup_database">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Backup Type</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="backup_type" value="structure_data" checked>
                                            <label class="form-check-label">Structure + Data</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="backup_type" value="structure_only">
                                            <label class="form-check-label">Structure Only</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="backup_type" value="data_only">
                                            <label class="form-check-label">Data Only</label>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Tables to Include</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="tables[]" value="all" checked id="selectAll">
                                            <label class="form-check-label" for="selectAll"><strong>Select All</strong></label>
                                        </div>
                                        <hr>
                                        <?php foreach (array_keys($tableStats) as $table): ?>
                                            <div class="form-check">
                                                <input class="form-check-input table-checkbox" type="checkbox" name="tables[]" value="<?php echo $table; ?>" checked>
                                                <label class="form-check-label"><?php echo ucwords(str_replace('_', ' ', $table)); ?></label>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-danger w-100">
                                        <i class="fas fa-download me-2"></i>Generate SQL Backup
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Excel Export -->
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                <h5 class="mb-0"><i class="fas fa-file-excel me-2"></i>Excel Export</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Export specific data modules to Excel format for analysis and reporting.</p>
                                
                                <form method="POST">
                                    <input type="hidden" name="action" value="export_excel">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Data Module</label>
                                        <select name="module" class="form-select" required>
                                            <option value="">Select Module</option>
                                            <option value="products">Products Inventory</option>
                                            <option value="material_requests">Material Requests</option>
                                            <option value="petty_cash">Petty Cash Expenses</option>
                                            <option value="attendance">Staff Attendance</option>
                                            <option value="users">User Accounts</option>
                                            <option value="stock_movements">Stock Movements</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Date Range (Optional)</label>
                                        <div class="row">
                                            <div class="col-6">
                                                <input type="date" name="start_date" class="form-control" placeholder="Start Date">
                                            </div>
                                            <div class="col-6">
                                                <input type="date" name="end_date" class="form-control" placeholder="End Date">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="include_formulas" id="includeFormulas">
                                            <label class="form-check-label" for="includeFormulas">Include Formulas</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="include_charts" id="includeCharts">
                                            <label class="form-check-label" for="includeCharts">Include Charts</label>
                                        </div>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-success w-100">
                                        <i class="fas fa-file-excel me-2"></i>Export to Excel
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- CSV Export -->
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0"><i class="fas fa-file-csv me-2"></i>CSV Export</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Export data in CSV format for compatibility with various systems.</p>
                                
                                <form method="POST">
                                    <input type="hidden" name="action" value="export_csv">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Data Table</label>
                                        <select name="table" class="form-select" required>
                                            <option value="">Select Table</option>
                                            <?php foreach (array_keys($tableStats) as $table): ?>
                                                <option value="<?php echo $table; ?>"><?php echo ucwords(str_replace('_', ' ', $table)); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">CSV Options</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="include_headers" checked>
                                            <label class="form-check-label">Include Column Headers</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="escape_quotes" checked>
                                            <label class="form-check-label">Escape Quotes</label>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Delimiter</label>
                                        <select name="delimiter" class="form-select">
                                            <option value=",">Comma (,)</option>
                                            <option value=";">Semicolon (;)</option>
                                            <option value="\t">Tab</option>
                                            <option value="|">Pipe (|)</option>
                                        </select>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-info w-100">
                                        <i class="fas fa-file-csv me-2"></i>Export to CSV
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Backups -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Recent Backups & Exports</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php
                                    $backupFiles = getRecentBackupFiles();
                                    foreach ($backupFiles as $file):
                                    ?>
                                        <tr>
                                            <td>
                                                <i class="fas fa-<?php echo getFileIcon($file['extension']); ?> me-2"></i>
                                                <?php echo htmlspecialchars($file['name']); ?>
                                            </td>
                                            <td>
                                                <span class="badge bg-<?php echo getFileTypeBadgeColor($file['extension']); ?>">
                                                    <?php echo strtoupper($file['extension']); ?>
                                                </span>
                                            </td>
                                            <td><?php echo formatFileSize($file['size']); ?></td>
                                            <td><?php echo date('M j, Y g:i A', $file['created']); ?></td>
                                            <td>
                                                <a href="<?php echo $file['path']; ?>" class="btn btn-sm btn-outline-primary" download>
                                                    <i class="fas fa-download"></i> Download
                                                </a>
                                                <button type="button" class="btn btn-sm btn-outline-danger" 
                                                        onclick="deleteBackup('<?php echo $file['name']; ?>')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
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

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Select all checkbox functionality
        document.getElementById('selectAll').addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.table-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });

        // Individual checkbox handling
        document.querySelectorAll('.table-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const allCheckboxes = document.querySelectorAll('.table-checkbox');
                const checkedCheckboxes = document.querySelectorAll('.table-checkbox:checked');
                const selectAll = document.getElementById('selectAll');
                
                if (checkedCheckboxes.length === 0) {
                    selectAll.checked = false;
                    selectAll.indeterminate = false;
                } else if (checkedCheckboxes.length === allCheckboxes.length) {
                    selectAll.checked = true;
                    selectAll.indeterminate = false;
                } else {
                    selectAll.checked = false;
                    selectAll.indeterminate = true;
                }
            });
        });

        function deleteBackup(filename) {
            if (confirm('Are you sure you want to delete this backup file?')) {
                // Implement delete functionality
                window.location.href = 'delete_backup.php?file=' + encodeURIComponent(filename);
            }
        }
    </script>
</body>
</html>

<?php
/**
 * Backup and Export Functions
 */

function generateDatabaseBackup($data) {
    try {
        $backupType = $data['backup_type'];
        $tables = $data['tables'] ?? [];
        
        if (in_array('all', $tables)) {
            $tables = array_keys(getDatabaseStatistics());
        }
        
        $filename = 'furnili_backup_' . date('Y-m-d_H-i-s') . '.sql';
        $filepath = 'backups/' . $filename;
        
        // Create backups directory if not exists
        if (!is_dir('backups')) {
            mkdir('backups', 0755, true);
        }
        
        $db = Database::connect();
        $sql = '';
        
        // Add header comment
        $sql .= "-- " . APP_NAME . " Database Backup\n";
        $sql .= "-- Generated on: " . date('Y-m-d H:i:s') . "\n";
        $sql .= "-- Database: " . DB_NAME . "\n\n";
        
        foreach ($tables as $table) {
            if ($backupType === 'structure_data' || $backupType === 'structure_only') {
                // Get table structure
                $stmt = $db->prepare("SHOW CREATE TABLE `$table`");
                $stmt->execute();
                $row = $stmt->fetch();
                
                $sql .= "\n-- Table structure for table `$table`\n";
                $sql .= "DROP TABLE IF EXISTS `$table`;\n";
                $sql .= $row['Create Table'] . ";\n\n";
            }
            
            if ($backupType === 'structure_data' || $backupType === 'data_only') {
                // Get table data
                $stmt = $db->prepare("SELECT * FROM `$table`");
                $stmt->execute();
                $rows = $stmt->fetchAll();
                
                if (!empty($rows)) {
                    $sql .= "-- Dumping data for table `$table`\n";
                    
                    foreach ($rows as $row) {
                        $values = array_map(function($value) use ($db) {
                            return $value === null ? 'NULL' : $db->quote($value);
                        }, array_values($row));
                        
                        $sql .= "INSERT INTO `$table` VALUES (" . implode(', ', $values) . ");\n";
                    }
                    $sql .= "\n";
                }
            }
        }
        
        // Write to file
        file_put_contents($filepath, $sql);
        
        // Force download
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        exit;
        
    } catch (Exception $e) {
        error_log("Database backup error: " . $e->getMessage());
        echo "<script>alert('Backup failed: " . addslashes($e->getMessage()) . "');</script>";
    }
}

function exportToExcel($data) {
    try {
        $module = $data['module'];
        $startDate = $data['start_date'] ?? null;
        $endDate = $data['end_date'] ?? null;
        
        $filename = "furnili_{$module}_" . date('Y-m-d_H-i-s') . '.csv';
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        $db = Database::connect();
        
        switch ($module) {
            case 'products':
                fputcsv($output, ['ID', 'Name', 'Category', 'Brand', 'Size', 'Thickness', 'Price', 'Stock', 'Unit', 'SKU']);
                
                $query = "SELECT id, name, category, brand, size, thickness, price_per_unit, current_stock, unit, sku FROM products WHERE is_active = 1";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                while ($row = $stmt->fetch()) {
                    fputcsv($output, $row);
                }
                break;
                
            case 'material_requests':
                fputcsv($output, ['ID', 'Description', 'Status', 'Priority', 'Requested By', 'Created Date', 'Notes']);
                
                $query = "
                    SELECT mr.id, mr.description, mr.status, mr.priority, u.name, 
                           DATE_FORMAT(mr.created_at, '%Y-%m-%d %H:%i:%s'), mr.notes
                    FROM material_requests mr
                    LEFT JOIN users u ON mr.user_id = u.id
                ";
                
                if ($startDate && $endDate) {
                    $query .= " WHERE DATE(mr.created_at) BETWEEN ? AND ?";
                    $stmt = $db->prepare($query);
                    $stmt->execute([$startDate, $endDate]);
                } else {
                    $stmt = $db->prepare($query);
                    $stmt->execute();
                }
                
                while ($row = $stmt->fetch()) {
                    fputcsv($output, $row);
                }
                break;
                
            case 'petty_cash':
                fputcsv($output, ['ID', 'Date', 'Description', 'Amount', 'Type', 'Paid To', 'Paid By', 'Category']);
                
                $query = "
                    SELECT id, DATE_FORMAT(expense_date, '%Y-%m-%d'), description, amount,
                           CASE WHEN is_credit = 1 THEN 'Income' ELSE 'Expense' END,
                           paid_to, paid_by, category
                    FROM petty_cash_expenses
                ";
                
                if ($startDate && $endDate) {
                    $query .= " WHERE expense_date BETWEEN ? AND ?";
                    $stmt = $db->prepare($query);
                    $stmt->execute([$startDate, $endDate]);
                } else {
                    $stmt = $db->prepare($query);
                    $stmt->execute();
                }
                
                while ($row = $stmt->fetch()) {
                    fputcsv($output, $row);
                }
                break;
        }
        
        fclose($output);
        exit;
        
    } catch (Exception $e) {
        error_log("Excel export error: " . $e->getMessage());
        echo "<script>alert('Export failed: " . addslashes($e->getMessage()) . "');</script>";
    }
}

function exportToCSV($data) {
    try {
        $table = $data['table'];
        $includeHeaders = isset($data['include_headers']);
        $delimiter = $data['delimiter'] === '\t' ? "\t" : $data['delimiter'];
        
        $filename = "furnili_{$table}_" . date('Y-m-d_H-i-s') . '.csv';
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        $db = Database::connect();
        
        // Get column names
        if ($includeHeaders) {
            $stmt = $db->prepare("DESCRIBE `$table`");
            $stmt->execute();
            $columns = $stmt->fetchAll();
            
            $headers = array_map(function($col) {
                return $col['Field'];
            }, $columns);
            
            fputcsv($output, $headers, $delimiter);
        }
        
        // Get data
        $stmt = $db->prepare("SELECT * FROM `$table`");
        $stmt->execute();
        
        while ($row = $stmt->fetch()) {
            fputcsv($output, array_values($row), $delimiter);
        }
        
        fclose($output);
        exit;
        
    } catch (Exception $e) {
        error_log("CSV export error: " . $e->getMessage());
        echo "<script>alert('Export failed: " . addslashes($e->getMessage()) . "');</script>";
    }
}

function getDatabaseStatistics() {
    try {
        $db = Database::connect();
        $stats = [];
        
        $tables = ['products', 'material_requests', 'petty_cash_expenses', 'attendance', 'users', 'stock_movements', 'boq_uploads'];
        
        foreach ($tables as $table) {
            try {
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM `$table`");
                $stmt->execute();
                $result = $stmt->fetch();
                
                $stats[$table] = [
                    'count' => $result['count'],
                    'last_updated' => date('Y-m-d H:i:s')
                ];
            } catch (Exception $e) {
                $stats[$table] = [
                    'count' => 0,
                    'last_updated' => null
                ];
            }
        }
        
        return $stats;
        
    } catch (Exception $e) {
        return [];
    }
}

function getRecentBackupFiles() {
    $backupDir = 'backups/';
    $files = [];
    
    if (is_dir($backupDir)) {
        $fileList = array_diff(scandir($backupDir), array('.', '..'));
        
        foreach ($fileList as $file) {
            $filepath = $backupDir . $file;
            if (is_file($filepath)) {
                $extension = pathinfo($file, PATHINFO_EXTENSION);
                
                $files[] = [
                    'name' => $file,
                    'path' => $filepath,
                    'size' => filesize($filepath),
                    'created' => filemtime($filepath),
                    'extension' => $extension
                ];
            }
        }
        
        // Sort by creation time (newest first)
        usort($files, function($a, $b) {
            return $b['created'] - $a['created'];
        });
    }
    
    return array_slice($files, 0, 10); // Return only 10 most recent
}

function getFileIcon($extension) {
    return match($extension) {
        'sql' => 'database',
        'csv' => 'file-csv',
        'xlsx', 'xls' => 'file-excel',
        'pdf' => 'file-pdf',
        default => 'file'
    };
}

function getFileTypeBadgeColor($extension) {
    return match($extension) {
        'sql' => 'danger',
        'csv' => 'info',
        'xlsx', 'xls' => 'success',
        'pdf' => 'warning',
        default => 'secondary'
    };
}
?>