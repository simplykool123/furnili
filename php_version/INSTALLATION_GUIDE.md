# Furnili Management System - PHP/MySQL Installation Guide

## Complete Installation Instructions for Hostinger Shared Hosting

### Prerequisites
- Hostinger shared hosting account with PHP 7.4+ and MySQL support
- FTP/SFTP access or Hostinger File Manager
- Database creation access through Hostinger control panel

---

## Step 1: Download and Prepare Files

1. **Download the PHP version** from this project
2. **Extract** the `php_version` folder contents
3. **Prepare for upload** - you'll upload these files to your hosting

---

## Step 2: Database Setup

### Create Database in Hostinger:
1. Login to your **Hostinger Control Panel**
2. Go to **Databases** → **MySQL Databases**
3. Click **Create Database**
4. Database Name: `furnili_ms` (or your preferred name)
5. Username: Create a database user with full permissions
6. **Note down**: Database name, username, and password

### Import Database Structure:
1. In Hostinger Control Panel, go to **phpMyAdmin**
2. Select your created database
3. Click **Import** tab
4. Choose the `database.sql` file
5. Click **Go** to import all tables and sample data

---

## Step 3: File Upload

### Using Hostinger File Manager:
1. Go to **Files** → **File Manager** in Hostinger Control Panel
2. Navigate to `public_html` folder
3. **Upload** all PHP files from the `php_version` folder
4. **Extract** if uploaded as ZIP

### Using FTP Client (Alternative):
1. Connect to your hosting via FTP
2. Upload all files to `public_html` directory
3. Ensure all folders maintain their structure

---

## Step 4: Configuration

### Update Database Configuration:
1. Open `config/database.php` file
2. Update these values with your Hostinger database details:

```php
define('DB_HOST', 'localhost');          // Usually 'localhost'
define('DB_NAME', 'your_database_name'); // Your actual database name
define('DB_USER', 'your_db_username');   // Your database username
define('DB_PASS', 'your_db_password');   // Your database password
```

### Update Base URL:
```php
define('BASE_URL', 'https://yourdomain.com'); // Your actual domain
```

### Set File Permissions:
1. Create `uploads` folder if it doesn't exist
2. Set permissions to `755` for folders
3. Set permissions to `644` for files

---

## Step 5: Security Configuration

### Change Default Credentials:
1. Login with default credentials: `admin` / `admin123`
2. Immediately change the admin password
3. Update the JWT secret in `config/database.php`:

```php
define('JWT_SECRET', 'your-unique-secret-key-here');
```

### Disable Development Mode:
1. In `config/database.php`, ensure:
```php
// Comment out or remove this line for production:
// define('DEVELOPMENT_MODE', true);
```

---

## Step 6: Test the Installation

1. **Access your website**: `https://yourdomain.com`
2. **Login** with: username `admin`, password `admin123`
3. **Test key features**:
   - Dashboard loads correctly
   - Add a test product
   - Create a test user
   - Check all navigation links

---

## Step 7: Post-Installation Setup

### 1. Create User Accounts:
- Go to Users management
- Create accounts for your team members
- Assign appropriate roles (admin, manager, storekeeper, user)

### 2. Add Your Business Data:
- Categories: Add your product categories
- Products: Import or manually add your inventory
- Staff: Add employee information for attendance tracking

### 3. Configure System Settings:
- Update company information
- Set up backup schedules
- Configure notification preferences

---

## Common Issues and Solutions

### Issue 1: Database Connection Error
**Solution**: Double-check database credentials in `config/database.php`

### Issue 2: File Upload Not Working
**Solution**: Check folder permissions, ensure `uploads` folder has write permissions

### Issue 3: White Screen/Blank Page
**Solution**: Check PHP error logs, ensure all files uploaded correctly

### Issue 4: Login Not Working
**Solutions**: 
- Clear browser cache
- Check database connection
- Verify user table has admin user

---

## File Structure After Installation

```
public_html/
├── config/
│   └── database.php          # Database configuration
├── includes/
│   ├── functions.php         # Common functions
│   ├── auth.php             # Authentication functions
│   ├── header.php           # Navigation header
│   └── sidebar.php          # Sidebar navigation
├── pages/
│   ├── products.php         # Product management
│   ├── requests.php         # Material requests
│   ├── attendance.php       # Staff attendance
│   └── [other pages]
├── assets/
│   └── css/
│       └── style.css        # Custom styles
├── uploads/                 # File uploads (create this)
├── index.php               # Dashboard/main page
├── login.php               # Login page
├── logout.php              # Logout handler
└── database.sql            # Database structure
```

---

## Support and Maintenance

### Regular Backups:
- Export database regularly via phpMyAdmin
- Download `uploads` folder for file backups
- Keep backups of your configuration files

### Security Updates:
- Regularly change passwords
- Monitor file upload directories
- Check for unauthorized access attempts

### Performance Optimization:
- Enable caching if available in your hosting plan
- Optimize images before uploading
- Regular database cleanup of old records

---

## Default Login Credentials

**Username**: `admin`  
**Password**: `admin123`

**⚠️ IMPORTANT**: Change these credentials immediately after first login!

---

## Features Included

✅ **User Management** - Role-based access control  
✅ **Product Inventory** - Complete stock management  
✅ **Material Requests** - Request workflow system  
✅ **Staff Attendance** - Time tracking and management  
✅ **Payroll System** - Salary and payment processing  
✅ **Petty Cash** - Expense tracking and reporting  
✅ **Reports & Analytics** - Business insights  
✅ **Mobile Responsive** - Works on all devices  
✅ **Data Export** - CSV/Excel export capabilities  

---

## Technical Support

If you encounter issues during installation:

1. **Check PHP Version**: Ensure your hosting supports PHP 7.4+
2. **Database Compatibility**: Verify MySQL 5.7+ support
3. **File Permissions**: Ensure proper read/write permissions
4. **Error Logs**: Check your hosting error logs for specific issues

The system is designed for shared hosting compatibility and should work seamlessly with Hostinger's standard configuration.

---

**Your Furnili Management System is now ready for production use!**