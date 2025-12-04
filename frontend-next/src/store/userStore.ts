import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string | null;
  profile_photo: string | null;
  created?: boolean;
  premium_plan_id?: number | null;
  plan_name?: string;
  is_pro?: boolean;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  demo_count: number | null;
  jwt: string | null;
  setUser: (user: User | null) => void;
  setDemoData: (demo_count: number | null, jwt: string | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      demo_count: null,
      jwt: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setDemoData: (demo_count, jwt) => set({ demo_count, jwt }),
      clearUser: () => set({ user: null, isAuthenticated: false, demo_count: null, jwt: null }),
    }),
    {
      name: 'user-storage', 
    }
  )
);

