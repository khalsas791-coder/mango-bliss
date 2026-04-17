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
  Calendar,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  LogOut
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
      <div style="position:relative;width:16px;height:16px;background:${isLive ? '#e11d48' : '#94a3b8'};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createGndecbIcon = () => L.divIcon({
  className: 'custom-gndecb-icon',
  html: `
    <div style="width:36px;height:36px;background:#0f172a;border-radius:12px;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 4px 16px rgba(0,0,0,0.35);transform:rotate(45deg)">
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

// ─────────────────────────── Component ───────────────────────────

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  // ── Admin Auth Gate ──
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'delivery' | 'users' | 'locations'>('analytics');
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [focusPos, setFocusPos] = useState<[number, number] | null>(null);
  const [darkMap, setDarkMap] = useState(true);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const liveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>();

  useEffect(() => {
    fetchAll();
    const intv = setInterval(fetchAll, 8000);
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

  // Use Google Maps tiles for exact visual clarity
  const tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

  const tabs = [
    { key: 'analytics', label: 'Analytics', emoji: '📊' },
    { key: 'users', label: 'Users', emoji: '👥' },
    { key: 'locations', label: 'User Locations', emoji: '📍' },
    { key: 'delivery', label: 'Delivery Fleet', emoji: '🚛' },
  ];

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1" />
      </div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">{title}</p>
      <h4 className="text-3xl font-black text-slate-900">{value}</h4>
    </div>
  );

  // ── Login gate ──
  if (!adminToken) {
    return (
      <AnimatePresence>
        <AdminLogin
          onSuccess={handleAdminLogin}
          onClose={onClose}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">

        {/* ── Header ── */}
        <header className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold mb-4">
              <ArrowLeft size={20} />BACK TO STORE
            </button>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="font-display font-black text-5xl text-slate-900 uppercase">Admin Hub</h1>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Wifi size={12} />LIVE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white">
                <Lock size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
                <p className="text-sm font-black text-slate-900">Admin</p>
              </div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-2 px-5 py-4 bg-white border border-slate-100 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
              title="Sign out of admin"
            >
              <LogOut size={16} />Sign Out
            </button>
          </div>
        </header>

        {/* ── Tabs ── */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3.5 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? tab.key === 'users' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                  : tab.key === 'locations' ? 'bg-rose-600 text-white shadow-xl shadow-rose-200'
                  : tab.key === 'delivery' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
                  : 'bg-slate-900 text-white shadow-xl'
                  : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span>{tab.emoji}</span>{tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RefreshCw size={48} className="text-slate-200" />
            </motion.div>
            <p className="text-slate-400 font-bold mt-4 uppercase tracking-[0.2em] animate-pulse">Loading data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ══ ANALYTICS TAB ══ */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                  <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingBag} color="bg-slate-900" />
                  <StatCard title="Paid / COD" value={stats?.paidOrders || 0} icon={CheckCircle2} color="bg-emerald-500" />
                  <StatCard title="Active Deliveries" value={stats?.activeDeliveries || 0} icon={Truck} color="bg-rose-600" />
                  <StatCard title="Registered Users" value={registeredUsers.length} icon={Users} color="bg-blue-600" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-center">
                    <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Estimated Revenue</p>
                    <h2 className="text-5xl font-black">₹{((stats?.paidOrders || 0) * 60).toLocaleString()}</h2>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Tracked Locations</p>
                    <h2 className="text-5xl font-black text-slate-900">{fleetLocations.length}</h2>
                    <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {liveIds.size} live right now
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ USERS TAB ══ */}
            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                  {/* Table Header */}
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Users size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-display font-black text-2xl text-slate-900 uppercase">Registered Users</h3>
                        <p className="text-sm font-bold text-slate-400">{registeredUsers.length} total accounts</p>
                      </div>
                    </div>
                    <span className="bg-blue-50 text-blue-600 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest">
                      Login Data
                    </span>
                  </div>

                  {registeredUsers.length === 0 ? (
                    <div className="py-24 text-center">
                      <UserIcon size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No users registered yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">#</th>
                            <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                            <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
                            <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User ID</th>
                            <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Registered</th>
                            <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {registeredUsers.map((user: any, idx: number) => {
                            const userOrders = stats?.recentOrders?.filter((o: any) => o.userId?.toString() === user._id?.toString()) || [];
                            return (
                              <tr key={user._id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-8 py-5">
                                  <span className="font-black text-slate-300 text-sm">#{idx + 1}</span>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                      {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-black text-slate-900">{user.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="font-bold text-slate-600 text-sm">{user.email}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex items-center gap-2">
                                    <code className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-lg truncate max-w-[120px]">
                                      {user._id}
                                    </code>
                                    <button
                                      onClick={() => copyToClipboard(user._id, user._id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Copy ID"
                                    >
                                      {copiedId === user._id
                                        ? <Check size={14} className="text-emerald-500" />
                                        : <Copy size={14} className="text-slate-400 hover:text-slate-600" />
                                      }
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-600">{formatDate(user.createdAt)}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{timeAgo(user.createdAt)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-5">
                                  <span className={`text-xs font-black px-3 py-1.5 rounded-full ${
                                    userOrders.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                  }`}>
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

                {/* Security Note */}
                <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
                  <Lock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-700 leading-relaxed">
                    Passwords are stored as bcrypt hashes and are never shown here. Only public profile data is displayed.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ══ LOCATIONS TAB ══ */}
            {activeTab === 'locations' && (
              <motion.div key="locations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Map Dark Toggle */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setDarkMap(d => !d)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    {darkMap ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-slate-500" />}
                    {darkMap ? 'Light Map' : 'Dark Map'}
                  </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-6">
                  {/* Map */}
                  <div className="flex-1 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                    <h3 className="font-display font-black text-xl text-slate-900 uppercase mb-5 flex items-center gap-3">
                      <MapPin size={20} className="text-rose-500" />
                      Live User Locations
                      {fleetLocations.length > 0 && (
                        <span className="bg-rose-100 text-rose-600 text-xs font-black px-3 py-1 rounded-full">
                          {fleetLocations.length} tracked
                        </span>
                      )}
                    </h3>
                    <div className="h-[450px] w-full rounded-[2rem] overflow-hidden border-2 border-slate-50 shadow-inner bg-slate-100 relative z-0">
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
                            <Popup maxWidth={230}>
                              <div className="p-2 min-w-[190px]">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-black text-slate-900 text-xs uppercase truncate">{loc.orderId || 'Unknown Order'}</p>
                                  {liveIds.has(loc.orderId) && (
                                    <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />LIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 font-bold"><span className="text-slate-400">User:</span> {loc.userId}</p>
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

                  {/* Location List */}
                  <div className="xl:w-[380px] bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                    <h3 className="font-display font-black text-xl text-slate-900 uppercase mb-5 flex items-center gap-3">
                      <Users size={20} className="text-blue-500" />
                      All Tracked Users
                    </h3>

                    {fleetLocations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <MapPin size={48} className="text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No locations yet</p>
                        <p className="text-slate-300 text-xs mt-2">Users appear here after enabling Live Tracking</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {fleetLocations.map((loc) => {
                          const isLive = liveIds.has(loc.orderId);
                          return (
                            <motion.div
                              key={loc.orderId || loc.userId}
                              layout
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:border-rose-200 ${
                                isLive ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'
                              }`}
                              onClick={() => setFocusPos([loc.latitude, loc.longitude])}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <p className="font-black text-slate-900 text-xs uppercase truncate">
                                      {loc.userId === 'guest' ? 'Guest User' : loc.userId}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold ml-4 truncate">{loc.orderId}</p>
                                  <div className="flex gap-2 mt-2 ml-4 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                      📍 {Number(loc.latitude).toFixed(5)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                      {Number(loc.longitude).toFixed(5)}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 ml-4">
                                    {loc.timestamp ? timeAgo(loc.timestamp) : '—'}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setFocusPos([loc.latitude, loc.longitude]); }}
                                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                                  title="Focus on map"
                                >
                                  <Navigation size={14} />
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

            {/* ══ DELIVERY FLEET TAB ══ */}
            {activeTab === 'delivery' && (
              <motion.div key="delivery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                  <h3 className="font-display font-black text-2xl text-slate-900 uppercase mb-8 flex items-center gap-3">
                    <Truck size={24} className="text-emerald-500" />
                    Active Shipments
                  </h3>

                  {stats?.recentOrders?.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered').length === 0 ? (
                    <div className="py-16 text-center">
                      <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No active shipments.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats?.recentOrders
                        ?.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered')
                        .map((order: any) => {
                          const loc = fleetLocations.find(l => l.orderId === order.systemOrderId);
                          const isLive = liveIds.has(order.systemOrderId);
                          return (
                            <div key={order.systemOrderId} className={`flex flex-wrap items-center justify-between p-6 rounded-3xl border-2 gap-4 transition-all ${isLive ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50'}`}>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase tracking-widest">{order.systemOrderId}</span>
                                  {isLive && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Live GPS
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mt-2">{order.customerName}</h4>
                                <p className="text-sm font-bold text-slate-400">
                                  {order.statusPhase.replace(/_/g, ' ').toUpperCase()}
                                  {loc && ` • ${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                {loc && (
                                  <button
                                    onClick={() => { setFocusPos([loc.latitude, loc.longitude]); setActiveTab('locations'); }}
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                                    title="View on map"
                                  >
                                    <Navigation size={18} />
                                  </button>
                                )}
                                <div className="flex flex-col items-center px-5 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                                  <span className="text-xs text-slate-400 uppercase font-black tracking-widest">ETA</span>
                                  <span className="font-black text-xl text-slate-900">{order.etaMinutes}m</span>
                                </div>
                                <div className="flex bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                  {['preparing', 'shipped', 'out_for_delivery', 'delivered'].map((s, i) => (
                                    <button
                                      key={s}
                                      onClick={() => handleForceStatus(order.systemOrderId, s)}
                                      className={`px-3 py-3 text-[10px] font-black uppercase transition-colors ${i < 3 ? 'border-r border-slate-100' : ''} ${
                                        order.statusPhase === s ? 'bg-rose-50 text-rose-600' :
                                        s === 'delivered' ? 'text-emerald-600 hover:bg-emerald-50' :
                                        'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {['Prep', 'Ship', 'Out', 'Done'][i]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
