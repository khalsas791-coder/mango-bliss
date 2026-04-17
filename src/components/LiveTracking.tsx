import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  LocateFixed
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io, Socket } from 'socket.io-client';

interface LiveTrackingProps {
  onClose: () => void;
  orderId: string;
}

import { API_URL, SOCKET_URL } from '../config';

// Premium SVG Icons for Map
const createScooterIcon = () => L.divIcon({
  className: 'custom-scooter-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-12 h-12 bg-rose-500/20 rounded-full animate-pulse-ring"></div>
      <div class="relative w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

const createStoreIcon = () => L.divIcon({
  className: 'custom-store-icon',
  html: `
    <div class="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-white shadow-lg transform rotate-45">
      <div class="transform -rotate-45">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const createUserIcon = () => L.divIcon({
  className: 'custom-user-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-10 h-10 bg-emerald-500/30 rounded-full animate-ping"></div>
      <div class="relative w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-xl"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const lastCenter = useRef(center);
  
  useEffect(() => {
    // Only fly if the distance is significant, otherwise just pan slightly
    const dist = Math.sqrt(Math.pow(center[0]-lastCenter.current[0], 2) + Math.pow(center[1]-lastCenter.current[1], 2));
    if (dist > 0.005) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 2 });
    } else {
      map.panTo(center, { animate: true, duration: 1 });
    }
    lastCenter.current = center;
  }, [center, map]);
  
  return null;
}

// Driver Profile Mock Data
const MOCK_DRIVER = {
  name: "Amit Kumar",
  rating: 4.9,
  trips: "1,200+",
  phone: "+91 98765 43210",
  photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit",
  vehicle: "Hero Electric Optima"
};

export function LiveTracking({ onClose, orderId }: LiveTrackingProps) {
  const [stage, setStage] = useState(0); 
  const [timeLeft, setTimeLeft] = useState(25);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTrackingUser, setIsTrackingUser] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  
  // Real Target Pos from server
  const [targetPos, setTargetPos] = useState<[number, number]>([17.9254, 77.5187]);
  // Interpolated Pos for smooth movement
  const [interpPos, setInterpPos] = useState<[number, number]>([17.9254, 77.5187]);
  
  const [userPos, setUserPos] = useState<[number, number]>([17.9254, 77.5187]);
  const storePos: [number, number] = useMemo(() => [17.9254, 77.5187], []);

  const prevStageRef = useRef(0);
  const rafRef = useRef<number>(0);

  const phaseMap: Record<string, number> = {
    'cod_placed': 0,
    'preparing': 1,
    'shipped': 2,
    'out_for_delivery': 3,
    'delivered': 4
  };

  // Geolocation Tracking Logic
  const toggleTracking = () => {
    if (isTrackingUser) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setIsTrackingUser(false);
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsTrackingUser(true);
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserPos([latitude, longitude]);
        
        // Update DB
        try {
          await fetch(`${API_URL}/location/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: localStorage.getItem('userId') || 'guest',
              orderId: orderId,
              latitude,
              longitude
            })
          });
        } catch (err) {
          console.error("Location update failed", err);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        setIsTrackingUser(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Distance Calculation (Haversine)
  useEffect(() => {
    const R = 6371e3; // metres
    const φ1 = interpPos[0] * Math.PI/180;
    const φ2 = userPos[0] * Math.PI/180;
    const Δφ = (userPos[0]-interpPos[0]) * Math.PI/180;
    const Δλ = (userPos[1]-interpPos[1]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    setDistance(Math.round(d));
  }, [interpPos, userPos]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  // Interpolation logic
  useEffect(() => {
    const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
    
    let lastUpdate = performance.now();
    
    const update = () => {
      const now = performance.now();
      const dt = (now - lastUpdate) / 1000;
      lastUpdate = now;

      setInterpPos(prev => {
        // Slow interpolation factor (0.1 means 10% towards target every frame, but we scale by dt)
        const factor = 1.2 * dt; 
        const lat = lerp(prev[0], targetPos[0], Math.min(factor, 1));
        const lng = lerp(prev[1], targetPos[1], Math.min(factor, 1));
        return [lat, lng];
      });

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetPos]);

  useEffect(() => {
    // Initial fetch
    fetch(`${API_URL}/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
         if (data.success && data.order) {
           setUserPos([data.order.userLat, data.order.userLng]);
           setTargetPos([data.order.deliveryLat, data.order.deliveryLng]);
           setInterpPos([data.order.deliveryLat, data.order.deliveryLng]);
           setStage(phaseMap[data.order.statusPhase] ?? 0);
           setTimeLeft(data.order.etaMinutes ?? 25);
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

    return () => {
      newSocket.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    if (stage > prevStageRef.current && stage > 0) {
       const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
       audio.play().catch(() => {});
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[500] bg-white flex flex-col md:flex-row overflow-hidden"
    >
      {/* Header Overlay (Mobile Only) */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="flex gap-3 items-center">
           <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white">
             <Zap size={20} fill="currentColor" />
           </div>
           <div>
             <h3 className="font-black text-slate-900 leading-none">Mango Bliss</h3>
             <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">Live Tracking</p>
           </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
          <X size={20} />
        </button>
      </div>

      {/* Map Section */}
      <div className="flex-1 relative z-0 bg-slate-100">
        <MapContainer 
          center={interpPos} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
           <TileLayer
             url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
           />
           <MapUpdater center={interpPos} />

           <Marker position={storePos} icon={createStoreIcon()} />
           <Marker position={userPos} icon={createUserIcon()} />
           <Marker position={interpPos} icon={createScooterIcon()} />
           
           <Polyline 
             positions={[interpPos, userPos]} 
             pathOptions={{ 
               color: '#e11d48', 
               weight: 4, 
               dashArray: '1, 12', 
               lineCap: 'round',
               opacity: 0.4
             }} 
           />
        </MapContainer>

        {/* Floating Call Assistance Card (Desktop) */}
        <div className="hidden md:block absolute bottom-10 left-10 z-50">
           <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white animate-bounce">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Safe Delivery</p>
                <p className="font-black text-slate-900">Partner is vaccinated</p>
              </div>
           </div>
        </div>
      </div>

      {/* Control Panel (Zomato Style) */}
      <div className="w-full md:w-[450px] bg-white h-auto md:h-full flex flex-col relative z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] md:rounded-l-[3rem] md:rounded-tr-none -mt-10 md:mt-0 pt-10 md:pt-12 px-8 pb-10">
        
        {/* Close Button Desktop */}
        <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 w-10 h-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>

        <div className="flex justify-between items-start mb-8">
           <div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
               {timeLeft === 0 ? "Arrived!" : `${timeLeft} mins`}
             </h2>
             <p className="text-slate-400 font-bold flex items-center gap-2 mt-1">
               <Clock size={16} className="text-rose-500" />
               Estimated Arrival Time
             </p>
           </div>
           <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center">
              <Truck size={32} className="text-rose-600" />
           </div>
        </div>

        {/* Live Tracking Toggle */}
        <div className="mb-8">
           <button 
             onClick={toggleTracking}
             className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
               isTrackingUser 
               ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
               : 'bg-slate-900 text-white'
             }`}
           >
             {isTrackingUser ? <LocateFixed size={20} /> : <Navigation size={20} />}
             {isTrackingUser ? 'Live Tracking Active' : 'Enable Live Tracking'}
           </button>
           {isTrackingUser && (
             <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest text-center mt-2 flex items-center justify-center gap-1">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               Sharing your location for accurate delivery
             </p>
           )}
        </div>

        {distance !== null && (
          <div className="bg-rose-50 p-6 rounded-[2rem] mb-6 flex justify-between items-center border border-rose-100/50">
             <div>
               <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Live Distance</p>
               <h4 className="text-2xl font-black text-rose-600">
                 {distance > 1000 ? `${(distance/1000).toFixed(1)} km` : `${distance} m`}
               </h4>
             </div>
             <div className="text-rose-200">
                <Truck size={40} />
             </div>
          </div>
        )}

        {/* Progress Timeline */}
        <div className="bg-slate-50 p-6 rounded-[2rem] mb-8 relative overflow-hidden">
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
                       'bg-white text-slate-300'}`}
                   >
                     <Icon size={18} />
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-rose-600' : 'text-slate-400'}`}>
                     {step.title}
                   </span>
                </div>
              );
            })}
          </div>
          {/* Progress Line BG */}
          <div className="absolute top-[44px] left-[40px] right-[40px] h-1 bg-slate-200 rounded-full z-0"></div>
          {/* Progress Line Active */}
          <motion.div 
            className="absolute top-[44px] left-[40px] h-1 bg-emerald-500 rounded-full z-0"
            initial={{ width: 0 }}
            animate={{ width: `calc(${progressPercentage}% - 20px)` }}
          />
        </div>

        {/* Driver Assigned Card */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 mb-6 hover:border-rose-100 transition-colors group">
           <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <img src={MOCK_DRIVER.photo} alt="Driver" className="w-16 h-16 rounded-2xl bg-slate-100 shadow-sm" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                  <ShieldCheck size={10} className="text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-lg uppercase">{MOCK_DRIVER.name}</h4>
                  <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-black">{MOCK_DRIVER.rating}</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {MOCK_DRIVER.trips} Deliveries • {MOCK_DRIVER.vehicle}
                </p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:scale-[1.02] transition-transform">
                <Phone size={18} />
                CALL
              </button>
              <button className="flex items-center justify-center gap-2 bg-slate-50 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all">
                <MessageSquare size={18} />
                CHAT
              </button>
           </div>
        </div>

        {/* Assistance / Safety Info */}
        <div className="flex gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 items-center">
           <div className="text-emerald-500"><Zap size={20} fill="currentColor" /></div>
           <p className="text-xs font-bold text-emerald-800 leading-snug">
             Amit is 100% vaccinated and following all safety protocols for a clean delivery.
           </p>
        </div>

        {stage === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10"
          >
             <button
               onClick={onClose}
               className="w-full bg-[#e11d48] text-white py-5 rounded-2xl font-black text-xl shadow-2xl hover:scale-[1.02] transition-transform"
             >
               ORDER RECEIVED
             </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
