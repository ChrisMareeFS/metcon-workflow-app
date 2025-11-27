import mongoose from 'mongoose';
import { Batch } from './dist/models/Batch.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    const count = await Batch.countDocuments();
    console.log('📊 Found', count, 'batches in database');
    
    if (count > 0) {
      const result = await Batch.deleteMany({});
      console.log('✅ Deleted', result.deletedCount, 'batches');
      
      const remaining = await Batch.countDocuments();
      console.log('📊 Remaining batches:', remaining);
    } else {
      console.log('✅ No batches to delete');
    }
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
