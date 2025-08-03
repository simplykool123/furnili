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
  
  // Calculate totals
  const itemsTotal = items.reduce((sum, item) => sum + ((item.item?.lineTotal || item.item?.quantity * item.item?.unitPrice) || 0), 0);
  const packagingAmount = Math.round(itemsTotal * 0.02);
  const transportationAmount = 5000;
  const gstAmount = Math.round(itemsTotal * 0.18);
  const grandTotal = itemsTotal + packagingAmount + transportationAmount + gstAmount;

  // Number to words conversion
  function numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertHundreds(n: number): string {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred';
        n %= 100;
        if (n > 0) result += ' ';
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        n %= 10;
        if (n > 0) result += '-' + ones[n];
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }
      return result;
    }
    
    let result = '';
    
    // Handle crores
    if (num >= 10000000) {
      result += convertHundreds(Math.floor(num / 10000000)) + ' Crore';
      num %= 10000000;
      if (num > 0) result += ' ';
    }
    
    // Handle lakhs
    if (num >= 100000) {
      result += convertHundreds(Math.floor(num / 100000)) + ' Lakh';
      num %= 100000;
      if (num > 0) result += ' ';
    }
    
    // Handle thousands
    if (num >= 1000) {
      result += convertHundreds(Math.floor(num / 1000)) + ' Thousand';
      num %= 1000;
      if (num > 0) result += ' ';
    }
    
    // Handle remaining hundreds
    if (num > 0) {
      result += convertHundreds(num);
    }
    
    return result.trim();
  }

  const wordsAmount = numberToWords(grandTotal) + ' Rupees Only';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote ${quote.quoteNumber} - Furnili</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 10px;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #8B4513;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
    }
    
    .company-info h1 {
      font-size: 28px;
      font-weight: bold;
      color: #8B4513;
      margin-bottom: 2px;
    }
    
    .company-info .tagline {
      font-size: 12px;
      color: #666;
      font-style: italic;
    }
    
    .quote-badge {
      background: #8B4513;
      color: white;
      padding: 8px 15px;
      border-radius: 5px;
      font-weight: bold;
      font-size: 14px;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      gap: 20px;
    }
    
    .client-details, .quote-details {
      flex: 1;
      background: #f8f8f8;
      padding: 12px;
      border-radius: 5px;
      border-left: 4px solid #8B4513;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 13px;
      color: #8B4513;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .detail-item {
      margin-bottom: 4px;
      font-size: 11px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 11px;
    }
    
    .items-table th {
      background: #8B4513;
      color: white;
      padding: 8px 6px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #000;
      font-size: 10px;
    }
    
    .items-table td {
      padding: 6px;
      border: 1px solid #000;
      vertical-align: middle;
      font-size: 10px;
    }
    
    .totals-section {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    
    .totals-section td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: middle;
    }
    
    .grand-total-row {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    .specs-section {
      background: #f8f8f8;
      padding: 10px;
      border-radius: 5px;
      margin-top: 15px;
    }
    
    .specs-title {
      font-weight: bold;
      color: #8B4513;
      margin-bottom: 8px;
      font-size: 12px;
    }
    
    .specs-list {
      font-size: 10px;
      line-height: 1.4;
    }
    
    .payment-terms {
      margin-top: 15px;
      background: #f8f8f8;
      padding: 10px;
      border-radius: 5px;
    }
    
    .payment-title {
      font-weight: bold;
      color: #8B4513;
      margin-bottom: 8px;
      font-size: 12px;
    }
    
    .payment-list {
      font-size: 10px;
      line-height: 1.4;
    }
    
    .footer {
      margin-top: 20px;
      text-align: center;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 20px;
    }
    
    .signature-box {
      text-align: center;
      width: 200px;
    }
    
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 10px;
    }
    
    @media print {
      body { margin: 0; padding: 5px; }
      .header { page-break-inside: avoid; }
      .items-table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Header Section -->
  <div class="header">
    <div class="logo-section">
      <div class="company-info">
        <h1>FURNILI</h1>
        <div class="tagline">Premium Furniture Solutions</div>
      </div>
    </div>
    <div class="quote-badge">
      QUOTATION
    </div>
  </div>

  <!-- Information Section -->
  <div class="info-section">
    <div class="client-details">
      <div class="section-title">Bill To</div>
      <div class="detail-item"><strong>${client?.name || 'N/A'}</strong></div>
      <div class="detail-item">${client?.address || ''}</div>
      <div class="detail-item">${client?.city || ''}</div>
      <div class="detail-item">Phone: ${client?.mobile || client?.phone || 'N/A'}</div>
      <div class="detail-item">Email: ${client?.email || 'N/A'}</div>
      ${client?.gstNumber ? `<div class="detail-item">GST: ${client.gstNumber}</div>` : ''}
    </div>
    <div class="quote-details">
      <div class="section-title">Quote Details</div>
      <div class="detail-item"><strong>Quote #:</strong> ${quote.quoteNumber}</div>
      <div class="detail-item"><strong>Project:</strong> ${project?.name || 'N/A'}</div>
      <div class="detail-item"><strong>Date:</strong> ${new Date(quote.createdAt).toLocaleDateString('en-IN')}</div>
      <div class="detail-item"><strong>Valid Until:</strong> ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-IN') : '30 days'}</div>
      <div class="detail-item"><strong>Status:</strong> ${quote.status}</div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50px;">Sr. No.</th>
        <th style="width: 200px;">Description of Goods</th>
        <th style="width: 100px;">Size</th>
        <th style="width: 60px;">Qty</th>
        <th style="width: 50px;">UOM</th>
        <th style="width: 80px;">Rate</th>
        <th style="width: 80px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, index) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.item?.itemName || item.salesProduct?.name || 'N/A'}</td>
          <td style="text-align: center;">${item.item?.size || item.salesProduct?.size || '-'}</td>
          <td style="text-align: center;">${item.item?.quantity || 0}</td>
          <td style="text-align: center;">${item.item?.uom || 'pcs'}</td>
          <td style="text-align: right;">₹${(item.item?.unitPrice || 0).toLocaleString('en-IN')}</td>
          <td style="text-align: right;">₹${((item.item?.quantity || 0) * (item.item?.unitPrice || 0)).toLocaleString('en-IN')}</td>
        </tr>
      `).join('')}
      <!-- Blank row to maintain table format -->
      <tr>
        <td style="height: 31px; text-align: center;"></td>
        <td></td>
        <td style="text-align: center;"></td>
        <td style="text-align: center;"></td>
        <td style="text-align: center;"></td>
        <td style="text-align: right;"></td>
        <td style="text-align: right;"></td>
      </tr>
    </tbody>
  </table>

  <!-- Totals Section -->
  <table class="totals-section">
    <!-- Total in Words Row -->
    <tr>
      <td style="width: calc(100% - 280px); height: 31px;">
        <div style="display: flex; align-items: center; height: 100%;">
          <span style="font-size: 12px; font-weight: bold;">Total in Words: </span>
          <span style="font-size: 11px; font-style: italic; margin-left: 4px; font-weight: bold;">
            ${wordsAmount}
          </span>
        </div>
      </td>
      <td style="text-align: right; width: 190px; font-size: 11px;">Total</td>
      <td style="text-align: right; width: 90px; font-size: 11px;">₹${itemsTotal.toLocaleString('en-IN')}</td>
    </tr>
    
    <!-- Specifications and Calculations Row -->
    <tr>
      <td rowspan="4" style="vertical-align: top;">
        <h3 style="font-size: 12px; font-weight: bold; margin: 0 0 6px 0;">Furniture Specifications</h3>
        <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- All furniture will be manufactured using premium materials</p>
        <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- All hardware considered of standard make</p>
        <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- Standard laminates considered as per selection</p>
        <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- Any modifications or changes in material selection may result in additional charges</p>
      </td>
      <td style="text-align: right; font-size: 11px;">Packaging @ 2%</td>
      <td style="text-align: right; font-size: 11px;">₹${packagingAmount.toLocaleString('en-IN')}</td>
    </tr>
    
    <tr>
      <td style="text-align: right; font-size: 11px;">Transportation</td>
      <td style="text-align: right; font-size: 11px;">₹5,000</td>
    </tr>
    
    <tr>
      <td style="text-align: right; font-size: 11px;">GST @ 18%</td>
      <td style="text-align: right; font-size: 11px;">₹${gstAmount.toLocaleString('en-IN')}</td>
    </tr>
    
    <tr class="grand-total-row">
      <td style="text-align: right; font-size: 11px; font-weight: bold;">Grand Total</td>
      <td style="text-align: right; font-size: 11px; font-weight: bold;">₹${grandTotal.toLocaleString('en-IN')}</td>
    </tr>
  </table>

  <!-- Payment Terms Section -->
  <div class="payment-terms">
    <div class="payment-title">Payment Terms</div>
    <div class="payment-list">
      <div>• 30% Advance Payment: Due upon order confirmation</div>
      <div>• 50% Payment Before Delivery: To be settled prior to dispatch</div>
      <div>• 20% Payment on Delivery: Final payment upon installation completion</div>
    </div>
  </div>

  <!-- Signature Section -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Customer Signature</div>
    </div>
    <div class="signature-box">
      <div style="margin-bottom: 20px;">
        <img src="/public/assets/furnili-signature-stamp.png" alt="Furnili Signature" style="max-height: 60px; opacity: 0.8;" />
      </div>
      <div class="signature-line">Authorized Signatory<br/>FURNILI</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div style="font-size: 10px; color: #666;">
      Thank you for choosing Furnili. We look forward to transforming your space with our premium furniture solutions.
    </div>
  </div>
</body>
</html>`;
}