<?php
/**
 * Attendance Page - Root Level (redirect to pages/attendance.php)
 */
session_start();

require_once 'config/database.php';
require_once 'includes/functions.php';
require_once 'includes/auth.php';

requireAuth();

// Redirect to the actual attendance page
header('Location: pages/attendance.php');
exit();
?>