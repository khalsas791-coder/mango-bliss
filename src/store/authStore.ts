import { create } from 'zustand';
import { authService } from '../services/authService';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('mango_bliss_token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      if (data.success) {
        const { token, user } = data;
        localStorage.setItem('mango_bliss_token', token);
        set({ 
          token, 
          user: { ...user, role: user.role || 'user' }, 
          isAuthenticated: true, 
          isLoading: false,
          error: null 
        });
        return true;
      } else {
        set({ isLoading: false, error: data.message || 'Login failed' });
        return false;
      }
    } catch (err: any) {
      console.error('Login operation failed:', err);
      const message = err.message || 'Network error. Please check your connection and DB status.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.register(name, email, password);
      if (data.success) {
        const { token, user } = data;
        localStorage.setItem('mango_bliss_token', token);
        set({ 
          token, 
          user: { ...user, role: user.role || 'user' }, 
          isAuthenticated: true, 
          isLoading: false,
          error: null 
        });
        return true;
      } else {
        set({ isLoading: false, error: data.message || 'Signup failed' });
        return false;
      }
    } catch (err: any) {
      console.error('Signup operation failed:', err);
      // If we have a response it's not a true network error, but the service might have failed to catch it
      const message = err.message || 'Network error. Please check your connection and DB status.';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('mango_bliss_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadUser: async () => {
    const token = get().token;
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await authService.getMe(token);
      if (res.success) {
        set({
          user: { ...res.user, role: res.user.role || 'user' },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Token invalid/expired
        localStorage.removeItem('mango_bliss_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (err) {
      // Server unreachable — keep token, mark as not authenticated yet
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
