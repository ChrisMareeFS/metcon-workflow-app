import { useState } from 'react';
import { StationTemplate, CheckTemplate } from '../../services/templateService';
import { FileText, CheckSquare, Scale, PenTool, Camera, ChevronDown, ChevronUp } from 'lucide-react';

interface TemplatePaletteProps {
  stationTemplates: StationTemplate[];
  checkTemplates: CheckTemplate[];
}

const checkTypeIcons = {
  instruction: FileText,
  checklist: CheckSquare,
  mass_check: Scale,
  signature: PenTool,
  photo: Camera,
};

export default function TemplatePalette({ stationTemplates, checkTemplates }: TemplatePaletteProps) {
  const [isStationsExpanded, setIsStationsExpanded] = useState(true);
  const [isChecksExpanded, setIsChecksExpanded] = useState(true);

  const onDragStart = (event: React.DragEvent, type: 'station' | 'check', template: any) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type, template }));
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Template Library</h3>
        <p className="text-sm text-gray-600 mt-1">Drag to add to canvas</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Stations Section */}
        <div>
          <button
            onClick={() => setIsStationsExpanded(!isStationsExpanded)}
            className="w-full text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between hover:text-gray-900 transition-colors"
          >
            <div className="flex items-center">
              <span className="mr-2">🏭</span>
              STATIONS
              <span className="ml-2 text-xs font-normal text-gray-500">({stationTemplates.length})</span>
            </div>
            {isStationsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {isStationsExpanded && (
            <div className="space-y-2">
              {stationTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No station templates created yet</p>
              ) : (
                stationTemplates.map((template) => (
                  <div
                    key={template._id}
                    draggable
                    onDragStart={(e) => onDragStart(e, 'station', template)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-move transition-all"
                  >
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                      {template.estimated_duration && (
                        <p className="text-xs text-gray-500">{template.estimated_duration} min</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Checks Section */}
        <div>
          <button
            onClick={() => setIsChecksExpanded(!isChecksExpanded)}
            className="w-full text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between hover:text-gray-900 transition-colors"
          >
            <div className="flex items-center">
              <span className="mr-2">⚙️</span>
              CHECKS
              <span className="ml-2 text-xs font-normal text-gray-500">({checkTemplates.length})</span>
            </div>
            {isChecksExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {isChecksExpanded && (
            <div className="space-y-2">
              {checkTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No check templates created yet</p>
              ) : (
                checkTemplates.map((template) => {
                  const Icon = checkTypeIcons[template.type];
                  return (
                    <div
                      key={template._id}
                      draggable
                      onDragStart={(e) => onDragStart(e, 'check', template)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-move transition-all"
                    >
                      <div className="text-2xl">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Icon className="h-3 w-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{template.type}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        {stationTemplates.length === 0 && checkTemplates.length === 0 && (
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> Create station and check templates first in the "Station Library" and "Check Library" tabs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




