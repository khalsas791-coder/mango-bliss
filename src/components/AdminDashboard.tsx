import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Truck,
  ArrowLeft
} from 'lucide-react';
import { paymentService } from '../services/paymentService';

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await paymentService.getStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold mb-4"
            >
              <ArrowLeft size={20} />
              BACK TO STORE
            </button>
            <h1 className="font-display font-black text-5xl text-slate-900 uppercase">Admin Dashboard</h1>
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

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <BarChart3 size={48} className="text-slate-200" />
            </motion.div>
            <p className="text-slate-400 font-bold mt-4 uppercase tracking-[0.2em] animate-pulse">Loading analytics...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
              title="Total Orders" 
              value={stats?.totalOrders || 0} 
              icon={ShoppingBag} 
              color="bg-slate-900" 
            />
            <StatCard 
              title="Paid Orders" 
              value={stats?.paidOrders || 0} 
              icon={CheckCircle2} 
              color="bg-emerald-500" 
            />
            <StatCard 
              title="Pending Payments" 
              value={stats?.pendingOrders || 0} 
              icon={Clock} 
              color="bg-amber-500" 
            />
            <StatCard 
              title="Failed Payments" 
              value={stats?.failedPayments || 0} 
              icon={AlertCircle} 
              color="bg-rose-500" 
            />
            <StatCard 
              title="COD Orders" 
              value={stats?.codOrders || 0} 
              icon={Truck} 
              color="bg-blue-500" 
            />
            <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col justify-center">
              <h5 className="font-display text-2xl font-black mb-4 uppercase">Sales Revenue</h5>
              <p className="text-5xl font-black">₹{((stats?.paidOrders || 0) * 60).toLocaleString()}</p>
              <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">Estimated based on ₹60 rate</p>
            </div>
          </div>
        )}

        <div className="mt-12 bg-white rounded-[3rem] p-10 border border-slate-100 min-h-[400px]">
          <h3 className="font-display font-black text-2xl text-slate-900 uppercase mb-8">Recent Activity</h3>
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
             <BarChart3 size={64} className="mb-4 opacity-20" />
             <p className="font-bold uppercase tracking-widest text-sm">Detailed logs will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
