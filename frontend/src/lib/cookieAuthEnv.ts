// WS7b: must be imported before any store module so the first token read sees the flag.
import { setCookieOnlyOverride } from '@wevsoft/shared/api/cookie-auth';

setCookieOnlyOverride(String(import.meta.env.VITE_AUTH_COOKIE_ONLY || '').toLowerCase() === 'true');
