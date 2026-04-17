import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// We only keep the latest location for the current active tracking session
// but we can index by timestamp if we want history later
locationSchema.index({ userId: 1, timestamp: -1 });

const Location = mongoose.model('Location', locationSchema);

export default Location;
