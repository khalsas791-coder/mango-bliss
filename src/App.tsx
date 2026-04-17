import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Environment, Float } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Leaf, 
  Zap, 
  Heart, 
  ArrowRight, 
  Star,
  Settings2,
  X,
  Trophy,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { MangoShakeModel } from './components/MangoShakeModel';
import { MangoGame } from './components/MangoGame';
import { ProductPage } from './components/ProductPage';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isProductPageOpen, setIsProductPageOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [shakeColor, setShakeColor] = useState('#fbbf24'); // Default Mango
  const [toppingType, setToppingType] = useState<'mango' | 'pistachio' | 'chocolate'>('mango');
  const [globalCoupon, setGlobalCoupon] = useState(false);
  const { user, logout } = useAuthStore();

  const flavors = [
    { name: 'Classic Mango', color: '#fbbf24', id: 'mango', icon: '🥭' },
    { name: 'Strawberry Fusion', color: '#f43f5e', id: 'strawberry', icon: '🍓' },
    { name: 'Matcha Twist', color: '#65a30d', id: 'matcha', icon: '🍵' },
    { name: 'Blueberry Bliss', color: '#2563eb', id: 'blueberry', icon: '🫐' },
  ];

  const toppings = [
    { name: 'Mango Chunks', id: 'mango' },
    { name: 'Pistachios', id: 'pistachio' },
    { name: 'Choco Drizzle', id: 'chocolate' },
  ];

  return (
    <div className="h-screen w-full bg-[#e11d48] overflow-hidden">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 10], fov: 35 }}>
        <Suspense fallback={null}>
          <ScrollControls pages={5} damping={0.1}>
            <Environment preset="sunset" />
            
            {/* 3D Model that travels through sections */}
            <MangoShakeModel color={shakeColor} topping={toppingType} />

            <Scroll html>
              <div className="w-screen">
                {/* Section 1: Hero */}
                <section className="h-screen flex flex-col items-center justify-center px-10 relative">
                  <div className="absolute top-10 left-10 flex items-center gap-2 text-white">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-[#e11d48] font-bold text-xl">M</span>
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight">MANGO BLISS</span>
                  </div>

                  {/* User Profile in Navbar */}
                  <div className="absolute top-10 right-24 flex items-center gap-4 group">
                    <div className="text-right hidden sm:block">
                      <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Welcome back</p>
                      <p className="text-white font-bold text-sm tracking-tight">{user?.name}</p>
                    </div>
                    <div className="relative">
                      <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
                        <UserIcon size={18} />
                      </div>
                      <button 
                        onClick={logout}
                        title="Sign Out"
                        className="absolute -bottom-2 -right-2 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-white border-2 border-[#e11d48] hover:scale-110 transition-transform shadow-lg cursor-pointer"
                      >
                        <LogOut size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
                    <motion.div
                      initial={{ opacity: 0, x: -100 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      <h1 className="font-display text-[12vw] font-black leading-[0.8] text-white tracking-tighter uppercase">
                        THE <br /> ULTIMATE <br /> REFRESH.
                      </h1>
                      <p className="text-white/80 mt-6 max-w-md text-lg font-medium">
                        Experience the tropical blast that never fades. Pure mango, pure energy.
                      </p>
                    </motion.div>
                  </div>
                </section>

                {/* Section 2: Benefits */}
                <section className="h-screen flex items-center justify-end px-20">
                  <div className="max-w-xl text-right">
                    <motion.div
                      initial={{ opacity: 0, x: 100 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      <h2 className="font-display text-[8vw] font-black leading-[0.8] text-white uppercase tracking-tighter">
                        TROPICAL <br /> BLAST.
                      </h2>
                      <div className="mt-10 space-y-6">
                        <div className="flex items-center justify-end gap-4 text-white">
                          <span className="text-xl font-bold uppercase tracking-widest">100% Organic</span>
                          <Leaf size={32} />
                        </div>
                        <div className="flex items-center justify-end gap-4 text-white">
                          <span className="text-xl font-bold uppercase tracking-widest">Energy Boost</span>
                          <Zap size={32} />
                        </div>
                        <div className="flex items-center justify-end gap-4 text-white">
                          <span className="text-xl font-bold uppercase tracking-widest">Heart Healthy</span>
                          <Heart size={32} />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Section 3: Ingredients */}
                <section className="h-screen flex items-center justify-start px-20">
                  <div className="max-w-xl">
                    <motion.div
                      initial={{ opacity: 0, x: -100 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8 }}
                    >
                      <h2 className="font-display text-[8vw] font-black leading-[0.8] text-white uppercase tracking-tighter">
                        PURE <br /> INGREDIENTS.
                      </h2>
                      <p className="text-white/80 mt-6 text-xl font-medium">
                        Sun-ripened Alphonso mangoes, creamy organic milk, and a touch of natural honey. No artificial flavors, ever.
                      </p>
                      <div className="mt-10 grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20">
                          <p className="text-white font-black text-4xl">240</p>
                          <p className="text-white/60 uppercase text-xs font-bold tracking-widest mt-2">Calories</p>
                        </div>
                        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20">
                          <p className="text-white font-black text-4xl">100%</p>
                          <p className="text-white/60 uppercase text-xs font-bold tracking-widest mt-2">Vitamin C</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Section 4: Nutrition */}
                <section className="h-screen flex flex-col items-center justify-center px-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                  >
                    <h2 className="font-display text-[10vw] font-black leading-[0.8] text-white uppercase tracking-tighter">
                      MAXIMUM <br /> FLAVOR.
                    </h2>
                    <div className="mt-12 flex justify-center gap-10">
                       <div className="text-white text-center">
                          <p className="text-5xl font-black">0G</p>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-60">Added Sugar</p>
                       </div>
                       <div className="text-white text-center">
                          <p className="text-5xl font-black">10%</p>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-60">Coconut Water</p>
                       </div>
                       <div className="text-white text-center">
                          <p className="text-5xl font-black">834MG</p>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-60">Electrolytes</p>
                       </div>
                    </div>
                  </motion.div>
                </section>

                {/* Section 5: CTA */}
                <section className="h-screen flex flex-col items-center justify-center px-10 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <h2 className="font-display text-[12vw] font-black leading-[0.8] text-white uppercase tracking-tighter">
                      GRAB <br /> YOURS.
                    </h2>
                    <div className="mt-12 flex flex-col md:flex-row gap-6 justify-center">
                      <button 
                        onClick={() => setIsProductPageOpen(true)}
                        className="bg-white text-[#e11d48] px-12 py-6 rounded-full font-black text-2xl shadow-2xl hover:scale-110 transition-transform flex items-center gap-4"
                      >
                        <ShoppingBag size={32} />
                        BUY NOW
                      </button>
                      <button 
                        onClick={() => setIsGameOpen(true)}
                        className="bg-transparent border-4 border-white text-white px-12 py-6 rounded-full font-black text-2xl shadow-2xl hover:bg-white hover:text-[#e11d48] transition-all flex items-center gap-4"
                      >
                        <Trophy size={32} />
                        PLAY & WIN
                      </button>
                    </div>
                    <div className="mt-8 flex items-center gap-4 justify-center">
                      <div className="flex text-white">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} fill="currentColor" />)}
                      </div>
                      <p className="text-white font-bold tracking-widest uppercase text-sm">10k+ Reviews</p>
                    </div>
                  </motion.div>
                </section>
              </div>
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>

      {/* Static Overlay Elements */}
      <div className="fixed bottom-10 left-10 z-50 hidden md:block">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#e11d48] transition-all cursor-pointer">
            <ArrowRight className="rotate-180" />
          </div>
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#e11d48] transition-all cursor-pointer">
            <ArrowRight />
          </div>
        </div>
      </div>

      {/* Top-right action buttons: Admin + Configurator */}
      <div className="fixed top-10 right-10 z-50 flex items-center gap-3">
        {/* Admin Button */}
        <button
          onClick={() => setIsAdminOpen(true)}
          title="Admin Panel"
          className="w-12 h-12 bg-slate-900/80 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 hover:bg-slate-900 transition-transform border border-white/10"
        >
          {/* Shield icon inline SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </button>

        {/* Configurator Button */}
        <button
          onClick={() => setIsConfigOpen(true)}
          title="Customize"
          className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-[#e11d48] hover:scale-110 transition-transform"
        >
          <Settings2 size={28} />
        </button>
      </div>


      {/* Configurator Panel */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-96 bg-white z-[100] shadow-2xl p-10 flex flex-col"
          >
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-display font-black text-3xl text-[#e11d48]">CUSTOMIZE</h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="space-y-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select Flavor</p>
                <div className="grid grid-cols-2 gap-3">
                  {flavors.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setShakeColor(f.color)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        shakeColor === f.color ? 'border-[#e11d48] bg-rose-50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full mb-2" style={{ backgroundColor: f.color }} />
                      <p className="text-sm font-bold text-slate-900">{f.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select Topping</p>
                <div className="space-y-3">
                  {toppings.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setToppingType(t.id as any)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                        toppingType === t.id ? 'border-[#e11d48] bg-rose-50' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      {toppingType === t.id && <div className="w-2 h-2 rounded-full bg-[#e11d48]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100">
              <button 
                onClick={() => {
                  setIsConfigOpen(false);
                  setIsProductPageOpen(true);
                }}
                className="w-full bg-[#e11d48] text-white py-6 rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] transition-transform"
              >
                PROCEED TO BUY
              </button>
              <button 
                onClick={() => setIsAdminOpen(true)}
                className="w-full mt-4 text-slate-300 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"
               >
                Admin Access
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGameOpen && (
          <MangoGame onClose={() => setIsGameOpen(false)} onClaimReward={() => setGlobalCoupon(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProductPageOpen && (
          <ProductPage 
            onClose={() => setIsProductPageOpen(false)}
            color={shakeColor}
            setColor={setShakeColor}
            topping={toppingType}
            setTopping={setToppingType}
            flavors={flavors}
            toppings={toppings}
            hasCoupon={globalCoupon}
            setHasCoupon={setGlobalCoupon}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAdminOpen && (
          <AdminDashboard onClose={() => setIsAdminOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
