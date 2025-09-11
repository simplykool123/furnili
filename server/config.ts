// Furnili Management System Configuration
// This configuration loads from environment variables first, with fallbacks for development
// For production deployment: Set these environment variables on your VPS

export const config = {
  // Database Configuration
  // Production: Set DATABASE_URL environment variable
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  
  // Bot Configuration
  // Production: Set TELEGRAM_BOT_TOKEN environment variable (leave empty if not using)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "8388446773:AAGert9QZiJpi90LumzRGKN9XBqGFHveLZg",
  
  // JWT Secret for authentication
  // Production: Set JWT_SECRET environment variable with a secure random key
  JWT_SECRET: process.env.JWT_SECRET || "your-development-jwt-secret",
  
  // Server Configuration  
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  
  // WhatsApp Bot Configuration
  WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH || "/tmp/whatsapp-session",
  CHROME_USER_DATA_DIR: process.env.CHROME_USER_DATA_DIR || "/tmp/chrome-whatsapp-bot",
  
  // File Storage Paths (Local VPS Storage)
  UPLOAD_PATHS: {
    products: process.env.UPLOAD_PATH_PRODUCTS || "uploads/products/",
    receipts: process.env.UPLOAD_PATH_RECEIPTS || "uploads/receipts/", 
    documents: process.env.UPLOAD_PATH_DOCUMENTS || "uploads/documents/",
    telegram: process.env.UPLOAD_PATH_TELEGRAM || "uploads/telegram/",
    whatsapp: process.env.UPLOAD_PATH_WHATSAPP || "uploads/whatsapp/"
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