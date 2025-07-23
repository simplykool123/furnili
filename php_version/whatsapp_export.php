<?php
/**
 * WhatsApp Export Page
 */

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

requireAuth();

$user = getCurrentUser();
$db = Database::connect();

// Handle export requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    switch ($_POST['action']) {
        case 'export_petty_cash':
            exportPettyCashToWhatsApp($_POST);
            break;
        case 'export_attendance':
            exportAttendanceToWhatsApp($_POST);
            break;
        case 'export_materials':
            exportMaterialRequestsToWhatsApp($_POST);
            break;
    }
}

// Get recent data for preview
$recentExpenses = getRecentPettyCashExpenses(10);
$recentAttendance = getRecentAttendanceRecords(10);
$recentRequests = getRecentMaterialRequests(10);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Export - <?php echo APP_NAME; ?></title>
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
                    <h1 class="h2">WhatsApp Export</h1>
                </div>

                <div class="row">
                    <!-- Petty Cash Export -->
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                <h5 class="mb-0"><i class="fas fa-wallet me-2"></i>Petty Cash Report</h5>
                            </div>
                            <div class="card-body">
                                <form method="POST">
                                    <input type="hidden" name="action" value="export_petty_cash">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Date Range</label>
                                        <div class="row">
                                            <div class="col-6">
                                                <input type="date" name="start_date" class="form-control" 
                                                       value="<?php echo date('Y-m-01'); ?>">
                                            </div>
                                            <div class="col-6">
                                                <input type="date" name="end_date" class="form-control" 
                                                       value="<?php echo date('Y-m-d'); ?>">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Include Summary</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="include_summary" checked>
                                            <label class="form-check-label">Balance & Totals</label>
                                        </div>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-success w-100">
                                        <i class="fab fa-whatsapp me-2"></i>Generate WhatsApp Message
                                    </button>
                                </form>
                                
                                <!-- Preview -->
                                <div class="mt-3">
                                    <small class="text-muted">Recent Expenses Preview:</small>
                                    <div class="small">
                                        <?php foreach (array_slice($recentExpenses, 0, 3) as $expense): ?>
                                            <div class="d-flex justify-content-between">
                                                <span><?php echo htmlspecialchars($expense['description']); ?></span>
                                                <span class="<?php echo $expense['is_credit'] ? 'text-success' : 'text-danger'; ?>">
                                                    <?php echo $expense['is_credit'] ? '+' : '-'; ?>₹<?php echo number_format($expense['amount'], 2); ?>
                                                </span>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance Export -->
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0"><i class="fas fa-clock me-2"></i>Attendance Report</h5>
                            </div>
                            <div class="card-body">
                                <form method="POST">
                                    <input type="hidden" name="action" value="export_attendance">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Month</label>
                                        <input type="month" name="month" class="form-control" 
                                               value="<?php echo date('Y-m'); ?>">
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Staff Member</label>
                                        <select name="staff_id" class="form-select">
                                            <option value="">All Staff</option>
                                            <?php
                                            $staffQuery = "SELECT id, name FROM users WHERE role IN ('user', 'storekeeper', 'manager') AND is_active = 1";
                                            $staffStmt = $db->prepare($staffQuery);
                                            $staffStmt->execute();
                                            while ($staff = $staffStmt->fetch()):
                                            ?>
                                                <option value="<?php echo $staff['id']; ?>"><?php echo htmlspecialchars($staff['name']); ?></option>
                                            <?php endwhile; ?>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Include Details</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="include_hours" checked>
                                            <label class="form-check-label">Working Hours</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="include_overtime">
                                            <label class="form-check-label">Overtime Hours</label>
                                        </div>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fab fa-whatsapp me-2"></i>Generate WhatsApp Message
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Material Requests Export -->
                    <div class="col-md-4 mb-4">
                        <div class="card">
                            <div class="card-header bg-warning text-dark">
                                <h5 class="mb-0"><i class="fas fa-clipboard-list me-2"></i>Material Requests</h5>
                            </div>
                            <div class="card-body">
                                <form method="POST">
                                    <input type="hidden" name="action" value="export_materials">
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Status</label>
                                        <select name="status" class="form-select">
                                            <option value="">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="completed">Completed</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Date Range</label>
                                        <div class="row">
                                            <div class="col-6">
                                                <input type="date" name="start_date" class="form-control" 
                                                       value="<?php echo date('Y-m-01'); ?>">
                                            </div>
                                            <div class="col-6">
                                                <input type="date" name="end_date" class="form-control" 
                                                       value="<?php echo date('Y-m-d'); ?>">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Priority</label>
                                        <select name="priority" class="form-select">
                                            <option value="">All Priorities</option>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-warning w-100">
                                        <i class="fab fa-whatsapp me-2"></i>Generate WhatsApp Message
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Generated Message Display -->
                <div id="generatedMessage" style="display: none;" class="card mt-4">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0"><i class="fab fa-whatsapp me-2"></i>Generated WhatsApp Message</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <textarea id="messageContent" class="form-control" rows="12" readonly></textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-success" onclick="copyMessage()">
                                <i class="fas fa-copy me-2"></i>Copy Message
                            </button>
                            <button type="button" class="btn btn-primary" onclick="openWhatsApp()">
                                <i class="fab fa-whatsapp me-2"></i>Open WhatsApp Web
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="downloadMessage()">
                                <i class="fas fa-download me-2"></i>Download as Text
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function copyMessage() {
            const textarea = document.getElementById('messageContent');
            textarea.select();
            document.execCommand('copy');
            
            // Show feedback
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-success');
                btn.classList.add('btn-success');
            }, 2000);
        }

        function openWhatsApp() {
            const message = document.getElementById('messageContent').value;
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://web.whatsapp.com/send?text=${encodedMessage}`, '_blank');
        }

        function downloadMessage() {
            const message = document.getElementById('messageContent').value;
            const blob = new Blob([message], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `furnili_report_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
    </script>
</body>
</html>

<?php
/**
 * WhatsApp Export Functions
 */

function exportPettyCashToWhatsApp($data) {
    try {
        $db = Database::connect();
        
        $startDate = $data['start_date'];
        $endDate = $data['end_date'];
        $includeSummary = isset($data['include_summary']);
        
        // Get expenses in date range
        $query = "
            SELECT *, DATE_FORMAT(expense_date, '%d/%m/%Y') as formatted_date 
            FROM petty_cash_expenses 
            WHERE expense_date BETWEEN ? AND ? 
            ORDER BY expense_date DESC, created_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([$startDate, $endDate]);
        $expenses = $stmt->fetchAll();
        
        // Generate message
        $message = "*🏢 " . APP_NAME . " - Petty Cash Report*\n";
        $message .= "📅 Period: " . date('d/m/Y', strtotime($startDate)) . " to " . date('d/m/Y', strtotime($endDate)) . "\n";
        $message .= "⏰ Generated: " . date('d/m/Y H:i') . "\n\n";
        
        if ($includeSummary) {
            $totalCredit = 0;
            $totalDebit = 0;
            
            foreach ($expenses as $expense) {
                if ($expense['is_credit']) {
                    $totalCredit += $expense['amount'];
                } else {
                    $totalDebit += $expense['amount'];
                }
            }
            
            $balance = $totalCredit - $totalDebit;
            
            $message .= "*📊 SUMMARY*\n";
            $message .= "💰 Total Income: ₹" . number_format($totalCredit, 2) . "\n";
            $message .= "💸 Total Expenses: ₹" . number_format($totalDebit, 2) . "\n";
            $message .= "📈 Current Balance: ₹" . number_format($balance, 2) . "\n\n";
        }
        
        $message .= "*📋 TRANSACTIONS*\n";
        
        foreach ($expenses as $expense) {
            $icon = $expense['is_credit'] ? "💰" : "💸";
            $sign = $expense['is_credit'] ? "+" : "-";
            
            $message .= "{$icon} {$expense['formatted_date']}\n";
            $message .= "   {$expense['description']}\n";
            $message .= "   {$sign}₹" . number_format($expense['amount'], 2);
            
            if ($expense['paid_by']) {
                $message .= " | By: {$expense['paid_by']}";
            }
            
            $message .= "\n\n";
        }
        
        $message .= "---\n";
        $message .= "*Generated by " . APP_NAME . "*";
        
        // Output JavaScript to show message
        echo "<script>
            document.getElementById('messageContent').value = " . json_encode($message) . ";
            document.getElementById('generatedMessage').style.display = 'block';
            document.getElementById('generatedMessage').scrollIntoView({behavior: 'smooth'});
        </script>";
        
    } catch (Exception $e) {
        error_log("WhatsApp export error: " . $e->getMessage());
        echo "<script>alert('Export failed: " . addslashes($e->getMessage()) . "');</script>";
    }
}

function exportAttendanceToWhatsApp($data) {
    try {
        $db = Database::connect();
        
        $month = $data['month'];
        $staffId = $data['staff_id'] ?? null;
        $includeHours = isset($data['include_hours']);
        $includeOvertime = isset($data['include_overtime']);
        
        // Build query
        $whereClause = "WHERE DATE_FORMAT(check_in, '%Y-%m') = ?";
        $params = [$month];
        
        if ($staffId) {
            $whereClause .= " AND user_id = ?";
            $params[] = $staffId;
        }
        
        $query = "
            SELECT a.*, u.name as staff_name,
                   DATE_FORMAT(check_in, '%d/%m/%Y') as date,
                   TIME_FORMAT(check_in, '%H:%i') as in_time,
                   TIME_FORMAT(check_out, '%H:%i') as out_time,
                   CASE 
                       WHEN check_out IS NOT NULL THEN
                           TIME_FORMAT(TIMEDIFF(check_out, check_in), '%H:%i')
                       ELSE NULL
                   END as hours_worked
            FROM attendance a
            LEFT JOIN users u ON a.user_id = u.id
            {$whereClause}
            ORDER BY check_in DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $records = $stmt->fetchAll();
        
        // Generate message
        $message = "*🏢 " . APP_NAME . " - Attendance Report*\n";
        $message .= "📅 Month: " . date('F Y', strtotime($month . '-01')) . "\n";
        
        if ($staffId) {
            $message .= "👤 Staff: " . ($records[0]['staff_name'] ?? 'Unknown') . "\n";
        }
        
        $message .= "⏰ Generated: " . date('d/m/Y H:i') . "\n\n";
        
        // Summary
        $totalDays = count($records);
        $totalHours = 0;
        
        foreach ($records as $record) {
            if ($record['check_out']) {
                $checkIn = new DateTime($record['check_in']);
                $checkOut = new DateTime($record['check_out']);
                $diff = $checkOut->diff($checkIn);
                $totalHours += $diff->h + ($diff->i / 60);
            }
        }
        
        $message .= "*📊 SUMMARY*\n";
        $message .= "📆 Total Days: {$totalDays}\n";
        if ($includeHours) {
            $message .= "⏱️ Total Hours: " . number_format($totalHours, 1) . "h\n";
        }
        $message .= "\n";
        
        $message .= "*📋 DAILY RECORDS*\n";
        
        foreach ($records as $record) {
            $message .= "📅 {$record['date']}\n";
            if (!$staffId) {
                $message .= "👤 {$record['staff_name']}\n";
            }
            $message .= "🕘 In: {$record['in_time']}";
            
            if ($record['out_time']) {
                $message .= " | Out: {$record['out_time']}";
                if ($includeHours) {
                    $message .= " | Hours: {$record['hours_worked']}";
                }
            } else {
                $message .= " | *Still Working*";
            }
            
            $message .= "\n\n";
        }
        
        $message .= "---\n";
        $message .= "*Generated by " . APP_NAME . "*";
        
        // Output JavaScript to show message
        echo "<script>
            document.getElementById('messageContent').value = " . json_encode($message) . ";
            document.getElementById('generatedMessage').style.display = 'block';
            document.getElementById('generatedMessage').scrollIntoView({behavior: 'smooth'});
        </script>";
        
    } catch (Exception $e) {
        error_log("Attendance export error: " . $e->getMessage());
        echo "<script>alert('Export failed: " . addslashes($e->getMessage()) . "');</script>";
    }
}

function exportMaterialRequestsToWhatsApp($data) {
    try {
        $db = Database::connect();
        
        $status = $data['status'] ?? '';
        $startDate = $data['start_date'];
        $endDate = $data['end_date'];
        $priority = $data['priority'] ?? '';
        
        // Build query
        $whereClause = "WHERE created_at BETWEEN ? AND ?";
        $params = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];
        
        if ($status) {
            $whereClause .= " AND status = ?";
            $params[] = $status;
        }
        
        if ($priority) {
            $whereClause .= " AND priority = ?";
            $params[] = $priority;
        }
        
        $query = "
            SELECT mr.*, u.name as requested_by_name,
                   DATE_FORMAT(created_at, '%d/%m/%Y') as request_date
            FROM material_requests mr
            LEFT JOIN users u ON mr.user_id = u.id
            {$whereClause}
            ORDER BY created_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $requests = $stmt->fetchAll();
        
        // Generate message
        $message = "*🏢 " . APP_NAME . " - Material Requests Report*\n";
        $message .= "📅 Period: " . date('d/m/Y', strtotime($startDate)) . " to " . date('d/m/Y', strtotime($endDate)) . "\n";
        
        if ($status) {
            $message .= "📊 Status: " . ucfirst($status) . "\n";
        }
        
        if ($priority) {
            $message .= "⚡ Priority: " . ucfirst($priority) . "\n";
        }
        
        $message .= "⏰ Generated: " . date('d/m/Y H:i') . "\n\n";
        
        // Summary by status
        $statusCounts = [];
        foreach ($requests as $request) {
            $statusCounts[$request['status']] = ($statusCounts[$request['status']] ?? 0) + 1;
        }
        
        $message .= "*📊 SUMMARY*\n";
        $message .= "📋 Total Requests: " . count($requests) . "\n";
        
        foreach ($statusCounts as $status => $count) {
            $statusIcon = match($status) {
                'pending' => '⏳',
                'approved' => '✅',
                'completed' => '🎯',
                'rejected' => '❌',
                default => '📄'
            };
            $message .= "{$statusIcon} " . ucfirst($status) . ": {$count}\n";
        }
        
        $message .= "\n*📋 REQUEST DETAILS*\n";
        
        foreach ($requests as $request) {
            $statusIcon = match($request['status']) {
                'pending' => '⏳',
                'approved' => '✅',
                'completed' => '🎯',
                'rejected' => '❌',
                default => '📄'
            };
            
            $priorityIcon = match($request['priority']) {
                'high' => '🔴',
                'medium' => '🟡',
                'low' => '🟢',
                default => '⚪'
            };
            
            $message .= "{$statusIcon} *Request #{$request['id']}*\n";
            $message .= "📅 {$request['request_date']} | {$priorityIcon} " . ucfirst($request['priority']) . "\n";
            $message .= "👤 By: {$request['requested_by_name']}\n";
            $message .= "📝 {$request['description']}\n";
            
            if ($request['notes']) {
                $message .= "💬 Notes: {$request['notes']}\n";
            }
            
            $message .= "\n";
        }
        
        $message .= "---\n";
        $message .= "*Generated by " . APP_NAME . "*";
        
        // Output JavaScript to show message
        echo "<script>
            document.getElementById('messageContent').value = " . json_encode($message) . ";
            document.getElementById('generatedMessage').style.display = 'block';
            document.getElementById('generatedMessage').scrollIntoView({behavior: 'smooth'});
        </script>";
        
    } catch (Exception $e) {
        error_log("Material requests export error: " . $e->getMessage());
        echo "<script>alert('Export failed: " . addslashes($e->getMessage()) . "');</script>";
    }
}

function getRecentPettyCashExpenses($limit = 10) {
    try {
        $db = Database::connect();
        $stmt = $db->prepare("
            SELECT * FROM petty_cash_expenses 
            ORDER BY expense_date DESC, created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}

function getRecentAttendanceRecords($limit = 10) {
    try {
        $db = Database::connect();
        $stmt = $db->prepare("
            SELECT a.*, u.name 
            FROM attendance a 
            LEFT JOIN users u ON a.user_id = u.id 
            ORDER BY check_in DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}

function getRecentMaterialRequests($limit = 10) {
    try {
        $db = Database::connect();
        $stmt = $db->prepare("
            SELECT mr.*, u.name as requested_by 
            FROM material_requests mr 
            LEFT JOIN users u ON mr.user_id = u.id 
            ORDER BY created_at DESC 
            LIMIT ?
        ");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}
?>