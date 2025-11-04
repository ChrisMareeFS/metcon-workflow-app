import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ProductionPlan } from '../models/ProductionPlan.js';
import { Batch } from '../models/Batch.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { processProductionPlanOcr, validateOcrResult } from '../services/productionPlanOcr.js';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

/**
 * POST /api/production-plans/upload
 * Upload and process production plan form with OCR
 */
router.post(
  '/upload',
  authorize('operator', 'admin'),
  upload.single('production_plan'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      // Process OCR
      console.log('Processing production plan with OCR...');
      const ocrResult = await processProductionPlanOcr(req.file.buffer);

      // Validate OCR result
      const validation = validateOcrResult(ocrResult);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'OCR validation failed',
          details: validation.errors,
          ocrResult, // Return for manual correction
        });
        return;
      }

      // Check if production plan already exists
      const existing = await ProductionPlan.findOne({
        plan_number: ocrResult.plan_number,
      });

      if (existing) {
        throw new AppError(
          `Production plan ${ocrResult.plan_number} already exists`,
          409
        );
      }

      // Create production plan record
      const productionPlan = new ProductionPlan({
        plan_number: ocrResult.plan_number,
        pass_number: ocrResult.pass_number,
        start_time: ocrResult.start_time,
        end_time: ocrResult.end_time,
        input_start_time: ocrResult.input_start_time,
        input_end_time: ocrResult.input_end_time,
        input_items: ocrResult.input_items,
        input_summary: ocrResult.input_summary,
        output_items: ocrResult.output_items,
        ocr_confidence: ocrResult.confidence,
        ocr_processed_at: new Date(),
        uploaded_by: req.user!.id,
      });

      await productionPlan.save();

      res.status(201).json({
        success: true,
        data: productionPlan,
        message: 'Production plan processed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/production-plans/:id/link-batch
 * Link production plan to a batch
 */
router.post(
  '/:id/link-batch',
  authorize('operator', 'admin'),
  async (req: AuthRequest, res, next) => {
    try {
      const { batch_id } = z
        .object({
          batch_id: z.string(),
        })
        .parse(req.body);

      const productionPlan = await ProductionPlan.findById(req.params.id);
      if (!productionPlan) {
        throw new AppError('Production plan not found', 404);
      }

      // Verify batch exists
      const batch = await Batch.findById(batch_id);
      if (!batch) {
        throw new AppError('Batch not found', 404);
      }

      // Link production plan to batch
      productionPlan.batch_id = batch._id as any;
      await productionPlan.save();

      res.json({
        success: true,
        data: productionPlan,
        message: 'Production plan linked to batch',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/production-plans
 * Get all production plans with filters
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { batch_id, plan_number, date_from, date_to } = req.query;

    const query: any = {};

    if (batch_id) {
      query.batch_id = batch_id;
    }

    if (plan_number) {
      query.plan_number = new RegExp(plan_number as string, 'i');
    }

    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) {
        query.created_at.$gte = new Date(date_from as string);
      }
      if (date_to) {
        query.created_at.$lte = new Date(date_to as string);
      }
    }

    const productionPlans = await ProductionPlan.find(query)
      .populate('uploaded_by', 'username email')
      .populate('batch_id', 'batch_number status')
      .sort({ created_at: -1 })
      .limit(100);

    res.json({
      success: true,
      data: productionPlans,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/production-plans/:id
 * Get single production plan
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const productionPlan = await ProductionPlan.findById(req.params.id)
      .populate('uploaded_by', 'username email')
      .populate('batch_id', 'batch_number status pipeline');

    if (!productionPlan) {
      throw new AppError('Production plan not found', 404);
    }

    res.json({
      success: true,
      data: productionPlan,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/production-plans/:id
 * Update production plan (manual correction)
 */
router.put(
  '/:id',
  authorize('operator', 'admin'),
  async (req: AuthRequest, res, next) => {
    try {
      const updateSchema = z.object({
        input_items: z.array(z.any()).optional(),
        input_summary: z.any().optional(),
        output_items: z.array(z.any()).optional(),
      });

      const updates = updateSchema.parse(req.body);

      const productionPlan = await ProductionPlan.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!productionPlan) {
        throw new AppError('Production plan not found', 404);
      }

      res.json({
        success: true,
        data: productionPlan,
        message: 'Production plan updated',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/production-plans/:id
 * Delete production plan
 */
router.delete(
  '/:id',
  authorize('admin'),
  async (req: AuthRequest, res, next) => {
    try {
      const productionPlan = await ProductionPlan.findByIdAndDelete(
        req.params.id
      );

      if (!productionPlan) {
        throw new AppError('Production plan not found', 404);
      }

      res.json({
        success: true,
        message: 'Production plan deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/production-plans/:id/manual-entry
 * Manually create production plan without OCR
 */
router.post(
  '/manual-entry',
  authorize('operator', 'admin'),
  async (req: AuthRequest, res, next) => {
    try {
      const schema = z.object({
        plan_number: z.string(),
        pass_number: z.string(),
        start_time: z.string().transform((str) => new Date(str)),
        end_time: z.string().transform((str) => new Date(str)).optional(),
        input_start_time: z.string().transform((str) => new Date(str)),
        input_end_time: z.string().transform((str) => new Date(str)).optional(),
        input_items: z.array(z.any()),
        input_summary: z.any(),
        output_items: z.array(z.any()).optional(),
      });

      const data = schema.parse(req.body);

      // Check if production plan already exists
      const existing = await ProductionPlan.findOne({
        plan_number: data.plan_number,
      });

      if (existing) {
        throw new AppError(
          `Production plan ${data.plan_number} already exists`,
          409
        );
      }

      const productionPlan = new ProductionPlan({
        ...data,
        ocr_confidence: 1.0, // Manual entry is 100% accurate
        uploaded_by: req.user!.id,
      });

      await productionPlan.save();

      res.status(201).json({
        success: true,
        data: productionPlan,
        message: 'Production plan created manually',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

