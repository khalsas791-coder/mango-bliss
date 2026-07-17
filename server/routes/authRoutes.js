import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../firebase.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'mango-bliss-jwt-secret-2024';

function generateToken(uid, role) {
  return jwt.sign({ id: uid, role }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.collection('users')
      .where('email', '==', emailLower)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const now = new Date().toISOString();
    const userData = {
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      role: 'user',
      createdAt: now,
      lastLoginAt: null,
      lastLoginIP: null,
      loginCount: 0,
      lastKnownLat: null,
      lastKnownLng: null,
      lastLocationAt: null
    };

    const userRef = await db.collection('users').add(userData);
    const token = generateToken(userRef.id, 'user');

    console.log(`✅ [Auth] Registered new user: ${emailLower} (${userRef.id})`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: userRef.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const emailLower = email.toLowerCase().trim();

    // Check admin credentials first (env-based, no DB lookup needed)
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';

    if (emailLower === adminEmail && password === adminPassword) {
      // Admin login — upsert admin record in Firestore
      const adminQuery = await db.collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();

      let adminId;
      if (adminQuery.empty) {
        const salt = await bcrypt.genSalt(12);
        const hashedPw = await bcrypt.hash(adminPassword, salt);
        const adminRef = await db.collection('users').add({
          name: 'Admin',
          email: emailLower,
          password: hashedPw,
          role: 'admin',
          createdAt: new Date().toISOString(),
          loginCount: 1,
          lastLoginAt: new Date().toISOString()
        });
        adminId = adminRef.id;
      } else {
        adminId = adminQuery.docs[0].id;
        await db.collection('users').doc(adminId).update({
          role: 'admin',
          lastLoginAt: new Date().toISOString(),
          loginCount: (adminQuery.docs[0].data().loginCount || 0) + 1
        });
      }

      const token = generateToken(adminId, 'admin');
      console.log(`✅ [Auth] Admin login: ${emailLower}`);
      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: { id: adminId, name: 'Admin', email: emailLower, role: 'admin', createdAt: new Date().toISOString() }
      });
    }

    // Regular user login
    const userQuery = await db.collection('users')
      .where('email', '==', emailLower)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last login info
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    await db.collection('users').doc(userDoc.id).update({
      lastLoginAt: new Date().toISOString(),
      lastLoginIP: clientIP,
      loginCount: (userData.loginCount || 0) + 1
    });

    const role = userData.role || 'user';
    const token = generateToken(userDoc.id, role);

    console.log(`✅ [Auth] User login: ${emailLower}`);
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role,
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (protected)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token required.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const userDoc = await db.collection('users').doc(decoded.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userData = userDoc.data();
    res.status(200).json({
      success: true,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'user',
        createdAt: userData.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;
