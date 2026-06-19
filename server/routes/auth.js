import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../prisma/client.js';
import authMiddleware from '../config/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ecotrack-secret-key-12345!';

// 1. Get Google Client ID configuration
router.get('/config', (req, res) => {
  // Use a default client ID if not set in .env to ensure out-of-the-box demo functionality
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '825902096333-e18egeopk84g11e0j2s944jld19s3s0d.apps.googleusercontent.com';
  res.json({ googleClientId });
});

// 2. Standard Email/Password Register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        monthlyGoal: 400.0, // default budget goal
      }
    });

    // Sign JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        country: user.country,
        monthlyGoal: user.monthlyGoal,
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// 3. Standard Email/Password Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Sign JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        country: user.country,
        monthlyGoal: user.monthlyGoal,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to authenticate user.' });
  }
});

// 4. Google Sign-In Authentication
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required.' });
  }

  try {
    // Verify ID Token by calling Google's secure token verification API
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = response.data;

    // Check payload attributes
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google credential token.' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || '';
    const googleId = payload.sub; // unique Google user identifier

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `google-${googleId}`,
          email,
          name,
          monthlyGoal: 400.0,
        }
      });
    } else {
      // If user exists but has no name, update it
      if (!user.name && name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name }
        });
      }
    }

    // Sign JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        country: user.country,
        monthlyGoal: user.monthlyGoal,
      }
    });
  } catch (err) {
    console.error('Google login verification error:', err.message);
    res.status(400).json({ error: 'Google token verification failed. Please try again.' });
  }
});

// 5. Get current authenticated user profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      country: req.user.country,
      monthlyGoal: req.user.monthlyGoal,
    }
  });
});

export default router;
