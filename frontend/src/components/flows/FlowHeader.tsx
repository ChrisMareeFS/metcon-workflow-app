import { Flow } from '../../services/flowService';
import Button from '../ui/Button';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';

interface FlowHeaderProps {
  flow: Flow;
  onUpdateFlow: (flow: Flow) => void;
  onSave: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onBack: () => void;
  isSaving: boolean;
}

export default function FlowHeader({
  flow,
  onUpdateFlow,
  onSave,
  onActivate,
  onDeactivate,
  onBack,
  isSaving,
}: FlowHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div>
          {isEditingName ? (
            <input
              type="text"
              value={flow.name}
              onChange={(e) => onUpdateFlow({ ...flow, name: e.target.value })}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingName(false);
              }}
              className="text-xl font-bold text-gray-900 border-b-2 border-primary-600 focus:outline-none px-1"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-primary-600"
            >
              {flow.name}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600">v{flow.version}</span>
            <span className="text-gray-400">·</span>
            <span className="text-sm text-gray-600 capitalize">{flow.pipeline}</span>
            <span className="text-gray-400">·</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                flow.status
              )}`}
            >
              {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-600 mr-2">
          {flow.nodes?.length || 0} node{(flow.nodes?.length || 0) !== 1 ? 's' : ''},{' '}
          {flow.edges?.length || 0} connection{(flow.edges?.length || 0) !== 1 ? 's' : ''}
        </div>

        <Button variant="secondary" onClick={onSave} isLoading={isSaving} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>

        {flow._id !== 'new' && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className={`text-sm font-medium ${flow.status === 'active' ? 'text-green-700' : 'text-gray-600'}`}>
              {flow.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => {
                if (flow.status === 'active') {
                  onDeactivate();
                } else {
                  onActivate();
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                flow.status === 'active' ? 'bg-green-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={flow.status === 'active'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  flow.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}




