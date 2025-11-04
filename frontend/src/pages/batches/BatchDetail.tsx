import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchService, Batch } from '../../services/batchService';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { 
  ArrowLeft, 
  Flag, 
  CheckCircle, 
  Clock,
  User,
  Package,
  Scale,
  FileText,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckSquare,
} from 'lucide-react';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadBatch();
  }, [id]);

  const loadBatch = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const batchData = await batchService.getBatch(id);
      setBatch(batchData);
    } catch (error) {
      console.error('Failed to load batch:', error);
      alert('Failed to load batch details');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('created')) return <Package className="h-5 w-5" />;
    if (eventType.includes('started')) return <Clock className="h-5 w-5" />;
    if (eventType.includes('completed')) return <CheckCircle className="h-5 w-5" />;
    if (eventType.includes('step_completed')) return <CheckSquare className="h-5 w-5" />;
    if (eventType.includes('mass_check')) return <Scale className="h-5 w-5" />;
    if (eventType.includes('flagged') || eventType.includes('exception')) return <Flag className="h-5 w-5" />;
    if (eventType.includes('approved')) return <CheckCircle className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('created')) return 'bg-blue-100 text-blue-700';
    if (eventType.includes('started')) return 'bg-green-100 text-green-700';
    if (eventType.includes('completed')) return 'bg-green-100 text-green-700';
    if (eventType.includes('step_completed')) return 'bg-blue-100 text-blue-700';
    if (eventType.includes('mass_check')) return 'bg-purple-100 text-purple-700';
    if (eventType.includes('flagged') || eventType.includes('exception')) return 'bg-red-100 text-red-700';
    if (eventType.includes('approved')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const calculateBatchAge = (): string => {
    if (!batch) return '0h';
    const start = batch.started_at || batch.created_at;
    const end = batch.completed_at || new Date();
    const ageMs = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Batch not found</p>
          <Button variant="primary" onClick={() => navigate('/batches')} className="mt-4">
            Back to Batches
          </Button>
        </div>
      </div>
    );
  }

  const totalSteps = batch.flow_id && typeof batch.flow_id === 'object' ? batch.flow_id.nodes?.length || 0 : 0;
  const completedSteps = batch.completed_node_ids?.length || 0;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate('/batches')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Batches
        </button>

        {/* Batch Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">Batch {batch.batch_number}</CardTitle>
                {batch.flow_id && typeof batch.flow_id === 'object' && (
                  <p className="text-gray-600 mt-1">{batch.flow_id.name} v{batch.flow_version}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    batch.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : batch.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : batch.status === 'flagged'
                      ? 'bg-red-100 text-red-800'
                      : batch.status === 'blocked'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {batch.status.replace('_', ' ').toUpperCase()}
                </span>
                {batch.priority === 'high' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    🔥 HIGH PRIORITY
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Pipeline</div>
                <div className="font-semibold text-lg text-gray-900">
                  {batch.pipeline === 'copper' && '🟠'}
                  {batch.pipeline === 'silver' && '⚪'}
                  {batch.pipeline === 'gold' && '🟡'}
                  {' '}{batch.pipeline.toUpperCase()}
                </div>
              </div>

              {batch.fine_grams_received && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Fine Content Received</div>
                  <div className="font-semibold text-lg text-gray-900 flex items-center">
                    <Scale className="h-4 w-4 mr-1" />
                    {batch.fine_grams_received.toFixed(2)}g
                  </div>
                </div>
              )}

              {batch.total_recovery_g && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Recovery</div>
                  <div className="font-semibold text-lg text-gray-900">
                    {batch.total_recovery_g.toFixed(2)}g
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-600 mb-1">Duration</div>
                <div className="font-semibold text-lg text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {calculateBatchAge()}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">
                  {completedSteps} / {totalSteps} steps
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    batch.status === 'completed' ? 'bg-green-500' : 'bg-primary-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Loss/Gain Indicator */}
            {batch.loss_gain_g !== null && batch.loss_gain_g !== undefined && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {batch.loss_gain_g >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium text-gray-700">Loss/Gain</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${batch.loss_gain_g >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {batch.loss_gain_g >= 0 ? '+' : ''}{batch.loss_gain_g.toFixed(2)}g
                    </div>
                    {batch.loss_gain_percent !== null && batch.loss_gain_percent !== undefined && (
                      <div className="text-sm text-gray-600">
                        ({batch.loss_gain_percent >= 0 ? '+' : ''}{batch.loss_gain_percent.toFixed(2)}%)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Flags/Exceptions */}
            {batch.flags && batch.flags.length > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Flag className="h-5 w-5 text-red-600 mr-2" />
                  Exceptions & Flags ({batch.flags.length})
                </h4>
                <div className="space-y-3">
                  {batch.flags.map((flag, idx) => (
                    <div key={idx} className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-red-900 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {flag.type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-red-600">
                          {new Date(flag.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-red-800 mb-2">
                        <strong>Reason:</strong> {flag.reason}
                      </div>
                      {flag.approved_by && (
                        <div className="mt-3 pt-3 border-t border-red-200 flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 font-medium">
                            Approved by: {typeof flag.approved_by === 'object' ? flag.approved_by.username : 'Supervisor'}
                          </span>
                        </div>
                      )}
                      {!flag.approved_by && (
                        <div className="mt-3 pt-3 border-t border-red-200 text-sm text-orange-700 font-medium">
                          ⏳ Awaiting supervisor approval
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {(batch.status === 'in_progress' || batch.status === 'created') && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/batches/${batch._id}/execute`)}
                  className="w-full"
                >
                  {batch.status === 'created' ? 'Start Batch' : 'Continue Execution'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Timeline & Audit Trail</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              All events, actions, and validations for this batch
            </p>
          </CardHeader>
          <CardContent>
            {batch.events && batch.events.length > 0 ? (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                <div className="space-y-6">
                  {[...batch.events].reverse().map((event) => (
                    <div key={event.event_id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                        {getEventIcon(event.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 capitalize">
                              {event.type.replace(/_/g, ' ')}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-3 flex items-center gap-4">
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {typeof event.user_id === 'object' && event.user_id?.username 
                                ? event.user_id.username 
                                : 'System'}
                            </span>
                            {event.station && (
                              <span className="text-gray-500">
                                Station: <span className="font-medium text-gray-700">{event.station}</span>
                              </span>
                            )}
                          </div>

                          {/* Event Data */}
                          {event.data && Object.keys(event.data).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                              {/* Mass Check Data */}
                              {event.data.measured_mass && (
                                <div className="bg-blue-50 rounded p-3">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-blue-700">Expected:</span>{' '}
                                      <span className="font-semibold">{event.data.expected_mass}g</span>
                                    </div>
                                    <div>
                                      <span className="text-blue-700">Measured:</span>{' '}
                                      <span className="font-semibold">{event.data.measured_mass}g</span>
                                    </div>
                                    {event.data.within_tolerance !== undefined && (
                                      <div className="col-span-2">
                                        <span className={event.data.within_tolerance ? 'text-green-700' : 'text-red-700'}>
                                          {event.data.within_tolerance ? '✓ Within Tolerance' : '⚠️ Out of Tolerance'}
                                        </span>
                                      </div>
                                    )}
                                    {event.data.ocr_confidence && (
                                      <div className="col-span-2 text-xs text-gray-600">
                                        OCR Confidence: {Math.round(event.data.ocr_confidence)}%
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Signature Display */}
                              {event.data.signature && typeof event.data.signature === 'string' && event.data.signature.startsWith('data:image') && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700 mb-2">Signature:</div>
                                  <div className="bg-white border border-gray-300 rounded p-2 inline-block">
                                    <img 
                                      src={event.data.signature} 
                                      alt="Signature" 
                                      className="max-w-xs h-auto"
                                      style={{ maxHeight: '100px' }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Exception Data */}
                              {event.data.exception_type && (
                                <div className="bg-red-50 rounded p-3 text-sm">
                                  <div className="font-medium text-red-900 mb-1">
                                    {event.data.exception_type.replace(/_/g, ' ').toUpperCase()}
                                  </div>
                                  {event.data.reason && (
                                    <div className="text-red-800">
                                      <strong>Reason:</strong> {event.data.reason}
                                    </div>
                                  )}
                                  {event.data.notes && (
                                    <div className="text-red-700 mt-1">
                                      <strong>Notes:</strong> {event.data.notes}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Approval Data */}
                              {event.data.approval_notes && (
                                <div className="bg-green-50 rounded p-3 text-sm text-green-800">
                                  <strong>Approval Notes:</strong> {event.data.approval_notes}
                                </div>
                              )}

                              {/* Checklist Results */}
                              {event.data.checklist_results && Array.isArray(event.data.checklist_results) && (
                                <div className="space-y-1">
                                  {event.data.checklist_results.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <CheckSquare className={`h-4 w-4 ${item.checked ? 'text-green-600' : 'text-gray-400'}`} />
                                      <span className={item.checked ? 'text-gray-700' : 'text-gray-500'}>
                                        {item.item}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* SOP Results */}
                              {event.data.sop_results && Array.isArray(event.data.sop_results) && (
                                <div className="space-y-1">
                                  {event.data.sop_results.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <CheckSquare className={`h-4 w-4 ${item.checked ? 'text-green-600' : 'text-gray-400'}`} />
                                      <span className={item.checked ? 'text-gray-700' : 'text-gray-500'}>
                                        {item.item}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Other Data (Generic) */}
                              {Object.entries(event.data).map(([key, value]) => {
                                // Skip already displayed fields
                                if ([
                                  'signature', 'measured_mass', 'expected_mass', 'within_tolerance', 
                                  'ocr_confidence', 'exception_type', 'reason', 'notes', 
                                  'approval_notes', 'checklist_results', 'sop_results'
                                ].includes(key)) {
                                  return null;
                                }
                                
                                return (
                                  <div key={key} className="text-xs text-gray-600">
                                    <span className="font-medium text-gray-700 capitalize">
                                      {key.replace(/_/g, ' ')}:
                                    </span>{' '}
                                    {typeof value === 'object' 
                                      ? JSON.stringify(value) 
                                      : String(value)
                                    }
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No events recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Modal */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="max-w-4xl max-h-full">
              <img 
                src={selectedPhoto} 
                alt="Batch photo" 
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
