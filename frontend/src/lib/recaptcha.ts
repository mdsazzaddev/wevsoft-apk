/**
 * @deprecated Prefer `./captcha` — kept so older imports keep working.
 * Supports Turnstile (via CaptchaField) + legacy reCAPTCHA v3 getCaptchaToken.
 */
export {
  getCaptchaToken,
  loadCaptchaConfig,
  resetCaptchaCache,
  captchaBodyField,
  type CaptchaConfig,
  type CaptchaProvider,
} from './captcha';
