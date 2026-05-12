import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { normalizeEmail, validateEmailAddress } from '../utils/emailValidation.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const emailValidation = await validateEmailAddress(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: emailValidation.normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email: emailValidation.normalizedEmail,
      password,
      role: 'user'
    });

    await createAuditLog({
      actor: user._id,
      action: 'auth.register',
      entityType: 'user',
      entityId: user._id.toString(),
      details: {
        email: user.email,
        role: user.role
      },
      req
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Find user and include password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      await createAuditLog({
        action: 'auth.login',
        entityType: 'user',
        status: 'failure',
        details: {
          email,
          reason: 'user_not_found'
        },
        req
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      await createAuditLog({
        actor: user._id,
        action: 'auth.login',
        entityType: 'user',
        entityId: user._id.toString(),
        status: 'failure',
        details: {
          email,
          reason: 'invalid_password'
        },
        req
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.role !== 'user') {
      user.role = 'user';
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    await createAuditLog({
      actor: user._id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user._id.toString(),
      details: {
        email: user.email,
        role: user.role
      },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.role !== 'user') {
      user.role = 'user';
      await user.save();
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
