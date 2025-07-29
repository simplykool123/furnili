import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(DATABASE_URL, { ssl: 'require' });
const db = drizzle(client, { schema });

async function createCRMTables() {
  try {
    console.log('Creating CRM tables...');
    
    // Create CRM Customers Table
    await client`
      CREATE TABLE IF NOT EXISTS crm_customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        address TEXT,
        status TEXT DEFAULT 'prospect',
        total_orders INTEGER DEFAULT 0,
        total_value REAL DEFAULT 0,
        last_contact TIMESTAMP,
        source TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create CRM Leads Table
    await client`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        status TEXT DEFAULT 'new',
        source TEXT,
        value REAL DEFAULT 0,
        assigned_to TEXT,
        notes TEXT,
        follow_up_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create CRM Deals Table
    await client`
      CREATE TABLE IF NOT EXISTS crm_deals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        customer_id INTEGER REFERENCES crm_customers(id),
        customer_name TEXT,
        value REAL NOT NULL,
        stage TEXT DEFAULT 'prospecting',
        probability INTEGER DEFAULT 50,
        expected_close_date TIMESTAMP,
        actual_close_date TIMESTAMP,
        assigned_to TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create CRM Activities Table
    await client`
      CREATE TABLE IF NOT EXISTS crm_activities (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT,
        related_to TEXT,
        related_id INTEGER,
        assigned_to TEXT,
        status TEXT DEFAULT 'pending',
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ CRM tables created successfully');
    
    // Insert sample data
    console.log('Inserting sample CRM data...');
    
    await client`
      INSERT INTO crm_customers (name, email, phone, company, status, source, notes) VALUES
      ('John Smith', 'john@techcorp.com', '+91-9876543210', 'TechCorp Solutions', 'active', 'website', 'Interested in office furniture'),
      ('Sarah Johnson', 'sarah@designstudio.com', '+91-9876543211', 'Design Studio Inc', 'prospect', 'referral', 'Looking for modern workspace solutions'),
      ('Mike Wilson', 'mike@construction.com', '+91-9876543212', 'Wilson Construction', 'active', 'cold call', 'Regular customer for construction materials')
      ON CONFLICT DO NOTHING
    `;

    await client`
      INSERT INTO crm_leads (name, email, phone, company, status, source, value, notes) VALUES
      ('Emma Davis', 'emma@startup.com', '+91-9876543213', 'New Startup', 'qualified', 'website', 50000, 'Needs complete office setup'),
      ('David Brown', 'david@retail.com', '+91-9876543214', 'Retail Chain', 'contacted', 'advertisement', 75000, 'Expanding to multiple locations'),
      ('Lisa Anderson', 'lisa@hotel.com', '+91-9876543215', 'Grand Hotel', 'proposal', 'referral', 100000, 'Hotel renovation project')
      ON CONFLICT DO NOTHING
    `;

    await client`
      INSERT INTO crm_deals (title, customer_name, value, stage, probability, notes) VALUES
      ('Office Furniture Package', 'TechCorp Solutions', 150000, 'negotiation', 80, 'Final pricing discussion pending'),
      ('Modern Workspace Setup', 'Design Studio Inc', 200000, 'proposal', 60, 'Proposal submitted, awaiting feedback'),
      ('Construction Materials Supply', 'Wilson Construction', 300000, 'closed-won', 100, 'Contract signed and delivered')
      ON CONFLICT DO NOTHING
    `;

    console.log('✅ Sample CRM data inserted successfully');
    
  } catch (error) {
    console.error('Error creating CRM tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createCRMTables().catch(console.error);