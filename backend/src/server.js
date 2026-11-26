
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import experiencesRouter from './routes/experiences.js';
import bookingsRouter from './routes/bookings.js';
import authRouter from './routes/auth.js';

import { initializeStore } from './db.js';
import { errorHandler } from './middleware/error-handler.js';

// Initialize JSON file storage
const databaseFile = initializeStore();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(',') || true
  })
);

app.use(express.json({ limit: '1mb' }));

// Backend homepage
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Service Booker Pro API!',
    status: 'Backend is running successfully',
    storage: 'json-file',
    databaseFile,
    endpoints: {
      home: '/',
      health: '/api/health',
      experiences: '/api/experiences',
      register: '/api/auth/register',
      login: '/api/auth/login',
      bookings: '/api/bookings'
    }
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'service-booker-pro-api',
    storage: 'json-file',
    databaseFile
  });
});

// API routes
app.use('/api/experiences', experiencesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/auth', authRouter);

// Error handler (keep this last)
app.use(errorHandler);

// Start server
const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(
    `Service Booker API listening on http://localhost:${port}`
  );
});
