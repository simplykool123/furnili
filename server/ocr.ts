import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

// Enhanced OCR service with cloud-based and local engines
export class OCRService {
  private tesseractWorker: any = null;
  
  constructor() {
    // Initialize Tesseract.js for fallback
    this.initializeTesseract();
  }

  private async initializeTesseract() {
    try {
      const Tesseract = require('tesseract.js');
      this.tesseractWorker = await Tesseract.createWorker();
      await this.tesseractWorker.loadLanguage('eng');
      await this.tesseractWorker.initialize('eng');
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
    }
  }

  // Primary OCR method using OCR.space API for better accuracy
  async extractTextWithOCRSpace(imagePath: string): Promise<string[]> {
    try {
      console.log('OCR Debug - Using OCR.space for processing:', imagePath);
      
      const apiKey = process.env.OCR_SPACE_API_KEY || 'K87899142888957'; // Free tier key
      
      const formData = new FormData();
      formData.append('apikey', apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('isTable', 'true');
      formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
      formData.append('file', fs.createReadStream(imagePath));

      const response = await axios.post('https://api.ocr.space/parse/image', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000
      });

      if (response.data.ParsedResults && response.data.ParsedResults.length > 0) {
        const text = response.data.ParsedResults[0].ParsedText;
        const lines = text.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
        
        console.log('OCR Debug - OCR.space results:', lines);
        return lines;
      }
      
      throw new Error('No text detected by OCR.space');
      
    } catch (error) {
      console.error('OCR.space failed, falling back to Tesseract:', error);
      return this.extractTextWithTesseract(imagePath);
    }
  }

  // Fallback OCR method using Tesseract
  async extractTextWithTesseract(imagePath: string): Promise<string[]> {
    if (!this.tesseractWorker) {
      throw new Error('Tesseract worker not initialized');
    }

    console.log('OCR Debug - Using Tesseract for processing:', imagePath);
    
    try {
      const { data: { text } } = await this.tesseractWorker.recognize(imagePath);
      const lines = text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      
      console.log('OCR Debug - Tesseract results:', lines);
      return lines;
    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      return [];
    }
  }

  // Enhanced OCR processing with better pattern recognition for payment screenshots
  async processPaymentScreenshot(imagePath: string): Promise<{
    lines: string[];
    platform: string;
    amount: string;
    recipient: string;
    description: string;
    transactionId: string;
    date: string;
  }> {
    try {
      // Try OCR.space first for better accuracy, fallback to Tesseract
      let lines: string[] = [];
      try {
        lines = await this.extractTextWithOCRSpace(imagePath);
      } catch (error) {
        console.log('OCR.space failed, using Tesseract fallback');
        lines = await this.extractTextWithTesseract(imagePath);
      }
      
      const platform = this.detectPlatform(lines);
      console.log('OCR Debug - Detected platform:', platform);
      
      const result = {
        lines,
        platform,
        amount: this.extractAmount(lines, platform),
        recipient: this.extractRecipient(lines, platform),
        description: this.extractDescription(lines, platform),
        transactionId: this.extractTransactionId(lines, platform),
        date: this.extractDate(lines)
      };
      
      console.log('OCR Debug - Final extraction result:', result);
      return result;
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        lines: [],
        platform: 'unknown',
        amount: '',
        recipient: '',
        description: '',
        transactionId: '',
        date: ''
      };
    }
  }

  private detectPlatform(lines: string[]): string {
    const text = lines.join(' ').toLowerCase();
    
    if (text.includes('google pay') || text.includes('gpay') || text.includes('g pay')) {
      return 'googlepay';
    }
    if (text.includes('phonepe') || text.includes('phone pe')) {
      return 'phonepe';
    }
    if (text.includes('paytm')) {
      return 'paytm';
    }
    if (text.includes('cred')) {
      return 'cred';
    }
    
    return 'generic';
  }

  private extractAmount(lines: string[], platform: string): string {
    console.log('OCR Debug - Extracting amount for platform:', platform);
    
    // Sort lines by potential amount prominence
    const sortedLines = [...lines].sort((a, b) => {
      const aHasRupee = /₹/.test(a);
      const bHasRupee = /₹/.test(b);
      if (aHasRupee && !bHasRupee) return -1;
      if (bHasRupee && !aHasRupee) return 1;
      return 0;
    });

    for (const line of sortedLines) {
      // Skip date lines and transaction IDs
      if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || /\d{10,}/.test(line)) {
        continue;
      }

      let amountMatch = null;
      
      // Priority 1: ₹ symbol amounts
      amountMatch = line.match(/₹\s*([0-9,]+(?:\.[0-9]{2})?)/);
      
      // Priority 2: Context-based amounts
      if (!amountMatch) {
        amountMatch = line.match(/(?:paid|amount|sent|received)\s*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
      }
      
      // Priority 3: Rs format
      if (!amountMatch) {
        amountMatch = line.match(/rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
      }
      
      // Priority 4: Standalone reasonable amounts
      if (!amountMatch && !/^\d{1,2}$/.test(line.trim())) {
        const standaloneMatch = line.match(/^([0-9,]+(?:\.[0-9]{2})?)$/);
        if (standaloneMatch) {
          const num = parseFloat(standaloneMatch[1].replace(/,/g, ''));
          if (num >= 1 && num <= 100000) {
            amountMatch = standaloneMatch;
          }
        }
      }
      
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (amount >= 1 && amount <= 100000 && String(amount).length <= 6) {
          console.log('OCR Debug - Amount found:', amountMatch[1]);
          return amountMatch[1].replace(/,/g, '');
        }
      }
    }
    
    return '';
  }

  private extractRecipient(lines: string[], platform: string): string {
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (platform === 'googlepay') {
        if (lowerLine.includes('to ') && !lowerLine.includes('powered')) {
          return line.replace(/.*to\s+/i, '').trim();
        }
        // Look for uppercase business names
        if (/^[A-Z][A-Z\s&]+[A-Z]$/.test(line) && line.length > 3) {
          return line.trim();
        }
      }
    }
    
    return '';
  }

  private extractDescription(lines: string[], platform: string): string {
    const meaningfulLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      
      // Skip corrupted OCR patterns and metadata
      if (/£\d+|hore|bank.*\d{4}|0720\s*v/i.test(line) ||
          lowerLine.includes('transaction') ||
          lowerLine.includes('completed') ||
          lowerLine.includes('google pay') ||
          lowerLine.includes('upi id')) {
        return false;
      }
      
      // Keep business-related descriptions
      return line.split(' ').length >= 2 ||
             ['furnili', 'table', 'courier', 'steel', 'wood', 'material', 'hardware', 'purchase', 'order'].some(term => 
               lowerLine.includes(term)
             );
    });
    
    if (meaningfulLines.length > 0) {
      return meaningfulLines.join(' ');
    }
    
    return '';
  }

  private extractTransactionId(lines: string[], platform: string): string {
    for (const line of lines) {
      // Look for long numeric transaction IDs
      const idMatch = line.match(/\b\d{10,}\b/);
      if (idMatch) {
        return idMatch[0];
      }
    }
    
    return '';
  }

  private extractDate(lines: string[]): string {
    for (const line of lines) {
      // Look for date patterns
      const dateMatch = line.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || 
                       line.match(/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i);
      if (dateMatch) {
        return dateMatch[0];
      }
    }
    
    return '';
  }

  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
    }
  }
}

export const ocrService = new OCRService();