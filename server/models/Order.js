import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  systemOrderId: {
    type: String,
    required: true,
    unique: true
  },
  gatewayOrderId: {
    type: String,
    default: null
  },
  customerName: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi', 'netbanking'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cod_placed', 'paid'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    default: null
  },
  userLat: {
    type: Number,
    required: true
  },
  userLng: {
    type: Number,
    required: true
  },
  deliveryLat: {
    type: Number,
    required: true
  },
  deliveryLng: {
    type: Number,
    required: true
  },
  statusPhase: {
    type: String,
    enum: ['awaiting_payment', 'preparing', 'shipped', 'out_for_delivery', 'delivered'],
    default: 'preparing'
  },
  etaMinutes: {
    type: Number,
    default: 25
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save (async form required for Mongoose v9+)
orderSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
