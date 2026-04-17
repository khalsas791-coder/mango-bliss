import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Package,
  Truck,
  Home,
  MapPin,
  Clock,
  Phone,
  Star,
  MessageSquare,
  ShieldCheck,
  Zap,
  Navigation,
  LocateFixed,
  Moon,
  Sun,
  Bell,
  AlertCircle,
  StopCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io, Socket } from 'socket.io-client';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { API_URL, SOCKET_URL } from '../config';

interface LiveTrackingProps {
  onClose: () => void;
  orderId: string;
}

// ─────────────────────────── Map Icons ───────────────────────────

const createScooterIcon = () => L.divIcon({
  className: 'custom-scooter-icon',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:52px;height:52px;background:rgba(225,29,72,0.18);border-radius:50%;animation:pulseRing 1.5s ease-out infinite;"></div>
      <div style="position:relative;width:42px;height:42px;background:#e11d48;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 20px rgba(225,29,72,0.5);">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [52, 52],
  iconAnchor: [26, 26]
});

const createStoreIcon = () => L.divIcon({
  className: 'custom-store-icon',
  html: `
    <div style="width:42px;height:42px;background:#0f172a;border-radius:14px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 16px rgba(0,0,0,0.3);transform:rotate(45deg)">
      <div style="transform:rotate(-45deg)">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21]
});

const createUserIcon = () => L.divIcon({
  className: 'custom-user-icon',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;background:rgba(16,185,129,0.25);border-radius:50%;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:22px;height:22px;background:#10b981;border-radius:50%;border:3px solid white;box-shadow:0 3px 14px rgba(16,185,129,0.6);"></div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

// ─────────────────────────── Map Updater ───────────────────────────

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const lastCenter = useRef(center);

  useEffect(() => {
    const dist = Math.sqrt(
      Math.pow(center[0] - lastCenter.current[0], 2) +
      Math.pow(center[1] - lastCenter.current[1], 2)
    );
    if (dist > 0.005) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 2 });
    } else {
      map.panTo(center, { animate: true, duration: 1 });
    }
    lastCenter.current = center;
  }, [center, map]);

  return null;
}

// ─────────────────────────── Toast ───────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
}

// ─────────────────────────── Driver Mock ───────────────────────────

const MOCK_DRIVER = {
  name: 'Amit Kumar',
  rating: 4.9,
  trips: '1,200+',
  phone: '+91 98765 43210',
  photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit',
  vehicle: 'Hero Electric Optima'
};

const GNDECB_POS: [number, number] = [17.9254, 77.5187];

// ─────────────────────────── Main Component ───────────────────────────

export function LiveTracking({ onClose, orderId }: LiveTrackingProps) {
  const [stage, setStage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTrackingUser, setIsTrackingUser] = useState(true);
  const [distance, setDistance] = useState<number | null>(null);
  const [roadDistance, setRoadDistance] = useState<number | null>(null);
  const [roadEta, setRoadEta] = useState<number | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [driverDistance, setDriverDistance] = useState<number | null>(null);
  const toastIdRef = useRef(0);
  const watchId = useRef<number | null>(null);
  const hasSyncedRef = useRef(false);
  const { user } = useAuthStore();

  // Delivery scooter positions
  const [targetPos, setTargetPos] = useState<[number, number]>(GNDECB_POS);
  const [interpPos, setInterpPos] = useState<[number, number]>(GNDECB_POS);

  // User's actual GPS position
  const [userPos, setUserPos] = useState<[number, number]>(GNDECB_POS);

  const prevStageRef = useRef(0);
  const rafRef = useRef<number>(0);
  const routeFetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseMap: Record<string, number> = {
    cod_placed: 0,
    preparing: 1,
    shipped: 2,
    out_for_delivery: 3,
    delivered: 4
  };

  // ── Toast helpers ──
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Route fetching from OSRM ──
  const fetchRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    try {
      const res = await fetch(
        `${API_URL}/directions?startLat=${start[0]}&startLng=${start[1]}&endLat=${end[0]}&endLng=${end[1]}`
      );
      const data = await res.json();
      if (data.success && data.geometry) {
        setRouteGeometry(data.geometry);
        setRoadDistance(data.distance_m);
        setRoadEta(Math.ceil(data.duration_s / 60));
      }
    } catch {
      // Fallback to straight line if OSRM unreachable
      setRouteGeometry([start, end]);
    }
  }, []);

  // ── Geolocation Tracking ──

  const startTracking = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    setIsTrackingUser(true);
    addToast('📍 Location tracking started!', 'success');

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newPos: [number, number] = [latitude, longitude];
        setUserPos(newPos);

        // Debounce route fetches (don't spam on every GPS jitter)
        if (routeFetchTimeout.current) clearTimeout(routeFetchTimeout.current);
        routeFetchTimeout.current = setTimeout(() => {
          fetchRoute(GNDECB_POS, newPos);
        }, 2000);

        // Save to DB
        try {
          await fetch(`${API_URL}/location/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: localStorage.getItem('userId') || 'guest',
              userName: user?.name || 'Guest User',
              orderId,
              latitude,
              longitude
            })
          });
          
          if (!hasSyncedRef.current) {
            addToast('📡 Location synced to server seamlessly', 'info');
            hasSyncedRef.current = true;
          }
        } catch {
          // silent fail
        }
      },
      (error) => {
        console.error('Geolocation error', error);
        setIsTrackingUser(false);
        addToast('⚠️ Could not get location. Check browser permissions.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTrackingUser(false);
    addToast('🛑 Location sharing stopped.', 'info');
  };

  // ── Haversine distance: driver ↔ user ──
  useEffect(() => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const φ1 = toRad(interpPos[0]);
    const φ2 = toRad(userPos[0]);
    const Δφ = toRad(userPos[0] - interpPos[0]);
    const Δλ = toRad(userPos[1] - interpPos[1]);
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    setDriverDistance(Math.round(R * c));
  }, [interpPos, userPos]);

  // ── Straight-line distance (user to store) ──
  useEffect(() => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const φ1 = toRad(GNDECB_POS[0]);
    const φ2 = toRad(userPos[0]);
    const Δφ = toRad(userPos[0] - GNDECB_POS[0]);
    const Δλ = toRad(userPos[1] - GNDECB_POS[1]);
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    setDistance(Math.round(R * c));
  }, [userPos]);

  // ── Cleanup watchPosition on unmount ──
  useEffect(() => {
    startTracking(); // Automatically start tracking on mount
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (routeFetchTimeout.current) clearTimeout(routeFetchTimeout.current);
    };
  }, []);

  // ── Smooth interpolation (LERP) ──
  useEffect(() => {
    const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
    let lastUpdate = performance.now();

    const update = () => {
      const now = performance.now();
      const dt = (now - lastUpdate) / 1000;
      lastUpdate = now;

      setInterpPos(prev => {
        const factor = Math.min(1.2 * dt, 1);
        return [
          lerp(prev[0], targetPos[0], factor),
          lerp(prev[1], targetPos[1], factor)
        ];
      });

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetPos]);

  // ── Socket + initial data fetch ──
  useEffect(() => {
    fetch(`${API_URL}/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          const { userLat, userLng, deliveryLat, deliveryLng, statusPhase, etaMinutes } = data.order;
          if (userLat && userLng) {
            const pos: [number, number] = [userLat, userLng];
            setUserPos(pos);
            fetchRoute(GNDECB_POS, pos);
          }
          setTargetPos([deliveryLat || GNDECB_POS[0], deliveryLng || GNDECB_POS[1]]);
          setInterpPos([deliveryLat || GNDECB_POS[0], deliveryLng || GNDECB_POS[1]]);
          setStage(phaseMap[statusPhase] ?? 0);
          setTimeLeft(etaMinutes ?? 25);
        }
      })
      .catch(console.error);

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('joinOrderRoom', orderId);
    });

    newSocket.on('locationUpdate', (data: any) => {
      setTargetPos([data.deliveryLat, data.deliveryLng]);
      const newStage = phaseMap[data.statusPhase] ?? 0;
      setStage(newStage);
      setTimeLeft(data.etaMinutes);
    });

    newSocket.on('userLocationUpdate', () => {
      addToast('📍 Your location was updated on server', 'success');
    });

    return () => { newSocket.disconnect(); };
  }, [orderId]);

  // ── Stage-change sound + notification ──
  useEffect(() => {
    if (stage > prevStageRef.current && stage > 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
      const labels = ['', 'Being Prepared', 'Packed & Ready', 'On the Way!', '🎉 Delivered!'];
      addToast(`Order status: ${labels[stage]}`, 'success');
    }
    prevStageRef.current = stage;
  }, [stage]);

  const steps = [
    { title: 'Confirmed', icon: CheckCircle2 },
    { title: 'Kitchen', icon: Package },
    { title: 'Packed', icon: MapPin },
    { title: 'Delivering', icon: Truck },
    { title: 'Enjoy!', icon: Home }
  ];

  const progressPercentage = (stage / (steps.length - 1)) * 100;

  // Use Google Maps tiles for exact visual clarity
  const tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

  const formatDist = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;

  return (
    <>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[500] flex flex-col md:flex-row overflow-hidden"
        style={{ background: darkMode ? '#0f172a' : '#ffffff' }}
      >
        {/* ── Map Section ── */}
        <div className="flex-1 relative z-0" style={{ background: darkMode ? '#1e293b' : '#f1f5f9' }}>

          {/* Mobile Header */}
          <div
            className="md:hidden absolute top-0 left-0 right-0 z-50 p-5 flex justify-between items-center"
            style={{ background: darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <h3 className={`font-black leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Mango Bliss</h3>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Live Tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(d => !d)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }}
              >
                {darkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-slate-600" />}
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }}
              >
                <X size={18} className={darkMode ? 'text-white' : 'text-slate-700'} />
              </button>
            </div>
          </div>

          {/* Leaflet Map */}
          <MapContainer
            center={interpPos}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url={tileUrl} />
            <MapUpdater center={interpPos} />

            {/* GNDECB Store Marker */}
            <Marker position={GNDECB_POS} icon={createStoreIcon()}>
              <Popup>
                <div className="p-1">
                  <p className="font-black text-sm text-slate-900 uppercase">GNDECB Campus</p>
                  <p className="text-xs text-slate-500">Mango Bliss HQ</p>
                </div>
              </Popup>
            </Marker>

            {/* User Marker */}
            <Marker position={userPos} icon={createUserIcon()}>
              <Popup>
                <div className="p-1">
                  <p className="font-black text-sm text-slate-900 uppercase">Your Location</p>
                  <p className="text-xs text-slate-500">{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>

            {/* Scooter Marker */}
            <Marker position={interpPos} icon={createScooterIcon()} />

            {/* Real route line (OSRM) — green */}
            {routeGeometry.length > 1 && (
              <Polyline
                positions={routeGeometry}
                pathOptions={{
                  color: '#10b981',
                  weight: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                  opacity: 0.85
                }}
              />
            )}

            {/* Fallback dashed direct line */}
            {routeGeometry.length <= 1 && (
              <Polyline
                positions={[GNDECB_POS, userPos]}
                pathOptions={{
                  color: '#e11d48',
                  weight: 4,
                  dashArray: '1, 12',
                  lineCap: 'round',
                  opacity: 0.4
                }}
              />
            )}
          </MapContainer>

          {/* Driver Distance Overlay on Map */}
          {driverDistance !== null && stage >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-20 md:top-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div
                className="px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl backdrop-blur-md border"
                style={{
                  background: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)',
                  borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                }}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <p className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Driver is <span className="text-rose-500">{formatDist(driverDistance)}</span> away
                </p>
              </div>
            </motion.div>
          )}

          {/* Safe Delivery Card (Desktop only) */}
          <div className="hidden md:block absolute bottom-8 left-8 z-50">
            <div
              className="p-4 rounded-3xl shadow-2xl flex items-center gap-4 backdrop-blur-xl border"
              style={{
                background: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)',
                borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white animate-bounce">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Safe Delivery</p>
                <p className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Partner is vaccinated</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Control Panel ── */}
        <div
          className="w-full md:w-[460px] h-auto md:h-full flex flex-col relative z-10 overflow-y-auto"
          style={{
            background: darkMode ? '#0f172a' : '#ffffff',
            boxShadow: darkMode ? '-20px 0 60px rgba(0,0,0,0.4)' : '-20px 0 60px rgba(0,0,0,0.06)'
          }}
        >
          {/* Panel inner scroll padding */}
          <div className="px-8 pt-10 pb-8 flex flex-col gap-0 min-h-full">

            {/* ── Desktop header ── */}
            <div className="hidden md:flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white">
                  <Zap size={20} fill="currentColor" />
                </div>
                <div>
                  <h3 className={`font-black leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>Mango Bliss</h3>
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Live Tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDarkMode(d => !d)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                  title="Toggle Dark Mode"
                >
                  {darkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-slate-500" />}
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <X size={20} className={darkMode ? 'text-white' : 'text-slate-500'} />
                </button>
              </div>
            </div>

            {/* ── ETA Header ── */}
            <div className="flex justify-between items-start mb-7">
              <div>
                <h2
                  className="text-5xl font-black tracking-tight leading-tight"
                  style={{ color: darkMode ? '#ffffff' : '#0f172a' }}
                >
                  {timeLeft === 0 ? 'Arrived!' : `${timeLeft} mins`}
                </h2>
                <p className="font-bold flex items-center gap-2 mt-1.5" style={{ color: darkMode ? '#94a3b8' : '#94a3b8' }}>
                  <Clock size={15} className="text-rose-500" />
                  Estimated Arrival Time
                </p>
              </div>
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: darkMode ? 'rgba(225,29,72,0.15)' : '#fff1f2' }}
              >
                <Truck size={32} className="text-rose-600" />
              </div>
            </div>

            {/* ── Live Tracking Toggle ── */}
            <div className="mb-6">
              <div className="flex gap-3">
                <div className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
                  <LocateFixed size={20} />
                  GPS ACTIVE
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest text-center mt-2 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Sharing location for accurate delivery
              </p>
            </div>

            {/* ── Bottom Info Strip: Distance + ETA + Status ── */}
            <div
              className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-[1.5rem]"
              style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}
            >
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Road Dist</p>
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {roadDistance ? formatDist(roadDistance) : (distance ? formatDist(distance) : '—')}
                </p>
              </div>
              <div className="text-center border-x" style={{ borderColor: darkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">ETA</p>
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {roadEta ? `${roadEta} min` : `${timeLeft} min`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                <p className="text-[10px] font-black text-emerald-500 flex items-center justify-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isTrackingUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isTrackingUser ? 'LIVE' : 'IDLE'}
                </p>
              </div>
            </div>

            {/* ── Progress Timeline ── */}
            <div
              className="p-6 rounded-[2rem] mb-6 relative overflow-hidden"
              style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}
            >
              <div className="flex justify-between items-center relative z-10">
                {steps.map((step, idx) => {
                  const isActive = idx === stage;
                  const isCompleted = idx < stage;
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                        ${isCompleted ? 'bg-emerald-500 text-white' :
                          isActive ? 'bg-rose-600 text-white shadow-lg scale-110' :
                          darkMode ? 'bg-white/10 text-white/30' : 'bg-white text-slate-300'}`}
                      >
                        <Icon size={18} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-rose-500' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* BG Track */}
              <div className="absolute top-[44px] left-[40px] right-[40px] h-1 rounded-full z-0" style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }} />
              {/* Active Track */}
              <motion.div
                className="absolute top-[44px] left-[40px] h-1 bg-emerald-500 rounded-full z-0"
                initial={{ width: 0 }}
                animate={{ width: `calc(${progressPercentage}% - 20px)` }}
              />
            </div>

            {/* ── Driver Card ── */}
            <div
              className="rounded-[2.5rem] p-6 mb-6 border-2 transition-all"
              style={{
                background: darkMode ? 'rgba(255,255,255,0.04)' : '#ffffff',
                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9'
              }}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  <img
                    src={MOCK_DRIVER.photo}
                    alt="Driver"
                    className="w-16 h-16 rounded-2xl bg-slate-100"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                    <ShieldCheck size={10} className="text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-black text-lg uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {MOCK_DRIVER.name}
                    </h4>
                    <div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Star size={11} fill="currentColor" />
                      <span className="text-xs font-black">{MOCK_DRIVER.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {MOCK_DRIVER.trips} Deliveries • {MOCK_DRIVER.vehicle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`tel:${MOCK_DRIVER.phone}`}
                  className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:opacity-90 transition-opacity"
                >
                  <Phone size={18} />
                  CALL
                </a>
                <button
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all"
                  style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : '#f8fafc', color: darkMode ? '#94a3b8' : '#64748b' }}
                >
                  <MessageSquare size={18} />
                  CHAT
                </button>
              </div>
            </div>

            {/* ── Safety Info ── */}
            <div
              className="flex gap-4 p-4 rounded-2xl items-center mb-4"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <div className="text-emerald-500"><Zap size={20} fill="currentColor" /></div>
              <p className="text-xs font-bold text-emerald-400 leading-snug">
                {MOCK_DRIVER.name} is 100% vaccinated and following all safety protocols for a clean delivery.
              </p>
            </div>

            {/* ── Delivered CTA ── */}
            {stage === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <button
                  onClick={onClose}
                  className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-rose-900/30 hover:scale-[1.02] transition-transform"
                >
                  🎉 ORDER RECEIVED!
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Toast Notifications ── */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[700] flex flex-col gap-2 w-full max-w-sm px-4">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border text-sm font-bold ${
                  toast.type === 'success'
                    ? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-200'
                    : toast.type === 'warning'
                    ? 'bg-amber-900/90 border-amber-700/50 text-amber-200'
                    : 'bg-slate-900/95 border-white/10 text-slate-200'
                }`}
              >
                {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />}
                {toast.type === 'warning' && <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />}
                {toast.type === 'info' && <Bell size={16} className="text-slate-400 flex-shrink-0" />}
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
