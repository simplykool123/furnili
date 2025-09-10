// Furnili Management System Configuration
// Update these values before deploying to your VPS

export const config = {
  // Database Configuration
  DATABASE_URL: "postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  
  // Bot Configuration
  TELEGRAM_BOT_TOKEN: "7738740095:AAF9t9I-DgbcWOBHhtxnFcyXi8iCEGVlWG0",
  
  // Server Configuration  
  NODE_ENV: "development",
  PORT: 5000,
  
  // WhatsApp Bot Configuration
  WHATSAPP_SESSION_PATH: "/tmp/whatsapp-session",
  CHROME_USER_DATA_DIR: "/tmp/chrome-whatsapp-bot",
  
  // File Storage Paths (Local VPS Storage)
  UPLOAD_PATHS: {
    products: "uploads/products/",
    receipts: "uploads/receipts/", 
    documents: "uploads/documents/",
    telegram: "uploads/telegram/",
    whatsapp: "uploads/whatsapp/"
  }
};

// Export individual config values for easy access
export const {
  DATABASE_URL,
  TELEGRAM_BOT_TOKEN,
  NODE_ENV,
  PORT,
  WHATSAPP_SESSION_PATH,
  CHROME_USER_DATA_DIR,
  UPLOAD_PATHS
} = config;