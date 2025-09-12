import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use environment database connection
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log connection attempt for debugging (without exposing credentials)
console.log('Connecting to database:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

// Use the proper environment database connection
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test connection with better error handling
pool.on('connect', () => {
  console.log('✓ Connected to database successfully');
});

pool.on('error', (err) => {
  console.error('✗ Database connection error:', err.message);
  console.error('Please verify your DATABASE_URL environment variable');
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
    console.error('Please check your DATABASE_URL environment variable');
  }
})();

export const db = drizzle(pool, { schema });
