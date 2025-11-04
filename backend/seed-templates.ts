import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { StationTemplate } from './src/models/StationTemplate.js';
import { CheckTemplate } from './src/models/CheckTemplate.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/metcon';

// Create a default admin user schema for seeding
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
});
const User = mongoose.model('User', userSchema);

const stationTemplates = [
  {
    template_id: 'station_receiving',
    name: 'Receiving',
    description: 'Initial receiving and documentation of raw materials',
    icon: '📦',
    estimated_duration: 15,
    sop: [
      'Verify delivery documentation matches physical material',
      'Inspect material for damage or contamination',
      'Record initial observations and photos',
      'Apply batch identification labels',
      'Store in secure holding area',
    ],
  },
  {
    template_id: 'station_melting',
    name: 'Melting',
    description: 'Melt raw material in furnace',
    icon: '🔥',
    estimated_duration: 45,
    sop: [
      'Verify furnace calibration is current',
      'Preheat furnace to target temperature (±10°C)',
      'Load material into crucible',
      'Monitor temperature throughout process',
      'Visual check for complete melting',
      'Allow cooling period before handling',
    ],
  },
  {
    template_id: 'station_refining',
    name: 'Refining',
    description: 'Chemical refining process to purify metal',
    icon: '⚗️',
    estimated_duration: 120,
    sop: [
      'Ensure all PPE is worn (face shield, gloves, apron)',
      'Prepare chemical reagents per SOP',
      'Add material to refining vessel',
      'Monitor reaction progress and temperature',
      'Perform intermediate purity tests',
      'Neutralize and dispose of waste per protocol',
      'Rinse refined material thoroughly',
    ],
  },
  {
    template_id: 'station_assay',
    name: 'Assay',
    description: 'Test material purity and composition',
    icon: '🔬',
    estimated_duration: 30,
    sop: [
      'Calibrate XRF analyzer with reference standards',
      'Take representative sample from batch',
      'Document sample weight and location',
      'Run XRF analysis (minimum 3 readings)',
      'Verify purity meets specification (≥99.5% for gold)',
      'Record results in batch log',
      'Return sample to batch or dispose per protocol',
    ],
  },
  {
    template_id: 'station_casting',
    name: 'Casting',
    description: 'Cast refined metal into bars or forms',
    icon: '🏗️',
    estimated_duration: 60,
    sop: [
      'Preheat molds to specified temperature',
      'Verify metal temperature is within casting range',
      'Pour molten metal smoothly into molds',
      'Allow proper cooling time (minimum 15 minutes)',
      'Remove castings and inspect for defects',
      'Stamp batch number and purity on bars',
    ],
  },
  {
    template_id: 'station_packaging',
    name: 'Packaging',
    description: 'Final packaging and documentation',
    icon: '📦',
    estimated_duration: 20,
    sop: [
      'Verify final weight matches expected value',
      'Inspect products for surface defects',
      'Clean and polish if required',
      'Place products in protective packaging',
      'Generate certificate of analysis',
      'Seal package and apply security labels',
      'Update inventory system',
    ],
  },
];

const checkTemplates = [
  {
    template_id: 'check_weigh_in',
    name: 'Initial Weight Check',
    type: 'mass_check',
    instructions: 'Place material on calibrated scale and photograph display. Record reading.',
    icon: '⚖️',
    tolerance: 0.5,
    tolerance_unit: 'g',
  },
  {
    template_id: 'check_weigh_out',
    name: 'Final Weight Check',
    type: 'mass_check',
    instructions: 'Weigh finished material and verify against expected mass. Photograph scale.',
    icon: '⚖️',
    tolerance: 0.5,
    tolerance_unit: 'g',
  },
  {
    template_id: 'check_visual_inspection',
    name: 'Visual Inspection',
    type: 'photo',
    instructions: 'Take clear photos of material from multiple angles. Document any defects or irregularities.',
    icon: '📸',
  },
  {
    template_id: 'check_supervisor_approval',
    name: 'Supervisor Approval',
    type: 'signature',
    instructions: 'Supervisor must review and sign off on this step before proceeding.',
    icon: '✍️',
  },
  {
    template_id: 'check_safety_checklist',
    name: 'Safety Checklist',
    type: 'checklist',
    instructions: 'Complete safety checklist before starting work',
    icon: '✅',
    checklist_items: [
      'PPE worn correctly',
      'Work area clean and organized',
      'Equipment inspected',
      'Fire extinguisher accessible',
    ],
  },
  {
    template_id: 'check_temperature',
    name: 'Temperature Reading',
    type: 'instruction',
    instructions: 'Record furnace temperature. Ensure it is within operating range (1000-1100°C).',
    icon: '🌡️',
  },
  {
    template_id: 'check_purity_test',
    name: 'Purity Test',
    type: 'instruction',
    instructions: 'Perform XRF analysis and record purity percentage. Must be >99.5% for gold.',
    icon: '🔬',
  },
];

async function seedTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ No admin user found. Run seed-database.ts first');
      process.exit(1);
    }

    console.log('Found admin user:', admin.username);

    // Clear existing templates
    await StationTemplate.deleteMany({});
    await CheckTemplate.deleteMany({});
    console.log('🗑️  Cleared existing templates');

    // Seed station templates
    for (const template of stationTemplates) {
      await StationTemplate.create({
        ...template,
        created_by: admin._id,
      });
    }
    console.log(`✅ Created ${stationTemplates.length} station templates`);

    // Seed check templates
    for (const template of checkTemplates) {
      await CheckTemplate.create({
        ...template,
        created_by: admin._id,
      });
    }
    console.log(`✅ Created ${checkTemplates.length} check templates`);

    console.log('\n🎉 Template seeding completed successfully!');
    console.log('\nCreated templates:');
    console.log('  Stations:', stationTemplates.map(t => t.name).join(', '));
    console.log('  Checks:', checkTemplates.map(t => t.name).join(', '));

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

seedTemplates();









