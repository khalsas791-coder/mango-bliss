import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  ArrowLeft,
  MapPin,
  Users,
  Moon,
  Sun,
  Navigation,
  RefreshCw,
  Wifi
} from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io, Socket } from 'socket.io-client';
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

// ─────────────────────────── Helpers ───────────────────────────

function timeAgo(ts: string | Date): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

// ─────────────────────────── Component ───────────────────────────

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'delivery'>('analytics');
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [focusPos, setFocusPos] = useState<[number, number] | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [darkMap, setDarkMap] = useState(true);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const liveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [now, setNow] = useState(Date.now());

  // Update relative timestamps every 10s
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetchStats();
    const intv = setInterval(fetchStats, 8000);
    return () => clearInterval(intv);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await paymentService.getStats();
      setStats(data);

      const resp = await fetch(`${API_URL}/location/all`);
      const locData = await resp.json();
      if (locData.success) setFleetLocations(locData.locations);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Mark a location as "live" for 30s after a fleetUpdate
  const markLive = useCallback((orderId: string) => {
    setLiveIds(prev => new Set([...prev, orderId]));
    if (liveTimers.current[orderId]) clearTimeout(liveTimers.current[orderId]);
    liveTimers.current[orderId] = setTimeout(() => {
      setLiveIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 30000);
  }, []);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('fleetUpdate', (update: any) => {
      setFleetLocations(prev => {
        const idx = prev.findIndex((l: any) => l.orderId === update.orderId);
        const entry = { ...update, timestamp: new Date() };
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...entry };
          return next;
        }
        return [...prev, entry];
      });
      markLive(update.orderId);
    });

    return () => { newSocket.disconnect(); };
  }, [markLive]);

  const handleForceStatus = async (orderId: string, status: string) => {
    await paymentService.forceStatusAdmin(orderId, status);
    fetchStats();
  };

  const tileUrl = darkMap
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const StatCard = ({ title, value, icon: Icon, color, textColor }: any) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1" />
      </div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">{title}</p>
      <h4 className={`text-3xl font-black ${textColor || 'text-slate-900'}`}>{value}</h4>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">

        {/* ── Header ── */}
        <header className="flex justify-between items-start mb-8 flex-wrap gap-4">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold mb-4"
            >
              <ArrowLeft size={20} />
              BACK TO STORE
            </button>
            <div className="flex items-center gap-4">
              <h1 className="font-display font-black text-5xl text-slate-900 uppercase">Admin Hub</h1>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Wifi size={12} />
                LIVE
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">System</p>
              <p className="text-sm font-black text-slate-900">OPERATIONAL</p>
            </div>
          </div>
        </header>

        {/* ── Tabs ── */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {[
            { key: 'analytics', label: 'Analytics', color: 'bg-slate-900 text-white shadow-xl' },
            { key: 'delivery', label: '🚛 Delivery Fleet Hub', color: 'bg-rose-600 text-white shadow-xl shadow-rose-200' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
                activeTab === tab.key ? tab.color : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              {tab.label}
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
                  <StatCard title="Users Tracked" value={fleetLocations.length} icon={Users} color="bg-blue-600" />
                </div>

                {/* Revenue Banner */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Estimated Revenue</p>
                    <h2 className="text-5xl font-black">₹{((stats?.paidOrders || 0) * 60).toLocaleString()}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Failed Payments</p>
                    <h3 className="text-3xl font-black text-rose-400">{stats?.failedPayments || 0}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 min-h-[200px] flex flex-col items-center justify-center text-slate-200">
                  <BarChart3 size={64} className="mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">Charts Coming Soon</p>
                </div>
              </motion.div>
            )}

            {/* ══ DELIVERY FLEET TAB ══ */}
            {activeTab === 'delivery' && (
              <motion.div key="delivery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Dark Map Toggle */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setDarkMap(d => !d)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    {darkMap ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-slate-500" />}
                    {darkMap ? 'Light Map' : 'Dark Map'}
                  </button>
                </div>

                {/* ── Two-column layout: Map + User List ── */}
                <div className="flex flex-col xl:flex-row gap-6">

                  {/* Fleet Map */}
                  <div className="flex-1">
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                      <h3 className="font-display font-black text-xl text-slate-900 uppercase mb-5 flex items-center gap-3">
                        <MapPin size={20} className="text-rose-500" />
                        Live Fleet Map
                        {fleetLocations.length > 0 && (
                          <span className="bg-rose-100 text-rose-600 text-xs font-black px-3 py-1 rounded-full">
                            {fleetLocations.length} tracked
                          </span>
                        )}
                      </h3>
                      <div className="h-[420px] w-full rounded-[2rem] overflow-hidden border-2 border-slate-50 shadow-inner bg-slate-100 relative z-0">
                        <MapContainer
                          center={GNDECB_POS}
                          zoom={13}
                          style={{ height: '100%', width: '100%' }}
                          attributionControl={false}
                        >
                          <TileLayer url={tileUrl} />
                          <MapFocus center={focusPos} />

                          {/* GNDECB HQ Marker */}
                          <Marker position={GNDECB_POS} icon={createGndecbIcon()}>
                            <Popup>
                              <div className="p-2">
                                <p className="font-black text-slate-900 text-sm">GNDECB Campus</p>
                                <p className="text-xs text-slate-500">Mango Bliss HQ</p>
                              </div>
                            </Popup>
                          </Marker>

                          {/* User location markers */}
                          {fleetLocations.map((loc) => (
                            <Marker
                              key={loc.orderId || loc.userId}
                              position={[loc.latitude, loc.longitude]}
                              icon={createAdminUserIcon(liveIds.has(loc.orderId))}
                            >
                              <Popup maxWidth={220}>
                                <div className="p-2 min-w-[180px]">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-black text-slate-900 text-xs uppercase">
                                      {loc.orderId || 'User Location'}
                                    </p>
                                    {liveIds.has(loc.orderId) && (
                                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        LIVE
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-bold">
                                    <span className="text-slate-700">User:</span> {loc.userId}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-bold">
                                    <span className="text-slate-700">Lat:</span> {Number(loc.latitude).toFixed(6)}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-bold">
                                    <span className="text-slate-700">Lng:</span> {Number(loc.longitude).toFixed(6)}
                                  </p>
                                  <p className="text-[10px] text-rose-500 font-black mt-1.5 uppercase">
                                    {loc.timestamp ? timeAgo(loc.timestamp) : '—'}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      </div>
                    </div>
                  </div>

                  {/* ── User Locations List Panel ── */}
                  <div className="xl:w-[380px]">
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm h-full">
                      <h3 className="font-display font-black text-xl text-slate-900 uppercase mb-5 flex items-center gap-3">
                        <Users size={20} className="text-blue-500" />
                        Tracked Users
                      </h3>

                      {fleetLocations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <MapPin size={48} className="text-slate-200 mb-4" />
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No active locations</p>
                          <p className="text-slate-300 text-xs mt-2">Users will appear here when they enable tracking</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {fleetLocations.map((loc) => {
                            const isLive = liveIds.has(loc.orderId);
                            return (
                              <motion.div
                                key={loc.orderId || loc.userId}
                                layout
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:border-rose-200 hover:shadow-sm ${
                                  isLive ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'
                                }`}
                                onClick={() => {
                                  setFocusPos([loc.latitude, loc.longitude]);
                                  setActiveTab('delivery');
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                      <p className="font-black text-slate-900 text-xs uppercase truncate">
                                        {loc.userId || 'Anonymous'}
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold ml-4 truncate">
                                      {loc.orderId}
                                    </p>
                                    <div className="flex gap-3 mt-2 ml-4">
                                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                        {Number(loc.latitude).toFixed(4)}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                        {Number(loc.longitude).toFixed(4)}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 ml-4">
                                      {loc.timestamp ? timeAgo(loc.timestamp) : '—'}
                                    </p>
                                  </div>

                                  {/* Zoom button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFocusPos([loc.latitude, loc.longitude]);
                                    }}
                                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors shadow-sm"
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
                </div>

                {/* ── Active Shipments ── */}
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm mt-6">
                  <h3 className="font-display font-black text-2xl text-slate-900 uppercase mb-8 flex items-center gap-3">
                    <Truck size={24} className="text-rose-500" />
                    Active Shipments
                  </h3>

                  {stats?.recentOrders?.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered').length === 0 ? (
                    <div className="py-16 text-center">
                      <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No active shipments in transit.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats?.recentOrders
                        ?.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered')
                        .map((order: any) => {
                          const loc = fleetLocations.find(l => l.orderId === order.systemOrderId);
                          const isLive = liveIds.has(order.systemOrderId);
                          return (
                            <div
                              key={order.systemOrderId}
                              className={`flex flex-wrap items-center justify-between p-6 rounded-3xl border-2 gap-4 transition-all ${
                                isLive ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {order.systemOrderId}
                                  </span>
                                  {isLive && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                      Live GPS
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
                                    onClick={() => setFocusPos([loc.latitude, loc.longitude])}
                                    className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                                    title="Focus on map"
                                  >
                                    <Navigation size={18} />
                                  </button>
                                )}

                                <div className="flex flex-col items-center justify-center px-5 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                                  <span className="text-xs text-slate-400 uppercase font-black tracking-widest">ETA</span>
                                  <span className="font-black text-xl text-slate-900">{order.etaMinutes}m</span>
                                </div>

                                <div className="flex bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                  {['preparing', 'shipped', 'out_for_delivery', 'delivered'].map((s, i) => (
                                    <button
                                      key={s}
                                      onClick={() => handleForceStatus(order.systemOrderId, s)}
                                      className={`px-3 py-3 text-[10px] font-black uppercase transition-colors ${
                                        i < 3 ? 'border-r border-slate-100' : ''
                                      } ${
                                        order.statusPhase === s
                                          ? 'bg-rose-50 text-rose-600'
                                          : s === 'delivered'
                                          ? 'text-emerald-600 hover:bg-emerald-50'
                                          : 'text-slate-600 hover:bg-slate-100'
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
