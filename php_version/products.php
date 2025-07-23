<?php
/**
 * Products Page - Root Level (redirect to pages/products.php)
 */
session_start();

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

requireAuth();

// Redirect to the actual products page
header('Location: pages/products.php');
exit();
?>