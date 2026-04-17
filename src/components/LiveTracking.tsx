import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Package, Truck, Home, MapPin, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io, Socket } from 'socket.io-client';

interface LiveTrackingProps {
  onClose: () => void;
  orderId: string;
}

const API_URL = 'http://localhost:5000';

// Custom Map Icons
const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2983/2983067.png', // Scooter icon
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const startIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png', // Shop icon
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export function LiveTracking({ onClose, orderId }: LiveTrackingProps) {
  const [stage, setStage] = useState(0); 
  const [timeLeft, setTimeLeft] = useState(25);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [deliveryPos, setDeliveryPos] = useState<[number, number]>([17.9254, 77.5187]);
  const [userPos, setUserPos] = useState<[number, number]>([17.9254, 77.5187]);
  const storePos: [number, number] = [17.9254, 77.5187];

  const prevStageRef = useRef(0);

  const phaseMap: Record<string, number> = {
    'cod_placed': 0,
    'preparing': 1,
    'shipped': 2,
    'out_for_delivery': 3,
    'delivered': 4
  };

  useEffect(() => {
    // Determine User Pos from order details initially
    fetch(`${API_URL}/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
         if (data.success && data.order) {
           setUserPos([data.order.userLat, data.order.userLng]);
           setDeliveryPos([data.order.deliveryLat, data.order.deliveryLng]);
           setStage(phaseMap[data.order.statusPhase] ?? 0);
           setTimeLeft(data.order.etaMinutes ?? 25);
         }
      })
      .catch(console.error);

    // Initialize Socket
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('joinOrderRoom', orderId);
    });

    newSocket.on('locationUpdate', (data: any) => {
      setDeliveryPos([data.deliveryLat, data.deliveryLng]);
      
      const newStage = phaseMap[data.statusPhase] ?? 0;
      setStage(newStage);
      setTimeLeft(data.etaMinutes);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [orderId]);

  useEffect(() => {
    // Sound logic
    if (stage > prevStageRef.current && stage > 0) {
       const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
       audio.play().catch(() => {});
    }
    prevStageRef.current = stage;
  }, [stage]);

  const steps = [
    { title: 'Order Confirmed', icon: CheckCircle2 },
    { title: 'Preparing Product', icon: Package },
    { title: 'Shipped (Packed)', icon: MapPin },
    { title: 'Out for Delivery', icon: Truck },
    { title: 'Delivered', icon: Home }
  ];

  const progressPercentage = (stage / (steps.length - 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[500] bg-slate-50 flex flex-col md:flex-row"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-[600] w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-xl text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <X size={24} />
      </button>

      {/* Map Section */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-full relative overflow-hidden z-0 bg-slate-800">
        <MapContainer 
          center={deliveryPos} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
           <TileLayer
             url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
           />
           <MapUpdater center={deliveryPos} />

           <Marker position={storePos} icon={startIcon} />
           <Marker position={userPos} icon={createCustomIcon('#10b981')} /> {/* Green dot for User */}
           <Marker position={deliveryPos} icon={deliveryIcon} />
           
           {/* Visual Route Guideline from Delivery to User */}
           <Polyline positions={[deliveryPos, userPos]} pathOptions={{ color: '#e11d48', weight: 4, dashArray: '10, 10' }} />
        </MapContainer>
      </div>

      {/* Tracking Details Overlay */}
      <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto bg-white flex flex-col h-full rounded-t-[3rem] md:rounded-l-[3rem] -mt-8 md:mt-0 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] md:shadow-none">
        
        <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-full w-max text-xs font-black uppercase tracking-widest mb-6">
          LIVE TRACKING
        </div>

        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Order {orderId}</h2>
        <div className="flex items-center gap-2 text-slate-500 font-bold mb-8">
          <Clock size={16} />
          {stage === 4 ? <span className="text-emerald-500">Delivered Successfully</span> : <span>ETA: {timeLeft} Minutes</span>}
        </div>

        {/* Timeline */}
        <div className="relative pl-6 flex-1 mt-6">
          {/* Connecting Line background */}
          <div className="absolute left-[31px] top-6 bottom-10 w-1 bg-slate-100 rounded-full"></div>
          {/* Connecting Line active fill */}
          <motion.div 
            className="absolute left-[31px] top-6 w-1 bg-emerald-500 rounded-full"
            initial={{ height: 0 }}
            animate={{ height: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />

          <div className="space-y-10">
            {steps.map((step, idx) => {
              const isActive = idx === stage;
              const isCompleted = idx < stage;
              const isPending = idx > stage;
              const Icon = step.icon;

              return (
                <div key={idx} className="relative flex items-center gap-6">
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors duration-500
                    ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 
                      isActive ? 'bg-white border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 
                      'bg-slate-100 border-slate-100 text-slate-400'}`}
                  >
                    <Icon size={18} />
                  </div>
                  
                  <div className={`flex-1 transition-all duration-500 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                    <h3 className={`text-lg font-black uppercase ${isActive ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {step.title}
                    </h3>
                  </div>

                  {isActive && (
                    <motion.div 
                      layoutId="pulsingDot"
                      className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {stage === 4 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClose}
            className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform"
          >
            BACK TO HOME
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
