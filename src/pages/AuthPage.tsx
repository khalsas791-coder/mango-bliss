import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2,
  AlertCircle, ArrowRight, ArrowLeft, Sparkles, Zap
} from 'lucide-react';
import * as THREE from 'three';
import { useAuthStore } from '../store/authStore';

// ─────────────────────────────────────────────────────────────────────────────
// 3D SCENE
// ─────────────────────────────────────────────────────────────────────────────

function Particles({ count = 70, isSignup }: { count?: number; isSignup: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 22,
        y: (Math.random() - 0.5) * 22,
        z: (Math.random() - 0.5) * 10,
        scale: Math.random() * 0.25 + 0.04,
        speed: Math.random() * 0.35 + 0.08,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.6,
        p.y + Math.cos(t * p.speed + p.offset * 1.7) * 0.6,
        p.z + Math.sin(t * p.speed * 0.5) * 0.25
      );
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t * p.speed * 2) * 0.25));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color={isSignup ? '#f43f5e' : '#e11d48'}
        emissive={isSignup ? '#f97316' : '#be123c'}
        emissiveIntensity={0.5}
        transparent opacity={0.55}
        roughness={0.1} metalness={0.9}
      />
    </instancedMesh>
  );
}

function FloatingOrb({ pos, color, size = 1 }: { pos: [number, number, number]; color: string; size?: number }) {
  return (
    <Float speed={1.8} rotationIntensity={0.4} floatIntensity={1.4}>
      <mesh position={pos}>
        <sphereGeometry args={[size, 48, 48]} />
        <MeshDistortMaterial
          color={color} emissive={color} emissiveIntensity={0.35}
          roughness={0.05} metalness={0.95}
          transparent opacity={0.45} distort={0.45} speed={2.5}
        />
      </mesh>
    </Float>
  );
}

function Scene({ isSignup }: { isSignup: boolean }) {
  return (
    <>
      <ambientLight intensity={0.12} />
      <pointLight position={[10, 10, 5]} intensity={1.2} color={isSignup ? '#f43f5e' : '#e11d48'} />
      <pointLight position={[-10, -5, 5]} intensity={0.7} color={isSignup ? '#8b5cf6' : '#6d28d9'} />
      <pointLight position={[0, 6, -5]} intensity={0.4} color={isSignup ? '#06b6d4' : '#0891b2'} />
      <Particles count={65} isSignup={isSignup} />
      <FloatingOrb pos={[-5, 3, -3]} color={isSignup ? '#e11d48' : '#be123c'} size={1.6} />
      <FloatingOrb pos={[5, -2, -4]} color={isSignup ? '#8b5cf6' : '#7c3aed'} size={1.3} />
      <FloatingOrb pos={[1, -5, -2]} color={isSignup ? '#f97316' : '#ea580c'} size={0.9} />
      <FloatingOrb pos={[-3, -3, -5]} color={isSignup ? '#06b6d4' : '#0284c7'} size={0.7} />
      <fog attach="fog" args={['#08080f', 5, 28]} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING LABEL INPUT
// ─────────────────────────────────────────────────────────────────────────────

interface InputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  rightEl?: React.ReactNode;
  autoComplete?: string;
  shake?: boolean;
  delay?: number;
}

function FancyInput({ id, label, type, value, onChange, icon, rightEl, autoComplete, shake = false, delay = 0 }: InputProps) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      animate-custom={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
      className="relative group"
    >
      {/* Glow border */}
      <div
        className={`absolute -inset-px rounded-2xl transition-all duration-300 ${
          focused
            ? 'opacity-100 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500'
            : 'opacity-0 group-hover:opacity-30 bg-gradient-to-r from-rose-500 to-purple-500'
        }`}
      />
      <div className="relative flex items-center bg-white/[0.06] backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        <div className={`pl-4 transition-colors duration-200 flex-shrink-0 ${focused ? 'text-rose-400' : 'text-white/30'}`}>
          {icon}
        </div>
        <div className="relative flex-1">
          <motion.label
            htmlFor={id}
            animate={{
              y: lifted ? -10 : 0,
              scale: lifted ? 0.72 : 1,
              color: lifted ? (focused ? '#fb7185' : '#9ca3af') : '#6b7280',
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-4 top-1/2 -translate-y-1/2 origin-left font-semibold pointer-events-none text-sm"
          >
            {label}
          </motion.label>
          <input
            id={id}
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete={autoComplete}
            className="w-full bg-transparent text-white font-semibold px-4 pt-6 pb-2 outline-none text-sm"
          />
        </div>
        {rightEl && <div className="pr-4">{rightEl}</div>}
      </div>
      {/* Focus pulse */}
      {focused && (
        <motion.div
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5 }}
          className="absolute -inset-px rounded-2xl border border-rose-500/60 pointer-events-none"
        />
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: i < step ? '100%' : i === step ? '40%' : '0%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}
      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap ml-1">
        {step}/{total}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function SuccessOverlay({ name, isSignup }: { name: string; isSignup: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[2rem] overflow-hidden"
      style={{ background: 'rgba(5,5,15,0.92)', backdropFilter: 'blur(24px)' }}
    >
      {/* Expanding glow burst */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
        className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
      />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
        className="relative z-10 mb-6"
      >
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', damping: 10 }}
          >
            <CheckCircle2 size={52} className="text-emerald-400" />
          </motion.div>
        </div>
        {/* Ring pulse */}
        <motion.div
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute inset-0 rounded-full border-2 border-emerald-400"
        />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="relative z-10 text-3xl font-black text-white tracking-tight text-center"
      >
        {isSignup ? `Welcome, ${name}! 🥭` : `Welcome back, ${name}!`}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 text-white/40 font-medium mt-2 text-sm"
      >
        {isSignup ? 'Your account is ready. Get your shake! ✨' : 'Your mangoes are waiting…'}
      </motion.p>

      {/* Confetti */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ background: ['#f43f5e', '#fbbf24', '#8b5cf6', '#06b6d4', '#10b981', '#f97316'][i % 6] }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            opacity: 0,
            scale: 0,
            rotate: Math.random() * 720,
          }}
          transition={{ duration: 1.8, delay: 0.2 + Math.random() * 0.4, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FORM
// ─────────────────────────────────────────────────────────────────────────────

interface LoginFormProps {
  onSuccess: (name: string) => void;
  onSwitchToSignup: () => void;
}

function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setShakePassword(true);
      setErrorMsg('Please fill in all fields.');
      setTimeout(() => setShakePassword(false), 600);
      return;
    }
    const success = await login(email, password);
    if (success) {
      const userName = email.split('@')[0];
      onSuccess(userName);
    } else {
      setShakePassword(true);
      setErrorMsg('Invalid credentials. Please try again.');
      setTimeout(() => setShakePassword(false), 600);
    }
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: -40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-3"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Zap size={16} fill="white" className="text-white" />
          </div>
          <span className="text-xs font-black text-rose-400 uppercase tracking-[0.2em]">Returning User</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-4xl font-black text-white tracking-tight leading-tight"
        >
          Welcome<br />
          <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
            Back.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-white/35 font-medium mt-2 text-sm"
        >
          Sign in to access your Mango Bliss account.
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FancyInput
          id="login-email"
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          icon={<Mail size={18} />}
          autoComplete="email"
          delay={0.2}
        />
        <FancyInput
          id="login-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          shake={shakePassword}
          icon={<Lock size={18} />}
          autoComplete="current-password"
          delay={0.28}
          rightEl={
            <motion.button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              whileTap={{ scale: 0.85 }}
              className="text-white/30 hover:text-rose-400 transition-colors"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={showPassword ? 'off' : 'on'}
                  initial={{ opacity: 0, rotate: -20, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 20, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          }
        />

        {/* Error */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-400 text-xs font-bold px-1"
            >
              <AlertCircle size={14} />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forgot password */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex justify-end"
        >
          <button
            type="button"
            className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors font-semibold"
          >
            Forgot password?
          </button>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02, boxShadow: '0 0 30px rgba(225,29,72,0.4)' }}
            whileTap={{ scale: isLoading ? 1 : 0.97 }}
            className="relative w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 bg-[length:200%] animate-[gradientSlide_3s_ease_infinite]" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-rose-500 to-pink-500" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Signing In…</>
              ) : (
                <><Sparkles size={16} /> Sign In <ArrowRight size={16} /></>
              )}
            </span>
          </motion.button>
        </motion.div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-white/35 text-sm font-medium"
      >
        New here?{' '}
        <button
          onClick={onSwitchToSignup}
          className="text-rose-400 font-black hover:text-rose-300 transition-colors"
        >
          Create an account →
        </button>
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNUP FORM (Step-based)
// ─────────────────────────────────────────────────────────────────────────────

interface SignupFormProps {
  onSuccess: (name: string) => void;
  onSwitchToLogin: () => void;
}

const SIGNUP_STEPS = [
  { field: 'name', label: "What's your name?", hint: 'How should we address you?' },
  { field: 'email', label: "Your email address", hint: 'We\'ll never share your email.' },
  { field: 'password', label: "Create a password", hint: 'At least 6 characters.' },
];

function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register, isLoading } = useAuthStore();

  const currentValues = [name, email, password];
  const currentSetters = [setName, setEmail, setPassword];

  const validateStep = (): boolean => {
    setErrorMsg('');
    if (step === 0 && !name.trim()) {
      setErrorMsg('Please enter your name.'); return false;
    }
    if (step === 1) {
      if (!email.trim()) { setErrorMsg('Please enter your email.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg('Please enter a valid email.'); return false; }
    }
    if (step === 2 && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.'); return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < SIGNUP_STEPS.length - 1) setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    const success = await register(name, email, password);
    if (success) onSuccess(name);
    else setErrorMsg('Registration failed. Please try again.');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step < SIGNUP_STEPS.length - 1) {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-3"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-xs font-black text-orange-400 uppercase tracking-[0.2em]">New Experience</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-4xl font-black text-white tracking-tight leading-tight"
        >
          Join Mango<br />
          <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
            Bliss. 🥭
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-white/35 font-medium mt-2 text-sm"
        >
          Your premium shake journey starts here.
        </motion.p>
      </div>

      {/* Step progress */}
      <StepProgress step={step + 1} total={SIGNUP_STEPS.length} />

      {/* Step question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
        >
          <p className="text-white/80 font-bold text-base mb-0.5">{SIGNUP_STEPS[step].label}</p>
          <p className="text-white/30 text-xs font-medium">{SIGNUP_STEPS[step].hint}</p>
        </motion.div>
      </AnimatePresence>

      <form onSubmit={handleSubmit} onKeyDown={handleKey} className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <FancyInput
                id="signup-name"
                label="Full Name"
                type="text"
                value={name}
                onChange={setName}
                icon={<User size={18} />}
                autoComplete="name"
              />
            )}
            {step === 1 && (
              <FancyInput
                id="signup-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                icon={<Mail size={18} />}
                autoComplete="email"
              />
            )}
            {step === 2 && (
              <FancyInput
                id="signup-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                icon={<Lock size={18} />}
                autoComplete="new-password"
                rightEl={
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    whileTap={{ scale: 0.85 }}
                    className="text-white/30 hover:text-rose-400 transition-colors"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={showPassword ? 'off' : 'on'}
                        initial={{ opacity: 0, rotate: -20, scale: 0.7 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 20, scale: 0.7 }}
                        transition={{ duration: 0.2 }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>
                }
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Password strength indicator */}
        {step === 2 && password.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(level => {
                const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
                return (
                  <div key={level} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${strength >= level ? (strength < 2 ? 'bg-red-500' : strength < 3 ? 'bg-yellow-500' : strength < 4 ? 'bg-blue-500' : 'bg-emerald-500') : ''}`}
                      initial={{ width: 0 }}
                      animate={{ width: strength >= level ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-white/30 font-medium">
              {password.length < 6 ? 'Too short' : password.length < 8 ? 'Weak' : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Strong 💪' : 'Good'}
            </p>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-400 text-xs font-bold px-1"
            >
              <AlertCircle size={14} />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <motion.button
              type="button"
              onClick={() => { setStep(s => s - 1); setErrorMsg(''); }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 flex-shrink-0 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/12 transition-all"
            >
              <ArrowLeft size={18} />
            </motion.button>
          )}

          {step < SIGNUP_STEPS.length - 1 ? (
            <motion.button
              type="button"
              onClick={handleNext}
              whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(249,115,22,0.4)' }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-rose-600" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-orange-500 to-rose-500" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Continue <ArrowRight size={16} />
              </span>
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02, boxShadow: '0 0 30px rgba(225,29,72,0.4)' }}
              whileTap={{ scale: isLoading ? 1 : 0.97 }}
              className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white overflow-hidden relative group disabled:opacity-60"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 bg-[length:200%] animate-[gradientSlide_3s_ease_infinite]" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-rose-500 to-pink-500" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating Account…</>
                ) : (
                  <><Sparkles size={16} /> Create Account</>
                )}
              </span>
            </motion.button>
          )}
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      <p className="text-center text-white/35 text-sm font-medium">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-rose-400 font-black hover:text-rose-300 transition-colors"
        >
          Sign In →
        </button>
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS-ONLY BLOB BACKGROUND (CSS particles)
// ─────────────────────────────────────────────────────────────────────────────

function BlobBackground({ isSignup }: { isSignup: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
        style={{ background: isSignup ? 'radial-gradient(circle, #f97316, transparent)' : 'radial-gradient(circle, #e11d48, transparent)', filter: 'blur(60px)' }}
      />
      <motion.div
        animate={{ x: [0, -40, 20, 0], y: [0, 30, -30, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-20"
        style={{ background: isSignup ? 'radial-gradient(circle, #8b5cf6, transparent)' : 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(60px)' }}
      />
      <motion.div
        animate={{ x: [0, 20, -30, 0], y: [0, 40, -10, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', filter: 'blur(80px)' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUSE PARALLAX WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function ParallaxCard({ children, isSignup }: { children: React.ReactNode; isSignup: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-3, 3]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <div
      className="relative w-full max-w-md"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1200px' }}
    >
      {/* Animated glow behind card */}
      <motion.div
        animate={{
          background: isSignup
            ? ['linear-gradient(135deg, rgba(249,115,22,0.25), rgba(225,29,72,0.2), rgba(139,92,246,0.25))',
               'linear-gradient(225deg, rgba(225,29,72,0.3), rgba(249,115,22,0.2), rgba(6,182,212,0.2))']
            : ['linear-gradient(135deg, rgba(225,29,72,0.25), rgba(168,85,247,0.2), rgba(6,182,212,0.2))',
               'linear-gradient(225deg, rgba(139,92,246,0.25), rgba(225,29,72,0.3), rgba(168,85,247,0.15))'],
        }}
        transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute -inset-2 rounded-[2.5rem] blur-2xl opacity-70"
      />

      {/* Card */}
      <motion.div
        style={{ rotateX, rotateY }}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 90, delay: 0.15 }}
        className="relative rounded-[2rem] overflow-hidden"
        // Glassmorphism via inline—tailwind glass classes are in index.css
      >
        {/* Glass background */}
        <div
          className="absolute inset-0 rounded-[2rem]"
          style={{
            background: 'rgba(12,8,30,0.75)',
            backdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
        {/* Inner shimmer */}
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 md:p-10">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUTH PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successName, setSuccessName] = useState('');
  const { clearError } = useAuthStore();

  const switchToSignup = () => { setMode('signup'); clearError(); };
  const switchToLogin  = () => { setMode('login');  clearError(); };

  const handleSuccess = (name: string) => {
    setSuccessName(name || 'Friend');
    setShowSuccess(true);
    setTimeout(() => { window.location.href = '/'; }, 2400);
  };

  const isSignup = mode === 'signup';

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#08080f' }}>
      {/* Animated background color shift */}
      <motion.div
        animate={{
          background: isSignup
            ? 'radial-gradient(ellipse at 70% 30%, rgba(249,115,22,0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 30% 30%, rgba(225,29,72,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(109,40,217,0.08) 0%, transparent 60%)',
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        className="absolute inset-0 z-0"
      />

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
          <Scene isSignup={isSignup} />
        </Canvas>
      </div>

      {/* CSS blob overlays */}
      <div className="absolute inset-0 z-[1]">
        <BlobBackground isSignup={isSignup} />
      </div>

      {/* Bottom vignette */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-6 left-6 z-20 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
          <span className="text-white font-black text-lg">M</span>
        </div>
        <span className="font-display font-bold text-xl text-white/90 tracking-tight">MANGO BLISS</span>
      </motion.div>

      {/* Mode indicator pills (top right) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute top-6 right-6 z-20 flex gap-2"
      >
        {['login', 'signup'].map(m => (
          <button
            key={m}
            onClick={() => m === 'login' ? switchToLogin() : switchToSignup()}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              mode === m
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {m === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </motion.div>

      {/* Central card */}
      <div className="relative z-10 flex items-center justify-center min-h-full px-4 py-6 sm:py-20 overflow-y-auto mobile-scroll">
        <ParallaxCard isSignup={isSignup}>
          {/* Success overlay */}
          <AnimatePresence>
            {showSuccess && <SuccessOverlay name={successName} isSignup={isSignup} />}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <LoginForm
                key="login"
                onSuccess={handleSuccess}
                onSwitchToSignup={switchToSignup}
              />
            ) : (
              <SignupForm
                key="signup"
                onSuccess={handleSuccess}
                onSwitchToLogin={switchToLogin}
              />
            )}
          </AnimatePresence>
        </ParallaxCard>
      </div>

      {/* Floating mini-dots (CSS only) */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ['#f43f5e', '#f97316', '#8b5cf6', '#06b6d4'][i % 4],
              opacity: 0.3,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
