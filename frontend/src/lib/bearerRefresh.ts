import type { BearerRefreshBinding } from '@wevsoft/shared/api/fetch-interceptor';
import { useAuthStore } from '../stores/authStore';

/**
 * SEC-04: lets the shared fetch interceptor swap in a refreshed access token
 * without going through setAuth (which would reset the active identity/Space).
 */
export const bearerRefreshBinding: BearerRefreshBinding = {
  getToken: () => useAuthStore.getState().token,
  setToken: (token: string) => {
    try { localStorage.setItem('token', token); } catch { /* private mode */ }
    useAuthStore.setState({ token });
  },
};
