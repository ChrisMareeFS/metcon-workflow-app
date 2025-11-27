import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { batchService, Batch } from '../../services/batchService';
import { templateService, StationTemplate, CheckTemplate } from '../../services/templateService';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import SignaturePad from '../../components/ui/SignaturePad';
import MassCheckStep from '../../components/batches/MassCheckStep';
import { 
  CheckCircle, 
  ChevronRight, 
  Flag,
  Loader2, 
  ArrowLeft,
  Camera,
  PenTool,
  Scale,
  FileText,
} from 'lucide-react';

export default function StepRunner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const completeButtonRef = useRef<HTMLButtonElement>(null);
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [template, setTemplate] = useState<StationTemplate | CheckTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Step data
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});
  const [signatureValue, setSignatureValue] = useState('');
  const [massValue, setMassValue] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [instructionConfirmed, setInstructionConfirmed] = useState(false);

  // Load batch and template
  useEffect(() => {
    loadBatchAndStep();
  }, [id]);

  const loadBatchAndStep = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Load batch with current step details
      const batchData = await batchService.getBatch(id);
      setBatch(batchData);

      // Check if batch has a flow assigned
      if (!batchData.flow_id) {
        throw new Error(`No active flow found for ${batchData.pipeline.toUpperCase()} pipeline. Please create and activate a flow first.`);
      }

      // Start batch if it's in created status
      if (batchData.status === 'created') {
        const started = await batchService.startBatch(id);
        setBatch(started);
      }

      // Load template for current node
      if (batchData.current_node) {
        const templateId = batchData.current_node.template_id;
        const nodeType = batchData.current_node.type;

        let templateData;
        if (nodeType === 'station') {
          const stations = await templateService.getStationTemplates();
          templateData = stations.find(t => t.template_id === templateId);
        } else {
          const checks = await templateService.getCheckTemplates();
          templateData = checks.find(t => t.template_id === templateId);
        }

        setTemplate(templateData || null);
      }
    } catch (error: any) {
      console.error('Failed to load batch:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load batch details';
      alert(errorMessage);
      // Navigate back to batches list
      navigate('/batches');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if step can be completed (for button disable state)
  const canCompleteStep = (): boolean => {
    if (!batch || !template) return false;

    // Validate based on template type
    if (!('type' in template)) {
      // Station template with SOP checklist
      const stationTemplate = template as StationTemplate;
      
      if (stationTemplate.sop && stationTemplate.sop.length > 0) {
        // All SOP items must be checked
        const allChecked = stationTemplate.sop.every((_, idx) => checklistState[idx] === true);
        return allChecked;
      } else {
        // Fallback: single confirmation checkbox must be checked
        return instructionConfirmed === true;
      }
    } else {
      // Check template validation
      const checkTemplate = template as CheckTemplate;
      
      if (checkTemplate.type === 'instruction') {
        return instructionConfirmed === true;
      }
      
      if (checkTemplate.type === 'checklist') {
        // All checklist items must be checked
        if (!checkTemplate.checklist_items || checkTemplate.checklist_items.length === 0) {
          return false; // No items means can't complete
        }
        const allChecked = checkTemplate.checklist_items.every((_, idx) => checklistState[idx] === true);
        return allChecked;
      }
      
      if (checkTemplate.type === 'mass_check') {
        // MassCheckStep handles its own validation, but we can check if massValue exists
        return !!massValue;
      }
      
      if (checkTemplate.type === 'signature') {
        return !!signatureValue && signatureValue.trim().length > 0;
      }
      
      if (checkTemplate.type === 'photo') {
        return !!photoFile;
      }
    }

    // Default: don't allow completion if we don't know the type
    return false;
  };

  const handleCompleteStep = async (overrideStepData?: any) => {
    if (!batch || !template) return;

    // Skip validation if overrideStepData is provided (from MassCheckStep)
    if (!overrideStepData) {
      // Validate based on template type
      if (!('type' in template)) {
        // Station template with SOP checklist
        const stationTemplate = template as StationTemplate;
        
        if (stationTemplate.sop && stationTemplate.sop.length > 0) {
          const allChecked = stationTemplate.sop.every((_, idx) => checklistState[idx] === true);
          if (!allChecked) {
            alert('Please complete all SOP checklist items before proceeding');
            return;
          }
        } else {
          // Fallback: single confirmation checkbox
          if (instructionConfirmed !== true) {
            alert('Please confirm you have completed this station');
            return;
          }
        }
      } else {
        // Check template validation
        const checkTemplate = template as CheckTemplate;
        
        if (checkTemplate.type === 'instruction' && instructionConfirmed !== true) {
          alert('Please confirm you have read the instructions');
          return;
        }
        
        if (checkTemplate.type === 'checklist') {
          if (!checkTemplate.checklist_items || checkTemplate.checklist_items.length === 0) {
            alert('No checklist items defined');
            return;
          }
          const allChecked = checkTemplate.checklist_items.every((_, idx) => checklistState[idx] === true);
          if (!allChecked) {
            alert('Please complete all checklist items before proceeding');
            return;
          }
        }
        
        if (checkTemplate.type === 'mass_check' && !massValue) {
          alert('Please enter the mass value');
          return;
        }
        
        if (checkTemplate.type === 'signature' && !signatureValue) {
          alert('Please enter your signature');
          return;
        }
        
        if (checkTemplate.type === 'photo' && !photoFile) {
          alert('Please take or upload a photo');
          return;
        }
      }
    }

    setIsCompleting(true);
    try {
      // Prepare step data - use override if provided (from MassCheckStep)
      let stepData: Record<string, any>;
      
      if (overrideStepData) {
        // Only include plain JSON-serializable properties from overrideStepData
        const cleanOverride: Record<string, any> = {};
        for (const key in overrideStepData) {
          const value = overrideStepData[key];
          // Skip File objects, DOM elements, and functions
          if (value instanceof File) {
            // Skip File objects - we only need metadata
            continue;
          }
          if (value && typeof value === 'object' && (
            value.constructor?.name?.startsWith('HTML') ||
            value._reactFiber ||
            value.stateNode
          )) {
            // Skip DOM/React objects
            continue;
          }
          if (typeof value === 'function') {
            // Skip functions
            continue;
          }
          // Include primitive values, plain objects, arrays, dates
          if (value instanceof Date) {
            cleanOverride[key] = value.toISOString();
          } else {
            cleanOverride[key] = value;
          }
        }
        
        stepData = {
          template_id: template.template_id,
          template_name: template.name,
          completed_at: new Date().toISOString(),
          ...cleanOverride,
        };
      } else {
        stepData = {
          template_id: template.template_id,
          template_name: template.name,
          completed_at: new Date().toISOString(),
        };

        // Station template with SOP items
        if (!('type' in template)) {
          const stationTemplate = template as StationTemplate;
          
          if (stationTemplate.sop && stationTemplate.sop.length > 0) {
            stepData.sop_results = stationTemplate.sop.map((item, idx) => ({
              item,
              checked: checklistState[idx] || false,
            }));
          }
        } else {
          // Check template
          const checkTemplate = template as CheckTemplate;
          stepData.check_type = checkTemplate.type;

          if (checkTemplate.type === 'checklist') {
            stepData.checklist_results = checkTemplate.checklist_items?.map((item, idx) => ({
              item,
              checked: checklistState[idx] || false,
            }));
          }

          if (checkTemplate.type === 'mass_check') {
            stepData.mass_value = parseFloat(massValue);
            stepData.expected_mass = checkTemplate.expected_mass;
            stepData.tolerance = checkTemplate.tolerance;
          }

          if (checkTemplate.type === 'signature') {
            stepData.signature = signatureValue;
          }

        if (checkTemplate.type === 'photo' && photoFile) {
          // Photo upload handled by MassCheckStep component
          stepData.photo_uploaded = true;
          stepData.photo_name = photoFile.name;
        }
        }
      }

      // Final check - ensure stepData is JSON serializable
      try {
        JSON.stringify(stepData);
      } catch (e) {
        console.error('Step data contains non-serializable values:', e);
        // Remove any remaining problematic properties
        const cleaned: Record<string, any> = {};
        for (const key in stepData) {
          try {
            JSON.stringify(stepData[key]);
            cleaned[key] = stepData[key];
          } catch {
            console.warn(`Removing non-serializable property: ${key}`);
          }
        }
        stepData = cleaned;
      }

      // Complete step
      const updatedBatch = await batchService.completeStep(batch._id, stepData);
      
      // Check if batch is complete
      if (updatedBatch.status === 'completed') {
        console.log('🎉 Batch completed! Triggering confetti...');
        
        // Get button position for confetti origin
        let buttonX = 0.5; // Default to center
        let buttonY = 0.5;
        
        if (completeButtonRef.current) {
          const rect = completeButtonRef.current.getBoundingClientRect();
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          
          // Calculate button center position as percentage of screen
          buttonX = (rect.left + rect.width / 2) / windowWidth;
          buttonY = (rect.top + rect.height / 2) / windowHeight;
          
          console.log('Button position:', { buttonX, buttonY, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } });
        } else {
          console.warn('Button ref not available, using center position');
        }

        // Trigger confetti celebration spewing from the button
        const duration = 3000; // 3 seconds of celebration
        const animationEnd = Date.now() + duration;
        const defaults = { 
          startVelocity: 50, 
          spread: 60, 
          ticks: 100, 
          zIndex: 9999,
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
        };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        // Initial burst for immediate feedback
        try {
          confetti({
            ...defaults,
            particleCount: 200,
            angle: 90,
            spread: 70,
            origin: { x: buttonX, y: buttonY },
            gravity: 0.8,
          });
          
          confetti({
            ...defaults,
            particleCount: 150,
            angle: 60,
            spread: 50,
            origin: { x: buttonX, y: buttonY },
            gravity: 0.8,
          });
          
          confetti({
            ...defaults,
            particleCount: 150,
            angle: 120,
            spread: 50,
            origin: { x: buttonX, y: buttonY },
            gravity: 0.8,
          });
          
          console.log('Initial confetti burst fired');
        } catch (error) {
          console.error('Error firing confetti:', error);
        }

        // Create confetti bursts from the button
        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            console.log('Confetti animation complete');
            return clearInterval(interval);
          }

          const particleCount = 80 * (timeLeft / duration);
          
          try {
            // Launch confetti in all directions from the button
            confetti({
              ...defaults,
              particleCount: Math.floor(particleCount * 0.4),
              angle: randomInRange(45, 135), // Upward arc
              origin: { x: buttonX, y: buttonY },
              gravity: 0.8,
            });
            
            confetti({
              ...defaults,
              particleCount: Math.floor(particleCount * 0.3),
              angle: randomInRange(0, 45), // Leftward arc
              origin: { x: buttonX, y: buttonY },
              gravity: 0.8,
            });
            
            confetti({
              ...defaults,
              particleCount: Math.floor(particleCount * 0.3),
              angle: randomInRange(135, 180), // Rightward arc
              origin: { x: buttonX, y: buttonY },
              gravity: 0.8,
            });
          } catch (error) {
            console.error('Error in confetti interval:', error);
          }
        }, 50); // Update every 50ms for smooth animation

        // Navigate after confetti animation completes
        setTimeout(() => {
          console.log('Navigating to batches page');
          navigate('/batches');
        }, duration + 500); // Wait for animation + small buffer
      } else {
        // Move to next step
        setBatch(updatedBatch);
        
        // Reset form
        setChecklistState({});
        setSignatureValue('');
        setMassValue('');
        setPhotoFile(null);
        setInstructionConfirmed(false);
        
        // Load next template
        await loadBatchAndStep();
      }
    } catch (error: any) {
      console.error('Failed to complete step:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      // Extract error message from various possible locations
      const message = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to complete step';
      
      // Show detailed error in alert
      alert(`Error: ${message}\n\nPlease check the browser console (F12) for more details.`);
    } finally {
      setIsCompleting(false);
    }
  };

  const getStepIcon = () => {
    if (!template || !('type' in template)) return <FileText className="h-6 w-6" />;
    
    const checkTemplate = template as CheckTemplate;
    switch (checkTemplate.type) {
      case 'instruction': return <FileText className="h-6 w-6" />;
      case 'checklist': return <CheckCircle className="h-6 w-6" />;
      case 'mass_check': return <Scale className="h-6 w-6" />;
      case 'signature': return <PenTool className="h-6 w-6" />;
      case 'photo': return <Camera className="h-6 w-6" />;
      default: return <FileText className="h-6 w-6" />;
    }
  };

  const renderStepContent = () => {
    if (!template) return null;

    // Station template (simple instruction)
    if (!('type' in template)) {
      const stationTemplate = template as StationTemplate;
      return (
        <div className="space-y-6">
          {stationTemplate.image_url && (
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={stationTemplate.image_url} 
                alt={stationTemplate.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}
          
          <div className="prose max-w-none">
            <p className="text-gray-700 text-lg">{stationTemplate.description}</p>
          </div>

          {stationTemplate.estimated_duration && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ⏱️ Estimated duration: {stationTemplate.estimated_duration} minutes
              </p>
            </div>
          )}

          {/* SOP Checklist Items */}
          {stationTemplate.sop && stationTemplate.sop.length > 0 && (
            <div className="space-y-3 mt-6">
              {stationTemplate.sop.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id={`sop-${idx}`}
                    checked={checklistState[idx] || false}
                    onChange={(e) => setChecklistState({ ...checklistState, [idx]: e.target.checked })}
                    className="mt-1 h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <label htmlFor={`sop-${idx}`} className="flex-1 text-gray-700 cursor-pointer">
                    {item}
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Fallback checkbox if no SOP items defined */}
          {(!stationTemplate.sop || stationTemplate.sop.length === 0) && (
            <div className="flex items-center gap-3 mt-6">
              <input
                type="checkbox"
                id="station-confirm"
                checked={instructionConfirmed}
                onChange={(e) => setInstructionConfirmed(e.target.checked)}
                className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="station-confirm" className="text-gray-700 cursor-pointer">
                I have completed this station
              </label>
            </div>
          )}
        </div>
      );
    }

    // Check template
    const checkTemplate = template as CheckTemplate;

    switch (checkTemplate.type) {
      case 'instruction':
        return (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-gray-700 text-lg whitespace-pre-wrap">
                {checkTemplate.instructions}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="instruction-confirm"
                checked={instructionConfirmed}
                onChange={(e) => setInstructionConfirmed(e.target.checked)}
                className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="instruction-confirm" className="text-gray-700">
                I have read and understood these instructions
              </label>
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">{checkTemplate.instructions}</p>
            
            {checkTemplate.checklist_items?.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id={`checklist-${idx}`}
                  checked={checklistState[idx] || false}
                  onChange={(e) => setChecklistState({ ...checklistState, [idx]: e.target.checked })}
                  className="mt-1 h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor={`checklist-${idx}`} className="flex-1 text-gray-700">
                  {item}
                </label>
              </div>
            ))}
          </div>
        );

      case 'mass_check':
        return (
          <MassCheckStep
            template={checkTemplate}
            batchNumber={batch?.batch_number || ''}
            station={batch?.current_node?.name || batch?.current_node_id || ''}
            initialWeight={batch?.initial_weight}
            onComplete={async (data) => {
              // Handle mass check completion with OCR data
              // Don't include photo File object - it has circular references
              // Photo upload is handled separately if needed
              const stepData = {
                expected_mass: checkTemplate.expected_mass,
                measured_mass: data.measured_mass,
                within_tolerance: data.within_tolerance,
                ocr_confidence: data.ocr_confidence,
                // Only include photo metadata, not the File object itself
                photo_uploaded: !!data.photo,
                photo_name: data.photo?.name,
              };
              
              await handleCompleteStep(stepData);
            }}
            onFlagException={async (exceptionData) => {
              // Handle out-of-tolerance exception
              try {
                setIsCompleting(true);
                await batchService.flagBatch(batch!._id, {
                  exception_type: exceptionData.exception_type as any,
                  reason: exceptionData.reason,
                  notes: exceptionData.notes,
                  station: batch?.current_node?.name || batch?.current_node_id,
                  step: batch?.current_node_id,
                });
                
                alert('⚠️ Batch flagged for supervisor review. A supervisor must approve before this batch can continue.');
                navigate('/batches');
              } catch (error: any) {
                console.error('Failed to flag batch:', error);
                alert(error.response?.data?.error || 'Failed to flag batch');
              } finally {
                setIsCompleting(false);
              }
            }}
          />
        );

      case 'signature':
        return (
          <div className="space-y-6">
            <p className="text-gray-700">{checkTemplate.instructions}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Your Signature *
              </label>
              <SignaturePad
                value={signatureValue}
                onChange={setSignatureValue}
              />
            </div>
          </div>
        );

      case 'photo':
        return (
          <div className="space-y-6">
            <p className="text-gray-700">{checkTemplate.instructions}</p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {photoFile ? (
                <div>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-700">Photo selected: {photoFile.name}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPhotoFile(null)}
                    className="mt-3"
                  >
                    Change Photo
                  </Button>
                </div>
              ) : (
                <div>
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-4">Take or upload a photo</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="photo-input"
                  />
                  <label htmlFor="photo-input" className="cursor-pointer">
                    <span className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-9 px-3 text-sm bg-primary-600 text-white hover:bg-primary-700 cursor-pointer">
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">Unknown step type</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading batch...</p>
        </div>
      </div>
    );
  }

  if (!batch || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Batch or step not found</p>
          <Button variant="primary" onClick={() => navigate('/batches')} className="mt-4">
            Back to Batches
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((batch.completed_node_ids.length / (batch.completed_node_ids.length + 1)) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/batches')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Batches
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Batch {batch.batch_number}
              </h1>
              <p className="text-gray-600 mt-1 capitalize">
                {batch.pipeline} Pipeline
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-2xl font-bold text-primary-600">{progress}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg text-primary-600">
                {getStepIcon()}
              </div>
              <div className="flex-1">
                <CardTitle>{template.name}</CardTitle>
                {('type' in template) && (
                  <p className="text-sm text-gray-500 capitalize">
                    {(template as CheckTemplate).type.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {renderStepContent()}

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
              <Button
                variant="secondary"
                onClick={() => navigate(`/batches/${batch._id}`)}
                className="flex-1"
              >
                <Flag className="h-4 w-4 mr-2" />
                Flag Issue
              </Button>
              <Button
                ref={completeButtonRef}
                variant="primary"
                onClick={handleCompleteStep}
                isLoading={isCompleting}
                disabled={isCompleting || !canCompleteStep()}
                className="flex-1"
              >
                Complete Step
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

