<?php
/**
 * Authentication functions for Furnili Management System
 */

/**
 * Login user
 */
function loginUser($username, $password) {
    try {
        $db = Database::connect();
        
        // Get user by username or email
        $stmt = $db->prepare("SELECT id, username, email, password, name, role, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = 1");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();
        
        // Debug logging (remove in production)
        if (defined('DEVELOPMENT_MODE') && DEVELOPMENT_MODE) {
            error_log("Login attempt for: " . $username);
            error_log("User found: " . ($user ? 'Yes' : 'No'));
            if ($user) {
                error_log("Stored hash: " . $user['password']);
                error_log("Password verify result: " . (password_verify($password, $user['password']) ? 'Success' : 'Failed'));
            }
        }
        
        if (!$user) {
            return ['success' => false, 'message' => 'Invalid credentials - user not found'];
        }
        
        if (!password_verify($password, $user['password'])) {
            return ['success' => false, 'message' => 'Invalid credentials - wrong password'];
        }
        
        // Create session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['name'] = $user['name'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['login_time'] = time();
        
        // Update last login (add column if not exists)
        try {
            $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $stmt->execute([$user['id']]);
        } catch (PDOException $e) {
            // Column might not exist, ignore this error
        }
        
        return [
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role']
            ]
        ];
        
    } catch (Exception $e) {
        if (defined('DEVELOPMENT_MODE') && DEVELOPMENT_MODE) {
            error_log("Login error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Login error: ' . $e->getMessage()];
        }
        return ['success' => false, 'message' => 'Login failed due to system error'];
    }
}

/**
 * Logout user
 */
function logoutUser() {
    session_destroy();
    return ['success' => true, 'message' => 'Logged out successfully'];
}

/**
 * Register new user
 */
function registerUser($userData) {
    $db = Database::connect();
    
    // Validate required fields
    $required = ['username', 'email', 'password', 'name'];
    $errors = validateRequired($userData, $required);
    
    if (!empty($errors)) {
        return ['success' => false, 'message' => implode(', ', $errors)];
    }
    
    // Validate email format
    if (!validateEmail($userData['email'])) {
        return ['success' => false, 'message' => 'Invalid email format'];
    }
    
    // Check if username already exists
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$userData['username']]);
    if ($stmt->fetch()) {
        return ['success' => false, 'message' => 'Username already exists'];
    }
    
    // Check if email already exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$userData['email']]);
    if ($stmt->fetch()) {
        return ['success' => false, 'message' => 'Email already exists'];
    }
    
    // Hash password
    $hashedPassword = hashPassword($userData['password']);
    
    // Insert user
    $stmt = $db->prepare("INSERT INTO users (username, email, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)");
    $role = isset($userData['role']) ? $userData['role'] : 'user';
    
    try {
        $stmt->execute([
            $userData['username'],
            $userData['email'],
            $hashedPassword,
            $userData['name'],
            $role
        ]);
        
        return ['success' => true, 'message' => 'User registered successfully'];
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
    }
}

/**
 * Change user password
 */
function changePassword($userId, $currentPassword, $newPassword) {
    $db = Database::connect();
    
    // Get current password hash
    $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        return ['success' => false, 'message' => 'User not found'];
    }
    
    // Verify current password
    if (!verifyPassword($currentPassword, $user['password'])) {
        return ['success' => false, 'message' => 'Current password is incorrect'];
    }
    
    // Validate new password
    if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
        return ['success' => false, 'message' => 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long'];
    }
    
    // Hash and update password
    $hashedPassword = hashPassword($newPassword);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $userId]);
    
    return ['success' => true, 'message' => 'Password changed successfully'];
}

/**
 * Reset user password (admin function)
 */
function resetUserPassword($userId, $newPassword) {
    $db = Database::connect();
    
    // Validate new password
    if (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
        return ['success' => false, 'message' => 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long'];
    }
    
    // Hash and update password
    $hashedPassword = hashPassword($newPassword);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $userId]);
    
    return ['success' => true, 'message' => 'Password reset successfully'];
}

// checkSessionTimeout() function is defined in functions.php to avoid redeclaration error

/**
 * Get user permissions based on role
 */
function getUserPermissions($role) {
    $permissions = [
        'admin' => [
            'users' => ['create', 'read', 'update', 'delete'],
            'products' => ['create', 'read', 'update', 'delete'],
            'categories' => ['create', 'read', 'update', 'delete'],
            'requests' => ['create', 'read', 'update', 'delete'],
            'attendance' => ['create', 'read', 'update', 'delete'],
            'payroll' => ['create', 'read', 'update', 'delete'],
            'petty_cash' => ['create', 'read', 'update', 'delete'],
            'reports' => ['create', 'read', 'update', 'delete'],
            'settings' => ['create', 'read', 'update', 'delete']
        ],
        'manager' => [
            'products' => ['create', 'read', 'update', 'delete'],
            'categories' => ['create', 'read', 'update', 'delete'],
            'requests' => ['create', 'read', 'update', 'delete'],
            'attendance' => ['read', 'update'],
            'payroll' => ['read', 'update'],
            'petty_cash' => ['create', 'read', 'update'],
            'reports' => ['read']
        ],
        'storekeeper' => [
            'products' => ['read', 'update'],
            'requests' => ['read', 'update'],
            'attendance' => ['read'],
            'reports' => ['read']
        ],
        'user' => [
            'products' => ['read'],
            'requests' => ['create', 'read'],
            'attendance' => ['read'],
            'reports' => ['read']
        ]
    ];
    
    return $permissions[$role] ?? [];
}

/**
 * Check if user has specific permission
 */
function hasPermission($module, $action) {
    $user = getCurrentUser();
    if (!$user) return false;
    
    $permissions = getUserPermissions($user['role']);
    
    return isset($permissions[$module]) && in_array($action, $permissions[$module]);
}
?>