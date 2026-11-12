/** Default local dev ports — configure in production via env, not these constants. */
export const DEV_PORTS = {
  frontend: 3000,
  backend: 3001,
  admin: 3002,
  developer: 3003,
  business: 3004,
} as const;
