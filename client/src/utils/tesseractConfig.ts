// Tesseract.js configuration for enhanced figure recognition

import { createWorker, PSM, OEM } from 'tesseract.js';

export class TesseractConfig {
  
  // Enhanced configuration for Indian payment screenshots
  static getEnhancedConfig() {
    return {
      // Character whitelist optimized for Indian receipts
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@€¥¢&.-/:(),',
      
      // Page segmentation mode - single uniform block of text
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      
      // OCR engine mode - LSTM only for better accuracy
      tessedit_ocr_engine_mode: OEM.LSTM_ONLY,
      
      // Basic settings
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
      
      // Enhanced figure recognition parameters
      classify_enable_learning: '1',
      classify_enable_adaptive_matcher: '1',
      textord_noise_rejection: '0', // Don't reject currency symbols
      classify_num_cp_levels: '3', // Better number recognition
      classify_char_norm_cutoff: '0.8',
      classify_max_rating_ratio: '1.2',
      
      // Better currency symbol handling
      language_model_penalty_non_freq_dict_word: '0.1',
      language_model_penalty_non_dict_word: '0.1',
      
      // Improved number and punctuation recognition
      numeric_punctuation: '.,',
      tessedit_enable_bigram_correction: '1',
      tessedit_enable_dict_correction: '0',
      
      // Layout analysis improvements
      textord_really_old_xheight: '1',
      textord_noise_rejwords: '0',
      textord_noise_rejrows: '0',
      
      // Character confidence improvements
      classify_class_pruner_threshold: '220',
      classify_class_pruner_multiplier: '15',
      
      // Better handling of small text (like amounts)
      textord_min_linesize: '1.25',
      textord_excess_blobsize: '1.3'
    };
  }

  // Standard configuration for fallback
  static getStandardConfig() {
    return {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ₹£$@.-/:(),',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_ocr_engine_mode: OEM.LSTM_ONLY,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300'
    };
  }

  // Create optimized worker for payment screenshots
  static async createEnhancedWorker() {
    const worker = await createWorker(['eng'], 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress - ${m.status}: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    await worker.setParameters(this.getEnhancedConfig());
    return worker;
  }

  // Create standard worker for fallback
  static async createStandardWorker() {
    const worker = await createWorker(['eng'], 1);
    await worker.setParameters(this.getStandardConfig());
    return worker;
  }
}