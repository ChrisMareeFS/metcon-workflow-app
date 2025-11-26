import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRoutes from './routes/authRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import flowRoutes from './routes/flowRoutes.js';
import stationTemplateRoutes from './routes/stationTemplateRoutes.js';
import checkTemplateRoutes from './routes/checkTemplateRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import productionPlanRoutes from './routes/productionPlanRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/station-templates', stationTemplateRoutes);
app.use('/api/check-templates', checkTemplateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/production-plans', productionPlanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ocr', ocrRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

