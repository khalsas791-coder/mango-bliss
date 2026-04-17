import { create } from 'zustand';
import { authService } from '../services/authService';

interface User {
  id: string;
  name: string;
  email: string;
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
      const res = await authService.login(email, password);
      if (res.success) {
        localStorage.setItem('mango_bliss_token', res.token);
        set({
          user: res.user,
          token: res.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({ isLoading: false, error: res.message });
        return false;
      }
    } catch (err) {
      set({ isLoading: false, error: 'Network error. Please check your connection.' });
      return false;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(name, email, password);
      if (res.success) {
        localStorage.setItem('mango_bliss_token', res.token);
        set({
          user: res.user,
          token: res.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({ isLoading: false, error: res.message });
        return false;
      }
    } catch (err) {
      set({ isLoading: false, error: 'Network error. Please check your connection.' });
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
          user: res.user,
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
