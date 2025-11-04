import { Router } from 'express';
import { z } from 'zod';
import { CheckTemplate } from '../models/CheckTemplate.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

const createCheckTemplateSchema = z.object({
  template_id: z.string(),
  name: z.string(),
  type: z.enum(['instruction', 'checklist', 'mass_check', 'signature', 'photo']),
  instructions: z.string().optional().default(''),
  icon: z.string().optional().default('⚙️'),
  expected_mass: z.number().optional(),
  tolerance: z.number().optional(),
  tolerance_unit: z.enum(['g', '%']).optional(),
  checklist_items: z.array(z.string()).optional(),
});

/**
 * GET /api/check-templates
 * Get all check templates
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.query;
    
    const filter: any = {};
    if (type) filter.type = type;

    const templates = await CheckTemplate.find(filter)
      .sort({ type: 1, name: 1 })
      .populate('created_by', 'username');

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/check-templates/:id
 * Get single check template
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const template = await CheckTemplate.findById(req.params.id).populate('created_by', 'username');

    if (!template) {
      throw new AppError('Check template not found', 404);
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/check-templates
 * Create a new check template (admin only)
 */
router.post('/', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const data = createCheckTemplateSchema.parse(req.body);

    // Check if template_id already exists
    const existing = await CheckTemplate.findOne({ template_id: data.template_id });
    if (existing) {
      throw new AppError('Check template with this ID already exists', 400);
    }

    const template = new CheckTemplate({
      ...data,
      created_by: req.user!.id,
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/check-templates/:id
 * Update a check template (admin only)
 */
router.patch('/:id', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const template = await CheckTemplate.findById(req.params.id);

    if (!template) {
      throw new AppError('Check template not found', 404);
    }

    const { name, type, instructions, icon, expected_mass, tolerance, tolerance_unit, checklist_items } = req.body;
    
    if (name) template.name = name;
    if (type) template.type = type;
    if (instructions !== undefined) template.instructions = instructions;
    if (icon) template.icon = icon;
    if (expected_mass !== undefined) template.expected_mass = expected_mass;
    if (tolerance !== undefined) template.tolerance = tolerance;
    if (tolerance_unit) template.tolerance_unit = tolerance_unit;
    if (checklist_items) template.checklist_items = checklist_items;

    await template.save();

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/check-templates/:id
 * Delete a check template (admin only)
 */
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const template = await CheckTemplate.findById(req.params.id);

    if (!template) {
      throw new AppError('Check template not found', 404);
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Check template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;













