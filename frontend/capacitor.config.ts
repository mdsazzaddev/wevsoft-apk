import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell for WevSoft consumer app (Contact Discovery + future native features).
 * Web assets come from Vite `dist/` after `npm run build -w @wevsoft/frontend`.
 *
 * Android Studio / JDK + Android SDK required for `npx cap open android` / device builds.
 * This machine may lack those toolchains — JS bridge + config still ship for CI/local web.
 */
const config: CapacitorConfig = {
  appId: 'com.wevsoft.app',
  appName: 'WevSoft',
  webDir: 'dist',
  server: {
    // Dev: point at Vite when using `cap run android -l` with a LAN URL.
    // androidScheme keeps cookies/localStorage closer to https origins.
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
