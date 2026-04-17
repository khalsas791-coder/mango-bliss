import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Leaf,
  Zap,
  Heart,
  Star,
  Settings2,
  X,
  Trophy,
  LogOut,
  User as UserIcon,
  Menu,
  Home,
  Shield,
  ChevronRight
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [shakeColor, setShakeColor] = useState('#fbbf24');
  const [toppingType, setToppingType] = useState<'mango' | 'pistachio' | 'chocolate'>('mango');
  const [globalCoupon, setGlobalCoupon] = useState(false);
  const { user, logout } = useAuthStore();

  const isAdmin = user?.role === 'admin';

  // Auto-open admin panel for admin users on first load
  useEffect(() => {
    if (isAdmin && !isAdminOpen) {
      // Small delay so the main app renders first
      const t = setTimeout(() => setIsAdminOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [isAdmin]);

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
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 35 }}>
        <Suspense fallback={null}>
          <ScrollControls pages={5} damping={0.1}>
            <Environment preset="sunset" />
            <MangoShakeModel color={shakeColor} topping={toppingType} />

            <Scroll html>
              <div className="w-screen">

                {/* ── SECTION 1: HERO ── */}
                <section className="h-screen flex flex-col items-center justify-center px-5 sm:px-10 relative">
                  {/* Brand logo */}
                  <div className="absolute top-5 left-5 sm:top-10 sm:left-10 flex items-center gap-2 text-white z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-[#e11d48] font-bold text-base sm:text-xl">M</span>
                    </div>
                    <span className="font-display font-bold text-base sm:text-xl tracking-tight">MANGO BLISS</span>
                  </div>

                  <div className="w-full max-w-7xl mx-auto flex flex-col items-start mt-16 sm:mt-0">
                    <motion.div
                      initial={{ opacity: 0, x: -60 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.7 }}
                    >
                      <h1 className="font-display text-[15vw] sm:text-[12vw] font-black leading-[0.85] text-white tracking-tighter uppercase">
                        THE <br />ULTIMATE <br />REFRESH.
                      </h1>
                      <p className="text-white/80 mt-4 sm:mt-6 max-w-xs sm:max-w-md text-sm sm:text-lg font-medium leading-relaxed">
                        Experience the tropical blast that never fades. Pure mango, pure energy.
                      </p>
                      {/* Mobile CTA */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsProductPageOpen(true)}
                        className="mt-6 sm:hidden flex items-center gap-3 bg-white text-[#e11d48] px-7 py-4 rounded-full font-black text-base shadow-2xl active:scale-95"
                      >
                        <ShoppingBag size={20} /> ORDER NOW
                      </motion.button>
                    </motion.div>
                  </div>
                </section>

                {/* ── SECTION 2: BENEFITS ── */}
                <section className="h-screen flex items-center justify-end px-5 sm:px-20">
                  <div className="max-w-xs sm:max-w-xl text-right">
                    <motion.div
                      initial={{ opacity: 0, x: 60 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.7 }}
                    >
                      <h2 className="font-display text-[10vw] sm:text-[8vw] font-black leading-[0.85] text-white uppercase tracking-tighter">
                        TROPICAL <br />BLAST.
                      </h2>
                      <div className="mt-6 sm:mt-10 space-y-4 sm:space-y-6">
                        {[
                          { label: '100% Organic', icon: Leaf },
                          { label: 'Energy Boost', icon: Zap },
                          { label: 'Heart Healthy', icon: Heart },
                        ].map(({ label, icon: Icon }) => (
                          <div key={label} className="flex items-center justify-end gap-3 sm:gap-4 text-white">
                            <span className="text-base sm:text-xl font-bold uppercase tracking-widest">{label}</span>
                            <Icon size={24} className="sm:w-8 sm:h-8 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* ── SECTION 3: INGREDIENTS ── */}
                <section className="h-screen flex items-center justify-start px-5 sm:px-20">
                  <div className="max-w-xs sm:max-w-xl">
                    <motion.div
                      initial={{ opacity: 0, x: -60 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.7 }}
                    >
                      <h2 className="font-display text-[10vw] sm:text-[8vw] font-black leading-[0.85] text-white uppercase tracking-tighter">
                        PURE <br />INGREDIENTS.
                      </h2>
                      <p className="text-white/80 mt-4 sm:mt-6 text-sm sm:text-xl font-medium leading-relaxed">
                        Sun-ripened Alphonso mangoes, creamy organic milk, and a touch of natural honey. No artificial flavors, ever.
                      </p>
                      <div className="mt-6 sm:mt-10 grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white/20">
                          <p className="text-white font-black text-3xl sm:text-4xl">240</p>
                          <p className="text-white/60 uppercase text-[10px] sm:text-xs font-bold tracking-widest mt-1 sm:mt-2">Calories</p>
                        </div>
                        <div className="bg-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white/20">
                          <p className="text-white font-black text-3xl sm:text-4xl">100%</p>
                          <p className="text-white/60 uppercase text-[10px] sm:text-xs font-bold tracking-widest mt-1 sm:mt-2">Vitamin C</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* ── SECTION 4: NUTRITION ── */}
                <section className="h-screen flex flex-col items-center justify-center px-5 sm:px-10">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7 }}
                    className="text-center"
                  >
                    <h2 className="font-display text-[12vw] sm:text-[10vw] font-black leading-[0.85] text-white uppercase tracking-tighter">
                      MAXIMUM <br />FLAVOR.
                    </h2>
                    <div className="mt-8 sm:mt-12 flex justify-center gap-6 sm:gap-10">
                      {[
                        { value: '0G', label: 'Added Sugar' },
                        { value: '10%', label: 'Coconut Water' },
                        { value: '834MG', label: 'Electrolytes' },
                      ].map(({ value, label }) => (
                        <div key={label} className="text-white text-center">
                          <p className="text-3xl sm:text-5xl font-black">{value}</p>
                          <p className="text-[9px] sm:text-xs font-bold uppercase tracking-widest opacity-60 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </section>

                {/* ── SECTION 5: CTA ── */}
                <section className="h-screen flex flex-col items-center justify-center px-5 sm:px-10 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                  >
                    <h2 className="font-display text-[14vw] sm:text-[12vw] font-black leading-[0.85] text-white uppercase tracking-tighter">
                      GRAB <br />YOURS.
                    </h2>
                    <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsProductPageOpen(true)}
                        className="w-full sm:w-auto bg-white text-[#e11d48] px-8 sm:px-12 py-5 sm:py-6 rounded-full font-black text-xl sm:text-2xl shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-3 sm:gap-4"
                      >
                        <ShoppingBag size={26} className="sm:w-8 sm:h-8" />
                        BUY NOW
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsGameOpen(true)}
                        className="w-full sm:w-auto bg-transparent border-4 border-white text-white px-8 sm:px-12 py-5 sm:py-6 rounded-full font-black text-xl sm:text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 sm:gap-4"
                      >
                        <Trophy size={26} className="sm:w-8 sm:h-8" />
                        PLAY & WIN
                      </motion.button>
                    </div>
                    <div className="mt-6 sm:mt-8 flex items-center gap-3 justify-center">
                      <div className="flex text-white">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                      </div>
                      <p className="text-white font-bold tracking-widest uppercase text-xs sm:text-sm">10k+ Reviews</p>
                    </div>
                  </motion.div>
                </section>

              </div>
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>

      {/* ══════════════════════════════════════════
          TOP ACTION BAR (desktop: top-right pill)
          Mobile: collapses to just icon buttons
         ══════════════════════════════════════════ */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100] flex items-center bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl p-1 sm:p-1.5 hover:bg-white/[0.12] transition-colors">

        {/* User info — only on sm+ */}
        {user && (
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5">
            <div className="text-right">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                {isAdmin ? 'Admin' : 'Authenticated'}
              </p>
              <p className="text-white font-black text-sm tracking-tight leading-none whitespace-nowrap">{user.name}</p>
            </div>
            <div className="relative group/user">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white border transition-all ${isAdmin ? 'bg-rose-600/30 border-rose-500/40' : 'bg-white/20 border-white/30'}`}>
                {isAdmin ? <Shield size={16} /> : <UserIcon size={16} />}
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-white border-2 border-white/10 hover:scale-110 hover:bg-rose-500 transition-all shadow-lg cursor-pointer z-10"
              >
                <LogOut size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Divider — only on sm+ when user is logged in */}
        {user && <div className="hidden sm:block w-px h-8 bg-white/20 mx-1" />}

        {/* Admin button — only visible to admins */}
        {isAdmin && (
          <button
            onClick={() => setIsAdminOpen(true)}
            title="Admin Hub"
            className="w-9 h-9 sm:w-10 sm:h-10 bg-rose-700 rounded-full flex items-center justify-center text-white hover:scale-110 hover:bg-rose-600 transition-all shadow-md active:scale-95"
          >
            <Shield size={16} />
          </button>
        )}

        {/* Customize button */}
        <button
          onClick={() => setIsConfigOpen(true)}
          title="Customize Shake"
          className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center text-rose-600 hover:scale-110 shadow-lg transition-all active:scale-95 group/config ml-1"
        >
          <Settings2 size={20} className="sm:w-[22px] sm:h-[22px] group-hover/config:rotate-90 transition-transform duration-500" />
        </button>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM ACTION BAR
         ══════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] sm:hidden">
        <div className="bg-white/10 backdrop-blur-2xl border-t border-white/15 flex items-center justify-around px-2 py-2 safe-area-pb">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsProductPageOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl active:bg-white/10 transition-colors"
          >
            <ShoppingBag size={22} className="text-white" />
            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">Shop</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsGameOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl active:bg-white/10 transition-colors"
          >
            <Trophy size={22} className="text-white" />
            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">Play</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsConfigOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl active:bg-white/10 transition-colors"
          >
            <Settings2 size={22} className="text-white" />
            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">Customize</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl active:bg-white/10 transition-colors"
          >
            <UserIcon size={22} className="text-white" />
            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">You</span>
          </motion.button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE USER MENU DRAWER
         ══════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[110] sm:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 z-[120] bg-white rounded-t-[2rem] p-6 pb-10 sm:hidden"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-6" />

              {/* User info */}
              {user && (
                <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 ${isAdmin ? 'bg-rose-600' : 'bg-slate-800'}`}>
                    {isAdmin ? <Shield size={22} /> : <UserIcon size={22} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-base">{user.name}</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                      {isAdmin ? '🔐 Admin Account' : user.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Menu items */}
              <div className="space-y-2">
                {isAdmin && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setIsMobileMenuOpen(false); setIsAdminOpen(true); }}
                    className="w-full flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <Shield size={20} className="text-rose-600" />
                      <span className="font-black text-rose-700 text-sm">Admin Dashboard</span>
                    </div>
                    <ChevronRight size={18} className="text-rose-400" />
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setIsMobileMenuOpen(false); setIsProductPageOpen(true); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag size={20} className="text-slate-600" />
                    <span className="font-black text-slate-700 text-sm">Order Mango Bliss</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl mt-4"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={20} className="text-red-500" />
                    <span className="font-black text-red-600 text-sm">Sign Out</span>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          CUSTOMIZE PANEL
         ══════════════════════════════════════════ */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-[100] shadow-2xl flex flex-col"
          >
            <div className="flex justify-between items-center p-6 sm:p-10 pb-0 sm:pb-0">
              <h3 className="font-display font-black text-2xl sm:text-3xl text-[#e11d48]">CUSTOMIZE</h3>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsConfigOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={28} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8">
              {/* Flavors */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select Flavor</p>
                <div className="grid grid-cols-2 gap-3">
                  {flavors.map((f) => (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShakeColor(f.color)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        shakeColor === f.color ? 'border-[#e11d48] bg-rose-50' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{f.icon}</span>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.color }} />
                      </div>
                      <p className="text-sm font-bold text-slate-900">{f.name}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Toppings */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Select Topping</p>
                <div className="space-y-3">
                  {toppings.map((t) => (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setToppingType(t.id as any)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                        toppingType === t.id ? 'border-[#e11d48] bg-rose-50' : 'border-slate-100'
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      {toppingType === t.id && <div className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer buttons — sticky at the bottom, clears mobile nav bar */}
            <div className="p-6 sm:p-10 pt-4 pb-28 sm:pb-8 border-t border-slate-100 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setIsConfigOpen(false); setIsProductPageOpen(true); }}
                className="w-full bg-[#e11d48] text-white py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98]"
              >
                PROCEED TO BUY
              </motion.button>
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
