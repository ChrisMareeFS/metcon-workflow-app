import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import { Batch } from './src/models/Batch.js';

dotenv.config();

async function seedOperatorsAndAssign() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || '';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create 3 operators if they don't exist
    const operators = [
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

    const createdOperators = [];

    for (const op of operators) {
      let user = await User.findOne({ username: op.username });
      
      if (!user) {
        console.log(`📝 Creating ${op.username}...`);
        const password_hash = await bcrypt.hash(op.password, 10);
        
        user = new User({
          username: op.username,
          email: op.email,
          password_hash,
          role: 'operator',
          permissions: ['execute_batch', 'view_own_performance'],
          stations: op.stations,
          two_factor_enabled: false,
          two_factor_method: null,
          two_factor_secret: null,
          phone_number: null,
          backup_codes: [],
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
        
        await user.save();
        console.log(`✅ ${op.username} created`);
      } else {
        console.log(`⚠️  ${op.username} already exists`);
      }
      
      createdOperators.push(user);
    }

    // Assign operators to existing batches
    console.log('\n📊 Assigning operators to batches...');
    const batches = await Batch.find({ status: 'completed' }).sort({ completed_at: 1 });
    
    if (batches.length === 0) {
      console.log('⚠️  No completed batches found. Run seed-analytics-batches.ts first.');
    } else {
      let assignedCount = 0;
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Distribute batches among operators (round-robin)
        const operatorIndex = i % createdOperators.length;
        const operator = createdOperators[operatorIndex];
        
        batch.created_by = operator._id;
        
        // Also update the events to reflect the operator
        if (batch.events && batch.events.length > 0) {
          batch.events[0].user_id = operator._id;
          batch.events[0].username = operator.username;
        }
        
        await batch.save();
        assignedCount++;
      }
      
      console.log(`✅ Assigned ${assignedCount} batches to ${createdOperators.length} operators`);
    }

    // Show summary
    console.log('\n📈 Summary:');
    for (const operator of createdOperators) {
      const batchCount = await Batch.countDocuments({ 
        created_by: operator._id,
        status: 'completed' 
      });
      console.log(`   ${operator.username}: ${batchCount} batches`);
    }

    console.log('\n🎉 Done! Operators created and assigned to batches.');
    console.log('\n👥 Available operators:');
    operators.forEach(op => {
      console.log(`   ${op.username} / ${op.password}`);
    });

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedOperatorsAndAssign();

