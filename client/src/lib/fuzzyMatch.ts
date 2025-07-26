// Fuzzy matching utility for BOQ items to products
export interface Product {
  id: number;
  name: string;
  category: string;
  brand?: string;
  size?: string;
  thickness?: string;
  unit: string;
  pricePerUnit: number;
  currentStock: number;
}

export interface MatchResult {
  productId: number;
  confidence: number;
  matchedFields: string[];
}

export interface BOQItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  // Parsed fields from description
  productName?: string;
  thickness?: string;
  size?: string;
  brand?: string;
}

// Simple Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Calculate similarity percentage between two strings
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const normalizeString = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  if (norm1 === norm2) return 100;
  
  // Check if one string contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 85;
  }
  
  const maxLength = Math.max(norm1.length, norm2.length);
  if (maxLength === 0) return 0;
  
  const distance = levenshteinDistance(norm1, norm2);
  return Math.max(0, (1 - distance / maxLength) * 100);
}

// Parse BOQ item description to extract structured data
export function parseBOQDescription(description: string): Partial<BOQItem> {
  const parsed: Partial<BOQItem> = {};
  
  // Extract thickness patterns like "18mm", "12 mm", "6mm"
  const thicknessMatch = description.match(/(\d+)\s*mm/i);
  if (thicknessMatch) {
    parsed.thickness = `${thicknessMatch[1]}mm`;
  }
  
  // Extract size patterns like "8x4", "8 X 4", "8 x 4 feet"
  const sizeMatch = description.match(/(\d+)\s*[x×]\s*(\d+)(\s*feet)?/i);
  if (sizeMatch) {
    parsed.size = `${sizeMatch[1]}x${sizeMatch[2]}${sizeMatch[3] || ' feet'}`.replace(/\s+/g, ' ');
  }
  
  // Extract brand names (look for common patterns)
  const brandPatterns = [
    /Gurjan/i, /Green/i, /Century/i, /Greenply/i, /Kitply/i,
    /Asian/i, /Godrej/i, /Hettich/i, /Hafele/i
  ];
  
  for (const pattern of brandPatterns) {
    const match = description.match(pattern);
    if (match) {
      parsed.brand = match[0];
      break;
    }
  }
  
  // Extract product name (everything before thickness/size specifications)
  let productName = description;
  
  // Remove thickness and size from product name
  if (thicknessMatch) {
    productName = productName.replace(thicknessMatch[0], '');
  }
  if (sizeMatch) {
    productName = productName.replace(sizeMatch[0], '');
  }
  
  // Clean up product name
  parsed.productName = productName
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return parsed;
}

// Find best matching products for a BOQ item
export function findProductMatches(boqItem: BOQItem, products: Product[]): MatchResult[] {
  const parsedBOQ = parseBOQDescription(boqItem.description);
  const matches: MatchResult[] = [];
  
  for (const product of products) {
    let totalConfidence = 0;
    let matchCount = 0;
    const matchedFields: string[] = [];
    
    // Match product name (highest weight)
    if (parsedBOQ.productName && product.name) {
      const nameConfidence = calculateSimilarity(parsedBOQ.productName, product.name);
      if (nameConfidence > 30) { // Minimum threshold
        totalConfidence += nameConfidence * 0.5; // 50% weight
        matchCount++;
        matchedFields.push(`Name: ${nameConfidence.toFixed(0)}%`);
      }
    }
    
    // Match thickness (high weight)
    if (parsedBOQ.thickness && product.thickness) {
      const thicknessConfidence = calculateSimilarity(parsedBOQ.thickness, product.thickness);
      if (thicknessConfidence > 70) {
        totalConfidence += thicknessConfidence * 0.25; // 25% weight
        matchCount++;
        matchedFields.push(`Thickness: ${thicknessConfidence.toFixed(0)}%`);
      }
    }
    
    // Match size (medium weight)
    if (parsedBOQ.size && product.size) {
      const sizeConfidence = calculateSimilarity(parsedBOQ.size, product.size);
      if (sizeConfidence > 60) {
        totalConfidence += sizeConfidence * 0.15; // 15% weight
        matchCount++;
        matchedFields.push(`Size: ${sizeConfidence.toFixed(0)}%`);
      }
    }
    
    // Match brand (medium weight)
    if (parsedBOQ.brand && product.brand) {
      const brandConfidence = calculateSimilarity(parsedBOQ.brand, product.brand);
      if (brandConfidence > 60) {
        totalConfidence += brandConfidence * 0.1; // 10% weight
        matchCount++;
        matchedFields.push(`Brand: ${brandConfidence.toFixed(0)}%`);
      }
    }
    
    // Match unit (bonus points)
    if (boqItem.unit && product.unit) {
      const unitConfidence = calculateSimilarity(boqItem.unit, product.unit);
      if (unitConfidence > 70) {
        totalConfidence += 5; // Bonus points
        matchedFields.push(`Unit: ${unitConfidence.toFixed(0)}%`);
      }
    }
    
    // Only consider matches with at least one field match
    if (matchCount > 0 && totalConfidence > 25) {
      matches.push({
        productId: product.id,
        confidence: Math.min(100, totalConfidence),
        matchedFields
      });
    }
  }
  
  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Get the best match for a BOQ item
export function getBestMatch(boqItem: BOQItem, products: Product[]): MatchResult | null {
  const matches = findProductMatches(boqItem, products);
  return matches.length > 0 ? matches[0] : null;
}

// Auto-match all BOQ items with products
export function autoMatchBOQItems(boqItems: BOQItem[], products: Product[]): (BOQItem & { matchedProductId?: number; confidence?: number; matchedFields?: string[] })[] {
  return boqItems.map(item => {
    const bestMatch = getBestMatch(item, products);
    
    if (bestMatch && bestMatch.confidence > 70) { // Auto-select if confidence > 70%
      return {
        ...item,
        matchedProductId: bestMatch.productId,
        confidence: bestMatch.confidence,
        matchedFields: bestMatch.matchedFields
      };
    }
    
    return item;
  });
}