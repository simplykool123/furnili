// Enhanced figure recognition for all payment platforms
// Handles different receipt layouts and improves number detection

export class EnhancedFigureOCR {
  
  // Platform-specific receipt layouts and their characteristics
  static platformLayouts: Record<string, any> = {
    googlepay: {
      amountPosition: 'center-bubble',
      currencySymbol: '₹',
      figurePatterns: [/₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/],
      bubbleIndicators: ['to ', 'from:', 'google pay'],
      skipPatterns: [/\d{10,}/, /\d{2}\/\d{2}\/\d{4}/]
    },
    phonepe: {
      amountPosition: 'top-center',
      currencySymbol: '₹',
      figurePatterns: [/₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/],
      bubbleIndicators: ['sent to', 'phonepe'],
      skipPatterns: [/\d{12,}/, /upi/i]
    },
    paytm: {
      amountPosition: 'center-large',
      currencySymbol: '₹',
      figurePatterns: [/₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/],
      bubbleIndicators: ['paid to', 'paytm'],
      skipPatterns: [/\d{11,}/, /wallet/i]
    },
    cred: {
      amountPosition: 'center-bubble',
      currencySymbol: '₹',
      figurePatterns: [/₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/],
      bubbleIndicators: ['cred', 'paid'],
      skipPatterns: [/\d{10,}/, /card/i]
    }
  };

  // Enhanced figure detection with location awareness
  static extractFiguresWithLocation(lines: string[], platform: string): {
    amounts: Array<{value: string, line: string, position: number, confidence: number}>;
    descriptions: string[];
    recipients: string[];
  } {
    console.log(`OCR Debug - Enhanced figure extraction for ${platform} platform`);
    
    const layout = this.platformLayouts[platform] || this.platformLayouts['googlepay'];
    const results: {
      amounts: Array<{value: string; line: string; position: number; confidence: number}>;
      descriptions: string[];
      recipients: string[];
    } = { amounts: [], descriptions: [], recipients: [] };
    
    // Step 1: Identify spatial layout zones
    const zones = this.identifyLayoutZones(lines, layout);
    console.log(`OCR Debug - Identified ${Object.keys(zones).length} layout zones`);
    
    // Step 2: Extract figures based on platform-specific patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const zone = this.determineLineZone(i, lines.length);
      
      // Skip irrelevant lines based on platform patterns
      if (this.shouldSkipForPlatform(line, layout)) continue;
      
      // Extract amounts with confidence scoring
      const amounts = this.extractAmountsFromLine(line, layout, zone, i);
      results.amounts.push(...amounts);
      
      // Extract descriptions from bubble areas
      if (this.isBubbleContent(line, layout)) {
        results.descriptions.push(line.trim());
      }
      
      // Extract recipient information
      if (this.isRecipientLine(line, layout)) {
        results.recipients.push(this.extractRecipientName(line));
      }
    }
    
    // Step 3: Apply figure validation and correction
    results.amounts = this.validateAndCorrectFigures(results.amounts);
    
    console.log(`OCR Debug - Extracted ${results.amounts.length} validated amounts`);
    return results;
  }

  // Identify layout zones based on line positions
  private static identifyLayoutZones(lines: string[], layout: any): {
    top: number[];
    center: number[];
    bottom: number[];
    bubble: number[];
  } {
    const totalLines = lines.length;
    const zones: {
      top: number[];
      center: number[];
      bottom: number[];
      bubble: number[];
    } = { top: [], center: [], bottom: [], bubble: [] };
    
    for (let i = 0; i < totalLines; i++) {
      const line = lines[i];
      
      if (i < totalLines * 0.25) zones.top.push(i);
      else if (i > totalLines * 0.75) zones.bottom.push(i);
      else zones.center.push(i);
      
      // Identify bubble content regardless of position
      if (this.isBubbleContent(line, layout)) {
        zones.bubble.push(i);
      }
    }
    
    return zones;
  }

  // Determine which zone a line belongs to
  private static determineLineZone(lineIndex: number, totalLines: number): string {
    const position = lineIndex / totalLines;
    if (position < 0.25) return 'top';
    if (position > 0.75) return 'bottom';
    return 'center';
  }

  // Enhanced amount extraction with confidence scoring
  private static extractAmountsFromLine(
    line: string, 
    layout: any, 
    zone: string, 
    lineIndex: number
  ): Array<{value: string; line: string; position: number; confidence: number}> {
    const amounts: Array<{value: string; line: string; position: number; confidence: number}> = [];
    
    // Apply platform-specific figure patterns
    for (const pattern of layout.figurePatterns) {
      const matches = Array.from(line.matchAll(new RegExp(pattern.source, 'gi')));
      
      for (const match of matches) {
        const value = match[1];
        if (!this.isValidFigure(value)) continue;
        
        // Calculate confidence based on multiple factors
        let confidence = this.calculateFigureConfidence(value, line, zone, layout);
        
        amounts.push({
          value: value.replace(/,/g, ''),
          line: line.trim(),
          position: lineIndex,
          confidence
        });
      }
    }
    
    // Try enhanced symbol correction patterns
    const correctedLine = this.correctCurrencySymbols(line);
    if (correctedLine !== line) {
      const correctedAmounts = this.extractAmountsFromLine(correctedLine, layout, zone, lineIndex);
      amounts.push(...correctedAmounts.map(a => ({ ...a, confidence: a.confidence * 0.9 })));
    }
    
    return amounts;
  }

  // Calculate confidence score for detected figures
  private static calculateFigureConfidence(
    value: string, 
    line: string, 
    zone: string, 
    layout: any
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Zone-based confidence (center is usually better for amounts)
    if (zone === 'center') confidence += 0.3;
    else if (zone === 'top') confidence += 0.2;
    else confidence += 0.1;
    
    // Currency symbol presence
    if (line.includes('₹')) confidence += 0.3;
    else if (/[£&@$€¥]/.test(line)) confidence += 0.2;
    
    // Business context presence
    const businessTerms = ['furnili', 'tools', 'fevixol', 'ashish', 'order', 'payment'];
    if (businessTerms.some(term => line.toLowerCase().includes(term))) {
      confidence += 0.2;
    }
    
    // Figure format quality
    const numValue = parseFloat(value.replace(/,/g, ''));
    if (numValue >= 10 && numValue <= 99999) confidence += 0.2;
    if (/^\d{2,5}$/.test(value.replace(/,/g, ''))) confidence += 0.1;
    
    // Avoid transaction IDs and dates
    if (value.length > 6 || numValue > 100000) confidence *= 0.3;
    
    return Math.min(1.0, confidence);
  }

  // Enhanced currency symbol correction
  private static correctCurrencySymbols(text: string): string {
    let corrected = text;
    
    // Comprehensive symbol mapping for Indian payments
    const symbolReplacements = [
      { from: /£(\s*\d)/g, to: '₹$1', name: 'Pound' },
      { from: /&(\s*\d)/g, to: '₹$1', name: 'Ampersand' },
      { from: /@(\s*\d)/g, to: '₹$1', name: 'At sign' },
      { from: /\$(\s*\d)/g, to: '₹$1', name: 'Dollar' },
      { from: /€(\s*\d)/g, to: '₹$1', name: 'Euro' },
      { from: /¥(\s*\d)/g, to: '₹$1', name: 'Yen' },
      { from: /¢(\s*\d)/g, to: '₹$1', name: 'Cent' },
      
      // OCR commonly misread characters
      { from: /ê(\s*\d)/g, to: '₹$1', name: 'e-circumflex' },
      { from: /§(\s*\d)/g, to: '₹$1', name: 'Section sign' },
      { from: /℞(\s*\d)/g, to: '₹$1', name: 'Prescription sign' },
      
      // Text-based currency
      { from: /Rs\.?\s*(\d)/gi, to: '₹$1', name: 'Rs text' },
      { from: /INR\s*(\d)/gi, to: '₹$1', name: 'INR text' },
      { from: /Rupees?\s*(\d)/gi, to: '₹$1', name: 'Rupees text' },
    ];
    
    for (const replacement of symbolReplacements) {
      const beforeCorrection = corrected;
      corrected = corrected.replace(replacement.from, replacement.to);
      if (corrected !== beforeCorrection) {
        console.log(`OCR Debug - Applied ${replacement.name} symbol correction`);
      }
    }
    
    return corrected;
  }

  // Check if line contains bubble content
  private static isBubbleContent(line: string, layout: any): boolean {
    const lowerLine = line.toLowerCase();
    
    // Platform-specific bubble indicators
    const hasBubbleIndicator = layout.bubbleIndicators.some((indicator: string) => 
      lowerLine.includes(indicator.toLowerCase())
    );
    
    // Business terms that commonly appear in bubbles
    const businessTerms = ['furnili', 'tools', 'fevixol', 'ashish', 'order', 'material'];
    const hasBusinessTerm = businessTerms.some(term => lowerLine.includes(term));
    
    // Transaction descriptors
    const hasTransactionTerm = /completed|success|sent|paid|payment/.test(lowerLine);
    
    return hasBubbleIndicator || hasBusinessTerm || hasTransactionTerm;
  }

  // Check if line contains recipient information
  private static isRecipientLine(line: string, layout: any): boolean {
    return /^to[:\s]+[A-Z][a-z\s]+/i.test(line) || 
           /from[:\s]+[A-Z][a-z\s]+/i.test(line);
  }

  // Extract recipient name from line
  private static extractRecipientName(line: string): string {
    const match = line.match(/(?:to|from)[:\s]+([A-Z][A-Z\s]+)/i);
    return match ? match[1].trim() : '';
  }

  // Should skip line based on platform patterns
  private static shouldSkipForPlatform(line: string, layout: any): boolean {
    return layout.skipPatterns.some((pattern: RegExp) => pattern.test(line));
  }

  // Validate if extracted value is a reasonable figure
  private static isValidFigure(value: string): boolean {
    const numValue = parseFloat(value.replace(/,/g, ''));
    return numValue >= 1 && numValue <= 999999 && !isNaN(numValue);
  }

  // Validate and correct extracted figures
  private static validateAndCorrectFigures(
    amounts: Array<{value: string; line: string; position: number; confidence: number}>
  ): Array<{value: string; line: string; position: number; confidence: number}> {
    // Sort by confidence score
    amounts.sort((a, b) => b.confidence - a.confidence);
    
    // Remove duplicates and low-confidence figures
    const validated = [];
    const seenValues = new Set();
    
    for (const amount of amounts) {
      if (amount.confidence < 0.3) continue; // Skip low confidence
      if (seenValues.has(amount.value)) continue; // Skip duplicates
      
      seenValues.add(amount.value);
      validated.push(amount);
    }
    
    console.log(`OCR Debug - Validated ${validated.length} figures from ${amounts.length} candidates`);
    return validated;
  }

  // Main processing function for all platforms
  static processReceiptForAllPlatforms(lines: string[]): {
    platform: string;
    amount: string;
    description: string;
    recipient: string;
    confidence: number;
  } {
    // Detect platform first
    const platform = this.detectReceiptPlatform(lines);
    console.log(`OCR Debug - Detected platform: ${platform}`);
    
    // Extract figures with enhanced processing
    const results = this.extractFiguresWithLocation(lines, platform);
    
    // Select best results
    const bestAmount = results.amounts.length > 0 ? results.amounts[0] : null;
    const bestDescription = results.descriptions.length > 0 ? results.descriptions[0] : '';
    const bestRecipient = results.recipients.length > 0 ? results.recipients[0] : '';
    
    return {
      platform,
      amount: bestAmount ? bestAmount.value : '',
      description: bestDescription,
      recipient: bestRecipient,
      confidence: bestAmount ? bestAmount.confidence : 0
    };
  }

  // Detect receipt platform from text content
  private static detectReceiptPlatform(lines: string[]): string {
    const text = lines.join(' ').toLowerCase();
    
    if (text.includes('google pay') || text.includes('gpay')) return 'googlepay';
    if (text.includes('phonepe') || text.includes('phone pe')) return 'phonepe';
    if (text.includes('paytm')) return 'paytm';
    if (text.includes('cred')) return 'cred';
    
    return 'googlepay'; // Default fallback
  }
}