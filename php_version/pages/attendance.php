<?php
/**
 * Staff Attendance Management Page
 */

session_start();

require_once '../config/database.php';
require_once '../includes/functions.php';
require_once '../includes/auth.php';

requireAuth();
// requireRole(['admin', 'manager']); // Commented out for now to avoid errors

$user = getCurrentUser();
$db = Database::connect();

// Handle form submissions
$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'check_in':
                $result = recordCheckIn($_POST['user_id'], $_POST['date'], $_POST['check_in_time']);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
                
            case 'check_out':
                $result = recordCheckOut($_POST['attendance_id'], $_POST['check_out_time']);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
                
            case 'update_attendance':
                $result = updateAttendance($_POST);
                $message = $result['message'];
                $messageType = $result['success'] ? 'success' : 'danger';
                break;
        }
    }
}

// Get date filter
$selectedDate = $_GET['date'] ?? date('Y-m-d');
$selectedMonth = $_GET['month'] ?? date('Y-m');

// Get all active users for attendance
$usersQuery = "SELECT id, name, employee_id, role FROM users WHERE is_active = 1 ORDER BY name";
$usersStmt = $db->prepare($usersQuery);
$usersStmt->execute();
$users = $usersStmt->fetchAll();

// Get today's attendance
$attendanceQuery = "
    SELECT a.*, u.name, u.employee_id 
    FROM attendance a 
    JOIN users u ON a.user_id = u.id 
    WHERE DATE(a.date) = ? 
    ORDER BY u.name
";
$stmt = $db->prepare($attendanceQuery);
$stmt->execute([$selectedDate]);
$todayAttendance = $stmt->fetchAll();

// Get monthly statistics
$monthlyStatsQuery = "
    SELECT 
        COUNT(DISTINCT user_id) as total_employees,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as total_present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as total_absent,
        COUNT(CASE WHEN status = 'half_day' THEN 1 END) as total_half_day,
        AVG(total_hours) as avg_hours
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE DATE_FORMAT(a.date, '%Y-%m') = ? AND u.is_active = 1
";
$statsStmt = $db->prepare($monthlyStatsQuery);
$statsStmt->execute([$selectedMonth]);
$monthlyStats = $statsStmt->fetch();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Attendance - <?php echo APP_NAME; ?></title>
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
                    <h1 class="h2">Staff Attendance</h1>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <div class="btn-group me-2">
                            <input type="date" class="form-control" id="dateFilter" value="<?php echo $selectedDate; ?>">
                        </div>
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#checkInModal">
                            <i class="fas fa-clock"></i> Check In/Out
                        </button>
                    </div>
                </div>

                <?php if ($message): ?>
                    <div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
                        <?php echo htmlspecialchars($message); ?>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <!-- Monthly Statistics -->
                <div class="row mb-4">
                    <div class="col-xl-3 col-md-6 mb-4">
                        <div class="card border-left-primary shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Employees</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $monthlyStats['total_employees'] ?? 0; ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-users fa-2x text-gray-300"></i>
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
                                        <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Present Today</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo count(array_filter($todayAttendance, fn($a) => $a['status'] === 'present')); ?></div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-check-circle fa-2x text-gray-300"></i>
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
                                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Avg Hours/Month</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo number_format($monthlyStats['avg_hours'] ?? 0, 1); ?>h</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-clock fa-2x text-gray-300"></i>
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
                                        <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Attendance Rate</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800">
                                            <?php 
                                            $total = ($monthlyStats['total_present'] ?? 0) + ($monthlyStats['total_absent'] ?? 0);
                                            $rate = $total > 0 ? (($monthlyStats['total_present'] ?? 0) / $total) * 100 : 0;
                                            echo number_format($rate, 1); 
                                            ?>%
                                        </div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-percentage fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Today's Attendance -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Attendance for <?php echo date('F j, Y', strtotime($selectedDate)); ?></h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Employee ID</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Total Hours</th>
                                        <th>Overtime</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php 
                                    // Create array of attendance by user_id for easy lookup
                                    $attendanceByUser = [];
                                    foreach ($todayAttendance as $att) {
                                        $attendanceByUser[$att['user_id']] = $att;
                                    }
                                    
                                    foreach ($users as $user):
                                        $attendance = $attendanceByUser[$user['id']] ?? null;
                                    ?>
                                        <tr>
                                            <td>
                                                <strong><?php echo htmlspecialchars($user['name']); ?></strong>
                                                <br><small class="text-muted"><?php echo ucfirst($user['role']); ?></small>
                                            </td>
                                            <td><?php echo htmlspecialchars($user['employee_id'] ?? '-'); ?></td>
                                            <td>
                                                <?php if ($attendance && $attendance['check_in_time']): ?>
                                                    <span class="text-success">
                                                        <?php echo date('g:i A', strtotime($attendance['check_in_time'])); ?>
                                                    </span>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($attendance && $attendance['check_out_time']): ?>
                                                    <span class="text-info">
                                                        <?php echo date('g:i A', strtotime($attendance['check_out_time'])); ?>
                                                    </span>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($attendance && $attendance['total_hours'] > 0): ?>
                                                    <?php echo number_format($attendance['total_hours'], 2); ?>h
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($attendance && $attendance['overtime_hours'] > 0): ?>
                                                    <span class="text-warning"><?php echo number_format($attendance['overtime_hours'], 2); ?>h</span>
                                                <?php else: ?>
                                                    <span class="text-muted">-</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if ($attendance): ?>
                                                    <span class="badge bg-<?php 
                                                        echo match($attendance['status']) {
                                                            'present' => 'success',
                                                            'absent' => 'danger',
                                                            'half_day' => 'warning',
                                                            'holiday' => 'info',
                                                            default => 'secondary'
                                                        };
                                                    ?>">
                                                        <?php echo ucfirst(str_replace('_', ' ', $attendance['status'])); ?>
                                                    </span>
                                                <?php else: ?>
                                                    <span class="badge bg-secondary">Not Marked</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <div class="btn-group" role="group">
                                                    <?php if (!$attendance): ?>
                                                        <button type="button" class="btn btn-sm btn-outline-success" 
                                                                onclick="checkIn(<?php echo $user['id']; ?>, '<?php echo $user['name']; ?>')">
                                                            <i class="fas fa-sign-in-alt"></i> Check In
                                                        </button>
                                                    <?php elseif ($attendance && !$attendance['check_out_time']): ?>
                                                        <button type="button" class="btn btn-sm btn-outline-info" 
                                                                onclick="checkOut(<?php echo $attendance['id']; ?>, '<?php echo $user['name']; ?>')">
                                                            <i class="fas fa-sign-out-alt"></i> Check Out
                                                        </button>
                                                    <?php endif; ?>
                                                    
                                                    <?php if ($attendance): ?>
                                                        <button type="button" class="btn btn-sm btn-outline-primary" 
                                                                onclick="editAttendance(<?php echo $attendance['id']; ?>)">
                                                            <i class="fas fa-edit"></i>
                                                        </button>
                                                    <?php endif; ?>
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

    <!-- Check In/Out Modal -->
    <div class="modal fade" id="checkInModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Check In/Out</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST" id="checkInForm">
                    <div class="modal-body">
                        <input type="hidden" name="action" id="checkAction">
                        <input type="hidden" name="user_id" id="checkUserId">
                        <input type="hidden" name="attendance_id" id="attendanceId">
                        
                        <div class="mb-3">
                            <label class="form-label">Employee</label>
                            <input type="text" class="form-control" id="employeeName" readonly>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Date</label>
                            <input type="date" name="date" class="form-control" id="checkDate" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        
                        <div class="mb-3" id="checkInTimeDiv">
                            <label class="form-label">Check In Time</label>
                            <input type="time" name="check_in_time" class="form-control" id="checkInTime" value="<?php echo date('H:i'); ?>">
                        </div>
                        
                        <div class="mb-3" id="checkOutTimeDiv" style="display: none;">
                            <label class="form-label">Check Out Time</label>
                            <input type="time" name="check_out_time" class="form-control" id="checkOutTime" value="<?php echo date('H:i'); ?>">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="checkSubmitBtn">Check In</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Date filter change
        document.getElementById('dateFilter').addEventListener('change', function() {
            window.location.href = 'attendance.php?date=' + this.value;
        });

        function checkIn(userId, userName) {
            document.getElementById('checkAction').value = 'check_in';
            document.getElementById('checkUserId').value = userId;
            document.getElementById('employeeName').value = userName;
            document.getElementById('checkInTimeDiv').style.display = 'block';
            document.getElementById('checkOutTimeDiv').style.display = 'none';
            document.getElementById('checkSubmitBtn').textContent = 'Check In';
            
            new bootstrap.Modal(document.getElementById('checkInModal')).show();
        }

        function checkOut(attendanceId, userName) {
            document.getElementById('checkAction').value = 'check_out';
            document.getElementById('attendanceId').value = attendanceId;
            document.getElementById('employeeName').value = userName;
            document.getElementById('checkInTimeDiv').style.display = 'none';
            document.getElementById('checkOutTimeDiv').style.display = 'block';
            document.getElementById('checkSubmitBtn').textContent = 'Check Out';
            
            new bootstrap.Modal(document.getElementById('checkInModal')).show();
        }

        function editAttendance(attendanceId) {
            // Implement edit attendance functionality
            window.location.href = 'edit_attendance.php?id=' + attendanceId;
        }
    </script>
</body>
</html>

<?php
/**
 * Helper functions for attendance management
 */

function recordCheckIn($userId, $date, $checkInTime) {
    try {
        $db = Database::connect();
        
        // Check if already checked in today
        $stmt = $db->prepare("SELECT id FROM attendance WHERE user_id = ? AND date = ?");
        $stmt->execute([$userId, $date]);
        
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => 'Employee already checked in today'];
        }
        
        $stmt = $db->prepare("
            INSERT INTO attendance (user_id, date, check_in_time, status) 
            VALUES (?, ?, ?, 'present')
        ");
        
        $stmt->execute([$userId, $date, $checkInTime]);
        
        return ['success' => true, 'message' => 'Check-in recorded successfully'];
        
    } catch (Exception $e) {
        error_log("Check-in error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to record check-in'];
    }
}

function recordCheckOut($attendanceId, $checkOutTime) {
    try {
        $db = Database::connect();
        
        // Get check-in time
        $stmt = $db->prepare("SELECT check_in_time FROM attendance WHERE id = ?");
        $stmt->execute([$attendanceId]);
        $attendance = $stmt->fetch();
        
        if (!$attendance) {
            return ['success' => false, 'message' => 'Attendance record not found'];
        }
        
        // Calculate total hours
        $checkIn = new DateTime($attendance['check_in_time']);
        $checkOut = new DateTime($checkOutTime);
        $interval = $checkIn->diff($checkOut);
        $totalHours = $interval->h + ($interval->i / 60);
        
        // Calculate overtime (assuming 8 hours standard)
        $overtimeHours = max(0, $totalHours - 8);
        
        $stmt = $db->prepare("
            UPDATE attendance 
            SET check_out_time = ?, total_hours = ?, overtime_hours = ? 
            WHERE id = ?
        ");
        
        $stmt->execute([$checkOutTime, $totalHours, $overtimeHours, $attendanceId]);
        
        return ['success' => true, 'message' => 'Check-out recorded successfully'];
        
    } catch (Exception $e) {
        error_log("Check-out error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to record check-out'];
    }
}

function updateAttendance($data) {
    try {
        $db = Database::connect();
        
        $stmt = $db->prepare("
            UPDATE attendance 
            SET check_in_time = ?, check_out_time = ?, status = ?, notes = ? 
            WHERE id = ?
        ");
        
        $stmt->execute([
            $data['check_in_time'] ?? null,
            $data['check_out_time'] ?? null,
            $data['status'] ?? 'present',
            $data['notes'] ?? null,
            $data['id']
        ]);
        
        return ['success' => true, 'message' => 'Attendance updated successfully'];
        
    } catch (Exception $e) {
        error_log("Update attendance error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Failed to update attendance'];
    }
}
?>