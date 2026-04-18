import mongoose from 'mongoose';

/**
 * Professional-grade Location Schema
 *
 * Stores the full geolocation context for each user/order ping:
 * coordinates, accuracy, altitude, heading, speed, reverse-geocoded address,
 * device context, and automatic expiry.
 */
const locationSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      default: 'Guest',
      trim: true
    },
    orderId: {
      type: String,
      required: true,
      index: true
    },

    // ── Core Coordinates ────────────────────────────────────────
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },

    // ── Accuracy & Motion ───────────────────────────────────────
    accuracy: {
      // Horizontal accuracy radius in metres (from GeolocationCoordinates)
      type: Number,
      default: null
    },
    altitude: {
      // Metres above sea level; null if device cannot provide it
      type: Number,
      default: null
    },
    altitudeAccuracy: {
      type: Number,
      default: null
    },
    heading: {
      // Degrees clockwise from true north (0–360); null if stationary
      type: Number,
      default: null
    },
    speed: {
      // Metres per second; null if unavailable
      type: Number,
      default: null
    },

    // ── Reverse-Geocoded Address ─────────────────────────────────
    address: {
      raw: { type: String, default: null },       // Full formatted string
      street: { type: String, default: null },
      district: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: null },
      postalCode: { type: String, default: null }
    },

    // ── Geohash (for proximity queries) ─────────────────────────
    geohash: {
      type: String,
      default: null,
      index: true
    },

    // ── GeoJSON Point (for $near queries) ───────────────────────
    geoPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined
      }
    },

    // ── Source & Quality ────────────────────────────────────────
    source: {
      // How the fix was obtained
      type: String,
      enum: ['gps', 'network', 'passive', 'fused', 'manual', 'fallback'],
      default: 'gps'
    },
    quality: {
      // Derived quality label based on accuracy radius
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'unknown'],
      default: 'unknown'
    },

    // ── Device / Client Context ──────────────────────────────────
    deviceInfo: {
      userAgent: { type: String, default: null },
      platform:  { type: String, default: null }
    },
    ipAddress: {
      type: String,
      default: null
    },

    // ── Timestamp ───────────────────────────────────────────────
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },

    // ── Auto-Expiry (TTL) ────────────────────────────────────────
    // Raw location pings are automatically deleted from MongoDB after 30 days.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  },
  {
    versionKey: false
  }
);

// ── Compound Indexes ─────────────────────────────────────────────
locationSchema.index({ userId: 1, timestamp: -1 });
locationSchema.index({ orderId: 1, timestamp: -1 });

// ── Geospatial Index (for $near / $geoWithin queries) ────────────
locationSchema.index({ geoPoint: '2dsphere' });

// ── TTL Index — documents expire 30 days after creation ─────────
locationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Pre-save: derive quality label & geoPoint ────────────────────
locationSchema.pre('save', function (next) {
  // Set GeoJSON point for 2dsphere queries
  if (this.latitude != null && this.longitude != null) {
    this.geoPoint = { type: 'Point', coordinates: [this.longitude, this.latitude] };
  }

  // Derive quality from accuracy radius
  if (this.accuracy == null) {
    this.quality = 'unknown';
  } else if (this.accuracy <= 10) {
    this.quality = 'excellent';
  } else if (this.accuracy <= 30) {
    this.quality = 'good';
  } else if (this.accuracy <= 100) {
    this.quality = 'fair';
  } else {
    this.quality = 'poor';
  }

  next();
});

const Location = mongoose.model('Location', locationSchema);

export default Location;
