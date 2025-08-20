// Enhanced payment amount detection for when OCR misses the main amount display
// Targets the large prominent amount displays in payment screenshots

export class PaymentAmountDetector {
  
  // Enhanced amount detection with visual cues and context analysis
  static detectPaymentAmount(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
  } {
    console.log('OCR Debug - Enhanced payment amount detection started');
    
    // Strategy 1: Look for large standalone numbers (most common for payment amounts)
    const largeAmountResult = this.detectLargeStandaloneAmount(lines);
    if (largeAmountResult.confidence > 0.8) {
      return largeAmountResult;
    }
    
    // Strategy 2: Look for amounts with currency context
    const currencyContextResult = this.detectAmountWithCurrencyContext(lines);
    if (currencyContextResult.confidence > 0.7) {
      return currencyContextResult;
    }
    
    // Strategy 3: Look for amounts near payment keywords
    const paymentContextResult = this.detectAmountNearPaymentKeywords(lines);
    if (paymentContextResult.confidence > 0.6) {
      return paymentContextResult;
    }
    
    // Strategy 4: Look for numerical patterns that could be amounts
    const patternResult = this.detectAmountByPattern(lines);
    if (patternResult.confidence > 0.5) {
      return patternResult;
    }
    
    // Strategy 5: Look for isolated numbers in reasonable amount range
    const isolatedResult = this.detectIsolatedReasonableAmount(lines);
    
    console.log('OCR Debug - Best amount detection result:', isolatedResult);
    return isolatedResult;
  }
  
  // Strategy 1: Detect large standalone amounts (main payment display)
  private static detectLargeStandaloneAmount(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
  } {
    for (const line of lines) {
      // Look for standalone numbers that are reasonable payment amounts
      const cleanLine = line.trim();
      
      // Match standalone numbers (1-6 digits, possibly with decimals) - PRIORITIZE 3-DIGIT AMOUNTS
      const standaloneMatch = cleanLine.match(/^[\s₹£$@€¥¢&]*(\d{1,6}(?:\.\d{2})?)[\s]*$/);
      if (standaloneMatch) {
        const amount = standaloneMatch[1];
        const numValue = parseFloat(amount);
        
        // Check if it's in reasonable payment range (₹1 to ₹99,999)
        if (numValue >= 1 && numValue <= 99999) {
          // Prioritize 3-digit amounts (more likely to be payment amounts)
          const confidence = amount.length === 3 ? 0.95 : 0.9;
          console.log(`OCR Debug - Found standalone amount: ${amount} (confidence: ${confidence})`);
          return {
            amount: amount,
            confidence: confidence,
            source: 'standalone_large_display'
          };
        }
      }
      
      // Look for amounts with commas (₹1,234 format)
      const commaMatch = cleanLine.match(/^[\s₹£$@€¥¢&]*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)[\s]*$/);
      if (commaMatch) {
        const amount = commaMatch[1].replace(/,/g, '');
        const numValue = parseFloat(amount);
        
        if (numValue >= 1 && numValue <= 999999) {
          console.log(`OCR Debug - Found comma-formatted amount: ${amount}`);
          return {
            amount: amount,
            confidence: 0.85,
            source: 'standalone_comma_formatted'
          };
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 2: Detect amounts with currency symbols or context
  private static detectAmountWithCurrencyContext(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
  } {
    for (const line of lines) {
      // Look for explicit currency symbols followed by numbers
      const currencyMatch = line.match(/[₹£$@€¥¢&]\s*(\d{1,6}(?:\.\d{2})?)/);
      if (currencyMatch) {
        const amount = currencyMatch[1];
        const numValue = parseFloat(amount);
        
        if (numValue >= 1 && numValue <= 99999) {
          console.log(`OCR Debug - Found currency-prefixed amount: ${amount}`);
          return {
            amount: amount,
            confidence: 0.8,
            source: 'currency_symbol_context'
          };
        }
      }
      
      // Look for "Rs" or "INR" prefix
      const rsMatch = line.match(/(?:Rs\.?|INR)\s*(\d{1,6}(?:\.\d{2})?)/i);
      if (rsMatch) {
        const amount = rsMatch[1];
        const numValue = parseFloat(amount);
        
        if (numValue >= 1 && numValue <= 99999) {
          console.log(`OCR Debug - Found Rs/INR prefixed amount: ${amount}`);
          return {
            amount: amount,
            confidence: 0.75,
            source: 'rs_inr_prefix'
          };
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 3: Look for amounts near payment-related keywords
  private static detectAmountNearPaymentKeywords(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
  } {
    const paymentKeywords = [
      'paid', 'sent', 'amount', 'total', 'bill', 'cost', 'price', 'pay',
      'food', 'order', 'purchase', 'transaction', 'payment'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Check if line contains payment keywords
      const hasPaymentKeyword = paymentKeywords.some(keyword => line.includes(keyword));
      
      if (hasPaymentKeyword) {
        // Look for numbers in this line
        const numberMatch = line.match(/(\d{1,6}(?:\.\d{2})?)/);
        if (numberMatch) {
          const amount = numberMatch[1];
          const numValue = parseFloat(amount);
          
          if (numValue >= 1 && numValue <= 99999) {
            console.log(`OCR Debug - Found amount near keyword: ${amount}`);
            return {
              amount: amount,
              confidence: 0.7,
              source: 'payment_keyword_context'
            };
          }
        }
        
        // Also check adjacent lines
        for (const adjacentIndex of [i-1, i+1]) {
          if (adjacentIndex >= 0 && adjacentIndex < lines.length) {
            const adjacentLine = lines[adjacentIndex];
            const adjacentMatch = adjacentLine.match(/(\d{1,6}(?:\.\d{2})?)/);
            
            if (adjacentMatch) {
              const amount = adjacentMatch[1];
              const numValue = parseFloat(amount);
              
              if (numValue >= 1 && numValue <= 99999) {
                console.log(`OCR Debug - Found amount adjacent to keyword: ${amount}`);
                return {
                  amount: amount,
                  confidence: 0.65,
                  source: 'adjacent_to_payment_keyword'
                };
              }
            }
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 4: Pattern-based detection (₹ followed by number anywhere in line)
  private static detectAmountByPattern(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
  } {
    for (const line of lines) {
      // Look for any currency symbol pattern
      const patterns = [
        /[₹]\s*(\d{1,6}(?:\.\d{2})?)/,
        /(\d{1,6}(?:\.\d{2})?)\s*[₹]/,
        /[£$@€¥¢&]\s*(\d{1,6}(?:\.\d{2})?)/
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = match[1];
          const numValue = parseFloat(amount);
          
          if (numValue >= 1 && numValue <= 99999) {
            console.log(`OCR Debug - Found pattern-based amount: ${amount}`);
            return {
              amount: amount,
              confidence: 0.6,
              source: 'currency_pattern'
            };
          }
        }
      }
    }
    
    return { amount: '', confidence: 0, source: 'none' };
  }
  
  // Strategy 5: Look for isolated reasonable amounts as last resort
  private static detectIsolatedReasonableAmount(lines: string[]): {
    amount: string;
    confidence: number;
    source: string;
  } {
    const candidates: Array<{amount: string; confidence: number}> = [];
    
    for (const line of lines) {
      const numbers = line.match(/\d{1,6}(?:\.\d{2})?/g) || [];
      
      for (const number of numbers) {
        const numValue = parseFloat(number);
        
        // Skip obvious non-amounts
        if (this.shouldSkipNumber(number, line)) continue;
        
        // Reasonable payment amount range
        if (numValue >= 10 && numValue <= 9999) {
          let confidence = 0.3;
          
          // Boost confidence for round numbers
          if (numValue % 10 === 0 || numValue % 5 === 0) confidence += 0.1;
          
          // Boost confidence for common amount ranges
          if (numValue >= 50 && numValue <= 2000) confidence += 0.1;
          
          // Boost confidence if line is short (likely main display)
          if (line.trim().length <= 20) confidence += 0.1;
          
          candidates.push({ amount: number, confidence });
        }
      }
    }
    
    // Return highest confidence candidate
    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => b.confidence - a.confidence)[0];
      console.log(`OCR Debug - Found isolated reasonable amount: ${best.amount} (confidence: ${best.confidence})`);
      return {
        amount: best.amount,
        confidence: best.confidence,
        source: 'isolated_reasonable'
      };
    }
    
    return { amount: '', confidence: 0, source: 'none' };
  }
  
  // Helper: Should skip this number (likely not a payment amount)
  private static shouldSkipNumber(number: string, line: string): boolean {
    const numValue = parseFloat(number);
    
    // Skip very large numbers (likely transaction IDs)
    if (number.length > 6) return true;
    
    // Skip very small amounts (likely not payments)
    if (numValue < 1) return true;
    
    // Skip if line contains obvious non-amount indicators
    const nonAmountIndicators = [
      'id', 'transaction', 'reference', 'account', 'card', 'number',
      'phone', 'mobile', 'date', 'time', 'pm', 'am', 'code', 'pin'
    ];
    
    const lowerLine = line.toLowerCase();
    if (nonAmountIndicators.some(indicator => lowerLine.includes(indicator))) {
      return true;
    }
    
    // Skip dates (DD/MM/YYYY or similar patterns)
    if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line)) return true;
    
    // Skip times (HH:MM format)
    if (/\d{1,2}:\d{2}/.test(line)) return true;
    
    return false;
  }
}