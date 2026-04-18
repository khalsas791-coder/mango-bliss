import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import Order from './models/Order.js';
import Location from './models/Location.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Request Logger (Production Diagnostic) ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- MongoDB Connection Singleton (for Serverless) ---
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mango-bliss';

  // Aggressive Sanitization: Find the start of the actual protocol
  const mongoMatch = uri.match(/mongodb(?:\+srv)?:\/\/.*/);
  if (mongoMatch) {
    uri = mongoMatch[0];
  }

  // Remove any trailing artifacts or common paste errors (e.g., quotes or colons)
  uri = uri.trim().replace(/["';]+$/, '');

  try {
    console.log(`📡 [MongoDB] Attempting connection... (URI starts with: ${uri.substring(0, 20)}...)`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ [MongoDB] Connected successfully');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ [MongoDB] Connection ERROR:', err.message);
    throw err;
  }
}

// Initial connection attempt
connectDB().catch(() => {});

// --- API Global Middleware ---
// Health middleware to check MongoDB connection before processing ANY /api request
app.use('/api', async (req, res, next) => {
  try {
    // Wait for database connection if it's still connecting
    if (!isConnected || mongoose.connection.readyState !== 1) {
      console.log('⏳ [API Middleware] Database not ready, waiting for connection...');
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('❌ [API Middleware] Database health check failed:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection not established. Please verify MONGODB_URI and Atlas IP Whitelist.',
      error: err.message
    });
  }
});

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-json', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is correctly returning JSON' });
});

// --- Route Directions Proxy (OSRM) ---
// Fetches real road routes from OSRM demo server and proxies to frontend.
// This avoids exposing any API key on the client and handles CORS.
app.get('/api/directions', async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({ success: false, message: 'Missing coordinate parameters' });
  }

  try {
    // OSRM public demo server — no key required
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'MangoBlissApp/1.0' }
    });

    if (!response.ok) throw new Error(`OSRM responded with status ${response.status}`);

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ success: false, message: 'No route found' });
    }

    const route = data.routes[0];
    // Convert GeoJSON [lng, lat] pairs to Leaflet [lat, lng] pairs
    const geometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    res.status(200).json({
      success: true,
      distance_m: Math.round(route.distance),
      duration_s: Math.round(route.duration),
      geometry
    });
  } catch (err) {
    console.error('OSRM fetch error:', err.message);
    // Graceful fallback: return a straight line between the two points
    res.status(200).json({
      success: true,
      distance_m: null,
      duration_s: null,
      geometry: [
        [parseFloat(startLat), parseFloat(startLng)],
        [parseFloat(endLat), parseFloat(endLng)]
      ],
      fallback: true
    });
  }
});

// --- Static File Serving (Production) ---
const distPath = path.join(__dirname, '../dist');
console.log(`📡 Serving static files from: ${distPath}`);
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// --- MongoDB already initialized above via connectDB helper ---

// --- Razorpay Initialization ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

// Mount specialized routes
app.use('/api/auth', authRoutes);

// --- Admin Login Endpoint (public — no auth needed) ---
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'khalsas791@gmail.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'khalsa@11';

    const bcrypt = await import('bcryptjs');
    const jwt = await import('jsonwebtoken');

    const emailMatch = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    // Compare directly if stored as plaintext, or as hash
    let passMatch = false;
    if (ADMIN_PASSWORD.startsWith('$2')) {
      // It's a bcrypt hash
      passMatch = await bcrypt.default.compare(password, ADMIN_PASSWORD);
    } else {
      // Plaintext comparison (dev mode)
      passMatch = password === ADMIN_PASSWORD;
    }

    if (!emailMatch || !passMatch) {
      console.warn(`[Admin] Failed login attempt for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const token = jwt.default.sign(
      { role: 'admin', email: ADMIN_EMAIL },
      process.env.JWT_SECRET || 'mango-bliss-jwt-secret-2024',
      { expiresIn: '8h' }
    );

    console.log(`✅ [Admin] Successful login: ${email}`);
    res.status(200).json({ success: true, token, message: 'Admin login successful' });
  } catch (err) {
    console.error('[Admin] Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// --- Admin JWT Middleware ---
const adminAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin token required.' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'mango-bliss-jwt-secret-2024');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Not an admin.' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token.' });
  }
};

// --- WebSocket Event Handling ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('joinOrderRoom', async (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined room ${orderId}`);
    
    // Immediately send current location data
    try {
      const order = await Order.findOne({ systemOrderId: orderId });
      if (order) {
        socket.emit('locationUpdate', {
          deliveryLat: order.deliveryLat,
          deliveryLng: order.deliveryLng,
          statusPhase: order.statusPhase,
          etaMinutes: order.etaMinutes
        });
      }
    } catch (error) {
      console.error('Error fetching order for socket:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- Delivery Simulation Engine ---
// Moves active deliveries slightly closer to the destination every 10 seconds.
setInterval(async () => {
  try {
    const activeOrders = await Order.find({
      paymentStatus: { $in: ['success', 'paid', 'cod_placed'] },
      statusPhase: { $ne: 'delivered' }
    });

    for (const order of activeOrders) {
      if (!order.userLat || !order.userLng || !order.deliveryLat || !order.deliveryLng) continue;

      let { deliveryLat, deliveryLng, userLat, userLng, statusPhase } = order;

      const distLat = userLat - deliveryLat;
      const distLng = userLng - deliveryLng;
      const distance = Math.sqrt(distLat * distLat + distLng * distLng);

      const speed = 0.001;
      let newPhase = statusPhase || 'preparing';
      let newEta = order.etaMinutes;

      if (newPhase === 'preparing') {
        if (Math.random() > 0.6) newPhase = 'shipped';
      } else if (newPhase === 'shipped') {
        if (Math.random() > 0.6) newPhase = 'out_for_delivery';
      }
      
      if (newPhase === 'out_for_delivery' || newPhase === 'shipped') {
        if (distance < speed) {
          deliveryLat = userLat;
          deliveryLng = userLng;
          newPhase = 'delivered';
          newEta = 0;
        } else {
          const ratio = speed / distance;
          deliveryLat += distLat * ratio;
          deliveryLng += distLng * ratio;
          newEta = Math.ceil((distance / speed) * 5 / 60);
        }

        await Order.updateOne(
          { _id: order._id },
          { 
            $set: { 
              deliveryLat, 
              deliveryLng, 
              statusPhase: newPhase, 
              etaMinutes: newEta,
              updatedAt: Date.now()
            } 
          }
        );

        io.to(order.systemOrderId).emit('locationUpdate', {
          deliveryLat,
          deliveryLng,
          statusPhase: newPhase,
          etaMinutes: newEta
        });
      }
    }
  } catch (error) {
    console.error('Simulation error:', error.message);
  }
}, 10000); // Check every 10s to reduce serverless load


// --- API Endpoints ---
app.post('/api/orders/create', async (req, res) => {
  try {
    const { productName, amount, customerName, paymentMethod, userLat, userLng, userId } = req.body;
    const systemOrderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: systemOrderId,
    };

    let razorpayOrder = null;
    if (paymentMethod !== 'cod') {
      try {
        if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder') {
          console.log("ℹ️ [Razorpay] Using mock order ID (No valid keys found)");
          razorpayOrder = { id: `order_mock_${Date.now()}` };
        } else {
          razorpayOrder = await razorpay.orders.create(options);
        }
      } catch (rzpErr) {
        console.error("⚠️ [Razorpay] Order creation failed, falling back to mock:", rzpErr.message);
        razorpayOrder = { id: `order_mock_${Date.now()}` };
      }
    }

    // Defensive userId Sanitization
    let cleanUserId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      cleanUserId = userId;
    }

    // Default pickup coords from GNDECB (approx: 17.9254, 77.5187)
    const startLat = 17.9254;
    const startLng = 77.5187;

    let initPhase = paymentMethod === 'cod' ? 'preparing' : 'awaiting_payment';
    
    const orderData = {
      systemOrderId,
      gatewayOrderId: razorpayOrder ? razorpayOrder.id : null,
      customerName,
      productName,
      amount,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'cod_placed' : 'pending',
      userLat: userLat || startLat,
      userLng: userLng || startLng,
      deliveryLat: startLat,
      deliveryLng: startLng,
      statusPhase: initPhase,
      etaMinutes: 25,
      userId: cleanUserId
    };

    const order = await Order.create(orderData);
    console.log(`✅ [Order] Created successfully: ${systemOrderId}`);

    res.status(200).json({
      success: true,
      order,
      razorpayOrder
    });
  } catch (error) {
    console.error("❌ [Order] Creation error details:", {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/orders/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, systemOrderId } = req.body;

    const isDemo = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'secret_placeholder';
    
    let isMatch = false;
    
    if (isDemo) {
      isMatch = true; 
    } else {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");
      isMatch = expectedSignature === razorpay_signature;
    }

    if (isMatch) {
      await Order.findOneAndUpdate(
        { systemOrderId },
        { 
          paymentStatus: 'success', 
          transactionId: razorpay_payment_id,
          statusPhase: 'preparing',
          updatedAt: Date.now()
        }
      );
      
      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      await Order.findOneAndUpdate(
        { systemOrderId },
        { 
          paymentStatus: 'failed', 
          updatedAt: Date.now()
        }
      );
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/force-status', adminAuthMiddleware, async (req, res) => {
  try {
    const { orderId, statusPhase } = req.body;
    
    const order = await Order.findOneAndUpdate(
      { systemOrderId: orderId },
      { statusPhase, updatedAt: Date.now() },
      { new: true }
    );
    
    if (order) {
      io.to(orderId).emit('locationUpdate', {
        deliveryLat: order.deliveryLat,
        deliveryLng: order.deliveryLng,
        statusPhase: order.statusPhase,
        etaMinutes: order.etaMinutes
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    
    const stats = {
      totalOrders: orders.length,
      paidOrders: orders.filter(o => ['success', 'paid', 'cod_placed'].includes(o.paymentStatus)).length,
      pendingOrders: orders.filter(o => o.paymentStatus === 'pending').length,
      failedPayments: orders.filter(o => o.paymentStatus === 'failed').length,
      codOrders: orders.filter(o => o.paymentMethod === 'cod').length,
      activeDeliveries: orders.filter(o => o.statusPhase === 'out_for_delivery').length,
      recentOrders: orders.slice(0, 50)
    };
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Admin: All Registered Users ---
app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    const User = (await import('./models/User.js')).default;
    // Select all fields except password hash
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
   try {
     const order = await Order.findOne({ systemOrderId: req.params.id });
     if (order) res.status(200).json({ success: true, order });
     else res.status(404).json({ success: false, message: "Not found" });
   } catch(err) {
     res.status(500).json({ success: false, message: err.message });
   }
});

// ═══════════════════════════════════════════════════════════════════
// PROFESSIONAL LOCATION API
// ═══════════════════════════════════════════════════════════════════

/**
 * Derive a quality label from the accuracy radius (metres).
 */
function qualityFromAccuracy(accuracy) {
  if (accuracy == null) return 'unknown';
  if (accuracy <= 10)   return 'excellent';
  if (accuracy <= 30)   return 'good';
  if (accuracy <= 100)  return 'fair';
  return 'poor';
}

// Simple in-memory per-order rate-limiter (1 write per 5 s)
const locationRateMap = new Map(); // orderId → lastWriteMs
const LOCATION_MIN_INTERVAL_MS = 5_000;

// --- POST /api/location/update ---
// Accepts full precision geolocation payload from the client.
app.post('/api/location/update', async (req, res) => {
  try {
    const {
      userId, userName, orderId,
      latitude, longitude,
      accuracy, altitude, altitudeAccuracy, heading, speed,
      address, source, quality: clientQuality,
      deviceInfo
    } = req.body;

    // Basic validation
    if (latitude == null || longitude == null || !orderId) {
      return res.status(400).json({ success: false, message: 'latitude, longitude and orderId are required.' });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Coordinates out of valid range.' });
    }

    // Server-side rate-limit (5 s per orderId)
    const now = Date.now();
    const lastWrite = locationRateMap.get(orderId) || 0;
    const isRateLimited = (now - lastWrite) < LOCATION_MIN_INTERVAL_MS;
    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Location updates are rate-limited to once per 5 seconds.',
        retryAfterMs: LOCATION_MIN_INTERVAL_MS - (now - lastWrite)
      });
    }
    locationRateMap.set(orderId, now);

    // Derive server-side quality if client didn't send one
    const quality = clientQuality || qualityFromAccuracy(accuracy != null ? parseFloat(accuracy) : null);

    // Extract client IP
    const ipAddress = (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket?.remoteAddress ||
      null
    );

    // Build update payload
    const updatePayload = {
      userId,
      userName: userName || 'Guest',
      latitude: lat,
      longitude: lng,
      accuracy:         accuracy         != null ? parseFloat(accuracy)         : null,
      altitude:         altitude         != null ? parseFloat(altitude)         : null,
      altitudeAccuracy: altitudeAccuracy != null ? parseFloat(altitudeAccuracy) : null,
      heading:          heading          != null ? parseFloat(heading)          : null,
      speed:            speed            != null ? parseFloat(speed)            : null,
      quality,
      source:     source     || 'gps',
      address:    address    || {},
      deviceInfo: deviceInfo || {},
      ipAddress,
      timestamp:  new Date(),
      geoPoint: { type: 'Point', coordinates: [lng, lat] },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    // Upsert: keep one live record per orderId
    const location = await Location.findOneAndUpdate(
      { orderId },
      updatePayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Also update the order's user coordinates for the delivery-simulation engine
    await Order.findOneAndUpdate(
      { systemOrderId: orderId },
      { userLat: lat, userLng: lng }
    );

    // Stamp the User document with the last known location
    if (userId && userId !== 'guest') {
      try {
        const User = (await import('./models/User.js')).default;
        if (mongoose.Types.ObjectId.isValid(userId)) {
          await User.findByIdAndUpdate(userId, {
            lastKnownLat: lat,
            lastKnownLng: lng,
            lastLocationAt: new Date()
          });
        }
      } catch (locUserErr) {
        console.warn('[Location] Could not update user location stamp:', locUserErr.message);
      }
    }

    // Real-time broadcast
    const broadcastPayload = {
      latitude: lat,
      longitude: lng,
      accuracy,
      quality,
      address: address?.city ? `${address.city}, ${address.state || ''}`.trim() : null,
      timestamp: updatePayload.timestamp
    };
    io.to(orderId).emit('userLocationUpdate', broadcastPayload);
    io.emit('fleetUpdate', { orderId, userId, ...broadcastPayload });

    console.log(`📍 [Location] ${orderId} → ${lat.toFixed(5)}, ${lng.toFixed(5)} (${quality} | ±${accuracy ?? '?'}m)`);
    res.status(200).json({ success: true, location });
  } catch (error) {
    console.error('[Location] Update error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- GET /api/location/all --- (Admin: most recent ping per order)
app.get('/api/location/all', async (req, res) => {
  try {
    const locations = await Location.find()
      .sort({ timestamp: -1 })
      .limit(200)
      .select('-geoPoint -__v');
    res.status(200).json({ success: true, count: locations.length, locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- GET /api/location/history/:orderId --- (Full ping history for an order)
app.get('/api/location/history/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const pings = await Location.find({ orderId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('latitude longitude accuracy quality timestamp speed heading');
    res.status(200).json({ success: true, count: pings.length, pings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- GET /api/location/:userId --- (Latest location for a user)
app.get('/api/location/:userId', async (req, res) => {
  try {
    const location = await Location
      .findOne({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .select('-geoPoint -__v');
    if (location) res.status(200).json({ success: true, location });
    else res.status(404).json({ success: false, message: 'Location not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- GET /api/location/reverse-geocode?lat=&lng= ---
// Proxies Nominatim so the API key / usage policy stays server-side.
app.get('/api/location/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng query params are required.' });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'MangoBlissApp/1.0 (contact: admin@mangobliss.in)'
      }
    });
    if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`);
    const data = await response.json();
    const a = data.address || {};
    res.status(200).json({
      success: true,
      raw:        data.display_name || '',
      street:     a.road || a.pedestrian || a.footway || null,
      district:   a.suburb || a.neighbourhood || a.quarter || null,
      city:       a.city || a.town || a.village || null,
      state:      a.state || null,
      country:    a.country || null,
      postalCode: a.postcode || null
    });
  } catch (err) {
    console.error('[ReverseGeocode] Error:', err.message);
    res.status(200).json({ success: false, message: 'Reverse geocoding unavailable', raw: '' });
  }
});

// --- API 404 Handler ---
// This ensures that any /api route that isn't matched returns a JSON error
// instead of the SPA's index.html for GET requests or a generic Express 404 for others.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// --- Catch-All Route (Must be last) ---
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (path.extname(req.path) || req.path.startsWith('/api')) {
    // If it's a static file request (with extension) or an API request that slipped through
    return res.status(404).send('Not Found');
  }
  res.sendFile(indexPath);
});


// --- Start Server ---
const PORT = process.env.PORT || 5000;

// On Vercel, the app is exported and managed by the platform.
// This block ensures the server only listens locally or in non-serverless environments.
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`Server & WebSockets running on port ${PORT}`);
  });
}

export default app;
