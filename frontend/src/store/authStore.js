import { create } from 'zustand';

const STORAGE_KEYS = {
  user: 'user',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
};

const readStoredAuth = () => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: true,
    };
  }

  const accessToken = window.localStorage.getItem(STORAGE_KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(STORAGE_KEYS.refreshToken);
  const userStr = window.localStorage.getItem(STORAGE_KEYS.user);

  if (!accessToken || !userStr) {
    return {
      user: null,
      accessToken,
      refreshToken,
      isAuthenticated: false,
      isHydrated: true,
    };
  }

  try {
    const user = JSON.parse(userStr);
    return {
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isHydrated: true,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.user);
    window.localStorage.removeItem(STORAGE_KEYS.accessToken);
    window.localStorage.removeItem(STORAGE_KEYS.refreshToken);

    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: true,
    };
  }
};

const persistAuth = ({ user, accessToken, refreshToken }) => {
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  window.localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);

  if (refreshToken) {
    window.localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  }
};

const clearStoredAuth = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEYS.user);
  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
};

const initialAuthState = readStoredAuth();

const useAuthStore = create((set) => ({
  ...initialAuthState,

  setAuth: (user, accessToken, refreshToken = null) => {
    persistAuth({ user, accessToken, refreshToken });
    set({ user, accessToken, refreshToken, isAuthenticated: true, isHydrated: true });
  },

  clearAuth: () => {
    clearStoredAuth();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isHydrated: true });
  },

  initAuth: () => {
    set(readStoredAuth());
  },
}));

export default useAuthStore;
