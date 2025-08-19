// Enhanced OCR specifically designed for rupee symbol recognition in Indian payment screenshots
// Based on research from tesseract-ocr-enhanced approaches for currency symbols

export class RupeeOCREnhancer {
  
  // Enhanced Tesseract configuration specifically for Indian payment apps
  static getEnhancedTesseractConfig() {
    return {
      // Character whitelist optimized for Indian payment screenshots
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@.-/:(),',
      
      // Page segmentation mode for payment app UI elements
      tessedit_pageseg_mode: '6', // Uniform block of text (best for payment apps)
      
      // OCR engine mode - LSTM for better symbol recognition
      tessedit_ocr_engine_mode: '1', // LSTM OCR engine mode
      
      // Preserve spacing for proper amount parsing
      preserve_interword_spaces: '1',
      
      // Enhanced settings for currency symbol recognition
      user_defined_dpi: '300', // Higher DPI for crisp symbol recognition
      
      // Character confidence settings
      tessedit_char_blacklist: '', // Allow all characters, especially currency symbols
      
      // Text recognition improvements
      textord_really_old_xheight: '1', // Better handling of symbol heights
      
      // Processing optimizations
      tessedit_write_images: '0', // Faster processing
      debug_file: '/dev/null', // Suppress debug output
      
      // Additional currency-specific enhancements
      classify_enable_learning: '1', // Enable character learning
      classify_enable_adaptive_matcher: '1', // Adaptive character matching
      
      // Language model improvements
      language_model_penalty_non_freq_dict_word: '0.1', // Allow currency symbols
      language_model_penalty_non_dict_word: '0.1', // Reduce penalty for symbols
      
      // Numeric recognition enhancement
      classify_num_cp_levels: '3', // Better number recognition
      textord_noise_rejection: '0', // Don't reject symbol-like characters
    };
  }

  // Pre-process image for better rupee symbol recognition
  static async preprocessImageForRupeeRecognition(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Enhance contrast specifically for rupee symbols
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Enhance contrast for dark text (rupee symbols) on light backgrounds
      if (luminance > 128) {
        // Make light areas lighter
        data[i] = Math.min(255, r * 1.2);
        data[i + 1] = Math.min(255, g * 1.2);
        data[i + 2] = Math.min(255, b * 1.2);
      } else {
        // Make dark areas darker (better for symbols)
        data[i] = Math.max(0, r * 0.8);
        data[i + 1] = Math.max(0, g * 0.8);
        data[i + 2] = Math.max(0, b * 0.8);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Convert file to canvas for preprocessing
  static async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
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

  // Enhanced OCR with rupee-specific preprocessing and post-processing
  static async performEnhancedRupeeOCR(file: File): Promise<string> {
    try {
      console.log('OCR Debug - Starting enhanced rupee symbol OCR');
      
      if (!(window as any).Tesseract) {
        throw new Error('Tesseract.js not available');
      }

      // Preprocess image for better rupee symbol recognition
      const canvas = await this.fileToCanvas(file);
      const enhancedCanvas = await this.preprocessImageForRupeeRecognition(canvas);
      
      // Convert enhanced canvas back to blob
      const enhancedBlob = await new Promise<Blob>((resolve) => {
        enhancedCanvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const worker = await (window as any).Tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Apply enhanced configuration
      const config = this.getEnhancedTesseractConfig();
      await worker.setParameters(config);
      
      console.log('OCR Debug - Applied enhanced rupee symbol configuration');
      
      // Perform OCR on enhanced image
      const { data: { text, confidence } } = await worker.recognize(enhancedBlob);
      await worker.terminate();
      
      console.log(`OCR Debug - Enhanced rupee OCR confidence: ${confidence}%`);
      
      // Post-process to fix common rupee symbol misrecognitions
      const correctedText = this.correctRupeeSymbolErrors(text);
      
      return correctedText;
      
    } catch (error) {
      throw new Error(`Enhanced rupee OCR failed: ${error}`);
    }
  }

  // Comprehensive post-processing for rupee symbol corrections
  static correctRupeeSymbolErrors(text: string): string {
    let corrected = text;
    
    console.log('OCR Debug - Original text before rupee corrections:', text.slice(0, 200));
    
    // Common misrecognitions of rupee symbol (₹)
    const rupeeReplacements = [
      // Most common misreads
      { pattern: /£(\d)/g, replacement: '₹$1' },           // £500 -> ₹500
      { pattern: /&(\d)/g, replacement: '₹$1' },           // &500 -> ₹500
      { pattern: /¢(\d)/g, replacement: '₹$1' },           // ¢500 -> ₹500
      { pattern: /@(\d)/g, replacement: '₹$1' },           // @500 -> ₹500
      { pattern: /\$(\d)/g, replacement: '₹$1' },          // $500 -> ₹500
      { pattern: /€(\d)/g, replacement: '₹$1' },           // €500 -> ₹500
      
      // Text-based formats
      { pattern: /Rs\.?\s*(\d)/gi, replacement: '₹$1' },   // Rs 500 -> ₹500
      { pattern: /INR\s*(\d)/gi, replacement: '₹$1' },     // INR 500 -> ₹500
      { pattern: /Rupees?\s*(\d)/gi, replacement: '₹$1' }, // Rupees 500 -> ₹500
      
      // OCR spacing errors
      { pattern: /₹\s+(\d)/g, replacement: '₹$1' },        // ₹ 500 -> ₹500
      { pattern: /(\d)\s*₹/g, replacement: '$1₹' },        // 500 ₹ -> 500₹
      
      // Pattern-based corrections for common GPay/PhonePe layouts
      { pattern: /(\d+)\s*Rs/gi, replacement: '₹$1' },     // 500 Rs -> ₹500
      { pattern: /Amount[:\s]*(\d)/gi, replacement: 'Amount: ₹$1' }, // Amount 500 -> Amount: ₹500
      { pattern: /Paid[:\s]*(\d)/gi, replacement: 'Paid: ₹$1' },    // Paid 500 -> Paid: ₹500
      { pattern: /Sent[:\s]*(\d)/gi, replacement: 'Sent: ₹$1' },    // Sent 500 -> Sent: ₹500
    ];
    
    // Apply all rupee symbol corrections
    for (const { pattern, replacement } of rupeeReplacements) {
      const beforeCorrection = corrected;
      corrected = corrected.replace(pattern, replacement);
      if (corrected !== beforeCorrection) {
        console.log(`OCR Debug - Applied correction: ${pattern.toString()} -> found matches`);
      }
    }
    
    // Additional context-aware corrections for Indian payment apps
    corrected = this.applyContextAwareCorrections(corrected);
    
    console.log('OCR Debug - Text after rupee corrections:', corrected.slice(0, 200));
    
    return corrected;
  }

  // Context-aware corrections based on Indian payment app patterns
  private static applyContextAwareCorrections(text: string): string {
    let corrected = text;
    
    // If we detect Indian payment context, apply more aggressive corrections
    const isIndianPaymentContext = /google pay|gpay|phonepe|paytm|cred|upi/i.test(text);
    
    if (isIndianPaymentContext) {
      console.log('OCR Debug - Detected Indian payment context, applying aggressive corrections');
      
      // In Indian payment apps, standalone numbers near "to" or business names are likely amounts
      corrected = corrected.replace(/to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)/gi, 'to $1\n₹$2');
      
      // Common GPay pattern: "business name" followed by amount
      corrected = corrected.replace(/(furnili|fevixol|ashish|steel|wood)\s+(\d+)/gi, '$1\n₹$2');
      
      // PhonePe/Paytm patterns
      corrected = corrected.replace(/successfully\s+sent\s+(\d+)/gi, 'successfully sent ₹$1');
      corrected = corrected.replace(/payment\s+of\s+(\d+)/gi, 'payment of ₹$1');
    }
    
    return corrected;
  }

  // Validate if extracted amount looks reasonable for Indian transactions
  static isValidIndianAmount(amount: string): boolean {
    const numericAmount = parseFloat(amount.replace(/[,₹]/g, ''));
    
    // Reasonable range for Indian transactions (₹1 to ₹100,000)
    if (numericAmount < 1 || numericAmount > 100000) {
      return false;
    }
    
    // Should not be a year or date
    if (numericAmount >= 2020 && numericAmount <= 2030) {
      return false;
    }
    
    // Should not be a transaction ID (too many digits)
    if (amount.length > 6) {
      return false;
    }
    
    return true;
  }

  // Extract amounts with enhanced rupee symbol awareness
  static extractRupeeAmounts(text: string): string[] {
    const amountPatterns = [
      /₹\s*([0-9,]+(?:\.[0-9]{2})?)/g,                    // ₹500, ₹1,500.00
      /(?:amount|paid|sent|received)[:\s]*₹\s*([0-9,]+(?:\.[0-9]{2})?)/gi, // Amount: ₹500
      /Rs\.?\s*([0-9,]+(?:\.[0-9]{2})?)/gi,               // Rs 500, Rs. 1500
      /INR\s*([0-9,]+(?:\.[0-9]{2})?)/gi,                 // INR 500
    ];

    const amounts: string[] = [];
    
    for (const pattern of amountPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amount = match[1];
        if (this.isValidIndianAmount(amount)) {
          amounts.push(amount.replace(/,/g, ''));
        }
      }
    }
    
    return amounts;
  }
}