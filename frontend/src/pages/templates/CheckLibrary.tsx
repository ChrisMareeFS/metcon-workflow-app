import { useState, useEffect } from 'react';
import { templateService, CheckTemplate } from '../../services/templateService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const typeLabels = {
  instruction: 'Instruction',
  checklist: 'Checklist',
  mass_check: 'Mass Check',
  signature: 'Signature',
  photo: 'Photo',
};

export default function CheckLibrary() {
  const [templates, setTemplates] = useState<CheckTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    template_id: '',
    name: '',
    type: 'instruction' as CheckTemplate['type'],
    instructions: '',
    icon: '⚙️',
    tolerance: '',
    tolerance_unit: 'g' as 'g' | '%',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await templateService.getCheckTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load check templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.template_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await templateService.createCheckTemplate({
        template_id: formData.template_id,
        name: formData.name,
        type: formData.type,
        instructions: formData.instructions,
        icon: formData.icon,
        tolerance: formData.tolerance ? parseFloat(formData.tolerance) : undefined,
        tolerance_unit: formData.tolerance_unit,
      });
      
      resetForm();
      loadTemplates();
      alert('Check template created successfully!');
    } catch (error: any) {
      console.error('Failed to create check template:', error);
      alert(error.response?.data?.error || 'Failed to create check template');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await templateService.updateCheckTemplate(id, {
        name: formData.name,
        type: formData.type,
        instructions: formData.instructions,
        icon: formData.icon,
        tolerance: formData.tolerance ? parseFloat(formData.tolerance) : undefined,
        tolerance_unit: formData.tolerance_unit,
      });
      
      setEditingId(null);
      resetForm();
      loadTemplates();
      alert('Check template updated successfully!');
    } catch (error: any) {
      console.error('Failed to update check template:', error);
      alert(error.response?.data?.error || 'Failed to update check template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this check template?')) return;

    try {
      await templateService.deleteCheckTemplate(id);
      loadTemplates();
      alert('Check template deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete check template:', error);
      alert(error.response?.data?.error || 'Failed to delete check template');
    }
  };

  const startEdit = (template: CheckTemplate) => {
    setEditingId(template._id);
    setFormData({
      template_id: template.template_id,
      name: template.name,
      type: template.type,
      instructions: template.instructions,
      icon: template.icon,
      tolerance: template.tolerance?.toString() || '',
      tolerance_unit: template.tolerance_unit || 'g',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      template_id: '',
      name: '',
      type: 'instruction',
      instructions: '',
      icon: '⚙️',
      tolerance: '',
      tolerance_unit: 'g',
    });
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading check templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check Library</h2>
          <p className="text-gray-600 mt-1">Create and manage reusable check templates</p>
        </div>
        {!isCreating && (
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Check
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New Check</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Template ID *"
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                placeholder="e.g., check_weigh_in"
              />
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Initial Weight Check"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as CheckTemplate['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="⚙️"
              />
            </div>
            
            {formData.type === 'mass_check' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tolerance"
                  type="number"
                  step="0.1"
                  value={formData.tolerance}
                  onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })}
                  placeholder="e.g., 0.5"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={formData.tolerance_unit}
                    onChange={(e) => setFormData({ ...formData, tolerance_unit: e.target.value as 'g' | '%' })}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="g">grams (g)</option>
                    <option value="%">percent (%)</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter instructions..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleCreate}>
                <Save className="h-4 w-4 mr-2" />
                Create Check
              </Button>
              <Button variant="secondary" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          // Icon logic removed - not used
          
          return (
            <Card key={template._id}>
              {editingId === template._id ? (
                <div className="p-4 space-y-3">
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as CheckTemplate['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                  {formData.type === 'mass_check' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Tolerance"
                        type="number"
                        step="0.1"
                        value={formData.tolerance}
                        onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <select
                          value={formData.tolerance_unit}
                          onChange={(e) => setFormData({ ...formData, tolerance_unit: e.target.value as 'g' | '%' })}
                          className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="g">grams (g)</option>
                          <option value="%">percent (%)</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                    <textarea
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => handleUpdate(template._id)}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                            {typeLabels[template.type]}
                          </span>
                          {template.type === 'mass_check' && template.tolerance && (
                            <span className="text-xs text-gray-500">
                              ±{template.tolerance}{template.tolerance_unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(template)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {template.instructions && (
                    <p className="text-sm text-gray-600 line-clamp-2">{template.instructions}</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No check templates yet</p>
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Check
          </Button>
        </div>
      )}
    </div>
  );
}




