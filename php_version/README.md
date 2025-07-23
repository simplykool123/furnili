# Furnili Management System - PHP/MySQL Version

## Overview
Complete PHP/MySQL version of the Furnili Management System, optimized for shared hosting environments like Hostinger.

## Features
- User Authentication & Role Management
- Product Inventory Management
- Material Request Workflow
- Staff Attendance & Payroll
- Petty Cash Management
- BOQ Upload & Processing
- Mobile-Responsive Design
- Data Export Capabilities

## Requirements
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server
- PHP Extensions: PDO, JSON, GD, cURL

## Installation
1. Upload all files to your web hosting directory
2. Import `database.sql` to create the database
3. Configure database connection in `config/database.php`
4. Set proper file permissions for uploads directory
5. Access the system via your domain

## Default Login
- Username: admin
- Password: admin123

## File Structure
- `config/` - Database and system configuration
- `includes/` - Common PHP functions and classes
- `pages/` - Main application pages
- `api/` - REST API endpoints
- `assets/` - CSS, JS, and images
- `uploads/` - File uploads directory
- `database.sql` - MySQL database structure

## Hosting Compatible
Designed specifically for shared hosting environments with standard PHP/MySQL support.