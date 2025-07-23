<?php
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<nav id="sidebarMenu" class="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
    <div class="position-sticky pt-3">
        <div class="text-center mb-3">
            <div class="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                <i class="fas fa-warehouse fa-lg text-white"></i>
            </div>
            <h6 class="mt-2 mb-0">Furnili MS</h6>
            <small class="text-muted">Management System</small>
        </div>
        
        <ul class="nav flex-column">
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'index.php') ? 'active' : ''; ?>" href="../index.php">
                    <i class="fas fa-tachometer-alt me-2"></i>
                    Dashboard
                </a>
            </li>
            
            <?php if (hasPermission('products', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'products.php') ? 'active' : ''; ?>" href="products.php">
                    <i class="fas fa-boxes me-2"></i>
                    Products
                </a>
            </li>
            <?php endif; ?>
            
            <?php if (hasPermission('categories', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'categories.php') ? 'active' : ''; ?>" href="categories.php">
                    <i class="fas fa-tags me-2"></i>
                    Categories
                </a>
            </li>
            <?php endif; ?>
            
            <?php if (hasPermission('requests', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'requests.php') ? 'active' : ''; ?>" href="requests.php">
                    <i class="fas fa-clipboard-list me-2"></i>
                    Material Requests
                </a>
            </li>
            <?php endif; ?>
            
            <?php if (hasPermission('attendance', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'attendance.php') ? 'active' : ''; ?>" href="attendance.php">
                    <i class="fas fa-user-clock me-2"></i>
                    Attendance
                </a>
            </li>
            <?php endif; ?>
            
            <?php if (hasPermission('payroll', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'payroll.php') ? 'active' : ''; ?>" href="payroll.php">
                    <i class="fas fa-money-check-alt me-2"></i>
                    Payroll
                </a>
            </li>
            <?php endif; ?>
            
            <?php if (hasPermission('petty_cash', 'read')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'petty_cash.php') ? 'active' : ''; ?>" href="petty_cash.php">
                    <i class="fas fa-money-bill-wave me-2"></i>
                    Petty Cash
                </a>
            </li>
            <?php endif; ?>
            
            <?php if (hasRole(['admin', 'manager'])): ?>
            <hr class="my-3">
            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Management</span>
            </h6>
            
            <?php if (hasRole('admin')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'users.php') ? 'active' : ''; ?>" href="users.php">
                    <i class="fas fa-users me-2"></i>
                    Users
                </a>
            </li>
            <?php endif; ?>
            
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'reports.php') ? 'active' : ''; ?>" href="reports.php">
                    <i class="fas fa-chart-bar me-2"></i>
                    Reports
                </a>
            </li>
            
            <?php if (hasRole('admin')): ?>
            <li class="nav-item">
                <a class="nav-link <?php echo ($currentPage == 'settings.php') ? 'active' : ''; ?>" href="settings.php">
                    <i class="fas fa-cog me-2"></i>
                    Settings
                </a>
            </li>
            <?php endif; ?>
            <?php endif; ?>
            
            <hr class="my-3">
            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Tools</span>
            </h6>
            
            <li class="nav-item">
                <a class="nav-link" href="backup.php">
                    <i class="fas fa-download me-2"></i>
                    Backup Data
                </a>
            </li>
            
            <li class="nav-item">
                <a class="nav-link" href="../logout.php">
                    <i class="fas fa-sign-out-alt me-2"></i>
                    Logout
                </a>
            </li>
        </ul>
    </div>
</nav>

<style>
.sidebar {
    position: fixed;
    top: 56px;
    bottom: 0;
    left: 0;
    z-index: 100;
    padding: 48px 0 0;
    box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
}

@media (max-width: 767.98px) {
    .sidebar {
        top: 5rem;
    }
}

.sidebar .nav-link {
    font-weight: 500;
    color: #333;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin: 0.25rem 0.5rem;
}

.sidebar .nav-link:hover {
    color: #2470dc;
    background-color: rgba(36, 112, 220, 0.1);
}

.sidebar .nav-link.active {
    color: #2470dc;
    background-color: rgba(36, 112, 220, 0.1);
    font-weight: 600;
}

.sidebar .nav-link i {
    color: #6c757d;
}

.sidebar .nav-link:hover i,
.sidebar .nav-link.active i {
    color: #2470dc;
}

.sidebar-heading {
    font-size: .75rem;
    text-transform: uppercase;
}
</style>