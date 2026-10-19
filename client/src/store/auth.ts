import { create } from 'zustand';
import { setAccessToken, getAccessToken } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  bootChecked: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
  tryRestore: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: getAccessToken(),
  loading: true,
  bootChecked: false,

  setAuth: (user, token) => {
    setAccessToken(token);
    set({ user, accessToken: token, loading: false, bootChecked: true });
  },

  clearAuth: () => {
    setAccessToken(null);
    set({ user: null, accessToken: null, loading: false, bootChecked: true });
  },

  setLoading: (v) => set({ loading: v }),

  tryRestore: async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        set({ loading: false, bootChecked: true });
        return false;
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      set({ user: data.user, accessToken: data.accessToken, loading: false, bootChecked: true });
      return true;
    } catch {
      set({ loading: false, bootChecked: true });
      return false;
    }
  },
}));