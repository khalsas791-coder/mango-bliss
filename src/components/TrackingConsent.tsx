import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Eye, Lock, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface TrackingConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TrackingConsent({ onAccept, onDecline }: TrackingConsentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 40 }}
        transition={{ type: 'spring', damping: 22, stiffness: 250 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header Gradient */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-700 px-8 pt-10 pb-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-white/10 rounded-full" />

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-5">
              <MapPin size={32} className="text-rose-600" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-tight">
              Enable<br />Live Tracking?
            </h2>
            <p className="text-rose-100 text-sm font-medium mt-2 leading-relaxed">
              Share your location to get real-time delivery updates from GNDECB to your doorstep.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 -mt-6 relative z-10">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 space-y-4">
            {[
              {
                icon: Eye,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                title: 'What we collect',
                desc: 'Your GPS coordinates only — latitude & longitude'
              },
              {
                icon: Lock,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                title: 'How it\'s used',
                desc: 'To draw your delivery route and show your order status'
              },
              {
                icon: Shield,
                color: 'text-rose-500',
                bg: 'bg-rose-50',
                title: 'Your control',
                desc: 'You can stop sharing at any time with one tap'
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className={`w-10 h-10 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy badge */}
          <div className="flex items-center gap-2 mt-4 px-2">
            <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              We store only the minimum required data. Location tracking stops automatically when you close tracking.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-8 pt-6 pb-8 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-3 bg-rose-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-colors"
          >
            <CheckCircle size={20} />
            Yes, Enable Tracking
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onDecline}
            className="w-full flex items-center justify-center gap-3 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
            No Thanks
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
