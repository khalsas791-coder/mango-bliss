import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Truck,
  ArrowLeft,
  MapPin
} from 'lucide-react';
import { paymentService } from '../services/paymentService';

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'delivery'>('analytics');

  useEffect(() => {
    fetchStats();
    // Poll stats occasionally
    const intv = setInterval(fetchStats, 5000);
    return () => clearInterval(intv);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await paymentService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const handleForceStatus = async (orderId: string, status: string) => {
    await paymentService.forceStatusAdmin(orderId, status);
    fetchStats();
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">{title}</p>
      <h4 className="text-3xl font-black text-slate-900">{value}</h4>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] bg-slate-50 overflow-y-auto p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold mb-4"
            >
              <ArrowLeft size={20} />
              BACK TO STORE
            </button>
            <h1 className="font-display font-black text-5xl text-slate-900 uppercase">Admin Hub</h1>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Status</p>
              <p className="text-sm font-black text-slate-900">OPERATIONAL</p>
            </div>
          </div>
        </header>

        {/* Custom Tabs */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
              activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('delivery')}
            className={`px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all ${
              activeTab === 'delivery' ? 'bg-[#e11d48] text-white shadow-xl shadow-rose-200' : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            Delivery Fleet Hub
          </button>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <BarChart3 size={48} className="text-slate-200" />
            </motion.div>
            <p className="text-slate-400 font-bold mt-4 uppercase tracking-[0.2em] animate-pulse">Loading data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={ShoppingBag} color="bg-slate-900" />
                  <StatCard title="Paid/COD Orders" value={stats?.paidOrders || 0} icon={CheckCircle2} color="bg-emerald-500" />
                  <StatCard title="Active Deliveries" value={stats?.activeDeliveries || 0} icon={Truck} color="bg-[#e11d48]" />
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-center">
                    <h5 className="font-display text-2xl font-black mb-4 uppercase">Sales Revenue</h5>
                    <p className="text-4xl font-black">₹{((stats?.paidOrders || 0) * 60).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 min-h-[300px]">
                  <h3 className="font-display font-black text-2xl text-slate-900 uppercase mb-8">System Activity</h3>
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                     <BarChart3 size={64} className="mb-4 opacity-20" />
                     <p className="font-bold uppercase tracking-widest text-sm">Detailed logs will appear here</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'delivery' && (
              <motion.div key="delivery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                  <h3 className="font-display font-black text-2xl text-slate-900 uppercase mb-8">Active Shipments</h3>
                  
                  {stats?.recentOrders?.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered').length === 0 ? (
                    <div className="py-20 text-center">
                      <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No active shipments in transit.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {stats?.recentOrders?.filter((o: any) => o.statusPhase && o.statusPhase !== 'delivered').map((order: any) => (
                        <div key={order.systemOrderId} className="flex flex-wrap items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 gap-4">
                          <div>
                            <span className="text-xs font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase tracking-widest">
                              {order.systemOrderId}
                            </span>
                            <h4 className="text-lg font-black text-slate-900 mt-2">{order.customerName}</h4>
                            <p className="text-sm font-bold text-slate-400">Phase: {order.statusPhase.replace('_', ' ').toUpperCase()}</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <div className="flex flex-col items-center justify-center px-6 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <span className="text-xs text-slate-400 uppercase font-black tracking-widest">ETA</span>
                                <span className="font-black text-xl text-slate-900">{order.etaMinutes}m</span>
                             </div>

                             <div className="flex bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <button onClick={() => handleForceStatus(order.systemOrderId, 'preparing')} className="px-4 py-3 text-xs font-black uppercase text-slate-600 hover:bg-slate-100 border-r border-slate-100 transition-colors">Prep</button>
                                <button onClick={() => handleForceStatus(order.systemOrderId, 'shipped')} className="px-4 py-3 text-xs font-black uppercase text-slate-600 hover:bg-slate-100 border-r border-slate-100 transition-colors">Ship</button>
                                <button onClick={() => handleForceStatus(order.systemOrderId, 'out_for_delivery')} className="px-4 py-3 text-xs font-black uppercase text-slate-600 hover:bg-slate-100 border-r border-slate-100 transition-colors">Out</button>
                                <button onClick={() => handleForceStatus(order.systemOrderId, 'delivered')} className="px-4 py-3 text-xs font-black uppercase text-emerald-600 hover:bg-emerald-50 transition-colors">Deliver</button>
                             </div>
                          </div>
                        </div>
                      ))}
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
