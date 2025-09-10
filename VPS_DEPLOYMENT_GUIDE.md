# 🚀 Easy VPS Deployment Guide

Your Furnili Management System is now **100% portable** and ready for any VPS deployment!

## ✅ What's Already Configured:

- ✅ **Telegram Bot Token**: Stored in `server/config.ts` 
- ✅ **WhatsApp Bot**: Configured and working
- ✅ **Database Connection**: Ready to use with any PostgreSQL database
- ✅ **Local File Storage**: All uploads saved to local `uploads/` folders
- ✅ **No Cloud Dependencies**: Everything runs on your VPS

## 🎯 Deploy to ANY VPS (Hostinger, DigitalOcean, AWS, etc.)

### Step 1: Update Configuration
Edit `server/config.ts` with your VPS details:

```typescript
export const config = {
  // Update with your VPS database URL
  DATABASE_URL: "postgresql://username:password@your-vps-db:5432/furnili_db",
  
  // Your Telegram bot token (keep the same)
  TELEGRAM_BOT_TOKEN: "7738740095:AAF9t9I-DgbcWOBHhtxnFcyXi8iCEGVlWG0",
  
  // Update for production
  NODE_ENV: "production",
  PORT: 5000,
  
  // These paths work on any Linux VPS
  WHATSAPP_SESSION_PATH: "/var/www/whatsapp-session",
  CHROME_USER_DATA_DIR: "/var/www/chrome-data",
  
  UPLOAD_PATHS: {
    products: "uploads/products/",
    receipts: "uploads/receipts/", 
    documents: "uploads/documents/",
    telegram: "uploads/telegram/",
    whatsapp: "uploads/whatsapp/"
  }
};
```

### Step 2: VPS Commands

```bash
# 1. Upload your project to VPS
# 2. Install Node.js and PostgreSQL
sudo apt update
sudo apt install nodejs npm postgresql

# 3. Install dependencies
npm install

# 4. Create upload directories
mkdir -p uploads/{products,receipts,documents,telegram,whatsapp}

# 5. Setup database
npm run db:push

# 6. Start the application
npm run start
```

### Step 3: Domain Setup (Optional)
- Point your domain to VPS IP
- Setup reverse proxy with Nginx
- Add SSL certificate

## 🔧 Key Features:

- **Single File Configuration**: Just edit `server/config.ts`
- **No Environment Variables**: Everything in code
- **Local Storage Only**: No cloud dependencies
- **Database Portable**: Works with any PostgreSQL instance
- **Ready for Production**: Optimized for VPS deployment

## 🎉 That's It!

Your app will work exactly the same on any VPS. Just:
1. Copy the code
2. Update `server/config.ts` 
3. Run the commands above

**No more token setup hassles!** 🎯