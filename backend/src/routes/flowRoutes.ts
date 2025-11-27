import { Router } from 'express';
import { z } from 'zod';
import { Flow } from '../models/Flow.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All flow routes require authentication
router.use(authenticate);
router.use(apiLimiter);

const createFlowSchema = z.object({
  flow_id: z.string(),
  version: z.string(),
  name: z.string(),
  pipeline: z.enum(['copper', 'silver', 'gold']),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['station', 'check']),
    template_id: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    selectedSops: z.array(z.string()).optional().default([]),
  })).default([]),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
  })).default([]),
  effective_date: z.string().transform((str) => new Date(str)),
});

/**
 * GET /api/flows
 * Get all flows
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, pipeline } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (pipeline) filter.pipeline = pipeline;

    const flows = await Flow.find(filter)
      .sort({ effective_date: -1 })
      .populate('created_by', 'username');

    res.json({
      success: true,
      data: flows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/flows/active/:pipeline
 * Get active flow for a pipeline
 */
router.get('/active/:pipeline', async (req: AuthRequest, res, next) => {
  try {
    const { pipeline } = req.params;

    const flow = await Flow.findOne({
      pipeline,
      status: 'active',
    }).sort({ effective_date: -1 });

    if (!flow) {
      throw new AppError('No active flow found for this pipeline', 404);
    }

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/flows/:id
 * Get single flow by ID
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const flow = await Flow.findById(req.params.id).populate('created_by', 'username role');

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/flows
 * Create a new flow (admin only)
 */
router.post('/', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const data = createFlowSchema.parse(req.body);

    // Check if flow version already exists
    const existing = await Flow.findOne({
      flow_id: data.flow_id,
      version: data.version,
    });

    if (existing) {
      throw new AppError('Flow version already exists', 400);
    }

    const flow = new Flow({
      ...data,
      created_by: req.user!.id,
      status: 'draft',
    });

    await flow.save();

    res.status(201).json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/flows/:id
 * Update a draft flow (admin only)
 */
router.patch('/:id', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const flow = await Flow.findById(req.params.id);

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    // Update allowed fields
    const { name, pipeline, nodes, edges } = req.body;
    
    if (name) flow.name = name;
    if (pipeline) flow.pipeline = pipeline;
    if (nodes) flow.nodes = nodes;
    if (edges) flow.edges = edges;

    await flow.save();

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/flows/:id/activate
 * Activate a flow (admin only)
 */
router.patch('/:id/activate', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const flow = await Flow.findById(req.params.id);

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    // Archive existing active flows for this pipeline
    await Flow.updateMany(
      { pipeline: flow.pipeline, status: 'active' },
      { status: 'archived' }
    );

    flow.status = 'active';
    await flow.save();

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/flows/:id/deactivate
 * Deactivate a flow (admin only) - sets status to draft
 */
router.patch('/:id/deactivate', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const flow = await Flow.findById(req.params.id);

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    if (flow.status !== 'active') {
      throw new AppError('Flow is not active', 400);
    }

    // Check if batches are using this flow
    const { Batch } = await import('../models/Batch.js');
    const batchesUsingFlow = await Batch.countDocuments({ 
      flow_id: flow._id,
      status: { $in: ['created', 'in_progress'] }
    });
    
    if (batchesUsingFlow > 0) {
      throw new AppError(
        `Cannot deactivate flow. ${batchesUsingFlow} batch(es) are currently using this flow. Please wait for batches to complete or reassign them.`,
        400
      );
    }

    flow.status = 'draft';
    await flow.save();

    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/flows/:id
 * Delete a flow (admin only)
 */
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const flow = await Flow.findById(req.params.id);

    if (!flow) {
      throw new AppError('Flow not found', 404);
    }

    // Check if flow is active and has batches using it
    if (flow.status === 'active') {
      const { Batch } = await import('../models/Batch.js');
      const batchesUsingFlow = await Batch.countDocuments({ flow_id: flow._id });
      
      if (batchesUsingFlow > 0) {
        throw new AppError(
          `Cannot delete active flow. ${batchesUsingFlow} batch(es) are currently using this flow. Please archive it instead.`,
          400
        );
      }
    }

    await Flow.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Flow deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

