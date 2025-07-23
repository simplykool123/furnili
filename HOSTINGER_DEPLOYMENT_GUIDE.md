# Hostinger Deployment Guide for Furnili MS

## Overview
This guide explains how to deploy your Furnili Management System on Hostinger hosting services. The application is a fullstack React/Express application with PostgreSQL database.

## Deployment Options on Hostinger

### Option 1: VPS Hosting (Recommended)
Best for full control and optimal performance.

#### Requirements:
- Hostinger VPS plan (Business VPS or higher recommended)
- SSH access
- Domain name (optional but recommended)

#### Step-by-Step VPS Deployment:

1. **Set Up VPS Environment**
   ```bash
   # Connect to your VPS via SSH
   ssh root@your-vps-ip
   
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt-get install -y nodejs
   
   # Install PostgreSQL
   apt install postgresql postgresql-contrib -y
   
   # Install PM2 for process management
   npm install -g pm2
   
   # Install Nginx for reverse proxy
   apt install nginx -y
   ```

2. **Set Up PostgreSQL Database**
   ```bash
   # Switch to postgres user
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE furnili_ms;
   CREATE USER furnili_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE furnili_ms TO furnili_user;
   \q
   ```

3. **Upload and Configure Application**
   ```bash
   # Create application directory
   mkdir -p /var/www/furnili-ms
   cd /var/www/furnili-ms
   
   # Upload your application files (using SCP, SFTP, or Git)
   # If using Git:
   git clone https://github.com/yourusername/furnili-ms.git .
   
   # Install dependencies
   npm install
   
   # Create production environment file
   nano .env.production
   ```

4. **Environment Configuration (.env.production)**
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://furnili_user:your_secure_password@localhost:5432/furnili_ms
   JWT_SECRET=your_super_secure_jwt_secret_here
   PORT=3000
   ```

5. **Build and Start Application**
   ```bash
   # Build the application
   npm run build
   
   # Run database migrations
   npm run db:push
   
   # Start with PM2
   pm2 start dist/index.js --name "furnili-ms"
   pm2 startup
   pm2 save
   ```

6. **Configure Nginx Reverse Proxy**
   ```bash
   # Create Nginx configuration
   nano /etc/nginx/sites-available/furnili-ms
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   # Enable the site
   ln -s /etc/nginx/sites-available/furnili-ms /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

7. **SSL Certificate (Optional but Recommended)**
   ```bash
   # Install Certbot
   apt install certbot python3-certbot-nginx -y
   
   # Get SSL certificate
   certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

### Option 2: Shared Hosting with Node.js Support
If Hostinger offers Node.js on shared hosting:

1. **Check Node.js Support**
   - Log into your Hostinger control panel
   - Look for Node.js application settings
   - Ensure Node.js 18+ is available

2. **Upload Files**
   - Use File Manager or FTP to upload your application
   - Upload to the public_html directory or designated Node.js folder

3. **Configure Database**
   - Use Hostinger's database management tool
   - Create PostgreSQL database (if available) or use MySQL
   - Update your database configuration accordingly

4. **Environment Setup**
   - Create .env file with production settings
   - Use Hostinger's environment variable settings if available

### Option 3: Static Build Deployment (Limited Functionality)
For basic hosting without server-side features:

1. **Build Static Version**
   ```bash
   # Build frontend only
   npm run build
   ```

2. **Upload to Hosting**
   - Upload contents of `dist/public` to public_html
   - Configure redirects for single-page application

**Note:** This option won't support:
- User authentication
- Database operations
- File uploads
- Real-time features

## Pre-Deployment Checklist

### Code Preparation:
- [ ] Update database configuration for production
- [ ] Set proper CORS settings
- [ ] Configure file upload paths
- [ ] Update API endpoints to use production URLs
- [ ] Remove development-only features

### Security:
- [ ] Generate strong JWT secret
- [ ] Use secure database passwords
- [ ] Configure firewall rules
- [ ] Set up SSL certificates
- [ ] Update CORS origins for production domain

### Performance:
- [ ] Enable production build optimizations
- [ ] Configure static file caching
- [ ] Set up CDN for static assets (optional)
- [ ] Enable Gzip compression

## Domain Configuration

1. **Point Domain to VPS**
   - Update DNS A record to point to your VPS IP
   - Wait for DNS propagation (up to 24 hours)

2. **Hostinger Domain Management**
   - Use Hostinger's DNS management
   - Add A record: @ points to VPS IP
   - Add CNAME record: www points to @

## Monitoring and Maintenance

### Process Management:
```bash
# Check application status
pm2 status

# View logs
pm2 logs furnili-ms

# Restart application
pm2 restart furnili-ms

# Monitor resources
pm2 monit
```

### Database Backups:
```bash
# Create backup script
nano /home/backup_db.sh

# Add this content:
#!/bin/bash
pg_dump -U furnili_user -h localhost furnili_ms > /home/backups/furnili_ms_$(date +%Y%m%d_%H%M%S).sql

# Make executable and add to cron
chmod +x /home/backup_db.sh
crontab -e
# Add: 0 2 * * * /home/backup_db.sh
```

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Check PostgreSQL service: `systemctl status postgresql`
   - Verify database credentials
   - Check firewall settings

2. **Application Won't Start**
   - Check PM2 logs: `pm2 logs furnili-ms`
   - Verify Node.js version: `node --version`
   - Check dependencies: `npm ls`

3. **Nginx Configuration Issues**
   - Test configuration: `nginx -t`
   - Check error logs: `tail -f /var/log/nginx/error.log`

4. **SSL Certificate Problems**
   - Renew certificates: `certbot renew`
   - Check certificate status: `certbot certificates`

## Cost Estimation

### Hostinger VPS Pricing (approximate):
- **VPS 1**: $3.95/month - Basic (1 vCPU, 1GB RAM)
- **VPS 2**: $8.95/month - Recommended (2 vCPU, 4GB RAM)
- **VPS 3**: $12.95/month - High Performance (4 vCPU, 8GB RAM)

### Additional Costs:
- Domain name: $8.99/year
- SSL certificate: Free with Let's Encrypt
- Backups: Included or $2/month for automated backups

## Support Resources

- **Hostinger Documentation**: https://support.hostinger.com/
- **VPS Tutorials**: Available in Hostinger knowledge base
- **Node.js Hosting**: Check Hostinger's Node.js hosting guides

## Next Steps

1. Choose your hosting option (VPS recommended)
2. Purchase hosting plan and domain
3. Follow the deployment steps above
4. Configure monitoring and backups
5. Test all application features
6. Set up regular maintenance schedule

Your Furnili MS application will be fully functional on Hostinger with proper database, file uploads, user authentication, and all current features preserved.