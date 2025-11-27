import mongoose from 'mongoose';
import { Batch } from './src/models/Batch.js';

// This script should be run on the server to delete batches from the production database
const deleteAllBatches = async () => {
  try {
    // Use MONGODB_URI from environment (set in docker-compose.prod.yml)
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable not set');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Count before deletion
    const countBefore = await Batch.countDocuments({});
    console.log(`📊 Found ${countBefore} batch(es) in database`);

    if (countBefore === 0) {
      console.log('✅ No batches to delete');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete all batches
    console.log('🗑️ Deleting all batches...');
    const result = await Batch.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} batch(es) from the database`);

    // Verify deletion
    const countAfter = await Batch.countDocuments({});
    console.log(`📊 Remaining batches: ${countAfter}`);

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting batches:', error);
    process.exit(1);
  }
};

deleteAllBatches();

