import mongoose from 'mongoose';
import { Batch } from './src/models/Batch.ts';
import { Flow } from './src/models/Flow.ts';
import { User } from './src/models/User.ts';

async function seedAllFlows() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect(
      'mongodb+srv://ChrisMaree:Rasper270@metconflowsapp.duojvmx.mongodb.net/metcon?retryWrites=true&w=majority&appName=MetConFlowsapp'
    );
    console.log('✅ Connected to MongoDB Atlas');

    // Get operator and flows
    const operator = await User.findOne({ username: 'operator1' });
    const goldFlow = await Flow.findOne({ pipeline: 'gold', status: 'active' });
    const silverFlow = await Flow.findOne({ pipeline: 'silver', status: 'active' });
    const pgmFlow = await Flow.findOne({ pipeline: 'pgm', status: 'active' });

    if (!operator || !goldFlow) {
      console.log('❌ No operator or gold flow found. Please create users and flows first.');
      process.exit(1);
    }

    console.log('📝 Creating batches for all flows...');
    console.log('🗑️  Clearing existing batches...');
    await Batch.deleteMany({});

    const batches = [];

    // Helper function to calculate business hours
    function calculateBusinessHours(start: Date, end: Date): number {
      let totalHours = 0;
      let current = new Date(start);

      while (current < end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          totalHours++;
        }
        current.setHours(current.getHours() + 1);
      }

      return totalHours;
    }

    // Create 20 gold batches
    for (let i = 1; i <= 20; i++) {
      const batchDate = new Date('2025-01-10');
      batchDate.setDate(batchDate.getDate() + (i - 1) * 9);

      const baseWeight = 80000 + (i * 8000);
      const variation = (Math.random() - 0.5) * 20000;
      const receivedWeight = baseWeight + variation;
      const fineContentPercent = 99.35 + Math.random() * 0.65;
      const fineGramsReceived = receivedWeight * (fineContentPercent / 100);

      const wavePattern = Math.sin(i / 8) * 0.003;
      const randomVariance = (Math.random() - 0.5) * 0.006;
      const variance = wavePattern + randomVariance;
      const actualOutputG = fineGramsReceived * (1 + variance);
      const lossGainG = actualOutputG - fineGramsReceived;
      const lossGainPercent = (lossGainG / fineGramsReceived) * 100;
      const overallRecoveryPercent = (actualOutputG / fineGramsReceived) * 100;

      const processingHours = 18 + Math.floor(Math.random() * 32);
      const meltingReceivedAt = new Date(batchDate);
      const firstExportAt = new Date(meltingReceivedAt);
      firstExportAt.setHours(firstExportAt.getHours() + processingHours);
      const fttHours = calculateBusinessHours(meltingReceivedAt, firstExportAt);

      const batch = new Batch({
        batch_number: `2025_AU_${String(i).padStart(3, '0')}`,
        pipeline: 'gold',
        flow_id: goldFlow._id,
        flow_version: goldFlow.version,
        current_node_id: 'shipping',
        completed_node_ids: ['receiving', 'pre_processing', 'refining', 'assay_qc', 'casting'],
        status: 'completed',
        priority: 'normal',
        events: [{
          event_id: `evt_${i}_1`,
          type: 'batch_created',
          timestamp: batchDate,
          user_id: operator._id,
          station: 'receiving',
          step: 'receiving_1',
          data: {},
        }],
        flags: [],
        supplier: 'Geita Gold Refinery Limited (Tanzania)',
        drill_number: `S${String(i).padStart(4, '0')}`,
        destination: 'Export',
        received_weight_g: receivedWeight,
        fine_content_percent: fineContentPercent,
        fine_grams_received: fineGramsReceived,
        output_weight_g: fineGramsReceived * 0.95,
        first_time_recovery_g: fineGramsReceived * 0.95,
        total_recovery_g: fineGramsReceived,
        loss_gain_g: lossGainG,
        loss_gain_percent: lossGainPercent,
        overall_recovery_percent: overallRecoveryPercent,
        melting_received_at: meltingReceivedAt,
        first_export_at: firstExportAt,
        ftt_hours: fttHours,
        expected_output_g: fineGramsReceived,
        actual_output_g: actualOutputG,
        created_by: operator._id,
        created_at: batchDate,
        started_at: meltingReceivedAt,
        completed_at: batchDate,
        updated_at: new Date(),
      });

      batches.push(batch);
    }

    // Create 15 silver batches (if flow exists)
    if (silverFlow) {
      for (let i = 1; i <= 15; i++) {
        const batchDate = new Date('2025-01-15');
        batchDate.setDate(batchDate.getDate() + (i - 1) * 12);

        const baseWeight = 120000 + (i * 5000);
        const variation = (Math.random() - 0.5) * 15000;
        const receivedWeight = baseWeight + variation;
        const fineContentPercent = 95.5 + Math.random() * 3.5;
        const fineGramsReceived = receivedWeight * (fineContentPercent / 100);

        const variance = (Math.random() - 0.5) * 0.008;
        const actualOutputG = fineGramsReceived * (1 + variance);
        const lossGainG = actualOutputG - fineGramsReceived;
        const lossGainPercent = (lossGainG / fineGramsReceived) * 100;
        const overallRecoveryPercent = (actualOutputG / fineGramsReceived) * 100;

        const processingHours = 24 + Math.floor(Math.random() * 24);
        const fttHours = processingHours;

        const batch = new Batch({
          batch_number: `2025_AG_${String(i).padStart(3, '0')}`,
          pipeline: 'silver',
          flow_id: silverFlow._id,
          flow_version: silverFlow.version,
          current_node_id: 'shipping',
          completed_node_ids: ['receiving', 'pre_processing', 'refining', 'assay_qc', 'casting'],
          status: 'completed',
          priority: 'normal',
          events: [{
            event_id: `evt_ag_${i}_1`,
            type: 'batch_created',
            timestamp: batchDate,
            user_id: operator._id,
            station: 'receiving',
            step: 'receiving_1',
            data: {},
          }],
          flags: [],
          supplier: 'Silver Mining Corp',
          drill_number: `AG${String(i).padStart(4, '0')}`,
          destination: 'Export',
          received_weight_g: receivedWeight,
          fine_content_percent: fineContentPercent,
          fine_grams_received: fineGramsReceived,
          output_weight_g: fineGramsReceived * 0.95,
          first_time_recovery_g: fineGramsReceived * 0.95,
          total_recovery_g: fineGramsReceived,
          loss_gain_g: lossGainG,
          loss_gain_percent: lossGainPercent,
          overall_recovery_percent: overallRecoveryPercent,
          ftt_hours: fttHours,
          expected_output_g: fineGramsReceived,
          actual_output_g: actualOutputG,
          created_by: operator._id,
          created_at: batchDate,
          started_at: batchDate,
          completed_at: batchDate,
          updated_at: new Date(),
        });

        batches.push(batch);
      }
    }

    // Create 10 PGM batches (if flow exists)
    if (pgmFlow) {
      for (let i = 1; i <= 10; i++) {
        const batchDate = new Date('2025-02-01');
        batchDate.setDate(batchDate.getDate() + (i - 1) * 15);

        const baseWeight = 50000 + (i * 3000);
        const variation = (Math.random() - 0.5) * 10000;
        const receivedWeight = baseWeight + variation;
        const fineContentPercent = 85 + Math.random() * 10;
        const fineGramsReceived = receivedWeight * (fineContentPercent / 100);

        const variance = (Math.random() - 0.5) * 0.01;
        const actualOutputG = fineGramsReceived * (1 + variance);
        const lossGainG = actualOutputG - fineGramsReceived;
        const lossGainPercent = (lossGainG / fineGramsReceived) * 100;
        const overallRecoveryPercent = (actualOutputG / fineGramsReceived) * 100;

        const processingHours = 36 + Math.floor(Math.random() * 48);
        const fttHours = processingHours;

        const batch = new Batch({
          batch_number: `2025_PGM_${String(i).padStart(3, '0')}`,
          pipeline: 'pgm',
          flow_id: pgmFlow._id,
          flow_version: pgmFlow.version,
          current_node_id: 'shipping',
          completed_node_ids: ['receiving', 'pre_processing', 'refining', 'assay_qc', 'casting'],
          status: 'completed',
          priority: 'normal',
          events: [{
            event_id: `evt_pgm_${i}_1`,
            type: 'batch_created',
            timestamp: batchDate,
            user_id: operator._id,
            station: 'receiving',
            step: 'receiving_1',
            data: {},
          }],
          flags: [],
          supplier: 'PGM Refinery Ltd',
          drill_number: `PGM${String(i).padStart(4, '0')}`,
          destination: 'Export',
          received_weight_g: receivedWeight,
          fine_content_percent: fineContentPercent,
          fine_grams_received: fineGramsReceived,
          output_weight_g: fineGramsReceived * 0.95,
          first_time_recovery_g: fineGramsReceived * 0.95,
          total_recovery_g: fineGramsReceived,
          loss_gain_g: lossGainG,
          loss_gain_percent: lossGainPercent,
          overall_recovery_percent: overallRecoveryPercent,
          ftt_hours: fttHours,
          expected_output_g: fineGramsReceived,
          actual_output_g: actualOutputG,
          created_by: operator._id,
          created_at: batchDate,
          started_at: batchDate,
          completed_at: batchDate,
          updated_at: new Date(),
        });

        batches.push(batch);
      }
    }

    // Save all batches
    for (const batch of batches) {
      await batch.save();
    }

    console.log(`✅ Created ${batches.length} sample batches!`);
    console.log('');
    console.log('📊 Sample Data Summary:');
    console.log(`   Gold batches: 20`);
    console.log(`   Silver batches: ${silverFlow ? 15 : 0}`);
    console.log(`   PGM batches: ${pgmFlow ? 10 : 0}`);
    console.log(`   Total: ${batches.length}`);
    console.log('   Date range: January - November 2025 (YTD)');
    console.log('');
    console.log('🎉 All flows seeded successfully!');

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error seeding flows:', error);
    process.exit(1);
  }
}

seedAllFlows();

