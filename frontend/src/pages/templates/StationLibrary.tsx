import { useState, useEffect } from 'react';
import { templateService, StationTemplate } from '../../services/templateService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Plus, Edit2, Trash2, Clock, Save, X, Upload } from 'lucide-react';

export default function StationLibrary() {
  const [templates, setTemplates] = useState<StationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    template_id: '',
    name: '',
    description: '',
    icon: '🏭',
    image_url: '',
    estimated_duration: '',
    sop: [''],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await templateService.getStationTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load station templates:', error);
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
      await templateService.createStationTemplate({
        template_id: formData.template_id,
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        image_url: formData.image_url || undefined,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
        sop: formData.sop.filter(step => step.trim() !== ''),
      });
      
      resetForm();
      loadTemplates();
      alert('Station template created successfully!');
    } catch (error: any) {
      console.error('Failed to create station template:', error);
      alert(error.response?.data?.error || 'Failed to create station template');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await templateService.updateStationTemplate(id, {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        image_url: formData.image_url || undefined,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
        sop: formData.sop.filter(step => step.trim() !== ''),
      });
      
      setEditingId(null);
      resetForm();
      loadTemplates();
      alert('Station template updated successfully!');
    } catch (error: any) {
      console.error('Failed to update station template:', error);
      alert(error.response?.data?.error || 'Failed to update station template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this station template?')) return;

    try {
      await templateService.deleteStationTemplate(id);
      loadTemplates();
      alert('Station template deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete station template:', error);
      alert(error.response?.data?.error || 'Failed to delete station template');
    }
  };

  const startEdit = (template: StationTemplate) => {
    setEditingId(template._id);
    setFormData({
      template_id: template.template_id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      image_url: template.image_url || '',
      estimated_duration: template.estimated_duration?.toString() || '',
      sop: template.sop && template.sop.length > 0 ? template.sop : [''],
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setImageUploading(true);
    try {
      const imageUrl = await templateService.uploadStationImage(file);
      setFormData({ ...formData, image_url: imageUrl });
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      alert(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const addSopStep = () => {
    setFormData({ ...formData, sop: [...formData.sop, ''] });
  };

  const removeSopStep = (index: number) => {
    if (formData.sop.length > 1) {
      const newSop = formData.sop.filter((_, i) => i !== index);
      setFormData({ ...formData, sop: newSop });
    }
  };

  const updateSopStep = (index: number, value: string) => {
    const newSop = [...formData.sop];
    newSop[index] = value;
    setFormData({ ...formData, sop: newSop });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newSop = [...formData.sop];
    const draggedItem = newSop[draggedIndex];
    
    // Remove the dragged item
    newSop.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newSop.splice(dropIndex, 0, draggedItem);
    
    setFormData({ ...formData, sop: newSop });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const resetForm = () => {
    setFormData({
      template_id: '',
      name: '',
      description: '',
      icon: '🏭',
      image_url: '',
      estimated_duration: '',
      sop: [''],
    });
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading station templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Station Library</h2>
          <p className="text-gray-600 mt-1">Create and manage reusable station templates</p>
        </div>
        {!isCreating && (
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Station
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New Station</h3>
            
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Station Image (Optional)</label>
              {formData.image_url ? (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group">
                  <img 
                    src={formData.image_url} 
                    alt="Station preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {imageUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-2"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-600"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Template ID *"
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                placeholder="e.g., station_melting"
              />
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Melting Station"
              />
              <Input
                label="Icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🏭"
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                placeholder="e.g., 45"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Standard Operating Procedure (SOP)</label>
              <div className="space-y-2">
                {formData.sop.map((step, index) => (
                  <div 
                    key={index} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                      draggedIndex === index 
                        ? 'bg-primary-50 border-2 border-primary-300 opacity-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      </div>
                      <span className="w-6 h-6 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-100 rounded">
                        {index + 1}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateSopStep(index, e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={`Step ${index + 1}...`}
                    />
                    {formData.sop.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSopStep(index)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSopStep}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Step
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Drag steps to reorder • Each step will be displayed as a checkbox during workflow execution</p>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleCreate}>
                <Save className="h-4 w-4 mr-2" />
                Create Station
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
        {templates.map((template) => (
          <Card key={template._id}>
            {editingId === template._id ? (
              <div className="p-4 space-y-3">
                {/* Image Upload in Edit Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Station Image</label>
                  {formData.image_url ? (
                    <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden group">
                      <img 
                        src={formData.image_url} 
                        alt="Station preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-primary-500 hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center">
                        {imageUploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400 mb-1" />
                            <p className="text-xs text-gray-600">Upload image</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                      />
                    </label>
                  )}
                </div>

                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Standard Operating Procedure (SOP)</label>
                  <div className="space-y-2">
                    {formData.sop.map((step, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 p-1 rounded transition-colors ${
                          draggedIndex === index 
                            ? 'bg-primary-50 border border-primary-300 opacity-50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="flex flex-col gap-0.5">
                            <div className="w-0.5 h-0.5 bg-gray-300 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-gray-300 rounded-full"></div>
                            <div className="w-0.5 h-0.5 bg-gray-300 rounded-full"></div>
                          </div>
                          <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 bg-gray-100 rounded">
                            {index + 1}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => updateSopStep(index, e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`Step ${index + 1}...`}
                        />
                        {formData.sop.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSopStep(index)}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSopStep}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Step
                    </button>
                  </div>
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
              <div>
                {/* Station Image */}
                {template.image_url ? (
                  <div className="w-full h-40 bg-gray-100 overflow-hidden">
                    <img 
                      src={template.image_url} 
                      alt={template.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                    <div className="text-6xl">{template.icon}</div>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {!template.image_url && <span>{template.icon}</span>}
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500">{template.template_id}</p>
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
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}
                  {template.sop && template.sop.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-gray-700 mb-1">SOP Steps:</h4>
                      <ol className="text-xs text-gray-600 space-y-1">
                        {template.sop.slice(0, 3).map((step, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-gray-400">{index + 1}.</span>
                            <span className="line-clamp-1">{step}</span>
                          </li>
                        ))}
                        {template.sop.length > 3 && (
                          <li className="text-gray-400 text-xs">
                            +{template.sop.length - 3} more steps...
                          </li>
                        )}
                      </ol>
                    </div>
                  )}
                  {template.estimated_duration && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {template.estimated_duration} min
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No station templates yet</p>
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Station
          </Button>
        </div>
      )}
    </div>
  );
}




