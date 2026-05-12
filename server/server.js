import express from 'express';
import cors from 'cors';
import { connectDB, isDatabaseReady } from './config/database.js';
import { config } from './config/config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import { accessLogger } from './middleware/accessLogger.js';
import { requireDatabase } from './middleware/databaseReady.js';
import { rateLimit } from './middleware/rateLimiter.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { attachRequestContext } from './middleware/requestContext.js';

const app = express();

app.use(securityHeaders);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachRequestContext);
app.use(accessLogger);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'RB Task Manager API',
    version: '1.0.0',
    database: isDatabaseReady() ? 'connected' : 'disconnected',
    endpoints: {
      auth: '/api/auth',
      notes: '/api/notes',
      teams: '/api/teams'
    }
  });
});

app.get('/health', (req, res) => {
  const databaseConnected = isDatabaseReady();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

app.use('/api', requireDatabase);
app.use('/api', rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax
}));
app.use('/api/auth', rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMax,
  message: 'Too many authentication attempts. Please try again later.'
}), authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/teams', teamRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server because MongoDB is unavailable.');
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});
