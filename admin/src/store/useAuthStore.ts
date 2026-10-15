/**
 * 鉴权状态（令牌持久化到 localStorage）
 */
import { create } from 'zustand';
import { authApi } from '../api/endpoints';
import { TOKEN_KEY } from '../api/client';
import type { AdminInfo } from '../types';

interface AuthState {
  token: string | null;
  admin: AdminInfo | null;
  initializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY),
  admin: null,
  initializing: true,

  login: async (username, password) => {
    const data = await authApi.login({ username, password });
    window.localStorage.setItem(TOKEN_KEY, data.token);
    set({
      token: data.token,
      admin: { id: data.admin.id, username: data.admin.username, created_at: '', updated_at: '' },
      initializing: false,
    });
  },

  logout: async (silent = false) => {
    try {
      if (!silent && get().token) await authApi.logout();
    } catch {
      /* 登出失败不阻断本地清理 */
    }
    window.localStorage.removeItem(TOKEN_KEY);
    set({ token: null, admin: null, initializing: false });
  },

  /** 应用启动时校验本地令牌是否仍然有效 */
  bootstrap: async () => {
    const token = get().token;
    if (!token) {
      set({ initializing: false });
      return;
    }
    try {
      const admin = await authApi.me();
      set({ admin, initializing: false });
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
      set({ token: null, admin: null, initializing: false });
    }
  },
}));
