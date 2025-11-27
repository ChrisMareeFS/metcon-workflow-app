import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './src/models/Batch.js';

// Load environment variables
dotenv.config();

const deleteAllBatches = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/metcon';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Delete all batches
    const result = await Batch.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} batch(es) from the database`);

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

