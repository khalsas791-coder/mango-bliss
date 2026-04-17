import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, ChevronRight, Star, Heart, Share2, Tag, Sparkles, ArrowLeft } from 'lucide-react';
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
interface BottleDesign { id: BottleId; label: string; tagline: string; }

const bottleDesigns: BottleDesign[] = [
  { id: 'matte',    label: 'Minimal Matte',     tagline: 'Sleek & Bold'  },
  { id: 'glass',    label: 'Clear Glass',       tagline: 'Pure & Clear'  },
  { id: 'gradient', label: 'Gradient Premium',  tagline: 'Luxe & Vivid'  },
  { id: 'sport',    label: 'Sport Sipper',      tagline: 'Fast & Fierce' },
];

/* ─── SVG Bottle Illustrations ───────────────────────────────────── */

function MatteBottleSVG({ color = '#f59e0b' }: { color?: string }) {
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
      <rect x="28" y="4" width="24" height="18" rx="2" fill="#1e1e2e"/>
      <rect x="28" y="22" width="24" height="4" fill="#cbd5e1"/>
      <path d="M 28 26 C 28 34, 18 36, 18 46 L 18 140 A 10 10 0 0 0 28 150 L 52 150 A 10 10 0 0 0 62 140 L 62 46 C 62 36, 52 34, 52 26 Z" fill="#1e1e2e"/>
      <path d="M 20 46 L 20 140 A 8 8 0 0 0 24 148 L 28 148 L 28 42 Z" fill="#ffffff" opacity="0.1"/>
      <rect x="18" y="75" width="44" height="35" fill="#f8fafc"/>
      <rect x="30" y="85" width="20" height="3" fill="#1e1e2e"/>
      <rect x="35" y="94" width="10" height="2" fill={color}/>
    </svg>
  );
}

function GlassBottleSVG({ color = '#fbbf24' }: { color?: string }) {
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
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
      <rect x="26" y="8" width="28" height="12" rx="3" fill="#94a3b8"/>
      <rect x="25" y="20" width="30" height="4" rx="1" fill="#cbd5e1"/>
      <path d="M 26 24 C 26 30, 16 35, 16 50 L 16 142 A 8 8 0 0 0 24 150 L 56 150 A 8 8 0 0 0 64 142 L 64 50 C 64 35, 54 30, 54 24 Z" fill="url(#liquid)"/>
      <path d="M 26 24 C 26 30, 16 35, 16 50 L 16 142 A 8 8 0 0 0 24 150 L 56 150 A 8 8 0 0 0 64 142 L 64 50 C 64 35, 54 30, 54 24 Z" fill="url(#glassGlare)"/>
      <path d="M 26 24 C 26 30, 16 35, 16 50 L 16 142 A 8 8 0 0 0 24 150 L 56 150 A 8 8 0 0 0 64 142 L 64 50 C 64 35, 54 30, 54 24 Z" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.4"/>
      <rect x="17" y="24" width="46" height="16" fill="#ffffff" opacity="0.3"/>
      <path d="M 16 40 Q 40 45 64 40 L 64 45 L 16 45 Z" fill={color} opacity="0.9"/>
      <circle cx="30" cy="110" r="4" fill={color}/>
      <circle cx="50" cy="80" r="3" fill={color}/>
      <circle cx="42" cy="130" r="5" fill={color}/>
      <rect x="22" y="70" width="36" height="30" rx="4" fill="#ffffff" opacity="0.2"/>
      <rect x="26" y="80" width="28" height="2" fill="#ffffff" opacity="0.9"/>
      <rect x="30" y="86" width="20" height="2" fill="#ffffff" opacity="0.6"/>
    </svg>
  );
}

function GradientBottleSVG({ color = '#fbbf24' }: { color?: string }) {
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="gradPrem" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e"/>
          <stop offset="50%" stopColor={color}/>
          <stop offset="100%" stopColor="#fcd34d"/>
        </linearGradient>
      </defs>
      <rect x="26" y="6" width="28" height="16" rx="4" fill="url(#gradPrem)"/>
      <rect x="28" y="22" width="24" height="6" fill="#fcd34d"/>
      <path d="M 28 28 C 28 35, 20 40, 20 50 L 20 144 A 6 6 0 0 0 26 150 L 54 150 A 6 6 0 0 0 60 144 L 60 50 C 60 40, 52 35, 52 28 Z" fill="url(#gradPrem)"/>
      <path d="M 22 50 L 22 144 A 4 4 0 0 0 26 148 L 32 148 L 34 50 Z" fill="#ffffff" opacity="0.4"/>
      <ellipse cx="40" cy="90" rx="14" ry="24" fill="#ffffff" opacity="0.15"/>
      <ellipse cx="40" cy="90" rx="12" ry="22" stroke="#ffffff" strokeWidth="1" opacity="0.8"/>
      <circle cx="40" cy="90" r="3" fill="#ffffff"/>
    </svg>
  );
}

function SportBottleSVG({ color = '#06b6d4' }: { color?: string }) {
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="sportPlas" x1="16" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
          <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#082f49" stopOpacity="0.9"/>
        </linearGradient>
      </defs>
      <path d="M 36 2 L 44 2 L 44 12 L 36 12 Z" fill="#38bdf8"/>
      <rect x="28" y="12" width="24" height="12" rx="4" fill="#0f172a"/>
      <path d="M 28 24 L 52 24 C 60 30, 62 40, 62 50 C 62 70, 54 85, 54 95 C 54 105, 62 115, 62 135 C 62 145, 58 148, 56 148 L 24 148 C 22 148, 18 145, 18 135 C 18 115, 26 105, 26 95 C 26 85, 18 70, 18 50 C 18 40, 20 30, 28 24 Z" fill="url(#sportPlas)"/>
      <path d="M 20 50 C 20 70, 28 85, 28 95 C 28 105, 20 115, 20 135 L 24 135 C 24 115, 32 105, 32 95 C 32 85, 24 70, 24 50 Z" fill="#ffffff" opacity="0.3"/>
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

const bottleAccent: Record<BottleId, { bg: string; ring: string }> = {
  matte:    { bg: 'bg-slate-50',  ring: 'ring-slate-900' },
  glass:    { bg: 'bg-amber-50',  ring: 'ring-amber-500' },
  gradient: { bg: 'bg-rose-50',   ring: 'ring-rose-500'  },
  sport:    { bg: 'bg-sky-50',    ring: 'ring-sky-500'   },
};

function SplashParticles({ flavorColor, triggerId }: { flavorColor: string; triggerId: string }) {
  const particles = Array.from({ length: 40 }).map((_, i) => {
    const angle = -Math.PI / 2 + ((Math.random() - 0.5) * Math.PI * 0.7);
    const distance = 60 + Math.random() * 140;
    return { id: i, tx: Math.cos(angle) * distance, ty: Math.sin(angle) * distance, size: 4 + Math.random() * 12, delay: Math.random() * 1.2 };
  });
  return (
    <div className="absolute top-[18%] left-1/2 -translate-x-1/2 pointer-events-none z-20">
      <AnimatePresence mode="popLayout">
        {particles.map(p => (
          <motion.div
            key={`${triggerId}-${p.id}`}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, backgroundColor: flavorColor, filter: 'blur(1px)' }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: [0, p.tx], y: [0, p.ty - 20, p.ty + 60], scale: [0, 1.3, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.85, delay: p.delay, ease: 'easeOut', times: [0, 0.7, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ProductPage({ onClose, color, setColor, topping, setTopping, flavors, toppings, hasCoupon, setHasCoupon }: ProductPageProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState('');
  const [selectedBottle, setSelectedBottle] = useState<BottleId>('matte');
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [blastTrigger, setBlastTrigger] = useState(0);

  useEffect(() => {
    if (hasCoupon) {
      setToastMessage('Coupon BLISS10 Applied ✅ 10% OFF');
      const t = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(t);
    }
  }, [hasCoupon]);

  const basePrice = 60.00;
  const currentPrice = hasCoupon ? basePrice * 0.9 : basePrice;

  const handlePaymentSuccess = (orderId: string) => {
    setShowCheckout(false);
    setActiveOrderId(orderId);
    setShowTracking(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[300] bg-white flex flex-col overflow-hidden"
    >
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -40 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[600] bg-emerald-500 text-white px-5 py-3 rounded-full font-black text-sm shadow-2xl flex items-center gap-2 whitespace-nowrap"
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
              couponApplied: hasCoupon,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTracking && (
          <LiveTracking onClose={() => { setShowTracking(false); onClose(); }} orderId={activeOrderId} />
        )}
      </AnimatePresence>

      {/* ── MOBILE LAYOUT (stacked) / DESKTOP LAYOUT (side-by-side) ── */}
      <div className="flex flex-col md:flex-row h-full overflow-hidden">

        {/* ═══ LEFT / TOP: Visual ═══ */}
        <div className="relative flex-shrink-0 h-[42vh] md:h-full md:w-1/2 bg-slate-50 overflow-hidden">

          {/* Back button (mobile top-left) */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-bold hidden sm:block">Back</span>
          </motion.button>

          {/* Close X (top-right) */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-slate-600 shadow-sm"
          >
            <X size={20} />
          </motion.button>

          {/* Product name — desktop only top-left */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center hidden md:block">
            <h1 className="font-display font-black text-4xl md:text-5xl text-slate-900 uppercase leading-none">
              MANGO <br />BLISS
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex text-yellow-400">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <span className="text-xs font-bold text-slate-400">4.9 (12.4k)</span>
            </div>
          </div>

          {/* Bottle visualizer */}
          <div className="flex-1 w-full h-full flex items-center justify-center py-6 px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedBottle}
                onClick={() => setBlastTrigger(p => p + 1)}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
                className="relative cursor-pointer"
                style={{ width: 'min(160px, 40vw)', aspectRatio: '1/2' }}
              >
                <SplashParticles flavorColor={color} triggerId={`${selectedBottle}-${color}-${blastTrigger}`} />
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-full"
                >
                  <BottleSVG id={selectedBottle} color={color} />
                </motion.div>
                {/* Shadow */}
                <motion.div
                  animate={{ scaleX: [1, 0.7, 1], opacity: [0.3, 0.15, 0.3] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-900/40 rounded-full blur-md"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Wish / Share — bottom left (desktop only) */}
          <div className="absolute bottom-5 left-5 hidden md:flex gap-3">
            <button className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
              <Heart size={18} />
            </button>
            <button className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* ═══ RIGHT / BOTTOM: Options scroll area ═══ */}
        <div className="flex-1 overflow-y-auto md:w-1/2 overscroll-contain">
          {/* Mobile product header */}
          <div className="md:hidden px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h1 className="font-display font-black text-2xl text-slate-900 uppercase leading-tight">Mango Bliss</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex text-yellow-400">
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <span className="text-xs font-bold text-slate-400">4.9 (12.4k reviews)</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-2xl text-slate-900">₹{currentPrice.toFixed(0)}</p>
              {hasCoupon && <p className="text-[10px] text-emerald-600 font-black">BLISS10 applied</p>}
            </div>
          </div>

          <div className="px-5 sm:px-8 md:px-14 py-5 md:py-10 max-w-lg mx-auto">

            {/* Price — desktop */}
            <div className="hidden md:flex items-baseline gap-4 mb-8">
              <span className="text-5xl font-black text-slate-900">₹{currentPrice.toFixed(2)}</span>
              <span className="text-xl font-bold text-slate-300 line-through">₹75.00</span>
              <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-black">-20%</span>
            </div>

            {/* Coupon badge */}
            <AnimatePresence>
              {hasCoupon && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                    <Tag size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-xs font-black text-emerald-700">🎉 BLISS10 Applied – 10% OFF</span>
                    <button onClick={() => setHasCoupon(false)} className="ml-auto text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">Remove</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-8">

              {/* Bottle Design */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Select Bottle</p>
                <div className="grid grid-cols-4 gap-2">
                  {bottleDesigns.map(bottle => {
                    const isActive = selectedBottle === bottle.id;
                    return (
                      <motion.button
                        key={bottle.id}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setSelectedBottle(bottle.id)}
                        className={[
                          'relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all',
                          isActive
                            ? `border-slate-900 ${bottleAccent[bottle.id].bg} ring-2 ${bottleAccent[bottle.id].ring}`
                            : `border-slate-100 ${bottleAccent[bottle.id].bg}`,
                        ].join(' ')}
                      >
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center z-10"
                          >
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                        <div className="w-8 h-14"><BottleSVG id={bottle.id} color={color} /></div>
                        <span className={`text-[9px] font-black uppercase leading-tight text-center ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                          {bottle.label.split(' ')[0]}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                    {bottleDesigns.find(b => b.id === selectedBottle)?.tagline}
                  </span>
                </div>
              </div>

              {/* Flavor */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Flavor</p>
                  <p className="text-sm font-bold text-slate-700">{flavors.find(f => f.color === color)?.name}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {flavors.map(f => {
                    const isSelected = color === f.color;
                    return (
                      <motion.button
                        key={f.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setColor(f.color)}
                        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                      >
                        <div className={`absolute inset-0 rounded-full border-[3px] transition-all ${isSelected ? 'border-slate-900 scale-100 opacity-100' : 'border-slate-200 scale-75 opacity-0'}`} />
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] relative overflow-hidden"
                          style={{
                            background: `radial-gradient(120% 120% at 30% 20%, #ffffff 0%, ${f.color} 45%, #000000 100%)`,
                            boxShadow: isSelected ? `0 8px 20px -4px ${f.color}80` : '0 4px 10px -2px rgba(0,0,0,0.1)',
                          }}
                        >
                          <div className="absolute top-1 left-1.5 w-3 h-2 bg-white rounded-full opacity-60 blur-[1px]" />
                          {f.icon && <div className="absolute inset-0 flex items-center justify-center text-lg">{f.icon}</div>}
                        </div>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 z-10">
                            <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Topping */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Topping</p>
                  <p className="text-sm font-bold text-slate-700">{toppings.find(t => t.id === topping)?.name}</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {toppings.map(t => (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setTopping(t.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                        topping === t.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100'
                      }`}
                    >
                      <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${topping === t.id ? 'border-slate-900 bg-slate-900' : 'border-slate-200'}`}>
                        {topping === t.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Qty</p>
                <div className="flex items-center bg-slate-100 rounded-2xl px-2">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 font-black text-xl text-slate-400 flex items-center justify-center">−</motion.button>
                  <span className="w-8 text-center font-black text-slate-900">{quantity}</span>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 font-black text-xl text-slate-400 flex items-center justify-center">+</motion.button>
                </div>
              </div>

              {/* Product details */}
              <div className="p-5 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">About</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Crafted with premium sun-ripened mangoes, blended to perfection with organic cream. Every sip is a journey to the tropics.
                </p>
              </div>

              {/* Extra bottom space so content isn't hidden behind sticky button */}
              <div className="h-4 md:h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STICKY BOTTOM ORDER BUTTON ═══ */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto z-[305] bg-white/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-slate-100 md:border-0 px-5 sm:px-8 pb-5 pt-3 md:hidden">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCheckout(true)}
          className="w-full bg-[#e11d48] text-white py-4 rounded-2xl font-black text-base shadow-[0_8px_25px_rgba(225,29,72,0.35)] flex items-center justify-center gap-3"
        >
          <ShoppingBag size={20} />
          ORDER NOW • ₹{(currentPrice * quantity).toFixed(0)}
        </motion.button>
      </div>

      {/* Desktop order button inside scroll area */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-order-btn { display: block; }
        }
        @keyframes premiumFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
      `}</style>
    </motion.div>
  );
}
