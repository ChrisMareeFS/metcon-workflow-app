import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { z } from 'zod';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { loginLimiter, twoFactorLimiter } from '../middleware/rateLimiter.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  rememberDevice: z.boolean().optional(),
});

const verify2FASchema = z.object({
  temp_session_id: z.string(),
  code: z.string().length(6),
});

const setup2FASchema = z.object({
  method: z.enum(['sms', 'authenticator', 'email']),
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
});

// Temporary session store (in production, use Redis)
const tempSessions = new Map<string, { userId: string; expires: number }>();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ username, active: true });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      // Create temporary session
      const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36)}`;
      tempSessions.set(tempSessionId, {
        userId: (user._id as any).toString(),
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      // TODO: Send 2FA code based on user's preferred method
      // For now, just return that 2FA is required

      return res.json({
        success: true,
        data: {
          requires_2fa: true,
          temp_session_id: tempSessionId,
        },
      });
    }

    // No 2FA - issue token immediately
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const token = jwt.sign(
      { userId: user._id, role: user.role, expiresIn: process.env.JWT_EXPIRY || '1h' },
      secret
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          stations: user.stations,
          two_factor_enabled: user.two_factor_enabled,
        },
        token,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/auth/verify-2fa
 * Verify 2FA code
 */
router.post('/verify-2fa', twoFactorLimiter, async (req, res, next) => {
  try {
    const { temp_session_id, code } = verify2FASchema.parse(req.body);

    // Check temp session
    const session = tempSessions.get(temp_session_id);
    if (!session || session.expires < Date.now()) {
      throw new AppError('Session expired or invalid', 401);
    }

    // Get user
    const user = await User.findById(session.userId);
    if (!user || !user.active) {
      throw new AppError('User not found', 401);
    }

    // Verify 2FA code
    let isValid = false;

    if (user.two_factor_method === 'authenticator' && user.two_factor_secret) {
      isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
    } else {
      // For SMS/Email, we'd verify against a sent code (stored in DB/Redis)
      // For MVP, accept any 6-digit code as valid
      isValid = code.length === 6 && /^\d+$/.test(code);
    }

    if (!isValid) {
      throw new AppError('Invalid verification code', 401);
    }

    // Delete temp session
    tempSessions.delete(temp_session_id);

    // Issue token
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    const token = jwt.sign(
      { userId: user._id, role: user.role, expiresIn: process.env.JWT_EXPIRY || '1h' },
      secret
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          stations: user.stations,
          two_factor_enabled: user.two_factor_enabled,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/resend-2fa
 * Resend 2FA code
 */
router.post('/resend-2fa', async (req, res, next) => {
  try {
    const { temp_session_id } = z.object({ temp_session_id: z.string() }).parse(req.body);

    const session = tempSessions.get(temp_session_id);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    // Extend session
    tempSessions.set(temp_session_id, {
      ...session,
      expires: Date.now() + 5 * 60 * 1000,
    });

    // TODO: Resend code via SMS/Email

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/setup-2fa
 * Setup 2FA for authenticated user
 */
router.post('/setup-2fa', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { method, phone_number } = setup2FASchema.parse(req.body);

    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    let qrCode: string | undefined;
    let secret: string | undefined;

    if (method === 'authenticator') {
      // Generate TOTP secret
      const secretObj = speakeasy.generateSecret({
        name: `METCON FLOWS (${user.username})`,
        issuer: 'METCON FLOWS',
      });

      secret = secretObj.base32;
      qrCode = await QRCode.toDataURL(secretObj.otpauth_url || '');

      user.two_factor_secret = secret;
    } else if (method === 'sms') {
      user.phone_number = phone_number || null;
    } else if (method === 'email') {
      // Email is already in user profile
    }

    user.two_factor_method = method;
    await user.save();

    res.json({
      success: true,
      data: {
        qr_code: qrCode,
        secret,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/complete-2fa-setup
 * Complete 2FA setup by verifying code
 */
router.post('/complete-2fa-setup', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify the test code
    let isValid = false;

    if (user.two_factor_method === 'authenticator' && user.two_factor_secret) {
      isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
    } else {
      // For SMS/Email, accept any valid 6-digit code for setup
      isValid = code.length === 6 && /^\d+$/.test(code);
    }

    if (!isValid) {
      throw new AppError('Invalid verification code', 401);
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    user.two_factor_enabled = true;
    user.backup_codes = backupCodes;
    await user.save();

    res.json({
      success: true,
      backup_codes: backupCodes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token deletion mainly)
 */
router.post('/logout', authenticate, async (_req, res) => {
  // In a real app, you'd invalidate the token (e.g., add to blacklist in Redis)
  res.json({ success: true });
});

export default router;

