import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Razorpay Initialization ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

// Prepared statements
const insertOrder = db.prepare(`
  INSERT INTO orders (systemOrderId, gatewayOrderId, customerName, productName, amount, paymentMethod, paymentStatus)
  VALUES (@systemOrderId, @gatewayOrderId, @customerName, @productName, @amount, @paymentMethod, @paymentStatus)
`);

const verifyOrder = db.prepare(`
  UPDATE orders 
  SET paymentStatus = @paymentStatus, transactionId = @transactionId, updatedAt = CURRENT_TIMESTAMP
  WHERE systemOrderId = @systemOrderId
`);

const updateOrderStatus = db.prepare(`
  UPDATE orders 
  SET paymentStatus = @paymentStatus, updatedAt = CURRENT_TIMESTAMP
  WHERE systemOrderId = @systemOrderId
`);

// --- API Endpoints ---
app.post('/api/orders/create', async (req, res) => {
  try {
    const { productName, amount, customerName, paymentMethod } = req.body;
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

    const orderData = {
      systemOrderId,
      gatewayOrderId: razorpayOrder ? razorpayOrder.id : null,
      customerName,
      productName,
      amount,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'success' : 'pending',
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
      isMatch = true; // Automatically pass verification in demo mode
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

app.post('/api/orders/update-status', (req, res) => {
  try {
    const { orderId, status } = req.body;
    updateOrderStatus.run({ paymentStatus: status, systemOrderId: orderId });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/stats', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders').all();
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
