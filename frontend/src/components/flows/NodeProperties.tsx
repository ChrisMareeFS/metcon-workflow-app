import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { StationTemplate, CheckTemplate } from '../../services/templateService';
import Button from '../ui/Button';
import { X, Trash2, Clock, CheckSquare, Square } from 'lucide-react';

interface NodePropertiesProps {
  node: Node;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export default function NodeProperties({ node, onClose, onDelete, onUpdate }: NodePropertiesProps) {
  const isStation = node.data.type === 'station';
  const template: StationTemplate | CheckTemplate = node.data.template;
  const stationTemplate = isStation ? (template as StationTemplate) : null;
  
  // Initialize selected SOPs - default to all selected
  const [selectedSops, setSelectedSops] = useState<number[]>(() => {
    if (node.data.selectedSops) {
      return node.data.selectedSops;
    }
    // Default: all SOPs selected
    if (stationTemplate?.sop) {
      return stationTemplate.sop.map((_, index) => index);
    }
    return [];
  });

  useEffect(() => {
    // Update node data when selectedSops changes
    if (isStation && stationTemplate?.sop) {
      onUpdate(node.id, { ...node.data, selectedSops });
    }
  }, [selectedSops]);

  const toggleSop = (index: number) => {
    setSelectedSops(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const selectAllSops = () => {
    if (stationTemplate?.sop) {
      setSelectedSops(stationTemplate.sop.map((_, index) => index));
    }
  };

  const deselectAllSops = () => {
    setSelectedSops([]);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Node Properties</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Node Type Badge */}
        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isStation
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {isStation ? '🏭 Station' : '⚙️ Check'}
          </span>
        </div>

        {/* Template Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-3xl">{template.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500 mt-1">{template.template_id}</p>
            </div>
          </div>
        </div>

        {/* Station Details */}
        {isStation && (
          <>
            {(template as StationTemplate).description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  {(template as StationTemplate).description}
                </p>
              </div>
            )}

            {(template as StationTemplate).estimated_duration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-4 w-4" />
                  {(template as StationTemplate).estimated_duration} minutes
                </div>
              </div>
            )}

            {/* SOP Selection */}
            {stationTemplate?.sop && stationTemplate.sop.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    SOP Steps ({selectedSops.length}/{stationTemplate.sop.length} selected)
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={selectAllSops}
                      className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 hover:bg-primary-50 rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={deselectAllSops}
                      className="text-xs text-gray-600 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  {stationTemplate.sop.map((step, index) => (
                    <div
                      key={index}
                      onClick={() => toggleSop(index)}
                      className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors group"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {selectedSops.includes(index) ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-500 mr-2">
                          Step {index + 1}
                        </span>
                        <p className={`text-sm ${selectedSops.includes(index) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {step}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected steps will be displayed as checkboxes during workflow execution
                </p>
              </div>
            )}
          </>
        )}

        {/* Check Details */}
        {!isStation && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg capitalize">
                {(template as CheckTemplate).type.replace('_', ' ')}
              </p>
            </div>

            {(template as CheckTemplate).instructions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  {(template as CheckTemplate).instructions}
                </p>
              </div>
            )}

            {(template as CheckTemplate).type === 'mass_check' && (template as CheckTemplate).tolerance && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tolerance</label>
                <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                  ±{(template as CheckTemplate).tolerance} {(template as CheckTemplate).tolerance_unit}
                </p>
              </div>
            )}
          </>
        )}

        {/* Node ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Node ID</label>
          <p className="text-xs text-gray-500 font-mono p-3 bg-gray-50 rounded-lg">
            {node.id}
          </p>
        </div>

        {/* Delete Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onDelete}
            className="w-full flex items-center justify-center text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Node
          </Button>
        </div>
      </div>
    </div>
  );
}









