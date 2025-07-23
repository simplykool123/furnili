<?php
/**
 * Logout page for Furnili Management System
 */

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

// Perform logout
logoutUser();

// Redirect to login page
header('Location: login.php?message=logged_out');
exit();
?>