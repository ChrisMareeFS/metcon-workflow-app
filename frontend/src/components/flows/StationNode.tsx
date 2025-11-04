import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, Package, Scale } from 'lucide-react';

interface StationNodeProps {
  data: {
    label: string;
    stepsCount: number;
    massChecksCount: number;
    onConfigure: () => void;
  };
}

function StationNode({ data }: StationNodeProps) {
  return (
    <div className="bg-white border-2 border-primary-600 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* Header */}
      <div className="bg-primary-600 text-white px-4 py-3 rounded-t-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <span className="font-semibold">{data.label}</span>
        </div>
        <button
          onClick={data.onConfigure}
          className="hover:bg-primary-700 p-1 rounded transition-colors"
          title="Configure Station"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Steps:</span>
          <span className="font-medium text-gray-900">{data.stepsCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 flex items-center gap-1">
            <Scale className="h-3 w-3" />
            Mass Checks:
          </span>
          <span className="font-medium text-gray-900">{data.massChecksCount}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 rounded-b-md border-t border-gray-200">
        <button
          onClick={data.onConfigure}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Configure Steps →
        </button>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
}

export default memo(StationNode);













