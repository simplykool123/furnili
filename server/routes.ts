import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { authenticateToken, requireRole } from './middleware/auth.js';
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import * as dbSchema from "../shared/schema.js";

const requireAuth = authenticateToken;

export function registerRoutes(app: Express): Server {
  // 🎯 DYNAMIC PRICING SYSTEM - Get prices from existing products
  app.get('/api/bom/material-links', requireAuth, async (req, res) => {
    try {
      // This would fetch material-to-product mappings from database
      // For now, return empty mapping - user will configure in settings
      res.json({});
    } catch (error) {
      console.error('Failed to fetch material links:', error);
      res.status(500).json({ error: 'Failed to fetch material links' });
    }
  });

  // Save material-to-product links
  app.post('/api/bom/material-links', requireAuth, async (req, res) => {
    try {
      const { links } = req.body;
      // TODO: Save material links to database
      // This could be a simple JSON field or separate table
      console.log('Saving material links:', links);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to save material links:', error);
      res.status(500).json({ error: 'Failed to save material links' });
    }
  });

  // 🎯 GET DYNAMIC RATES FROM PRODUCTS
  const getDynamicRates = async () => {
    try {
      // Query products for material pricing
      const products = await db.select().from(dbSchema.products).where(eq(dbSchema.products.isActive, true));
      
      const dynamicRates = {
        board: {},
        laminate: {},
        hardware: {},
        edge_banding: {}
      };

      // Map products to material keys based on category and name matching
      products.forEach(product => {
        const category = product.category.toLowerCase();
        const name = product.name.toLowerCase();
        
        // Board materials
        if (category.includes('plywood') || name.includes('plywood')) {
          if (name.includes('18mm')) dynamicRates.board['18mm_plywood'] = product.pricePerUnit;
          if (name.includes('12mm')) dynamicRates.board['12mm_plywood'] = product.pricePerUnit;
          if (name.includes('6mm')) dynamicRates.board['6mm_plywood'] = product.pricePerUnit;
        }
        
        if (category.includes('mdf') || name.includes('mdf')) {
          if (name.includes('18mm')) dynamicRates.board['18mm_mdf'] = product.pricePerUnit;
          if (name.includes('12mm')) dynamicRates.board['12mm_mdf'] = product.pricePerUnit;
          if (name.includes('6mm')) dynamicRates.board['6mm_mdf'] = product.pricePerUnit;
        }

        // Laminate materials
        if (category.includes('laminate') || name.includes('laminate')) {
          if (name.includes('outer') || name.includes('premium')) dynamicRates.laminate['outer_laminate'] = product.pricePerUnit;
          if (name.includes('inner') || name.includes('standard')) dynamicRates.laminate['inner_laminate'] = product.pricePerUnit;
        }
        
        if (name.includes('acrylic')) dynamicRates.laminate['acrylic_finish'] = product.pricePerUnit;
        if (name.includes('veneer')) dynamicRates.laminate['veneer_finish'] = product.pricePerUnit;
        if (name.includes('paint')) dynamicRates.laminate['paint_finish'] = product.pricePerUnit;

        // Hardware materials
        if (category.includes('hardware') || category.includes('hinge')) {
          if (name.includes('soft close')) dynamicRates.hardware['soft_close_hinge'] = product.pricePerUnit;
          if (name.includes('normal') && name.includes('hinge')) dynamicRates.hardware['normal_hinge'] = product.pricePerUnit;
          if (name.includes('drawer slide')) dynamicRates.hardware['drawer_slide_soft_close'] = product.pricePerUnit;
          if (name.includes('handle')) dynamicRates.hardware['ss_handle'] = product.pricePerUnit;
        }
      });
      
      return dynamicRates;
    } catch (error) {
      console.error('Failed to get dynamic rates:', error);
      return null; // Fallback to DEFAULT_RATES
    }
  };

  // Test route to check dynamic pricing
  app.get('/api/bom/dynamic-rates', requireAuth, async (req, res) => {
    try {
      const rates = await getDynamicRates();
      res.json({ success: true, rates });
    } catch (error) {
      console.error('Failed to get dynamic rates:', error);
      res.status(500).json({ error: 'Failed to get dynamic rates' });
    }
  });

  // 🎯 ESSENTIAL ROUTES FOR APP TO WORK
  
  // Dashboard API (currently called by frontend)
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      // Mock dashboard stats for now
      res.json({
        totalProducts: 56,
        pendingRequests: 5,
        todayTasks: 3,
        completedProjects: 12
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
  });

  app.get('/api/dashboard/tasks', requireAuth, async (req, res) => {
    try {
      // Mock tasks data
      res.json([
        { id: 1, title: "Review BOM calculations", priority: "high", dueDate: new Date() },
        { id: 2, title: "Update material prices", priority: "medium", dueDate: new Date() }
      ]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get dashboard tasks' });
    }
  });

  app.get('/api/dashboard/activity', requireAuth, async (req, res) => {
    try {
      // Mock activity data
      res.json([
        { id: 1, description: "Dynamic pricing system activated", timestamp: new Date() },
        { id: 2, description: "BOM Calculator updated", timestamp: new Date() }
      ]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get dashboard activity' });
    }
  });

  // Projects API
  app.get('/api/projects', requireAuth, async (req, res) => {
    try {
      // Mock projects data
      res.json([
        { id: 1, name: "Kitchen Renovation", status: "active", code: "FUR/25-26/001" },
        { id: 2, name: "Office Furniture", status: "planning", code: "FUR/25-26/002" }
      ]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get projects' });
    }
  });

  // Products API (needed by BOM settings)
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      const products = await db.select().from(dbSchema.products).where(eq(dbSchema.products.isActive, true));
      res.json(products);
    } catch (error) {
      console.error('Failed to get products:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  });

  // Auth route
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
      const user = await storage.getUserByUsername(username);
      if (user && user.password === password) {
        res.json({ 
          success: true, 
          token: 'dummy-token', 
          user: { id: user.id, username: user.username, role: user.role }
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}