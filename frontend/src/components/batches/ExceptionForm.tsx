import { useState } from 'react';
import Button from '../ui/Button';
import { Card } from '../ui/Card';
import { AlertCircle, FileText, User } from 'lucide-react';

interface ExceptionFormProps {
  batchNumber: string;
  station: string;
  exceptionType: 'out_of_tolerance' | 'process_failure' | 'equipment_issue' | 'other';
  varianceInfo?: {
    expected: number;
    measured: number;
    variance: number;
    variancePercent: number;
  };
  onSubmit: (data: { reason: string; notes?: string }) => void;
  onCancel: () => void;
}

export default function ExceptionForm({
  batchNumber,
  station,
  exceptionType,
  varianceInfo,
  onSubmit,
  onCancel,
}: ExceptionFormProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Please provide a reason for this exception');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ reason: reason.trim(), notes: notes.trim() || undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExceptionTitle = () => {
    switch (exceptionType) {
      case 'out_of_tolerance':
        return 'Out of Tolerance - Requires Explanation';
      case 'process_failure':
        return 'Process Failure Exception';
      case 'equipment_issue':
        return 'Equipment Issue Exception';
      case 'other':
        return 'Exception Report';
      default:
        return 'Exception Report';
    }
  };

  const getReasonPlaceholder = () => {
    switch (exceptionType) {
      case 'out_of_tolerance':
        return 'Explain why the mass is outside tolerance (e.g., material loss during processing, measurement error, etc.)';
      case 'process_failure':
        return 'Describe what went wrong during the process';
      case 'equipment_issue':
        return 'Describe the equipment issue encountered';
      case 'other':
        return 'Provide details about this exception';
      default:
        return 'Provide a detailed explanation';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{getExceptionTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Batch: <span className="font-semibold">{batchNumber}</span> • Station: <span className="font-semibold">{station}</span>
              </p>
            </div>
          </div>

          {/* Variance Info (for out_of_tolerance) */}
          {varianceInfo && exceptionType === 'out_of_tolerance' && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-3">Mass Check Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-red-700">Expected Mass:</span>
                  <span className="ml-2 font-bold text-red-900">{varianceInfo.expected.toFixed(2)}g</span>
                </div>
                <div>
                  <span className="text-red-700">Measured Mass:</span>
                  <span className="ml-2 font-bold text-red-900">{varianceInfo.measured.toFixed(2)}g</span>
                </div>
                <div>
                  <span className="text-red-700">Variance:</span>
                  <span className="ml-2 font-bold text-red-900">
                    {varianceInfo.variance >= 0 ? '+' : ''}{varianceInfo.variance.toFixed(2)}g
                  </span>
                </div>
                <div>
                  <span className="text-red-700">Variance %:</span>
                  <span className="ml-2 font-bold text-red-900">
                    {varianceInfo.variancePercent >= 0 ? '+' : ''}{varianceInfo.variancePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Warning Notice */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Supervisor Approval Required</p>
                <p>
                  This exception will flag the batch and require supervisor review before the batch can proceed.
                  Please provide a clear and detailed explanation.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason (Required) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-4 w-4" />
                Reason for Exception <span className="text-red-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={getReasonPlaceholder()}
                rows={4}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 characters required
              </p>
            </div>

            {/* Additional Notes (Optional) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4" />
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context or corrective actions taken..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={isSubmitting || reason.trim().length < 10}
                isLoading={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Flagging Batch...' : 'Flag for Supervisor Review'}
              </Button>
            </div>
          </form>

          {/* Info Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>What happens next?</strong> The batch will be marked as "flagged" and a supervisor will be notified to review and approve this exception before work can continue.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}



