import { createWorker } from 'tesseract.js';

export interface BOQExtractedItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface OCRResult {
  items: BOQExtractedItem[];
  projectName?: string;
  totalValue: number;
}

class OCRService {
  private worker: Tesseract.Worker | null = null;

  async initializeWorker() {
    if (this.worker) return;
    
    this.worker = await createWorker('eng');
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/-₹()[]',
    });
  }

  async processBOQPDF(file: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
    await this.initializeWorker();
    
    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      // Convert PDF to images (for simplicity, we'll assume the file is already an image or convert it)
      const imageUrl = URL.createObjectURL(file);
      
      const { data: { text } } = await this.worker.recognize(imageUrl, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress);
          }
        }
      });

      URL.revokeObjectURL(imageUrl);
      
      return this.parseTextToBOQ(text);
    } catch (error) {
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  private parseTextToBOQ(text: string): OCRResult {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items: BOQExtractedItem[] = [];
    let projectName = '';
    
    // Simple parsing logic - this would need to be more sophisticated for real BOQs
    for (const line of lines) {
      // Look for project name
      if (line.toLowerCase().includes('project') && !projectName) {
        projectName = line.trim();
        continue;
      }
      
      // Look for BOQ items (simplified pattern matching)
      const itemMatch = this.extractBOQItem(line);
      if (itemMatch) {
        items.push(itemMatch);
      }
    }
    
    const totalValue = items.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      items,
      projectName: projectName || 'Extracted BOQ Project',
      totalValue,
    };
  }

  private extractBOQItem(line: string): BOQExtractedItem | null {
    // Patterns to match BOQ items
    const patterns = [
      // Pattern: Description | Quantity | Unit | Rate | Amount
      /^(.+?)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+₹?(\d+(?:\.\d+)?)\s+₹?(\d+(?:\.\d+)?)$/,
      // Pattern: Description Quantity Unit Rate Amount (space separated)
      /^(.+?)\s+(\d+)\s+(\w+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/,
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, description, quantity, unit, rate, amount] = match;
        return {
          description: description.trim(),
          quantity: parseFloat(quantity),
          unit: unit.toLowerCase(),
          rate: parseFloat(rate),
          amount: parseFloat(amount),
        };
      }
    }
    
    // If no specific pattern matches, try to extract basic information
    const numbers = line.match(/\d+(?:\.\d+)?/g);
    if (numbers && numbers.length >= 3) {
      const words = line.replace(/\d+(?:\.\d+)?/g, '').split(/\s+/).filter(w => w.length > 0);
      if (words.length > 0) {
        return {
          description: words.slice(0, -1).join(' ').trim() || 'Unknown Item',
          quantity: parseFloat(numbers[0]) || 1,
          unit: words[words.length - 1] || 'nos',
          rate: parseFloat(numbers[1]) || 0,
          amount: parseFloat(numbers[2]) || 0,
        };
      }
    }
    
    return null;
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
