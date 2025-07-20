#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // Create demo users
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const users = [
      {
        username: 'admin',
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      },
      {
        username: 'manager',
        email: 'manager@demo.com',
        password: hashedPassword,
        name: 'Manager User',
        role: 'manager'
      },
      {
        username: 'keeper',
        email: 'keeper@demo.com', 
        password: hashedPassword,
        name: 'Store Keeper',
        role: 'storekeeper'
      },
      {
        username: 'user',
        email: 'user@demo.com',
        password: hashedPassword,
        name: 'Regular User',
        role: 'user'
      }
    ];

    // Insert users
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (username, email, password, name, role, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (email) DO NOTHING
      `, [user.username, user.email, user.password, user.name, user.role]);
    }

    // Create demo products
    const products = [
      {
        name: 'Steel Rods - 12mm',
        category: 'Construction Materials',
        brand: 'SteelCorp',
        size: '12mm x 6m',
        sku: 'STL-ROD-12-6',
        price: 45.50,
        currentStock: 150,
        minStock: 20,
        unit: 'pieces'
      },
      {
        name: 'Portland Cement - 50kg',
        category: 'Construction Materials', 
        brand: 'CementMax',
        size: '50kg',
        sku: 'CEM-PRT-50',
        price: 8.75,
        currentStock: 80,
        minStock: 15,
        unit: 'bags'
      },
      {
        name: 'LED Bulb - 12W',
        category: 'Electrical Supplies',
        brand: 'BrightTech',
        size: '12W E27',
        sku: 'LED-BLB-12W',
        price: 3.25,
        currentStock: 5,
        minStock: 20,
        unit: 'pieces'
      },
      {
        name: 'PVC Pipe - 4 inch',
        category: 'Plumbing Supplies',
        brand: 'FlowMax',
        size: '4 inch x 6m',
        sku: 'PVC-PIPE-4-6',
        price: 12.80,
        currentStock: 25,
        minStock: 10,
        unit: 'pieces'
      },
      {
        name: 'Power Drill Set',
        category: 'Tools & Equipment',
        brand: 'PowerPro',
        size: 'Variable Speed',
        sku: 'DRILL-SET-PRO',
        price: 89.99,
        currentStock: 8,
        minStock: 3,
        unit: 'pieces'
      }
    ];

    // Insert products
    for (const product of products) {
      const stockStatus = product.currentStock <= 0 ? 'out-of-stock' : 
                          product.currentStock <= product.minStock ? 'low-stock' : 'in-stock';
      
      await pool.query(`
        INSERT INTO products (name, category, brand, size, sku, price, current_stock, min_stock, unit, stock_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (sku) DO NOTHING
      `, [product.name, product.category, product.brand, product.size, product.sku, 
          product.price, product.currentStock, product.minStock, product.unit, stockStatus]);
    }

    console.log('Database seeded successfully!');
    console.log('Demo accounts created:');
    console.log('- admin@demo.com / demo123');
    console.log('- manager@demo.com / demo123');
    console.log('- keeper@demo.com / demo123');
    console.log('- user@demo.com / demo123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedDatabase();