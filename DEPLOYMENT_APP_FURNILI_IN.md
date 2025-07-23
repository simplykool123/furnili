# Deploy Furnili MS to app.furnili.in

## Complete Deployment Guide for Your Hostinger Account

This guide will help you deploy the Furnili Management System to your `app.furnili.in` domain on Hostinger.

---

## Step-by-Step Deployment Process

### 1. Access Your Hostinger Account

1. **Login to Hostinger**: Go to hostinger.com and login
2. **Navigate to Hosting**: Click on "Hosting" → "Manage" for your domain
3. **Access hPanel**: Click to access your control panel

### 2. Database Setup

#### 2.1 Create Database
1. In hPanel, go to **Databases** → **MySQL Databases**
2. Click **"Create Database"**
3. Enter details:
   - **Database Name**: `furnili_ms` (Hostinger will add prefix automatically)
   - **Username**: Create a new user or use existing
   - **Password**: Generate a strong password
4. **Important**: Copy and save these exact details:
   - Database Name (with prefix): `u123456789_furnili_ms`
   - Username (with prefix): `u123456789_furnili_user`
   - Password: `your_generated_password`

#### 2.2 Import Database
1. Go to **Databases** → **phpMyAdmin**
2. Select your newly created database
3. Click **"Import"** tab
4. Upload the file: `hostinger_sql_export.sql`
5. Click **"Go"** to import

### 3. Upload Files to app.furnili.in

#### 3.1 Prepare Files
Download these files from the `php_version` folder:
- All PHP files (index.php, login.php, logout.php, etc.)
- All folders (config/, includes/, pages/, assets/)
- The .htaccess file I created

#### 3.2 Upload via File Manager
1. In hPanel, go to **Files** → **File Manager**
2. Navigate to your domain folder (likely `public_html/app` or `app.furnili.in`)
3. Upload all files maintaining the folder structure:

```
app.furnili.in/  (or public_html/app/)
├── config/
│   └── database.php
├── includes/
├── pages/
├── assets/
├── uploads/           ← Create this folder
├── .htaccess
├── index.php
├── login.php
└── [other files]
```

#### 3.3 Create Uploads Folder
1. Right-click in file manager → **"New Folder"**
2. Name it: `uploads`
3. Right-click on uploads folder → **"Permissions"**
4. Set permissions to: **755**

### 4. Configure Database Connection

#### 4.1 Edit database.php
1. Open `config/database.php` in file manager
2. Update with your exact Hostinger database details:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_furnili_ms');     // Your exact database name
define('DB_USER', 'u123456789_furnili_user');   // Your exact username
define('DB_PASS', 'your_actual_password');       // Your actual password
```

**Important**: Replace the `u123456789` with your actual Hostinger account prefix!

### 5. Test Your Installation

#### 5.1 Access Your Site
1. Visit: `https://app.furnili.in`
2. You should see the Furnili MS login page

#### 5.2 Login Test
- **Username**: `admin`
- **Password**: `admin123`

#### 5.3 If Login Fails
Visit: `https://app.furnili.in/test_connection.php` to diagnose issues

### 6. Post-Deployment Security

#### 6.1 Change Admin Password
1. Login successfully
2. Go to your profile/settings
3. Change password from `admin123` to a strong password

#### 6.2 Clean Up
Delete these files after successful deployment:
- `test_connection.php`
- `setup_database.php`
- `hostinger_sql_export.sql`

#### 6.3 Update Security
1. In `config/database.php`, change:
```php
define('JWT_SECRET', 'furnili-production-secret-2025-secure');
```

### 7. Enable SSL (Important)

#### 7.1 SSL Certificate
1. In hPanel, go to **Security** → **SSL/TLS**
2. Enable **"Let's Encrypt SSL"** for app.furnili.in
3. Enable **"Force HTTPS"**

---

## Troubleshooting Common Issues

### Issue 1: Database Connection Failed
**Solution**: 
- Check database credentials in `config/database.php`
- Ensure you used the exact database name with Hostinger prefix
- Verify database user has full privileges

### Issue 2: Page Not Found / 404 Error
**Solution**:
- Check if files are uploaded to correct directory
- Ensure .htaccess file is uploaded
- Verify domain pointing to correct folder

### Issue 3: Login Shows "Invalid Credentials"
**Solution**:
- Visit `/test_connection.php` to test database
- Check if database was imported correctly
- Verify admin user exists in users table

### Issue 4: File Upload Not Working
**Solution**:
- Check `uploads` folder permissions (755)
- Verify PHP upload limits in Hostinger
- Ensure folder is writable

---

## Your Hostinger Database Details Template

When you create the database in Hostinger, update `config/database.php` with these details:

```php
// Replace with your ACTUAL Hostinger database details
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_furnili_ms');    // Your actual database name
define('DB_USER', 'u123456789_furnili_user');  // Your actual username  
define('DB_PASS', 'your_actual_password');      // Your actual password
define('BASE_URL', 'https://app.furnili.in');  // Already set correctly
```

---

## Final Checklist

Before going live:
- [ ] Database created and imported successfully
- [ ] All files uploaded to app.furnili.in directory
- [ ] Database credentials updated in config/database.php
- [ ] SSL certificate enabled for app.furnili.in
- [ ] Login test successful with admin/admin123
- [ ] Admin password changed from default
- [ ] Setup/test files deleted
- [ ] File permissions set correctly (uploads folder = 755)

---

## Need Help?

1. **Database Issues**: Check your Hostinger database panel for exact names
2. **File Upload Issues**: Contact Hostinger support for file manager help
3. **Domain Issues**: Verify app.furnili.in points to correct directory
4. **SSL Issues**: Enable Let's Encrypt in Hostinger security settings

**Your Furnili MS will be live at**: `https://app.furnili.in`

**Default Login**: admin / admin123 (change immediately!)

---

**The system is now ready for production use on your Hostinger hosting!**