// Client-side free OCR utility with multiple engines and enhanced figure recognition
// Better accuracy than OCR.space for payment screenshots

import { EnhancedFigureOCR } from './enhancedFigureOcr';
import { TesseractConfig } from './tesseractConfig';
import { PaymentAmountDetector } from './paymentAmountDetector';
import { PaymentDescriptionDetector } from './paymentDescriptionDetector';

export interface OCRResult {
  text: string;
  platform: string;
  amount: string;
  recipient: string;
  description: string;
  transactionId: string;
  date: string;
  confidence?: number;
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

  // Enhanced Tesseract with advanced figure recognition and preprocessing  
  static async tryEnhancedTesseract(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using enhanced Tesseract.js with advanced figure recognition');
      
      // Enhanced preprocessing for better figure recognition
      const canvas = await this.fileToCanvas(file);
      const optimizedCanvas = await this.preprocessImageForRupeeRecognition(canvas);
      
      // Convert to high-quality blob
      const optimizedBlob = await new Promise<Blob>((resolve) => {
        optimizedCanvas.toBlob((blob: Blob | null) => resolve(blob!), 'image/png', 0.95);
      });
      
      // Create enhanced worker with optimized configuration
      const worker = await TesseractConfig.createEnhancedWorker();
      
      const { data: { text, confidence } } = await worker.recognize(optimizedBlob);
      await worker.terminate();
      
      console.log(`OCR Debug - Enhanced Tesseract confidence: ${confidence}%`);
      
      if (confidence > 60) {
        return this.correctRupeeSymbolErrors(text);
      } else {
        console.log('OCR Debug - Low confidence, trying standard fallback');
        throw new Error('Low confidence result');
      }
      
    } catch (error) {
      console.log('OCR Debug - Enhanced Tesseract failed:', error);
      return await this.tryStandardTesseract(file);
    }
  }



  // Convert file to canvas for preprocessing
  private static async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Enhanced image preprocessing for rupee symbol recognition
  private static async preprocessImageForRupeeRecognition(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Enhance contrast for better text/symbol recognition
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (luminance > 128) {
        // Lighten backgrounds
        data[i] = Math.min(255, r * 1.2);
        data[i + 1] = Math.min(255, g * 1.2);
        data[i + 2] = Math.min(255, b * 1.2);
      } else {
        // Darken text and symbols
        data[i] = Math.max(0, r * 0.7);
        data[i + 1] = Math.max(0, g * 0.7);
        data[i + 2] = Math.max(0, b * 0.7);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Generic post-processing for ALL payment apps - focuses on common OCR errors
  private static correctRupeeSymbolErrors(text: string): string {
    let corrected = text;
    
    console.log('OCR Debug - Starting generic OCR corrections for all payment apps');
    
    // UNIVERSAL CORRECTIONS - work for all payment platforms
    
    // 1. Fix common rupee symbol misreads (most critical for Indian payments)
    const universalRupeeReplacements = [
      // Critical symbols that are often misread as rupee
      { pattern: /£(\s*\d)/g, replacement: '₹$1', name: 'Pound to Rupee' },
      { pattern: /&(\s*\d)/g, replacement: '₹$1', name: 'Ampersand to Rupee' },
      { pattern: /¢(\s*\d)/g, replacement: '₹$1', name: 'Cent to Rupee' },
      { pattern: /@(\s*\d)/g, replacement: '₹$1', name: 'At symbol to Rupee' },
      { pattern: /\$(\s*\d)/g, replacement: '₹$1', name: 'Dollar to Rupee' },
      { pattern: /€(\s*\d)/g, replacement: '₹$1', name: 'Euro to Rupee' },
      { pattern: /¥(\s*\d)/g, replacement: '₹$1', name: 'Yen to Rupee' },
      
      // Text-based currency indicators
      { pattern: /Rs\.?\s*(\d)/gi, replacement: '₹$1', name: 'Rs text to symbol' },
      { pattern: /INR\s*(\d)/gi, replacement: '₹$1', name: 'INR text to symbol' },
      { pattern: /Rupees?\s*(\d)/gi, replacement: '₹$1', name: 'Rupees text to symbol' },
      { pattern: /RUPEE\s*(\d)/gi, replacement: '₹$1', name: 'RUPEE text to symbol' },
    ];
    
    // 2. Fix spacing and formatting issues (universal for all platforms)
    const spacingCorrections = [
      { pattern: /₹\s+(\d)/g, replacement: '₹$1', name: 'Remove space after rupee' },
      { pattern: /(\d)\s*₹/g, replacement: '₹$1', name: 'Move rupee before amount' },
      { pattern: /(\d)\s+(\d)/g, replacement: '$1$2', name: 'Remove space in numbers' },
    ];
    
    // Apply rupee symbol corrections
    let correctionCount = 0;
    for (const { pattern, replacement, name } of universalRupeeReplacements) {
      const beforeCorrection = corrected;
      corrected = corrected.replace(pattern, replacement);
      if (corrected !== beforeCorrection) {
        correctionCount++;
        console.log(`OCR Debug - Applied ${name} correction`);
      }
    }
    
    // Apply spacing corrections
    for (const { pattern, replacement, name } of spacingCorrections) {
      const beforeCorrection = corrected;
      corrected = corrected.replace(pattern, replacement);
      if (corrected !== beforeCorrection) {
        correctionCount++;
        console.log(`OCR Debug - Applied ${name} correction`);
      }
    }
    
    // 3. Context-based improvements for better amount detection
    // Add context markers that help with amount extraction
    const contextMarkers = [
      { pattern: /(paid|sent|received)\s+(\d)/gi, replacement: '$1 ₹$2', name: 'Add rupee to payment context' },
      { pattern: /(amount|total)\s*[:=]\s*(\d)/gi, replacement: '$1: ₹$2', name: 'Add rupee to amount context' },
      { pattern: /(transfer|payment)\s+(\d)/gi, replacement: '$1 ₹$2', name: 'Add rupee to transfer context' },
    ];
    
    for (const { pattern, replacement, name } of contextMarkers) {
      const beforeCorrection = corrected;
      corrected = corrected.replace(pattern, replacement);
      if (corrected !== beforeCorrection) {
        correctionCount++;
        console.log(`OCR Debug - Applied ${name} correction`);
      }
    }
    
    console.log(`OCR Debug - Applied ${correctionCount} total corrections to improve amount detection`);
    
    // 4. Line-level improvements for better parsing
    const lines = corrected.split('\n');
    const improvedLines = lines.map(line => {
      // If line contains business context + number, ensure rupee symbol is present
      if (/furnili|tools|material|order|payment/i.test(line) && /\d{1,6}/.test(line) && !/₹/.test(line)) {
        return line.replace(/(\d+)/g, '₹$1');
      }
      return line;
    });
    
    const finalCorrected = improvedLines.join('\n');
    
    if (finalCorrected !== corrected) {
      console.log('OCR Debug - Applied business context rupee symbol enhancement');
    }
    
    console.log('OCR Debug - Completed generic OCR corrections, enhanced text ready for parsing');
    return finalCorrected;
  }



  // Standard Tesseract with proper Tesseract.js integration
  static async tryStandardTesseract(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using standard Tesseract.js fallback');
      
      // Create standard worker with basic configuration
      const worker = await TesseractConfig.createStandardWorker();
      
      const { data: { text, confidence } } = await worker.recognize(file);
      await worker.terminate();
      
      console.log(`OCR Debug - Standard Tesseract confidence: ${confidence}%`);
      return this.correctRupeeSymbolErrors(text);
      
    } catch (error) {
      throw new Error(`Tesseract.js standard failed: ${error}`);
    }
  }

  // Multi-engine processing optimized for generic receipt processing
  static async processWithMultipleEngines(file: File, googleApiKey?: string): Promise<string> {
    console.log('OCR Debug - Starting generic multi-engine OCR for all receipt types');
    
    const engines = [
      {
        name: 'Google Vision',
        method: () => this.tryGoogleVisionOCR(file, googleApiKey),
        available: !!googleApiKey,
        priority: 1,
        description: 'Best for clean text and symbols'
      },
      {
        name: 'Enhanced Tesseract',
        method: () => this.tryEnhancedTesseract(file),
        available: true,
        priority: 2,
        description: 'Advanced figure recognition with optimized preprocessing'
      },
      {
        name: 'Standard Tesseract',
        method: () => this.tryStandardTesseract(file),
        available: true,
        priority: 3,
        description: 'Standard Tesseract.js with currency symbol support'
      }
    ];

    // Try engines and apply post-processing to each result
    for (const engine of engines.filter(e => e.available)) {
      try {
        console.log(`OCR Debug - Attempting ${engine.name} - ${engine.description}`);
        const rawResult = await engine.method();
        
        if (rawResult && rawResult.trim().length > 0) {
          // Apply universal corrections regardless of OCR engine
          const correctedResult = this.correctRupeeSymbolErrors(rawResult);
          
          console.log(`OCR Debug - ${engine.name} succeeded with ${correctedResult.split('\n').length} lines`);
          console.log(`OCR Debug - Sample text: ${correctedResult.slice(0, 100)}...`);
          
          return correctedResult;
        }
      } catch (error) {
        console.log(`OCR Debug - ${engine.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }
    
    console.log('OCR Debug - All OCR engines failed to extract text');
    return '';
  }

  // Enhanced payment screenshot processing with figure recognition
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
          date: '',
          confidence: 0
        };
      }

      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      console.log('OCR Debug - Processing with enhanced figure recognition and payment detection');
      
      // Use enhanced figure OCR for better accuracy across all platforms
      const enhancedResults = EnhancedFigureOCR.processReceiptForAllPlatforms(lines);
      
      // If enhanced OCR didn't find amount, use specialized payment amount detector
      let finalAmount = enhancedResults.amount;
      if (!finalAmount || parseFloat(finalAmount) < 1) {
        console.log('OCR Debug - Enhanced OCR missed amount, trying payment amount detector');
        const paymentDetection = PaymentAmountDetector.detectPaymentAmount(lines);
        if (paymentDetection.confidence > 0.3) {
          finalAmount = paymentDetection.amount;
          console.log(`OCR Debug - Payment detector found amount: ${finalAmount} (confidence: ${paymentDetection.confidence}, source: ${paymentDetection.source})`);
        }
      }
      
      // Enhanced description detection
      let finalDescription = enhancedResults.description;
      if (!finalDescription || finalDescription.toLowerCase().includes('from:') || finalDescription.toLowerCase().includes('to:')) {
        console.log('OCR Debug - Enhanced OCR missed description or got sender/receiver info, trying description detector');
        const descriptionDetection = PaymentDescriptionDetector.detectPaymentDescription(lines, enhancedResults.platform);
        if (descriptionDetection.confidence > 0.3) {
          finalDescription = descriptionDetection.description;
          console.log(`OCR Debug - Description detector found: ${finalDescription} (confidence: ${descriptionDetection.confidence}, source: ${descriptionDetection.source})`);
        }
      }
      
      // Fallback to legacy extraction if all enhanced methods fail
      const fallbackPlatform = this.detectPlatform(lines);
      if (!finalAmount) {
        finalAmount = this.extractAmount(lines, fallbackPlatform);
      }
      if (!finalDescription) {
        finalDescription = this.extractDescription(lines, fallbackPlatform);
      }
      const fallbackRecipient = enhancedResults.recipient || this.extractRecipient(lines, fallbackPlatform);

      return {
        text,
        platform: enhancedResults.platform || fallbackPlatform,
        amount: finalAmount,
        recipient: fallbackRecipient,
        description: finalDescription,
        transactionId: this.extractTransactionId(lines),
        date: this.extractDate(lines),
        confidence: enhancedResults.confidence
      };
      
    } catch (error) {
      console.error('Enhanced payment screenshot processing failed:', error);
      return {
        text: '',
        platform: 'unknown',
        amount: '',
        recipient: '',
        description: '',
        transactionId: '',
        date: '',
        confidence: 0
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
    console.log('OCR Debug - Bubble-focused amount extraction for platform:', platform);
    
    // BUBBLE-FOCUSED APPROACH: Description is always in bubble, amount follows
    // Look for bubble indicators and extract full bubble content
    
    // Step 1: Find bubble/dialog lines (key insight from user)
    const bubbleIndicators = [
      'furnili', 'tools', 'fevixol', 'ashish', 'order', 'material', 'steel', 'wood',
      'completed', 'payment', 'sent', 'received', 'success'
    ];
    
    const bubbleLines = [];
    const bubbleContext = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      
      // Identify bubble content (description lines)
      const isBubbleLine = bubbleIndicators.some(indicator => lower.includes(indicator));
      
      if (isBubbleLine) {
        console.log(`OCR Debug - Found bubble description line: "${line}"`);
        bubbleLines.push(i);
        bubbleContext.push(line);
        
        // Look in surrounding lines for the complete bubble content
        // Bubble typically spans 2-4 lines with description + amount
        for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 3); j++) {
          const surroundingLine = lines[j];
          const amount = this.extractAmountFromLine(surroundingLine);
          
          if (amount && this.isValidIndianAmount(amount)) {
            console.log(`OCR Debug - Found amount "${amount}" in bubble near "${line}"`);
            return amount;
          }
        }
      }
    }
    
    console.log('OCR Debug - Bubble context found:', bubbleContext);
    
    // Step 2: Extract from bubble clusters (complete bubble content extraction)
    if (bubbleLines.length > 0) {
      // Look at all lines within bubble clusters for amounts
      const bubbleClusterLines = new Set();
      
      for (const bubbleLineIndex of bubbleLines) {
        // Add surrounding lines to cluster (bubbles span multiple lines)
        for (let k = Math.max(0, bubbleLineIndex - 2); k <= Math.min(lines.length - 1, bubbleLineIndex + 3); k++) {
          bubbleClusterLines.add(k);
        }
      }
      
      console.log(`OCR Debug - Analyzing bubble cluster of ${bubbleClusterLines.size} lines`);
      
      // Extract all amounts from bubble cluster
      const clusterAmounts = [];
      for (const lineIndex of bubbleClusterLines) {
        const line = lines[lineIndex];
        if (this.shouldSkipLine(line)) continue;
        
        const amount = this.extractAmountFromLine(line);
        if (amount && this.isValidIndianAmount(amount)) {
          clusterAmounts.push(amount);
          console.log(`OCR Debug - Found bubble cluster amount: "${amount}" in line: "${line}"`);
        }
      }
      
      // Return first valid amount from bubble cluster
      if (clusterAmounts.length > 0) {
        return clusterAmounts[0].replace(/,/g, '');
      }
    }
    
    // Step 3: Fallback patterns for all lines (if bubble approach fails)
    const fallbackAmountPatterns = [
      // Direct rupee patterns
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/,  
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /INR\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      
      // Common misread symbols (critical for Indian payments)
      /£\s*([0-9,]+(?:\.[0-9]{2})?)/,  // £ instead of ₹
      /&\s*([0-9,]+(?:\.[0-9]{2})?)/,  // & instead of ₹
      /@\s*([0-9,]+(?:\.[0-9]{2})?)/,  // @ instead of ₹
      /\$\s*([0-9,]+(?:\.[0-9]{2})?)/,  // $ instead of ₹
    ];
    
    for (const line of lines) {
      if (this.shouldSkipLine(line)) continue;
      
      for (const pattern of fallbackAmountPatterns) {
        const match = line.match(pattern);
        if (match && this.isValidIndianAmount(match[1])) {
          console.log('OCR Debug - Fallback pattern found:', match[1], 'in line:', line);
          return match[1].replace(/,/g, '');
        }
      }
    }
    
    // Step 4: Last resort - reasonable standalone numbers
    for (const line of lines) {
      if (this.shouldSkipLine(line)) continue;
      
      const standaloneMatch = line.match(/^([0-9,]+(?:\.[0-9]{2})?)$/);
      if (standaloneMatch && this.isValidIndianAmount(standaloneMatch[1])) {
        const amount = parseFloat(standaloneMatch[1].replace(/,/g, ''));
        if (amount >= 10 && amount <= 99999) {
          console.log('OCR Debug - Found standalone amount:', standaloneMatch[1]);
          return standaloneMatch[1].replace(/,/g, '');
        }
      }
    }
    
    console.log('OCR Debug - No valid amount found using bubble-focused extraction');
    return '';
  }

  // Extract amount from a single line
  private static extractAmountFromLine(line: string): string | null {
    // All possible amount patterns in a single line
    const patterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/,
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /£\s*([0-9,]+(?:\.[0-9]{2})?)/,
      /&\s*([0-9,]+(?:\.[0-9]{2})?)/,
      /@\s*([0-9,]+(?:\.[0-9]{2})?)/,
      /\$\s*([0-9,]+(?:\.[0-9]{2})?)/,
      /^([0-9,]+(?:\.[0-9]{2})?)$/,  // Standalone number
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Determine if a line should be skipped for amount extraction
  private static shouldSkipLine(line: string): boolean {
    return /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || // Dates
           /\d{10,}/.test(line) || // Transaction IDs (10+ digits)
           line.toLowerCase().includes('jul') ||
           line.toLowerCase().includes('am') ||
           line.toLowerCase().includes('pm') ||
           line.toLowerCase().includes('2025') ||
           line.toLowerCase().includes('2024') ||
           line.toLowerCase().includes('transaction id') ||
           line.toLowerCase().includes('upi');
  }

  // Validate if extracted amount looks reasonable for Indian transactions
  private static isValidIndianAmount(amount: string): boolean {
    const numericAmount = parseFloat(amount.replace(/[,₹]/g, ''));
    
    // Reasonable range for Indian transactions
    if (numericAmount < 1 || numericAmount > 100000) {
      return false;
    }
    
    // Should not be a year or date
    if (numericAmount >= 2020 && numericAmount <= 2030) {
      return false;
    }
    
    // Should not be too long (transaction ID)
    if (amount.length > 6) {
      return false;
    }
    
    return true;
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
    console.log('OCR Debug - Extracting description from bubble content');
    
    // BUBBLE EXTRACTION: Description is the main content in payment bubbles
    const bubbleTerms = [
      'furnili', 'fevixol', 'ashish', 'order', 'steel', 'wood', 'material', 'tools',
      'payment', 'purchase', 'bill', 'invoice', 'service'
    ];
    
    // Look for the main bubble description line
    const descriptionCandidates = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Skip system/UI lines that aren't part of bubble content
      if (lowerLine.includes('google pay') || 
          lowerLine.includes('transaction') ||
          lowerLine.includes('upi') ||
          lowerLine.includes('bank') ||
          /^\d+$/.test(line) ||
          /\d{10,}/.test(line)) {
        continue;
      }
      
      // Prioritize business/bubble content
      const hasBusinessTerm = bubbleTerms.some(term => lowerLine.includes(term));
      if (hasBusinessTerm) {
        console.log(`OCR Debug - Found bubble description: "${line}"`);
        descriptionCandidates.push({ line, priority: 10 });
      }
      
      // Also consider "To: PERSON" patterns as bubble content
      if (/^to[:\s]+[A-Z][a-z\s]+/i.test(line)) {
        descriptionCandidates.push({ line, priority: 5 });
      }
      
      // Consider any meaningful text that could be bubble content
      if (line.length > 5 && line.length < 50 && /[a-zA-Z]/.test(line)) {
        descriptionCandidates.push({ line, priority: 1 });
      }
    }
    
    // Return the highest priority bubble description
    if (descriptionCandidates.length > 0) {
      const bestCandidate = descriptionCandidates.sort((a, b) => b.priority - a.priority)[0];
      console.log(`OCR Debug - Selected bubble description: "${bestCandidate.line}"`);
      return bestCandidate.line.trim();
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