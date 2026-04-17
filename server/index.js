import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Firebase Initialization ---
// For production, you should use a service account JSON file.
// For this demo, we'll check if a service account config is available.
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase initialized successfully");
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found in environment. Order persistence disabled.");
}

const db = admin.apps.length ? admin.firestore() : null;

// --- Razorpay Initialization ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

// --- API Endpoints ---

// 1. Create Order
app.post('/api/orders/create', async (req, res) => {
  try {
    const { productName, amount, customerName, paymentMethod } = req.body;
    
    // Create a unique order ID for our system
    const systemOrderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: systemOrderId,
    };

    let razorpayOrder = null;
    if (paymentMethod !== 'cod') {
      razorpayOrder = await razorpay.orders.create(options);
    }

    const orderData = {
      orderId: systemOrderId,
      gatewayOrderId: razorpayOrder ? razorpayOrder.id : null,
      customerName,
      productName,
      amount,
      paymentMethod,
      paymentStatus: 'pending',
      transactionId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Store in DB if available
    if (db) {
      await db.collection('orders').doc(systemOrderId).set(orderData);
    }

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

// 2. Verify Payment
app.post('/api/orders/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, systemOrderId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
      .update(body.toString())
      .digest("hex");

    const isMatch = expectedSignature === razorpay_signature;

    if (isMatch) {
      // Update DB
      if (db && systemOrderId) {
        await db.collection('orders').doc(systemOrderId).update({
          paymentStatus: 'success',
          transactionId: razorpay_payment_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      if (db && systemOrderId) {
        await db.collection('orders').doc(systemOrderId).update({
          paymentStatus: 'failed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update Order Status (for COD or other manual updates)
app.post('/api/orders/update-status', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (db) {
      await db.collection('orders').doc(orderId).update({
        paymentStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Database not initialized" });
    }
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 4. Webhook Callback
app.post('/api/payment/callback', (req, res) => {
  // Logic to handle Razorpay webhooks for async payment confirmation
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  // Real implementation would verify the signature here...
  console.log("Webhook received:", req.body);
  res.status(200).send('OK');
});

// 5. Admin Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    if (!db) return res.status(404).json({ message: "DB not available" });
    
    const snapshot = await db.collection('orders').get();
    const orders = snapshot.docs.map(doc => doc.data());
    
    const stats = {
      totalOrders: orders.length,
      paidOrders: orders.filter(o => o.paymentStatus === 'success').length,
      pendingOrders: orders.filter(o => o.paymentStatus === 'pending').length,
      failedPayments: orders.filter(o => o.paymentStatus === 'failed').length,
      codOrders: orders.filter(o => o.paymentMethod === 'cod').length,
    };
    
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
