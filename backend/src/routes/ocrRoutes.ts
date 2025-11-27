import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { processImageWithGemini } from '../services/geminiOcr.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// All OCR routes require authentication
router.use(authenticate);
router.use(apiLimiter);

// Validation schema
const ocrRequestSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
});

/**
 * POST /api/ocr/process
 * Process an image using Gemini Vision API to extract production plan data
 */
router.post('/process', async (req: AuthRequest, res, next) => {
  try {
    const { image } = ocrRequestSchema.parse(req.body);

    if (!image) {
      throw new AppError('Image data is required', 400);
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      throw new AppError('Gemini API key is not configured', 500);
    }

    const result = await processImageWithGemini(image);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError('Invalid request data', 400));
    }
    next(error);
  }
});

export default router;


