import mongoose from 'mongoose';

// MongoDB Atlas connection
const MONGODB_URI = "mongodb+srv://ChrisMaree:Rasper270@metconflowsapp.duojvmx.mongodb.net/metcon?retryWrites=true&w=majority&appName=MetConFlowsapp";

const flowSchema = new mongoose.Schema({
  flow_id: String,
  version: String,
  name: String,
  pipeline: String,
  status: String,
  stations: Array,
  created_by: mongoose.Schema.Types.ObjectId,
  effective_date: Date,
  created_at: Date,
  updated_at: Date,
});

const Flow = mongoose.model('Flow', flowSchema);

async function seedGoldFlow() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Check if gold flow already exists
    const existing = await Flow.findOne({ flow_id: 'gold_refining' });
    if (existing) {
      console.log('⚠️  Gold Refining flow already exists. Skipping seed.');
      await mongoose.connection.close();
      return;
    }

    console.log('📝 Creating Gold Refining flow...');

    // Get admin user ID (created in previous seed)
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);
    const admin = await User.findOne({ username: 'admin' });

    const goldFlow = new Flow({
      flow_id: 'gold_refining',
      version: '1.0',
      name: 'Gold Refining Process',
      pipeline: 'gold',
      status: 'active',
      created_by: admin?._id,
      effective_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      stations: [
        {
          station_id: 'receiving',
          name: 'Receiving',
          order: 1,
          steps: [
            {
              step_id: 'receiving_1',
              type: 'instruction',
              name: 'Visual Inspection',
              instructions: 'Check material condition. Verify batch paperwork matches physical delivery. Note any visible contaminants or damage.',
              required: true,
              order: 1,
            },
            {
              step_id: 'receiving_2',
              type: 'mass_check',
              name: 'Initial Weigh-In',
              instructions: 'Place material on calibrated scale. Photo required.',
              expected_mass: null,
              tolerance: 1.0,
              tolerance_unit: 'g',
              required: true,
              order: 2,
            },
            {
              step_id: 'receiving_3',
              type: 'checklist',
              name: 'Documentation',
              instructions: 'Verify job number, customer details, material type, and chain of custody.',
              required: true,
              order: 3,
            },
          ],
        },
        {
          station_id: 'pre_processing',
          name: 'Pre-Processing',
          order: 2,
          steps: [
            {
              step_id: 'prep_1',
              type: 'instruction',
              name: 'Material Sorting',
              instructions: 'Separate by type (jewelry, wire, electronic scrap). Remove non-metallic attachments.',
              required: true,
              order: 1,
            },
            {
              step_id: 'prep_2',
              type: 'mass_check',
              name: 'Pre-Process Weigh',
              instructions: 'Verify no material loss during sorting.',
              tolerance: 0.5,
              tolerance_unit: 'g',
              required: true,
              order: 2,
            },
            {
              step_id: 'prep_3',
              type: 'checklist',
              name: 'Safety Check',
              instructions: 'PPE verified. Ventilation operational. Fire suppression accessible.',
              required: true,
              order: 3,
            },
          ],
        },
        {
          station_id: 'refining',
          name: 'Refining',
          order: 3,
          steps: [
            {
              step_id: 'refining_1',
              type: 'mass_check',
              name: 'Pre-Refining Weigh',
              instructions: 'Photo required. Tighter control at this stage.',
              tolerance: 0.2,
              tolerance_unit: 'g',
              required: true,
              order: 1,
            },
            {
              step_id: 'refining_2',
              type: 'instruction',
              name: 'Refining Process',
              instructions: 'Load material into refining vessel. Follow chemical addition sequence per SOP. Monitor temperature and reaction time.',
              required: true,
              order: 2,
            },
            {
              step_id: 'refining_3',
              type: 'signature',
              name: 'Process Completion',
              instructions: 'Operator confirms process complete. Time and temperature logs attached. Supervisor sign-off required.',
              required: true,
              order: 3,
            },
          ],
        },
        {
          station_id: 'assay_qc',
          name: 'Assay & QC',
          order: 4,
          steps: [
            {
              step_id: 'assay_1',
              type: 'mass_check',
              name: 'Post-Refining Weigh',
              instructions: 'Photo required. Expected yield loss calculated from previous step.',
              tolerance: 0.5,
              tolerance_unit: 'g',
              required: true,
              order: 1,
            },
            {
              step_id: 'assay_2',
              type: 'instruction',
              name: 'Assay Sample Preparation',
              instructions: 'Take representative sample. Document sample weight and location. Submit to assay equipment.',
              required: true,
              order: 2,
            },
            {
              step_id: 'assay_3',
              type: 'checklist',
              name: 'Purity Verification',
              instructions: 'Assay result must be ≥99.5% pure (or customer spec). Record purity percentage. If fails: return to refining.',
              required: true,
              order: 3,
            },
          ],
        },
        {
          station_id: 'casting',
          name: 'Casting',
          order: 5,
          steps: [
            {
              step_id: 'casting_1',
              type: 'mass_check',
              name: 'Pre-Cast Weigh',
              instructions: 'Photo required. Highest precision needed.',
              tolerance: 0.1,
              tolerance_unit: 'g',
              required: true,
              order: 1,
            },
            {
              step_id: 'casting_2',
              type: 'instruction',
              name: 'Casting Process',
              instructions: 'Melt and pour into molds. Cool and remove from molds. Visual inspection for defects.',
              required: true,
              order: 2,
            },
            {
              step_id: 'casting_3',
              type: 'mass_check',
              name: 'Final Weigh',
              instructions: 'Photo required. Final product tolerance.',
              tolerance: 0.1,
              tolerance_unit: 'g',
              required: true,
              order: 3,
            },
            {
              step_id: 'casting_4',
              type: 'checklist',
              name: 'Stamping & Marking',
              instructions: 'Apply batch number stamp. Record bar/granule count. Purity mark applied (if required).',
              required: true,
              order: 4,
            },
            {
              step_id: 'casting_5',
              type: 'signature',
              name: 'Final Documentation',
              instructions: 'QC inspector approval. Photography of final product. Packaging instructions confirmed.',
              required: true,
              order: 5,
            },
          ],
        },
        {
          station_id: 'shipping',
          name: 'Shipping',
          order: 6,
          steps: [
            {
              step_id: 'shipping_1',
              type: 'checklist',
              name: 'Final Verification',
              instructions: 'Count matches previous record. All documentation complete. Customer notification sent.',
              required: true,
              order: 1,
            },
            {
              step_id: 'shipping_2',
              type: 'photo',
              name: 'Packaging',
              instructions: 'Secure packaging per security protocol. Seal and label. Photo of sealed package.',
              required: true,
              order: 2,
            },
            {
              step_id: 'shipping_3',
              type: 'signature',
              name: 'Handoff',
              instructions: 'Shipping company or customer signature. Chain of custody complete. Batch marked complete in system.',
              required: true,
              order: 3,
            },
          ],
        },
      ],
    });

    await goldFlow.save();

    console.log('✅ Gold Refining flow created successfully!');
    console.log('');
    console.log('📊 Flow Details:');
    console.log(`   Name: ${goldFlow.name}`);
    console.log(`   Version: ${goldFlow.version}`);
    console.log(`   Pipeline: ${goldFlow.pipeline}`);
    console.log(`   Stations: ${goldFlow.stations.length}`);
    console.log(`   Total Steps: ${goldFlow.stations.reduce((sum: number, s: any) => sum + s.steps.length, 0)}`);
    console.log('');
    console.log('🎉 Database seeded with default flow!');

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error seeding flow:', error);
    process.exit(1);
  }
}

seedGoldFlow();

