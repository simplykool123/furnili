<?php
/**
 * Requests Page - Root Level (redirect to pages/requests.php)
 */
session_start();

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

requireAuth();

// Redirect to the actual requests page
header('Location: pages/requests.php');
exit();
?>