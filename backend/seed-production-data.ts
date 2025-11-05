import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from './dist/models/User.js';
import { Flow } from './dist/models/Flow.js';
import { Batch } from './dist/models/Batch.js';
import { StationTemplate } from './dist/models/StationTemplate.js';
import { CheckTemplate } from './dist/models/CheckTemplate.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

interface IUserDoc {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  role: string;
  stations: string[];
}

interface IFlowDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  pipeline: string;
  stations: any[];
}

interface IStationDoc {
  _id: mongoose.Types.ObjectId;
  template_id: string;
  name: string;
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (except admin)
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({ username: { $ne: 'admin' } });
    await Flow.deleteMany({});
    await Batch.deleteMany({});
    await StationTemplate.deleteMany({});
    await CheckTemplate.deleteMany({});

    // ==================== CREATE USERS ====================
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    const users: IUserDoc[] = [
      // Operators
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'operator1',
        email: 'operator1@metcon.com',
        role: 'operator',
        stations: ['receiving', 'melting', 'refining']
      },
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'operator2',
        email: 'operator2@metcon.com',
        role: 'operator',
        stations: ['melting', 'refining', 'casting']
      },
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'operator3',
        email: 'operator3@metcon.com',
        role: 'operator',
        stations: ['refining', 'casting', 'quality']
      },
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'operator4',
        email: 'operator4@metcon.com',
        role: 'operator',
        stations: ['receiving', 'melting']
      },
      // Supervisors
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'supervisor1',
        email: 'supervisor1@metcon.com',
        role: 'supervisor',
        stations: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'supervisor2',
        email: 'supervisor2@metcon.com',
        role: 'supervisor',
        stations: []
      },
      // Analyst
      {
        _id: new mongoose.Types.ObjectId(),
        username: 'analyst1',
        email: 'analyst1@metcon.com',
        role: 'analyst',
        stations: []
      }
    ];

    for (const userData of users) {
      await User.create({
        ...userData,
        password_hash: hashedPassword,
        active: true,
        permissions: userData.role === 'operator' ? ['batches.view', 'batches.execute'] :
                     userData.role === 'supervisor' ? ['all'] :
                     ['analytics.view', 'reports.export'],
        two_factor_enabled: false
      });
    }
    console.log(`✅ Created ${users.length} users`);

    // ==================== CREATE STATION TEMPLATES ====================
    console.log('🏭 Creating station templates...');
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) throw new Error('Admin user not found');
    
    const stationTemplates = [
      {
        template_id: 'receiving',
        name: 'Receiving',
        description: 'Material intake and verification',
        icon: '📥',
        order: 1
      },
      {
        template_id: 'melting',
        name: 'Melting',
        description: 'Melt material in furnace',
        icon: '🔥',
        order: 2
      },
      {
        template_id: 'refining',
        name: 'Refining',
        description: 'Purify molten metal',
        icon: '⚗️',
        order: 3
      },
      {
        template_id: 'casting',
        name: 'Casting',
        description: 'Pour into molds',
        icon: '🔨',
        order: 4
      },
      {
        template_id: 'quality',
        name: 'Quality Control',
        description: 'Final inspection and assay',
        icon: '✓',
        order: 5
      },
      {
        template_id: 'shipping',
        name: 'Shipping',
        description: 'Package and dispatch',
        icon: '📦',
        order: 6
      }
    ];

    for (const template of stationTemplates) {
      await StationTemplate.create({
        ...template,
        active: true,
        requires_supervisor_approval: ['refining', 'quality'].includes(template.template_id),
        created_by: adminUser._id
      });
    }
    console.log(`✅ Created ${stationTemplates.length} station templates`);

    // ==================== CREATE CHECK TEMPLATES ====================
    console.log('✅ Creating check templates...');
    const checkTemplates = [
      {
        template_id: 'mass_check',
        name: 'Mass Verification',
        type: 'mass_check',
        instructions: 'Verify material mass',
        icon: '⚖️',
        tolerance: 0.5,
        tolerance_unit: '%'
      },
      {
        template_id: 'visual_inspection',
        name: 'Visual Inspection',
        type: 'checklist',
        instructions: 'Visual quality check',
        icon: '👁️',
        checklist_items: ['No contamination', 'Proper color', 'No cracks']
      },
      {
        template_id: 'temperature_check',
        name: 'Temperature Check',
        type: 'instruction',
        instructions: 'Verify operating temperature',
        icon: '🌡️'
      }
    ];

    for (const template of checkTemplates) {
      await CheckTemplate.create({
        ...template,
        created_by: adminUser._id
      });
    }
    console.log(`✅ Created ${checkTemplates.length} check templates`);

    // ==================== CREATE FLOWS ====================
    console.log('🌊 Creating flows...');
    const flows: { flow: IFlowDoc; stationCount: number }[] = [];

    const pipelineConfigs = [
      { name: 'Copper Refining', pipeline: 'copper', stations: ['receiving', 'melting', 'refining', 'casting', 'quality', 'shipping'] },
      { name: 'Silver Processing', pipeline: 'silver', stations: ['receiving', 'melting', 'refining', 'quality', 'shipping'] },
      { name: 'Gold Standard', pipeline: 'gold', stations: ['receiving', 'melting', 'refining', 'casting', 'quality', 'shipping'] }
    ];

    for (const config of pipelineConfigs) {
      const flowStations = config.stations.map((stationId, index) => ({
        station_id: new mongoose.Types.ObjectId().toString(),
        template_id: stationId,
        name: stationTemplates.find(s => s.template_id === stationId)?.name || stationId,
        order: index + 1,
        steps: [
          {
            step_id: `${stationId}_instruction`,
            type: 'instruction',
            title: `${stationId.charAt(0).toUpperCase() + stationId.slice(1)} Instructions`,
            content: `Follow standard operating procedure for ${stationId}`,
            order: 1
          },
          {
            step_id: `${stationId}_mass_check`,
            type: 'mass_check',
            title: 'Mass Check',
            content: 'Weigh material and verify within tolerance',
            tolerance_percent: 0.5,
            order: 2
          },
          {
            step_id: `${stationId}_photo`,
            type: 'photo',
            title: 'Photo Evidence',
            content: 'Take photo of completed work',
            order: 3
          },
          {
            step_id: `${stationId}_signature`,
            type: 'signature',
            title: 'Operator Sign-off',
            content: 'Confirm completion',
            order: 4
          }
        ]
      }));

      const flow = await Flow.create({
        _id: new mongoose.Types.ObjectId(),
        flow_id: `flow_${config.pipeline}`,
        name: config.name,
        description: `Standard ${config.pipeline} processing workflow`,
        pipeline: config.pipeline,
        version: '1',
        status: 'active',
        stations: flowStations,
        created_by: users[0]._id,
        effective_date: new Date('2025-01-01')
      });

      flows.push({ flow: flow as any, stationCount: flowStations.length });
    }
    console.log(`✅ Created ${flows.length} flows`);

    // ==================== CREATE BATCHES ====================
    console.log('📦 Creating batches with analytics data...');

    const operators = users.filter(u => u.role === 'operator');
    const batchesPerPipeline = 30;
    let totalBatches = 0;

    for (const flowData of flows) {
      const flow = flowData.flow;
      const stationCount = flowData.stationCount;
      
      for (let i = 1; i <= batchesPerPipeline; i++) {
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const createdDate = new Date(2025, month - 1, day);
        
        const batchNumber = `2025_${flow.pipeline.toUpperCase().substring(0, 2)}_${String(totalBatches + 1).padStart(3, '0')}`;
        
        // Generate varied analytics data
        const fineGramsReceived = 1000 + Math.random() * 4000; // 1000-5000g
        const lossGainPercent = (Math.random() - 0.5) * 2; // -1% to +1%
        const lossGainG = fineGramsReceived * (lossGainPercent / 100);
        const actualOutputG = fineGramsReceived + lossGainG;
        const overallRecoveryPercent = (actualOutputG / fineGramsReceived) * 100;
        
        // FTT (First Time Through) hours - excluding weekends
        const fttHours = 24 + Math.random() * 72; // 24-96 hours
        const fttRecoveryPercent = 85 + Math.random() * 14; // 85-99%
        
        // Determine status - most completed, some in progress
        const statusRoll = Math.random();
        const status = statusRoll > 0.15 ? 'completed' : 'in_progress';
        const currentStation = status === 'completed' ? stationCount - 1 : Math.floor(Math.random() * stationCount);
        
        const operator = operators[Math.floor(Math.random() * operators.length)];

        const events = [
          {
            event_id: new mongoose.Types.ObjectId().toString(),
            type: 'batch_created',
            timestamp: createdDate,
            user_id: operator._id.toString(),
            data: { batch_number: batchNumber }
          }
        ];

        if (status === 'completed') {
          // Add completion event
          const completedDate = new Date(createdDate.getTime() + fttHours * 60 * 60 * 1000);
          events.push({
            event_id: new mongoose.Types.ObjectId().toString(),
            type: 'batch_completed',
            timestamp: completedDate,
            user_id: operator._id.toString(),
            data: { 
              final_mass: actualOutputG,
              recovery: overallRecoveryPercent
            }
          });
        }

        await Batch.create({
          batch_number: batchNumber,
          flow_id: flow._id,
          pipeline: flow.pipeline,
          status,
          current_station: currentStation,
          material_description: `${flow.pipeline.charAt(0).toUpperCase() + flow.pipeline.slice(1)} material`,
          source: 'Manual Entry',
          fine_grams_received: fineGramsReceived,
          loss_gain_g: lossGainG,
          overall_recovery_percent: overallRecoveryPercent,
          ftt_hours: fttHours,
          ftt_recovery_percent: fttRecoveryPercent,
          created_by: operator._id,
          created_at: createdDate,
          completed_at: status === 'completed' ? new Date(createdDate.getTime() + fttHours * 60 * 60 * 1000) : undefined,
          events,
          flags: lossGainPercent < -0.5 || lossGainPercent > 0.5 ? ['high_variance'] : []
        });

        totalBatches++;
      }
    }

    console.log(`✅ Created ${totalBatches} batches across all pipelines`);

    // ==================== SUMMARY ====================
    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Station Templates: ${stationTemplates.length}`);
    console.log(`   Check Templates: ${checkTemplates.length}`);
    console.log(`   Flows: ${flows.length}`);
    console.log(`   Batches: ${totalBatches}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:       admin / admin123');
    console.log('   Operators:   operator1-4 / Password123!');
    console.log('   Supervisors: supervisor1-2 / Password123!');
    console.log('   Analyst:     analyst1 / Password123!');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

seedDatabase();

