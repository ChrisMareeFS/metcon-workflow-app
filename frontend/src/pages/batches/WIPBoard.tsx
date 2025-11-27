import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchService, Batch, BatchEvent } from '../../services/batchService';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Plus, RefreshCw, Flag, Clock, CheckCircle, AlertCircle, LayoutGrid, Filter, X, User } from 'lucide-react';

interface Filters {
  status?: string;
  pipeline?: string;
  priority?: string;
}

export default function WIPBoard() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ status: 'in_progress' }); // Include 'created' status too
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadBatches();
  }, [filters]);

  // Refresh when page becomes visible (user returns from creating a batch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBatches(true); // Silent refresh
      }
    };

    const handleFocus = () => {
      loadBatches(true); // Silent refresh when window regains focus
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [filters]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadBatches(true); // Silent refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  const loadBatches = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Load both 'in_progress' and 'created' batches to show newly created batches
      const [inProgressResponse, createdResponse] = await Promise.all([
        batchService.getBatches({ ...filters, status: 'in_progress' }),
        batchService.getBatches({ ...filters, status: 'created' }),
      ]);
      // Combine and deduplicate
      const allBatches = [...inProgressResponse.batches, ...createdResponse.batches];
      const uniqueBatches = allBatches.filter((batch, index, self) => 
        index === self.findIndex(b => b._id === batch._id)
      );
      setBatches(uniqueBatches);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const calculateBatchAge = (batch: Batch): number => {
    const startTime = batch.started_at || batch.created_at;
    const now = new Date();
    const ageMs = now.getTime() - new Date(startTime).getTime();
    return Math.floor(ageMs / (1000 * 60 * 60)); // Hours
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
    
    return null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'flagged':
        return <Flag className="h-5 w-5 text-red-600" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'flagged':
        return 'bg-red-100 text-red-800';
      case 'blocked':
        return 'bg-orange-100 text-orange-800';
      case 'created':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPipelineColor = (pipeline: string) => {
    switch (pipeline) {
      case 'copper':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'silver':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'gold':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPipelineEmoji = (pipeline: string) => {
    switch (pipeline) {
      case 'copper': return '🟠';
      case 'silver': return '⚪';
      case 'gold': return '🟡';
      default: return '⚪';
    }
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilterPanel(false);
  };

  const applyStatusFilter = (status: string) => {
    setFilters({ ...filters, status: status === 'all' ? undefined : status });
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined).length;

  if (isLoading && batches.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading batches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work in Progress</h1>
            <p className="text-gray-600 mt-1">
              {batches.length} batch{batches.length !== 1 ? 'es' : ''} • Updated {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => navigate('/batches/kanban')}
              title="Switch to Kanban Board"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban View
            </Button>
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">Auto-refresh</span>
            </label>
            <Button variant="secondary" onClick={() => loadBatches()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => navigate('/batches/scan')}>
              <Plus className="h-4 w-4 mr-2" />
              New Batch
            </Button>
          </div>
        </div>

        {/* Quick Status Filters */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-2 flex-1">
            {(['all', 'created', 'in_progress', 'flagged', 'blocked'] as const).map((status) => (
              <button
                key={status}
                onClick={() => applyStatusFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  (status === 'all' ? !filters.status : filters.status === status)
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <Button 
            variant="secondary" 
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilterPanel && (
          <Card className="mb-6 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline</label>
                <select
                  value={filters.pipeline || 'all'}
                  onChange={(e) => setFilters({ ...filters, pipeline: e.target.value === 'all' ? undefined : e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Pipelines</option>
                  <option value="gold">🟡 Gold</option>
                  <option value="silver">⚪ Silver</option>
                  <option value="pgm">🟣 PGM</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority || 'all'}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value === 'all' ? undefined : e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="normal">Normal</option>
                  <option value="high">🔥 High Priority</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="secondary" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {batches.filter(b => b.priority === 'high').length}
                </p>
              </div>
              <Flag className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Flagged</p>
                <p className="text-2xl font-bold text-orange-600">
                  {batches.filter(b => b.status === 'flagged').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Age</p>
                <p className="text-2xl font-bold text-gray-900">
                  {batches.length > 0 
                    ? Math.round(batches.reduce((sum, b) => sum + calculateBatchAge(b), 0) / batches.length)
                    : 0}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </Card>
        </div>

        {/* Batches Grid */}
        {batches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => {
              const age = calculateBatchAge(batch);
              const isOld = age > 48; // More than 2 days
              
              return (
                <Card
                  key={batch._id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    if (batch.status === 'in_progress' || batch.status === 'created') {
                      navigate(`/batches/${batch._id}/execute`);
                    } else {
                      navigate(`/batches/${batch._id}`);
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {batch.batch_number}
                        </h3>
                        {batch.flow_id && typeof batch.flow_id === 'object' && (
                          <p className="text-sm text-gray-600">
                            {batch.flow_id.name} v{batch.flow_version}
                          </p>
                        )}
                      </div>
                      {getStatusIcon(batch.status)}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            batch.status
                          )}`}
                        >
                          {batch.status.replace('_', ' ')}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPipelineColor(
                            batch.pipeline
                          )}`}
                        >
                          {getPipelineEmoji(batch.pipeline)} {batch.pipeline.toUpperCase()}
                        </span>
                      </div>

                      {/* Current Station */}
                      {batch.current_node && (
                        <div className="text-sm">
                          <span className="text-gray-600">Current:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {batch.current_node.name || batch.current_node_id}
                          </span>
                        </div>
                      )}

                      {/* Batch Age */}
                      <div className={`text-sm ${isOld ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        <Clock className="h-4 w-4 inline mr-1" />
                        Age: {age}h
                        {isOld && ' ⚠️'}
                      </div>

                      {/* Initial Weight */}
                      {batch.initial_weight && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Weight:</span> {batch.initial_weight}g
                        </div>
                      )}

                      {/* Current User */}
                      {(() => {
                        const currentUserWorking = getCurrentUser(batch);
                        return currentUserWorking ? (
                          <div className="text-sm text-gray-600 flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span className="font-medium">Working:</span> {currentUserWorking}
                          </div>
                        ) : null;
                      })()}

                      {/* Progress Indicator */}
                      {batch.completed_node_ids && batch.flow_id && typeof batch.flow_id === 'object' && (
                        <div className="text-sm">
                          <div className="flex items-center justify-between text-gray-600 mb-1">
                            <span>Progress</span>
                            <span className="font-medium">
                              {batch.completed_node_ids.length} / {batch.flow_id.nodes?.length || 0} steps
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  batch.flow_id.nodes?.length
                                    ? (batch.completed_node_ids.length / batch.flow_id.nodes.length) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* High Priority Badge */}
                      {batch.priority === 'high' && (
                        <div className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                          🔥 High Priority
                        </div>
                      )}

                      {/* Flags */}
                      {batch.flags && batch.flags.length > 0 && (
                        <div className="text-sm text-red-600">
                          <Flag className="h-4 w-4 inline mr-1" />
                          {batch.flags.length} flag{batch.flags.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                        {batch.started_at ? (
                          <div>Started {new Date(batch.started_at).toLocaleString()}</div>
                        ) : (
                          <div>Created {new Date(batch.created_at).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No batches found
            </h3>
            <p className="text-gray-600 mb-6">
              {activeFilterCount > 0 
                ? "Try adjusting your filters or clear them to see all batches" 
                : "Start a new batch to begin processing"}
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/batches/scan')}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Batch
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
