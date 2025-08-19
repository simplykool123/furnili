import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log connection attempt for debugging
// console.log('Attempting to connect to database...');
// console.log('Database URL format:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
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
