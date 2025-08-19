// Enhanced OCR utility for payment screenshot processing
// Using free OCR.space API with intelligent pattern recognition

export interface OCRResult {
  text: string;
  lines?: string[];
  platform: string;
  amount: string;
  recipient: string;
  description: string;
  transactionId: string;
  date: string;
}

export class EnhancedOCR {
  private static FREE_API_KEY = 'K87899142888957'; // OCR.space free tier key

  // Primary OCR method using free OCR.space API
  static async extractTextWithOCRSpace(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using free OCR.space API for better accuracy');
      
      const formData = new FormData();
      formData.append('apikey', this.FREE_API_KEY);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('isTable', 'true');
      formData.append('OCREngine', '2'); // Engine 2 for better screenshot accuracy
      formData.append('file', file);

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.ParsedResults && result.ParsedResults.length > 0) {
        const text = result.ParsedResults[0].ParsedText;
        console.log('OCR Debug - OCR.space extraction successful:', text.slice(0, 200) + '...');
        return text;
      } else {
        throw new Error('OCR.space failed to extract text');
      }
    } catch (error) {
      console.error('OCR.space failed:', error);
      throw error;
    }
  }

  // Fallback to Tesseract if OCR.space fails
  static async extractTextWithTesseract(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using Tesseract.js fallback');
      
      if (!(window as any).Tesseract) {
        throw new Error('Tesseract.js not available');
      }

      const worker = await (window as any).Tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      console.log('OCR Debug - Tesseract extraction successful');
      return text;
    } catch (error) {
      console.error('Tesseract failed:', error);
      throw error;
    }
  }

  // Main OCR processing method with automatic fallback
  static async processPaymentScreenshot(file: File): Promise<OCRResult> {
    let text = '';
    
    try {
      // Try OCR.space first for better accuracy
      text = await this.extractTextWithOCRSpace(file);
    } catch (error) {
      try {
        // Fallback to Tesseract
        text = await this.extractTextWithTesseract(file);
      } catch (fallbackError) {
        console.error('Both OCR methods failed:', error, fallbackError);
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

    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const platform = this.detectPlatform(lines);
    console.log('OCR Debug - Detected platform:', platform);

    return {
      text,
      lines,
      platform,
      amount: this.extractAmount(lines, platform),
      recipient: this.extractRecipient(lines, platform),
      description: this.extractDescription(lines, platform),
      transactionId: this.extractTransactionId(lines),
      date: this.extractDate(lines)
    };
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
      // Skip date lines and long transaction IDs
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

  private static extractRecipient(lines: string[], platform: string): string {
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

  private static extractDescription(lines: string[], platform: string): string {
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

  private static extractTransactionId(lines: string[]): string {
    for (const line of lines) {
      // Look for long numeric transaction IDs
      const idMatch = line.match(/\b\d{10,}\b/);
      if (idMatch) {
        return idMatch[0];
      }
    }
    
    return '';
  }

  private static extractDate(lines: string[]): string {
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
}