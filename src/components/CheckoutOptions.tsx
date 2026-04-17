import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CreditCard, 
  Truck, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Smartphone, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { paymentService } from '../services/paymentService';

type PaymentMethod = 'cod' | 'gpay' | 'phonepe' | 'paytm' | 'card' | 'upi_collect';

interface CheckoutOptionsProps {
  onClose: () => void;
  onSuccess: (orderId: string, txnId: string) => void;
  price: string;
  productName: string;
}

export function CheckoutOptions({ onClose, onSuccess, price, productName }: CheckoutOptionsProps) {
  const [step, setStep] = useState<'main' | 'online' | 'processing' | 'success' | 'failure'>('main');
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const amountValue = parseFloat(price.replace(/[^0-9.]/g, ''));

  const handlePayment = async (method: PaymentMethod) => {
    setLoading(true);
    setStep('processing');
    
    try {
      // 1. Create order in our backend
      const response = await paymentService.createOrder({
        productName,
        amount: price.includes('₹') ? amountValue : amountValue * 60, // Using 60 as the conversion rate
        customerName: "Guest User", // In a real app, this would come from a form
        paymentMethod: method
      });

      if (!response.success) throw new Error(response.message);
      
      const { order, razorpayOrder } = response;
      setOrderDetails(order);

      // 2. Handle specific methods
      if (method === 'cod') {
        await paymentService.updateStatus(order.orderId, 'success');
        setStep('success');
        setTimeout(() => onSuccess(order.orderId, 'COD_CASH'), 2000);
      } else if (method === 'gpay' || method === 'phonepe' || method === 'paytm') {
        // Deep link for UPI apps
        const upiId = "8688899190@ibl"; 
        const finalAmount = price.includes('₹') ? amountValue : amountValue * 60;
        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(productName)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(order.orderId)}`;
        
        window.location.href = upiUrl;
        
        // In a real app, you'd poll the backend or use a webhook
        // For this demo, we'll verify manually or show a verification state
        setStep('success'); 
        setTimeout(() => onSuccess(order.orderId, 'UPI_TXN'), 3000);
      } else if (method === 'card') {
        // Razorpay Gateway
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: razorpayOrder.amount,
          currency: "INR",
          name: "Mango Bliss",
          description: productName,
          order_id: razorpayOrder.id,
          handler: async (response: any) => {
            const verifyRes = await paymentService.verifyPayment({
              ...response,
              systemOrderId: order.orderId
            });
            if (verifyRes.success) {
              setStep('success');
              setTimeout(() => onSuccess(order.orderId, response.razorpay_payment_id), 2000);
            } else {
              setStep('failure');
              setErrorMessage("Verification failed.");
            }
          },
          prefill: {
            name: "Guest User",
            email: "guest@example.com",
            contact: "9999999999",
          },
          theme: { color: "#e11d48" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setStep('main'); // If modal closed before handler
        setLoading(false);
      }
    } catch (err: any) {
      setStep('failure');
      setErrorMessage(err.message || 'Payment failed to initiate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        {step !== 'processing' && step !== 'success' && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        )}

        <div className="p-8 md:p-12">
          {step === 'processing' ? (
            <div className="py-20 flex flex-col items-center text-center">
              <Loader2 className="w-16 h-16 text-[#e11d48] animate-spin mb-6" />
              <h3 className="text-2xl font-black text-slate-900 uppercase">Processing Payment</h3>
              <p className="text-slate-400 font-bold mt-2">Please do not refresh or close this window...</p>
            </div>
          ) : step === 'success' ? (
            <div className="py-20 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                <CheckCircle2 className="w-24 h-24 text-emerald-500 mb-8" />
              </motion.div>
              <h3 className="text-3xl font-black text-slate-900 uppercase">Payment Successful!</h3>
              <p className="text-slate-400 font-bold mt-2">Your order ID: <span className="text-slate-900">{orderDetails?.orderId}</span></p>
              <p className="text-emerald-500 font-bold mt-4">Redirecting to order details...</p>
            </div>
          ) : step === 'failure' ? (
            <div className="py-20 flex flex-col items-center text-center">
              <AlertCircle className="w-24 h-24 text-rose-500 mb-8" />
              <h3 className="text-3xl font-black text-slate-900 uppercase">Payment Failed</h3>
              <p className="text-slate-400 font-bold mt-2">{errorMessage}</p>
              <button 
                onClick={() => setStep('main')}
                className="mt-10 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black"
              >
                RETRY PAYMENT
              </button>
            </div>
          ) : (
            <>
              <div className="mb-10 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                  <Zap className="text-white" size={32} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                  {step === 'main' ? 'Checkout' : 'Select UPI App'}
                </h2>
                <p className="text-slate-400 font-bold mt-2">
                  {step === 'main' ? 'Choose your preferred payment method' : 'Instant payment via deep linking'}
                </p>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {step === 'main' ? (
                    <motion.div
                      key="main"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <button
                        onClick={() => setStep('online')}
                        className="w-full group p-6 rounded-3xl border-2 border-slate-100 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center gap-6"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                          <Smartphone size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-lg">UPI App Payment</h3>
                          <p className="text-sm text-slate-400 font-bold">GPay, PhonePe, Paytm</p>
                        </div>
                        <ChevronRight size={20} className="text-slate-300" />
                      </button>

                      <button
                        onClick={() => handlePayment('card')}
                        className="w-full group p-6 rounded-3xl border-2 border-slate-100 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center gap-6"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900">
                          <CreditCard size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-lg">Credit / Debit Card</h3>
                          <p className="text-sm text-slate-400 font-bold">Visa, Mastercard, RuPay</p>
                        </div>
                        <ChevronRight size={20} className="text-slate-300" />
                      </button>

                      <button
                        onClick={() => handlePayment('cod')}
                        className="w-full group p-6 rounded-3xl border-2 border-slate-100 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-center gap-6"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900">
                          <Truck size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-900 text-lg">Cash on Delivery</h3>
                          <p className="text-sm text-slate-400 font-bold">Pay when your drink arrives</p>
                        </div>
                        <ChevronRight size={20} className="text-slate-300" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="online"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <button
                        onClick={() => handlePayment('gpay')}
                        className="p-6 rounded-3xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                          <Smartphone size={24} />
                        </div>
                        <span className="font-black text-sm uppercase">Google Pay</span>
                      </button>

                      <button
                        onClick={() => handlePayment('phonepe')}
                        className="p-6 rounded-3xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center text-white">
                          <Smartphone size={24} />
                        </div>
                        <span className="font-black text-sm uppercase">PhonePe</span>
                      </button>

                      <button
                        onClick={() => handlePayment('paytm')}
                        className="p-6 rounded-3xl border-2 border-slate-100 hover:border-sky-500 hover:bg-sky-50 transition-all flex flex-col items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white">
                          <Smartphone size={24} />
                        </div>
                        <span className="font-black text-sm uppercase">Paytm</span>
                      </button>

                      <button
                        onClick={() => setStep('main')}
                        className="p-6 rounded-3xl border-2 border-slate-100 hover:bg-slate-50 transition-all flex flex-col items-center justify-center"
                      >
                        <span className="text-slate-400 font-black text-sm uppercase">Back</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                  <span className="text-3xl font-black text-slate-900">{price}</span>
                </div>
                
                <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 text-emerald-700">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-bold">Secure SSL Encrypted Checkout</span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
