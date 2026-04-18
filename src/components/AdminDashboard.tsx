import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  Truck,
  ArrowLeft,
  MapPin,
  Users,
  Moon,
  Sun,
  Navigation,
  RefreshCw,
  Wifi,
  Mail,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  LogOut,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Package,
  CreditCard,
  Banknote,
  Clock,
  AlertCircle,
  ChevronDown,
  X,
  Activity,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { AdminLogin } from './AdminLogin';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { SOCKET_URL, API_URL } from '../config';

// ─────────────────────────── Map Icons ───────────────────────────

const createAdminUserIcon = (isLive: boolean) => L.divIcon({
  className: 'custom-admin-icon',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      ${isLive ? `<div style="position:absolute;width:32px;height:32px;background:rgba(225,29,72,0.3);border-radius:50%;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
      <div style="position:relative;width:16px;height:16px;background:${isLive ? '#e11d48' : '#475569'};border-radius:50%;border:2.5px solid rgba(255,255,255,0.8);box-shadow:0 2px 10px rgba(0,0,0,0.5);"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createGndecbIcon = () => L.divIcon({
  className: 'custom-gndecb-icon',
  html: `
    <div style="width:36px;height:36px;background:linear-gradient(135deg,#e11d48,#9f1239);border-radius:12px;display:flex;align-items:center;justify-content:center;border:2.5px solid rgba(255,255,255,0.2);box-shadow:0 4px 20px rgba(225,29,72,0.5);transform:rotate(45deg)">
      <div style="transform:rotate(-45deg)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M2 7h20"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const GNDECB_POS: [number, number] = [17.9254, 77.5187];

function MapFocus({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15, { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

function timeAgo(ts: string | Date): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function formatDate(ts: string | Date): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─────────────────────────── Status Config ───────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  preparing:        { label: 'Preparing',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  shipped:          { label: 'Shipped',          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  out_for_delivery: { label: 'Out for Delivery', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  delivered:        { label: 'Delivered',        color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  awaiting_payment: { label: 'Awaiting Payment', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)' },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  success:    { label: 'Paid',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  paid:       { label: 'Paid',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cod_placed: { label: 'COD',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  pending:    { label: 'Pending',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  failed:     { label: 'Failed',     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
};

// ─────────────────────────── Sub-components ───────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
  return (
    <span style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_CONFIG[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{ color: cfg.color, background: cfg.bg }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
      {status === 'cod_placed' ? <Banknote size={10} /> : <CreditCard size={10} />}
      {cfg.label}
    </span>
  );
}

function StatCard({
  title, value, icon: Icon, gradient, subtext, sublabel
}: {
  title: string; value: string | number; icon: any;
  gradient: string; subtext?: string; sublabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl p-6 border border-white/[0.07]"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {/* Glow */}
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: gradient }} />
      <div className="flex justify-between items-start mb-5">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: gradient }}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mb-1">{title}</p>
      <h4 className="text-3xl font-black text-white">{value}</h4>
      {subtext && (
        <p className="text-xs font-bold mt-2" style={{ color: '#10b981' }}>
          {subtext} <span className="text-slate-500">{sublabel}</span>
        </p>
      )}
    </motion.div>
  );
}

// ─────────────────────────── Main Component ───────────────────────────

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [adminToken, setAdminToken] = useState<string | null>(
    () => sessionStorage.getItem('adminToken')
  );

  const handleAdminLogin = (token: string) => {
    sessionStorage.setItem('adminToken', token);
    setAdminToken(token);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('adminToken');
    setAdminToken(null);
  };

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshTick, setRefreshTick] = useState(0);
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'users' | 'locations' | 'delivery'>('analytics');
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [focusPos, setFocusPos] = useState<[number, number] | null>(null);
  const [darkMap, setDarkMap] = useState(true);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const liveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Orders tab state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPayFilter, setOrderPayFilter] = useState('all');

  // Users tab state
  const [userSearch, setUserSearch] = useState('');

  // Refresh ticker
  useEffect(() => {
    const t = setInterval(() => setRefreshTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchAll();
    const intv = setInterval(fetchAll, 10000);
    return () => clearInterval(intv);
  }, []);

  const fetchAll = async () => {
    if (!sessionStorage.getItem('adminToken')) return;
    try {
      const token = sessionStorage.getItem('adminToken') || '';
      const [statsData, locData, userData] = await Promise.all([
        paymentService.getStats(),
        fetch(`${API_URL}/location/all`).then(r => r.json()),
        fetch(`${API_URL}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setStats(statsData);
      if (locData.success) setFleetLocations(locData.locations);
      if (userData.success) setRegisteredUsers(userData.users);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const markLive = useCallback((orderId: string) => {
    setLiveIds(prev => new Set([...prev, orderId]));
    if (liveTimers.current[orderId]) clearTimeout(liveTimers.current[orderId]);
    liveTimers.current[orderId] = setTimeout(() => {
      setLiveIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
    }, 30000);
  }, []);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    newSocket.on('fleetUpdate', (update: any) => {
      setFleetLocations(prev => {
        const idx = prev.findIndex((l: any) => l.orderId === update.orderId);
        const entry = { ...update, timestamp: new Date() };
        if (idx > -1) { const n = [...prev]; n[idx] = { ...n[idx], ...entry }; return n; }
        return [...prev, entry];
      });
      markLive(update.orderId);
    });
    return () => { newSocket.disconnect(); };
  }, [markLive]);

  const handleForceStatus = async (orderId: string, status: string) => {
    await paymentService.forceStatusAdmin(orderId, status);
    fetchAll();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tileUrl = darkMap
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

  // ── Computed data ──
  const allOrders: any[] = stats?.recentOrders || [];
  const totalRevenue = allOrders
    .filter((o: any) => ['success', 'paid', 'cod_placed'].includes(o.paymentStatus))
    .reduce((s: number, o: any) => s + (o.amount || 0), 0);
  const onlineRevenue = allOrders
    .filter((o: any) => ['success', 'paid'].includes(o.paymentStatus))
    .reduce((s: number, o: any) => s + (o.amount || 0), 0);
  const codRevenue = allOrders
    .filter((o: any) => o.paymentStatus === 'cod_placed')
    .reduce((s: number, o: any) => s + (o.amount || 0), 0);

  const filteredOrders = allOrders.filter((o: any) => {
    const matchSearch = !orderSearch ||
      o.customerName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.systemOrderId?.toLowerCase().includes(orderSearch.toLowerCase());
    const matchStatus = orderStatusFilter === 'all' || o.statusPhase === orderStatusFilter;
    const matchPay = orderPayFilter === 'all' || o.paymentStatus === orderPayFilter ||
      (orderPayFilter === 'cod' && o.paymentMethod === 'cod') ||
      (orderPayFilter === 'online' && o.paymentMethod !== 'cod');
    return matchSearch && matchStatus && matchPay;
  });

  const filteredUsers = registeredUsers.filter((u: any) =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const tabs = [
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'orders',    label: 'Orders',    icon: ShoppingBag },
    { key: 'users',     label: 'Users',     icon: Users },
    { key: 'locations', label: 'Locations', icon: MapPin },
    { key: 'delivery',  label: 'Fleet',     icon: Truck },
  ];

  // ── Login gate ──
  if (!adminToken) {
    return (
      <AnimatePresence>
        <AdminLogin onSuccess={handleAdminLogin} onClose={onClose} />
      </AnimatePresence>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[500] overflow-y-auto"
      style={{ background: '#080f1a' }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #e11d48, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10">

        {/* ── Header ── */}
        <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-300 transition-colors font-bold text-xs uppercase tracking-widest mb-5"
            >
              <ArrowLeft size={16} /> Back to Store
            </button>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="font-display font-black text-4xl md:text-5xl text-white uppercase tracking-tighter">
                Admin Hub
              </h1>
              <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                <Wifi size={10} />
                Live
              </span>
            </div>
            {/* Last refresh badge */}
            <p className="text-slate-600 text-xs font-bold mt-2 flex items-center gap-1.5">
              <Activity size={11} className="text-emerald-500" />
              Refreshed {timeAgo(lastRefresh)}
            </p>
          </div>

          {/* Admin identity + sign out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.07]"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center">
                <Lock size={15} className="text-rose-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Signed in as</p>
                <p className="text-sm font-black text-white">Admin</p>
              </div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/[0.07] font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </header>

        {/* ── Tab Bar ── */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all whitespace-nowrap flex-shrink-0"
                style={active ? {
                  background: 'linear-gradient(135deg, #e11d48, #9f1239)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(225,29,72,0.35)'
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: '#64748b',
                  border: '1px solid rgba(255,255,255,0.07)'
                }}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Loading state ── */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RefreshCw size={40} className="text-rose-600/40" />
            </motion.div>
            <p className="text-slate-600 font-bold mt-4 uppercase tracking-[0.2em] text-xs animate-pulse">Loading data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ══════════ ANALYTICS TAB ══════════ */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Stat cards grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Total Orders"
                    value={stats?.totalOrders || 0}
                    icon={ShoppingBag}
                    gradient="linear-gradient(135deg,#e11d48,#9f1239)"
                    subtext={`${stats?.codOrders || 0} COD`}
                    sublabel="orders"
                  />
                  <StatCard
                    title="Paid Orders"
                    value={stats?.paidOrders || 0}
                    icon={CheckCircle2}
                    gradient="linear-gradient(135deg,#10b981,#059669)"
                    subtext={`${stats?.failedPayments || 0} failed`}
                    sublabel="payments"
                  />
                  <StatCard
                    title="Active Deliveries"
                    value={stats?.activeDeliveries || 0}
                    icon={Truck}
                    gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)"
                  />
                  <StatCard
                    title="Registered Users"
                    value={registeredUsers.length}
                    icon={Users}
                    gradient="linear-gradient(135deg,#3b82f6,#2563eb)"
                    subtext={`${fleetLocations.length} tracked`}
                    sublabel="locations"
                  />
                </div>

                {/* Revenue breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Total Revenue */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="md:col-span-1 relative overflow-hidden rounded-3xl p-7 border border-white/[0.07]"
                    style={{ background: 'linear-gradient(135deg, rgba(225,29,72,0.15), rgba(159,18,57,0.08))' }}
                  >
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
                      style={{ background: '#e11d48' }} />
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black mb-2">Total Revenue</p>
                    <h2 className="text-4xl font-black text-white">{formatCurrency(totalRevenue)}</h2>
                    <div className="flex gap-4 mt-4">
                      <div>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Online</p>
                        <p className="text-base font-black text-emerald-400">{formatCurrency(onlineRevenue)}</p>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">COD</p>
                        <p className="text-base font-black text-amber-400">{formatCurrency(codRevenue)}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Delivery Status breakdown */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="md:col-span-2 rounded-3xl p-7 border border-white/[0.07]"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black mb-5">Delivery Status Breakdown</p>
                    <div className="space-y-3">
                      {[
                        { key: 'preparing',        label: 'Preparing',        color: '#f59e0b' },
                        { key: 'shipped',           label: 'Shipped',          color: '#3b82f6' },
                        { key: 'out_for_delivery',  label: 'Out for Delivery', color: '#8b5cf6' },
                        { key: 'delivered',         label: 'Delivered',        color: '#10b981' },
                      ].map(({ key, label, color }) => {
                        const count = allOrders.filter((o: any) => o.statusPhase === key).length;
                        const pct = allOrders.length > 0 ? (count / allOrders.length) * 100 : 0;
                        return (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-400">{label}</span>
                              <span className="text-xs font-black text-white">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>

                {/* Live tracking summary */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="rounded-3xl p-7 border border-white/[0.07] flex items-center justify-between flex-wrap gap-4"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black mb-1">Fleet Tracking</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-black text-white">{fleetLocations.length}</h3>
                      <span className="text-slate-500 text-sm font-bold">tracked locations</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-2xl font-black text-white">{liveIds.size}</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Now</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center mb-1">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span className="text-2xl font-black text-white">{fleetLocations.length - liveIds.size}</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Idle</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ══════════ ORDERS TAB ══════════ */}
            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Filters bar */}
                <div className="flex flex-wrap gap-3 mb-5">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search order or customer..."
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  {/* Status filter */}
                  <div className="relative">
                    <select
                      value={orderStatusFilter}
                      onChange={e => setOrderStatusFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-3 rounded-2xl text-sm font-black text-slate-300 outline-none cursor-pointer transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <option value="all" style={{background:'#0f172a'}}>All Status</option>
                      <option value="preparing" style={{background:'#0f172a'}}>Preparing</option>
                      <option value="shipped" style={{background:'#0f172a'}}>Shipped</option>
                      <option value="out_for_delivery" style={{background:'#0f172a'}}>Out for Delivery</option>
                      <option value="delivered" style={{background:'#0f172a'}}>Delivered</option>
                      <option value="awaiting_payment" style={{background:'#0f172a'}}>Awaiting Payment</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>

                  {/* Payment filter */}
                  <div className="relative">
                    <select
                      value={orderPayFilter}
                      onChange={e => setOrderPayFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-3 rounded-2xl text-sm font-black text-slate-300 outline-none cursor-pointer transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <option value="all" style={{background:'#0f172a'}}>All Payments</option>
                      <option value="online" style={{background:'#0f172a'}}>Online / Razorpay</option>
                      <option value="cod" style={{background:'#0f172a'}}>Cash on Delivery</option>
                      <option value="pending" style={{background:'#0f172a'}}>Pending</option>
                      <option value="failed" style={{background:'#0f172a'}}>Failed</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>

                  {/* Result count */}
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Orders table */}
                <div className="rounded-3xl overflow-hidden border border-white/[0.07]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {filteredOrders.length === 0 ? (
                    <div className="py-24 text-center">
                      <Package size={48} className="mx-auto text-slate-700 mb-4" />
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">No orders found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {['Order ID', 'Customer', 'Amount', 'Payment', 'Status', 'Date', 'Action'].map(h => (
                              <th key={h} className="text-left px-5 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order: any) => (
                            <tr
                              key={order.systemOrderId}
                              className="group transition-colors"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <code className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">
                                    {order.systemOrderId?.slice(-12)}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(order.systemOrderId, order.systemOrderId)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Copy full ID"
                                  >
                                    {copiedId === order.systemOrderId
                                      ? <Check size={12} className="text-emerald-400" />
                                      : <Copy size={12} className="text-slate-500 hover:text-slate-300" />
                                    }
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                                    {order.customerName?.charAt(0)?.toUpperCase()}
                                  </div>
                                  <span className="text-sm font-bold text-white whitespace-nowrap">{order.customerName}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-sm font-black text-white">{formatCurrency(order.amount)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <PaymentBadge status={order.paymentStatus} />
                              </td>
                              <td className="px-5 py-4">
                                <StatusBadge status={order.statusPhase} />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{formatDate(order.createdAt)}</span>
                                  <span className="text-[10px] font-bold text-slate-600">{timeAgo(order.createdAt)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                {/* Inline status changer */}
                                {order.statusPhase !== 'delivered' && (
                                  <div className="flex gap-1 flex-wrap">
                                    {[
                                      { s: 'preparing', label: 'Prep', color: '#f59e0b' },
                                      { s: 'shipped', label: 'Ship', color: '#3b82f6' },
                                      { s: 'out_for_delivery', label: 'OFD', color: '#8b5cf6' },
                                      { s: 'delivered', label: 'Done', color: '#10b981' },
                                    ].map(({ s, label, color }) => (
                                      <button
                                        key={s}
                                        onClick={() => handleForceStatus(order.systemOrderId, s)}
                                        title={`Set to ${s}`}
                                        className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                        style={
                                          order.statusPhase === s
                                            ? { background: `${color}22`, color, border: `1px solid ${color}44` }
                                            : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }
                                        }
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {order.statusPhase === 'delivered' && (
                                  <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black">
                                    <CheckCircle2 size={12} /> Delivered
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════ USERS TAB ══════════ */}
            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Header + search */}
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                      <Users size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl text-white uppercase">Registered Users</h3>
                      <p className="text-xs font-bold text-slate-600">{registeredUsers.length} total accounts</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-10 pr-4 py-3 rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none w-64 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    {userSearch && (
                      <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary mini-cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Total Users',      value: registeredUsers.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   icon: Users       },
                    { label: 'Logged In',         value: registeredUsers.filter((u: any) => u.lastLoginAt).length,  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle2 },
                    { label: 'Location Shared',   value: registeredUsers.filter((u: any) => u.lastKnownLat).length, color: '#e11d48', bg: 'rgba(225,29,72,0.1)',   icon: MapPin      },
                    { label: 'Total Logins',      value: registeredUsers.reduce((s: number, u: any) => s + (u.loginCount || 0), 0), color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: Activity },
                  ].map(({ label, value, color, bg, icon: Icon }) => (
                    <div key={label} className="rounded-2xl p-4 border border-white/[0.07]" style={{ background: bg }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} style={{ color }} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                      </div>
                      <p className="text-2xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl overflow-hidden border border-white/[0.07]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {filteredUsers.length === 0 ? (
                    <div className="py-24 text-center">
                      <UserIcon size={48} className="mx-auto text-slate-700 mb-4" />
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">
                        {userSearch ? 'No users match your search' : 'No users registered yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {['#', 'User', 'Email', 'Last Login', 'Logins', 'Location Access', 'Orders'].map(h => (
                              <th key={h} className="text-left px-5 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user: any, idx: number) => {
                            const userOrders = allOrders.filter((o: any) => o.userId?.toString() === user._id?.toString());
                            const hasLocation = !!(user.lastKnownLat && user.lastKnownLng);
                            const hasLoggedIn = !!user.lastLoginAt;
                            return (
                              <tr
                                key={user._id}
                                className="group transition-colors"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <td className="px-5 py-4">
                                  <span className="font-black text-slate-700 text-sm">#{idx + 1}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                      {user.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="font-bold text-white text-sm block">{user.name}</span>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <code className="text-[9px] font-mono text-slate-600 truncate max-w-[80px]">{user._id}</code>
                                        <button onClick={() => copyToClipboard(user._id, user._id)} className="opacity-0 group-hover:opacity-100 transition-opacity" title="Copy ID">
                                          {copiedId === user._id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-slate-600 hover:text-slate-400" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <Mail size={12} className="text-slate-600 flex-shrink-0" />
                                    <span className="text-xs font-bold text-slate-400">{user.email}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  {hasLoggedIn ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span className="text-xs font-black text-emerald-400 whitespace-nowrap">{timeAgo(user.lastLoginAt)}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-600 ml-3">{formatDate(user.lastLoginAt)}</span>
                                      {user.lastLoginIP && <span className="text-[9px] font-mono text-slate-700 ml-3">IP: {user.lastLoginIP}</span>}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-700">Never logged in</span>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                                      style={(user.loginCount || 0) > 0 ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' } : { background: 'rgba(255,255,255,0.05)' }}>
                                      <Activity size={12} style={{ color: (user.loginCount || 0) > 0 ? '#8b5cf6' : '#334155' }} />
                                    </div>
                                    <span className="text-sm font-black" style={{ color: (user.loginCount || 0) > 0 ? '#c4b5fd' : '#334155' }}>{user.loginCount || 0}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  {hasLocation ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-[10px] font-black text-rose-400"
                                          style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                                          <MapPin size={9} /> Shared
                                        </span>
                                        <button
                                          onClick={() => { setFocusPos([user.lastKnownLat, user.lastKnownLng]); setActiveTab('locations'); }}
                                          className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                                          title="View on map"
                                        >Map →</button>
                                      </div>
                                      <span className="text-[9px] font-mono text-slate-600">{Number(user.lastKnownLat).toFixed(4)}, {Number(user.lastKnownLng).toFixed(4)}</span>
                                      {user.lastLocationAt && <span className="text-[9px] font-bold text-slate-700">{timeAgo(user.lastLocationAt)}</span>}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-black text-slate-700 flex items-center gap-1"><X size={10} /> Not shared</span>
                                  )}
                                </td>
                                <td className="px-5 py-4">
                                  <span className="text-xs font-black px-3 py-1.5 rounded-full"
                                    style={userOrders.length > 0
                                      ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                                      : { background: 'rgba(255,255,255,0.05)', color: '#475569' }}>
                                    {userOrders.length} order{userOrders.length !== 1 ? 's' : ''}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Security note */}
                <div className="mt-4 flex items-start gap-3 rounded-2xl px-5 py-4"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Lock size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-600/80">
                    Passwords are never shown. Login activity (last login, count, IP) is recorded on every sign-in. Location coordinates are stamped when a user enables Live Tracking during an order.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ══════════ LOCATIONS TAB ══════════ */}
            {activeTab === 'locations' && (
              <motion.div key="locations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Map toolbar */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                    <MapPin size={14} className="text-rose-500" />
                    {fleetLocations.length} tracked user{fleetLocations.length !== 1 ? 's' : ''}
                    {liveIds.size > 0 && (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {liveIds.size} live
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setDarkMap(d => !d)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
                  >
                    {darkMap ? <Sun size={13} className="text-yellow-400" /> : <Moon size={13} className="text-slate-400" />}
                    {darkMap ? 'Light Map' : 'Dark Map'}
                  </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-5">
                  {/* Map */}
                  <div className="flex-1 rounded-3xl p-5 border border-white/[0.07] overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="h-[480px] w-full rounded-2xl overflow-hidden relative z-0">
                      <MapContainer center={GNDECB_POS} zoom={12} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                        <TileLayer url={tileUrl} />
                        <MapFocus center={focusPos} />
                        <Marker position={GNDECB_POS} icon={createGndecbIcon()}>
                          <Popup>
                            <div className="p-2">
                              <p className="font-black text-slate-900 text-sm">GNDECB Campus</p>
                              <p className="text-xs text-slate-500">Mango Bliss HQ</p>
                            </div>
                          </Popup>
                        </Marker>
                        {fleetLocations.map((loc) => (
                          <Marker
                            key={loc.orderId || loc.userId}
                            position={[loc.latitude, loc.longitude]}
                            icon={createAdminUserIcon(liveIds.has(loc.orderId))}
                          >
                            <Popup maxWidth={240}>
                              <div className="p-2 min-w-[200px]">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-black text-slate-900 text-xs uppercase truncate">{loc.orderId || 'Unknown Order'}</p>
                                  {liveIds.has(loc.orderId) && (
                                    <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />LIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 font-bold"><span className="text-slate-400">User:</span> {loc.userName || loc.userId}</p>
                                <p className="text-[11px] text-slate-600 font-bold"><span className="text-slate-400">Lat:</span> {Number(loc.latitude).toFixed(6)}</p>
                                <p className="text-[11px] text-slate-600 font-bold"><span className="text-slate-400">Lng:</span> {Number(loc.longitude).toFixed(6)}</p>
                                <p className="text-[10px] text-rose-500 font-black mt-2 uppercase">{loc.timestamp ? timeAgo(loc.timestamp) : '—'}</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>

                  {/* Location list */}
                  <div className="xl:w-[360px] rounded-3xl p-5 border border-white/[0.07]"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <h3 className="font-display font-black text-base text-white uppercase mb-4 flex items-center gap-2">
                      <Users size={16} className="text-blue-400" /> All Tracked Users
                    </h3>

                    {fleetLocations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <MapPin size={40} className="text-slate-700 mb-4" />
                        <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No locations yet</p>
                        <p className="text-slate-700 text-[10px] mt-2">Users appear here after enabling Live Tracking</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                        {fleetLocations.map((loc) => {
                          const isLive = liveIds.has(loc.orderId);
                          return (
                            <motion.div
                              key={loc.orderId || loc.userId}
                              layout
                              className="p-4 rounded-2xl cursor-pointer transition-all"
                              style={isLive
                                ? { background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }
                                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                              }
                              onClick={() => setFocusPos([loc.latitude, loc.longitude])}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                    <p className="font-black text-white text-xs uppercase truncate">
                                      {loc.userName || (loc.userId === 'guest' ? 'Guest User' : loc.userId)}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-600 font-bold ml-4 truncate">{loc.orderId}</p>
                                  <div className="flex gap-2 mt-2 ml-4 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg">
                                      📍 {Number(loc.latitude).toFixed(5)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg">
                                      {Number(loc.longitude).toFixed(5)}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-1.5 ml-4">
                                    {loc.timestamp ? timeAgo(loc.timestamp) : '—'}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setFocusPos([loc.latitude, loc.longitude]); }}
                                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-rose-400 hover:text-rose-300"
                                  style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)' }}
                                  title="Focus on map"
                                >
                                  <Navigation size={13} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════ DELIVERY FLEET TAB ══════════ */}
            {activeTab === 'delivery' && (
              <motion.div key="delivery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>
                    <Truck size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-white uppercase">Active Shipments</h3>
                    <p className="text-xs font-bold text-slate-600">
                      {allOrders.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered').length} in progress
                    </p>
                  </div>
                </div>

                {allOrders.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered').length === 0 ? (
                  <div className="py-24 text-center rounded-3xl border border-white/[0.07]"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Truck size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">No active shipments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allOrders
                      .filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered')
                      .map((order: any) => {
                        const loc = fleetLocations.find(l => l.orderId === order.systemOrderId);
                        const isLive = liveIds.has(order.systemOrderId);
                        const statusCfg = STATUS_CONFIG[order.statusPhase] || { color: '#94a3b8', bg: 'transparent', label: order.statusPhase };
                        return (
                          <motion.div
                            key={order.systemOrderId}
                            layout
                            className="rounded-3xl p-5 sm:p-6 border transition-all"
                            style={isLive
                              ? { background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }
                              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }
                            }
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Order ID + live badge */}
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <code className="text-xs font-mono text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full">
                                    {order.systemOrderId}
                                  </code>
                                  {isLive && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400">
                                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                      Live GPS
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg font-black text-white">{order.customerName}</h4>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <StatusBadge status={order.statusPhase} />
                                  <PaymentBadge status={order.paymentStatus} />
                                  <span className="text-xs font-black text-slate-500">{formatCurrency(order.amount)}</span>
                                  {loc && (
                                    <span className="text-[10px] font-bold text-slate-600">
                                      {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {loc && (
                                  <button
                                    onClick={() => { setFocusPos([loc.latitude, loc.longitude]); setActiveTab('locations'); }}
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors text-rose-400 hover:text-rose-300"
                                    style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)' }}
                                    title="View on map"
                                  >
                                    <Navigation size={16} />
                                  </button>
                                )}
                                <div className="flex items-center px-4 py-2.5 rounded-2xl gap-2"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  <Clock size={13} className="text-slate-500" />
                                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ETA</span>
                                  <span className="font-black text-white">{order.etaMinutes}m</span>
                                </div>
                                {/* Status buttons */}
                                <div className="flex rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                  {['preparing', 'shipped', 'out_for_delivery', 'delivered'].map((s, i) => (
                                    <button
                                      key={s}
                                      onClick={() => handleForceStatus(order.systemOrderId, s)}
                                      className="px-3 py-2.5 text-[9px] font-black uppercase tracking-wider transition-colors"
                                      style={{
                                        borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                                        background: order.statusPhase === s ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.04)',
                                        color: order.statusPhase === s ? '#f43f5e' : '#475569'
                                      }}
                                    >
                                      {['Prep', 'Ship', 'Out', 'Done'][i]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
