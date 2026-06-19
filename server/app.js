import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import prisma from './prisma/client.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // For hackathon purposes, allow all origins
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Verify DB connection and listen
async function startServer() {
  try {
    // Ping DB
    await prisma.$connect();
    console.log('Successfully connected to the database via Prisma.');

    if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`EcoTrack Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log(`API base path: http://localhost:${PORT}/api`);
      });
    }
  } catch (error) {
    console.error('Failed to start server due to database connectivity error:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

startServer();

export default app; // For integration testing
