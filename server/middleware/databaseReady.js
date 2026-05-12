import { isDatabaseReady } from '../config/database.js';

export const requireDatabase = (req, res, next) => {
  if (isDatabaseReady()) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: 'Database is temporarily unavailable. Please try again once MongoDB is running.'
  });
};
