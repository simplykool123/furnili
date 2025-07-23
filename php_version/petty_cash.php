<?php
/**
 * Petty Cash Page - Root Level (redirect to pages/petty_cash.php)
 */
session_start();

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

requireAuth();

// Redirect to the actual petty cash page
header('Location: pages/petty_cash.php');
exit();
?>