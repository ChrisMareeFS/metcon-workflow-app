import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './dist/models/Batch.js';

dotenv.config();

const deleteAllBatches = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const countBefore = await Batch.countDocuments({});
    console.log(`📊 Found ${countBefore} batch(es) in database`);

    if (countBefore === 0) {
      console.log('✅ No batches to delete');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('🗑️ Deleting all batches...');
    const result = await Batch.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} batch(es)`);

    const countAfter = await Batch.countDocuments({});
    console.log(`📊 Remaining batches: ${countAfter}`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

deleteAllBatches();

