import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flowService, Flow } from '../../services/flowService';
import { templateService, StationTemplate } from '../../services/templateService';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Plus, Edit, CheckCircle, Archive, Clock, AlertCircle, ArrowRight } from 'lucide-react';

export default function FlowsList() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [, setStations] = useState<StationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStationPopup, setShowStationPopup] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load flows
      const params = filter !== 'all' ? { status: filter } : undefined;
      const flowsData = await flowService.getFlows(params);
      setFlows(flowsData);

      // Load stations
      const stationsData = await templateService.getStationTemplates();
      setStations(stationsData);

      // Show popup if no flows and no stations
      if (flowsData.length === 0 && stationsData.length === 0) {
        setShowStationPopup(true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'draft':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'archived':
        return <Archive className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading flows...</p>
        </div>
      </div>
    );
  }

  // Station Setup Popup
  const StationSetupPopup = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                No Stations Available
              </h3>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              You need to create station templates before you can build flows. 
              Station templates define the workstations and processes in your workflow.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowStationPopup(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowStationPopup(false);
                // Navigate to station library tab in parent component
                // This will be handled by the parent FlowsManagement component
                window.dispatchEvent(new CustomEvent('switchToStations'));
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'draft', 'active', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => navigate('/flows/builder/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Flow
        </Button>
      </div>

      {/* Flows Grid */}
      {flows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => (
            <Card key={flow._id} className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/flows/builder/${flow._id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Version {flow.version}
                    </p>
                  </div>
                  {getStatusIcon(flow.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        flow.status
                      )}`}
                    >
                      {flow.status}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPipelineColor(
                        flow.pipeline
                      )}`}
                    >
                      {flow.pipeline.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>
                      <span className="font-medium">{flow.nodes.length}</span> nodes,{' '}
                      <span className="font-medium">{flow.edges.length}</span> connections
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {new Date(flow.updated_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/flows/builder/${flow._id}`);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Manage Stations
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? 'No flows created yet'
              : `No ${filter} flows found`}
          </p>
          <Button variant="primary" onClick={() => navigate('/flows/builder/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Flow
          </Button>
        </div>
      )}

      {/* Station Setup Popup */}
      {showStationPopup && <StationSetupPopup />}
    </div>
  );
}







