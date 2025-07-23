# Hostinger Deployment Guide - Furnili MS

## Complete Step-by-Step Guide for Hostinger Shared Hosting

### Prerequisites
- Active Hostinger shared hosting plan
- Access to Hostinger control panel (hPanel)
- The PHP version files from this project

---

## Step 1: Prepare Your Hostinger Account

### 1.1 Access Your Hostinger Control Panel
1. Login to your Hostinger account
2. Go to **Hosting** → **Manage** for your domain
3. Access the **hPanel** (Hostinger control panel)

### 1.2 Check PHP Version
1. In hPanel, go to **Advanced** → **PHP Configuration**
2. Ensure PHP version is **7.4 or higher** (8.0+ recommended)
3. Enable required extensions: **PDO**, **PDO_MySQL**, **JSON**, **GD**

---

## Step 2: Database Setup

### 2.1 Create MySQL Database
1. In hPanel, go to **Databases** → **MySQL Databases**
2. Click **Create Database**
3. Fill in details:
   - **Database Name**: `u123456789_furnili` (Hostinger format)
   - **Database Username**: Create new user with full privileges
   - **Password**: Generate strong password
4. **Important**: Note down these credentials!

### 2.2 Import Database Structure
1. Go to **Databases** → **phpMyAdmin**
2. Select your created database
3. Click **Import** tab
4. Upload the `database.sql` file from the php_version folder
5. Click **Go** to import

---

## Step 3: File Upload

### 3.1 Access File Manager
1. In hPanel, go to **Files** → **File Manager**
2. Navigate to `public_html` folder
3. If you have a subdomain, navigate to the appropriate folder

### 3.2 Upload PHP Files
1. Upload all files from the `php_version` folder
2. Maintain the folder structure:
   ```
   public_html/
   ├── config/
   ├── includes/
   ├── pages/
   ├── assets/
   ├── uploads/ (create this folder)
   ├── index.php
   ├── login.php
   └── other files...
   ```

### 3.3 Set File Permissions
1. Right-click on `uploads` folder → **Permissions**
2. Set to **755** (read, write, execute for owner)
3. Ensure other folders are **755** and files are **644**

---

## Step 4: Configuration

### 4.1 Update Database Configuration
1. Open `config/database.php` in File Manager editor
2. Update with your Hostinger database details:

```php
define('DB_HOST', 'localhost');                    // Always localhost for Hostinger
define('DB_NAME', 'u123456789_furnili');          // Your actual database name
define('DB_USER', 'u123456789_dbuser');           // Your database username  
define('DB_PASS', 'your_database_password');       // Your database password
```

### 4.2 Update Base URL
```php
define('BASE_URL', 'https://yourdomain.com');      // Your actual domain
```

### 4.3 Disable Development Mode
```php
// Comment out this line for production:
// define('DEVELOPMENT_MODE', true);
```

---

## Step 5: SSL Setup (Important)

### 5.1 Enable SSL Certificate
1. In hPanel, go to **Security** → **SSL/TLS**
2. Enable **Let's Encrypt SSL** for your domain
3. Force HTTPS redirect

### 5.2 Update .htaccess (Create if needed)
Create `.htaccess` file in public_html with:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security Headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Hide PHP version
Header unset X-Powered-By

# Protect sensitive files
<Files "config/database.php">
    Order allow,deny
    Deny from all
</Files>

<Files "*.sql">
    Order allow,deny
    Deny from all
</Files>
```

---

## Step 6: Testing Your Installation

### 6.1 Access Your Website
1. Visit: `https://yourdomain.com`
2. You should see the Furnili MS login page

### 6.2 Test Login
- **Username**: `admin`
- **Password**: `admin123`

### 6.3 Troubleshooting Tools
If login fails, visit these diagnostic pages:
- `https://yourdomain.com/test_connection.php`
- `https://yourdomain.com/setup_database.php`

---

## Step 7: Post-Deployment Security

### 7.1 Change Default Credentials
1. Login with admin/admin123
2. Go to Profile → Change Password
3. Update to a strong password immediately

### 7.2 Delete Setup Files
After successful installation, delete these files:
- `test_connection.php`
- `setup_database.php`
- `database.sql`

### 7.3 Update JWT Secret
In `config/database.php`, change:
```php
define('JWT_SECRET', 'your-unique-production-secret-key-here');
```

---

## Step 8: Configure Email (Optional)

### 8.1 Hostinger Email Setup
1. In hPanel, go to **Emails** → **Email Accounts**
2. Create email account for system notifications
3. Update PHP mail configuration if needed

---

## Common Hostinger-Specific Issues & Solutions

### Issue 1: Database Connection Failed
**Solution**: 
- Double-check database credentials in config/database.php
- Ensure database user has full privileges
- Hostinger database names include your account prefix

### Issue 2: File Upload Not Working
**Solution**:
- Check `uploads` folder permissions (755)
- Verify PHP `upload_max_filesize` in PHP Configuration
- Increase `post_max_size` if needed

### Issue 3: Session Issues
**Solution**:
- Check if sessions are enabled in PHP Configuration
- Verify `session.save_path` is writable

### Issue 4: PHP Errors
**Solution**:
- Check **Error Logs** in hPanel → **Advanced** → **Error Logs**
- Enable error reporting temporarily in development

---

## Hostinger-Specific Features to Use

### 1. Automatic Backups
- Enable automatic backups in hPanel
- Download backups regularly

### 2. Performance Optimization
- Enable **LiteSpeed Cache** if available
- Use **Cloudflare** integration for CDN

### 3. File Compression
- Enable Gzip compression in hPanel
- Optimize images before uploading

---

## Support & Maintenance

### Regular Tasks:
1. **Weekly**: Check error logs and system performance
2. **Monthly**: Download database backups
3. **Quarterly**: Update passwords and review user accounts

### Monitoring:
- Monitor disk space usage in hPanel
- Check database size regularly
- Review access logs for security

---

## Hostinger-Specific File Structure

Your final structure should look like:
```
public_html/                    ← Your domain root
├── config/
│   └── database.php           ← Updated with Hostinger DB details
├── includes/
├── pages/
├── assets/
├── uploads/                   ← Writable folder (755 permissions)
├── .htaccess                  ← Security and SSL rules
├── index.php                  ← Main application
├── login.php
└── [other files]
```

---

## Emergency Recovery

If something goes wrong:
1. **Restore from Backup**: Use Hostinger's backup feature
2. **Re-import Database**: Use phpMyAdmin to restore database
3. **Check Error Logs**: hPanel → Advanced → Error Logs
4. **Contact Support**: Hostinger has 24/7 chat support

---

## Performance Tips for Hostinger

1. **Optimize Database**: Regularly clean old logs and unused data
2. **Image Optimization**: Compress images before upload
3. **Caching**: Use browser caching via .htaccess
4. **Database Indexing**: Ensure proper indexes (already included)

---

**Your Furnili MS is now ready for production on Hostinger!**

**Default Login**: admin / admin123 (change immediately)
**System URL**: https://yourdomain.com

Need help? Check the error logs in hPanel or contact Hostinger support for hosting-related issues.