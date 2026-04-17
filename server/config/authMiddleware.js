import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mango-bliss-super-secret-jwt-key-2024';

/**
 * Middleware to protect routes.
 * Verifies JWT from Authorization header and attaches user to req.
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

/**
 * Middleware to protect ADMIN-ONLY routes.
 * Must run AFTER authMiddleware.
 */
export function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Admins only.' });
  }
  next();
}

/**
 * Generate a JWT token for a user — includes role in payload.
 */
export function generateToken(userId, role = 'user') {
  return jwt.sign(
    { id: userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export { JWT_SECRET };
