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

  // Enhanced Tesseract with advanced rupee sign recognition
  static async tryEnhancedTesseract(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Using advanced rupee symbol OCR with preprocessing');
      
      // Use specialized rupee OCR for better accuracy
      return await this.tryRupeeSpecializedOCR(file);
      
    } catch (error) {
      console.log('OCR Debug - Rupee specialized OCR failed, trying standard enhanced');
      return await this.tryStandardEnhancedTesseract(file);
    }
  }

  // Rupee-specialized OCR with image preprocessing
  private static async tryRupeeSpecializedOCR(file: File): Promise<string> {
    if (!(window as any).Tesseract) {
      throw new Error('Tesseract.js not available');
    }

    // Preprocess image for better rupee symbol recognition
    const canvas = await this.fileToCanvas(file);
    const enhancedCanvas = await this.preprocessImageForRupeeRecognition(canvas);
    
    // Convert enhanced canvas to blob
    const enhancedBlob = await new Promise<Blob>((resolve) => {
      enhancedCanvas.toBlob((blob) => resolve(blob!), 'image/png');
    });

    const worker = await (window as any).Tesseract.createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    // Apply rupee-optimized configuration
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@.-/:(),',
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
      tessedit_ocr_engine_mode: '1',
      tessedit_char_blacklist: '',
      textord_really_old_xheight: '1',
      tessedit_write_images: '0',
      classify_enable_learning: '1',
      classify_enable_adaptive_matcher: '1'
    });
    
    const { data: { text, confidence } } = await worker.recognize(enhancedBlob);
    await worker.terminate();
    
    console.log(`OCR Debug - Rupee-specialized OCR confidence: ${confidence}%`);
    return this.correctRupeeSymbolErrors(text);
  }

  // Standard enhanced Tesseract fallback
  private static async tryStandardEnhancedTesseract(file: File): Promise<string> {
    if (!(window as any).Tesseract) {
      throw new Error('Tesseract.js not available');
    }

    const worker = await (window as any).Tesseract.createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@.-/:(),',
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
      tessedit_ocr_engine_mode: '1'
    });
    
    const { data: { text, confidence } } = await worker.recognize(file);
    await worker.terminate();
    
    console.log(`OCR Debug - Standard enhanced confidence: ${confidence}%`);
    return this.correctRupeeSymbolErrors(text);
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
        name: 'Rupee-Enhanced Tesseract',
        method: () => this.tryEnhancedTesseract(file),
        available: true,
        priority: 2,
        description: 'Optimized for Indian payment screenshots'
      },
      {
        name: 'Standard Tesseract',
        method: () => this.tryStandardTesseract(file),
        available: true,
        priority: 3,
        description: 'Reliable fallback for all text'
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
    console.log('OCR Debug - Generic amount extraction for platform:', platform);
    
    // GENERIC APPROACH: Look for patterns where description is followed by amount
    // This works for all payment apps: "Description + Rupee Symbol + Amount"
    
    // Step 1: Find business/transaction context lines
    const contextLines = lines.filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('furnili') || 
             lower.includes('tools') ||
             lower.includes('completed') ||
             lower.includes('payment') ||
             lower.includes('sent') ||
             lower.includes('received') ||
             /to\s+[A-Z][a-z]+/i.test(line); // "To PERSON NAME" pattern
    });
    
    console.log('OCR Debug - Context lines found:', contextLines);
    
    // Step 2: Look for amounts near context lines
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const isContextLine = contextLines.some(ctx => ctx === currentLine);
      
      if (isContextLine) {
        // Check next 3 lines and previous 2 lines for amounts
        for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 3); j++) {
          if (j === i) continue; // Skip the context line itself
          
          const checkLine = lines[j];
          const amount = this.extractAmountFromLine(checkLine);
          
          if (amount && this.isValidIndianAmount(amount)) {
            console.log(`OCR Debug - Found amount "${amount}" near context line "${currentLine}"`);
            return amount;
          }
        }
      }
    }
    
    // Step 3: Enhanced patterns for all payment apps
    const genericAmountPatterns = [
      // Direct rupee patterns
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/,  
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /INR\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      
      // Common misread symbols
      /£\s*([0-9,]+(?:\.[0-9]{2})?)/,  // £ instead of ₹
      /&\s*([0-9,]+(?:\.[0-9]{2})?)/,  // & instead of ₹
      /@\s*([0-9,]+(?:\.[0-9]{2})?)/,  // @ instead of ₹
      /\$\s*([0-9,]+(?:\.[0-9]{2})?)/,  // $ instead of ₹
      
      // Context-based patterns
      /(?:amount|paid|sent|received|total)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /(?:payment\s+of|sent)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/gi,
    ];
    
    // Step 4: Apply patterns to all lines
    for (const line of lines) {
      // Skip obvious non-amount lines
      if (this.shouldSkipLine(line)) continue;
      
      for (const pattern of genericAmountPatterns) {
        const match = line.match(pattern);
        if (match && this.isValidIndianAmount(match[1])) {
          console.log('OCR Debug - Pattern match found:', match[1], 'in line:', line);
          return match[1].replace(/,/g, '');
        }
      }
    }
    
    // Step 5: Look for reasonable standalone numbers as last resort
    for (const line of lines) {
      if (this.shouldSkipLine(line)) continue;
      
      const standaloneMatch = line.match(/^([0-9,]+(?:\.[0-9]{2})?)$/);
      if (standaloneMatch && this.isValidIndianAmount(standaloneMatch[1])) {
        const amount = parseFloat(standaloneMatch[1].replace(/,/g, ''));
        if (amount >= 10 && amount <= 99999) { // Reasonable transaction range
          console.log('OCR Debug - Found standalone amount:', standaloneMatch[1]);
          return standaloneMatch[1].replace(/,/g, '');
        }
      }
    }
    
    console.log('OCR Debug - No valid amount found in any extraction method');
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