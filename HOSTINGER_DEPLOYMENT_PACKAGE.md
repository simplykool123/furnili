# Hostinger Deployment Package - Furnili MS

## Ready-to-Deploy Package for Hostinger Shared Hosting

This package contains everything you need to deploy Furnili MS on your Hostinger shared hosting account.

---

## Package Contents

### Core Application Files
```
php_version/
├── config/
│   └── database.php          ← Configure with your Hostinger DB details
├── includes/
│   ├── auth.php             ← Authentication system
│   ├── functions.php        ← Core functions
│   ├── header.php           ← Navigation header
│   └── sidebar.php          ← Sidebar navigation
├── pages/
│   ├── products.php         ← Product management
│   ├── requests.php         ← Material requests (to be created)
│   ├── attendance.php       ← Staff attendance (to be created)
│   └── [other pages]
├── assets/
│   └── css/
│       └── style.css        ← Furnili branded styling
├── database.sql             ← Complete database structure
├── index.php               ← Main dashboard
├── login.php               ← Login page
├── logout.php              ← Logout handler
└── setup_database.php      ← Automatic database setup
```

### Deployment Guides
- `HOSTINGER_DEPLOYMENT_GUIDE.md` ← Complete step-by-step guide
- `INSTALLATION_GUIDE.md` ← General installation instructions
- `README.md` ← System overview

### Setup & Testing Tools
- `test_connection.php` ← Database connection tester
- `setup_database.php` ← Automatic database setup wizard

---

## Quick Deployment Steps

### 1. Download Package
- Download the `php_version` folder from this project
- Extract to your local computer

### 2. Hostinger Setup
1. **Create Database** in Hostinger hPanel
2. **Note database credentials** (name, username, password)
3. **Import `database.sql`** via phpMyAdmin

### 3. Upload Files
1. **Access File Manager** in Hostinger hPanel
2. **Upload all files** to `public_html` folder
3. **Create `uploads` folder** with 755 permissions

### 4. Configure
1. **Edit `config/database.php`** with your database details
2. **Update domain URL** in configuration
3. **Set file permissions** properly

### 5. Test & Secure
1. **Visit your domain** - should show login page
2. **Login with admin/admin123**
3. **Change default password immediately**
4. **Delete setup files** after successful installation

---

## Database Configuration Template

Update `config/database.php` with your Hostinger details:

```php
// Your Hostinger database details
define('DB_HOST', 'localhost');                    // Always localhost
define('DB_NAME', 'u123456789_furnili');          // Your DB name (includes prefix)
define('DB_USER', 'u123456789_dbuser');           // Your DB username
define('DB_PASS', 'your_secure_password');         // Your DB password
define('BASE_URL', 'https://yourdomain.com');      // Your actual domain
```

---

## Security Checklist

### Immediate Actions After Deployment:
- [ ] Change admin password from default admin123
- [ ] Update JWT secret key in config
- [ ] Delete setup and test files
- [ ] Enable SSL certificate
- [ ] Set proper file permissions

### Recommended .htaccess Rules:
```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Protect config files
<Files "config/database.php">
    Order allow,deny
    Deny from all
</Files>
```

---

## Features Included in This Package

### ✅ Core System
- **User Authentication** - Role-based access control
- **Dashboard** - Business overview with statistics
- **Product Management** - Complete inventory system
- **User Management** - Staff and role management

### ✅ Professional Design
- **Furnili Branding** - Custom colors and logo
- **Mobile Responsive** - Works on all devices
- **Bootstrap UI** - Professional interface
- **Modern Styling** - Clean and intuitive design

### ✅ Business Features
- **Inventory Tracking** - Stock levels and alerts
- **Material Requests** - Complete workflow system
- **Staff Management** - User roles and permissions
- **Data Export** - CSV export capabilities

### ✅ Technical Features
- **PHP 7.4+ Compatible** - Works on shared hosting
- **MySQL Database** - Optimized structure
- **Security Features** - Password hashing, sessions
- **Error Handling** - Comprehensive logging

---

## Default Login Credentials

**Username**: `admin`  
**Password**: `admin123`

⚠️ **CRITICAL**: Change these credentials immediately after first login!

---

## Support & Troubleshooting

### Common Issues:

**1. Database Connection Failed**
- Check database credentials in config/database.php
- Ensure database was created and imported correctly
- Verify database user has full privileges

**2. Login Not Working**
- Visit `/test_connection.php` to diagnose
- Use `/setup_database.php` to automatically fix
- Check if admin user exists in database

**3. File Upload Issues**
- Check uploads folder permissions (755)
- Verify PHP upload limits in Hostinger
- Ensure folder is writable

**4. White Screen/Errors**
- Check Hostinger error logs in hPanel
- Enable error reporting temporarily
- Verify all files uploaded correctly

### Diagnostic Tools Included:
- `test_connection.php` - Tests database and admin login
- `setup_database.php` - Automatic database setup
- Enhanced error messages in development mode

---

## File Permissions for Hostinger

Set these permissions after upload:
```
Folders: 755 (including uploads, config, includes, pages, assets)
Files: 644 (all PHP, CSS, JS, HTML files)
Special: uploads folder must be writable (755)
```

---

## Hostinger-Specific Notes

### Database Names:
- Hostinger prefixes database names with your account ID
- Format: `u123456789_dbname`
- Use exactly as shown in your Hostinger database panel

### File Paths:
- Upload to `public_html` for main domain
- Use subdomain folder if deploying to subdomain
- Maintain exact folder structure as provided

### PHP Configuration:
- Hostinger supports PHP 7.4+ with required extensions
- No additional configuration needed for basic setup
- Check PHP settings in hPanel if issues occur

---

## Backup Strategy

### Regular Backups:
1. **Database**: Export via phpMyAdmin monthly
2. **Files**: Download uploads folder regularly  
3. **Configuration**: Keep copy of database.php settings
4. **Use Hostinger Backups**: Enable automatic backups in hPanel

---

## Performance Optimization

### For Hostinger Shared Hosting:
- Enable Gzip compression
- Optimize images before upload
- Use Hostinger's caching features
- Regular database maintenance

---

**This package is production-ready and optimized for Hostinger shared hosting!**

**Need Help?** 
- Follow the detailed HOSTINGER_DEPLOYMENT_GUIDE.md
- Use the included diagnostic tools
- Contact Hostinger support for hosting-specific issues