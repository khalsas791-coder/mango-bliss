import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import * as THREE from 'three';
import { useAuthStore } from '../store/authStore';

// ─── 3D Particle Field Background ─────────────────────────────────────────────

function Particles({ count = 80 }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      const scale = Math.random() * 0.3 + 0.05;
      const speed = Math.random() * 0.4 + 0.1;
      const offset = Math.random() * Math.PI * 2;
      temp.push({ x, y, z, scale, speed, offset });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(time * p.speed + p.offset) * 0.5,
        p.y + Math.cos(time * p.speed + p.offset * 2) * 0.5,
        p.z + Math.sin(time * p.speed * 0.5) * 0.3
      );
      dummy.scale.setScalar(p.scale * (1 + Math.sin(time * p.speed * 2) * 0.3));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#f43f5e"
        emissive="#e11d48"
        emissiveIntensity={0.4}
        transparent
        opacity={0.6}
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
  );
}

function FloatingOrb({ position, color, size = 1 }: { position: [number, number, number]; color: string; size?: number }) {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
      <mesh position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.5}
          distort={0.4}
          speed={3}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 5]} intensity={1} color="#f43f5e" />
      <pointLight position={[-10, -5, 5]} intensity={0.6} color="#8b5cf6" />
      <pointLight position={[0, 5, -5]} intensity={0.4} color="#06b6d4" />
      
      <Particles count={60} />
      
      <FloatingOrb position={[-5, 3, -3]} color="#e11d48" size={1.5} />
      <FloatingOrb position={[5, -2, -4]} color="#8b5cf6" size={1.2} />
      <FloatingOrb position={[0, -4, -2]} color="#f97316" size={0.8} />
      
      <fog attach="fog" args={['#0a0a0a', 5, 25]} />
    </>
  );
}

// ─── Toast Notification ────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success';
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              toast.type === 'error' 
                ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle size={20} className="shrink-0" />
            ) : (
              <CheckCircle2 size={20} className="shrink-0" />
            )}
            <p className="text-sm font-semibold">{toast.message}</p>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Success Overlay ───────────────────────────────────────────────────────────

function SuccessOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl rounded-[2rem]"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
      >
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 size={56} className="text-emerald-400" />
        </div>
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-black text-white tracking-tight"
      >
        Welcome Back!
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-white/50 font-medium mt-2"
      >
        Redirecting you to Mango Bliss...
      </motion.p>

      {/* Confetti Dots */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: ['#f43f5e', '#fbbf24', '#8b5cf6', '#06b6d4', '#10b981'][i % 5],
          }}
          initial={{ 
            x: 0, y: 0, opacity: 1, scale: 1 
          }}
          animate={{ 
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 300,
            opacity: 0,
            scale: 0,
          }}
          transition={{ 
            duration: 1.5, 
            delay: 0.2 + Math.random() * 0.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── Auth Page Component ───────────────────────────────────────────────────────

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Focused field tracking for glow effects
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login, register, isLoading, error, clearError } = useAuthStore();

  const addToast = (message: string, type: 'error' | 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Show error toasts from store
  useEffect(() => {
    if (error) {
      addToast(error, 'error');
      clearError();
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && !name.trim()) {
      addToast('Please enter your name.', 'error');
      return;
    }
    if (!email.trim()) {
      addToast('Please enter your email.', 'error');
      return;
    }
    if (!password || password.length < 6) {
      addToast('Password must be at least 6 characters.', 'error');
      return;
    }

    let success = false;
    if (mode === 'login') {
      success = await login(email, password);
    } else {
      success = await register(name, email, password);
    }

    if (success) {
      setShowSuccess(true);
      addToast(mode === 'login' ? 'Login successful!' : 'Account created!', 'success');
      
      // Redirect after success animation
      setTimeout(() => {
        window.location.href = '/';
      }, 2200);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    clearError();
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene />
        </Canvas>
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-br from-rose-950/30 via-transparent to-purple-950/30 pointer-events-none" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Brand Header */}
      <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
          <span className="text-white font-black text-lg">M</span>
        </div>
        <span className="font-display font-bold text-xl text-white/90 tracking-tight">MANGO BLISS</span>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
          className="relative w-full max-w-md"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-cyan-500/20 rounded-[2.5rem] blur-xl opacity-60 auth-glow-pulse" />
          
          {/* Card */}
          <div className="relative glass-dark rounded-[2rem] p-8 md:p-10 overflow-hidden">
            {/* Inner gradient shimmer */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none rounded-[2rem]" />

            {/* Success Overlay */}
            <AnimatePresence>
              {showSuccess && <SuccessOverlay />}
            </AnimatePresence>

            {/* Mode Toggle Tabs */}
            <div className="relative flex bg-white/5 rounded-2xl p-1 mb-8">
              <motion.div
                className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 shadow-lg shadow-rose-500/30"
                initial={false}
                animate={{
                  left: mode === 'login' ? '0.25rem' : '50%',
                  width: 'calc(50% - 0.25rem)',
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              />
              <button
                onClick={() => mode !== 'login' && switchMode()}
                className={`relative z-10 flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                  mode === 'login' ? 'text-white' : 'text-white/40'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => mode !== 'signup' && switchMode()}
                className={`relative z-10 flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                  mode === 'signup' ? 'text-white' : 'text-white/40'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-8"
              >
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-white/40 font-medium mt-1">
                  {mode === 'login' 
                    ? 'Enter your credentials to continue' 
                    : 'Join the Mango Bliss experience'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Name Input */}
                    <div className={`relative group mb-5 ${focusedField === 'name' ? 'auth-input-focused' : ''}`}>
                      <div className={`absolute -inset-px rounded-2xl transition-all duration-300 ${
                        focusedField === 'name' 
                          ? 'bg-gradient-to-r from-rose-500 to-purple-500 opacity-100' 
                          : 'bg-white/10 opacity-0 group-hover:opacity-50'
                      }`} />
                      <div className="relative flex items-center bg-white/5 rounded-2xl">
                        <div className="pl-4 text-white/30">
                          <User size={20} />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Full Name"
                          className="w-full bg-transparent text-white font-semibold px-4 py-4 outline-none placeholder:text-white/25"
                          autoComplete="name"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input */}
              <div className={`relative group ${focusedField === 'email' ? 'auth-input-focused' : ''}`}>
                <div className={`absolute -inset-px rounded-2xl transition-all duration-300 ${
                  focusedField === 'email' 
                    ? 'bg-gradient-to-r from-rose-500 to-purple-500 opacity-100' 
                    : 'bg-white/10 opacity-0 group-hover:opacity-50'
                }`} />
                <div className="relative flex items-center bg-white/5 rounded-2xl">
                  <div className="pl-4 text-white/30">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Email Address"
                    className="w-full bg-transparent text-white font-semibold px-4 py-4 outline-none placeholder:text-white/25"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className={`relative group ${focusedField === 'password' ? 'auth-input-focused' : ''}`}>
                <div className={`absolute -inset-px rounded-2xl transition-all duration-300 ${
                  focusedField === 'password' 
                    ? 'bg-gradient-to-r from-rose-500 to-purple-500 opacity-100' 
                    : 'bg-white/10 opacity-0 group-hover:opacity-50'
                }`} />
                <div className="relative flex items-center bg-white/5 rounded-2xl">
                  <div className="pl-4 text-white/30">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Password"
                    className="w-full bg-transparent text-white font-semibold px-4 py-4 outline-none placeholder:text-white/25"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-4 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password (Login only) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div 
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                        rememberMe 
                          ? 'bg-rose-600 border-rose-600' 
                          : 'border-white/20 group-hover:border-white/40'
                      }`}
                    >
                      {rememberMe && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 text-white"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M2 6L5 9L10 3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </motion.svg>
                      )}
                    </div>
                    <span className="text-sm text-white/40 font-medium">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => addToast('Password reset link sent to your email!', 'success')}
                    className="text-sm text-rose-400 font-semibold hover:text-rose-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="relative w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider text-white overflow-hidden shadow-2xl shadow-rose-500/20 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 bg-[length:200%_100%] auth-gradient-shift" />
                
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500" />
                
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      {mode === 'login' ? 'SIGNING IN...' : 'CREATING ACCOUNT...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                      <ArrowRight size={20} />
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs font-bold text-white/20 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Switch Mode */}
            <p className="text-center text-white/40 font-medium">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={switchMode}
                className="text-rose-400 font-bold hover:text-rose-300 transition-colors ml-2"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
