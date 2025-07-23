<?php
if (!isLoggedIn()) {
    header('Location: login.php');
    exit();
}
$currentUser = getCurrentUser();
?>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
    <div class="container-fluid">
        <a class="navbar-brand" href="index.php">
            <i class="fas fa-warehouse me-2"></i>
            <?php echo APP_NAME; ?>
        </a>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
                <li class="nav-item">
                    <a class="nav-link" href="index.php">
                        <i class="fas fa-tachometer-alt me-1"></i>
                        Dashboard
                    </a>
                </li>
                
                <?php if (hasPermission('products', 'read')): ?>
                <li class="nav-item">
                    <a class="nav-link" href="pages/products.php">
                        <i class="fas fa-boxes me-1"></i>
                        Products
                    </a>
                </li>
                <?php endif; ?>
                
                <?php if (hasPermission('requests', 'read')): ?>
                <li class="nav-item">
                    <a class="nav-link" href="pages/requests.php">
                        <i class="fas fa-clipboard-list me-1"></i>
                        Requests
                    </a>
                </li>
                <?php endif; ?>
                
                <?php if (hasPermission('attendance', 'read')): ?>
                <li class="nav-item">
                    <a class="nav-link" href="pages/attendance.php">
                        <i class="fas fa-user-clock me-1"></i>
                        Attendance
                    </a>
                </li>
                <?php endif; ?>
                
                <?php if (hasPermission('petty_cash', 'read')): ?>
                <li class="nav-item">
                    <a class="nav-link" href="pages/petty_cash.php">
                        <i class="fas fa-money-bill-wave me-1"></i>
                        Petty Cash
                    </a>
                </li>
                <?php endif; ?>
                
                <?php if (hasRole(['admin', 'manager'])): ?>
                <li class="nav-item">
                    <a class="nav-link" href="pages/reports.php">
                        <i class="fas fa-chart-bar me-1"></i>
                        Reports
                    </a>
                </li>
                <?php endif; ?>
            </ul>
            
            <ul class="navbar-nav">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user-circle me-1"></i>
                        <?php echo htmlspecialchars($currentUser['name']); ?>
                        <span class="badge bg-secondary ms-1"><?php echo ucfirst($currentUser['role']); ?></span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <h6 class="dropdown-header">
                                <i class="fas fa-user me-1"></i>
                                <?php echo htmlspecialchars($currentUser['username']); ?>
                            </h6>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item" href="pages/profile.php">
                                <i class="fas fa-user-edit me-2"></i>
                                Profile
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="pages/change_password.php">
                                <i class="fas fa-key me-2"></i>
                                Change Password
                            </a>
                        </li>
                        <?php if (hasRole('admin')): ?>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item" href="pages/users.php">
                                <i class="fas fa-users me-2"></i>
                                Manage Users
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="pages/settings.php">
                                <i class="fas fa-cog me-2"></i>
                                Settings
                            </a>
                        </li>
                        <?php endif; ?>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="logout.php">
                                <i class="fas fa-sign-out-alt me-2"></i>
                                Logout
                            </a>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </div>
</nav>

<style>
body { 
    padding-top: 70px; 
}
.navbar-brand {
    font-weight: 600;
    font-size: 1.3rem;
}
.nav-link {
    font-weight: 500;
}
.dropdown-header {
    font-size: 0.9rem;
    color: #6c757d;
}
</style>