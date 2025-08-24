import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use Supabase database connection
const SUPABASE_DATABASE_URL = "postgresql://postgres.qopynbelowyghyciuofo:Furnili@123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

if (!process.env.DATABASE_URL && !SUPABASE_DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log connection attempt for debugging
// console.log('Attempting to connect to database...');
// console.log('Database URL format:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

// Force use Supabase database connection
export const pool = new Pool({ 
  connectionString: SUPABASE_DATABASE_URL, // Always use Supabase
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test connection with better error handling
pool.on('connect', () => {
  // console.log('✓ Connected to Supabase database successfully');
});

pool.on('error', (err) => {
  console.error('✗ Database connection error:', err.message);
  console.error('Please verify your Supabase connection details');
});

// Test initial connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Initial database connection test successful');
    client.release();
  } catch (err) {
    const error = err as Error;
    console.error('✗ Initial database connection failed:', error.message);
    console.error('Running with fallback configuration - please check Supabase settings');
  }
})();

export const db = drizzle(pool, { schema });
