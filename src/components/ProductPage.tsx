import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, ChevronRight, Star, Heart, Share2, Tag, Sparkles } from 'lucide-react';
import { MangoShakeModel } from './MangoShakeModel';
import { CheckoutDrawer } from './CheckoutDrawer';
import { LiveTracking } from './LiveTracking';

interface ProductPageProps {
  onClose: () => void;
  color: string;
  setColor: (color: string) => void;
  topping: 'mango' | 'pistachio' | 'chocolate';
  setTopping: (topping: 'mango' | 'pistachio' | 'chocolate') => void;
  flavors: { name: string; color: string; id: string; icon?: string }[];
  toppings: { name: string; id: string }[];
  hasCoupon: boolean;
  setHasCoupon: (val: boolean) => void;
}

type BottleId = 'matte' | 'glass' | 'gradient' | 'sport';

interface BottleDesign {
  id: BottleId;
  label: string;
  tagline: string;
}

const bottleDesigns: BottleDesign[] = [
  { id: 'matte',    label: 'Minimal Matte',       tagline: 'Sleek & Bold'    },
  { id: 'glass',    label: 'Transparent Glass',   tagline: 'Pure & Clear'    },
  { id: 'gradient', label: 'Gradient Premium',    tagline: 'Luxe & Vivid'    },
  { id: 'sport',    label: 'Sport Sipper',         tagline: 'Fast & Fierce'   },
];

/* ─── SVG Bottle Illustrations ──────────────────────────────────────── */

function MatteBottleSVG({ color = '#f59e0b' }: { color?: string }) {
  // Realistic premium minimal cylinder
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl text-transparent">
      {/* Cap */}
      <rect x="28" y="4" width="24" height="18" rx="2" fill="#1e1e2e"/>
      <rect x="28" y="22" width="24" height="4" fill="#cbd5e1"/>
      {/* Neck & Body */}
      <path d="M 28 26 C 28 34, 18 36, 18 46 L 18 140 A 10 10 0 0 0 28 150 L 52 150 A 10 10 0 0 0 62 140 L 62 46 C 62 36, 52 34, 52 26 Z" fill="#1e1e2e"/>
      {/* Matte Lighting & Sheen */}
      <path d="M 20 46 L 20 140 A 8 8 0 0 0 24 148 L 28 148 L 28 42 Z" fill="#ffffff" opacity="0.1"/>
      {/* Modern Minimal Label */}
      <rect x="18" y="75" width="44" height="35" fill="#f8fafc"/>
      <rect x="30" y="85" width="20" height="3" fill="#1e1e2e"/>
      <rect x="35" y="94" width="10" height="2" fill={color}/>
    </svg>
  );
}

function GlassBottleSVG({ color = '#fbbf24' }: { color?: string }) {
  // Realistic Premium Glass Juice Bottle
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl text-transparent">
      <defs>
        <linearGradient id="liquid" x1="16" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.85"/>
          <stop offset="50%" stopColor={color} stopOpacity="0.6"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="glassGlare" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7"/>
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0"/>
        </linearGradient>
      </defs>
      {/* Simple Silver Cap */}
      <rect x="26" y="8" width="28" height="12" rx="3" fill="#94a3b8"/>
      <rect x="25" y="20" width="30" height="4" rx="1" fill="#cbd5e1"/>
      {/* Wide Body Path */}
      <path d="M 26 24 C 26 30, 16 35, 16 50 L 16 142 A 8 8 0 0 0 24 150 L 56 150 A 8 8 0 0 0 64 142 L 64 50 C 64 35, 54 30, 54 24 Z" fill="url(#liquid)"/>
      <path d="M 26 24 C 26 30, 16 35, 16 50 L 16 142 A 8 8 0 0 0 24 150 L 56 150 A 8 8 0 0 0 64 142 L 64 50 C 64 35, 54 30, 54 24 Z" fill="url(#glassGlare)"/>
      <path d="M 26 24 C 26 30, 16 35, 16 50 L 16 142 A 8 8 0 0 0 24 150 L 56 150 A 8 8 0 0 0 64 142 L 64 50 C 64 35, 54 30, 54 24 Z" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.4"/>
      {/* Clear space at top (air in bottle) */}
      <rect x="17" y="24" width="46" height="16" fill="#ffffff" opacity="0.3"/>
      <path d="M 16 40 Q 40 45 64 40 L 64 45 L 16 45 Z" fill={color} opacity="0.9"/>
      {/* Floating bits */}
      <circle cx="30" cy="110" r="4" fill={color} filter="brightness(0.8)"/>
      <circle cx="50" cy="80" r="3" fill={color} filter="brightness(0.9)"/>
      <circle cx="42" cy="130" r="5" fill={color} filter="brightness(0.85)"/>
      {/* Small transparent label */}
      <rect x="22" y="70" width="36" height="30" rx="4" fill="#ffffff" opacity="0.2"/>
      <rect x="26" y="80" width="28" height="2" fill="#ffffff" opacity="0.9"/>
      <rect x="30" y="86" width="20" height="2" fill="#ffffff" opacity="0.6"/>
    </svg>
  );
}

function GradientBottleSVG({ color = '#fbbf24' }: { color?: string }) {
  // Realistic Premium Foil Gradient Cylinder
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl text-transparent">
      <defs>
        <linearGradient id="gradPrem" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e"/>
          <stop offset="50%" stopColor={color}/>
          <stop offset="100%" stopColor="#fcd34d"/>
        </linearGradient>
      </defs>
      {/* Premium Cap */}
      <rect x="26" y="6" width="28" height="16" rx="4" fill="url(#gradPrem)"/>
      <rect x="28" y="22" width="24" height="6" fill="#fcd34d"/>
      {/* Tall Sleek Body */}
      <path d="M 28 28 C 28 35, 20 40, 20 50 L 20 144 A 6 6 0 0 0 26 150 L 54 150 A 6 6 0 0 0 60 144 L 60 50 C 60 40, 52 35, 52 28 Z" fill="url(#gradPrem)"/>
      {/* Heavy Holographic Reflection */}
      <path d="M 22 50 L 22 144 A 4 4 0 0 0 26 148 L 32 148 L 34 50 Z" fill="#ffffff" opacity="0.4"/>
      <path d="M 58 50 L 58 144 A 4 4 0 0 1 54 148 L 48 148 L 46 50 Z" fill="#000000" opacity="0.1"/>
      {/* Sleek Oval Label */}
      <ellipse cx="40" cy="90" rx="14" ry="24" fill="#ffffff" opacity="0.15"/>
      <ellipse cx="40" cy="90" rx="12" ry="22" stroke="#ffffff" strokeWidth="1" opacity="0.8"/>
      <circle cx="40" cy="90" r="3" fill="#ffffff"/>
    </svg>
  );
}

function SportBottleSVG({ color = '#06b6d4' }: { color?: string }) {
  // Realistic Sport Shaker Bottle
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl text-transparent">
      <defs>
        <linearGradient id="sportPlas" x1="16" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
          <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#082f49" stopOpacity="0.9"/>
        </linearGradient>
      </defs>
      {/* Sport Spout and Lid */}
      <path d="M 36 2 L 44 2 L 44 12 L 36 12 Z" fill="#38bdf8"/>
      <rect x="28" y="12" width="24" height="12" rx="4" fill="#0f172a"/>
      {/* Contoured Plastic Body */}
      <path d="M 28 24 L 52 24 C 60 30, 62 40, 62 50 C 62 70, 54 85, 54 95 C 54 105, 62 115, 62 135 C 62 145, 58 148, 56 148 L 24 148 C 22 148, 18 145, 18 135 C 18 115, 26 105, 26 95 C 26 85, 18 70, 18 50 C 18 40, 20 30, 28 24 Z" fill="url(#sportPlas)"/>
      {/* Plastic Sheen */}
      <path d="M 20 50 C 20 70, 28 85, 28 95 C 28 105, 20 115, 20 135 L 24 135 C 24 115, 32 105, 32 95 C 32 85, 24 70, 24 50 Z" fill="#ffffff" opacity="0.3"/>
      {/* Rubber Grips / Markers */}
      <rect x="26" y="88" width="8" height="2" fill="#0f172a" opacity="0.5"/>
      <rect x="26" y="95" width="8" height="2" fill="#0f172a" opacity="0.5"/>
      <rect x="26" y="102" width="8" height="2" fill="#0f172a" opacity="0.5"/>
      {/* Rubber Base */}
      <rect x="22" y="142" width="36" height="6" rx="2" fill="#0f172a"/>
    </svg>
  );
}

function BottleSVG({ id, color }: { id: BottleId; color?: string }) {
  switch (id) {
    case 'matte':    return <MatteBottleSVG color={color} />;
    case 'glass':    return <GlassBottleSVG color={color} />;
    case 'gradient': return <GradientBottleSVG color={color} />;
    case 'sport':    return <SportBottleSVG color={color} />;
  }
}

/* ─── Bottle bg accent colours ──────────────────────────────────────── */
const bottleAccent: Record<BottleId, { bg: string; ring: string; glow: string }> = {
  matte:    { bg: 'bg-slate-50',       ring: 'ring-slate-900',  glow: 'shadow-slate-300'   },
  glass:    { bg: 'bg-amber-50',       ring: 'ring-amber-500',  glow: 'shadow-amber-200'   },
  gradient: { bg: 'bg-rose-50',        ring: 'ring-rose-500',   glow: 'shadow-rose-200'    },
  sport:    { bg: 'bg-sky-50',         ring: 'ring-sky-500',    glow: 'shadow-sky-200'     },
};

// Erupts for nearly 2 seconds visually
function SplashParticles({ flavorColor, triggerId }: { flavorColor: string, triggerId: string }) {
  const particles = Array.from({ length: 60 }).map((_, i) => {
    // Angle focused upwards (between -120deg and -60deg) -> Fountain effect
    const angle = -Math.PI / 2 + ((Math.random() - 0.5) * Math.PI * 0.7);
    const distance = 100 + Math.random() * 200;
    
    return {
      id: i,
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance, // Erupts upwards
      size: 4 + Math.random() * 18,
      // Distribute the particle spans smoothly over 1.8 seconds
      delay: Math.random() * 1.8
    };
  });

  return (
    // Positioned near the bottle cap (top 15% of the container)
    <div className="absolute top-[18%] left-1/2 -translate-x-1/2 pointer-events-none z-20 mix-blend-multiply opacity-80">
       <AnimatePresence mode="popLayout">
         {particles.map(p => {
            return (
              <motion.div
                key={`${triggerId}-${p.id}`}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                // Erupt up, then gravity pull down slightly at the end
                animate={{ 
                  x: [0, p.tx], 
                  y: [0, p.ty - 20, p.ty + 80], 
                  scale: [0, 1.5, 0], 
                  opacity: [0, 1, 0] 
                }}
                transition={{ 
                  duration: 0.9, 
                  delay: p.delay, 
                  ease: "easeOut",
                  times: [0, 0.7, 1] 
                }}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: flavorColor,
                  filter: "blur(1px)"
                }}
              />
            )
         })}
       </AnimatePresence>
    </div>
  );
}

export function ProductPage({
  onClose,
  color,
  setColor,
  topping,
  setTopping,
  flavors,
  toppings,
  hasCoupon,
  setHasCoupon
}: ProductPageProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState('');
  const [selectedBottle, setSelectedBottle] = useState<BottleId>('matte');
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [blastTrigger, setBlastTrigger] = useState(0);

  useEffect(() => {
    if (hasCoupon) {
      setToastMessage('Reward Claimed Successfully ✅ Coupon BLISS10 Applied');
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [hasCoupon]);

  const removeCoupon = () => {
    setHasCoupon(false);
  };

  const basePrice = 60.00;
  const currentPrice = hasCoupon ? basePrice * 0.9 : basePrice;

  const handleCheckout = () => setShowCheckout(true);

  const handlePaymentSuccess = (orderId: string) => {
    setShowCheckout(false);
    setActiveOrderId(orderId);
    setShowTracking(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[300] bg-white flex flex-col md:flex-row overflow-hidden"
    >
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} 
            animate={{ opacity: 1, y: 20 }} 
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[600] bg-emerald-500 text-white px-6 py-3 rounded-full font-black text-sm shadow-2xl flex items-center gap-2"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <CheckoutDrawer
            onClose={() => setShowCheckout(false)}
            onPaymentSuccess={handlePaymentSuccess}
            productInfo={{
              bottleName: bottleDesigns.find(b => b.id === selectedBottle)?.label || 'Minimal Matte',
              flavorName: flavors.find(f => f.color === color)?.name || 'Classic Mango',
              toppingName: toppings.find(t => t.id === topping)?.name || 'Mango Chunks',
              quantity,
              couponApplied: hasCoupon
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTracking && (
           <LiveTracking onClose={() => { setShowTracking(false); onClose(); }} orderId={activeOrderId} />
        )}
      </AnimatePresence>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-[310] w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors"
      >
        <X size={24} />
      </button>

      {/* Left Side: 3D Model */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full bg-slate-50 relative flex flex-col">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="absolute top-10 left-10 z-10 p-4"
        >
          <div className="flex items-center gap-2 text-slate-900 mb-4">
            <span className="text-sm font-bold uppercase tracking-widest opacity-40">Home</span>
            <ChevronRight size={14} className="opacity-40" />
            <span className="text-sm font-bold uppercase tracking-widest">Mango Bliss</span>
          </div>
          <h1 className="font-display font-black text-5xl md:text-6xl text-slate-900 uppercase leading-none">
            MANGO <br /> BLISS
          </h1>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={18} fill="currentColor" />)}
            </div>
            <span className="text-sm font-bold text-slate-400">4.9 (12.4k Reviews)</span>
          </div>
        </motion.div>

        <div className="flex-1 w-full h-full relative flex items-center justify-center pt-20 pb-10 px-10">
          <style>{`
            @keyframes premiumFloat {
              0%, 100% { transform: translateY(15px); }
              50% { transform: translateY(-15px); }
            }
            @keyframes premiumRotate {
              0%, 100% { transform: rotateY(-20deg) rotateX(8deg); }
              50% { transform: rotateY(20deg) rotateX(2deg); }
            }
            @keyframes shadowPulse {
              0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.35; }
              50% { transform: translateX(-50%) scale(0.65); opacity: 0.15; }
            }
            .premium-bottle-container { perspective: 1200px; cursor: pointer; }
            
            .bottle-float-wobble { 
              animation: premiumFloat 4s ease-in-out infinite; 
              transform-style: preserve-3d;
            }

            .bottle-spin {
              animation: premiumRotate 6s ease-in-out infinite;
              transform-style: preserve-3d;
              width: 100%;
              height: 100%;
            }
            
            .bottle-shadow { 
              animation: shadowPulse 4s ease-in-out infinite; 
            }
          `}</style>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedBottle}
              onClick={() => setBlastTrigger(p => p + 1)}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-[280px] aspect-[1/2] relative premium-bottle-container group flex items-center justify-center cursor-pointer"
            >
              <SplashParticles flavorColor={color} triggerId={`${selectedBottle}-${color}-${blastTrigger}`} />

              <div className="bottle-float-wobble absolute inset-0 w-full h-full z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)] group-hover:drop-shadow-[0_30px_50px_rgba(225,29,72,0.3)] transition-all duration-500">
                <div className="w-full h-full transition-transform duration-500 group-hover:scale-[1.08]">
                  <div className="bottle-spin">
                    <BottleSVG id={selectedBottle} color={color} />
                  </div>
                </div>
              </div>

              {/* Dynamic Bottom Shadow */}
              <div className="absolute -bottom-8 left-1/2 w-48 h-6 bg-slate-900 rounded-[100%] blur-[12px] bottle-shadow mix-blend-multiply group-hover:bg-[#e11d48] group-hover:blur-[18px] transition-colors duration-500 z-0"></div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="absolute bottom-10 left-10 flex gap-4 z-10"
        >
          <button className="w-12 h-12 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all">
            <Heart size={20} />
          </button>
          <button className="w-12 h-12 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all">
            <Share2 size={20} />
          </button>
        </motion.div>
      </div>

      {/* Right Side: Customization Menu */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto p-10 md:p-20 flex flex-col scroll-smooth">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.3 }
            }
          }}
          className="max-w-md w-full mx-auto"
        >

          {/* ── Price ─────────────────────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="flex flex-col mb-10"
          >
            <div className="flex items-baseline gap-4">
              <AnimatePresence mode="popLayout">
                <motion.span 
                  key={currentPrice}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="text-5xl font-black text-slate-900"
                >
                  ₹{currentPrice.toFixed(2)}
                </motion.span>
              </AnimatePresence>
              <span className="text-xl font-bold text-slate-300 line-through">₹75.00</span>
              <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                -20%
              </span>
            </div>
            
            <AnimatePresence>
              {hasCoupon && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex flex-col gap-2 overflow-hidden"
                >
                  <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-black uppercase shadow-sm border border-emerald-100 w-max">
                    <Tag size={12} />
                    🎉 BLISS10 Applied – 10% OFF
                  </div>
                  <button onClick={removeCoupon} className="text-xs font-bold text-slate-400 hover:text-rose-500 text-left underline ml-1 w-max transition-colors">
                    Remove Coupon
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="space-y-12">

            {/* ── Select Bottle Design ───────────────────────────── */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <div className="flex justify-between items-end mb-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Select Bottle Design
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {bottleDesigns.find(b => b.id === selectedBottle)?.label}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {bottleDesigns.map((bottle) => {
                  const isActive = selectedBottle === bottle.id;
                  const accent   = bottleAccent[bottle.id];
                  return (
                    <motion.button
                      key={bottle.id}
                      onClick={() => setSelectedBottle(bottle.id)}
                      whileHover={{ y: -4, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className={[
                        'relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all duration-300',
                        isActive
                          ? `border-slate-900 ${accent.bg} ring-2 ${accent.ring} shadow-lg ${accent.glow} scale-105`
                          : `border-slate-100 hover:border-slate-200 ${accent.bg}`,
                      ].join(' ')}
                    >
                      {/* Selected badge */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center z-10"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Bottle SVG */}
                      <div className="w-12 h-20 drop-shadow-md">
                        <BottleSVG id={bottle.id} color={color} />
                      </div>

                      {/* Label */}
                      <span
                        className={[
                          'text-[10px] font-black uppercase tracking-wide leading-tight text-center',
                          isActive ? 'text-slate-900' : 'text-slate-400',
                        ].join(' ')}
                      >
                        {bottle.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Tagline pill */}
              <motion.div
                key={selectedBottle}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 flex items-center gap-2"
              >
                <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                  {bottleDesigns.find(b => b.id === selectedBottle)?.tagline}
                </span>
              </motion.div>
            </motion.div>

            {/* ── Select Flavor ──────────────────────────────────── */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <div className="flex justify-between items-end mb-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Select Flavor</p>
                <p className="text-sm font-bold text-slate-900">{flavors.find(f => f.color === color)?.name}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {flavors.map((f) => {
                  const isSelected = color === f.color;
                  return (
                    <motion.button
                      key={f.id}
                      onClick={() => setColor(f.color)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative w-16 h-16 rounded-full flex items-center justify-center group transition-all"
                    >
                      {/* Animated Selection Ring */}
                      <div className={`absolute inset-0 rounded-full border-[3px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        isSelected 
                          ? 'border-slate-900 scale-100 opacity-100 shadow-[0_0_15px_rgba(0,0,0,0.1)]' 
                          : 'border-slate-300 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-40'
                      }`} />
                      
                      {/* Premium 3D Liquid Orb */}
                      <div 
                        className="w-[46px] h-[46px] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] relative overflow-hidden transition-all duration-500 group-hover:rounded-[50%]"
                        style={{ 
                          background: `radial-gradient(120% 120% at 30% 20%, #ffffff 0%, ${f.color} 45%, #000000 100%)`,
                          boxShadow: isSelected 
                            ? `0 12px 24px -6px ${f.color}90, inset 0 -4px 8px rgba(0,0,0,0.3)`
                            : `0 4px 10px -2px rgba(0,0,0,0.1), inset 0 -4px 8px rgba(0,0,0,0.3)`
                        }} 
                      >
                        {/* Glossy specular highlight */}
                        <div className="absolute top-1 left-2 w-4 h-2 bg-white rounded-full opacity-60 blur-[1px] rotate-[-20deg] z-20"></div>

                        {/* Suspended Fruit Icon */}
                        {f.icon && (
                          <div className="absolute inset-0 flex items-center justify-center text-[22px] drop-shadow-md opacity-90 group-hover:scale-110 transition-transform duration-300 z-10">
                            {f.icon}
                          </div>
                        )}
                      </div>

                      {/* Selection Sparkle when selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="absolute -top-1 -right-1 z-30"
                          >
                            <Sparkles size={16} className="text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Select Topping ─────────────────────────────────── */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <div className="flex justify-between items-end mb-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Select Topping</p>
                <p className="text-sm font-bold text-slate-900">{toppings.find(t => t.id === topping)?.name}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {toppings.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTopping(t.id as any)}
                    className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center justify-between ${
                      topping === t.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-slate-900">{t.name}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      topping === t.id ? 'border-slate-900 bg-slate-900' : 'border-slate-200'
                    }`}>
                      {topping === t.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* ── Quantity ─────────────────────────── */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="pt-10 border-t border-slate-100 flex flex-col gap-4"
            >
              <div className="flex items-center bg-slate-100 rounded-2xl px-4 w-max">
                 <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 font-black text-xl text-slate-400 hover:text-slate-900">-</button>
                 <span className="w-10 text-center font-black text-slate-900">{quantity}</span>
                 <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 font-black text-xl text-slate-400 hover:text-slate-900">+</button>
              </div>
            </motion.div>
          </div>

          {/* ── Product Details ────────────────────────────────────── */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mt-12 p-8 bg-slate-50 rounded-[2rem] mb-10"
          >
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Product Details</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Our signature Mango Bliss is crafted with premium sun-ripened mangoes, blended to perfection
              with organic cream. Every sip is a journey to the tropics.
            </p>
          </motion.div>

          {/* ── Sticky Place Order Button ────────────────────────────── */}
          <div className="sticky bottom-0 left-0 w-full pt-4 pb-8 bg-gradient-to-t from-white via-white to-transparent transform translate-y-4">
            <button
              onClick={handleCheckout}
              className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-xl shadow-[0_10px_25px_rgba(225,29,72,0.3)] hover:bg-rose-700 hover:scale-[1.02] hover:shadow-[0_15px_35px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-3"
            >
              <ShoppingBag size={24} />
              PLACE ORDER • ₹{(currentPrice * quantity).toFixed(2)}
            </button>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
