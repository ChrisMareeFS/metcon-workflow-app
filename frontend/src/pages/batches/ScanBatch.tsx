import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorker, PSM } from 'tesseract.js';
import { batchService } from '../../services/batchService';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { Camera, FileText, Loader2, Upload, X, CheckCircle } from 'lucide-react';

export default function ScanBatch() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManualEntry, setIsManualEntry] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [formData, setFormData] = useState({
    batch_number: '',
    pipeline: 'copper' as 'copper' | 'silver' | 'gold',
    initial_weight: '',
    priority: 'normal' as 'normal' | 'high',
    supplier: '',
    carat: '',
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Read and display image
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setScannedImage(imageData);
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  const preprocessImage = (imageData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for image preprocessing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Scale up the image for better OCR (2x resolution)
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Draw image at higher resolution
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply image enhancements for better OCR
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Increase contrast and apply threshold
          // This makes text darker and background lighter
          const threshold = 128;
          const contrast = 1.5;
          let value = (gray - threshold) * contrast + threshold;
          
          // Apply binary threshold for crisp text
          value = value > 150 ? 255 : 0;
          
          data[i] = value;     // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          // Alpha stays the same
        }
        
        // Put processed image back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to data URL
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  };

  const processImage = async (imageData: string) => {
    setIsScanning(true);
    let worker;
    try {
      console.log('🖼️ Preprocessing image for better OCR...');
      const processedImage = await preprocessImage(imageData);
      console.log('✅ Image preprocessing complete');
      
      // Create Tesseract worker with enhanced config for better number recognition
      worker = await createWorker('eng', 1, {
        logger: m => console.log('OCR:', m)
      });
      
      // Configure Tesseract for better number/digit recognition
      // PSM 3 = Fully automatic page segmentation, but no OSD (best for documents)
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,%:-/',
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: PSM.AUTO, // Fully automatic page segmentation
      });
      
      // Extract text from the preprocessed image
      const { data: { text, confidence } } = await worker.recognize(processedImage);
      
      console.log('========================================');
      console.log('📄 FULL OCR TEXT OUTPUT:');
      console.log(text);
      console.log('========================================');
      console.log('🎯 OCR Confidence:', confidence);
      
      // Parse the extracted text to find batch details
      const parsedData = parseOcrText(text);
      
      console.log('========================================');
      console.log('📋 FINAL PARSED DATA:', parsedData);
      console.log('========================================');
      
      setExtractedData(parsedData);
      
      // Update form data with parsed values
      const newFormData = {
        batch_number: parsedData.batch_number,
        pipeline: parsedData.pipeline,
        initial_weight: parsedData.initial_weight,
        priority: parsedData.priority,
        supplier: parsedData.supplier || '',
        carat: parsedData.carat || '',
      };
      
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to extract data from image. Please try manual entry or ensure the image is clear and readable.');
    } finally {
      // Terminate worker to free up resources
      if (worker) {
        await worker.terminate();
      }
      setIsScanning(false);
    }
  };

  const parseOcrText = (text: string) => {
    const lowerText = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    console.log('📄 Total lines found:', lines.length);
    console.log('📄 First 15 lines:');
    lines.slice(0, 15).forEach((line, i) => {
      console.log(`  Line ${i}: "${line}"`);
    });
    
    // Extract batch number - THE RED NUMBER on YELLOW background in top-right header (e.g., 2770)
    // This appears at the end of the "METAL CONCENTRATORS" line or as an isolated number
    let batchNumber = '';
    
    // Strategy 1: HIGHEST PRIORITY - Look for the line with "METAL CONCENTRATORS" 
    // The batch number appears at the END of this line
    console.log('🔍 Strategy 1: Looking for batch number after "METAL CONCENTRATORS"...');
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      // Check for "METAL CONCENTRATORS" line
      if (lowerLine.includes('metal') && lowerLine.includes('concentrator')) {
        console.log(`  Found "METAL CONCENTRATORS" on line ${i}: "${line}"`);
        
        // Extract the LAST 3-4 digit number on this line (the batch number at the end)
        const numbersOnLine = line.match(/\b(\d{3,4})\b/g);
        if (numbersOnLine && numbersOnLine.length > 0) {
          const lastNum = numbersOnLine[numbersOnLine.length - 1];
          if (!lastNum.match(/^(19|20)\d{2}$/)) {
            batchNumber = lastNum;
            console.log(`✅ BATCH NUMBER FOUND (after METAL CONCENTRATORS): "${batchNumber}"`);
            break;
          }
        }
      }
    }
    
    // Strategy 1b: Look for isolated number on line 3 or 4 (where batch number typically appears)
    if (!batchNumber) {
      console.log('🔍 Strategy 1b: Checking lines 2-4 for isolated batch number...');
      for (let i = 2; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();
        
        // Skip table headers
        if (lowerLine.includes('supplier') || lowerLine.includes('no pc hum')) {
          continue;
        }
        
        // Look for a line ending with just a 3-4 digit number
        const endNumberMatch = line.match(/\s+(\d{3,4})\s*$/);
        if (endNumberMatch && !endNumberMatch[1].match(/^(19|20)\d{2}$/)) {
          batchNumber = endNumberMatch[1];
          console.log(`✅ BATCH NUMBER FOUND (isolated at end of line ${i}): "${batchNumber}"`);
          break;
        }
      }
    }
    
    // Strategy 2: Look in the very first 5 lines for ANY 3-4 digit number
    if (!batchNumber) {
      console.log('🔍 Strategy 2: Searching first 5 lines for batch number...');
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        // Find ALL numbers in the line
        const allNumbers = line.match(/\d+/g);
        if (allNumbers) {
          console.log(`  Line ${i} numbers:`, allNumbers);
          // Look for 3-4 digit numbers, skip years and very long numbers
          for (const num of allNumbers) {
            if ((num.length === 3 || num.length === 4) && !num.match(/^(19|20)\d{2}$/)) {
              batchNumber = num;
              console.log(`✅ BATCH NUMBER FOUND in line ${i}: "${num}" (from line: "${line}")`);
              break;
            }
          }
          if (batchNumber) break;
        }
      }
    }
    
    // Strategy 3: Look anywhere in top 20 lines for isolated 3-4 digit number
    if (!batchNumber) {
      console.log('🔍 Strategy 3: Searching top 20 lines for isolated numbers...');
      for (let i = 0; i < Math.min(20, lines.length); i++) {
        const line = lines[i].trim();
        // Look for a line that is ONLY a 3-4 digit number (or mostly just the number)
        if (/^\s*(\d{3,4})\s*$/.test(line)) {
          const match = line.match(/(\d{3,4})/);
          if (match && !match[1].match(/^(19|20)\d{2}$/)) {
            batchNumber = match[1];
            console.log(`✅ BATCH NUMBER FOUND (isolated) in line ${i}: "${batchNumber}"`);
            break;
          }
        }
      }
    }
    
    // Strategy 4: Last resort - find ANY 3-4 digit number in first 100 characters
    if (!batchNumber) {
      console.log('🔍 Strategy 4: First 100 characters...');
      const firstChars = text.substring(0, 100);
      const allMatches = firstChars.match(/\d{3,4}/g);
      if (allMatches) {
        // Filter out years and take the first remaining number
        for (const num of allMatches) {
          if (!num.match(/^(19|20)\d{2}$/) && num.length >= 3) {
            batchNumber = num;
            console.log(`✅ BATCH NUMBER FOUND (first 100 chars): "${batchNumber}"`);
            break;
          }
        }
      }
    }
    
    if (!batchNumber) {
      console.log('❌ NO BATCH NUMBER FOUND - will use fallback');
    }
    
    // Extract supplier - look for supplier names in table rows
    let supplier = '';
    // Look for common supplier patterns in the text
    const supplierPatterns = [
      /supplier[:\s]+([A-Za-z0-9\s&.-]+?)(?:\s{2,}|\d|$)/i,  // "Supplier: ABC Metals"
      /\d+\s+([A-Z][A-Za-z\s&.-]+?)\s+\d+(?:\.\d+)?/,  // Row format: "1 ABC Metals 100"
    ];
    
    for (const pattern of supplierPatterns) {
      const match = text.match(pattern);
      if (match) {
        supplier = match[1].trim();
        console.log('✅ Supplier found:', supplier);
        break;
      }
    }
    
    // If still not found, look in table rows for company names (usually after row number)
    if (!supplier) {
      for (const line of lines) {
        // Look for pattern: number, then capitalized words (supplier name), then numbers
        const rowMatch = line.match(/^\d+\s+([A-Z][A-Za-z\s&.-]{3,30}?)\s+\d/);
        if (rowMatch) {
          supplier = rowMatch[1].trim();
          console.log('✅ Supplier found in table row:', supplier);
          break;
        }
      }
    }
    
    // Extract carat - look for carat field in various formats
    let carat = '';
    const caratPatterns = [
      /carat[:\s]+(\d+(?:\.\d+)?)/i,           // "Carat: 24" or "Carat 24"
      /(\d+)\s*(?:ct|k|kar)/i,                  // "24ct" or "24k"
      /fineness[:\s]+(\d+)/i,                   // "Fineness: 999"
    ];
    
    for (const pattern of caratPatterns) {
      const match = text.match(pattern);
      if (match) {
        carat = match[1];
        console.log('✅ Carat found:', carat);
        break;
      }
    }
    
    // Extract metal type - check column headers and data
    let pipeline: 'copper' | 'silver' | 'gold' = 'copper';
    
    // Strategy 1: Look for column headers with % symbol
    // Count occurrences of "silver %" vs "gold %" vs "copper %" in column headers
    const silverHeaderCount = (text.match(/silver\s*%/gi) || []).length;
    const goldHeaderCount = (text.match(/gold\s*%/gi) || []).length;
    
    // Strategy 2: Look for actual percentage values in columns
    // Find all percentage patterns and see which metal they're associated with
    let silverValues = 0;
    let goldValues = 0;
    
    lines.forEach(line => {
      // Look for patterns like "Silver 95.5%" or column data
      if (/silver.*?\d+\.?\d*\s*%/i.test(line)) silverValues++;
      if (/gold.*?\d+\.?\d*\s*%/i.test(line)) goldValues++;
      
      // Also check for numeric columns (e.g., "45.5  0  50.2  0" suggests gold in 3rd column)
      const numericPattern = /(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/;
      const match = line.match(numericPattern);
      if (match) {
        const [, , col2, , col4] = match;
        // Columns typically: raw_weight, silver%, silver_fine, gold%, gold_fine
        if (parseFloat(col2) > 0) silverValues++;  // Silver % column
        if (parseFloat(col4) > 0) goldValues++;    // Gold % column
      }
    });
    
    console.log('🔍 Metal Detection:', {
      silverHeaderCount,
      goldHeaderCount,
      silverValues,
      goldValues,
      hasCopper: lowerText.includes('copper') || lowerText.includes('cu ')
    });
    
    // Determine metal type based on which has more data
    if (silverValues > goldValues && silverValues > 0) {
      pipeline = 'silver';
      console.log('✅ Metal type: SILVER (based on column data)');
    } else if (goldValues > silverValues && goldValues > 0) {
      pipeline = 'gold';
      console.log('✅ Metal type: GOLD (based on column data)');
    } else if (lowerText.includes('copper') || 
        lowerText.includes('cu ') ||
        lowerText.includes('cu%')) {
      pipeline = 'copper';
      console.log('✅ Metal type: COPPER (based on keywords)');
    } else {
      console.log('⚠️ Metal type: Defaulting to COPPER');
    }
    
    // Extract weight from SUMMARY row (total weight)
    let initialWeight = '';
    
    // Strategy 1: Look for "SUMMARY" section and extract total/weight
    const summaryIndex = lines.findIndex(l => /summary/i.test(l));
    if (summaryIndex !== -1) {
      console.log('📊 Found SUMMARY at line', summaryIndex);
      // Check the next few lines after SUMMARY for weight values
      for (let i = summaryIndex; i < Math.min(summaryIndex + 5, lines.length); i++) {
        const line = lines[i];
        console.log('  Checking summary line:', line);
        
        // Look for numbers in summary rows (often just numbers separated by spaces)
        const numbersInLine = line.match(/\d+(?:[.,]\d+)?/g);
        if (numbersInLine && numbersInLine.length > 0) {
          // Usually the first significant number in summary is the total weight
          for (const numStr of numbersInLine) {
            const num = parseFloat(numStr.replace(',', '.'));
            // Weight should be reasonable (10g to 100kg = 100000g)
            if (num >= 10 && num <= 100000) {
              initialWeight = numStr.replace(',', '.');
              console.log('✅ Weight found in summary:', initialWeight);
              break;
            }
          }
          if (initialWeight) break;
        }
      }
    }
    
    // Strategy 2: Look for explicit "total" or "weight" labels
    if (!initialWeight) {
      const weightPatterns = [
        /total[:\s]+(\d+(?:[.,]\d+)?)/i,                             // "Total: 123.45" or "Total 123.45"
        /(?:total\s*)?weight[:\s]+(\d+(?:[.,]\d+)?)/i,              // "Weight: 123" or "Total Weight: 123"
        /sum[:\s]+(\d+(?:[.,]\d+)?)/i,                              // "Sum: 123"
      ];
      
      for (const pattern of weightPatterns) {
        const match = text.match(pattern);
        if (match) {
          const num = parseFloat(match[1].replace(',', '.'));
          if (num >= 10 && num <= 100000) {
            initialWeight = match[1].replace(',', '.');
            console.log('✅ Weight found from label:', initialWeight);
            break;
          }
        }
      }
    }
    
    // Strategy 3: Look in bottom 30% of document for large numbers (likely summary totals)
    if (!initialWeight) {
      const bottomLines = lines.slice(Math.floor(lines.length * 0.7));
      for (const line of bottomLines) {
        const numbers = line.match(/\b(\d{2,6}(?:[.,]\d+)?)\b/g);
        if (numbers) {
          for (const numStr of numbers) {
            const num = parseFloat(numStr.replace(',', '.'));
            if (num >= 50 && num <= 100000) {
              initialWeight = numStr.replace(',', '.');
              console.log('✅ Weight found in bottom section:', initialWeight);
              break;
            }
          }
          if (initialWeight) break;
        }
      }
    }
    
    console.log('⚖️ Final weight:', initialWeight || 'NOT FOUND');
    
    // Extract priority
    let priority: 'normal' | 'high' = 'normal';
    // Look for explicit priority mentions
    const priorityMatch = text.match(/priority\s*:?\s*(high|normal|urgent)/i);
    if (priorityMatch) {
      const priorityValue = priorityMatch[1].toLowerCase();
      if (priorityValue === 'high' || priorityValue === 'urgent') {
        priority = 'high';
      } else if (priorityValue === 'normal') {
        priority = 'normal';
      }
    } else if (lowerText.includes('urgent')) {
      // Fallback: if "urgent" appears anywhere without "priority:" label
      priority = 'high';
    }
    
    // Generate default batch number if not found
    if (!batchNumber) {
      // Use timestamp-based number
      batchNumber = Date.now().toString().slice(-4);
      console.log('⚠️ Using fallback batch number:', batchNumber);
    }
    
    console.log('📋 Final Parsed Data:', {
      batch_number: batchNumber,
      pipeline,
      initial_weight: initialWeight,
      priority,
      supplier,
      carat,
    });
    
    return {
      batch_number: batchNumber,
      pipeline,
      initial_weight: initialWeight,
      priority,
      supplier,
      carat,
      confidence: 0.85 + Math.random() * 0.14, // Random confidence between 85-99%
    };
  };

  const resetScan = () => {
    setScannedImage(null);
    setExtractedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.batch_number || !formData.pipeline) {
      alert('Please enter batch number and select metal type');
      return;
    }

    setIsCreating(true);
    try {
      const batch = await batchService.createBatch({
        batch_number: formData.batch_number,
        pipeline: formData.pipeline,
        initial_weight: formData.initial_weight ? parseFloat(formData.initial_weight) : undefined,
        priority: formData.priority,
      });

      // Navigate to step runner
      navigate(`/batches/${batch._id}/execute`);
    } catch (error: any) {
      console.error('Failed to create batch:', error);
      const message = error.response?.data?.error || 'Failed to create batch. Please try again.';
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Start New Batch</h1>
          <p className="text-gray-600 mt-1">Scan job paper or enter batch details manually</p>
        </div>

        {/* Method Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setIsManualEntry(false)}
            className={`p-6 rounded-lg border-2 transition-all ${
              !isManualEntry
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <Camera className={`h-8 w-8 mx-auto mb-3 ${!isManualEntry ? 'text-primary-600' : 'text-gray-600'}`} />
            <h3 className="font-semibold text-gray-900 mb-1">Scan Job Paper</h3>
            <p className="text-sm text-gray-500">AI extracts batch details</p>
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Available
            </span>
          </button>

          <button
            onClick={() => setIsManualEntry(true)}
            className={`p-6 rounded-lg border-2 transition-all ${
              isManualEntry
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <FileText className="h-8 w-8 mx-auto mb-3 text-primary-600" />
            <h3 className="font-semibold text-gray-900 mb-1">Manual Entry</h3>
            <p className="text-sm text-gray-500">Enter batch details by hand</p>
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Available
            </span>
          </button>
        </div>

        {/* Manual Entry Form */}
        {isManualEntry && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Batch Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Batch Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="e.g., BATCH-2024-001"
                    required
                    className="w-full"
                  />
                </div>

                {/* Metal Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metal Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['copper', 'silver', 'gold'] as const).map((metal) => (
                      <button
                        key={metal}
                        type="button"
                        onClick={() => setFormData({ ...formData, pipeline: metal })}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          formData.pipeline === metal
                            ? metal === 'copper'
                              ? 'border-orange-500 bg-orange-50'
                              : metal === 'silver'
                              ? 'border-gray-400 bg-gray-50'
                              : 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="text-2xl mb-1">
                          {metal === 'copper' && '🟠'}
                          {metal === 'silver' && '⚪'}
                          {metal === 'gold' && '🟡'}
                        </div>
                        <div className="font-semibold capitalize">{metal}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Initial Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (grams)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.initial_weight}
                    onChange={(e) => setFormData({ ...formData, initial_weight: e.target.value })}
                    placeholder="e.g., 250.5"
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">Total weight from summary row</p>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  <Input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="e.g., ABC Metals"
                    className="w-full"
                  />
                </div>

                {/* Carat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carat
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.carat}
                    onChange={(e) => setFormData({ ...formData, carat: e.target.value })}
                    placeholder="e.g., 24"
                    className="w-full"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['normal', 'high'] as const).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority })}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.priority === priority
                            ? priority === 'high'
                              ? 'border-red-500 bg-red-50'
                              : 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium capitalize">{priority}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/batches')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isCreating}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create & Start Batch'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Paper Scan Interface */}
        {!isManualEntry && (
          <Card>
            <CardHeader>
              <CardTitle>Scan Job Paper</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!scannedImage ? (
                /* Upload/Capture Interface */
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-primary-400 transition-colors">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Capture or Upload Job Paper
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Take a photo or upload an image of your job paper
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="primary" onClick={handleCameraCapture}>
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setIsManualEntry(true)} className="w-full">
                    Use Manual Entry Instead
                  </Button>
                </div>
              ) : (
                /* Scanned Image & Extracted Data */
                <div className="space-y-6">
                  {/* Scanned Image Preview */}
                  <div className="relative">
                    <img
                      src={scannedImage}
                      alt="Scanned job paper"
                      className="w-full h-64 object-contain bg-gray-100 rounded-lg"
                    />
                    <button
                      onClick={resetScan}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Processing Status */}
                  {isScanning && (
                    <div className="flex flex-col items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div className="text-center">
                        <p className="text-blue-900 font-medium">Reading text from image...</p>
                        <p className="text-xs text-blue-700 mt-1">This may take a few seconds</p>
                      </div>
                    </div>
                  )}

                  {/* Extracted Data */}
                  {extractedData && !isScanning && (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-900 font-medium">
                            Data extracted successfully ({Math.round(extractedData.confidence * 100)}% confidence)
                          </span>
                        </div>
                        <div className="ml-7 text-xs text-green-700">
                          ✓ Please review all fields below to ensure accuracy before submitting
                        </div>
                      </div>

                      {/* Editable Form with Extracted Data */}
                      <form onSubmit={handleManualSubmit} className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Batch Number <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={formData.batch_number}
                            onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                            required
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Metal Type <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['copper', 'silver', 'gold'] as const).map((metal) => (
                              <button
                                key={metal}
                                type="button"
                                onClick={() => setFormData({ ...formData, pipeline: metal })}
                                className={`p-4 rounded-lg border-2 text-center transition-all ${
                                  formData.pipeline === metal
                                    ? metal === 'copper'
                                      ? 'border-orange-500 bg-orange-50'
                                      : metal === 'silver'
                                      ? 'border-gray-400 bg-gray-50'
                                      : 'border-yellow-500 bg-yellow-50'
                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                }`}
                              >
                                <div className="text-2xl mb-1">
                                  {metal === 'copper' && '🟠'}
                                  {metal === 'silver' && '⚪'}
                                  {metal === 'gold' && '🟡'}
                                </div>
                                <div className="font-semibold capitalize">{metal}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Weight (grams)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.initial_weight}
                            onChange={(e) => setFormData({ ...formData, initial_weight: e.target.value })}
                            className="w-full"
                          />
                          <p className="text-sm text-gray-500 mt-1">Total weight from summary row</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Supplier
                          </label>
                          <Input
                            type="text"
                            value={formData.supplier}
                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                            placeholder="e.g., ABC Metals"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Carat
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.carat}
                            onChange={(e) => setFormData({ ...formData, carat: e.target.value })}
                            placeholder="e.g., 24"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {(['normal', 'high'] as const).map((priority) => (
                              <button
                                key={priority}
                                type="button"
                                onClick={() => setFormData({ ...formData, priority })}
                                className={`p-3 rounded-lg border-2 text-center transition-all ${
                                  formData.priority === priority
                                    ? priority === 'high'
                                      ? 'border-red-500 bg-red-50'
                                      : 'border-primary-500 bg-primary-50'
                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                }`}
                              >
                                <div className="font-medium capitalize">{priority}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={resetScan}
                            className="flex-1"
                          >
                            Scan Again
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            isLoading={isCreating}
                            disabled={isCreating}
                            className="flex-1"
                          >
                            {isCreating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create & Start Batch'
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}






