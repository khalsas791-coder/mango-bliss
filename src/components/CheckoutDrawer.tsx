import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Truck, Smartphone, Loader2, CheckCircle2, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { useAuthStore } from '../store/authStore';

interface CheckoutDrawerProps {
  onClose: () => void;
  onPaymentSuccess: (orderId: string) => void;
  productInfo: {
    bottleName: string;
    flavorName: string;
    toppingName: string;
    quantity: number;
    couponApplied: boolean;
  };
}

export function CheckoutDrawer({ onClose, onPaymentSuccess, productInfo }: CheckoutDrawerProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success' | 'error'>('details');
  const [errorMsg, setErrorMsg] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [customer, setCustomer] = useState({
    name: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    address: '123 Bliss Street, Flavor Town',
    city: 'Mumbai',
    state: 'MH',
    pincode: '400001'
  });

  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      setCustomer(prev => ({
        ...prev,
        name: user.name,
        email: user.email
      }));
    }
  }, [isAuthenticated, user]);

  const basePrice = 60.00;
  const subtotal = basePrice * productInfo.quantity;
  const discount = productInfo.couponApplied ? subtotal * 0.10 : 0;
  const delivery = 5.00;
  const gst = 2.00;
  const total = subtotal - discount + delivery + gst;

  const handlePayment = async (method: string) => {
    setStep('processing');
    setErrorMsg('');
    setIsNetworkError(false);

    // Attempt to get GPS coordinates
    let userLat = 17.9254;
    let userLng = 77.5187; // fallback GNDECB

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 10000 });
      });
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
    } catch {
      console.warn('GPS unavailable, using GNDECB as fallback');
    }

    try {
      // Create the order
      let orderRes: any;
      try {
        orderRes = await paymentService.createOrder({
          productName: `Mango Bliss: ${productInfo.flavorName}`,
          amount: total,
          customerName: customer.name,
          paymentMethod: method,
          userLat,
          userLng,
          userId: user?.id
        });
      } catch (fetchErr: any) {
        // Network / server-down error
        setIsNetworkError(true);
        setErrorMsg('Cannot reach the server. Make sure the backend is running on port 5000.');
        setStep('error');
        return;
      }

      if (!orderRes.success) {
        setErrorMsg(orderRes.message || 'Order creation failed. Please try again.');
        setStep('error');
        return;
      }

      const systemOrderId = orderRes.order.systemOrderId;

      // COD / UPI — instant success (no payment gateway)
      if (method === 'cod' || method === 'upi') {
        setTimeout(() => {
          setStep('success');
          setTimeout(() => onPaymentSuccess(systemOrderId), 2000);
        }, 800);
        return;
      }

      // Card — use mock flow (runs in demo mode without Razorpay SDK)
      const isMock = !orderRes.razorpayOrder?.id || orderRes.razorpayOrder.id.includes('mock');

      if (isMock || method === 'card') {
        setTimeout(async () => {
          try {
            const verifyRes = await paymentService.verifyPayment({
              razorpay_payment_id: `pay_mock_${Math.floor(Math.random() * 100000)}`,
              razorpay_order_id: orderRes.razorpayOrder?.id || `order_mock_${Date.now()}`,
              razorpay_signature: 'mock_signature',
              systemOrderId
            });

            if (verifyRes.success) {
              setStep('success');
              setTimeout(() => onPaymentSuccess(systemOrderId), 2000);
            } else {
              setErrorMsg(verifyRes.message || 'Payment verification failed.');
              setStep('error');
            }
          } catch (err: any) {
            setErrorMsg('Verification error. Please try again.');
            setStep('error');
          }
        }, 1400);
        return;
      }

      // Real Razorpay flow (only runs when SDK is available)
      if (typeof (window as any).Razorpay === 'undefined') {
        setErrorMsg('Payment gateway (Razorpay) is not loaded. Please use UPI or Cash on Delivery.');
        setStep('error');
        return;
      }

      const options = {
        key: (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'Mango Bliss',
        description: 'Complete your purchase',
        order_id: orderRes.razorpayOrder.id,
        handler: async function (response: any) {
          setStep('processing');
          try {
            const verifyRes = await paymentService.verifyPayment({ ...response, systemOrderId });
            if (verifyRes.success) {
              setStep('success');
              setTimeout(() => onPaymentSuccess(systemOrderId), 2000);
            } else {
              setErrorMsg(verifyRes.message || 'Verification failed.');
              setStep('error');
            }
          } catch {
            setErrorMsg('Verification error. Please contact support.');
            setStep('error');
          }
        },
        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        theme: { color: '#e11d48' },
        modal: { ondismiss: () => setStep('payment') }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => {
        setErrorMsg('Payment was declined. Please try a different method.');
        setStep('error');
      });
      rzp.open();

    } catch (err: any) {
      console.error('[Checkout] Unhandled error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
      setStep('error');
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-slate-50 z-[400] shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100">
        <h3 className="font-display font-black text-2xl text-slate-900 uppercase">Checkout</h3>
        <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">

        {/* Processing */}
        {step === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase">Processing Payment</h3>
            <p className="text-slate-400 font-bold mt-2">Please do not refresh or close this window...</p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
              <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              </div>
            </motion.div>
            <h3 className="text-3xl font-black text-slate-900 uppercase">Payment Successful!</h3>
            <p className="text-slate-400 font-bold mt-2">Generating your live tracking link...</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isNetworkError ? 'bg-amber-50' : 'bg-rose-50'}`}>
                {isNetworkError
                  ? <WifiOff className="w-10 h-10 text-amber-500" />
                  : <AlertCircle className="w-10 h-10 text-rose-500" />}
              </div>
            </motion.div>

            <h3 className="text-2xl font-black text-slate-900 uppercase mb-3">
              {isNetworkError ? 'Server Unreachable' : 'Payment Failed'}
            </h3>

            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6 max-w-sm text-left">
              <p className="text-sm font-bold text-red-700 leading-relaxed">{errorMsg}</p>
              {isNetworkError && (
                <p className="text-xs font-bold text-red-400 mt-2 font-mono">
                  → Run: npm run dev:server
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setStep('payment')}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:opacity-90 transition-opacity"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Details Form */}
        {step === 'details' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <h4 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-4">Customer Details</h4>
              <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="Full Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} placeholder="Phone Number" className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
                <input type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} placeholder="Email Address" className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
              </div>
              <textarea placeholder="Delivery Address" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
              <div className="flex gap-2">
                <input type="text" placeholder="City" value={customer.city} onChange={e => setCustomer({...customer, city: e.target.value})} className="w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
                <input type="text" placeholder="State" value={customer.state} onChange={e => setCustomer({...customer, state: e.target.value})} className="w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
                <input type="text" placeholder="Pincode" value={customer.pincode} onChange={e => setCustomer({...customer, pincode: e.target.value})} className="w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-900 outline-none focus:border-rose-500 text-base" />
              </div>
            </div>
            <button
              onClick={() => setStep('payment')}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform"
            >
              PROCEED TO PAYMENT
            </button>
          </motion.div>
        )}

        {/* Payment Options */}
        {step === 'payment' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <button onClick={() => setStep('details')} className="text-xs font-black text-rose-600 uppercase tracking-widest hover:underline mb-4 inline-block">
              ← Back to Details
            </button>

            {/* Order Summary */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h4 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-4">Order Summary</h4>
              <div className="flex gap-4 items-center mb-6 border-b border-slate-50 pb-4">
                <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center text-2xl">🥤</div>
                <div>
                  <h5 className="font-black text-slate-900 text-sm">Mango Bliss x{productInfo.quantity}</h5>
                  <p className="text-xs font-bold text-slate-400">{productInfo.bottleName} • {productInfo.flavorName} • {productInfo.toppingName}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                {productInfo.couponApplied && (
                  <div className="flex justify-between text-emerald-500"><span>Coupon: BLISS10 (-10%)</span><span>-₹{discount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-slate-500"><span>Delivery</span><span>₹{delivery.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>GST</span><span>₹{gst.toFixed(2)}</span></div>
                <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center text-lg">
                  <span className="font-black text-slate-900 uppercase">Total Payable</span>
                  <span className="font-black text-rose-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <h4 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-4 ml-2">Select Payment Method</h4>

              <button onClick={() => handlePayment('upi')} className="w-full flex items-center gap-4 p-5 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-2xl transition-all group">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smartphone size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-slate-900 text-sm">Google Pay / PhonePe / UPI</p>
                  <p className="text-xs font-bold text-slate-400">Fast & Secure • Instant confirmation</p>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">INSTANT</span>
              </button>

              <button onClick={() => handlePayment('card')} className="w-full flex items-center gap-4 p-5 bg-white border border-slate-100 hover:border-slate-300 rounded-2xl transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-slate-900 text-sm">Credit / Debit Card</p>
                  <p className="text-xs font-bold text-slate-400">Visa, Mastercard, RuPay</p>
                </div>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">DEMO</span>
              </button>

              <button onClick={() => handlePayment('cod')} className="w-full flex items-center gap-4 p-5 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-2xl transition-all group">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Truck size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-black text-slate-900 text-sm">Cash on Delivery</p>
                  <p className="text-xs font-bold text-slate-400">Pay at your doorstep</p>
                </div>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">COD</span>
              </button>
            </div>

            {/* Hint */}
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <AlertCircle size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                UPI and COD work without a payment key. Card uses demo simulation mode. Ensure the backend server is running on port 5000.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
