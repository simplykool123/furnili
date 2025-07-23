<?php
/**
 * Sidebar navigation for Furnili Management System
 */

$current_page = basename($_SERVER['PHP_SELF'], '.php');
$user = getCurrentUser();
?>

<nav id="sidebarMenu" class="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
    <div class="position-sticky pt-3">
        <div class="sidebar-brand d-flex align-items-center justify-content-center mb-3">
            <div class="sidebar-brand-icon rotate-n-15">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #D4B896 0%, #F5F0E8 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-warehouse text-white"></i>
                </div>
            </div>
            <div class="sidebar-brand-text mx-3"><?php echo APP_NAME; ?></div>
        </div>

        <ul class="nav flex-column">
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'index' ? 'active' : ''; ?>" href="/index.php">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
            </li>

            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'products' ? 'active' : ''; ?>" href="/products.php">
                    <i class="fas fa-boxes"></i> Products
                </a>
            </li>

            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'requests' ? 'active' : ''; ?>" href="/requests.php">
                    <i class="fas fa-clipboard-list"></i> Material Requests
                </a>
            </li>

            <?php if (hasPermission('attendance', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'attendance' ? 'active' : ''; ?>" href="/attendance.php">
                    <i class="fas fa-clock"></i> Staff Attendance
                </a>
            </li>
            <?php endif; ?>

            <?php if (hasPermission('petty_cash', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'petty_cash' ? 'active' : ''; ?>" href="/petty_cash.php">
                    <i class="fas fa-wallet"></i> Petty Cash
                </a>
            </li>
            <?php endif; ?>

            <?php if (hasPermission('users', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'users' ? 'active' : ''; ?>" href="/users.php">
                    <i class="fas fa-users"></i> User Management
                </a>
            </li>
            <?php endif; ?>

            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'boq_upload' ? 'active' : ''; ?>" href="/boq_upload.php">
                    <i class="fas fa-file-pdf"></i> BOQ & OCR
                </a>
            </li>
            
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'whatsapp_export' ? 'active' : ''; ?>" href="/whatsapp_export.php">
                    <i class="fas fa-whatsapp"></i> WhatsApp Export
                </a>
            </li>
            
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'reports' ? 'active' : ''; ?>" href="/reports.php">
                    <i class="fas fa-chart-bar"></i> Reports
                </a>
            </li>
            
            <li class="nav-item">
                <a class="nav-link <?php echo $current_page === 'backup' ? 'active' : ''; ?>" href="/backup.php">
                    <i class="fas fa-download"></i> Data Backup
                </a>
            </li>

            <?php if ($user['role'] === 'admin'): ?>
            <li class="nav-item">
                <a class="nav-link" href="<?php echo BASE_URL; ?>/pages/settings.php">
                    <i class="fas fa-cog"></i> Settings
                </a>
            </li>
            <?php endif; ?>
        </ul>

        <hr>
        
        <div class="dropdown">
            <a href="#" class="d-flex align-items-center text-dark text-decoration-none dropdown-toggle" 
               id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                <div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2" 
                     style="width: 32px; height: 32px;">
                    <i class="fas fa-user text-white"></i>
                </div>
                <strong><?php echo htmlspecialchars($user['name']); ?></strong>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow" aria-labelledby="dropdownUser1">
                <li><a class="dropdown-item" href="<?php echo BASE_URL; ?>/pages/profile.php">Profile</a></li>
                <li><a class="dropdown-item" href="<?php echo BASE_URL; ?>/pages/change_password.php">Change Password</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="<?php echo BASE_URL; ?>/logout.php">Sign out</a></li>
            </ul>
        </div>
    </div>
</nav>