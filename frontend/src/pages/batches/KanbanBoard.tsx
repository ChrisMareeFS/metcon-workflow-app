import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchService, Batch, BatchEvent } from '../../services/batchService';
import { flowService, Flow } from '../../services/flowService';
import { templateService, StationTemplate, CheckTemplate } from '../../services/templateService';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Plus, RefreshCw, Flag, Clock, LayoutList, User, ChevronDown } from 'lucide-react';

interface ColumnData {
  nodeId: string;
  nodeName: string;
  nodeType: 'station' | 'check';
  batches: Batch[];
}

export default function KanbanBoard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [, setTemplates] = useState<Map<string, StationTemplate | CheckTemplate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);

  useEffect(() => {
    loadFlows();
  }, []);

  useEffect(() => {
    if (selectedFlowId) {
      loadData();
    }
  }, [selectedFlowId]);

  const loadFlows = async () => {
    try {
      // Load all active flows
      const activeFlows = await flowService.getFlows({ status: 'active' });
      setFlows(activeFlows);
      
      // Select first flow by default
      if (activeFlows.length > 0 && !selectedFlowId) {
        setSelectedFlowId(activeFlows[0]._id);
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
      alert('Failed to load flows');
    }
  };

  const loadData = async () => {
    if (!selectedFlowId) return;
    
    setIsLoading(true);
    try {
      // Load selected flow
      const selectedFlow = await flowService.getFlow(selectedFlowId);
      setFlow(selectedFlow);
      
      if (!selectedFlow) {
        setIsLoading(false);
        return;
      }

      // Load all templates
      const [stations, checks] = await Promise.all([
        templateService.getStationTemplates(),
        templateService.getCheckTemplates(),
      ]);

      const templateMap = new Map<string, StationTemplate | CheckTemplate>();
      stations.forEach(t => templateMap.set(t.template_id, t));
      checks.forEach(t => templateMap.set(t.template_id, t));
      setTemplates(templateMap);

      // Load ALL batches for this flow's pipeline (both in_progress and completed)
      const [inProgressResponse, completedResponse] = await Promise.all([
        batchService.getBatches({ 
          pipeline: selectedFlow.pipeline,
          status: 'in_progress' 
        }),
        batchService.getBatches({ 
          pipeline: selectedFlow.pipeline,
          status: 'completed',
          limit: 20,
        })
      ]);
      
      // Filter batches to only show those using the selected flow
      const allBatches = [...inProgressResponse.batches, ...completedResponse.batches]
        .filter(b => {
          const batchFlowId = typeof b.flow_id === 'object' ? b.flow_id._id : b.flow_id;
          return batchFlowId === selectedFlowId;
        });
      setBatches(allBatches.filter(b => b.status === 'in_progress'));

      // Create columns from flow nodes - show ALL nodes as columns (even if empty)
      if (!selectedFlow.nodes || selectedFlow.nodes.length === 0) {
        console.error('Selected flow has no nodes:', selectedFlow);
        alert('Selected flow has no nodes defined. Please check flow configuration.');
        setIsLoading(false);
        return;
      }
      
      const columnData: ColumnData[] = selectedFlow.nodes.map(node => {
        const template = templateMap.get(node.template_id);
        return {
          nodeId: node.id,
          nodeName: template?.name || node.template_id,
          nodeType: node.type,
          batches: allBatches.filter(b => 
            b.status === 'in_progress' && b.current_node_id === node.id
          ),
        };
      });

      // Add "Completed" column at the end
      columnData.push({
        nodeId: 'completed',
        nodeName: '✅ Completed',
        nodeType: 'station',
        batches: completedResponse.batches,
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

  // Get the user currently working on the batch (from last step_completed event)
  const getCurrentUser = (batch: Batch): string | null => {
    if (!batch.events || batch.events.length === 0) return null;
    
    // Find the most recent step_completed event
    const stepEvents = batch.events
      .filter((e: BatchEvent) => e.type === 'step_completed')
      .sort((a: BatchEvent, b: BatchEvent) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    
    if (stepEvents.length > 0) {
      const lastEvent = stepEvents[0];
      if (lastEvent.user_id && typeof lastEvent.user_id === 'object') {
        return lastEvent.user_id.username;
      }
    }
    
    // Fallback to created_by if available
    return null;
  };

  const handlePriorityChange = async (batchId: string, newPriority: 'normal' | 'high') => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    setUpdatingPriority(batchId);
    try {
      await batchService.updatePriority(batchId, newPriority);
      await loadData(); // Reload to show updated priority
    } catch (error: any) {
      console.error('Failed to update priority:', error);
      alert(error.response?.data?.error || 'Failed to update priority');
    } finally {
      setUpdatingPriority(null);
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
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {flow ? `${getPipelineEmoji(flow.pipeline)} ${flow.pipeline.toUpperCase()} Pipeline Board` : 'Kanban Board'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {flow ? `${flow.name} (v${flow.version}) • ${batches.length} active batches` : 'Select a flow to view batches'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Flow Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedFlowId}
                onChange={(e) => setSelectedFlowId(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer min-w-[200px]"
              >
                {flows.length === 0 ? (
                  <option value="">Loading flows...</option>
                ) : (
                  flows.map((f) => (
                    <option key={f._id} value={f._id}>
                      {getPipelineEmoji(f.pipeline)} {f.name} (v{f.version})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
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
        <div className="inline-flex gap-4 p-6 h-full" style={{ minWidth: 'max-content' }}>
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
                      className="p-4 hover:shadow-lg transition-shadow bg-white border-l-4"
                      style={{
                        borderLeftColor: 
                          batch.priority === 'high' ? '#ef4444' :
                          batch.pipeline === 'copper' ? '#f97316' :
                          batch.pipeline === 'silver' ? '#9ca3af' :
                          '#eab308'
                      }}
                    >
                      {/* Batch Number and Priority Toggle */}
                      <div className="font-bold text-gray-900 mb-2 flex items-center justify-between gap-2">
                        <span className="truncate">{batch.batch_number}</span>
                        {currentUser?.role === 'admin' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePriorityChange(batch._id, batch.priority === 'high' ? 'normal' : 'high');
                            }}
                            disabled={updatingPriority === batch._id}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              batch.priority === 'high'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } ${updatingPriority === batch._id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={batch.priority === 'high' ? 'Set to Normal Priority' : 'Set to High Priority'}
                          >
                            {batch.priority === 'high' ? 'High' : 'Normal'}
                          </button>
                        ) : (
                          batch.priority === 'high' && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                              High
                            </span>
                          )
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

                      {/* Current User */}
                      {(() => {
                        const currentUserWorking = getCurrentUser(batch);
                        return currentUserWorking ? (
                          <div className="flex items-center text-xs text-gray-600 mt-2">
                            <User className="h-3 w-3 mr-1" />
                            <span className="truncate">{currentUserWorking}</span>
                          </div>
                        ) : null;
                      })()}

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

