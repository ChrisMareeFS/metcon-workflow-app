import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// MongoDB Atlas connection
const MONGODB_URI = "mongodb+srv://ChrisMaree:Rasper270@metconflowsapp.duojvmx.mongodb.net/metcon?retryWrites=true&w=majority&appName=MetConFlowsapp";

// User schema (simplified for seeding)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password_hash: String,
  role: String,
  permissions: [String],
  stations: [String],
  two_factor_enabled: Boolean,
  two_factor_method: String,
  two_factor_secret: String,
  phone_number: String,
  backup_codes: [String],
  active: Boolean,
  created_at: Date,
  updated_at: Date,
});

const User = mongoose.model('User', userSchema);

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Check if users already exist
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log(`⚠️  Database already has ${existingUsers} users. Skipping seed.`);
      console.log('   To re-seed, delete users from MongoDB Atlas first.');
      await mongoose.connection.close();
      return;
    }

    console.log('📝 Creating default users...');

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const supervisorPasswordHash = await bcrypt.hash('Supervisor123!', 10);
    const operatorPasswordHash = await bcrypt.hash('Operator123!', 10);
    const analystPasswordHash = await bcrypt.hash('Analyst123!', 10);

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@metcon.local',
      password_hash: adminPasswordHash,
      role: 'admin',
      permissions: ['*'],
      stations: [],
      two_factor_enabled: false,
      two_factor_method: null,
      two_factor_secret: null,
      phone_number: null,
      backup_codes: [],
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create supervisor user
    const supervisor = new User({
      username: 'supervisor1',
      email: 'supervisor1@metcon.local',
      password_hash: supervisorPasswordHash,
      role: 'supervisor',
      permissions: ['execute_batch', 'approve_exceptions', 'view_all_performance', 'manage_flows'],
      stations: [],
      two_factor_enabled: false,
      two_factor_method: null,
      two_factor_secret: null,
      phone_number: null,
      backup_codes: [],
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create operator user
    const operator = new User({
      username: 'operator1',
      email: 'operator1@metcon.local',
      password_hash: operatorPasswordHash,
      role: 'operator',
      permissions: ['execute_batch', 'view_own_performance'],
      stations: ['receiving', 'pre_processing'],
      two_factor_enabled: false,
      two_factor_method: null,
      two_factor_secret: null,
      phone_number: null,
      backup_codes: [],
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create analyst user
    const analyst = new User({
      username: 'analyst1',
      email: 'analyst1@metcon.local',
      password_hash: analystPasswordHash,
      role: 'analyst',
      permissions: ['view_analytics', 'export_reports'],
      stations: [],
      two_factor_enabled: false,
      two_factor_method: null,
      two_factor_secret: null,
      phone_number: null,
      backup_codes: [],
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await admin.save();
    await supervisor.save();
    await operator.save();
    await analyst.save();

    console.log('✅ Default users created successfully!');
    console.log('');
    console.log('👤 Admin User:');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log('');
    console.log('👤 Supervisor User:');
    console.log('   Username: supervisor1');
    console.log('   Password: Supervisor123!');
    console.log('');
    console.log('👤 Operator User:');
    console.log('   Username: operator1');
    console.log('   Password: Operator123!');
    console.log('');
    console.log('👤 Analyst User:');
    console.log('   Username: analyst1');
    console.log('   Password: Analyst123!');
    console.log('');
    console.log('🎉 Database seeded successfully!');

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();











