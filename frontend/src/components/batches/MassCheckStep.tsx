import { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ExceptionForm from './ExceptionForm';
import { Camera, AlertCircle, CheckCircle, Upload, X, RefreshCw } from 'lucide-react';
import { CheckTemplate } from '../../services/templateService';

interface MassCheckStepProps {
  template: CheckTemplate;
  batchNumber: string;
  station: string;
  initialWeight?: number; // Weight from the scanned production plan form
  onComplete: (data: { measured_mass: number; within_tolerance: boolean; photo?: File; ocr_confidence?: number }) => void;
  onFlagException: (data: { exception_type: string; reason: string; notes?: string }) => void;
}

export default function MassCheckStep({ template, batchNumber, station, initialWeight, onComplete, onFlagException }: MassCheckStepProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ text: string; confidence: number } | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use initial_weight from batch (scanned form) if available, otherwise fall back to template's expected_mass
  const expectedMass = initialWeight || template.expected_mass || 0;
  const tolerance = template.tolerance || 0.5;
  const toleranceUnit = template.tolerance_unit || 'g';

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setPhotoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setPhotoPreview(imageData);
      
      // Automatically process the image
      await processImageWithOCR(imageData);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithOCR = async (imageData: string) => {
    setIsProcessing(true);
    setOcrResult(null);
    
    let worker;
    try {
      // Create Tesseract worker
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          // Optional: Log progress
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Recognize text from image
      const { data: { text, confidence } } = await worker.recognize(imageData);
      
      console.log('OCR Raw Text:', text);
      console.log('OCR Confidence:', confidence);

      // Parse the text to find weight/mass values
      const parsedMass = extractMassFromText(text);
      
      if (parsedMass !== null) {
        setOcrResult({ text: parsedMass.toString(), confidence });
        setManualValue(parsedMass.toString());
      } else {
        setOcrResult({ text, confidence });
        alert('Could not extract mass value from image. Please enter manually or retake the photo.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      alert('Failed to process image. Please try again or enter manually.');
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setIsProcessing(false);
    }
  };

  const extractMassFromText = (text: string): number | null => {
    // Clean up the text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Try multiple patterns to extract weight
    const patterns = [
      // Direct number with optional decimal (e.g., "123.45", "1234.56")
      /(\d+\.?\d*)\s*(?:g|gram|grams|kg)?/i,
      // Weight label followed by number (e.g., "Weight: 123.45")
      /weight\s*:?\s*(\d+\.?\d*)/i,
      // Mass label followed by number (e.g., "Mass: 123.45")
      /mass\s*:?\s*(\d+\.?\d*)/i,
      // Just numbers with potential OCR errors (O→0, I→1, etc.)
      /([0-9O]{3,}\.?[0-9O]*)/i,
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let numStr = match[1];
        
        // Fix common OCR errors
        numStr = numStr.replace(/O/g, '0').replace(/I/g, '1').replace(/l/g, '1');
        
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 1000000) {
          return num;
        }
      }
    }

    return null;
  };

  const calculateTolerance = (measured: number): { withinTolerance: boolean; variance: number; variancePercent: number } => {
    const variance = measured - expectedMass;
    const variancePercent = expectedMass > 0 ? (variance / expectedMass) * 100 : 0;
    
    let withinTolerance = true;
    if (toleranceUnit === '%') {
      withinTolerance = Math.abs(variancePercent) <= tolerance;
    } else {
      withinTolerance = Math.abs(variance) <= tolerance;
    }

    return { withinTolerance, variance, variancePercent };
  };

  const handleSubmit = () => {
    const measuredMass = parseFloat(manualValue);
    
    if (isNaN(measuredMass) || measuredMass <= 0) {
      alert('Please enter a valid mass value');
      return;
    }

    const { withinTolerance } = calculateTolerance(measuredMass);

    // If out of tolerance, show exception form
    if (!withinTolerance) {
      setShowExceptionForm(true);
      return;
    }

    // Within tolerance - proceed normally
    onComplete({
      measured_mass: measuredMass,
      within_tolerance: true,
      photo: photoFile || undefined,
      ocr_confidence: ocrResult?.confidence,
    });
  };

  const handleExceptionSubmit = (exceptionData: { reason: string; notes?: string }) => {
    const measuredMass = parseFloat(manualValue);
    calculateTolerance(measuredMass);

    // Call the exception handler with full data
    onFlagException({
      exception_type: 'out_of_tolerance',
      reason: exceptionData.reason,
      notes: exceptionData.notes,
    });

    setShowExceptionForm(false);
  };

  const retakePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setOcrResult(null);
    setManualValue('');
    setUseManual(false);
  };

  const measuredMass = parseFloat(manualValue);
  const toleranceCheck = !isNaN(measuredMass) && measuredMass > 0 
    ? calculateTolerance(measuredMass) 
    : null;

  return (
    <>
      {/* Exception Form Modal */}
      {showExceptionForm && toleranceCheck && (
        <ExceptionForm
          batchNumber={batchNumber}
          station={station}
          exceptionType="out_of_tolerance"
          varianceInfo={{
            expected: expectedMass,
            measured: measuredMass,
            variance: toleranceCheck.variance,
            variancePercent: toleranceCheck.variancePercent,
          }}
          onSubmit={handleExceptionSubmit}
          onCancel={() => setShowExceptionForm(false)}
        />
      )}

      <div className="space-y-6">
      {/* Instructions */}
      <p className="text-gray-700 text-lg">{template.instructions}</p>

      {/* Expected Mass Display */}
      {expectedMass > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-900">Expected Mass:</span>
            <span className="text-2xl font-bold text-blue-900">
              {expectedMass.toLocaleString()}g
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Tolerance: ±{tolerance}{toleranceUnit}
          </p>
        </div>
      )}

      {/* Photo Capture Section */}
      {!photoPreview ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Take Photo of Scale Display
            </h3>
            <p className="text-gray-600 mb-6">
              Position camera to clearly capture the weight reading
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="camera-input"
            />

            <div className="flex gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5 mr-2" />
                Take Photo
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => setUseManual(true)}
              >
                <Upload className="h-5 w-5 mr-2" />
                Manual Entry
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Photo Preview */}
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img
              src={photoPreview}
              alt="Scale reading"
              className="w-full h-64 object-contain bg-gray-900"
            />
            <button
              onClick={retakePhoto}
              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
              title="Retake photo"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* OCR Processing Indicator */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                <p className="text-blue-800 font-medium">Processing image with AI OCR...</p>
              </div>
            </div>
          )}

          {/* OCR Result */}
          {ocrResult && !isProcessing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-800 font-medium">OCR Complete</p>
                  <p className="text-sm text-green-700 mt-1">
                    Confidence: {Math.round(ocrResult.confidence)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry or OCR Result */}
      {(useManual || photoPreview) && !isProcessing && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Measured Mass (grams) {ocrResult && '- Verify OCR Result'}
            </label>
            <Input
              type="number"
              step="0.01"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Enter mass from scale"
              className="w-full text-2xl font-bold"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {ocrResult 
                ? 'Please verify the OCR reading is correct, or adjust if needed' 
                : 'Enter the exact weight shown on the scale'}
            </p>
          </div>

          {/* Tolerance Indicator */}
          {toleranceCheck && (
            <div
              className={`rounded-lg p-4 border-2 ${
                toleranceCheck.withinTolerance
                  ? 'bg-green-50 border-green-500'
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {toleranceCheck.withinTolerance ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      toleranceCheck.withinTolerance ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {toleranceCheck.withinTolerance ? '✓ Within Tolerance' : '⚠️ Out of Tolerance'}
                  </p>
                  <div className="text-sm mt-2 space-y-1">
                    <p className={toleranceCheck.withinTolerance ? 'text-green-800' : 'text-red-800'}>
                      <span className="font-medium">Variance:</span>{' '}
                      {toleranceCheck.variance >= 0 ? '+' : ''}
                      {toleranceCheck.variance.toFixed(2)}g ({toleranceCheck.variancePercent.toFixed(2)}%)
                    </p>
                    <p className={toleranceCheck.withinTolerance ? 'text-green-700' : 'text-red-700'}>
                      <span className="font-medium">Measured:</span> {measuredMass.toFixed(2)}g
                    </p>
                    <p className={toleranceCheck.withinTolerance ? 'text-green-700' : 'text-red-700'}>
                      <span className="font-medium">Expected:</span> {expectedMass.toFixed(2)}g
                    </p>
                  </div>

                  {!toleranceCheck.withinTolerance && (
                    <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                      <p className="text-sm text-red-900 font-medium">
                        ⚠️ This will require supervisor approval to proceed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!manualValue || isNaN(measuredMass) || measuredMass <= 0}
            className="w-full"
          >
            {toleranceCheck?.withinTolerance ? 'Continue ✓' : 'Flag for Review'}
          </Button>

          {/* Retake Option */}
          {photoPreview && (
            <Button
              variant="secondary"
              onClick={retakePhoto}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake Photo
            </Button>
          )}
        </div>
      )}

      {/* Info Note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>📸 Photo Evidence:</strong> All mass checks are photographed and OCR-processed for audit compliance.
          {ocrResult && ocrResult.confidence < 85 && (
            <span className="block mt-1 text-yellow-700">
              ⚠️ Low OCR confidence - please verify the reading carefully.
            </span>
          )}
        </p>
      </div>
    </div>
    </>
  );
}

