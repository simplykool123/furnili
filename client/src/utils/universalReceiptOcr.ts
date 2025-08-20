// Universal Receipt OCR - Comprehensive system for all receipt types
// Handles GPay, PhonePe, Paytm, CRED, Bank transfers, and all Indian payment platforms

export class UniversalReceiptOCR {
  
  // Comprehensive amount detection for all receipt formats
  static detectUniversalAmount(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
    rawMatch: string;
  } {
    console.log('=== UNIVERSAL OCR AMOUNT DETECTION DEBUG ===');
    console.log('Universal OCR - Starting comprehensive amount detection');
    console.log('Universal OCR - Total lines detected:', lines.length);
    console.log('Universal OCR - All detected lines:');
    lines.forEach((line, index) => {
      console.log(`  Line ${index + 1}: "${line}"`);
    });
    
    // Strategy 1: Look for ALL standalone numbers first and rank them
    const allAmountCandidates = this.findAllAmountCandidates(lines);
    console.log('Universal OCR - All amount candidates found:', allAmountCandidates);
    
    if (allAmountCandidates.length > 0) {
      // Return the highest confidence candidate
      const bestCandidate = allAmountCandidates[0];
      console.log('Universal OCR - Selected best candidate:', bestCandidate);
      return bestCandidate;
    }
    
    // Fallback: Legacy detection strategies
    const contextAmountResult = this.detectContextAwareAmounts(lines);
    console.log('Universal OCR - Fallback result:', contextAmountResult);
    return contextAmountResult;
  }
  
  // Strategy 1: Large standalone amounts in prominent display
  private static detectLargeAmounts(lines: string[]): {
    amount: string; confidence: number; source: string; rawMatch: string;
  } {
    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Match standalone large amounts with various formats - PRIORITIZE 3-DIGIT NUMBERS
      const patterns = [
        /^[\s₹£$@€¥¢&]*(\d{3}(?:\.\d{2})?)[\s]*$/,  // ₹672 (3-digit priority)
        /^[\s₹£$@€¥¢&]*(\d{1,6}(?:\.\d{2})?)[\s]*$/,  // ₹1234
        /^[\s₹£$@€¥¢&]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[\s]*$/, // ₹1,234.56
        /^(\d{3}(?:\.\d{2})?)[\s₹£$@€¥¢&]*$/,  // 672₹ (3-digit priority)
        /^(\d{1,6}(?:\.\d{2})?)[\s₹£$@€¥¢&]*$/,  // 1234₹
        /^(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[\s₹£$@€¥¢&]*$/ // 1,234.56₹
      ];
      
      for (const pattern of patterns) {
        const match = cleanLine.match(pattern);
        if (match) {
          const rawAmount = match[1];
          const cleanAmount = rawAmount.replace(/,/g, '');
          const numValue = parseFloat(cleanAmount);
          
          if (this.isValidPaymentAmount(numValue)) {
            // Prioritize 3-digit amounts as they're most likely to be correct payment amounts
            const confidence = rawAmount.replace(/,/g, '').length === 3 ? 0.95 : 0.9;
            console.log(`Universal OCR - Large amount found: ${rawAmount} (confidence: ${confidence})`);
            return {
              amount: cleanAmount,
              confidence: confidence,
              source: 'large_standalone',
              rawMatch: line
            };
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 2: Comma-separated amounts (₹12,345.67)
  private static detectCommaSeparatedAmounts(lines: string[]): {
    amount: string; confidence: number; source: string; rawMatch: string;
  } {
    for (const line of lines) {
      // Enhanced comma patterns for Indian number format
      const commaPatterns = [
        /[₹£$@€¥¢&]\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/g, // ₹12,345.67
        /(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)\s*[₹£$@€¥¢&]/g, // 12,345.67₹
        /Rs\.?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/gi, // Rs. 12,345
        /INR\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/gi, // INR 12,345
        /(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/g // Standalone comma numbers
      ];
      
      for (const pattern of commaPatterns) {
        const matches = Array.from(line.matchAll(pattern));
        for (const match of matches) {
          const rawAmount = match[1];
          const cleanAmount = rawAmount.replace(/,/g, '');
          const numValue = parseFloat(cleanAmount);
          
          if (this.isValidPaymentAmount(numValue)) {
            // Higher confidence if explicit currency symbol
            const confidence = /[₹£$@€¥¢&]|Rs\.?|INR/i.test(line) ? 0.85 : 0.8;
            
            console.log(`Universal OCR - Comma amount found: ${rawAmount}`);
            return {
              amount: cleanAmount,
              confidence,
              source: 'comma_separated',
              rawMatch: line
            };
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 3: Currency symbol prefixed amounts
  private static detectCurrencyPrefixedAmounts(lines: string[]): {
    amount: string; confidence: number; source: string; rawMatch: string;
  } {
    for (const line of lines) {
      // Comprehensive currency symbol patterns
      const currencyPatterns = [
        /[₹]\s*(\d{1,6}(?:\.\d{2})?)/g,
        /[£$@€¥¢&]\s*(\d{1,6}(?:\.\d{2})?)/g,
        /Rs\.?\s*(\d{1,6}(?:\.\d{2})?)/gi,
        /INR\s*(\d{1,6}(?:\.\d{2})?)/gi,
        /Rupees?\s*(\d{1,6}(?:\.\d{2})?)/gi
      ];
      
      for (const pattern of currencyPatterns) {
        const matches = Array.from(line.matchAll(pattern));
        for (const match of matches) {
          const amount = match[1];
          const numValue = parseFloat(amount);
          
          if (this.isValidPaymentAmount(numValue)) {
            console.log(`Universal OCR - Currency prefixed amount: ${amount}`);
            return {
              amount,
              confidence: 0.8,
              source: 'currency_prefixed',
              rawMatch: line
            };
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 4: Bubble-context amounts (near payment descriptions)
  private static detectBubbleContextAmounts(lines: string[]): {
    amount: string; confidence: number; source: string; rawMatch: string;
  } {
    const bubbleKeywords = [
      'paid', 'sent', 'received', 'transferred', 'payment', 'transaction',
      'food', 'fuel', 'order', 'bill', 'amount', 'total', 'cost', 'price',
      'to:', 'from:', 'google pay', 'phonepe', 'paytm', 'cred'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Check if line contains bubble keywords
      const hasBubbleKeyword = bubbleKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasBubbleKeyword) {
        // Look for amounts in this line and adjacent lines
        const searchLines = [
          lines[i - 1],
          lines[i],
          lines[i + 1]
        ].filter(l => l);
        
        for (const searchLine of searchLines) {
          if (!searchLine) continue;
          
          const amountPatterns = [
            /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
            /[₹£$@€¥¢&]\s*(\d{1,6}(?:\.\d{2})?)/g,
            /(\d{1,6}(?:\.\d{2})?)\s*[₹£$@€¥¢&]/g
          ];
          
          for (const pattern of amountPatterns) {
            const matches = Array.from(searchLine.matchAll(pattern));
            for (const match of matches) {
              const rawAmount = match[1];
              const cleanAmount = rawAmount.replace(/,/g, '');
              const numValue = parseFloat(cleanAmount);
              
              if (this.isValidPaymentAmount(numValue)) {
                console.log(`Universal OCR - Bubble context amount: ${rawAmount}`);
                return {
                  amount: cleanAmount,
                  confidence: 0.75,
                  source: 'bubble_context',
                  rawMatch: searchLine
                };
              }
            }
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 5: Pattern-based detection with enhanced patterns
  private static detectPatternBasedAmounts(lines: string[]): {
    amount: string; confidence: number; source: string; rawMatch: string;
  } {
    const enhancedPatterns = [
      { pattern: /amount[:\s]+[₹£$@€¥¢&]*\s*(\d{1,6}(?:\.\d{2})?)/gi, confidence: 0.7 },
      { pattern: /total[:\s]+[₹£$@€¥¢&]*\s*(\d{1,6}(?:\.\d{2})?)/gi, confidence: 0.7 },
      { pattern: /paid[:\s]+[₹£$@€¥¢&]*\s*(\d{1,6}(?:\.\d{2})?)/gi, confidence: 0.7 },
      { pattern: /sent[:\s]+[₹£$@€¥¢&]*\s*(\d{1,6}(?:\.\d{2})?)/gi, confidence: 0.65 },
      { pattern: /bill[:\s]+[₹£$@€¥¢&]*\s*(\d{1,6}(?:\.\d{2})?)/gi, confidence: 0.65 },
      { pattern: /[₹£$@€¥¢&]\s*(\d{1,6}(?:\.\d{2})?)\s*(?:paid|sent|transferred)/gi, confidence: 0.65 }
    ];
    
    for (const line of lines) {
      for (const { pattern, confidence } of enhancedPatterns) {
        const matches = Array.from(line.matchAll(pattern));
        for (const match of matches) {
          const amount = match[1];
          const numValue = parseFloat(amount);
          
          if (this.isValidPaymentAmount(numValue)) {
            console.log(`Universal OCR - Pattern-based amount: ${amount}`);
            return {
              amount,
              confidence,
              source: 'pattern_based',
              rawMatch: line
            };
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 6: Context-aware detection (last resort)
  private static detectContextAwareAmounts(lines: string[]): {
    amount: string; confidence: number; source: string; rawMatch: string;
  } {
    const candidates: Array<{amount: string; confidence: number; line: string}> = [];
    
    for (const line of lines) {
      if (this.shouldSkipLineForAmount(line)) continue;
      
      // Find all numbers in reasonable range
      const numberMatches = line.match(/\d{1,6}(?:\.\d{2})?/g) || [];
      
      for (const numberStr of numberMatches) {
        const numValue = parseFloat(numberStr);
        
        if (this.isValidPaymentAmount(numValue)) {
          let confidence = 0.3;
          
          // Boost confidence based on context
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('food') || lowerLine.includes('order')) confidence += 0.2;
          if (lowerLine.includes('paid') || lowerLine.includes('sent')) confidence += 0.15;
          if (numValue >= 10 && numValue <= 5000) confidence += 0.1; // Common payment range
          if (numValue % 5 === 0 || numValue % 10 === 0) confidence += 0.05; // Round amounts
          
          candidates.push({ amount: numberStr, confidence, line });
        }
      }
    }
    
    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => b.confidence - a.confidence)[0];
      console.log(`Universal OCR - Context-aware amount: ${best.amount} (confidence: ${best.confidence})`);
      return {
        amount: best.amount,
        confidence: best.confidence,
        source: 'context_aware',
        rawMatch: best.line
      };
    }
    
    return { amount: '', confidence: 0.1, source: 'fallback', rawMatch: 'No amount detected' };
  }
  
  // Enhanced bubble-focused description detection
  static detectBubbleDescription(lines: string[]): {
    description: string;
    confidence: number;
    source: string;
    rawMatch: string;
  } {
    console.log('Universal OCR - Starting bubble-focused description detection');
    
    // Strategy 1: Short descriptive words (food, fuel, etc.)
    const shortDescResult = this.detectShortDescriptiveWords(lines);
    if (shortDescResult.confidence > 0.8) return shortDescResult;
    
    // Strategy 2: Business/merchant names in bubbles
    const merchantResult = this.detectMerchantInBubble(lines);
    if (merchantResult.confidence > 0.7) return merchantResult;
    
    // Strategy 3: Purpose near payment keywords
    const purposeResult = this.detectPurposeNearPayment(lines);
    if (purposeResult.confidence > 0.6) return purposeResult;
    
    // Strategy 4: Extract from payment bubble context
    const bubbleResult = this.extractFromPaymentBubble(lines);
    
    console.log('Universal OCR - Best description result:', bubbleResult);
    return bubbleResult;
  }
  
  // Strategy 1: Short descriptive words (highest priority)
  private static detectShortDescriptiveWords(lines: string[]): {
    description: string; confidence: number; source: string; rawMatch: string;
  } {
    const descriptiveWords = [
      // Food & Dining
      'food', 'lunch', 'dinner', 'breakfast', 'meal', 'snacks', 'tea', 'coffee',
      'restaurant', 'hotel', 'cafe', 'canteen', 'dhaba', 'sweets',
      
      // Transport
      'fuel', 'petrol', 'diesel', 'gas', 'transport', 'taxi', 'auto', 'uber', 'ola',
      'bus', 'train', 'metro', 'parking', 'toll',
      
      // Shopping & Services
      'groceries', 'shopping', 'market', 'medicine', 'medical', 'doctor',
      'repair', 'service', 'maintenance', 'cleaning',
      
      // Business & Work
      'tools', 'materials', 'supplies', 'equipment', 'hardware',
      'office', 'stationery', 'printing', 'photocopy',
      
      // Utilities & Bills
      'electricity', 'water', 'gas', 'internet', 'mobile', 'recharge',
      'bill', 'payment', 'subscription'
    ];
    
    for (const line of lines) {
      const cleanLine = line.trim();
      const lowerLine = cleanLine.toLowerCase();
      
      if (this.shouldSkipLineForDescription(cleanLine)) continue;
      
      // Check for exact descriptive words
      for (const word of descriptiveWords) {
        if (lowerLine === word || (lowerLine.includes(word) && cleanLine.length <= 20)) {
          console.log(`Universal OCR - Short descriptive word found: ${cleanLine}`);
          return {
            description: this.capitalizeDescription(cleanLine),
            confidence: 0.9,
            source: 'short_descriptive',
            rawMatch: line
          };
        }
      }
    }
    
    return { description: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 2: Business/merchant names in bubbles
  private static detectMerchantInBubble(lines: string[]): {
    description: string; confidence: number; source: string; rawMatch: string;
  } {
    for (const line of lines) {
      const cleanLine = line.trim();
      
      if (this.shouldSkipLineForDescription(cleanLine)) continue;
      
      // Look for business patterns
      if (this.looksLikeMerchantName(cleanLine)) {
        console.log(`Universal OCR - Merchant name found: ${cleanLine}`);
        return {
          description: cleanLine,
          confidence: 0.75,
          source: 'merchant_bubble',
          rawMatch: line
        };
      }
    }
    
    return { description: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 3: Purpose near payment keywords
  private static detectPurposeNearPayment(lines: string[]): {
    description: string; confidence: number; source: string; rawMatch: string;
  } {
    const paymentKeywords = ['paid to', 'sent to', 'payment for', 'bill for', 'order from'];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      for (const keyword of paymentKeywords) {
        if (lowerLine.includes(keyword)) {
          // Extract what comes after the keyword
          const afterKeyword = line.substring(line.toLowerCase().indexOf(keyword) + keyword.length).trim();
          
          if (afterKeyword && afterKeyword.length > 2 && afterKeyword.length < 50) {
            console.log(`Universal OCR - Purpose after keyword: ${afterKeyword}`);
            return {
              description: afterKeyword,
              confidence: 0.7,
              source: 'purpose_after_keyword',
              rawMatch: line
            };
          }
        }
      }
    }
    
    return { description: '', confidence: 0, source: 'none', rawMatch: '' };
  }
  
  // Strategy 4: Extract from payment bubble context
  private static extractFromPaymentBubble(lines: string[]): {
    description: string; confidence: number; source: string; rawMatch: string;
  } {
    // Look for "To:" lines first (highest priority)
    for (const line of lines) {
      const toMatch = line.match(/^To:?\s*(.+)$/i);
      if (toMatch) {
        const recipient = toMatch[1].trim();
        if (recipient && !this.shouldSkipLineForDescription(recipient)) {
          console.log(`Universal OCR - Recipient as description: ${recipient}`);
          return {
            description: recipient,
            confidence: 0.6,
            source: 'recipient_bubble',
            rawMatch: line
          };
        }
      }
    }
    
    // Fallback to first meaningful line
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 3 && cleanLine.length < 100 && 
          !this.shouldSkipLineForDescription(cleanLine)) {
        console.log(`Universal OCR - First meaningful line: ${cleanLine}`);
        return {
          description: cleanLine,
          confidence: 0.4,
          source: 'first_meaningful',
          rawMatch: line
        };
      }
    }
    
    return {
      description: 'Payment',
      confidence: 0.1,
      source: 'default_fallback',
      rawMatch: 'No description found'
    };
  }
  
  // Helper: Is this a valid payment amount?
  private static isValidPaymentAmount(amount: number): boolean {
    return amount >= 1 && amount <= 999999 && !isNaN(amount);
  }
  
  // Helper: Should skip this line for amount detection?
  private static shouldSkipLineForAmount(line: string): boolean {
    const skipPatterns = [
      /\d{10,}/, // Long transaction IDs
      /\d{2}\/\d{2}\/\d{4}/, // Dates
      /\d{1,2}:\d{2}/, // Times
      /pm|am/i,
      /balance|account|card number/i,
      /xxxx+/i // Masked numbers
    ];
    
    return skipPatterns.some(pattern => pattern.test(line.toLowerCase()));
  }
  
  // Helper: Should skip this line for description?
  private static shouldSkipLineForDescription(line: string): boolean {
    const lowerLine = line.toLowerCase();
    
    const skipPatterns = [
      /\d{10,}/, // Transaction IDs
      /\d{2}\/\d{2}\/\d{4}/, // Dates
      /\d{1,2}:\d{2}/, // Times
      /pm|am|completed|success|failed/i,
      /transaction|reference|upi|id/i,
      /from:|google|pay|phonepe|paytm|cred/i,
      /bank|hdfc|icici|sbi|axis/i,
      /xxxx+|balance|account/i,
      /^\d+$/ // Pure numbers
    ];
    
    return skipPatterns.some(pattern => pattern.test(lowerLine)) || 
           line.trim().length < 2;
  }
  
  // Helper: Does this look like a merchant name?
  private static looksLikeMerchantName(text: string): boolean {
    const merchantIndicators = [
      'restaurant', 'hotel', 'cafe', 'store', 'shop', 'mart', 'center',
      'services', 'solutions', 'enterprises', 'traders', 'suppliers',
      'caterers', 'pvt', 'ltd', 'llc', 'inc'
    ];
    
    const lowerText = text.toLowerCase();
    return merchantIndicators.some(indicator => lowerText.includes(indicator)) ||
           (text.length > 5 && text.length < 50 && /^[A-Z][A-Z\s&.-]+$/.test(text));
  }
  
  // Helper: Capitalize description properly
  private static capitalizeDescription(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}