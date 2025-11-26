import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorker, PSM } from 'tesseract.js';
import { batchService } from '../../services/batchService';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { 
  Camera, 
  QrCode, 
  Scan, 
  Radio, 
  Scale, 
  Mic, 
  FileText, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Upload,
  X
} from 'lucide-react';

type StartMethod = 'camera' | 'devices' | 'manual';
type CameraOption = 'paper' | 'qr' | 'barcode';
type DeviceOption = 'scale' | 'rfid';
type ManualOption = 'voice' | 'type';

export default function ScanBatch() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  // Modal state
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  
  // Step 1: Start method selection
  const [selectedMethod, setSelectedMethod] = useState<StartMethod | null>(null);
  const [selectedCameraOption, setSelectedCameraOption] = useState<CameraOption | null>(null);
  const [selectedDeviceOption, setSelectedDeviceOption] = useState<DeviceOption | null>(null);
  const [selectedManualOption, setSelectedManualOption] = useState<ManualOption | null>(null);
  
  // Step 2: Form data
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    batch_number: '',
    pipeline: '' as 'copper' | 'silver' | 'gold' | '',
    initial_weight: '',
    priority: 'normal' as 'normal' | 'high',
    supplier: '',
    carat: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle file selection for paper scanning
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please select an image file (JPG, PNG) or PDF');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Please choose a file smaller than 10MB.');
      return;
    }

    // For PDFs, show message (OCR doesn't work on PDFs directly)
    if (file.type === 'application/pdf') {
      alert('PDF files are not supported for automatic scanning. Please convert to an image (JPG or PNG) first, or use manual entry.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setScannedImage(imageData);
      
      // Close modal if open
      setShowPhotoUploadModal(false);
      
      // Automatically proceed to Step 2 after file is selected
      setCurrentStep(2);
      
      // Process the image for OCR
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const preprocessImage = (imageData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Scale up for better OCR accuracy (3x for small text)
        const scale = 3;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Enhanced preprocessing: grayscale, contrast enhancement, adaptive thresholding
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert to grayscale with better weights
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Enhance contrast (make dark text darker, light background lighter)
          const contrast = 1.8;
          gray = (gray - 128) * contrast + 128;
          
          // Adaptive thresholding - better for varying lighting
          const threshold = 140;
          const value = gray > threshold ? 255 : 0;
          
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
          // Keep alpha channel
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  };

  const processImage = async (imageData: string) => {
    setIsScanning(true);
    let worker;
    try {
      const processedImage = await preprocessImage(imageData);
      worker = await createWorker('eng', 1);
      
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,%:-/()',
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: PSM.AUTO_OSD, // Auto orientation and script detection
        tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine only
        classify_bln_numeric_mode: '1', // Better number recognition
        textord_min_linesize: '2.5', // Better for small text
      });
      
      const { data: { text, confidence } } = await worker.recognize(processedImage);
      
      // Log OCR results for debugging
      console.log('OCR Confidence:', confidence);
      console.log('OCR Raw Text (first 500 chars):', text.substring(0, 500));
      
      const parsedData = parseOcrText(text);
      
      console.log('Parsed Batch Number:', parsedData.batch_number);
      console.log('Parsed Pipeline:', parsedData.pipeline);
      
      // If confidence is low, warn the user
      if (confidence < 70) {
        console.warn('Low OCR confidence:', confidence, '- results may be inaccurate');
      }
      
      setFormData({
        batch_number: parsedData.batch_number,
        pipeline: parsedData.pipeline,
        initial_weight: parsedData.initial_weight,
        priority: parsedData.priority,
        supplier: parsedData.supplier || '',
        carat: parsedData.carat || '',
      });
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Could not read the image. Please try again or use manual entry.');
    } finally {
      if (worker) await worker.terminate();
      setIsScanning(false);
    }
  };

  const parseOcrText = (text: string) => {
    const lowerText = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let batchNumber = '';
    
    // Strategy 1: Look for number next to "START TIME" (most reliable for this form)
    const startTimeIndex = lines.findIndex(l => /start\s+time/i.test(l));
    if (startTimeIndex !== -1) {
      // Check the same line and next few lines for isolated numbers
      for (let i = startTimeIndex; i < Math.min(startTimeIndex + 3, lines.length); i++) {
        const line = lines[i];
        // Look for isolated 3-4 digit numbers (likely in a box)
        const isolatedNumbers = line.match(/\b(\d{3,4})\b/g);
        if (isolatedNumbers) {
          for (const num of isolatedNumbers) {
            // Exclude years (19xx, 20xx) and dates
            if (!num.match(/^(19|20)\d{2}$/) && num.length >= 3) {
              batchNumber = num;
              break;
            }
          }
          if (batchNumber) break;
        }
        // Also check for numbers that appear after "START TIME" on the same line
        const afterStartTime = line.split(/start\s+time/i)[1];
        if (afterStartTime) {
          const numMatch = afterStartTime.match(/\b(\d{3,4})\b/);
          if (numMatch && !numMatch[1].match(/^(19|20)\d{2}$/)) {
            batchNumber = numMatch[1];
            break;
          }
        }
      }
    }
    
    // Strategy 2: Look for "PRODUCTION PLAN FORM" and extract nearby numbers
    if (!batchNumber) {
      const formIndex = lines.findIndex(l => /production\s+plan\s+form/i.test(l));
      if (formIndex !== -1) {
        // Check lines around the form title
        for (let i = Math.max(0, formIndex - 2); i < Math.min(formIndex + 5, lines.length); i++) {
          const line = lines[i];
          // Look for isolated 3-4 digit numbers
          const numbers = line.match(/\b(\d{3,4})\b/g);
          if (numbers) {
            for (const num of numbers) {
              if (!num.match(/^(19|20)\d{2}$/) && num.length >= 3) {
                // Prefer numbers that appear alone or in short contexts
                const context = line.replace(/[^\d\s]/g, '').trim();
                if (context.length <= 6 || line.match(new RegExp(`\\b${num}\\b`))) {
                  batchNumber = num;
                  break;
                }
              }
            }
            if (batchNumber) break;
          }
        }
      }
    }
    
    // Strategy 3: Look near "METAL CONCENTRATORS" header
    if (!batchNumber) {
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('metal') && lowerLine.includes('concentrator')) {
          const numbersOnLine = line.match(/\b(\d{3,4})\b/g);
          if (numbersOnLine && numbersOnLine.length > 0) {
            for (const num of numbersOnLine) {
              if (!num.match(/^(19|20)\d{2}$/) && num.length >= 3) {
                batchNumber = num;
                break;
              }
            }
            if (batchNumber) break;
          }
        }
      }
    }
    
    // Strategy 4: Look for isolated numbers in header area (first 8 lines)
    if (!batchNumber) {
      for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i].trim();
        // Skip lines that are clearly dates or times
        if (line.match(/\d{4}[\/\-]\d{2}[\/\-]\d{2}/) || line.match(/\d{2}:\d{2}/)) {
          continue;
        }
        // Look for isolated 3-4 digit numbers
        const isolatedMatch = line.match(/^\s*(\d{3,4})\s*$/);
        if (isolatedMatch && !isolatedMatch[1].match(/^(19|20)\d{2}$/)) {
          batchNumber = isolatedMatch[1];
          break;
        }
        // Look for numbers at end of line
        const endNumberMatch = line.match(/\s+(\d{3,4})\s*$/);
        if (endNumberMatch && !endNumberMatch[1].match(/^(19|20)\d{2}$/)) {
          batchNumber = endNumberMatch[1];
          break;
        }
      }
    }
    
    // Strategy 5: Fallback - use current timestamp
    if (!batchNumber) {
      batchNumber = Date.now().toString().slice(-4);
    }
    
    // Determine metal type by analyzing actual percentage values in the table columns
    let pipeline: 'copper' | 'silver' | 'gold' = 'copper';
    
    const silverPercentages: number[] = [];
    const goldPercentages: number[] = [];
    
    // Find the table header row with % SILVER and % GOLD columns
    const headerIndex = lines.findIndex(l => {
      const lower = l.toLowerCase();
      return (lower.includes('% silver') || lower.includes('silver %') || lower.includes('silver')) && 
             (lower.includes('% gold') || lower.includes('gold %') || lower.includes('gold'));
    });
    
    if (headerIndex !== -1) {
      // Found the header, now parse data rows below it
      // Look for rows that have numeric data (not empty, not summary)
      for (let i = headerIndex + 1; i < Math.min(headerIndex + 25, lines.length); i++) {
        const line = lines[i].trim();
        
        // Stop at summary or empty sections
        if (!line || 
            line.toLowerCase().includes('summary') || 
            line.toLowerCase().includes('out production') ||
            line.toLowerCase().includes('no destination')) {
          break;
        }
        
        // Look for lines with multiple numbers (likely a data row)
        // Extract all percentage values from the line
        const percentPattern = /(\d+\.?\d*)\s*%/g;
        const percentMatches = [...line.matchAll(percentPattern)];
        
        if (percentMatches.length >= 2) {
          // We found multiple percentages - likely % SILVER and % GOLD
          // In the table structure, % SILVER typically comes before % GOLD
          // Extract both percentages
          const firstPercent = parseFloat(percentMatches[0]?.[1] || '0');
          const secondPercent = parseFloat(percentMatches[1]?.[1] || '0');
          
          // Validate they're reasonable percentages (0-100)
          if (!isNaN(firstPercent) && firstPercent >= 0 && firstPercent <= 100) {
            silverPercentages.push(firstPercent);
          }
          if (!isNaN(secondPercent) && secondPercent >= 0 && secondPercent <= 100) {
            goldPercentages.push(secondPercent);
          }
        } else if (percentMatches.length === 1) {
          // Single percentage - might be in a column, but we need context
          // Skip for now as we can't determine which column it's in
        }
      }
    }
    
    // If we didn't find percentages in structured rows, try a simpler approach:
    // Look for any lines with percentage values and check which metal is mentioned
    if (silverPercentages.length === 0 && goldPercentages.length === 0) {
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const percentMatches = line.match(/(\d+\.?\d*)\s*%/g);
        
        if (percentMatches) {
          const percent = parseFloat(percentMatches[0]?.replace('%', '') || '0');
          if (!isNaN(percent) && percent > 0 && percent <= 100) {
            if (lowerLine.includes('silver') && !lowerLine.includes('gold')) {
              silverPercentages.push(percent);
            } else if (lowerLine.includes('gold') && !lowerLine.includes('silver')) {
              goldPercentages.push(percent);
            }
          }
        }
      }
    }
    
    // Calculate average percentages to determine dominant metal
    const avgSilver = silverPercentages.length > 0
      ? silverPercentages.reduce((a, b) => a + b, 0) / silverPercentages.length
      : 0;
    const avgGold = goldPercentages.length > 0
      ? goldPercentages.reduce((a, b) => a + b, 0) / goldPercentages.length
      : 0;
    
    // Determine pipeline: whichever metal has significantly higher percentage
    // Threshold: if one metal has >5% average and the other is <1%, choose the higher one
    if (avgGold > 5 && avgSilver < 1) {
      pipeline = 'gold';
    } else if (avgSilver > 5 && avgGold < 1) {
      pipeline = 'silver';
    } else if (avgGold > avgSilver && avgGold > 1) {
      pipeline = 'gold';
    } else if (avgSilver > avgGold && avgSilver > 1) {
      pipeline = 'silver';
    } else if (lowerText.includes('copper') || lowerText.includes('cu ')) {
      pipeline = 'copper';
    } else {
      // Fallback: check if any individual percentages are significant
      const maxGold = goldPercentages.length > 0 ? Math.max(...goldPercentages) : 0;
      const maxSilver = silverPercentages.length > 0 ? Math.max(...silverPercentages) : 0;
      
      if (maxGold > maxSilver && maxGold > 1) {
        pipeline = 'gold';
      } else if (maxSilver > maxGold && maxSilver > 1) {
        pipeline = 'silver';
      }
    }
    
    console.log('Metal Detection:', { 
      avgSilver: avgSilver.toFixed(2), 
      avgGold: avgGold.toFixed(2), 
      sampleCounts: { silver: silverPercentages.length, gold: goldPercentages.length },
      pipeline 
    });
    
    let initialWeight = '';
    
    // Strategy 1: Find weight from table summary row (bottom right area)
    // Look for the table header to identify weight column position
    const weightColumnKeywords = ['p. weight', 'f weight', 'weight', 'p weight', 'pure weight', 'fine weight'];
    let weightColumnIndex = -1;
    
    // Find the header row with weight column
    const weightHeaderIndex = lines.findIndex(l => {
      const lower = l.toLowerCase();
      const hasWeight = weightColumnKeywords.some(keyword => lower.includes(keyword));
      const hasColumns = lower.includes('supplier') || lower.includes('no') || lower.includes('pc num');
      return hasWeight && hasColumns;
    });
    
    if (weightHeaderIndex !== -1) {
      // Found header, determine which column is weight
      const headerLine = lines[weightHeaderIndex].toLowerCase();
      const headerParts = headerLine.split(/\s{2,}|\t/).filter(p => p.trim());
      
      // Find weight column index
      for (let i = 0; i < headerParts.length; i++) {
        const part = headerParts[i].toLowerCase();
        if (weightColumnKeywords.some(keyword => part.includes(keyword))) {
          weightColumnIndex = i;
          break;
        }
      }
      
      // Now find the summary row (usually at the bottom of the table)
      const summaryIndex = lines.findIndex((l, idx) => {
        if (idx <= weightHeaderIndex) return false;
        const lower = l.toLowerCase();
        return lower.includes('summary') || 
               lower.includes('total') || 
               (lower.includes('carolt') || lower.includes('carat')); // Common summary row identifier
      });
      
      if (summaryIndex !== -1) {
        const summaryLine = lines[summaryIndex];
        // Try to split by multiple spaces or tabs (table format)
        const summaryParts = summaryLine.split(/\s{2,}|\t/).filter(p => p.trim());
        
        // If we found the weight column index, use it
        if (weightColumnIndex >= 0 && summaryParts.length > weightColumnIndex) {
          const weightValue = summaryParts[weightColumnIndex].trim();
          // Extract number from the value (remove any non-numeric characters except comma and period)
          const weightMatch = weightValue.match(/[\d,]+\.?\d*/);
          if (weightMatch) {
            const weightNum = parseFloat(weightMatch[0].replace(/,/g, ''));
            if (!isNaN(weightNum) && weightNum >= 10 && weightNum <= 1000000) {
              initialWeight = weightMatch[0].replace(/,/g, '');
            }
          }
        } else {
          // Fallback: look for large numbers in the summary row (likely weight totals)
          // Weight is usually one of the larger numbers in the summary
          const numbersInSummary = summaryLine.match(/[\d,]+\.?\d*/g);
          if (numbersInSummary) {
            // Find the largest reasonable number (likely total weight)
            let maxWeight = 0;
            for (const numStr of numbersInSummary) {
              const num = parseFloat(numStr.replace(/,/g, ''));
              if (!isNaN(num) && num >= 100 && num <= 1000000 && num > maxWeight) {
                maxWeight = num;
                initialWeight = numStr.replace(/,/g, '');
              }
            }
          }
        }
      }
    }
    
    // Strategy 2: If no weight found, look for summary section with large numbers
    if (!initialWeight) {
      const summaryIndex = lines.findIndex(l => /summary/i.test(l));
      if (summaryIndex !== -1) {
        // Look in summary row and a few rows after
        for (let i = summaryIndex; i < Math.min(summaryIndex + 5, lines.length); i++) {
          const line = lines[i];
          // Look for numbers with commas (formatted large numbers)
          const largeNumbers = line.match(/[\d,]+\.?\d*/g);
          if (largeNumbers) {
            for (const numStr of largeNumbers) {
              const num = parseFloat(numStr.replace(/,/g, ''));
              // Weight is typically a large number (100+ and reasonable max)
              if (!isNaN(num) && num >= 100 && num <= 1000000) {
                initialWeight = numStr.replace(/,/g, '');
                break;
              }
            }
            if (initialWeight) break;
          }
        }
      }
    }
    
    // Strategy 3: Look for weight patterns in the text
    if (!initialWeight) {
      const weightPatterns = [
        /(?:total|sum|weight)[:\s]+([\d,]+\.?\d*)/i,
        /([\d,]+\.?\d*)\s*(?:kg|g|weight)/i,
      ];
      
      for (const pattern of weightPatterns) {
        const match = text.match(pattern);
        if (match) {
          const num = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(num) && num >= 10 && num <= 1000000) {
            initialWeight = match[1].replace(/,/g, '');
            break;
          }
        }
      }
    }
    
    console.log('Weight Detection:', { initialWeight, weightColumnIndex });
    
    // Extract supplier from table column (third from the right)
    let supplier = '';
    
    // Strategy 1: Find supplier from table column
    // Find the header row with SUPPLIER column
    const supplierHeaderIndex = lines.findIndex(l => {
      const lower = l.toLowerCase();
      return lower.includes('supplier') && 
             (lower.includes('no') || lower.includes('pc num') || lower.includes('drill'));
    });
    
    if (supplierHeaderIndex !== -1) {
      const headerLine = lines[supplierHeaderIndex];
      const headerParts = headerLine.split(/\s{2,}|\t/).filter(p => p.trim());
      
      // Find supplier column index
      let supplierColumnIndex = -1;
      for (let i = 0; i < headerParts.length; i++) {
        const part = headerParts[i].toLowerCase();
        if (part.includes('supplier')) {
          supplierColumnIndex = i;
          break;
        }
      }
      
      // If supplier column not found by name, try "third from the right"
      if (supplierColumnIndex === -1 && headerParts.length >= 3) {
        // Count from right: rightmost is index length-1, third from right is length-3
        supplierColumnIndex = headerParts.length - 3;
      }
      
      if (supplierColumnIndex >= 0) {
        // Extract supplier from data rows
        const suppliers: string[] = [];
        
        for (let i = supplierHeaderIndex + 1; i < Math.min(supplierHeaderIndex + 25, lines.length); i++) {
          const line = lines[i].trim();
          
          // Stop at summary or empty sections
          if (!line || 
              line.toLowerCase().includes('summary') || 
              line.toLowerCase().includes('out production') ||
              line.toLowerCase().includes('no destination')) {
            break;
          }
          
          // Skip lines that are clearly not data rows (e.g., just numbers or dates)
          if (line.match(/^\d+[\/\-]\d+[\/\-]\d+/)) continue;
          
          // Split by multiple spaces or tabs (table format)
          const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());
          
          if (parts.length > supplierColumnIndex) {
            const supplierValue = parts[supplierColumnIndex].trim();
            
            // Validate it looks like a supplier name (has letters, not just numbers)
            if (supplierValue && 
                supplierValue.match(/[A-Za-z]/) && 
                supplierValue.length > 2 &&
                !supplierValue.match(/^\d+\.?\d*%?$/)) {
              suppliers.push(supplierValue);
            }
          }
        }
        
        // Use the most common supplier, or first one found
        if (suppliers.length > 0) {
          // Count occurrences
          const supplierCounts: Record<string, number> = {};
          suppliers.forEach(s => {
            supplierCounts[s] = (supplierCounts[s] || 0) + 1;
          });
          
          // Find most common
          let maxCount = 0;
          let mostCommon = suppliers[0];
          for (const [name, count] of Object.entries(supplierCounts)) {
            if (count > maxCount) {
              maxCount = count;
              mostCommon = name;
            }
          }
          
          supplier = mostCommon;
        }
      }
    }
    
    // Strategy 2: Fallback - simple pattern match
    if (!supplier) {
      const supplierMatch = text.match(/supplier[:\s]+([A-Za-z0-9\s&().-]+?)(?:\s{2,}|\d|$|%|silver|gold)/i);
      if (supplierMatch) {
        supplier = supplierMatch[1].trim();
      }
    }
    
    console.log('Supplier Detection:', { supplier });
    
    let carat = '';
    const caratMatch = text.match(/carat[:\s]+(\d+(?:\.\d+)?)/i);
    if (caratMatch) {
      carat = caratMatch[1];
    }
    
    return {
      batch_number: batchNumber,
      pipeline,
      initial_weight: initialWeight,
      priority: 'normal' as const,
      supplier,
      carat,
    };
  };

  // Handle method selection
  const handleMethodSelect = (method: StartMethod) => {
    setSelectedMethod(method);
    // Clear sub-options when switching methods
    setSelectedCameraOption(null);
    setSelectedDeviceOption(null);
    setSelectedManualOption(null);
  };

  const handleSubOptionSelect = (
    method: StartMethod,
    option: CameraOption | DeviceOption | ManualOption
  ) => {
    if (method === 'camera') {
      setSelectedCameraOption(option as CameraOption);
      // If paper scan, show modal for photo/upload options
      if (option === 'paper') {
        setShowPhotoUploadModal(true);
      } else {
        // For QR and barcode, proceed to step 2
        setCurrentStep(2);
      }
    } else if (method === 'devices') {
      setSelectedDeviceOption(option as DeviceOption);
      // Proceed to step 2 for device options
      setCurrentStep(2);
    } else if (method === 'manual') {
      setSelectedManualOption(option as ManualOption);
      if (option === 'type') {
        // Move to step 2 for manual entry
        setCurrentStep(2);
      } else if (option === 'voice') {
        // For voice, proceed to step 2
        setCurrentStep(2);
      }
    }
  };
  
  const handlePhotoUploadChoice = (choice: 'photo' | 'upload') => {
    setShowPhotoUploadModal(false);
    if (choice === 'photo' || choice === 'upload') {
      fileInputRef.current?.click();
    }
  };

  // Check if we can proceed to step 2
  const canProceedToStep2 = () => {
    if (selectedMethod === 'camera' && selectedCameraOption) return true;
    if (selectedMethod === 'devices' && selectedDeviceOption) return true;
    if (selectedMethod === 'manual' && selectedManualOption) return true;
    return false;
  };


  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.batch_number.trim()) {
      newErrors.batch_number = 'Batch number is required.';
    }
    
    if (!formData.pipeline) {
      newErrors.pipeline = 'Please choose a metal type.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      if (!formData.pipeline || (formData.pipeline !== 'copper' && formData.pipeline !== 'silver' && formData.pipeline !== 'gold')) {
        setErrors({ ...errors, pipeline: 'Please choose a metal type.' });
        setIsCreating(false);
        return;
      }
      
      const batch = await batchService.createBatch({
        batch_number: formData.batch_number,
        pipeline: formData.pipeline as 'copper' | 'silver' | 'gold',
        initial_weight: formData.initial_weight ? parseFloat(formData.initial_weight) : undefined,
        priority: formData.priority,
      });

      navigate(`/batches/${batch._id}/execute`);
    } catch (error: any) {
      console.error('Failed to create batch:', error);
      const message = error.response?.data?.error || 'Failed to create batch. Please try again.';
      alert(message);
    } finally {
      setIsCreating(false);
    }
  };

  // Get selected option summary text
  const getSelectedSummary = () => {
    if (selectedMethod === 'camera' && selectedCameraOption) {
      const options = {
        paper: 'Scan Job Paper',
        qr: 'Scan QR Code',
        barcode: 'Scan Barcode',
      };
      return `Use Phone Camera – ${options[selectedCameraOption]}`;
    }
    if (selectedMethod === 'devices' && selectedDeviceOption) {
      const options = {
        scale: 'IoT Scale',
        rfid: 'RFID / NFC Tag',
      };
      return `Use Devices – ${options[selectedDeviceOption]}`;
    }
    if (selectedMethod === 'manual' && selectedManualOption) {
      const options = {
        voice: 'Voice Input',
        type: 'Manual Entry',
      };
      return `Type or Speak Details – ${options[selectedManualOption]}`;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Start New Batch
          </h1>
          {currentStep === 1 && (
            <p className="text-base sm:text-lg text-gray-700">
              First choose how you want to start.
            </p>
          )}
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold ${
                currentStep >= 1
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {currentStep > 1 ? <CheckCircle className="h-6 w-6" /> : '1'}
              </div>
              <span className={`text-sm font-medium ${
                currentStep >= 1 ? 'text-primary-600' : 'text-gray-400'
              }`}>
                Choose Method
              </span>
            </div>
            
            {/* Connector */}
            <div className={`h-0.5 w-16 sm:w-24 ${
              currentStep >= 2 ? 'bg-primary-500' : 'bg-gray-300'
            }`} />
            
            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold ${
                currentStep >= 2
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${
                currentStep >= 2 ? 'text-primary-600' : 'text-gray-400'
              }`}>
                Enter Details
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: Choose How to Start */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Three Main Option Cards - Vertical Stack */}
            <div className="space-y-4 sm:space-y-6">
              {/* Option 1: Camera Scan */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedMethod === 'camera'
                    ? 'ring-4 ring-primary-500 ring-offset-2 bg-primary-50'
                    : 'hover:shadow-lg hover:scale-[1.02]'
                }`}
                onClick={() => handleMethodSelect('camera')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${
                      selectedMethod === 'camera' ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <Camera className={`h-6 w-6 sm:h-8 sm:w-8 ${
                        selectedMethod === 'camera' ? 'text-primary-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        Use Phone Camera
                      </h3>
                      {selectedMethod === 'camera' && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Take a photo or scan a code.
                  </p>
                  
                  {/* Sub-options */}
                  {selectedMethod === 'camera' && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubOptionSelect('camera', 'paper');
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedCameraOption === 'paper'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Camera className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Scan Job Paper</div>
                            <div className="text-xs text-gray-600">Take a photo or upload a file.</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubOptionSelect('camera', 'qr');
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedCameraOption === 'qr'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <QrCode className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Scan QR Code</div>
                            <div className="text-xs text-gray-600">Point the camera at the QR code.</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubOptionSelect('camera', 'barcode');
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedCameraOption === 'barcode'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Scan className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Scan Barcode</div>
                            <div className="text-xs text-gray-600">Scan the barcode on the label.</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Option 2: Bluetooth / RFID */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedMethod === 'devices'
                    ? 'ring-4 ring-primary-500 ring-offset-2 bg-primary-50'
                    : 'hover:shadow-lg hover:scale-[1.02] opacity-90'
                }`}
                onClick={() => handleMethodSelect('devices')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${
                      selectedMethod === 'devices' ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <Radio className={`h-6 w-6 sm:h-8 sm:w-8 ${
                        selectedMethod === 'devices' ? 'text-primary-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        Use Devices
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Read from scale or tag.
                  </p>
                  
                  {/* Sub-options */}
                  {selectedMethod === 'devices' && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                      <div className="w-full p-3 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
                        <div className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-500">IoT Scale</div>
                            <div className="text-xs text-gray-400">Read weight from a digital scale.</div>
                          </div>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                            Coming soon
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full p-3 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
                        <div className="flex items-center gap-2">
                          <Radio className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-500">RFID / NFC Tag</div>
                            <div className="text-xs text-gray-400">Tap a tag with your phone.</div>
                          </div>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                            Not available
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Option 3: Manual Insert */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedMethod === 'manual'
                    ? 'ring-4 ring-primary-500 ring-offset-2 bg-primary-50'
                    : 'hover:shadow-lg hover:scale-[1.02]'
                }`}
                onClick={() => handleMethodSelect('manual')}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-lg ${
                      selectedMethod === 'manual' ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <FileText className={`h-6 w-6 sm:h-8 sm:w-8 ${
                        selectedMethod === 'manual' ? 'text-primary-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        Type or Speak Details
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Good if you don't want to scan.
                  </p>
                  
                  {/* Sub-options */}
                  {selectedMethod === 'manual' && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubOptionSelect('manual', 'voice');
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedManualOption === 'voice'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Mic className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Voice Input</div>
                            <div className="text-xs text-gray-600">Speak the batch details.</div>
                          </div>
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Available
                          </span>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubOptionSelect('manual', 'type');
                        }}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedManualOption === 'type'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">Manual Entry</div>
                            <div className="text-xs text-gray-600">Type in the batch details.</div>
                          </div>
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Available
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Selected Summary - shown when option is selected but waiting for action */}
            {canProceedToStep2() && currentStep === 1 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-blue-900 font-medium">
                    You chose: {getSelectedSummary()}
                  </p>
                </div>
              </div>
            )}

            {/* Hidden file input for paper scanning and uploads */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Photo/Upload Modal */}
        {showPhotoUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Scan Job Paper
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowPhotoUploadModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-gray-600 mb-6">
                  Choose how you want to add your job paper:
                </p>
                
                <button
                  type="button"
                  onClick={() => handlePhotoUploadChoice('photo')}
                  className="w-full p-6 rounded-lg border-2 border-primary-500 bg-primary-50 hover:bg-primary-100 transition-all flex items-center justify-center gap-3"
                >
                  <Camera className="h-6 w-6 text-primary-600" />
                  <span className="font-semibold text-lg text-primary-900">Take Photo</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handlePhotoUploadChoice('upload')}
                  className="w-full p-6 rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                >
                  <Upload className="h-6 w-6 text-gray-600" />
                  <span className="font-semibold text-lg text-gray-900">Upload File</span>
                </button>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  Supported formats: JPG, PNG, PDF
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Enter Batch Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Enter Batch Details
              </h2>
              <p className="text-base sm:text-lg text-gray-700">
                Fill in these boxes to tell us about this batch.
              </p>
            </div>

            {/* Processing Status for Paper Scan */}
            {isScanning && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="text-center">
                    <p className="text-blue-900 font-semibold text-lg">Reading your photo...</p>
                    <p className="text-sm text-blue-700 mt-1">This may take a few seconds</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area for Paper Scan (if selected but no image yet) */}
            {selectedMethod === 'camera' && selectedCameraOption === 'paper' && !scannedImage && !isScanning && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center bg-white">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      Upload or Take Photo
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                      Choose a file from your device or take a new photo
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-initial"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-initial"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload File
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: JPG, PNG, PDF
                  </p>
                </div>
              </div>
            )}

            {/* Scanned Image Preview */}
            {scannedImage && !isScanning && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-900 font-medium">
                      File uploaded! Please check the details below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedImage(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <img
                  src={scannedImage}
                  alt="Uploaded job paper"
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-200"
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Batch Number */}
              <div>
                <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Batch Number <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.batch_number}
                  onChange={(e) => {
                    setFormData({ ...formData, batch_number: e.target.value });
                    if (errors.batch_number) {
                      setErrors({ ...errors, batch_number: '' });
                    }
                  }}
                  placeholder="For example: BATCH-2024-001"
                  required
                  className={`w-full text-base sm:text-lg py-3 ${
                    errors.batch_number ? 'border-red-500' : ''
                  }`}
                />
                {errors.batch_number && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-600">{errors.batch_number}</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  Any number or code you use for this batch.
                </p>
              </div>

              {/* Metal Type */}
              <div>
                <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Metal Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {(['copper', 'silver', 'gold'] as const).map((metal) => (
                    <button
                      key={metal}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, pipeline: metal });
                        if (errors.pipeline) {
                          setErrors({ ...errors, pipeline: '' });
                        }
                      }}
                      className={`p-4 sm:p-6 rounded-lg border-4 text-center transition-all ${
                        formData.pipeline === metal
                          ? metal === 'copper'
                            ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                            : metal === 'silver'
                            ? 'border-gray-400 bg-gray-50 shadow-lg scale-105'
                            : 'border-yellow-500 bg-yellow-50 shadow-lg scale-105'
                          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                      }`}
                    >
                      <div className="text-4xl sm:text-5xl mb-2">
                        {metal === 'copper' && '🟠'}
                        {metal === 'silver' && '⚪'}
                        {metal === 'gold' && '🟡'}
                      </div>
                      <div className="font-bold text-base sm:text-lg capitalize text-gray-900">
                        {metal}
                      </div>
                    </button>
                  ))}
                </div>
                {errors.pipeline && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-600">{errors.pipeline}</p>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Weight (grams)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.initial_weight}
                  onChange={(e) => setFormData({ ...formData, initial_weight: e.target.value })}
                  placeholder="For example: 250.5"
                  className="w-full text-base sm:text-lg py-3"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Total weight from the summary or scale.
                </p>
              </div>

              {/* Supplier (Optional) */}
              <div>
                <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Supplier
                </label>
                <Input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="For example: ABC Metals"
                  className="w-full text-base sm:text-lg py-3"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Who supplied this batch? (Optional)
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {(['normal', 'high'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority })}
                      className={`p-4 sm:p-5 rounded-lg border-4 text-center transition-all ${
                        formData.priority === priority
                          ? priority === 'high'
                            ? 'border-red-500 bg-red-50 shadow-lg scale-105'
                            : 'border-primary-500 bg-primary-50 shadow-lg scale-105'
                          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                      }`}
                    >
                      <div className="font-bold text-base sm:text-lg capitalize text-gray-900">
                        {priority === 'high' ? 'High Priority' : 'Normal Priority'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t-2 border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 sm:flex-initial sm:min-w-[150px] text-base sm:text-lg py-3 sm:py-4"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isCreating}
                  disabled={isCreating || !formData.batch_number || !formData.pipeline}
                  className="flex-1 sm:flex-initial sm:min-w-[200px] text-base sm:text-lg py-3 sm:py-4"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Batch'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
