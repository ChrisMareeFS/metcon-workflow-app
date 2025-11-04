/**
 * Analytics Calculator Service
 * Automatically populates analytics fields based on batch flow execution
 */

import { IBatch } from '../models/Batch.js';
import { StationTemplate } from '../models/StationTemplate.js';
import { CheckTemplate } from '../models/CheckTemplate.js';

/**
 * Calculate business hours between two dates (excluding weekends)
 */
function calculateBusinessHours(startDate: Date, endDate: Date): number {
  let totalHours = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalHours += 1;
    }
    current.setHours(current.getHours() + 1);
  }
  
  return totalHours;
}

/**
 * Update analytics fields when a step is completed
 */
export async function updateAnalyticsOnStepCompletion(
  batch: IBatch,
  _nodeId: string,
  templateId: string,
  stepData: any
): Promise<void> {
  // Fetch the template to understand what kind of step this is
  const stationTemplate = await StationTemplate.findOne({ template_id: templateId });
  const checkTemplate = await CheckTemplate.findOne({ template_id: templateId });
  
  const template = stationTemplate || checkTemplate;
  if (!template) return;

  const templateName = template.name.toLowerCase();
  
  // 1. MELTING RECEIVED - Track when material arrives at melting
  if ((templateName.includes('melting') || templateName.includes('receiving')) && !batch.melting_received_at) {
    batch.melting_received_at = new Date();
    
    // If this is the receiving step with supplier info
    if (stepData?.supplier) {
      batch.supplier = stepData.supplier;
    }
    if (stepData?.drill_number) {
      batch.drill_number = stepData.drill_number;
    }
    if (stepData?.destination) {
      batch.destination = stepData.destination;
    }
  }

  // 2. RECEIVED WEIGHT & FINE CONTENT - From mass check at receiving
  if (checkTemplate?.type === 'mass_check') {
    const mass = stepData?.measured_mass || stepData?.mass || stepData?.weight;
    const finePercent = stepData?.fine_content_percent || stepData?.fine_percent || stepData?.purity;
    
    // Initial weigh-in (received weight)
    if (templateName.includes('receiving') || templateName.includes('initial')) {
      if (mass && !batch.received_weight_g) {
        batch.received_weight_g = mass;
      }
      
      if (finePercent && !batch.fine_content_percent) {
        batch.fine_content_percent = finePercent;
      }
      
      // Calculate fine grams received
      if (batch.received_weight_g && batch.fine_content_percent) {
        batch.fine_grams_received = (batch.received_weight_g * batch.fine_content_percent) / 100;
      }
    }
    
    // Expected output weight (could be from refining or pre-cast step)
    if (templateName.includes('expected') || templateName.includes('pre-cast') || templateName.includes('target')) {
      if (mass && !batch.expected_output_g) {
        batch.expected_output_g = mass;
      }
    }
  }

  // 3. EXPORT / FIRST POUR - Track first time through
  if (templateName.includes('export') || templateName.includes('first pour') || templateName.includes('casting')) {
    const outputWeight = stepData?.output_weight || stepData?.pour_weight || stepData?.weight;
    
    // First export
    if (!batch.first_export_at && outputWeight) {
      batch.first_export_at = new Date();
      batch.output_weight_g = outputWeight;
      batch.first_time_recovery_g = outputWeight;
      
      // Calculate FTT hours (excluding weekends)
      if (batch.melting_received_at) {
        batch.ftt_hours = calculateBusinessHours(batch.melting_received_at, batch.first_export_at);
      }
      
      // Add as first recovery pour
      if (!batch.recovery_pours) {
        batch.recovery_pours = [];
      }
      batch.recovery_pours.push({
        weight_g: outputWeight,
        timestamp: new Date(),
        pour_number: 1,
      });
    }
  }

  // 4. RECOVERY POURS - Track subsequent recoveries
  if (templateName.includes('recovery') && stepData?.pour_weight) {
    if (!batch.recovery_pours) {
      batch.recovery_pours = [];
    }
    
    const pourNumber = batch.recovery_pours.length + 1;
    batch.recovery_pours.push({
      weight_g: stepData.pour_weight,
      timestamp: new Date(),
      pour_number: pourNumber,
    });
  }

  // 5. CALCULATE TOTAL RECOVERY & OVERALL RECOVERY %
  if (batch.recovery_pours && batch.recovery_pours.length > 0) {
    batch.total_recovery_g = batch.recovery_pours.reduce((sum, pour) => sum + pour.weight_g, 0);
    
    if (batch.fine_grams_received && batch.fine_grams_received > 0) {
      batch.overall_recovery_percent = (batch.total_recovery_g / batch.fine_grams_received) * 100;
    }
  }

  // 6. CALCULATE LOSS/GAIN
  if (batch.expected_output_g && batch.total_recovery_g) {
    batch.actual_output_g = batch.total_recovery_g;
    batch.loss_gain_g = batch.actual_output_g - batch.expected_output_g;
    
    if (batch.expected_output_g > 0) {
      batch.loss_gain_percent = (batch.loss_gain_g / batch.expected_output_g) * 100;
    }
  }
  
  // Alternative loss/gain calculation if expected_output not set
  // Use fine_grams_received as expected with 99.5% recovery assumption
  if (!batch.expected_output_g && batch.fine_grams_received && batch.total_recovery_g) {
    batch.expected_output_g = batch.fine_grams_received * 0.995; // 99.5% expected
    batch.actual_output_g = batch.total_recovery_g;
    batch.loss_gain_g = batch.actual_output_g - batch.expected_output_g;
    
    if (batch.expected_output_g > 0) {
      batch.loss_gain_percent = (batch.loss_gain_g / batch.expected_output_g) * 100;
    }
  }
}

/**
 * Calculate FTT Recovery Percentage
 * (First time recovery / Total fine grams received * 100)
 */
export function calculateFTTRecoveryPercent(batch: IBatch): number | null {
  if (!batch.first_time_recovery_g || !batch.fine_grams_received) {
    return null;
  }
  
  return (batch.first_time_recovery_g / batch.fine_grams_received) * 100;
}

/**
 * Finalize analytics when batch is completed
 */
export function finalizeAnalytics(batch: IBatch): void {
  // Ensure all recovery calculations are up to date
  if (batch.recovery_pours && batch.recovery_pours.length > 0) {
    batch.total_recovery_g = batch.recovery_pours.reduce((sum, pour) => sum + pour.weight_g, 0);
    
    if (batch.fine_grams_received && batch.fine_grams_received > 0) {
      batch.overall_recovery_percent = (batch.total_recovery_g / batch.fine_grams_received) * 100;
    }
  }
  
  // Final loss/gain calculation
  if (batch.expected_output_g && batch.total_recovery_g) {
    batch.actual_output_g = batch.total_recovery_g;
    batch.loss_gain_g = batch.actual_output_g - batch.expected_output_g;
    
    if (batch.expected_output_g > 0) {
      batch.loss_gain_percent = (batch.loss_gain_g / batch.expected_output_g) * 100;
    }
  }
}







