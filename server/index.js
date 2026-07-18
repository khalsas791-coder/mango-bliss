import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { getDb, getRtdb, isFirebaseReady, getFirebaseError } from './firebase.js';
import authRoutes from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Request Logger ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Static File Serving ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// --- HTTP + Socket.io server ---
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// --- Razorpay ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

// --- Mount routes ---
app.use('/api/auth', authRoutes);

// --- Health Check ---
app.get('/api/health', async (req, res) => {
  if (!isFirebaseReady()) {
    return res.status(503).json({
      status: 'error',
      firestore: 'disconnected',
      error: getFirebaseError() || 'Firebase not initialized',
      fix: 'Check FIREBASE_SERVICE_ACCOUNT env variable in Vercel'
    });
  }
  try {
    await getDb().collection('_health').doc('ping').set({ ts: Date.now() });
    res.status(200).json({ status: 'online', firestore: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', firestore: 'disconnected', error: err.message });
  }
});

app.get('/api/test-json', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is correctly returning JSON' });
});

// Debug endpoint — shows Firebase init status
app.get('/api/debug', (req, res) => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  const hasKey = raw.length > 0;
  let parseOk = false;
  let parseError = null;
  let projectId = null;
  let firstChars = raw.substring(0, 60);
  let lastChars = raw.substring(raw.length - 30);

  try {
    const parsed = JSON.parse(raw.trim().replace(/^["']|["']$/g, ''));
    parseOk = true;
    projectId = parsed.project_id || 'unknown';
  } catch (e) {
    parseError = e.message;
  }

  res.status(200).json({
    firebase_env_set: hasKey,
    firebase_env_length: raw.length,
    firebase_first_chars: firstChars,
    firebase_last_chars: lastChars,
    json_parse_ok: parseOk,
    project_id: projectId,
    parse_error: parseError,
    firebase_ready: isFirebaseReady(),
    firebase_error: getFirebaseError(),
    database_url: process.env.FIREBASE_DATABASE_URL || 'not set'
  });
});

// --- OSRM Directions Proxy ---
app.get('/api/directions', async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;
  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({ success: false, message: 'Missing coordinate parameters' });
  }
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(osrmUrl, { headers: { 'User-Agent': 'MangoBlissApp/1.0' } });
    if (!response.ok) throw new Error(`OSRM responded with status ${response.status}`);
    const data = await response.json();
    if (!data.routes?.length) return res.status(404).json({ success: false, message: 'No route found' });
    const route = data.routes[0];
    const geometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    res.status(200).json({ success: true, distance_m: Math.round(route.distance), duration_s: Math.round(route.duration), geometry });
  } catch (err) {
    res.status(200).json({ success: true, distance_m: null, duration_s: null, geometry: [[parseFloat(startLat), parseFloat(startLng)], [parseFloat(endLat), parseFloat(endLng)]], fallback: true });
  }
});

// --- Admin JWT Middleware ---
const JWT_SECRET = process.env.JWT_SECRET || 'mango-bliss-jwt-secret-2024';

const adminAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Admin token required.' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: 'Access denied. Not an admin.' });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token.' });
  }
};

// --- Admin Login ---
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
    if (email.toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }
    const token = jwt.sign({ role: 'admin', email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: '8h' });
    res.status(200).json({ success: true, token, message: 'Admin login successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// --- Admin: All Orders ---
app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const snapshot = await getDb().collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

// --- Admin: All Users ---
app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    const snapshot = await getDb().collection('users').orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(d => {
      const { password, ...rest } = d.data();
      return { id: d.id, ...rest };
    });
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Admin: Force Status ---
app.post('/api/admin/force-status', adminAuthMiddleware, async (req, res) => {
  try {
    const { orderId, statusPhase } = req.body;
    const snapshot = await getDb().collection('orders').where('systemOrderId', '==', orderId).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: 'Order not found.' });
    const docRef = snapshot.docs[0].ref;
    await docRef.update({ statusPhase, updatedAt: new Date().toISOString() });
    const updated = (await docRef.get()).data();

    // Push via Socket.io
    io.to(orderId).emit('locationUpdate', {
      deliveryLat: updated.deliveryLat,
      deliveryLng: updated.deliveryLng,
      statusPhase: updated.statusPhase,
      etaMinutes: updated.etaMinutes
    });

    // Push to Firebase RTDB for real-time tracking
    await getRtdb().ref(`orders/${orderId}`).update({ statusPhase, updatedAt: Date.now() });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Create Order ---
app.post('/api/orders/create', async (req, res) => {
  try {
    const { productName, amount, customerName, paymentMethod, userLat, userLng, userId } = req.body;
    const systemOrderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // GNDECB Campus — Bathinda, Punjab (delivery start point)
    const startLat = 30.2050;
    const startLng = 74.9570;

    let razorpayOrder = null;
    if (paymentMethod !== 'cod') {
      try {
        if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder') {
          razorpayOrder = { id: `order_mock_${Date.now()}` };
        } else {
          razorpayOrder = await razorpay.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: systemOrderId });
        }
      } catch {
        razorpayOrder = { id: `order_mock_${Date.now()}` };
      }
    }

    const orderData = {
      systemOrderId,
      gatewayOrderId: razorpayOrder?.id || null,
      customerName,
      productName,
      amount,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'cod_placed' : 'pending',
      userLat: userLat || startLat,
      userLng: userLng || startLng,
      deliveryLat: startLat,
      deliveryLng: startLng,
      statusPhase: paymentMethod === 'cod' ? 'preparing' : 'awaiting_payment',
      etaMinutes: 25,
      userId: userId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const orderRef = await getDb().collection('orders').add(orderData);

    // Mirror to RTDB for real-time delivery tracking
    await getRtdb().ref(`orders/${systemOrderId}`).set({
      deliveryLat: startLat,
      deliveryLng: startLng,
      statusPhase: orderData.statusPhase,
      etaMinutes: 25,
      updatedAt: Date.now()
    });

    console.log(`✅ [Order] Created: ${systemOrderId}`);
    res.status(200).json({ success: true, order: { id: orderRef.id, ...orderData }, razorpayOrder });
  } catch (error) {
    console.error('❌ [Order] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Verify Payment ---
app.post('/api/orders/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, systemOrderId } = req.body;
    const isDemo = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'secret_placeholder';
    let isMatch = false;
    if (isDemo) {
      isMatch = true;
    } else {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
      isMatch = expectedSignature === razorpay_signature;
    }

    const snapshot = await getDb().collection('orders').where('systemOrderId', '==', systemOrderId).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: 'Order not found.' });

    const docRef = snapshot.docs[0].ref;
    if (isMatch) {
      await docRef.update({ paymentStatus: 'success', transactionId: razorpay_payment_id, statusPhase: 'preparing', updatedAt: new Date().toISOString() });
      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      await docRef.update({ paymentStatus: 'failed', updatedAt: new Date().toISOString() });
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Get Single Order ---
app.get('/api/orders/:id', async (req, res) => {
  try {
    const snapshot = await getDb().collection('orders').where('systemOrderId', '==', req.params.id).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: 'Not found' });
    const doc = snapshot.docs[0];
    res.status(200).json({ success: true, order: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// LOCATION API (Firestore + RTDB)
// ═══════════════════════════════════════════════════════

function qualityFromAccuracy(accuracy) {
  if (accuracy == null) return 'unknown';
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 30) return 'good';
  if (accuracy <= 100) return 'fair';
  return 'poor';
}

const locationRateMap = new Map();
const LOCATION_MIN_INTERVAL_MS = 5_000;

app.post('/api/location/update', async (req, res) => {
  try {
    const { userId, userName, orderId, latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, address, source, quality: clientQuality, deviceInfo } = req.body;

    if (latitude == null || longitude == null || !orderId) {
      return res.status(400).json({ success: false, message: 'latitude, longitude and orderId are required.' });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Coordinates out of valid range.' });
    }

    const now = Date.now();
    const lastWrite = locationRateMap.get(orderId) || 0;
    if (now - lastWrite < LOCATION_MIN_INTERVAL_MS) {
      return res.status(429).json({ success: false, message: 'Rate-limited to once per 5 seconds.', retryAfterMs: LOCATION_MIN_INTERVAL_MS - (now - lastWrite) });
    }
    locationRateMap.set(orderId, now);

    const quality = clientQuality || qualityFromAccuracy(accuracy != null ? parseFloat(accuracy) : null);
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

    const locationData = {
      orderId,
      userId: userId || 'guest',
      userName: userName || 'Guest',
      latitude: lat,
      longitude: lng,
      accuracy: accuracy != null ? parseFloat(accuracy) : null,
      altitude: altitude != null ? parseFloat(altitude) : null,
      altitudeAccuracy: altitudeAccuracy != null ? parseFloat(altitudeAccuracy) : null,
      heading: heading != null ? parseFloat(heading) : null,
      speed: speed != null ? parseFloat(speed) : null,
      quality,
      source: source || 'gps',
      address: address || {},
      deviceInfo: deviceInfo || {},
      ipAddress,
      timestamp: new Date().toISOString()
    };

    // Upsert into Firestore (one document per orderId)
    await getDb().collection('locations').doc(orderId).set(locationData, { merge: true });

    // Update the order's user coordinates in Firestore
    const orderSnap = await getDb().collection('orders').where('systemOrderId', '==', orderId).limit(1).get();
    if (!orderSnap.empty) {
      await orderSnap.docs[0].ref.update({ userLat: lat, userLng: lng });
    }

    // Update user's last known location
    if (userId && userId !== 'guest') {
      await getDb().collection('users').doc(userId).update({
        lastKnownLat: lat,
        lastKnownLng: lng,
        lastLocationAt: new Date().toISOString()
      }).catch(() => {});
    }

    // Push to Firebase RTDB for real-time delivery tracking UI
    await getRtdb().ref(`locations/${orderId}`).set({ latitude: lat, longitude: lng, quality, accuracy, timestamp: Date.now() });

    // Socket.io broadcast
    const broadcastPayload = { latitude: lat, longitude: lng, accuracy, quality, address: address?.city ? `${address.city}, ${address.state || ''}`.trim() : null, timestamp: locationData.timestamp };
    io.to(orderId).emit('userLocationUpdate', broadcastPayload);
    io.emit('fleetUpdate', { orderId, userId, ...broadcastPayload });

    console.log(`📍 [Location] ${orderId} → ${lat.toFixed(5)}, ${lng.toFixed(5)} (${quality})`);
    res.status(200).json({ success: true, location: locationData });
  } catch (error) {
    console.error('[Location] Update error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/location/all', async (req, res) => {
  try {
    const snapshot = await getDb().collection('locations').orderBy('timestamp', 'desc').limit(200).get();
    const locations = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.status(200).json({ success: true, count: locations.length, locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/location/:userId', async (req, res) => {
  try {
    const snapshot = await getDb().collection('locations').where('userId', '==', req.params.userId).orderBy('timestamp', 'desc').limit(1).get();
    if (snapshot.empty) return res.status(404).json({ success: false, message: 'Location not found' });
    const doc = snapshot.docs[0];
    res.status(200).json({ success: true, location: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reverse Geocode Proxy
app.get('/api/location/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required.' });
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'MangoBlissApp/1.0' } });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const data = await response.json();
    const a = data.address || {};
    res.status(200).json({ success: true, raw: data.display_name || '', street: a.road || a.pedestrian || null, district: a.suburb || a.neighbourhood || null, city: a.city || a.town || a.village || null, state: a.state || null, country: a.country || null, postalCode: a.postcode || null });
  } catch (err) {
    res.status(200).json({ success: false, message: 'Reverse geocoding unavailable', raw: '' });
  }
});

// --- API 404 ---
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// --- Catch-All (SPA) ---
app.get('*', (req, res) => {
  if (path.extname(req.path) || req.path.startsWith('/api')) return res.status(404).send('Not Found');
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- WebSocket ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('joinOrderRoom', async (orderId) => {
    socket.join(orderId);
    try {
      const snapshot = await getDb().collection('orders').where('systemOrderId', '==', orderId).limit(1).get();
      if (!snapshot.empty) {
        const order = snapshot.docs[0].data();
        socket.emit('locationUpdate', { deliveryLat: order.deliveryLat, deliveryLng: order.deliveryLng, statusPhase: order.statusPhase, etaMinutes: order.etaMinutes });
      }
    } catch {}
  });
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// --- Delivery Simulation Engine (Firestore-backed) ---
setInterval(async () => {
  try {
    const snapshot = await getDb().collection('orders')
      .where('paymentStatus', 'in', ['success', 'paid', 'cod_placed'])
      .get();

    for (const docSnap of snapshot.docs) {
      const order = docSnap.data();
      if (order.statusPhase === 'delivered') continue;
      if (!order.userLat || !order.userLng || !order.deliveryLat || !order.deliveryLng) continue;

      let { deliveryLat, deliveryLng, userLat, userLng, statusPhase, etaMinutes } = order;
      const distLat = userLat - deliveryLat;
      const distLng = userLng - deliveryLng;
      const distance = Math.sqrt(distLat * distLat + distLng * distLng);
      const speed = 0.001;
      let newPhase = statusPhase || 'preparing';
      let newEta = etaMinutes;

      if (newPhase === 'preparing' && Math.random() > 0.6) newPhase = 'shipped';
      else if (newPhase === 'shipped' && Math.random() > 0.6) newPhase = 'out_for_delivery';

      if (newPhase === 'out_for_delivery' || newPhase === 'shipped') {
        if (distance < speed) {
          deliveryLat = userLat; deliveryLng = userLng; newPhase = 'delivered'; newEta = 0;
        } else {
          const ratio = speed / distance;
          deliveryLat += distLat * ratio;
          deliveryLng += distLng * ratio;
          newEta = Math.ceil((distance / speed) * 5 / 60);
        }

        await docSnap.ref.update({ deliveryLat, deliveryLng, statusPhase: newPhase, etaMinutes: newEta, updatedAt: new Date().toISOString() });

        const payload = { deliveryLat, deliveryLng, statusPhase: newPhase, etaMinutes: newEta };
        io.to(order.systemOrderId).emit('locationUpdate', payload);

        // Update RTDB too
        await getRtdb().ref(`orders/${order.systemOrderId}`).update({ ...payload, updatedAt: Date.now() });
      }
    }
  } catch (error) {
    console.error('Simulation error:', error.message);
  }
}, 10000);

// --- Start Server (local only) ---
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server & WebSockets running on port ${PORT}`);
  });
}

export default app;
