import * as fs from 'fs';
import * as path from 'path';

// Enhanced free OCR service with multiple engines for payment screenshots
export class FreeOCRService {
  private tesseractWorker: any = null;
  
  constructor() {
    this.initializeTesseract();
  }

  private async initializeTesseract() {
    try {
      // Try enhanced tesseract-ocr-enhanced first for better rupee recognition
      let Tesseract;
      try {
        Tesseract = await import('tesseract-ocr-enhanced');
        console.log('Using enhanced Tesseract OCR with rupee sign support');
      } catch (enhancedError) {
        console.log('Enhanced Tesseract not available, using standard version');
        Tesseract = await import('tesseract.js');
      }
      
      this.tesseractWorker = await Tesseract.default.createWorker();
      await this.tesseractWorker.loadLanguage('eng');
      await this.tesseractWorker.initialize('eng');
      
      // Enhanced settings specifically for Indian payment screenshots with rupee symbols
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@.-/:(),',
        tessedit_pageseg_mode: '6', // Uniform block of text
        preserve_interword_spaces: '1',
        // Enhanced settings for currency symbol recognition
        user_defined_dpi: '300', // Higher DPI for better symbol recognition
        tessedit_ocr_engine_mode: '1', // Use LSTM OCR engine for better accuracy
        // Currency-specific character confidence
        tessedit_char_blacklist: '', // Don't blacklist any chars for currency
        textord_really_old_xheight: '1', // Better height detection for symbols
      });
      
      console.log('Enhanced Tesseract initialized with rupee sign optimization');
    } catch (error) {
      console.error('Failed to initialize enhanced Tesseract:', error);
    }
  }

  // Google Cloud Vision OCR (free tier: 1,000 requests/month)
  async tryGoogleVisionOCR(imagePath: string): Promise<string[]> {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      throw new Error('Google Vision API key not available');
    }
    
    try {
      console.log('OCR Debug - Using Google Cloud Vision (free tier)');
      
      // Simple API call without the full client library
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1
                }
              ]
            }
          ]
        })
      });

      const result = await response.json();
      
      if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
        const text = result.responses[0].textAnnotations[0].description;
        const lines = text.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
        
        console.log('OCR Debug - Google Vision successful:', lines.length, 'lines');
        return lines;
      }
      
      throw new Error('No text detected by Google Vision');
      
    } catch (error) {
      throw new Error(`Google Vision failed: ${error}`);
    }
  }

  // Enhanced Tesseract with payment-specific optimizations
  async tryEnhancedTesseract(imagePath: string): Promise<string[]> {
    if (!this.tesseractWorker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      console.log('OCR Debug - Using enhanced Tesseract for payment screenshots');
      
      const { data: { text, confidence } } = await this.tesseractWorker.recognize(imagePath);
      
      console.log(`OCR Debug - Tesseract confidence: ${confidence}%`);
      
      const lines = text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      
      console.log('OCR Debug - Enhanced Tesseract results:', lines);
      return lines;
      
    } catch (error) {
      throw new Error(`Enhanced Tesseract failed: ${error}`);
    }
  }

  // Standard Tesseract fallback
  async tryStandardTesseract(imagePath: string): Promise<string[]> {
    if (!this.tesseractWorker) {
      throw new Error('Tesseract worker not initialized');
    }

    try {
      console.log('OCR Debug - Using standard Tesseract fallback');
      
      const { data: { text } } = await this.tesseractWorker.recognize(imagePath);
      
      const lines = text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      
      return lines;
      
    } catch (error) {
      throw new Error(`Standard Tesseract failed: ${error}`);
    }
  }

  // Multi-engine OCR with automatic fallback
  async processWithMultipleEngines(imagePath: string): Promise<string[]> {
    console.log('OCR Debug - Starting multi-engine processing');
    
    const engines = [
      {
        name: 'Google Vision',
        method: () => this.tryGoogleVisionOCR(imagePath),
        priority: 1
      },
      {
        name: 'Enhanced Tesseract',
        method: () => this.tryEnhancedTesseract(imagePath),
        priority: 2
      },
      {
        name: 'Standard Tesseract',
        method: () => this.tryStandardTesseract(imagePath),
        priority: 3
      }
    ];

    // Try engines in priority order
    for (const engine of engines) {
      try {
        console.log(`OCR Debug - Trying ${engine.name} (priority ${engine.priority})`);
        const result = await engine.method();
        
        if (result && result.length > 0) {
          console.log(`OCR Debug - ${engine.name} succeeded with ${result.length} lines`);
          return result;
        }
      } catch (error) {
        console.log(`OCR Debug - ${engine.name} failed:`, error.message);
        continue;
      }
    }
    
    console.log('OCR Debug - All engines failed');
    return [];
  }

  // Enhanced payment screenshot processing
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
      const lines = await this.processWithMultipleEngines(imagePath);
      
      const platform = this.detectPlatform(lines);
      console.log('OCR Debug - Detected platform:', platform);
      
      return {
        lines,
        platform,
        amount: this.extractAmount(lines, platform),
        recipient: this.extractRecipient(lines, platform),
        description: this.extractDescription(lines, platform),
        transactionId: this.extractTransactionId(lines),
        date: this.extractDate(lines)
      };
      
    } catch (error) {
      console.error('Payment screenshot processing failed:', error);
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
    console.log('OCR Debug - Enhanced amount extraction for platform:', platform);
    
    // Enhanced amount patterns for better accuracy
    const amountPatterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/,  // ₹500, ₹1,500.00
      /rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,  // Rs 500, Rs. 1500
      /(?:paid|sent|amount)\s*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i,  // Paid ₹500
      /^([0-9,]+(?:\.[0-9]{2})?)$/  // Standalone number
    ];

    for (const line of lines) {
      // Skip obvious non-amount lines
      if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || // Skip dates
          /\d{10,}/.test(line) || // Skip transaction IDs
          line.toLowerCase().includes('jul') ||
          line.toLowerCase().includes('am') ||
          line.toLowerCase().includes('pm')) {
        continue;
      }

      for (const pattern of amountPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount >= 1 && amount <= 100000 && String(amount).length <= 6) {
            console.log('OCR Debug - Enhanced amount found:', match[1]);
            return match[1].replace(/,/g, '');
          }
        }
      }
    }
    
    return '';
  }

  private extractRecipient(lines: string[], platform: string): string {
    for (const line of lines) {
      if (platform === 'googlepay') {
        if (line.toLowerCase().includes('to ') && !line.toLowerCase().includes('powered')) {
          return line.replace(/.*to\s+/i, '').trim();
        }
      }
    }
    return '';
  }

  private extractDescription(lines: string[], platform: string): string {
    const businessTerms = ['furnili', 'fevixol', 'ashish', 'order', 'steel', 'wood', 'material'];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Skip system lines
      if (lowerLine.includes('google pay') || 
          lowerLine.includes('transaction') ||
          lowerLine.includes('completed') ||
          /^\d+$/.test(line)) {
        continue;
      }
      
      // Find business-related descriptions
      if (businessTerms.some(term => lowerLine.includes(term))) {
        return line.trim();
      }
    }
    
    return '';
  }

  private extractTransactionId(lines: string[]): string {
    for (const line of lines) {
      const idMatch = line.match(/\b\d{10,}\b/);
      if (idMatch) {
        return idMatch[0];
      }
    }
    return '';
  }

  private extractDate(lines: string[]): string {
    for (const line of lines) {
      const dateMatch = line.match(/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i);
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

export const freeOcrService = new FreeOCRService();