/**
 * AI-Powered Receipt Processing System
 * Advanced OCR with intelligent pattern recognition for UPI payments, cash receipts, and invoices
 */

export interface ProcessedReceipt {
  amount: number;
  vendor: string;
  date: string;
  paymentMode: string;
  category: string;
  description: string;
  confidence: number;
  rawText: string;
  processingDetails: string;
}

interface AmountCandidate {
  amount: string;
  confidence: number;
  source: string;
  context: string;
}

interface VendorCandidate {
  vendor: string;
  confidence: number;
  source: string;
}

interface DateCandidate {
  date: string;
  confidence: number;
  source: string;
  format: string;
}

export class AIReceiptProcessor {
  private static readonly UPI_PATTERNS = [
    // UPI ID patterns
    /(\w+@\w+)/g,
    // Transaction patterns
    /(?:paid|sent|transferred).*?(?:to|@)\s*([A-Za-z\s]+?)(?:\s|$|gpay|phonepe|paytm)/gi,
    // Recipient patterns
    /(?:recipient|to):\s*([A-Za-z\s]+)/gi,
    // Name in transaction format
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:paid|received|gpay|phonepe)/gi
  ];

  private static readonly AMOUNT_PATTERNS = [
    // Standard currency with symbols
    /₹\s*([0-9,]+(?:\.[0-9]{2})?)/g,
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    /INR\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    // Amount in context
    /(?:amount|paid|total|sum).*?₹?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
    /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rupees?|rs|₹)/gi,
    // Standalone numbers in money context
    /(?:^|\s)([1-9][0-9,]{2,}(?:\.[0-9]{2})?)\s*(?=\s|$|rupees|rs|₹|paid|amount)/gm
  ];

  private static readonly DATE_PATTERNS = [
    // DD/MM/YYYY, DD-MM-YYYY
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g,
    // DD MMM YYYY
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    // YYYY-MM-DD
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    // Relative dates
    /(?:today|yesterday|\d+\s+(?:days?|hrs?|hours?|minutes?)\s+ago)/gi
  ];

  private static readonly VENDOR_KEYWORDS = {
    'Hardware': ['hardware', 'tools', 'building', 'construction', 'cement', 'steel', 'iron'],
    'Transport': ['cab', 'taxi', 'uber', 'ola', 'auto', 'rickshaw', 'bus', 'train', 'fuel', 'petrol', 'diesel'],
    'Food': ['restaurant', 'hotel', 'cafe', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'tea', 'coffee'],
    'Office': ['stationery', 'office', 'xerox', 'print', 'paper', 'pen', 'computer'],
    'Site': ['labour', 'worker', 'contractor', 'electrician', 'plumber', 'painter'],
    'Material': ['supplier', 'wholesale', 'trader', 'merchant', 'store'],
    'Fuel': ['petrol', 'diesel', 'fuel', 'gas', 'oil'],
    'Repair': ['repair', 'service', 'maintenance', 'fix']
  };

  static async processReceipt(file: File): Promise<ProcessedReceipt> {
    try {
      console.log('🤖 Starting AI Receipt Processing...');
      
      // Extract text using OCR
      const rawText = await this.extractTextFromImage(file);
      console.log('📄 Raw OCR Text:', rawText);

      if (!rawText || rawText.trim().length < 10) {
        throw new Error('Unable to extract sufficient text from receipt');
      }

      // Process with AI-level intelligence
      const result = await this.intelligentProcessing(rawText);
      
      console.log('✅ AI Processing Complete:', result);
      return result;
    } catch (error) {
      console.error('❌ AI Processing Error:', error);
      throw new Error(`Receipt processing failed: ${error.message}`);
    }
  }

  private static async extractTextFromImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.Tesseract) {
        reject(new Error('Tesseract not loaded'));
        return;
      }

      console.log('🔍 Performing OCR extraction...');
      
      window.Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      ).then(({ data: { text } }) => {
        resolve(text);
      }).catch(reject);
    });
  }

  private static async intelligentProcessing(rawText: string): Promise<ProcessedReceipt> {
    const text = rawText.toLowerCase().replace(/[^\w\s₹\.\-\/\@]/g, ' ').replace(/\s+/g, ' ');
    
    console.log('🧠 Starting intelligent analysis...');

    // Multi-stage intelligent extraction
    const amountCandidates = this.extractAmountCandidates(text, rawText);
    const vendorCandidates = this.extractVendorCandidates(text, rawText);
    const dateCandidates = this.extractDateCandidates(text, rawText);
    const paymentMode = this.detectPaymentMode(text);
    
    // AI-level selection logic
    const bestAmount = this.selectBestAmount(amountCandidates);
    const bestVendor = this.selectBestVendor(vendorCandidates, text);
    const bestDate = this.selectBestDate(dateCandidates);
    const category = this.intelligentCategoryDetection(bestVendor, text);
    const description = this.generateDescription(bestVendor, bestAmount, paymentMode);

    // Calculate confidence based on multiple factors
    const confidence = this.calculateOverallConfidence(
      amountCandidates.length > 0 ? Math.max(...amountCandidates.map(c => c.confidence)) : 0,
      vendorCandidates.length > 0 ? Math.max(...vendorCandidates.map(c => c.confidence)) : 0,
      dateCandidates.length > 0 ? Math.max(...dateCandidates.map(c => c.confidence)) : 0
    );

    return {
      amount: parseFloat(bestAmount) || 0,
      vendor: bestVendor || 'Unknown Vendor',
      date: bestDate || new Date().toISOString().split('T')[0],
      paymentMode,
      category,
      description,
      confidence,
      rawText,
      processingDetails: `Found ${amountCandidates.length} amount candidates, ${vendorCandidates.length} vendor candidates, ${dateCandidates.length} date candidates`
    };
  }

  private static extractAmountCandidates(text: string, originalText: string): AmountCandidate[] {
    const candidates: AmountCandidate[] = [];
    
    for (const pattern of this.AMOUNT_PATTERNS) {
      let match;
      while ((match = pattern.exec(originalText)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (amount >= 1 && amount <= 1000000) { // Reasonable range
          const context = originalText.substring(Math.max(0, match.index - 20), match.index + 50);
          let confidence = 0.5;
          
          // Boost confidence based on context
          if (/(?:paid|amount|total|sum|bill|charge)/i.test(context)) confidence += 0.3;
          if (/₹|rs|rupees/i.test(context)) confidence += 0.2;
          
          candidates.push({
            amount: amountStr,
            confidence,
            source: 'Pattern matching',
            context: context.trim()
          });
        }
      }
    }
    
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  private static extractVendorCandidates(text: string, originalText: string): VendorCandidate[] {
    const candidates: VendorCandidate[] = [];
    
    for (const pattern of this.UPI_PATTERNS) {
      let match;
      while ((match = pattern.exec(originalText)) !== null) {
        let vendor = match[1].trim();
        
        // Clean up vendor name
        vendor = vendor.replace(/gpay|phonepe|paytm|paid|to|from/gi, '').trim();
        vendor = this.capitalizeWords(vendor);
        
        if (vendor.length >= 3 && vendor.length <= 50) {
          let confidence = 0.6;
          
          // Boost confidence for proper names
          if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(vendor)) confidence += 0.2;
          if (vendor.includes('@')) confidence += 0.1;
          
          candidates.push({
            vendor,
            confidence,
            source: 'UPI pattern'
          });
        }
      }
    }
    
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  private static extractDateCandidates(text: string, originalText: string): DateCandidate[] {
    const candidates: DateCandidate[] = [];
    
    for (const pattern of this.DATE_PATTERNS) {
      let match;
      while ((match = pattern.exec(originalText)) !== null) {
        const dateStr = match[1];
        const parsedDate = this.parseDate(dateStr);
        
        if (parsedDate) {
          candidates.push({
            date: parsedDate,
            confidence: 0.7,
            source: 'Date pattern',
            format: dateStr
          });
        }
      }
    }
    
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  private static selectBestAmount(candidates: AmountCandidate[]): string {
    if (candidates.length === 0) return '0';
    
    // Advanced selection logic
    const sorted = candidates.sort((a, b) => {
      // Primary: confidence
      if (Math.abs(b.confidence - a.confidence) > 0.1) return b.confidence - a.confidence;
      
      // Secondary: prefer amounts with currency symbols
      const aHasCurrency = a.context.includes('₹') || a.context.includes('Rs');
      const bHasCurrency = b.context.includes('₹') || b.context.includes('Rs');
      if (aHasCurrency !== bHasCurrency) return bHasCurrency ? 1 : -1;
      
      return 0;
    });
    
    return sorted[0].amount;
  }

  private static selectBestVendor(candidates: VendorCandidate[], text: string): string {
    if (candidates.length === 0) {
      // Fallback: try to find any capitalized words
      const words = text.split(/\s+/);
      for (const word of words) {
        if (/^[A-Z][a-z]{2,}/.test(word) && word.length <= 20) {
          return word;
        }
      }
      return 'Unknown Vendor';
    }
    
    return candidates[0].vendor;
  }

  private static selectBestDate(candidates: DateCandidate[]): string {
    if (candidates.length === 0) {
      return new Date().toISOString().split('T')[0];
    }
    
    return candidates[0].date;
  }

  private static detectPaymentMode(text: string): string {
    if (/gpay|google\s*pay/i.test(text)) return 'GPay';
    if (/phonepe|phone\s*pe/i.test(text)) return 'PhonePe';
    if (/paytm/i.test(text)) return 'Paytm';
    if (/upi|unified\s*payment/i.test(text)) return 'UPI';
    if (/cash/i.test(text)) return 'Cash';
    if (/card|visa|master/i.test(text)) return 'Card';
    if (/bank|neft|rtgs/i.test(text)) return 'Bank Transfer';
    
    return 'UPI'; // Default for digital receipts
  }

  private static intelligentCategoryDetection(vendor: string, text: string): string {
    const combinedText = `${vendor} ${text}`.toLowerCase();
    
    let bestCategory = 'Other';
    let maxScore = 0;
    
    for (const [category, keywords] of Object.entries(this.VENDOR_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        const count = (combinedText.match(new RegExp(keyword, 'g')) || []).length;
        score += count;
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }
    
    return bestCategory;
  }

  private static generateDescription(vendor: string, amount: string, paymentMode: string): string {
    return `Payment of ₹${amount} to ${vendor} via ${paymentMode}`;
  }

  private static calculateOverallConfidence(amountConf: number, vendorConf: number, dateConf: number): number {
    const weights = { amount: 0.4, vendor: 0.4, date: 0.2 };
    return Math.min(100, Math.round(
      (amountConf * weights.amount + vendorConf * weights.vendor + dateConf * weights.date) * 100
    ));
  }

  private static parseDate(dateStr: string): string | null {
    try {
      // Handle different date formats
      let date: Date;
      
      if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(dateStr)) {
        const [day, month, year] = dateStr.split(/[\/\-]/);
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(dateStr)) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr);
      }
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
    }
    
    return null;
  }

  private static capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

declare global {
  interface Window {
    Tesseract: any;
  }
}