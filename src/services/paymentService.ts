import { API_URL } from '../config';

// Helper: get stored admin token
const getAdminToken = () => sessionStorage.getItem('adminToken') || '';

const authHeader = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAdminToken()}`
});

export const paymentService = {
  createOrder: async (orderData: {
    productName: string;
    amount: number;
    customerName: string;
    paymentMethod: string;
    userLat?: number;
    userLng?: number;
    userId?: string;
  }) => {
    const response = await fetch(`${API_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return response.json();
  },

  verifyPayment: async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    systemOrderId: string;
  }) => {
    const response = await fetch(`${API_URL}/orders/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });
    return response.json();
  },

  updateStatus: async (orderId: string, status: string) => {
    const response = await fetch(`${API_URL}/orders/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    return response.json();
  },

  // ── Admin-protected endpoints (require admin JWT) ──

  getStats: async () => {
    const response = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${getAdminToken()}` }
    });
    return response.json();
  },

  getOrderDetails: async (orderId: string) => {
    const response = await fetch(`${API_URL}/orders/${orderId}`);
    return response.json();
  },

  forceStatusAdmin: async (orderId: string, statusPhase: string) => {
    const response = await fetch(`${API_URL}/admin/force-status`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ orderId, statusPhase }),
    });
    return response.json();
  }
};
