import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import experiencesRouter from './routes/experiences.js';
import bookingsRouter from './routes/bookings.js';
import authRouter from './routes/auth.js';

import { initializeStore } from './db.js';
import { errorHandler } from './middleware/error-handler.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, '..', 'public');

// Initialize the JSON store. On Render, backend/data is mounted to a
// persistent disk by render.yaml so accounts and bookings survive restarts.
initializeStore();

const app = express();
app.disable('x-powered-by');

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// The deployed frontend is served by this same Express app, so CORS is
// unnecessary for normal production traffic. Set FRONTEND_ORIGIN only when
// intentionally allowing a separate development frontend.
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false
}));

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'trav-world',
    frontend: 'served-by-this-service'
  });
});

// API routes
app.use('/api/experiences', experiencesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/auth', authRouter);

// Serve Trav-World frontend and its static assets from the same domain.
app.use(express.static(publicDir, {
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

// Keep unknown API routes as JSON 404s; route other paths to the website.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Error handler (keep this last)
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => {
  console.log(`Trav-World listening on port ${port}`);
});
