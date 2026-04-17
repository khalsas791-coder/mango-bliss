import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Package, Truck, Home, MapPin, Clock } from 'lucide-react';

interface LiveTrackingProps {
  onClose: () => void;
  orderId: string;
}

export function LiveTracking({ onClose, orderId }: LiveTrackingProps) {
  const [stage, setStage] = useState(0); // 0 to 4
  const [timeLeft, setTimeLeft] = useState(15);
  
  useEffect(() => {
    // 0 sec -> Confirmed (0)
    // 5 sec -> Preparing (1)
    // 10 sec -> Packed (2)
    // 15 sec -> Delivery (3)
    // 20 sec -> Delivered (4)
    const timers = [
      setTimeout(() => setStage(1), 5000),
      setTimeout(() => setStage(2), 10000),
      setTimeout(() => setStage(3), 15000),
      setTimeout(() => setStage(4), 20000),
    ];
    
    // Countdown timer for ETA
    const countInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1; // Decrease every 1.5 seconds approx to map 20s to 15 mins?
        // Let's just decrease realistically for the demo
      });
    }, 1333); // 20s / 15 = 1.33s per minute

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(countInterval);
    };
  }, []);

  const steps = [
    { title: 'Order Confirmed', icon: CheckCircle2, time: '12:00 PM' },
    { title: 'Preparing Product', icon: Package, time: '12:05 PM' },
    { title: 'Packed', icon: MapPin, time: '12:10 PM' },
    { title: 'Out for Delivery', icon: Truck, time: '12:15 PM' },
    { title: 'Delivered', icon: Home, time: '12:20 PM' }
  ];

  const progressPercentage = (stage / (steps.length - 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[500] bg-slate-50 flex flex-col md:flex-row"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <X size={24} />
      </button>

      {/* Map Demo Section */}
      <div className="w-full md:w-1/2 h-64 md:h-full bg-slate-200 relative overflow-hidden flex items-center justify-center">
        {/* Fake Map Background */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="absolute w-[150%] h-[150%] rounded-full border-4 border-slate-300 opacty-20 animate-pulse"></div>
        <div className="absolute w-[100%] h-[100%] rounded-full border-4 border-slate-300 opacty-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Animated Route Line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
           <path d="M 20 80 Q 50 20 80 20" fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
           <motion.path 
             d="M 20 80 Q 50 20 80 20" 
             fill="none" 
             stroke="#e11d48" 
             strokeWidth="4" 
             initial={{ pathLength: 0 }}
             animate={{ pathLength: progressPercentage / 100 }}
             transition={{ duration: 0.5 }}
           />
        </svg>

        {/* Start Point */}
        <div className="absolute bottom-[20%] left-[20%] w-6 h-6 bg-slate-900 rounded-full border-4 border-white shadow-lg z-10"></div>
        {/* Destination Pin */}
        <div className="absolute top-[20%] right-[20%] text-[#e11d48] z-10">
          <MapPin size={40} fill="white" />
        </div>

        {/* Scooter Icon moving along path (approximate visual) */}
        <motion.div 
          className="absolute z-20 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl text-rose-600"
          initial={{ left: '20%', top: '80%' }}
          animate={{ 
            left: `${20 + (60 * progressPercentage/100)}%`, 
            top: `${80 - (60 * progressPercentage/100)}%` 
          }}
          transition={{ duration: 0.5 }}
        >
          <Truck size={24} />
        </motion.div>
      </div>

      {/* Tracking Details */}
      <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto bg-white flex flex-col h-full rounded-t-[3rem] md:rounded-l-[3rem] -mt-8 md:mt-0 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] md:shadow-none">
        
        <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-full w-max text-xs font-black uppercase tracking-widest mb-6">
          LIVE TRACKING
        </div>

        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Order {orderId}</h2>
        <div className="flex items-center gap-2 text-slate-500 font-bold mb-8">
          <Clock size={16} />
          {stage === 4 ? <span>Delivered Successfully</span> : <span>ETA: {timeLeft} Minutes</span>}
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
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{step.time}</p>
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
