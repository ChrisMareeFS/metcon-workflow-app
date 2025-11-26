import { Router } from 'express';
import { z } from 'zod';
import { Batch } from '../models/Batch.js';
import { Flow } from '../models/Flow.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { updateAnalyticsOnStepCompletion, finalizeAnalytics } from '../services/analyticsCalculator.js';

const router = Router();

// All batch routes require authentication
router.use(authenticate);
router.use(apiLimiter);

const createBatchSchema = z.object({
  batch_number: z.string().min(1),
  pipeline: z.enum(['copper', 'silver', 'gold']),
  initial_weight: z.number().positive().optional(),
  priority: z.enum(['normal', 'high']).optional(),
});

/**
 * GET /api/batches
 * Get all batches (with filters)
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, pipeline, limit = '50', offset = '0' } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (pipeline) filter.pipeline = pipeline;

    const batches = await Batch.find(filter)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .populate('flow_id', 'name version pipeline')
      .populate('events.user_id', 'username role');

    const total = await Batch.countDocuments(filter);

    res.json({
      success: true,
      data: {
        batches,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/batches/:id
 * Get single batch with current step details
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('flow_id')
      .populate('events.user_id', 'username role');

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Get current node details from flow
    const flow: any = batch.flow_id;
    const currentNode = flow.nodes.find((n: any) => n.id === batch.current_node_id);
    
    // Find next node (if exists)
    const outgoingEdge = flow.edges.find((e: any) => e.source === batch.current_node_id);
    const nextNode = outgoingEdge 
      ? flow.nodes.find((n: any) => n.id === outgoingEdge.target)
      : null;

    res.json({
      success: true,
      data: {
        ...batch.toObject(),
        current_node: currentNode,
        next_node: nextNode,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batches
 * Create a new batch
 */
router.post('/', authorize('operator', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const data = createBatchSchema.parse(req.body);

    // Check if batch number already exists
    const existing = await Batch.findOne({ batch_number: data.batch_number });
    if (existing) {
      throw new AppError('Batch number already exists', 400);
    }

    // Get active flow for the pipeline
    const flow = await Flow.findOne({
      pipeline: data.pipeline,
      status: 'active',
    }).sort({ effective_date: -1 });

    if (!flow) {
      throw new AppError(`No active flow found for ${data.pipeline} pipeline`, 404);
    }

    // Validate flow has nodes
    if (!flow.nodes || flow.nodes.length === 0) {
      throw new AppError('Flow has no nodes defined', 400);
    }

    // Find the first node (node with no incoming edges)
    const firstNode = flow.nodes.find(node => 
      !flow.edges.some(edge => edge.target === node.id)
    );

    if (!firstNode) {
      throw new AppError('Could not determine starting node in flow', 400);
    }

    // Create batch
    const batch = new Batch({
      batch_number: data.batch_number,
      pipeline: data.pipeline,
      initial_weight: data.initial_weight,
      flow_id: flow._id,
      flow_version: flow.version,
      current_node_id: firstNode.id,
      completed_node_ids: [],
      status: 'created',
      priority: data.priority || 'normal',
      created_by: req.user!.id,
      events: [
        {
          event_id: `evt_${Date.now()}`,
          type: 'batch_created',
          timestamp: new Date(),
          user_id: req.user!.id,
          station: firstNode.template_id,
          step: firstNode.id,
          data: { 
            flow_version: flow.version,
            initial_weight: data.initial_weight,
          },
        },
      ],
    });

    await batch.save();

    // Populate flow reference
    await batch.populate('flow_id', 'name version pipeline');

    res.status(201).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batches/:id/start
 * Start a batch (move from created to in_progress)
 */
router.post('/:id/start', authorize('operator', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('flow_id');
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    if (batch.status !== 'created' && batch.status !== 'in_progress') {
      throw new AppError('Batch cannot be started', 400);
    }

    batch.status = 'in_progress';
    batch.started_at = new Date();
    
    batch.events.push({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'batch_started',
      timestamp: new Date(),
      user_id: req.user!.id,
      station: batch.current_node_id,
      step: batch.current_node_id,
      data: {},
    });

    await batch.save();

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batches/:id/complete-step
 * Complete current step and move to next
 */
router.post('/:id/complete-step', authorize('operator', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('flow_id');
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    if (batch.status === 'completed') {
      throw new AppError('Batch already completed', 400);
    }

    const { data: stepData } = req.body;

    const flow: any = batch.flow_id;
    
    if (!flow) {
      throw new AppError('Flow not found for this batch', 404);
    }

    if (!flow.nodes || !Array.isArray(flow.nodes)) {
      throw new AppError('Flow nodes are invalid', 400);
    }

    if (!flow.edges || !Array.isArray(flow.edges)) {
      throw new AppError('Flow edges are invalid', 400);
    }
    
    // Get current node to access template_id
    const currentNode = flow.nodes.find((n: any) => n.id === batch.current_node_id);
    
    if (!currentNode && batch.current_node_id) {
      console.warn(`Current node ${batch.current_node_id} not found in flow nodes`);
    }
    
    // Mark current node as completed
    if (batch.current_node_id && !batch.completed_node_ids.includes(batch.current_node_id)) {
      batch.completed_node_ids.push(batch.current_node_id);
    }

    // Log step completion event
    batch.events.push({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'step_completed',
      timestamp: new Date(),
      user_id: req.user!.id,
      station: batch.current_node_id,
      step: batch.current_node_id,
      data: stepData || {},
    });

    // Update analytics fields based on step completion (wrap in try-catch to not block completion)
    if (currentNode && batch.current_node_id && currentNode.template_id) {
      try {
        await updateAnalyticsOnStepCompletion(
          batch,
          batch.current_node_id,
          currentNode.template_id,
          stepData || {}
        );
      } catch (analyticsError: any) {
        console.error('Error updating analytics on step completion:', analyticsError);
        // Don't throw - allow step completion to proceed even if analytics fails
      }
    }

    // Find next node
    const outgoingEdge = flow.edges.find((e: any) => e.source === batch.current_node_id);
    
    if (outgoingEdge) {
      // Move to next node
      batch.current_node_id = outgoingEdge.target;
    } else {
      // No next node - batch is complete
      batch.status = 'completed';
      batch.completed_at = new Date();
      
      // Finalize analytics calculations (wrap in try-catch)
      try {
        finalizeAnalytics(batch);
      } catch (analyticsError: any) {
        console.error('Error finalizing analytics:', analyticsError);
        // Don't throw - allow batch completion to proceed
      }
      
      batch.events.push({
        event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'batch_completed',
        timestamp: new Date(),
        user_id: req.user!.id,
        station: batch.current_node_id,
        step: batch.current_node_id,
        data: {},
      });
    }

    await batch.save();

    // Get updated node details after moving to next
    const updatedCurrentNode = flow.nodes.find((n: any) => n.id === batch.current_node_id);
    const nextEdge = flow.edges.find((e: any) => e.source === batch.current_node_id);
    const nextNode = nextEdge ? flow.nodes.find((n: any) => n.id === nextEdge.target) : null;

    res.json({
      success: true,
      data: {
        ...batch.toObject(),
        current_node: updatedCurrentNode,
        next_node: nextNode,
      },
    });
  } catch (error: any) {
    console.error('Error completing step:', error);
    next(error);
  }
});

/**
 * POST /api/batches/:id/flag
 * Flag a batch with an exception (requires operator or admin)
 */
router.post('/:id/flag', authorize('operator', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    const { exception_type, reason, notes, step, station } = req.body;

    if (!exception_type || !reason) {
      throw new AppError('exception_type and reason are required', 400);
    }

    // Add flag to batch
    batch.flags.push({
      type: exception_type,
      reason,
      flagged_at: new Date(),
      flagged_by: req.user!.id as any,
      notes,
      approved_by: undefined,
    });

    // Update batch status to flagged
    batch.status = 'flagged';

    // Log exception event
    batch.events.push({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'exception_flagged',
      timestamp: new Date(),
      user_id: req.user!.id,
      station: station || batch.current_node_id,
      step: step || batch.current_node_id,
      data: {
        exception_type,
        reason,
        notes,
      },
    });

    await batch.save();

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batches/:id/approve-exception
 * Approve an exception and allow batch to continue (admin/supervisor only)
 */
router.post('/:id/approve-exception', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    if (batch.status !== 'flagged') {
      throw new AppError('Batch is not flagged', 400);
    }

    const { flag_index, approval_notes } = req.body;

    // Approve the most recent flag or specific flag by index
    const flagToApprove = flag_index !== undefined 
      ? batch.flags[flag_index] 
      : batch.flags[batch.flags.length - 1];

    if (!flagToApprove) {
      throw new AppError('No flag found to approve', 404);
    }

    flagToApprove.approved_by = req.user!.id as any;

    // Change status back to in_progress
    batch.status = 'in_progress';

    // Log approval event
    batch.events.push({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'exception_approved',
      timestamp: new Date(),
      user_id: req.user!.id,
      station: batch.current_node_id,
      step: batch.current_node_id,
      data: {
        flag_type: flagToApprove.type,
        approval_notes,
      },
    });

    await batch.save();

    // Populate user references
    await batch.populate('flags.approved_by', 'username role');

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batches/:id/events
 * Add event to batch (for logging purposes)
 */
router.post('/:id/events', authorize('operator', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    const { type, data } = req.body;

    batch.events.push({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      user_id: req.user!.id,
      station: batch.current_node_id,
      step: batch.current_node_id,
      data: data || {},
    });

    await batch.save();

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batches/:id/flag
 * Add a flag to batch (for exceptions)
 */
router.post('/:id/flag', authorize('operator', 'admin'), async (req: AuthRequest, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    const { type, reason } = req.body;

    if (!type || !reason) {
      throw new AppError('Flag type and reason are required', 400);
    }

    batch.flags.push({
      type,
      reason,
      flagged_at: new Date(),
      flagged_by: req.user!.id as any,
      approved_by: undefined,
    });

    batch.status = 'flagged';

    batch.events.push({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'batch_flagged',
      timestamp: new Date(),
      user_id: req.user!.id,
      station: batch.current_node_id,
      step: batch.current_node_id,
      data: { flag_type: type, reason },
    });

    await batch.save();

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
