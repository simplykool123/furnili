// Enhanced payment description detection to find the actual payment purpose
// Avoids extracting sender/receiver info as description

export class PaymentDescriptionDetector {
  
  // Extract the actual payment purpose/description
  static detectPaymentDescription(lines: string[], platform: string): {
    description: string;
    confidence: number;
    source: string;
  } {
    console.log('OCR Debug - Enhanced payment description detection started');
    
    // Strategy 1: Look for standalone descriptive words (food, order, etc.)
    const purposeResult = this.detectStandalonePurpose(lines);
    if (purposeResult.confidence > 0.8) {
      return purposeResult;
    }
    
    // Strategy 2: Look for common payment categories
    const categoryResult = this.detectPaymentCategory(lines);
    if (categoryResult.confidence > 0.7) {
      return categoryResult;
    }
    
    // Strategy 3: Extract business/merchant context
    const businessResult = this.detectBusinessContext(lines);
    if (businessResult.confidence > 0.6) {
      return businessResult;
    }
    
    // Strategy 4: Get recipient name as description
    const recipientResult = this.detectRecipientAsDescription(lines);
    
    console.log('OCR Debug - Best description detection result:', recipientResult);
    return recipientResult;
  }
  
  // Strategy 1: Look for standalone descriptive purpose words
  private static detectStandalonePurpose(lines: string[]): {
    description: string;
    confidence: number;
    source: string;
  } {
    const purposeWords = [
      'food', 'lunch', 'dinner', 'breakfast', 'meal', 'snacks',
      'order', 'delivery', 'takeaway', 'restaurant',
      'fuel', 'petrol', 'diesel', 'gas',
      'transport', 'taxi', 'auto', 'bus', 'train',
      'medical', 'medicine', 'doctor', 'hospital',
      'groceries', 'shopping', 'market',
      'tools', 'materials', 'supplies', 'equipment',
      'repair', 'service', 'maintenance',
      'bill', 'payment', 'recharge', 'electricity',
      'office', 'stationery', 'printing'
    ];
    
    for (const line of lines) {
      const cleanLine = line.trim().toLowerCase();
      
      // Skip lines that are clearly not descriptions
      if (this.shouldSkipLine(line)) continue;
      
      // Look for exact purpose words
      for (const purpose of purposeWords) {
        if (cleanLine === purpose || cleanLine.includes(purpose)) {
          console.log(`OCR Debug - Found standalone purpose: ${line.trim()}`);
          return {
            description: line.trim(),
            confidence: 0.9,
            source: 'standalone_purpose'
          };
        }
      }
    }
    
    return { description: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 2: Detect common payment categories
  private static detectPaymentCategory(lines: string[]): {
    description: string;
    confidence: number;
    source: string;
  } {
    const categories = [
      { keywords: ['food', 'restaurant', 'meal', 'eat'], category: 'Food' },
      { keywords: ['fuel', 'petrol', 'diesel', 'gas'], category: 'Fuel' },
      { keywords: ['transport', 'taxi', 'auto', 'travel'], category: 'Transport' },
      { keywords: ['medical', 'medicine', 'doctor', 'health'], category: 'Medical' },
      { keywords: ['grocery', 'market', 'shopping'], category: 'Shopping' },
      { keywords: ['tools', 'materials', 'supplies', 'equipment'], category: 'Materials' },
      { keywords: ['office', 'stationery', 'print'], category: 'Office' }
    ];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (this.shouldSkipLine(line)) continue;
      
      for (const cat of categories) {
        if (cat.keywords.some(keyword => lowerLine.includes(keyword))) {
          console.log(`OCR Debug - Found category-based description: ${cat.category}`);
          return {
            description: cat.category,
            confidence: 0.75,
            source: 'payment_category'
          };
        }
      }
    }
    
    return { description: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 3: Extract business/merchant context
  private static detectBusinessContext(lines: string[]): {
    description: string;
    confidence: number;
    source: string;
  } {
    for (const line of lines) {
      const cleanLine = line.trim();
      
      if (this.shouldSkipLine(line)) continue;
      
      // Look for business-like names (not personal names)
      if (this.looksLikeBusinessName(cleanLine)) {
        console.log(`OCR Debug - Found business context: ${cleanLine}`);
        return {
          description: cleanLine,
          confidence: 0.7,
          source: 'business_context'
        };
      }
      
      // Look for service descriptions
      if (this.looksLikeServiceDescription(cleanLine)) {
        console.log(`OCR Debug - Found service description: ${cleanLine}`);
        return {
          description: cleanLine,
          confidence: 0.65,
          source: 'service_description'
        };
      }
    }
    
    return { description: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 4: Use recipient name as description (fallback)
  private static detectRecipientAsDescription(lines: string[]): {
    description: string;
    confidence: number;
    source: string;
  } {
    for (const line of lines) {
      const cleanLine = line.trim();
      
      if (this.shouldSkipLine(line)) continue;
      
      // Look for "To:" lines
      const toMatch = cleanLine.match(/^To:?\s*(.+)$/i);
      if (toMatch) {
        const recipient = toMatch[1].trim();
        console.log(`OCR Debug - Using recipient as description: ${recipient}`);
        return {
          description: recipient,
          confidence: 0.5,
          source: 'recipient_fallback'
        };
      }
      
      // Look for merchant/business names
      if (cleanLine.length > 5 && cleanLine.length < 50 && 
          /^[A-Z][A-Z\s]+$/.test(cleanLine)) {
        console.log(`OCR Debug - Using merchant name as description: ${cleanLine}`);
        return {
          description: cleanLine,
          confidence: 0.4,
          source: 'merchant_name'
        };
      }
    }
    
    // Final fallback - use first meaningful line
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 3 && !this.shouldSkipLine(line)) {
        console.log(`OCR Debug - Using first meaningful line: ${cleanLine}`);
        return {
          description: cleanLine,
          confidence: 0.3,
          source: 'first_meaningful'
        };
      }
    }
    
    return { description: 'Payment', confidence: 0.1, source: 'default' };
  }
  
  // Helper: Should skip this line for description extraction
  private static shouldSkipLine(line: string): boolean {
    const cleanLine = line.trim().toLowerCase();
    
    // Skip empty or very short lines
    if (cleanLine.length < 2) return true;
    
    // Skip transaction details
    const skipPatterns = [
      /\d{10,}/, // Long numbers (transaction IDs)
      /\d{2}\/\d{2}\/\d{4}/, // Dates
      /\d{1,2}:\d{2}/, // Times
      /pm|am/i, // Time indicators
      /transaction|id|reference|upi/i, // Transaction terms
      /from:|to:|google|pay|phonepe|paytm|cred/i, // Platform terms
      /bank|hdfc|icici|sbi/i, // Bank names
      /completed|success|failed/i, // Status terms
      /xxx+/i, // Masked numbers
      /^\d+$/, // Pure numbers
      /^[£$@€¥¢&₹]\d/, // Just currency + number
      /balance|account|card/i // Account terms
    ];
    
    return skipPatterns.some(pattern => pattern.test(cleanLine));
  }
  
  // Helper: Does this look like a business name
  private static looksLikeBusinessName(text: string): boolean {
    const businessIndicators = [
      'pvt', 'ltd', 'llc', 'inc', 'corp', 'restaurant', 'hotel',
      'store', 'shop', 'mart', 'center', 'services', 'solutions',
      'enterprises', 'traders', 'suppliers', 'caterers'
    ];
    
    const lowerText = text.toLowerCase();
    return businessIndicators.some(indicator => lowerText.includes(indicator)) ||
           (text.length > 8 && /^[A-Z][A-Z\s&]+$/.test(text));
  }
  
  // Helper: Does this look like a service description
  private static looksLikeServiceDescription(text: string): boolean {
    const serviceWords = [
      'delivery', 'service', 'repair', 'maintenance', 'installation',
      'consultation', 'booking', 'reservation', 'subscription'
    ];
    
    const lowerText = text.toLowerCase();
    return serviceWords.some(word => lowerText.includes(word)) &&
           text.length > 5 && text.length < 100;
  }
}