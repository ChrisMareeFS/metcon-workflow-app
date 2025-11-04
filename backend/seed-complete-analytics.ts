import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import { Batch } from './src/models/Batch.js';
import { Flow } from './src/models/Flow.js';

dotenv.config();

async function seedCompleteAnalytics() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    // 1. Ensure operators exist
    console.log('👥 Creating operators...');
    const operators = [];
    
    const operatorData = [
      {
        username: 'operator1',
        email: 'operator1@metcon.local',
        password: 'Operator123!',
        stations: ['station_receiving', 'station_melting', 'station_refining'],
      },
      {
        username: 'operator2',
        email: 'operator2@metcon.local',
        password: 'Operator123!',
        stations: ['station_assay', 'station_casting', 'station_final_inspection'],
      },
      {
        username: 'operator3',
        email: 'operator3@metcon.local',
        password: 'Operator123!',
        stations: ['station_melting', 'station_refining', 'station_assay'],
      },
    ];

    for (const op of operatorData) {
      let user = await User.findOne({ username: op.username });
      
      if (!user) {
        const password_hash = await bcrypt.hash(op.password, 10);
        user = new User({
          username: op.username,
          email: op.email,
          password_hash,
          role: 'operator',
          permissions: ['execute_batch', 'view_own_performance'],
          stations: op.stations,
          two_factor_enabled: false,
          active: true,
        });
        await user.save();
        console.log(`✅ Created ${op.username}`);
      } else {
        console.log(`⚠️  ${op.username} already exists`);
      }
      operators.push(user);
    }

    // 2. Get a flow (gold flow)
    console.log('\n🔄 Finding gold flow...');
    let flow = await Flow.findOne({ pipeline: 'gold', status: 'active' });
    
    if (!flow) {
      console.log('⚠️  No gold flow found. Creating one...');
      flow = new Flow({
        flow_id: 'gold_refining',
        version: '1.0',
        name: 'Gold Refining Process',
        pipeline: 'gold',
        status: 'active',
        nodes: [],
        edges: [],
        created_by: operators[0]._id,
        effective_date: new Date(),
      });
      await flow.save();
      console.log('✅ Created gold flow');
    } else {
      console.log(`✅ Found flow: ${flow.name}`);
    }

    // 3. Clear existing completed batches
    console.log('\n🗑️  Clearing old completed batches...');
    await Batch.deleteMany({ status: 'completed' });
    console.log('✅ Cleared old batches');

    // 4. Create 50 completed batches with full analytics data
    console.log('\n📦 Creating 50 completed batches with analytics...');
    
    const startDate = new Date('2025-01-10');
    const batches = [];

    for (let i = 0; i < 50; i++) {
      const operator = operators[i % operators.length];
      const batchDate = new Date(startDate);
      batchDate.setDate(batchDate.getDate() + (i * 6)); // Every ~6 days

      // Realistic variance
      const baseWeight = 150000 + Math.random() * 100000; // 150-250kg
      const finePercent = 93 + Math.random() * 5; // 93-98%
      const fineGramsReceived = (baseWeight * finePercent) / 100;
      
      // Loss/Gain with realistic variance
      const lossGainBase = (Math.sin(i / 5) * 50) + (Math.random() - 0.5) * 100; // Wave pattern
      const lossGainG = lossGainBase;
      const lossGainPercent = (lossGainG / fineGramsReceived) * 100;
      
      // FTT timing (18-48 hours, mostly business hours)
      const processingHours = 18 + Math.random() * 30;
      const meltingReceived = new Date(batchDate);
      const firstExport = new Date(meltingReceived.getTime() + processingHours * 60 * 60 * 1000);
      
      // Recovery calculations
      const fttRecoveryPercent = 85 + Math.random() * 10; // 85-95%
      const totalRecoveryG = fineGramsReceived * (fttRecoveryPercent / 100);
      const actualOutputG = fineGramsReceived + lossGainG;
      const overallRecoveryPercent = (actualOutputG / fineGramsReceived) * 100;

      const batch = new Batch({
        batch_number: `2025_AU_${String(i + 1).padStart(3, '0')}`,
        pipeline: 'gold',
        flow_id: flow._id,
        flow_version: flow.version,
        status: 'completed',
        priority: Math.random() > 0.8 ? 'high' : 'normal',
        created_by: operator._id,
        
        // Weight data
        initial_weight: baseWeight,
        fine_grams_received: fineGramsReceived,
        fine_content_percent: finePercent,
        
        // Loss/Gain
        loss_gain_g: lossGainG,
        loss_gain_percent: lossGainPercent,
        
        // Recovery
        ftt_recovery_percent: fttRecoveryPercent,
        overall_recovery_percent: overallRecoveryPercent,
        
        // Timing
        melting_received_at: meltingReceived,
        first_export_at: firstExport,
        ftt_hours: processingHours,
        
        // Dates
        created_at: batchDate,
        completed_at: firstExport,
        
        // Events
        events: [
          {
            event_id: new mongoose.Types.ObjectId().toString(),
            type: 'batch_created',
            user_id: operator._id,
            username: operator.username,
            timestamp: batchDate,
          },
          {
            event_id: new mongoose.Types.ObjectId().toString(),
            type: 'batch_completed',
            user_id: operator._id,
            username: operator.username,
            timestamp: firstExport,
          }
        ],
        
        // Nodes
        current_node_id: 'completed',
        completed_node_ids: [],
      });

      batches.push(batch);
    }

    await Batch.insertMany(batches);
    console.log(`✅ Created ${batches.length} completed batches`);

    // 5. Show summary
    console.log('\n📊 Summary by Operator:');
    for (const operator of operators) {
      const stats = await Batch.aggregate([
        { 
          $match: { 
            created_by: operator._id,
            status: 'completed'
          } 
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalFineGrams: { $sum: '$fine_grams_received' },
            avgRecovery: { $avg: '$overall_recovery_percent' },
            avgFTT: { $avg: '$ftt_hours' },
            totalLossGain: { $sum: '$loss_gain_g' },
          }
        }
      ]);

      if (stats.length > 0) {
        const s = stats[0];
        console.log(`\n${operator.username}:`);
        console.log(`  Batches: ${s.count}`);
        console.log(`  Fine Grams: ${s.totalFineGrams.toFixed(0)} g`);
        console.log(`  Avg Recovery: ${s.avgRecovery.toFixed(2)}%`);
        console.log(`  Avg FTT: ${s.avgFTT.toFixed(1)} hours`);
        console.log(`  Total L/G: ${s.totalLossGain > 0 ? '+' : ''}${s.totalLossGain.toFixed(2)} g`);
      }
    }

    console.log('\n🎉 Complete! Operator analytics should now work.');
    console.log('\n👉 Refresh /analytics page to see operator performance leaderboard!');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedCompleteAnalytics();

