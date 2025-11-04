import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'operator' | 'supervisor' | 'admin' | 'analyst';
  permissions: string[];
  stations: string[];
  two_factor_enabled: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  needsTwoFactor: boolean;
  tempSession: string | null; // Temporary session ID before 2FA verification
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setNeedsTwoFactor: (needs: boolean) => void;
  setTempSession: (sessionId: string | null) => void;
  logout: () => void;
}

/**
 * Auth store - Uses sessionStorage for persistence
 * sessionStorage clears on tab close but persists during navigation
 * This avoids conflicts with localStorage/MongoDB while maintaining auth state
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      needsTwoFactor: false,
      tempSession: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => set({ token }),
      
      setNeedsTwoFactor: (needs) => set({ needsTwoFactor: needs }),
      
      setTempSession: (sessionId) => set({ tempSession: sessionId }),
      
      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
        needsTwoFactor: false,
        tempSession: null,
      }),
    }),
    {
      name: 'metcon-auth', // unique name for sessionStorage key
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage instead of localStorage
    }
  )
);











