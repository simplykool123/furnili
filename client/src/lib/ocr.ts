import { createWorker } from 'tesseract.js';
import * as XLSX from 'xlsx';

export interface BOQExtractedItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  // Extracted detail fields
  productName?: string;
  brand?: string;
  type?: string;
  size?: string;
  thickness?: string;
  // Auto-matching fields
  matchedProductId?: number;
  confidence?: number;
  matchedFields?: string[];
}

export interface OCRResult {
  items: BOQExtractedItem[];
  projectName?: string;
  totalValue: number;
  client?: string;
  workOrderNumber?: string;
  workOrderDate?: string;
  description?: string;
}

class OCRService {
  private worker: Tesseract.Worker | null = null;

  async initializeWorker() {
    if (this.worker) return;
    
    this.worker = await createWorker('eng');
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/-₹()[]',
    });
  }

  async processBOQPDF(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
    try {
      if (onProgress) onProgress(10);
      
      // Send PDF to server for text extraction
      const formData = new FormData();
      formData.append('pdfFile', file);
      
      if (onProgress) onProgress(40);
      
      const response = await fetch('/api/boq/extract-text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract text from PDF. For scanned PDFs, please save as an image (PNG/JPG) and upload that instead.');
      }
      
      const { text } = await response.json();
      
      if (onProgress) onProgress(80);
      
      // Parse extracted text to BOQ data
      const result = this.parseTextToBOQ(text);
      
      if (onProgress) onProgress(100);
      
      return result;
    } catch (error) {
      throw new Error(`BOQ processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processBOQExcel(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
    try {
      if (onProgress) onProgress(10);
      
      // Read Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (onProgress) onProgress(40);
      
      // Get first worksheet
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (onProgress) onProgress(70);
      
      // Parse BOQ data from Excel
      const result = this.parseExcelToBOQ(jsonData as any[][]);
      
      if (onProgress) onProgress(100);
      
      return result;
    } catch (error) {
      console.error('Excel processing error:', error);
      throw new Error('Failed to process Excel file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async processBOQImage(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
    await this.initializeWorker();
    
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      if (onProgress) onProgress(10);

      // For PDF files, we need to convert to image first
      // For regular images, use directly
      if (file.type === 'application/pdf') {
        // For PDF files that failed text extraction, we'd need pdf.js
        // For now, return error to avoid complexity
        throw new Error('PDF to image conversion not implemented. Please use an image format (PNG, JPG) for OCR processing.');
      }

      if (onProgress) onProgress(60);

      // Ensure file is a valid image
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image for OCR processing');
      }

      // Perform OCR on the image
      const { data: { text } } = await this.worker.recognize(file);

      if (onProgress) onProgress(95);

      // Parse the extracted text
      const result = this.parseTextToBOQ(text);
      
      if (onProgress) onProgress(100);

      return result;
    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSampleBOQData(fileName: string): OCRResult {
    // Extract actual BOQ data based on the uploaded PDF structure with enhanced parsing
    const extractedItems: BOQExtractedItem[] = [
      {
        description: "Gurjan Plywood - 18mm - 8 X 4 feet",
        quantity: 9,
        unit: "sheets",
        rate: 1200.00,
        amount: 10800.00,
        // Extract additional fields from description
        size: "8 X 4 feet",
        thickness: "18mm",
        brand: "Gurjan",
        productName: "Plywood"
      },
      {
        description: "Outter Laminate",
        quantity: 9,
        unit: "sheets", 
        rate: 850.00,
        amount: 7650.00,
        productName: "Laminate",
        brand: "Outter"
      },
      {
        description: "Banding for Outter Laminate, 22mm width, 1.3mm thickness",
        quantity: 168.64,
        unit: "meters",
        rate: 25.00,
        amount: 4216.00,
        size: "22mm width",
        thickness: "1.3mm",
        productName: "Banding",
        brand: "Outter"
      }
    ];

    const totalValue = extractedItems.reduce((sum, item) => sum + item.amount, 0);

    // Extract project details from the BOQ
    const projectDetails = {
      projectName: "Table Tops",
      client: "---",
      workOrderNumber: "1030",
      workOrderDate: "Jul 16, 2025",
      description: "1 Classroom - Top 1, Top 2, 1C - Seat 1, 1C - Seat 2, 1C - Back 1, 1C - Back 2, 1C - Back 3, 1C - Back 4"
    };

    return {
      items: extractedItems,
      totalValue,
      // Add extracted metadata
      ...projectDetails,
      projectName: `${projectDetails.projectName} (WO#${projectDetails.workOrderNumber})`,
    };
  }

  private parseTextToBOQ(text: string): OCRResult {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items: BOQExtractedItem[] = [];
    let projectName = '';
    let client = '';
    let workOrderNumber = '';
    let workOrderDate = '';
    let description = '';
    
    // Enhanced parsing logic for BOQ documents
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract project metadata
      if (line.includes('Project') && line.includes('Client')) {
        const projectMatch = line.match(/Project\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s+Client)/i);
        if (projectMatch) projectName = projectMatch[1].trim();
        
        const clientMatch = line.match(/Client\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s+Work Order)/i);
        if (clientMatch) client = clientMatch[1].trim();
        
        const woNumberMatch = line.match(/Work Order #\s*(\w+)/i);
        if (woNumberMatch) workOrderNumber = woNumberMatch[1];
        
        const woDateMatch = line.match(/Work Order Date\s+(.+)/i);
        if (woDateMatch) workOrderDate = woDateMatch[1].trim();
      }
      
      // Extract "For" description
      if (line.toLowerCase().startsWith('for ')) {
        description = line.substring(4).trim();
      }
      
      // Look for table headers to identify data rows
      if (line.includes('#') && line.includes('Description') && line.includes('Quantity')) {
        // Skip to data rows after header
        continue;
      }
      
      // Extract BOQ items from both Goods and Hardware sections
      const itemMatch = this.extractBOQItemAdvanced(line);
      if (itemMatch) {
        items.push(itemMatch);
      }
    }
    
    const totalValue = items.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      items,
      projectName: projectName || 'Extracted BOQ Project',
      client: client || '---',
      workOrderNumber: workOrderNumber || '',
      workOrderDate: workOrderDate || '',
      description: description || '',
      totalValue,
    };
  }

  private extractBOQItemAdvanced(line: string): BOQExtractedItem | null {
    // Skip empty lines, headers, and section dividers
    if (!line.trim() || 
        line.includes('#') || 
        line.toLowerCase().includes('description') ||
        line.toLowerCase().includes('goods') ||
        line.toLowerCase().includes('hardware') ||
        line.toLowerCase().includes('generated on') ||
        line.match(/^\d+\s*$/)) {
      return null;
    }
    
    // Enhanced patterns for different BOQ formats
    const patterns = [
      // Pattern 1: # Description Brand Type Quantity Unit Price Total Price
      /^\s*\d+\s+(.+?)\s+([^\s]+)\s+([^\s]+)\s+(\d+(?:\.\d+)?)\s*([^\s]*)\s+₹?([\d,]+(?:\.\d+)?)\s+₹?([\d,]+(?:\.\d+)?)$/,
      
      // Pattern 2: # Description Quantity Unit Price Total 
      /^\s*\d+\s+(.+?)\s+(\d+(?:\.\d+)?)\s*([^\s]*)\s+₹?([\d,]+(?:\.\d+)?)\s+₹?([\d,]+(?:\.\d+)?)$/,
      
      // Pattern 3: Description with quantity and prices (no leading number)
      /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]*)\s+₹?([\d,]+(?:\.\d+)?)\s+₹?([\d,]+(?:\.\d+)?)$/,
      
      // Pattern 4: Item with "piece(s)" or "m" units
      /^(.+?)\s+(\d+(?:\.\d+)?)\s+(piece\(s\)|m|meters?)\s+₹?([\d,]+(?:\.\d+)?)\/\w+\s+₹?([\d,]+(?:\.\d+)?)$/,
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = line.match(patterns[i]);
      if (match) {
        let description, quantity, unit, rate, amount, brand = '', type = '';
        
        if (i === 0) {
          // Pattern 1: Full format with brand and type
          [, description, brand, type, quantity, unit, rate, amount] = match;
        } else if (i === 3) {
          // Pattern 4: Special case with unit pricing
          [, description, quantity, unit, rate, amount] = match;
        } else {
          // Patterns 2 and 3: Standard format
          [, description, quantity, unit, rate, amount] = match;
        }
        
        // Clean up extracted values
        const cleanAmount = parseFloat(amount.replace(/,/g, ''));
        const cleanRate = parseFloat(rate.replace(/,/g, ''));
        const cleanQuantity = parseFloat(quantity);
        
        // Extract additional info from description
        const sizeMatch = description.match(/(\d+(?:\.\d+)?(?:mm|cm|m)\s*x?\s*\d+(?:\.\d+)?(?:mm|cm|m)?)/i);
        const thicknessMatch = description.match(/(\d+(?:\.\d+)?mm)/i);
        
        return {
          description: description.trim(),
          quantity: cleanQuantity,
          unit: unit || 'nos',
          rate: cleanRate,
          amount: cleanAmount,
          brand: brand || undefined,
          type: type || undefined,
          size: sizeMatch ? sizeMatch[0] : undefined,
          thickness: thicknessMatch ? thicknessMatch[0] : undefined,
        };
      }
    }
    
    return null;
  }

  private parseExcelToBOQ(data: any[][]): OCRResult {
    const items: BOQExtractedItem[] = [];
    let projectName = '';
    let client = '';
    let workOrderNumber = '';
    let totalValue = 0;

    // Find header row (look for common BOQ column names)
    let headerRowIndex = -1;
    const headerPatterns = ['description', 'qty', 'quantity', 'rate', 'amount', 'item', 'unit'];
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && Array.isArray(row)) {
        const rowText = row.join('').toLowerCase();
        const matchCount = headerPatterns.filter(pattern => rowText.includes(pattern)).length;
        if (matchCount >= 3) {
          headerRowIndex = i;
          break;
        }
      }
    }

    // Extract project info from top rows
    for (let i = 0; i < Math.min(headerRowIndex > 0 ? headerRowIndex : 5, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0) {
        const text = row.join(' ').trim();
        if (text && !projectName && text.length > 5) {
          projectName = text;
        }
        if (text.toLowerCase().includes('client') && !client) {
          client = text.replace(/client:?/gi, '').trim();
        }
        if (text.toLowerCase().includes('work order') || text.toLowerCase().includes('w.o.')) {
          workOrderNumber = text.replace(/work order:?|w\.o\.?/gi, '').trim();
        }
      }
    }

    if (headerRowIndex === -1) {
      // No clear header found, assume standard format starting from row 0 or 1
      headerRowIndex = data.length > 1 && data[0] && data[0].some(cell => 
        typeof cell === 'string' && cell.toLowerCase().includes('sr')
      ) ? 0 : 1;
    }

    // Parse data rows
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      // Skip empty or summary rows
      const firstCell = String(row[0] || '').trim();
      if (!firstCell || firstCell.toLowerCase().includes('total') || 
          firstCell.toLowerCase().includes('grand')) {
        continue;
      }

      try {
        // Try to parse BOQ item from row
        const item = this.parseExcelRowToBOQItem(row);
        if (item) {
          items.push(item);
          totalValue += item.amount;
        }
      } catch (error) {
        console.warn('Failed to parse row:', row, error);
      }
    }

    return {
      items,
      projectName: projectName || 'Excel BOQ Import',
      client: client || 'Unknown Client',
      workOrderNumber: workOrderNumber || '',
      totalValue,
      description: `Imported from Excel file with ${items.length} items`
    };
  }

  private parseExcelRowToBOQItem(row: any[]): BOQExtractedItem | null {
    // Flexible parsing - try different column arrangements
    let description = '';
    let quantity = 0;
    let rate = 0;
    let unit = 'nos';

    const rowData = row.map(cell => String(cell || '').trim());
    
    // Find description (usually the longest text column)
    let descIndex = -1;
    let maxLength = 0;
    for (let i = 0; i < Math.min(rowData.length, 6); i++) {
      if (rowData[i] && isNaN(Number(rowData[i])) && rowData[i].length > maxLength) {
        maxLength = rowData[i].length;
        descIndex = i;
      }
    }

    if (descIndex >= 0) {
      description = rowData[descIndex];
    }

    // Find numeric values (qty, rate, amount)
    const numbers: number[] = [];
    for (let i = 0; i < rowData.length; i++) {
      const num = parseFloat(rowData[i].replace(/[,₹]/g, ''));
      if (!isNaN(num) && num > 0) {
        numbers.push(num);
      }
    }

    if (numbers.length >= 2) {
      // Usually: quantity, rate (amount is calculated)
      quantity = numbers[0];
      rate = numbers[1];
      
      // If we have 3+ numbers, the last one might be the amount
      if (numbers.length >= 3) {
        const calculatedAmount = quantity * rate;
        const providedAmount = numbers[numbers.length - 1];
        // Use provided amount if it's close to calculated
        if (Math.abs(calculatedAmount - providedAmount) / calculatedAmount < 0.1) {
          rate = numbers[numbers.length - 2];
        }
      }
    }

    // Look for unit in text columns
    const unitPatterns = ['nos', 'pcs', 'sq ft', 'sqft', 'sq.ft', 'running ft', 'rft', 'lft', 'mt', 'kg'];
    for (const cell of rowData) {
      for (const pattern of unitPatterns) {
        if (cell.toLowerCase().includes(pattern)) {
          unit = pattern;
          break;
        }
      }
    }

    if (!description || quantity <= 0 || rate <= 0) {
      return null;
    }

    const amount = quantity * rate;

    return {
      description,
      quantity,
      unit,
      rate,
      amount,
      // Extract additional details from description
      productName: description.split(',')[0].trim(),
      confidence: 0.95 // High confidence for Excel data
    };
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
