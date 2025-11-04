import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  X,
  Plus,
  FileText,
  CheckSquare,
  Scale,
  PenTool,
  Camera,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';

// Type definitions for Flow components
interface FlowStep {
  step_id: string;
  type: 'instruction' | 'checklist' | 'mass_check' | 'signature' | 'photo';
  label: string;
  name?: string;
  description?: string;
  required: boolean;
  order?: number;
  instructions?: string;
  expected_mass?: number;
  tolerance?: number;
  tolerance_unit?: 'grams' | 'percent';
  config?: Record<string, any>;
}

interface FlowStation {
  station_id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
}

interface StationConfigProps {
  station: FlowStation;
  onUpdate: (station: FlowStation) => void;
  onClose: () => void;
}

const stepTypeIcons = {
  instruction: FileText,
  checklist: CheckSquare,
  mass_check: Scale,
  signature: PenTool,
  photo: Camera,
};

const stepTypeLabels = {
  instruction: 'Instruction',
  checklist: 'Checklist',
  mass_check: 'Mass Check',
  signature: 'Signature',
  photo: 'Photo',
};

export default function StationConfig({ station, onUpdate, onClose }: StationConfigProps) {
  const [stationName, setStationName] = useState(station.name);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const updateStationName = () => {
    onUpdate({
      ...station,
      name: stationName,
    });
  };

  const addStep = () => {
    const newStep: FlowStep = {
      step_id: `step_${Date.now()}`,
      type: 'instruction',
      label: `Step ${station.steps.length + 1}`,
      name: `Step ${station.steps.length + 1}`,
      instructions: 'Enter instructions here...',
      required: true,
      order: station.steps.length + 1,
    };

    onUpdate({
      ...station,
      steps: [...station.steps, newStep],
    });
    
    // Auto-expand the new step
    setExpandedStep(newStep.step_id);
  };

  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    const updatedSteps = station.steps.map((step) =>
      step.step_id === stepId ? { ...step, ...updates } : step
    );

    onUpdate({
      ...station,
      steps: updatedSteps,
    });
  };

  const deleteStep = (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    const updatedSteps = station.steps.filter((step) => step.step_id !== stepId);

    onUpdate({
      ...station,
      steps: updatedSteps,
    });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...station.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newSteps.length) return;

    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    // Update order
    newSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });

    onUpdate({
      ...station,
      steps: newSteps,
    });
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Configure Station</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Station Name */}
        <div>
          <Input
            label="Station Name"
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
            onBlur={updateStationName}
            placeholder="Enter station name"
          />
        </div>

        {/* Steps List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Steps</h4>
            <Button size="sm" variant="secondary" onClick={addStep}>
              <Plus className="h-3 w-3 mr-1" />
              Add Step
            </Button>
          </div>

          {station.steps.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-600 mb-2">No steps added yet</p>
              <Button size="sm" variant="primary" onClick={addStep}>
                <Plus className="h-3 w-3 mr-1" />
                Add First Step
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {station.steps.map((step, index) => {
                const Icon = stepTypeIcons[step.type];
                const isExpanded = expandedStep === step.step_id;

                return (
                  <div
                    key={step.step_id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Step Header */}
                    <div className="p-3 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className="h-4 w-4 text-primary-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {step.name || `Step ${index + 1}`}
                        </span>
                        {step.type === 'mass_check' && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                            ⚖️ {step.tolerance}
                            {step.tolerance_unit || 'g'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === station.steps.length - 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setExpandedStep(isExpanded ? null : step.step_id)
                          }
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteStep(step.step_id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Step Details (Expanded) */}
                    {isExpanded && (
                      <div className="p-3 space-y-3 bg-white">
                        <Input
                          label="Step Name"
                          value={step.name}
                          onChange={(e) =>
                            updateStep(step.step_id, { name: e.target.value })
                          }
                          placeholder="Enter step name"
                        />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Step Type
                          </label>
                          <select
                            value={step.type}
                            onChange={(e) =>
                              updateStep(step.step_id, {
                                type: e.target.value as FlowStep['type'],
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {Object.entries(stepTypeLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instructions
                          </label>
                          <textarea
                            value={step.instructions}
                            onChange={(e) =>
                              updateStep(step.step_id, { instructions: e.target.value })
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter instructions for this step"
                          />
                        </div>

                        {step.type === 'mass_check' && (
                          <>
                            <Input
                              label="Expected Mass (optional)"
                              type="number"
                              value={step.expected_mass || ''}
                              onChange={(e) =>
                                updateStep(step.step_id, {
                                  expected_mass: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              placeholder="e.g., 150"
                              helperText="Leave empty if varies per batch"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Tolerance"
                                type="number"
                                value={step.tolerance || ''}
                                onChange={(e) =>
                                  updateStep(step.step_id, {
                                    tolerance: parseFloat(e.target.value),
                                  })
                                }
                                placeholder="e.g., 0.5"
                              />
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Unit
                                </label>
                                <select
                                  value={step.tolerance_unit || 'g'}
                                  onChange={(e) =>
                                    updateStep(step.step_id, {
                                      tolerance_unit: e.target.value === 'g' ? 'grams' : 'percent',
                                    })
                                  }
                                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  <option value="g">grams (g)</option>
                                  <option value="%">percent (%)</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`required-${step.step_id}`}
                            checked={step.required}
                            onChange={(e) =>
                              updateStep(step.step_id, { required: e.target.checked })
                            }
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`required-${step.step_id}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            Required step
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

