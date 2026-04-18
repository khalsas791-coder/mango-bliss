/**
 * locationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional-grade browser Geolocation utility for Mango Bliss.
 *
 * Features
 *  • Permission state inspection (granted / denied / prompt)
 *  • Single high-accuracy fix with graceful fallback
 *  • Continuous watch with configurable callbacks
 *  • Quality classification (excellent / good / fair / poor)
 *  • Reverse geocoding via Nominatim (no API key required)
 *  • POST to /api/location/update with full payload
 *  • Rate-limit guard — one POST per 5 s max
 */

export type LocationQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  quality: LocationQuality;
  timestamp: number;
}

export interface ReverseGeoAddress {
  raw: string;
  street: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function classifyAccuracy(accuracy: number | null): LocationQuality {
  if (accuracy == null) return 'unknown';
  if (accuracy <= 10)   return 'excellent';
  if (accuracy <= 30)   return 'good';
  if (accuracy <= 100)  return 'fair';
  return 'poor';
}

function coordinatesToFix(pos: GeolocationPosition): GeoFix {
  const c = pos.coords;
  return {
    latitude:         c.latitude,
    longitude:        c.longitude,
    accuracy:         c.accuracy        ?? null,
    altitude:         c.altitude        ?? null,
    altitudeAccuracy: c.altitudeAccuracy ?? null,
    heading:          c.heading         ?? null,
    speed:            c.speed           ?? null,
    quality:          classifyAccuracy(c.accuracy ?? null),
    timestamp:        pos.timestamp
  };
}

// ── Permission API ─────────────────────────────────────────────────────────────

/** Returns 'granted' | 'denied' | 'prompt' | 'unsupported' */
export async function getPermissionState(): Promise<PermissionState | 'unsupported'> {
  if (!navigator?.permissions) return 'unsupported';
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'unsupported';
  }
}

// ── Single-shot Fix ────────────────────────────────────────────────────────────

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0
};

const NETWORK_FALLBACK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 6_000,
  maximumAge: 30_000
};

/**
 * Attempts to get a GPS fix. Tries high-accuracy first; falls back to
 * network location if denied or timed out. Returns null only when
 * geolocation is completely unavailable.
 */
export async function getCurrentFix(): Promise<GeoFix | null> {
  if (!navigator?.geolocation) return null;

  const getPos = (opts: PositionOptions): Promise<GeolocationPosition> =>
    new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opts));

  // Try high-accuracy first
  try {
    const pos = await getPos(HIGH_ACCURACY_OPTIONS);
    return coordinatesToFix(pos);
  } catch {
    // Fall back to network location
    try {
      const pos = await getPos(NETWORK_FALLBACK_OPTIONS);
      return { ...coordinatesToFix(pos), quality: 'fair' };
    } catch {
      return null;
    }
  }
}

// ── Watch Mode ─────────────────────────────────────────────────────────────────

type WatchCallback = (fix: GeoFix) => void;
type WatchErrorCallback = (err: GeolocationPositionError) => void;

let watchId: number | null = null;

export function startWatching(onFix: WatchCallback, onError?: WatchErrorCallback): void {
  if (!navigator?.geolocation) {
    onError?.({ code: 2, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any);
    return;
  }
  if (watchId !== null) stopWatching();

  watchId = navigator.geolocation.watchPosition(
    (pos) => onFix(coordinatesToFix(pos)),
    (err) => onError?.(err),
    HIGH_ACCURACY_OPTIONS
  );
}

export function stopWatching(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// ── Reverse Geocoding ─────────────────────────────────────────────────────────

/** Uses OpenStreetMap Nominatim — free, no API key. Rate-limit: 1 req/s. */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeoAddress | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'MangoBlissApp/1.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    return {
      raw:        data.display_name ?? '',
      street:     a.road ?? a.pedestrian ?? a.footway ?? null,
      district:   a.suburb ?? a.neighbourhood ?? a.quarter ?? null,
      city:       a.city ?? a.town ?? a.village ?? null,
      state:      a.state ?? null,
      country:    a.country ?? null,
      postalCode: a.postcode ?? null
    };
  } catch {
    return null;
  }
}

// ── POST to Server ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? '';

let lastPostTime = 0;
const MIN_POST_INTERVAL_MS = 5_000; // max 1 update per 5 s

interface LocationUpdatePayload {
  userId:   string;
  userName: string;
  orderId:  string;
  fix:      GeoFix;
  address?: ReverseGeoAddress | null;
}

/**
 * Posts the user's location to /api/location/update.
 * Automatically rate-limits to 1 call per 5 seconds.
 * Returns the server response, or null if rate-limited/failed.
 */
export async function postLocationUpdate(payload: LocationUpdatePayload): Promise<any | null> {
  const now = Date.now();
  if (now - lastPostTime < MIN_POST_INTERVAL_MS) return null;
  lastPostTime = now;

  const { userId, userName, orderId, fix, address } = payload;

  try {
    const res = await fetch(`${API_BASE}/api/location/update`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userName,
        orderId,
        latitude:         fix.latitude,
        longitude:        fix.longitude,
        accuracy:         fix.accuracy,
        altitude:         fix.altitude,
        altitudeAccuracy: fix.altitudeAccuracy,
        heading:          fix.heading,
        speed:            fix.speed,
        quality:          fix.quality,
        address:          address ?? null,
        source:           fix.accuracy != null && fix.accuracy <= 20 ? 'gps' : 'network',
        deviceInfo: {
          userAgent: navigator.userAgent.substring(0, 200),
          platform:  navigator.platform
        }
      })
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// ── Combined One-Liner ─────────────────────────────────────────────────────────

/**
 * Full pipeline:
 *   1. Get GPS fix
 *   2. Reverse-geocode it
 *   3. POST to server
 *   4. Return { fix, address }
 */
export async function captureAndPost(
  userId: string,
  userName: string,
  orderId: string
): Promise<{ fix: GeoFix; address: ReverseGeoAddress | null } | null> {
  const fix = await getCurrentFix();
  if (!fix) return null;

  // Run geocoding in parallel with the server POST (don't block)
  const [address] = await Promise.all([
    reverseGeocode(fix.latitude, fix.longitude)
  ]);

  await postLocationUpdate({ userId, userName, orderId, fix, address });
  return { fix, address };
}

// ── Quality Badge Helpers ─────────────────────────────────────────────────────

export const QUALITY_CONFIG: Record<LocationQuality, { label: string; color: string; emoji: string }> = {
  excellent: { label: 'Excellent GPS',  color: '#10b981', emoji: '📡' },
  good:      { label: 'Good GPS',       color: '#22c55e', emoji: '📶' },
  fair:      { label: 'Network-based',  color: '#f59e0b', emoji: '🌐' },
  poor:      { label: 'Low Accuracy',   color: '#ef4444', emoji: '⚠️' },
  unknown:   { label: 'No GPS Signal',  color: '#6b7280', emoji: '❓' }
};
