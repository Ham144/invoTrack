import { create } from 'zustand';
import type { UserInfo } from '@/types/auth';

interface SessionState {
  user: UserInfo | null;
  sessionReady: boolean;
  setUser: (user: UserInfo | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  sessionReady: false,
  setUser: (user) => set({ user, sessionReady: true }),
}));
