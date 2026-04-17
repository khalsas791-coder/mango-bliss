import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, Shield, AlertCircle, Loader2, X } from 'lucide-react';
import { API_URL } from '../config';

interface AdminLoginProps {
  onSuccess: (token: string) => void;
  onClose: () => void;
}

export function AdminLogin({ onSuccess, onClose }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.token) {
        sessionStorage.setItem('adminToken', data.token);
        onSuccess(data.token);
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Cannot reach server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 30 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-2xl"
        style={{ background: '#0f172a' }}
      >
        {/* Header */}
        <div className="relative px-10 pt-12 pb-10 overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-0 right-0 w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-700 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-500/30 mb-6">
              <Shield size={30} className="text-white" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Admin Access</h2>
            <p className="text-slate-400 text-sm font-medium mt-2">
              Restricted area. Authorized personnel only.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-10 pb-10 space-y-4">
          {/* Email */}
          <div className="relative">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Admin Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@example.com"
                required
                autoComplete="username"
                className="w-full pl-11 pr-4 py-4 rounded-2xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-600"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(225,29,72,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-11 pr-12 py-4 rounded-2xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-600"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(225,29,72,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(225,29,72,0.12)', border: '1px solid rgba(225,29,72,0.25)' }}
              >
                <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
                <p className="text-sm font-bold text-rose-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full py-4 rounded-2xl font-black text-white text-sm uppercase tracking-widest flex items-center justify-center gap-3 mt-2 transition-all disabled:opacity-60"
            style={{
              background: loading ? 'rgba(225,29,72,0.5)' : 'linear-gradient(135deg, #e11d48, #be123c)',
              boxShadow: loading ? 'none' : '0 8px 32px rgba(225,29,72,0.35)'
            }}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" />Verifying...</>
            ) : (
              <><Shield size={18} />Enter Admin Hub</>
            )}
          </motion.button>

          <p className="text-center text-xs text-slate-600 font-bold pt-2">
            🔒 All admin actions are logged and monitored
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
