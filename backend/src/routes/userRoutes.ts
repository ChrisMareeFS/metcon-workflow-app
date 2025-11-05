import express, { Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(apiLimiter);

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['operator', 'supervisor', 'admin', 'analyst']),
  stations: z.array(z.string()).optional(),
  phone_number: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['operator', 'supervisor', 'admin', 'analyst']).optional(),
  stations: z.array(z.string()).optional(),
  phone_number: z.string().optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can view users' 
      });
    }

    const users = await User.find()
      .select('-password_hash -two_factor_secret -backup_codes')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: { users },
    });
    return;
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
    return;
  }
});

/**
 * GET /api/users/operators
 * Get all operators (for analytics, dropdowns, etc)
 */
router.get('/operators', async (_req: AuthRequest, res: Response) => {
  try {
    const operators = await User.find({ role: 'operator', active: true })
      .select('username email stations created_at')
      .sort({ username: 1 });

    res.json({
      success: true,
      data: { operators },
    });
    return;
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch operators',
    });
    return;
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can create users' 
      });
    }

    const validated = createUserSchema.parse(req.body);

    // Check if username already exists
    const existingUser = await User.findOne({ username: validated.username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: validated.email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(validated.password, 10);

    // Set default permissions based on role
    let permissions: string[] = [];
    switch (validated.role) {
      case 'operator':
        permissions = ['execute_batch', 'view_own_performance'];
        break;
      case 'supervisor':
        permissions = ['execute_batch', 'approve_exceptions', 'view_all_performance', 'manage_flows'];
        break;
      case 'admin':
        permissions = ['manage_users', 'manage_flows', 'manage_templates', 'view_analytics', 'approve_exceptions'];
        break;
      case 'analyst':
        permissions = ['view_analytics', 'export_reports'];
        break;
    }

    // Create user
    const user = new User({
      username: validated.username,
      email: validated.email,
      password_hash,
      role: validated.role,
      permissions,
      stations: validated.stations || [],
      phone_number: validated.phone_number || null,
      two_factor_enabled: false,
      two_factor_method: null,
      two_factor_secret: null,
      backup_codes: [],
      active: true,
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          stations: user.stations,
          active: user.active,
          created_at: user.created_at,
        },
      },
    });
    return;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
    return;
  }
});

/**
 * PATCH /api/users/:id
 * Update user (admin only)
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can update users' 
      });
    }

    const validated = updateUserSchema.parse(req.body);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        ...validated,
        updated_at: new Date(),
      },
      { new: true }
    ).select('-password_hash -two_factor_secret -backup_codes');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
    return;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
    return;
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate user (admin only) - soft delete
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can delete users' 
      });
    }

    // Prevent admin from deleting themselves
    if (req.params.id === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        active: false,
        updated_at: new Date(),
      },
      { new: true }
    ).select('-password_hash -two_factor_secret -backup_codes');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
    return;
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
    return;
  }
});

export default router;

