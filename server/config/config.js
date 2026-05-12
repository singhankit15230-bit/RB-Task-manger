import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/enpproj',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  encryptionKey: process.env.ENCRYPTION_KEY,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  emailMxCheckEnabled: process.env.EMAIL_MX_CHECK_ENABLED !== 'false'
};

// Validate critical configuration 
if (!config.jwtSecret) {
  throw new Error('JWT_SECRET must be defined in environment variables');
}

if (!config.encryptionKey) {
  throw new Error('ENCRYPTION_KEY must be defined in environment variables');
}

if (config.encryptionKey.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

