import { Router } from 'express';
import { Batch } from '../models/Batch.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);
router.use(apiLimiter);

/**
 * GET /api/analytics/ytd
 * Year-to-date summary statistics
 */
router.get('/ytd', async (req: AuthRequest, res, next) => {
  try {
    const { year = new Date().getFullYear(), pipeline } = req.query;
    
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
    
    // Build filter
    const filter: any = {
      status: 'completed',
      completed_at: { $gte: startDate, $lte: endDate },
    };
    
    // Add pipeline filter if specified
    if (pipeline) {
      filter.pipeline = pipeline;
    }
    
    // Get all completed batches for the year, sorted by completed date
    const batches = await Batch.find(filter).sort({ completed_at: 1 }); // Sort chronologically
    
    if (batches.length === 0) {
      return res.json({
        success: true,
        data: {
          total_batches: 0,
          fine_content: 0,
          ytd_loss_gain: 0,
          overall_recovery: 0,
          first_time_through: 0,
          ftt_recovery: 0,
          max_spread: 0,
        },
      });
    }
    
    // Calculate aggregated stats
    let totalFineGrams = 0;
    let totalLossGainG = 0;
    let totalRecoveryPercent = 0;
    let totalFttHours = 0;
    let totalFttRecoveryG = 0;
    let fttCount = 0;
    let recoveryCount = 0;
    let maxGain = -Infinity;
    let maxLoss = Infinity;
    
    const monthlyBatches = Array(12).fill(0);
    const pipelineStats: Record<string, { batches: number; fine_grams: number; recovery_percent: number }> = {
      copper: { batches: 0, fine_grams: 0, recovery_percent: 0 },
      silver: { batches: 0, fine_grams: 0, recovery_percent: 0 },
      gold: { batches: 0, fine_grams: 0, recovery_percent: 0 },
    };
    
    batches.forEach((batch) => {
      // Fine grams
      if (batch.fine_grams_received) {
        totalFineGrams += batch.fine_grams_received;
      }
      
      // Loss/Gain
      if (batch.loss_gain_g !== null && batch.loss_gain_g !== undefined) {
        totalLossGainG += batch.loss_gain_g;
        if (batch.loss_gain_g > maxGain) maxGain = batch.loss_gain_g;
        if (batch.loss_gain_g < maxLoss) maxLoss = batch.loss_gain_g;
      }
      
      // Overall recovery %
      if (batch.overall_recovery_percent) {
        totalRecoveryPercent += batch.overall_recovery_percent;
        recoveryCount++;
      }
      
      // FTT hours
      if (batch.ftt_hours) {
        totalFttHours += batch.ftt_hours;
        fttCount++;
      }
      
      // FTT recovery
      if (batch.first_time_recovery_g && batch.fine_grams_received) {
        totalFttRecoveryG += (batch.first_time_recovery_g / batch.fine_grams_received) * 100;
      }
      
      // Monthly distribution
      if (batch.completed_at) {
        const month = new Date(batch.completed_at).getMonth();
        monthlyBatches[month]++;
      }
      
      // Pipeline stats
      if (pipelineStats[batch.pipeline]) {
        pipelineStats[batch.pipeline].batches++;
        if (batch.fine_grams_received) {
          pipelineStats[batch.pipeline].fine_grams += batch.fine_grams_received;
        }
        if (batch.overall_recovery_percent) {
          pipelineStats[batch.pipeline].recovery_percent += batch.overall_recovery_percent;
        }
      }
    });
    
    // Calculate averages
    const avgRecoveryPercent = recoveryCount > 0 ? totalRecoveryPercent / recoveryCount : 0;
    const avgFttHours = fttCount > 0 ? totalFttHours / fttCount : 0;
    const avgFttRecoveryPercent = fttCount > 0 ? totalFttRecoveryG / fttCount : 0;
    const lossGainPercent = totalFineGrams > 0 ? (totalLossGainG / totalFineGrams) * 100 : 0;
    const spread = maxGain !== -Infinity && maxLoss !== Infinity ? maxGain - maxLoss : 0;
    
    // Format pipeline stats (calculate averages)
    Object.keys(pipelineStats).forEach((pipeline) => {
      const stats = pipelineStats[pipeline];
      if (stats.batches > 0) {
        stats.recovery_percent = stats.recovery_percent / stats.batches;
      }
    });
    
    // Prepare per-batch details for charts
    const batchDetails = batches.map((batch, index) => ({
      batch_number: batch.batch_number,
      completed_at: batch.completed_at,
      fine_grams_received: batch.fine_grams_received || 0,
      loss_gain_g: batch.loss_gain_g || 0,
      loss_gain_percent: batch.loss_gain_percent || 0,
      overall_recovery_percent: batch.overall_recovery_percent || 0,
      ftt_hours: batch.ftt_hours || 0,
      month: new Date(batch.completed_at || new Date()).toLocaleString('en-US', { month: 'short' }),
      sequence: index + 1, // Batch sequence number for X-axis
    }));
    
    res.json({
      success: true,
      data: {
        ytd_stats: {
          total_batches: batches.length,
          total_fine_grams: totalFineGrams,
          total_loss_gain_g: totalLossGainG,
          loss_gain_percent: lossGainPercent,
          avg_recovery_percent: avgRecoveryPercent,
          avg_ftt_hours: avgFttHours,
          avg_ftt_recovery_percent: avgFttRecoveryPercent,
          max_gain: maxGain !== -Infinity ? maxGain : 0,
          max_loss: maxLoss !== Infinity ? maxLoss : 0,
          spread: spread,
        },
        monthly_batches: monthlyBatches.map((count, index) => ({
          month: new Date(2000, index, 1).toLocaleString('en-US', { month: 'short' }),
          count,
        })),
        by_pipeline: Object.entries(pipelineStats).map(([pipeline, stats]) => ({
          pipeline,
          batches: stats.batches,
          fine_grams: stats.fine_grams,
          recovery_percent: stats.recovery_percent,
        })),
        batch_details: batchDetails, // Add per-batch data
      },
    });
    return;
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/analytics/batches-in-progress
 * Report 1: Batches currently being processed
 */
router.get('/batches-in-progress', async (req: AuthRequest, res, next) => {
  try {
    const { pipeline, priority } = req.query;
    
    const filter: any = {
      status: { $in: ['in_progress', 'flagged', 'blocked'] },
    };
    
    if (pipeline) filter.pipeline = pipeline;
    if (priority) filter.priority = priority;
    
    const batches = await Batch.find(filter)
      .populate('flow_id', 'name version pipeline')
      .populate({
        path: 'events.user_id',
        select: 'username role',
      })
      .sort({ priority: -1, created_at: 1 });
    
    // Calculate time at current station and overall age
    const batchesWithMetrics = batches.map((batch) => {
      const now = new Date();
      const ageHours = batch.started_at 
        ? (now.getTime() - batch.started_at.getTime()) / (1000 * 60 * 60)
        : 0;
      
      // Find last step completion event to calculate time at current station
      const lastStepEvent = [...batch.events]
        .reverse()
        .find((e) => e.type === 'step_completed');
      
      const timeAtStationHours = lastStepEvent
        ? (now.getTime() - lastStepEvent.timestamp.getTime()) / (1000 * 60 * 60)
        : ageHours;
      
      return {
        batch_number: batch.batch_number,
        pipeline: batch.pipeline,
        current_station: batch.current_node_id,
        status: batch.status,
        priority: batch.priority,
        age_hours: Math.round(ageHours * 10) / 10,
        time_at_station_hours: Math.round(timeAtStationHours * 10) / 10,
        flags: batch.flags.map((f) => f.type),
        fine_grams: batch.fine_grams_received || 0,
      };
    });
    
    res.json({
      success: true,
      data: {
        batches: batchesWithMetrics,
        total: batchesWithMetrics.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/mass-checks
 * Report 2: All mass check variances
 */
router.get('/mass-checks', async (req: AuthRequest, res, next) => {
  try {
    const { pipeline, date_from, date_to, variance_threshold } = req.query;
    
    const filter: any = {
      'events.type': 'mass_check',
    };
    
    if (pipeline) filter.pipeline = pipeline;
    if (date_from || date_to) {
      filter['events.timestamp'] = {};
      if (date_from) filter['events.timestamp'].$gte = new Date(date_from as string);
      if (date_to) filter['events.timestamp'].$lte = new Date(date_to as string);
    }
    
    const batches = await Batch.find(filter)
      .populate('events.user_id', 'username role')
      .sort({ 'events.timestamp': -1 });
    
    // Extract mass check events
    const massChecks: any[] = [];
    
    batches.forEach((batch) => {
      batch.events
        .filter((e) => e.type === 'mass_check')
        .forEach((event) => {
          const expected = event.data?.expected_mass || 0;
          const measured = event.data?.measured_mass || 0;
          const variance = measured - expected;
          const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
          const withinTolerance = event.data?.within_tolerance ?? true;
          
          // Apply variance threshold filter if provided
          if (variance_threshold && Math.abs(variancePercent) < Number(variance_threshold)) {
            return;
          }
          
          massChecks.push({
            batch_number: batch.batch_number,
            pipeline: batch.pipeline,
            station: event.station,
            step: event.step,
            timestamp: event.timestamp,
            expected_mass: expected,
            measured_mass: measured,
            variance_g: variance,
            variance_percent: variancePercent,
            within_tolerance: withinTolerance,
            operator: (event.user_id as any)?.username || 'Unknown',
          });
        });
    });
    
    res.json({
      success: true,
      data: {
        mass_checks: massChecks,
        total: massChecks.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/exceptions
 * Report 3: Exception log with approvals
 */
router.get('/exceptions', async (req: AuthRequest, res, next) => {
  try {
    const { pipeline, date_from, date_to, exception_type, status } = req.query;
    
    const filter: any = {
      'flags.0': { $exists: true }, // Has at least one flag
    };
    
    if (pipeline) filter.pipeline = pipeline;
    
    const batches = await Batch.find(filter)
      .populate('flags.approved_by', 'username role')
      .sort({ 'flags.timestamp': -1 });
    
    const exceptions: any[] = [];
    
    batches.forEach((batch) => {
      batch.flags.forEach((flag) => {
        // Filter by date range
        if (date_from && flag.flagged_at < new Date(date_from as string)) return;
        if (date_to && flag.flagged_at > new Date(date_to as string)) return;
        
        // Filter by exception type
        if (exception_type && flag.type !== exception_type) return;
        
        const approvalStatus = flag.approved_by ? 'approved' : 'pending';
        
        // Filter by status
        if (status && approvalStatus !== status) return;
        
        exceptions.push({
          batch_number: batch.batch_number,
          pipeline: batch.pipeline,
          exception_type: flag.type,
          station: batch.current_station || 'unknown',
          reason: flag.reason,
          timestamp: flag.flagged_at,
          approved_by: (flag.approved_by as any)?.username || null,
          status: approvalStatus,
          batch_status: batch.status,
        });
      });
    });
    
    res.json({
      success: true,
      data: {
        exceptions,
        total: exceptions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/station-throughput
 * Report 5: Station bottleneck analysis
 */
router.get('/station-throughput', async (req: AuthRequest, res, next) => {
  try {
    const { date_from, date_to, pipeline } = req.query;
    
    const filter: any = {};
    
    if (pipeline) filter.pipeline = pipeline;
    if (date_from || date_to) {
      filter['events.timestamp'] = {};
      if (date_from) filter['events.timestamp'].$gte = new Date(date_from as string);
      if (date_to) filter['events.timestamp'].$lte = new Date(date_to as string);
    }
    
    const batches = await Batch.find(filter);
    
    // Aggregate by station
    const stationStats: Record<string, any> = {};
    
    batches.forEach((batch) => {
      const stationTimes: Record<string, { start: Date | null; end: Date | null }> = {};
      
      // Track when batch enters and leaves each station
      batch.events.forEach((event, index) => {
        const station = event.station || 'unknown';
        
        if (!stationTimes[station]) {
          stationTimes[station] = { start: event.timestamp, end: null };
        }
        
        // Check if this is the last event at this station
        const nextEvent = batch.events[index + 1];
        if (!nextEvent || nextEvent.station !== station) {
          stationTimes[station].end = event.timestamp;
        }
      });
      
      // Calculate time spent at each station
      Object.entries(stationTimes).forEach(([station, times]) => {
        if (!stationStats[station]) {
          stationStats[station] = {
            station,
            batches_processed: 0,
            total_time_hours: 0,
            min_time_hours: Infinity,
            max_time_hours: -Infinity,
            currently_active: 0,
          };
        }
        
        const stats = stationStats[station];
        stats.batches_processed++;
        
        if (times.start && times.end) {
          const timeHours = (times.end.getTime() - times.start.getTime()) / (1000 * 60 * 60);
          stats.total_time_hours += timeHours;
          if (timeHours < stats.min_time_hours) stats.min_time_hours = timeHours;
          if (timeHours > stats.max_time_hours) stats.max_time_hours = timeHours;
        }
      });
    });
    
    // Count currently active batches at each station
    const activeBatches = await Batch.find({
      status: { $in: ['in_progress', 'flagged', 'blocked'] },
    });
    
    activeBatches.forEach((batch) => {
      const station = batch.current_node_id || 'unknown';
      if (stationStats[station]) {
        stationStats[station].currently_active++;
      }
    });
    
    // Format results
    const throughput = Object.values(stationStats).map((stats: any) => ({
      station: stats.station,
      batches_processed: stats.batches_processed,
      avg_time_hours: stats.total_time_hours / stats.batches_processed,
      min_time_hours: stats.min_time_hours !== Infinity ? stats.min_time_hours : 0,
      max_time_hours: stats.max_time_hours !== -Infinity ? stats.max_time_hours : 0,
      currently_active: stats.currently_active,
    }));
    
    res.json({
      success: true,
      data: {
        throughput,
        total: throughput.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/yield-loss
 * Report 6: Material loss through refining process
 */
router.get('/yield-loss', async (req: AuthRequest, res, next) => {
  try {
    const { date_from, date_to, pipeline, loss_threshold } = req.query;
    
    const filter: any = {
      status: 'completed',
    };
    
    if (pipeline) filter.pipeline = pipeline;
    if (date_from || date_to) {
      filter.completed_at = {};
      if (date_from) filter.completed_at.$gte = new Date(date_from as string);
      if (date_to) filter.completed_at.$lte = new Date(date_to as string);
    }
    
    const batches = await Batch.find(filter);
    
    const yieldData = batches
      .filter((batch) => {
        // Only include batches with complete loss/gain data
        if (!batch.loss_gain_percent) return false;
        
        // Apply loss threshold filter if provided
        if (loss_threshold && Math.abs(batch.loss_gain_percent) < Number(loss_threshold)) {
          return false;
        }
        
        return true;
      })
      .map((batch) => ({
        batch_number: batch.batch_number,
        pipeline: batch.pipeline,
        initial_mass: batch.received_weight_g || 0,
        fine_grams_received: batch.fine_grams_received || 0,
        expected_output: batch.expected_output_g || 0,
        actual_output: batch.actual_output_g || 0,
        loss_gain_g: batch.loss_gain_g || 0,
        loss_gain_percent: batch.loss_gain_percent || 0,
        recovery_percent: batch.overall_recovery_percent || 0,
      }));
    
    // Calculate aggregates
    const totalMaterialProcessed = yieldData.reduce((sum, b) => sum + b.fine_grams_received, 0);
    const totalLossGain = yieldData.reduce((sum, b) => sum + b.loss_gain_g, 0);
    const avgYield = yieldData.length > 0
      ? yieldData.reduce((sum, b) => sum + b.recovery_percent, 0) / yieldData.length
      : 0;
    
    res.json({
      success: true,
      data: {
        yield_loss: yieldData,
        aggregates: {
          total_material_processed: totalMaterialProcessed,
          total_loss_gain: totalLossGain,
          avg_yield_percent: avgYield,
        },
        total: yieldData.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/turnaround-time
 * Report 7: Batch turnaround time analysis
 */
router.get('/turnaround-time', async (req: AuthRequest, res, next) => {
  try {
    const { date_from, date_to, pipeline } = req.query;
    
    const filter: any = {
      status: 'completed',
      completed_at: { $ne: null },
      started_at: { $ne: null },
    };
    
    if (pipeline) filter.pipeline = pipeline;
    if (date_from || date_to) {
      filter.completed_at = filter.completed_at || {};
      if (date_from) filter.completed_at.$gte = new Date(date_from as string);
      if (date_to) filter.completed_at.$lte = new Date(date_to as string);
    }
    
    const batches = await Batch.find(filter);
    
    const turnaroundData = batches.map((batch) => {
      const totalHours = batch.started_at && batch.completed_at
        ? (batch.completed_at.getTime() - batch.started_at.getTime()) / (1000 * 60 * 60)
        : 0;
      
      return {
        batch_number: batch.batch_number,
        pipeline: batch.pipeline,
        started_at: batch.started_at,
        completed_at: batch.completed_at,
        total_hours: Math.round(totalHours * 10) / 10,
        ftt_hours: batch.ftt_hours || 0,
        recovery_pours: batch.recovery_pours?.length || 0,
        priority: batch.priority,
      };
    });
    
    // Calculate aggregates
    const avgTotalHours = turnaroundData.length > 0
      ? turnaroundData.reduce((sum, b) => sum + b.total_hours, 0) / turnaroundData.length
      : 0;
    
    const avgFttHours = turnaroundData.length > 0
      ? turnaroundData.reduce((sum, b) => sum + b.ftt_hours, 0) / turnaroundData.length
      : 0;
    
    res.json({
      success: true,
      data: {
        turnaround: turnaroundData,
        aggregates: {
          avg_total_hours: Math.round(avgTotalHours * 10) / 10,
          avg_ftt_hours: Math.round(avgFttHours * 10) / 10,
        },
        total: turnaroundData.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/operator-performance
 * Get operator performance metrics
 */
router.get('/operator-performance', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date_from, date_to } = req.query;
    
    // Build date filter
    const dateFilter: any = {};
    if (date_from) dateFilter.$gte = new Date(date_from as string);
    if (date_to) dateFilter.$lte = new Date(date_to as string);
    
    const matchFilter: any = {
      status: 'completed',
    };
    if (Object.keys(dateFilter).length > 0) {
      matchFilter.completed_at = dateFilter;
    }

    // Aggregate operator performance
    const operatorStats = await Batch.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$created_by',
          total_batches: { $sum: 1 },
          total_fine_grams: { $sum: { $ifNull: ['$fine_grams_received', 0] } },
          total_loss_gain: { $sum: { $ifNull: ['$loss_gain_g', 0] } },
          avg_recovery: { $avg: { $ifNull: ['$overall_recovery_percent', 0] } },
          avg_ftt_hours: { $avg: { $ifNull: ['$ftt_hours', 0] } },
          avg_ftt_recovery: { $avg: { $ifNull: ['$ftt_recovery_percent', 0] } },
          batches_on_time: {
            $sum: {
              $cond: [{ $lte: ['$ftt_hours', 36] }, 1, 0]
            }
          },
          batches_with_gain: {
            $sum: {
              $cond: [{ $gt: ['$loss_gain_g', 0] }, 1, 0]
            }
          },
          batches_with_loss: {
            $sum: {
              $cond: [{ $lt: ['$loss_gain_g', 0] }, 1, 0]
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
      {
        $project: {
          operator_id: '$_id',
          operator_name: '$user.username',
          operator_email: '$user.email',
          total_batches: 1,
          total_fine_grams: 1,
          total_loss_gain: 1,
          avg_recovery: 1,
          avg_ftt_hours: 1,
          avg_ftt_recovery: 1,
          batches_on_time: 1,
          on_time_percentage: {
            $multiply: [
              { $divide: ['$batches_on_time', '$total_batches'] },
              100
            ]
          },
          batches_with_gain: 1,
          batches_with_loss: 1,
          efficiency_score: {
            $avg: [
              { $divide: ['$batches_on_time', '$total_batches'] },
              { $divide: ['$avg_recovery', 100] },
              { $divide: [36, { $ifNull: ['$avg_ftt_hours', 36] }] }
            ]
          }
        }
      },
      { $sort: { total_batches: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        operators: operatorStats,
      },
    });
    return;
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/analytics/export-csv
 * Export analytics data as CSV
 */
router.get('/export-csv', async (req: AuthRequest, res, next) => {
  try {
    const { report_type } = req.query;
    
    if (!report_type) {
      throw new AppError('report_type is required', 400);
    }
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${report_type}-${Date.now()}.csv"`);
    
    // Streaming CSV export implementation
    // Future enhancement: Add proper CSV formatting for each report type
    res.write('CSV export - Data available via API endpoints\n');
    res.write(`Report: ${report_type}\n`);
    res.write(`Generated: ${new Date().toISOString()}\n`);
    res.end();
  } catch (error) {
    next(error);
  }
});

export default router;

