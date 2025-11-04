import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productionPlanService, ProductionPlan, ProductionPlanItem } from '../../services/productionPlanService';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, Eye, Lightbulb, Camera } from 'lucide-react';

export default function ProductionPlanUpload() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProductionPlan | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ocrErrors, setOcrErrors] = useState<string[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      setUploadError(null);
      setOcrErrors([]);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setOcrErrors([]);

    try {
      const result = await productionPlanService.uploadProductionPlan(selectedFile);

      if (result.success && result.data) {
        setUploadResult(result.data);
      } else {
        setUploadError(result.error || 'Upload failed');
        setOcrErrors(result.details || []);
      }
    } catch (error: any) {
      setUploadError(error.response?.data?.error || 'An error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadResult(null);
    setUploadError(null);
    setOcrErrors([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Production Plan Upload</h1>
              <p className="text-gray-600 mt-1">Upload and process production plan forms with OCR</p>
            </div>
          </div>
        </div>

        {/* Tips Section - Always Visible */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips for Best OCR Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Camera className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Lighting</p>
                      <p className="text-sm text-blue-700">Use bright, even lighting. Avoid shadows and glare on the form.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Form Alignment</p>
                      <p className="text-sm text-blue-700">Keep the form flat and straight. Avoid wrinkles or folds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Image Quality</p>
                      <p className="text-sm text-blue-700">Use high resolution (300+ DPI). Ensure text is sharp and clear.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Avoid</p>
                      <p className="text-sm text-blue-700">Blurry photos, rotated images, or forms with handwritten edits.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>💡 Pro Tip:</strong> Use a scanner or dedicated scanning app for best results. Photos taken with modern smartphones work well too!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select Production Plan Form
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a photo or scan of the production plan form
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button variant="primary">
                      Choose File
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Supported: JPG, PNG, PDF (Max 10MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary-600" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={handleReset}>
                      Remove
                    </Button>
                  </div>

                  {/* Preview */}
                  {previewUrl && (
                    <div className="border rounded-lg overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Production plan preview"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleUpload}
                    isLoading={isUploading}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Processing with OCR...' : 'Process Form'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {uploadResult ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : uploadError ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
                Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!uploadResult && !uploadError && (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p>Upload a form to see the extracted data</p>
                </div>
              )}

              {/* Success */}
              {uploadResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-700">
                      Production plan processed successfully!
                    </p>
                  </div>

                  {/* Key Information */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">Plan Number</span>
                      <span className="text-sm font-bold text-gray-900">{uploadResult.plan_number}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">Pass Number</span>
                      <span className="text-sm font-bold text-gray-900">{uploadResult.pass_number}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">OCR Confidence</span>
                      <span className={`text-sm font-bold ${uploadResult.ocr_confidence >= 0.9 ? 'text-green-600' : uploadResult.ocr_confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {(uploadResult.ocr_confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">Input Items</span>
                      <span className="text-sm font-bold text-gray-900">{uploadResult.input_items.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-gray-600">Total Weight</span>
                      <span className="text-sm font-bold text-gray-900">
                        {uploadResult.input_summary.total_weight.toFixed(3)} g
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-600">Total Gold Fine</span>
                      <span className="text-sm font-bold text-gray-900">
                        {uploadResult.input_summary.total_gold_fine.toFixed(3)} g
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => navigate(`/production-plans/${uploadResult._id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                    >
                      Upload Another
                    </Button>
                  </div>
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700">{uploadError}</p>
                      {ocrErrors.length > 0 && (
                        <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                          {ocrErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Tips for better OCR results:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Ensure good lighting and minimal shadows</li>
                    <li>Keep the form flat and aligned</li>
                    <li>Use high resolution images (300+ DPI)</li>
                    <li>Avoid blurry or rotated photos</li>
                  </ul>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleReset}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Input Items Preview */}
        {uploadResult && uploadResult.input_items.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Input Production Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Raw Weight</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Au %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Au Fine</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadResult.input_items.map((item: ProductionPlanItem, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.row_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.package_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.supplier}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{item.raw_weight.toFixed(3)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{item.gold_percent.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{item.gold_fine.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

