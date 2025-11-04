import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import { StationTemplate } from '../models/StationTemplate.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Configure multer for image uploads (memory storage for processing with Sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
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

const createStationTemplateSchema = z.object({
  template_id: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  icon: z.string().optional().default('🏭'),
  image_url: z.string().optional(),
  estimated_duration: z.number().optional(),
  sop: z.array(z.string()).optional(),
});

/**
 * GET /api/station-templates
 * Get all station templates
 */
router.get('/', async (_req: AuthRequest, res, next) => {
  try {
    const templates = await StationTemplate.find()
      .sort({ name: 1 })
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
 * GET /api/station-templates/:id
 * Get single station template
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const template = await StationTemplate.findById(req.params.id).populate('created_by', 'username');

    if (!template) {
      throw new AppError('Station template not found', 404);
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
 * POST /api/station-templates
 * Create a new station template (admin only)
 */
router.post('/', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const data = createStationTemplateSchema.parse(req.body);

    // Check if template_id already exists
    const existing = await StationTemplate.findOne({ template_id: data.template_id });
    if (existing) {
      throw new AppError('Station template with this ID already exists', 400);
    }

    const template = new StationTemplate({
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
 * POST /api/station-templates/upload-image
 * Upload an image for a station template (admin only)
 */
router.post('/upload-image', authorize('admin'), upload.single('image'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    // Compress and resize image using Sharp
    const compressedImage = await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Convert to base64 for storage (MVP approach - in production, use S3)
    const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;

    res.json({
      success: true,
      data: {
        image_url: base64Image,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/station-templates/:id
 * Update a station template (admin only)
 */
router.patch('/:id', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const template = await StationTemplate.findById(req.params.id);

    if (!template) {
      throw new AppError('Station template not found', 404);
    }

    const { name, description, icon, image_url, estimated_duration, sop } = req.body;
    
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (icon) template.icon = icon;
    if (image_url !== undefined) template.image_url = image_url;
    if (estimated_duration !== undefined) template.estimated_duration = estimated_duration;
    if (sop !== undefined) template.sop = sop;

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
 * DELETE /api/station-templates/:id
 * Delete a station template (admin only)
 */
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const template = await StationTemplate.findById(req.params.id);

    if (!template) {
      throw new AppError('Station template not found', 404);
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Station template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;




