const API_URL = 'http://localhost:5000/api';

export const paymentService = {
  createOrder: async (orderData: {
    productName: string;
    amount: number;
    customerName: string;
    paymentMethod: string;
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

  getStats: async () => {
    const response = await fetch(`${API_URL}/admin/stats`);
    return response.json();
  }
};
