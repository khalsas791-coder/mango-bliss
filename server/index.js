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
    sqlite: db.open ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-json', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is correctly returning JSON' });
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
      if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder') {
        razorpayOrder = { id: `order_mock_${Date.now()}` };
      } else {
        razorpayOrder = await razorpay.orders.create(options);
      }
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
      userId: userId || null
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

app.post('/api/admin/force-status', async (req, res) => {
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

app.get('/api/admin/stats', async (req, res) => {
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

app.get('/api/orders/:id', async (req, res) => {
   try {
     const order = await Order.findOne({ systemOrderId: req.params.id });
     if (order) res.status(200).json({ success: true, order });
     else res.status(404).json({ success: false, message: "Not found" });
   } catch(err) {
     res.status(500).json({ success: false, message: err.message });
   }
});

// --- User Location Endpoints ---
app.post('/api/location/update', async (req, res) => {
  try {
    const { userId, orderId, latitude, longitude } = req.body;
    
    // Update or create location record
    const location = await Location.findOneAndUpdate(
      { orderId },
      { userId, latitude, longitude, timestamp: Date.now() },
      { upsert: true, new: true }
    );

    // Also update the order's user coordinates for routing
    await Order.findOneAndUpdate(
      { systemOrderId: orderId },
      { userLat: latitude, userLng: longitude }
    );

    // Broadcast to the specifically interested order room
    io.to(orderId).emit('userLocationUpdate', { latitude, longitude });
    
    // Broadcast globally for the admin fleet map
    io.emit('fleetUpdate', { orderId, userId, latitude, longitude });

    res.status(200).json({ success: true, location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/location/all', async (req, res) => {
  try {
    const locations = await Location.find().sort({ timestamp: -1 });
    res.status(200).json({ success: true, locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/location/:userId', async (req, res) => {
  try {
    const location = await Location.findOne({ userId: req.params.userId }).sort({ timestamp: -1 });
    if (location) res.status(200).json({ success: true, location });
    else res.status(404).json({ success: false, message: "Location not found" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
