import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './src/models/Batch.js';
import { User } from './src/models/User.js';

dotenv.config();

async function testOperatorAnalytics() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected\n');

    // Check completed batches with operators
    const completedBatches = await Batch.find({ 
      status: 'completed',
      created_by: { $exists: true, $ne: null }
    }).populate('created_by', 'username email');

    console.log(`📊 Found ${completedBatches.length} completed batches with operators\n`);

    if (completedBatches.length > 0) {
      console.log('Sample batches:');
      completedBatches.slice(0, 5).forEach(b => {
        console.log(`  - ${b.batch_number}: Operator ${b.created_by?.username || 'Unknown'}`);
      });
    }

    // Test the aggregation query
    console.log('\n🔍 Testing aggregation query...\n');
    
    const operatorStats = await Batch.aggregate([
      { $match: { status: 'completed', created_by: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$created_by',
          total_batches: { $sum: 1 },
          total_fine_grams: { $sum: { $ifNull: ['$fine_grams_received', 0] } },
          total_loss_gain: { $sum: { $ifNull: ['$loss_gain_g', 0] } },
          avg_recovery: { $avg: { $ifNull: ['$overall_recovery_percent', 0] } },
          avg_ftt_hours: { $avg: { $ifNull: ['$ftt_hours', 0] } },
          batches_on_time: {
            $sum: {
              $cond: [{ $lte: ['$ftt_hours', 36] }, 1, 0]
            }
          },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { total_batches: -1 } }
    ]);

    console.log(`✅ Found ${operatorStats.length} operators with stats:\n`);
    
    operatorStats.forEach((op, i) => {
      console.log(`${i + 1}. ${op.user.username} (${op.user.email})`);
      console.log(`   - Batches: ${op.total_batches}`);
      console.log(`   - Fine Grams: ${op.total_fine_grams.toFixed(0)} g`);
      console.log(`   - Avg Recovery: ${op.avg_recovery.toFixed(2)}%`);
      console.log(`   - Avg FTT: ${op.avg_ftt_hours.toFixed(1)}h`);
      console.log(`   - On-Time: ${op.batches_on_time}/${op.total_batches}`);
      console.log('');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testOperatorAnalytics();

