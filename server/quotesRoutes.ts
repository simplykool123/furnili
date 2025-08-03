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
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quote ${quote.quoteNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8B4513; padding-bottom: 20px; }
        .company-name { font-size: 28px; font-weight: bold; color: #8B4513; margin-bottom: 5px; }
        .company-tagline { font-size: 14px; color: #666; }
        .quote-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .quote-details, .client-details { width: 48%; }
        .section-title { font-size: 16px; font-weight: bold; color: #8B4513; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #8B4513; color: white; font-weight: bold; }
        .items-table tr:nth-child(even) { background-color: #f9f9f9; }
        .totals { margin-top: 30px; text-align: right; }
        .total-row { margin-bottom: 8px; }
        .final-total { font-size: 18px; font-weight: bold; color: #8B4513; border-top: 2px solid #8B4513; padding-top: 10px; }
        .terms-section { margin-top: 40px; }
        .terms-content { background-color: #f8f8f8; padding: 15px; border-left: 4px solid #8B4513; margin-top: 10px; }
        .footer { margin-top: 50px; text-align: center; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
            .items-table { page-break-inside: avoid; }
            .totals { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">FURNILI</div>
        <div class="company-tagline">Premium Furniture Solutions</div>
    </div>

    <div class="quote-info">
        <div class="quote-details">
            <div class="section-title">Quote Details</div>
            <p><strong>Quote #:</strong> ${quote.quoteNumber}</p>
            <p><strong>Title:</strong> ${quote.title}</p>
            <p><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString('en-IN')}</p>
            <p><strong>Valid Until:</strong> ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-IN') : 'N/A'}</p>
            ${project ? `<p><strong>Project:</strong> ${project.name} (${project.code})</p>` : ''}
        </div>
        
        <div class="client-details">
            <div class="section-title">Client Details</div>
            <p><strong>Name:</strong> ${client?.name || 'N/A'}</p>
            <p><strong>Email:</strong> ${client?.email || 'N/A'}</p>
            <p><strong>Mobile:</strong> ${client?.mobile || 'N/A'}</p>
            <p><strong>City:</strong> ${client?.city || 'N/A'}</p>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Sr. No.</th>
                <th>Item Description</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item: any, index: number) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>
                        <strong>${item.salesProduct?.name || item.item.itemName}</strong>
                        ${item.salesProduct?.description || item.item.description ? `<br><small style="color: #666;">${item.salesProduct?.description || item.item.description}</small>` : ''}
                    </td>
                    <td class="text-center">${item.item.quantity}</td>
                    <td class="text-center">${item.item.uom || 'Nos'}</td>
                    <td class="text-right">₹${item.item.unitPrice?.toLocaleString('en-IN')}</td>
                    <td class="text-right">₹${item.item.lineTotal?.toLocaleString('en-IN')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-row"><strong>Subtotal: ₹${quote.subtotal?.toLocaleString('en-IN') || '0'}</strong></div>
        <div class="total-row">Tax Amount: ₹${quote.taxAmount?.toLocaleString('en-IN') || '0'}</div>
        <div class="total-row">Packing Charges (${quote.packingChargesType === 'percentage' ? `${quote.packingChargesValue}%` : `₹${quote.packingChargesValue}`}): ₹${((quote.packingChargesType === 'percentage' ? quote.subtotal * quote.packingChargesValue / 100 : quote.packingChargesValue) || 0).toLocaleString('en-IN')}</div>
        <div class="total-row">Transportation Charges: ₹${quote.transportationCharges?.toLocaleString('en-IN') || '0'}</div>
        <div class="final-total">Total Amount: ₹${quote.totalAmount?.toLocaleString('en-IN') || '0'}</div>
    </div>

    <div class="terms-section">
        <div class="section-title">Furniture Specifications</div>
        <div class="terms-content">${quote.furnitureSpecifications || 'To be customized as per your requirements with quality materials and professional finish.'}</div>
    </div>

    <div class="terms-section">
        <div class="section-title">Payment Terms</div>
        <div class="terms-content">${(quote.paymentTerms || '').replace(/\n/g, '<br>')}</div>
    </div>

    ${quote.notes ? `
    <div class="terms-section">
        <div class="section-title">Additional Notes</div>
        <div class="terms-content">${quote.notes.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}

    <div class="footer">
        <p>Thank you for choosing Furnili for your furniture needs!</p>
        <p>This is a system-generated quote. For any queries, please contact us.</p>
    </div>
</body>
</html>
  `;
}