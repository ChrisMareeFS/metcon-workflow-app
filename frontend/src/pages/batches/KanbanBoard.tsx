import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchService, Batch } from '../../services/batchService';
import { flowService, Flow } from '../../services/flowService';
import { templateService, StationTemplate, CheckTemplate } from '../../services/templateService';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Plus, RefreshCw, Flag, Clock, LayoutList } from 'lucide-react';

interface ColumnData {
  nodeId: string;
  nodeName: string;
  nodeType: 'station' | 'check';
  batches: Batch[];
}

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<'copper' | 'silver' | 'gold'>('copper');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [, setTemplates] = useState<Map<string, StationTemplate | CheckTemplate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [pipeline]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load active flow for pipeline
      const activeFlow = await flowService.getActiveFlow(pipeline);
      setFlow(activeFlow);

      // Load all templates
      const [stations, checks] = await Promise.all([
        templateService.getStationTemplates(),
        templateService.getCheckTemplates(),
      ]);

      const templateMap = new Map<string, StationTemplate | CheckTemplate>();
      stations.forEach(t => templateMap.set(t.template_id, t));
      checks.forEach(t => templateMap.set(t.template_id, t));
      setTemplates(templateMap);

      // Load batches for this pipeline (in progress only)
      const response = await batchService.getBatches({ 
        pipeline,
        status: 'in_progress' 
      });
      setBatches(response.batches);

      // Create columns from flow nodes
      const columnData: ColumnData[] = activeFlow.nodes.map(node => {
        const template = templateMap.get(node.template_id);
        return {
          nodeId: node.id,
          nodeName: template?.name || node.template_id,
          nodeType: node.type,
          batches: response.batches.filter(b => b.current_node_id === node.id),
        };
      });

      // Add "Completed" column
      const completedBatchesResponse = await batchService.getBatches({ 
        pipeline,
        status: 'completed',
        limit: 10,
      });
      columnData.push({
        nodeId: 'completed',
        nodeName: '✅ Completed',
        nodeType: 'station',
        batches: completedBatchesResponse.batches,
      });

      setColumns(columnData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load Kanban board');
    } finally {
      setIsLoading(false);
    }
  };

  const getPipelineColor = (p: string) => {
    switch (p) {
      case 'copper': return 'bg-orange-500';
      case 'silver': return 'bg-gray-400';
      case 'gold': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getPipelineEmoji = (p: string) => {
    switch (p) {
      case 'copper': return '🟠';
      case 'silver': return '⚪';
      case 'gold': return '🟡';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No active flow found for {pipeline} pipeline</p>
          <Button variant="primary" onClick={() => navigate('/flows')}>
            Create Flow
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden" style={{ margin: 0, padding: 0 }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getPipelineEmoji(pipeline)} {pipeline.toUpperCase()} Pipeline Board
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {flow.name} (v{flow.version}) • {batches.length} active batches
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Pipeline Selector */}
            <div className="flex gap-2">
              {(['copper', 'silver', 'gold'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPipeline(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    pipeline === p
                      ? `${getPipelineColor(p)} text-white`
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {getPipelineEmoji(p)} {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            <Button 
              variant="secondary" 
              onClick={() => navigate('/batches')}
              title="Switch to List View"
            >
              <LayoutList className="h-4 w-4 mr-2" />
              List View
            </Button>

            <Button variant="secondary" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button variant="primary" onClick={() => navigate('/batches/scan')}>
              <Plus className="h-4 w-4 mr-2" />
              New Batch
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="inline-flex gap-4 p-6 min-w-full h-full">
          {columns.map((column) => (
            <div
              key={column.nodeId}
              className="flex-shrink-0 w-80"
            >
              {/* Column Header */}
              <div className="bg-gray-200 rounded-t-lg px-4 py-3 border-b-2 border-gray-300">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    {column.nodeType === 'station' ? '🏭' : '⚙️'} {column.nodeName}
                  </h3>
                  <span className="bg-gray-300 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                    {column.batches.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="bg-gray-50 rounded-b-lg p-3 h-[calc(100vh-180px)] overflow-y-auto space-y-3">
                {column.batches.length > 0 ? (
                  column.batches.map((batch) => (
                    <Card
                      key={batch._id}
                      className="p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white border-l-4"
                      style={{
                        borderLeftColor: 
                          batch.priority === 'high' ? '#ef4444' :
                          batch.pipeline === 'copper' ? '#f97316' :
                          batch.pipeline === 'silver' ? '#9ca3af' :
                          '#eab308'
                      }}
                      onClick={() => {
                        if (batch.status === 'completed') {
                          navigate(`/batches/${batch._id}`);
                        } else {
                          navigate(`/batches/${batch._id}/execute`);
                        }
                      }}
                    >
                      {/* Batch Number */}
                      <div className="font-bold text-gray-900 mb-2 flex items-center justify-between">
                        <span className="truncate">{batch.batch_number}</span>
                        {batch.priority === 'high' && (
                          <span className="text-red-500 text-xs">🔥</span>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                          batch.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          batch.status === 'flagged' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {batch.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Weight */}
                      {batch.initial_weight && (
                        <div className="text-sm text-gray-600 mb-2">
                          ⚖️ {batch.initial_weight}g
                        </div>
                      )}

                      {/* Progress */}
                      {(() => {
                        // Use batch's own flow if populated with nodes, otherwise use active flow
                        let batchFlow = flow;
                        if (batch.flow_id && typeof batch.flow_id === 'object') {
                          const flowObj = batch.flow_id as any;
                          if (flowObj.nodes && Array.isArray(flowObj.nodes) && flowObj.nodes.length > 0) {
                            batchFlow = flowObj;
                          }
                        }
                        
                        const totalSteps = batchFlow?.nodes?.length || 0;
                        const completedSteps = batch.completed_node_ids?.length || 0;
                        
                        // For completed batches, show all steps completed
                        const displayTotal = batch.status === 'completed' && totalSteps === 0 
                          ? completedSteps 
                          : totalSteps;
                        
                        return (
                          <>
                            <div className="text-xs text-gray-500 mb-2">
                              {completedSteps} of {displayTotal} steps
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${getPipelineColor(batch.pipeline)}`}
                                style={{
                                  width: `${displayTotal > 0 ? Math.min((completedSteps / displayTotal) * 100, 100) : 100}%`
                                }}
                              />
                            </div>
                          </>
                        );
                      })()}

                      {/* Flags */}
                      {batch.flags && batch.flags.length > 0 && (
                        <div className="flex items-center text-xs text-red-600 mt-2">
                          <Flag className="h-3 w-3 mr-1" />
                          {batch.flags.length} flag{batch.flags.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Time */}
                      <div className="flex items-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {batch.started_at 
                          ? `Started ${new Date(batch.started_at).toLocaleDateString()}`
                          : `Created ${new Date(batch.created_at).toLocaleDateString()}`
                        }
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No batches
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {batches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No batches in progress</p>
          <Button variant="primary" onClick={() => navigate('/batches/scan')}>
            <Plus className="h-4 w-4 mr-2" />
            Start First Batch
          </Button>
        </div>
      )}
    </div>
  );
}

