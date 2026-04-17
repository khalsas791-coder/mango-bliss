import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// --- Database Initialization ---
const db = new Database('./mango-bliss.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    systemOrderId TEXT PRIMARY KEY,
    gatewayOrderId TEXT,
    customerName TEXT,
    productName TEXT,
    amount REAL,
    paymentMethod TEXT,
    paymentStatus TEXT,
    transactionId TEXT,
    userLat REAL,
    userLng REAL,
    deliveryLat REAL,
    deliveryLng REAL,
    statusPhase TEXT,
    etaMinutes INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// If adding new columns to existing DB, we can use try-catch or PRAGMA statements.
// To avoid "duplicate column" errors while making it robust:
try { db.exec("ALTER TABLE orders ADD COLUMN userLat REAL"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN userLng REAL"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN deliveryLat REAL"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN deliveryLng REAL"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN statusPhase TEXT"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN etaMinutes INTEGER"); } catch {}

// --- Razorpay Initialization ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

// Prepared statements
const insertOrder = db.prepare(`
  INSERT INTO orders (systemOrderId, gatewayOrderId, customerName, productName, amount, paymentMethod, paymentStatus, userLat, userLng, deliveryLat, deliveryLng, statusPhase, etaMinutes)
  VALUES (@systemOrderId, @gatewayOrderId, @customerName, @productName, @amount, @paymentMethod, @paymentStatus, @userLat, @userLng, @deliveryLat, @deliveryLng, @statusPhase, @etaMinutes)
`);

const verifyOrder = db.prepare(`
  UPDATE orders 
  SET paymentStatus = @paymentStatus, transactionId = @transactionId, updatedAt = CURRENT_TIMESTAMP
  WHERE systemOrderId = @systemOrderId
`);

const updateOrderStatus = db.prepare(`
  UPDATE orders 
  SET paymentStatus = @paymentStatus, statusPhase = @statusPhase, updatedAt = CURRENT_TIMESTAMP
  WHERE systemOrderId = @systemOrderId
`);

const updateOrderLocation = db.prepare(`
  UPDATE orders 
  SET deliveryLat = @deliveryLat, deliveryLng = @deliveryLng, statusPhase = @statusPhase, etaMinutes = @etaMinutes
  WHERE systemOrderId = @systemOrderId
`);

const getActiveOrders = db.prepare(`
  SELECT * FROM orders 
  WHERE paymentStatus IN ('success', 'paid', 'cod_placed') AND statusPhase != 'delivered'
`);

// --- WebSocket Event Handling ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('joinOrderRoom', (orderId) => {
    socket.join(orderId);
    console.log(`Socket ${socket.id} joined room ${orderId}`);
    
    // Immediately send current location data
    const order = db.prepare('SELECT * FROM orders WHERE systemOrderId = ?').get(orderId);
    if (order) {
      socket.emit('locationUpdate', {
        deliveryLat: order.deliveryLat,
        deliveryLng: order.deliveryLng,
        statusPhase: order.statusPhase,
        etaMinutes: order.etaMinutes
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- Delivery Simulation Engine ---
// Moves active deliveries slightly closer to the destination every 5 seconds.
setInterval(() => {
  const activeOrders = getActiveOrders.all();

  activeOrders.forEach(order => {
    // If we don't have basic coordinates, skip
    if (!order.userLat || !order.userLng || !order.deliveryLat || !order.deliveryLng) return;

    let { deliveryLat, deliveryLng, userLat, userLng, statusPhase } = order;

    // Movement calculation
    const distLat = userLat - deliveryLat;
    const distLng = userLng - deliveryLng;
    const distance = Math.sqrt(distLat * distLat + distLng * distLng);

    // Speed parameter: roughly 0.005 degrees per interval
    const speed = 0.001;
    let newPhase = statusPhase || 'preparing';
    let newEta = order.etaMinutes;

    // Simulate progress delays
    if (newPhase === 'preparing') {
      // randomly push to shipped
      if (Math.random() > 0.6) newPhase = 'shipped';
    } else if (newPhase === 'shipped') {
       if (Math.random() > 0.6) newPhase = 'out_for_delivery';
    }
    
    if (newPhase === 'out_for_delivery' || newPhase === 'shipped') {
      if (distance < speed) {
        // We arrived!
        deliveryLat = userLat;
        deliveryLng = userLng;
        newPhase = 'delivered';
        newEta = 0;
      } else {
        // Move agent closer
        const ratio = speed / distance;
        deliveryLat += distLat * ratio;
        deliveryLng += distLng * ratio;

        // Roughly calculate ETA (distance / speed * 5 seconds) => converted to minutes
        newEta = Math.ceil((distance / speed) * 5 / 60);
      }

      updateOrderLocation.run({
        deliveryLat,
        deliveryLng,
        statusPhase: newPhase,
        etaMinutes: newEta,
        systemOrderId: order.systemOrderId
      });

      // Broadcast to any clients listening in the order room
      io.to(order.systemOrderId).emit('locationUpdate', {
        deliveryLat,
        deliveryLng,
        statusPhase: newPhase,
        etaMinutes: newEta
      });
    }
  });

}, 5000);


// --- API Endpoints ---
app.post('/api/orders/create', async (req, res) => {
  try {
    const { productName, amount, customerName, paymentMethod, userLat, userLng } = req.body;
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
      etaMinutes: 25 // default init ETA
    };

    insertOrder.run(orderData);

    res.status(200).json({
      success: true,
      order: orderData,
      razorpayOrder: razorpayOrder
    });
  } catch (error) {
    console.error("Order creation error:", error);
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
      verifyOrder.run({
        paymentStatus: 'success',
        transactionId: razorpay_payment_id,
        systemOrderId
      });
      
      // Upgrade statusPhase to 'preparing' upon successful payment
      db.prepare(`UPDATE orders SET statusPhase = 'preparing' WHERE systemOrderId = ?`).run(systemOrderId);

      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      verifyOrder.run({
        paymentStatus: 'failed',
        transactionId: null,
        systemOrderId
      });
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/force-status', (req, res) => {
  try {
    const { orderId, statusPhase } = req.body;
    // Just force the phase to whatever admin says
    db.prepare(`UPDATE orders SET statusPhase = ? WHERE systemOrderId = ?`).run(statusPhase, orderId);
    
    // Broadcast instantly
    const order = db.prepare('SELECT * FROM orders WHERE systemOrderId = ?').get(orderId);
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

app.get('/api/admin/stats', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
    const stats = {
      totalOrders: orders.length,
      paidOrders: orders.filter(o => o.paymentStatus === 'success' || o.paymentStatus === 'cod_placed').length,
      pendingOrders: orders.filter(o => o.paymentStatus === 'pending').length,
      failedPayments: orders.filter(o => o.paymentStatus === 'failed').length,
      codOrders: orders.filter(o => o.paymentMethod === 'cod').length,
      activeDeliveries: orders.filter(o => o.statusPhase === 'out_for_delivery').length,
      recentOrders: orders.slice(0, 50) // pass orders to the admin panel
    };
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
   try {
     const order = db.prepare('SELECT * FROM orders WHERE systemOrderId = ?').get(req.params.id);
     if (order) res.status(200).json({ success: true, order });
     else res.status(404).json({ success: false, message: "Not found" });
   } catch(err) {
     res.status(500).json({ success: false, message: err.message });
   }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server & WebSockets running on port ${PORT}`);
});
