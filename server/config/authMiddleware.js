import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecotrack-secret-key-12345!';

export default async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Access denied. Invalid token payload.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Access denied. User no longer exists.' });
    }

    // Attach user information to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication middleware error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Authentication failed. Invalid token.' });
  }
}
