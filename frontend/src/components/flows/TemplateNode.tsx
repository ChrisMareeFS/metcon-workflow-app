import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { StationTemplate, CheckTemplate } from '../../services/templateService';
import { Clock, FileText, CheckSquare, Scale, PenTool, Camera } from 'lucide-react';

interface TemplateNodeProps {
  data: {
    type: 'station' | 'check';
    template: StationTemplate | CheckTemplate;
    onSelect?: () => void;
  };
}

const checkTypeIcons = {
  instruction: FileText,
  checklist: CheckSquare,
  mass_check: Scale,
  signature: PenTool,
  photo: Camera,
};

function TemplateNode({ data }: TemplateNodeProps) {
  const isStation = data.type === 'station';
  const template = data.template;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[200px] ${
        isStation 
          ? 'border-blue-400 hover:border-blue-500' 
          : 'border-green-400 hover:border-green-500'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center gap-3">
        <div className="text-3xl">{template.icon}</div>
        <div className="flex-1">
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
            isStation ? 'text-blue-600' : 'text-green-600'
          }`}>
            {isStation ? 'Station' : 'Check'}
          </div>
          <div className="font-semibold text-gray-900 text-sm">{template.name}</div>
          {isStation && (template as StationTemplate).estimated_duration && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {(template as StationTemplate).estimated_duration} min
            </div>
          )}
          {!isStation && (
            <div className="flex items-center gap-1 mt-1">
              {(() => {
                const checkTemplate = template as CheckTemplate;
                const Icon = checkTypeIcons[checkTemplate.type];
                return (
                  <>
                    <Icon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{checkTemplate.type}</span>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(TemplateNode);













