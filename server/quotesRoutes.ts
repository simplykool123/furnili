import type { Express } from "express";
import { db } from "./db";
import { quotes, quoteItems, clients, salesProducts, users, projects } from "@shared/schema";
import { eq, desc, and, like, or } from "drizzle-orm";
import { insertQuoteSchema, insertQuoteItemSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "./middleware/auth";

export function setupQuotesRoutes(app: Express) {
  // Get all quotes with client and project details
  app.get("/api/quotes", authenticateToken, async (req, res) => {
    try {
      const { search, status, clientId } = req.query;
      
      let whereConditions = [eq(quotes.isActive, true)];
      
      if (status && status !== 'all') {
        whereConditions.push(eq(quotes.status, status as string));
      }
      
      if (clientId) {
        whereConditions.push(eq(quotes.clientId, parseInt(clientId as string)));
      }

      const quotesData = await db
        .select({
          quote: quotes,
          client: {
            id: clients.id,
            name: clients.name,
            email: clients.email,
            mobile: clients.mobile,
            city: clients.city,
          },
          project: {
            id: projects.id,
            name: projects.name,
            code: projects.code,
          },
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(quotes.createdAt));

      // Apply search filter if provided
      let filteredQuotes = quotesData;
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredQuotes = quotesData.filter(item => 
          item.quote.quoteNumber.toLowerCase().includes(searchTerm) ||
          item.quote.title.toLowerCase().includes(searchTerm) ||
          item.client?.name.toLowerCase().includes(searchTerm) ||
          item.project?.name.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Get clients list for quote creation
  app.get("/api/quotes/clients/list", authenticateToken, async (req, res) => {
    try {
      const clientsList = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
        })
        .from(clients)
        .where(eq(clients.isActive, true))
        .orderBy(clients.name);

      res.json(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get sales products list for quote items
  app.get("/api/quotes/products/list", authenticateToken, async (req, res) => {
    try {
      const productsList = await db
        .select({
          id: salesProducts.id,
          name: salesProducts.name,
          description: salesProducts.description,
          unitPrice: salesProducts.unitPrice,
          taxPercentage: salesProducts.taxPercentage,
        })
        .from(salesProducts)
        .where(eq(salesProducts.isActive, true))
        .orderBy(salesProducts.name);

      res.json(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get quote by ID with details and items
  app.get("/api/quotes/:id/details", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with client and project details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items with sales product details
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      res.json({
        ...quoteData[0],
        items: items
      });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Get quote by ID (simple)
  app.get("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with client and project details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items with sales product details
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      res.json({
        ...quoteData[0],
        items: items
      });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Create new quote
  app.post("/api/quotes", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      
      // Generate quote number
      const lastQuote = await db
        .select({ quoteNumber: quotes.quoteNumber })
        .from(quotes)
        .orderBy(desc(quotes.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastQuote.length > 0) {
        // Extract number from format Q250801, Q250802, etc.
        const lastNumber = parseInt(lastQuote[0].quoteNumber.substring(1));
        nextNumber = lastNumber + 1;
      }
      
      // Format: Q + YYMM + DD + sequential number (QYYMMDDNN)
      const now = new Date();
      const year = now.getFullYear().toString().substring(2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const seq = nextNumber.toString().padStart(2, '0');
      const quoteNumber = `Q${year}${month}${day}${seq}`;

      // Validate quote data
      const quoteData = insertQuoteSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      // Create quote with generated quote number
      const [newQuote] = await db
        .insert(quotes)
        .values([{
          ...quoteData,
          quoteNumber,
        }])
        .returning();

      // Create quote items if provided
      if (req.body.items && req.body.items.length > 0) {
        const itemsData = req.body.items.map((item: any, index: number) => ({
          ...item,
          quoteId: newQuote.id,
          sortOrder: index,
        }));

        await db.insert(quoteItems).values(itemsData);
      }

      res.status(201).json(newQuote);
    } catch (error) {
      console.error("Error creating quote:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Update quote
  app.put("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const { items, ...quoteData } = req.body;

      // Update quote
      const [updatedQuote] = await db
        .update(quotes)
        .set({ ...quoteData, updatedAt: new Date() })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (!updatedQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Update quote items if provided
      if (items) {
        // Delete existing items
        await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));

        // Insert new items
        if (items.length > 0) {
          const itemsData = items.map((item: any, index: number) => ({
            ...item,
            quoteId: quoteId,
            sortOrder: index,
          }));

          await db.insert(quoteItems).values(itemsData);
        }
      }

      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Delete quote (soft delete)
  app.delete("/api/quotes/:id", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      const [deletedQuote] = await db
        .update(quotes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (!deletedQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Get quote details for PDF and detailed view
  app.get("/api/quotes/:id/details", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with complete client and project details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items with complete sales product details
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      res.json({
        ...quoteData[0],
        items: items
      });
    } catch (error) {
      console.error("Error fetching quote details:", error);
      res.status(500).json({ error: "Failed to fetch quote details" });
    }
  });

  // Generate PDF quote
  app.get("/api/quotes/:id/pdf", authenticateToken, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);

      // Get quote with all details
      const quoteData = await db
        .select({
          quote: quotes,
          client: clients,
          project: projects,
          createdBy: {
            id: users.id,
            name: users.name,
          }
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .leftJoin(users, eq(quotes.createdBy, users.id))
        .where(and(eq(quotes.id, quoteId), eq(quotes.isActive, true)))
        .limit(1);

      if (quoteData.length === 0) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Get quote items
      const items = await db
        .select({
          item: quoteItems,
          salesProduct: salesProducts,
        })
        .from(quoteItems)
        .leftJoin(salesProducts, eq(quoteItems.salesProductId, salesProducts.id))
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(quoteItems.sortOrder);

      const quote = quoteData[0];

      // Generate HTML for PDF
      const html = generateQuotePDFHTML(quote, items);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        html: html,
        filename: `Quote_${quote.quote.quoteNumber}_${quote.client?.name || 'Client'}.pdf`
      });

    } catch (error) {
      console.error("Error generating quote PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Get clients for quote creation
  app.get("/api/quotes/clients/list", authenticateToken, async (req, res) => {
    try {
      const clientsList = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          mobile: clients.mobile,
          city: clients.city,
        })
        .from(clients)
        .where(eq(clients.isActive, true))
        .orderBy(clients.name);

      res.json(clientsList);
    } catch (error) {
      console.error("Error fetching clients list:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get sales products for quote items
  app.get("/api/quotes/products/list", authenticateToken, async (req, res) => {
    try {
      const productsList = await db
        .select()
        .from(salesProducts)
        .where(eq(salesProducts.isActive, true))
        .orderBy(salesProducts.name);

      res.json(productsList);
    } catch (error) {
      console.error("Error fetching products list:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
}

// Helper function to generate PDF HTML content
function generateQuotePDFHTML(data: any, items: any[]): string {
  const { quote, client, project } = data;
  
  // Calculate totals exactly as in the finalized PDF
  const itemsTotal = items.reduce((sum, item) => sum + (item.item?.lineTotal || ((item.item?.quantity || 0) * (item.item?.unitPrice || 0))), 0);
  const packagingAmount = Math.round(itemsTotal * 0.02);
  const transportationAmount = 5000;
  const gstAmount = Math.round(itemsTotal * 0.18);
  const grandTotal = itemsTotal + packagingAmount + transportationAmount + gstAmount;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quote ${quote.quoteNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 15px;
            color: #000;
            font-size: 11px;
            line-height: 1.2;
        }
        
        .quotation-title {
            font-size: 16px;
            font-weight: bold;
            text-align: right;
            margin-bottom: 15px;
        }
        
        .header-info {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }
        
        .client-info {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        
        .quote-info {
            display: table-cell;
            width: 50%;
            text-align: right;
            vertical-align: top;
        }
        
        .subject-line {
            margin: 20px 0;
            text-align: center;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10px;
        }
        
        .items-table th {
            border: 1px solid #000;
            padding: 6px 4px;
            text-align: center;
            font-weight: bold;
            background: #f5f5f5;
        }
        
        .items-table td {
            border: 1px solid #000;
            padding: 6px 4px;
            vertical-align: top;
        }
        
        .sr-no { width: 60px; text-align: center; }
        .product { width: 180px; text-align: center; }
        .description { width: 250px; }
        .size { width: 100px; text-align: center; }
        .qty { width: 40px; text-align: center; }
        .rate { width: 80px; text-align: center; }
        .amount { width: 100px; text-align: right; }
        
        .totals-section {
            margin-top: 20px;
            text-align: right;
        }
        
        .bottom-section {
            display: table;
            width: 100%;
            margin-top: 25px;
        }
        
        .specs-section {
            display: table-cell;
            width: 65%;
            vertical-align: top;
            padding-right: 20px;
        }
        
        .bank-section {
            display: table-cell;
            width: 35%;
            vertical-align: top;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            border-top: 1px solid #000;
            padding-top: 8px;
        }
        
        @media print {
            body { margin: 0; padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="quotation-title">Quotation</div>
    
    <div class="header-info">
        <div class="client-info">
            To,<br>
            <strong>${client?.name || 'Mr. Client'}</strong><br>
            ${client?.address || 'Address'}<br>
            ${client?.city || 'City'}
        </div>
        
        <div class="quote-info">
            Date :- ${new Date(quote.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}<br>
            Est. No. :- ${quote.quoteNumber}<br>
            ${client?.gstNumber ? `GSTN :- ${client.gstNumber}<br>` : 'GSTN :- 27AAKFF2192A1ZO<br>'}
            ${client?.panNumber ? `PAN :- ${client.panNumber}<br>` : 'PAN :- AKFF2192A<br>'}
            Contact Person :- ${client?.name || 'Mr. Client'}
        </div>
    </div>
    
    <div class="subject-line">
        Subject: _________________________________________________________________________________
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th class="sr-no">Sr. No.</th>
                <th class="product">Product</th>
                <th class="description">Item Description</th>
                <th class="size">SIZE</th>
                <th class="qty">Qty</th>
                <th class="rate">Rate</th>
                <th class="amount">Total Amount</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item, index) => `
                <tr>
                    <td class="sr-no">${index + 1}</td>
                    <td class="product">${item.salesProduct?.name || item.item?.itemName || 'Product'}</td>
                    <td class="description">${item.salesProduct?.description || item.item?.description || ''}</td>
                    <td class="size">${item.salesProduct?.size || item.item?.size || '-'}</td>
                    <td class="qty">${item.item?.quantity || 0}</td>
                    <td class="rate">${(item.item?.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td class="amount">${(item.item?.lineTotal || (item.item?.quantity || 0) * (item.item?.unitPrice || 0)).toLocaleString('en-IN')}</td>
                </tr>
            `).join('')}
            
            <tr><td colspan="7" style="height: 15px; border: none;"></td></tr>
            
            <tr>
                <td colspan="5" style="border: none;"></td>
                <td style="text-align: right; font-weight: bold; border: 1px solid #000;">Total</td>
                <td style="text-align: right; font-weight: bold; border: 1px solid #000;">${itemsTotal.toLocaleString('en-IN')}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="bottom-section">
        <div class="specs-section">
            <strong>Furniture Specifications</strong><br>
            - All furniture will be manufactured using Said Materails<br>
            - All hardware considered of standard make.<br>
            - Standard laminates considered as per selection.<br>
            - Any modifications or changes in material selection may result in additional charges.<br><br>
            
            <strong>Payment Terms</strong><br>
            30% Advance Payment: Due upon order confirmation.<br>
            50% Payment Before Delivery: To be settled prior to dispatch.<br>
            20% Payment on Delivery
        </div>
        
        <div class="bank-section">
            <div style="text-align: right; margin-bottom: 15px;">
                Packaging @ 2%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${packagingAmount.toLocaleString('en-IN')}<br>
                Transportation&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;5,000<br>
                GST @ 18%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${gstAmount.toLocaleString('en-IN')}<br>
                <strong>Grand Total&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${grandTotal.toLocaleString('en-IN')}</strong>
            </div>
            
            <strong>Bank Details</strong><br>
            A/C Name: Furnili<br>
            Bank: ICICI Bank<br>
            Branch: Nigdi<br>
            A/C No.: 230505006647<br>
            IFSC: ICIC0002305<br><br>
            
            <div style="text-align: right;">
                Authorised Signatory<br>
                for FURNILI
            </div>
        </div>
    </div>
    
    <div class="footer">
        <strong>Furnili - Bespoke Modular Furniture</strong><br>
        Sr.no - 31/1 , Pisoli Road, Near Mohan Marbel, Pisoli,, Pune - 411048<br>
        +91 9823 011 223&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;info@furnili.com
    </div>
</body>
</html>`;
}