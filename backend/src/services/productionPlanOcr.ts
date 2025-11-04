import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface OcrProductionPlanResult {
  plan_number: string;
  pass_number: string;
  start_time: Date;
  end_time?: Date;
  input_start_time: Date;
  input_end_time?: Date;
  input_items: Array<{
    row_number: number;
    package_number: string;
    supplier: string;
    drill: number;
    raw_weight: number;
    silver_percent: number;
    silver_fine: number;
    gold_percent: number;
    gold_fine: number;
  }>;
  input_summary: {
    total_carat: number;
    total_weight: number;
    total_silver_percent: number;
    total_silver_fine: number;
    total_gold_percent: number;
    total_gold_fine: number;
  };
  output_items: Array<{
    destination: string;
    gross_weight: number;
    drillings: number;
    sent_weight: number;
    sign_off: boolean;
  }>;
  confidence: number;
}

/**
 * Pre-process image for better OCR accuracy
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return await sharp(imageBuffer)
    .greyscale()
    .normalize()
    .sharpen()
    .threshold(128)
    .toBuffer();
}

/**
 * Extract production plan number from header
 */
function extractPlanNumber(text: string): string {
  // Look for 4-digit number in header area (e.g., "9017")
  const match = text.match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

/**
 * Extract pass number from header
 */
function extractPassNumber(text: string): string {
  // Look for "Pass PP" followed by digits (e.g., "PP021")
  const match = text.match(/PP\s*(\d+)/i);
  return match ? `PP${match[1]}` : '';
}

/**
 * Parse date and time from OCR text
 */
function parseDateTime(dateStr: string): Date | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined;
  
  // Handle format like "2025/10/03 14:11"
  const match = dateStr.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
  }
  
  return undefined;
}

/**
 * Parse numeric value from string, handling commas
 */
function parseNumber(str: string): number {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract input production items from table
 */
function extractInputItems(lines: string[]): Array<any> {
  const items: Array<any> = [];
  
  // Find table start (after headers)
  const headerIndex = lines.findIndex(line => 
    line.toLowerCase().includes('no') && 
    line.toLowerCase().includes('supplier')
  );
  
  if (headerIndex === -1) return items;
  
  // Process each row
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Stop at summary or empty section
    if (line.toLowerCase().includes('summary') || 
        line.toLowerCase().includes('out production') ||
        !line) {
      break;
    }
    
    // Split by multiple spaces or tabs
    const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());
    
    if (parts.length < 8) continue; // Need at least 8 columns
    
    // Extract row number
    const rowMatch = line.match(/^\s*(\d+)/);
    if (!rowMatch) continue;
    
    const rowNumber = parseInt(rowMatch[1]);
    
    // Parse the row data
    items.push({
      row_number: rowNumber,
      package_number: parts[1] || '',
      supplier: parts[2] || '',
      drill: parseNumber(parts[3] || '0'),
      raw_weight: parseNumber(parts[4] || '0'),
      silver_percent: parseNumber(parts[5] || '0'),
      silver_fine: parseNumber(parts[6] || '0'),
      gold_percent: parseNumber(parts[7] || '0'),
      gold_fine: parseNumber(parts[8] || '0'),
    });
  }
  
  return items;
}

/**
 * Extract summary totals
 */
function extractSummary(text: string): any {
  const summaryMatch = text.match(/SUMMARY[\s\S]*?Carat:\s*([\d.]+)[\s\S]*?([\d,]+\.?\d*)/);
  
  if (!summaryMatch) {
    return {
      total_carat: 0,
      total_weight: 0,
      total_silver_percent: 0,
      total_silver_fine: 0,
      total_gold_percent: 0,
      total_gold_fine: 0,
    };
  }
  
  // Extract from summary line
  const summaryLine = text.substring(text.indexOf('SUMMARY'));
  const numbers = summaryLine.match(/[\d,]+\.?\d*/g) || [];
  
  return {
    total_carat: parseNumber(numbers[0] || '0'),
    total_weight: parseNumber(numbers[1] || '0'),
    total_silver_percent: parseNumber(numbers[2] || '0'),
    total_silver_fine: parseNumber(numbers[3] || '0'),
    total_gold_percent: parseNumber(numbers[4] || '0'),
    total_gold_fine: parseNumber(numbers[5] || '0'),
  };
}

/**
 * Extract output production items
 */
function extractOutputItems(lines: string[]): Array<any> {
  const items: Array<any> = [];
  
  const outProdIndex = lines.findIndex(line => 
    line.toLowerCase().includes('out production')
  );
  
  if (outProdIndex === -1) return items;
  
  // Process rows after "OUT PRODUCTION"
  for (let i = outProdIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line || line.match(/^\d+\s*$/)) continue; // Skip empty or number-only
    
    const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());
    
    if (parts.length < 4) continue;
    
    items.push({
      destination: parts[1] || '',
      gross_weight: parseNumber(parts[2] || '0'),
      drillings: parseNumber(parts[3] || '0'),
      sent_weight: parseNumber(parts[4] || '0'),
      sign_off: false, // Will be updated manually
    });
  }
  
  return items;
}

/**
 * Main OCR processing function for production plan forms
 */
export async function processProductionPlanOcr(
  imageBuffer: Buffer
): Promise<OcrProductionPlanResult> {
  // Pre-process image
  const processedImage = await preprocessImage(imageBuffer);
  
  // Run OCR with optimized settings
  const { data } = await Tesseract.recognize(processedImage, 'eng', {
    logger: (m) => console.log(`OCR Progress: ${m.status} ${m.progress || ''}`),
  });
  
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Extract all fields
  const planNumber = extractPlanNumber(text);
  const passNumber = extractPassNumber(text);
  
  // Extract timestamps from text
  const timeMatches = text.match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/g) || [];
  
  const result: OcrProductionPlanResult = {
    plan_number: planNumber,
    pass_number: passNumber,
    start_time: parseDateTime(timeMatches[0] || '') || new Date(),
    end_time: parseDateTime(timeMatches[1] || ''),
    input_start_time: parseDateTime(timeMatches[2] || '') || new Date(),
    input_end_time: parseDateTime(timeMatches[3] || ''),
    input_items: extractInputItems(lines),
    input_summary: extractSummary(text),
    output_items: extractOutputItems(lines),
    confidence: data.confidence / 100,
  };
  
  return result;
}

/**
 * Validate OCR result quality
 */
export function validateOcrResult(result: OcrProductionPlanResult): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!result.plan_number) {
    errors.push('Production plan number not found');
  }
  
  if (!result.pass_number) {
    errors.push('Pass number not found');
  }
  
  if (result.input_items.length === 0) {
    errors.push('No input production items found');
  }
  
  if (result.confidence < 0.7) {
    errors.push('OCR confidence too low (< 70%)');
  }
  
  // Validate critical fields in input items
  result.input_items.forEach((item, index) => {
    if (!item.package_number) {
      errors.push(`Row ${index + 1}: Missing package number`);
    }
    if (item.raw_weight <= 0) {
      errors.push(`Row ${index + 1}: Invalid raw weight`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

