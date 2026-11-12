# WevSoft Android (Capacitor)

Consumer app shell wrapping the Vite frontend. Used for **Contact Discovery** native Contacts access and best-effort background due ticks.

## Requirements

- JDK 21+ (or Android Studio bundled JDK)
- Android SDK (API 24+; project targets compile/target SDK 36)
- Node workspace build: `npm run build -w @wevsoft/frontend`

This checkout may be missing JDK/SDK — JS + Gradle sources still sync; device builds need the toolchains locally.

## Workflow

```bash
# From repo root
npm run build -w @wevsoft/frontend
npm run cap:sync -w @wevsoft/frontend   # or: cd frontend && npx cap sync android
npm run cap:open -w @wevsoft/frontend   # Android Studio
```

## Contact Discovery

| Layer | Behavior |
|-------|----------|
| JS | `src/lib/contactDiscoveryNative.ts` — Contacts plugin + App resume ~24h due check |
| UI | `ContactDiscoveryPanel` uses native phones on Android; web stays picker/paste |
| Native | `READ_CONTACTS` in `AndroidManifest.xml` |
| WorkManager | `ContactDiscoveryScheduler` / `ContactDiscoverySyncWorker` — sets a SharedPreferences due flag only; **does not upload contacts in background** |

Play Store: declare why full Contacts access is required before release. Invite-only flows should prefer the Contact Picker instead.

## Plugins

- `@capacitor/app`
- `@capacitor-community/contacts`
