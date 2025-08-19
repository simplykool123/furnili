// Client-side free OCR utility with multiple engines
// Better accuracy than OCR.space for payment screenshots

export interface OCRResult {
  text: string;
  platform: string;
  amount: string;
  recipient: string;
  description: string;
  transactionId: string;
  date: string;
}

export class ClientFreeOCR {
  
  // Google Cloud Vision API (1,000 requests/month free)
  static async tryGoogleVisionOCR(file: File, apiKey?: string): Promise<string> {
    if (!apiKey) {
      throw new Error('Google Vision API key not provided');
    }
    
    try {
      console.log('OCR Debug - Using Google Cloud Vision (free tier)');
      
      const base64 = await this.fileToBase64(file);
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64
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
        console.log('OCR Debug - Google Vision successful');
        return text;
      }
      
      throw new Error('No text detected by Google Vision');
      
    } catch (error) {
      throw new Error(`Google Vision failed: ${error}`);
    }
  }

  // Enhanced Tesseract with payment-specific settings
  static async tryEnhancedTesseract(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using enhanced Tesseract for payment screenshots');
      
      if (!(window as any).Tesseract) {
        throw new Error('Tesseract.js not available');
      }

      const worker = await (window as any).Tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Enhanced settings for payment screenshots
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@.-/:',
        tessedit_pageseg_mode: '6', // Uniform block of text
        preserve_interword_spaces: '1'
      });
      
      const { data: { text, confidence } } = await worker.recognize(file);
      await worker.terminate();
      
      console.log(`OCR Debug - Enhanced Tesseract confidence: ${confidence}%`);
      return text;
      
    } catch (error) {
      throw new Error(`Enhanced Tesseract failed: ${error}`);
    }
  }

  // Standard Tesseract fallback
  static async tryStandardTesseract(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using standard Tesseract fallback');
      
      if (!(window as any).Tesseract) {
        throw new Error('Tesseract.js not available');
      }

      const worker = await (window as any).Tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      return text;
      
    } catch (error) {
      throw new Error(`Standard Tesseract failed: ${error}`);
    }
  }

  // Multi-engine processing with best-first approach
  static async processWithMultipleEngines(file: File, googleApiKey?: string): Promise<string> {
    console.log('OCR Debug - Starting enhanced multi-engine OCR processing');
    
    const engines = [
      {
        name: 'Google Vision',
        method: () => this.tryGoogleVisionOCR(file, googleApiKey),
        available: !!googleApiKey,
        priority: 1
      },
      {
        name: 'Enhanced Tesseract',
        method: () => this.tryEnhancedTesseract(file),
        available: true,
        priority: 2
      },
      {
        name: 'Standard Tesseract',
        method: () => this.tryStandardTesseract(file),
        available: true,
        priority: 3
      }
    ];

    // Try available engines in priority order
    for (const engine of engines.filter(e => e.available)) {
      try {
        console.log(`OCR Debug - Trying ${engine.name} (priority ${engine.priority})`);
        const result = await engine.method();
        
        if (result && result.trim().length > 0) {
          console.log(`OCR Debug - ${engine.name} succeeded`);
          return result;
        }
      } catch (error) {
        console.log(`OCR Debug - ${engine.name} failed:`, error.message);
        continue;
      }
    }
    
    console.log('OCR Debug - All engines failed');
    return '';
  }

  // Enhanced payment screenshot processing
  static async processPaymentScreenshot(file: File, googleApiKey?: string): Promise<OCRResult> {
    try {
      const text = await this.processWithMultipleEngines(file, googleApiKey);
      
      if (!text) {
        return {
          text: '',
          platform: 'unknown',
          amount: '',
          recipient: '',
          description: '',
          transactionId: '',
          date: ''
        };
      }

      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const platform = this.detectPlatform(lines);
      console.log('OCR Debug - Detected platform:', platform);

      return {
        text,
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
        text: '',
        platform: 'unknown',
        amount: '',
        recipient: '',
        description: '',
        transactionId: '',
        date: ''
      };
    }
  }

  private static detectPlatform(lines: string[]): string {
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

  private static extractAmount(lines: string[], platform: string): string {
    console.log('OCR Debug - Enhanced amount extraction for platform:', platform);
    
    // Enhanced patterns with better accuracy
    const amountPatterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/,  // ₹500, ₹1,500.00
      /rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,  // Rs 500, Rs. 1500
      /(?:paid|sent|amount)\s*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i,  // Paid ₹500
    ];

    // Sort lines by likelihood of containing amounts
    const sortedLines = [...lines].sort((a, b) => {
      const aHasRupee = /₹/.test(a) ? 10 : 0;
      const bHasRupee = /₹/.test(b) ? 10 : 0;
      return bHasRupee - aHasRupee;
    });

    for (const line of sortedLines) {
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
          if (amount >= 1 && amount <= 100000) {
            console.log('OCR Debug - Enhanced amount found:', match[1]);
            return match[1].replace(/,/g, '');
          }
        }
      }
    }

    // If no clear amount pattern found, look for reasonable standalone numbers
    for (const line of lines) {
      const standaloneMatch = line.match(/^([0-9,]+(?:\.[0-9]{2})?)$/);
      if (standaloneMatch) {
        const amount = parseFloat(standaloneMatch[1].replace(/,/g, ''));
        if (amount >= 50 && amount <= 100000) { // Reasonable transaction range
          console.log('OCR Debug - Found standalone amount:', standaloneMatch[1]);
          return standaloneMatch[1].replace(/,/g, '');
        }
      }
    }
    
    return '';
  }

  private static extractRecipient(lines: string[], platform: string): string {
    for (const line of lines) {
      if (platform === 'googlepay') {
        if (line.toLowerCase().includes('to ') && !line.toLowerCase().includes('powered')) {
          return line.replace(/.*to\s+/i, '').trim();
        }
      }
    }
    return '';
  }

  private static extractDescription(lines: string[], platform: string): string {
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

  private static extractTransactionId(lines: string[]): string {
    for (const line of lines) {
      const idMatch = line.match(/\b\d{10,}\b/);
      if (idMatch) {
        return idMatch[0];
      }
    }
    return '';
  }

  private static extractDate(lines: string[]): string {
    for (const line of lines) {
      const dateMatch = line.match(/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i);
      if (dateMatch) {
        return dateMatch[0];
      }
    }
    return '';
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}