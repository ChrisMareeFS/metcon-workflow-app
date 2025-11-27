import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './src/models/Batch.js';

// Load environment variables
dotenv.config();

const checkBatches = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/metcon';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Count batches
    const count = await Batch.countDocuments({});
    console.log(`📊 Total batches in database: ${count}`);

    if (count > 0) {
      // Show first few batch numbers
      const batches = await Batch.find({}).limit(10).select('batch_number status');
      console.log('\n📋 Sample batches:');
      batches.forEach(batch => {
        console.log(`  - ${batch.batch_number} (${batch.status})`);
      });
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking batches:', error);
    process.exit(1);
  }
};

checkBatches();

