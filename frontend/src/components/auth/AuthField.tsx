import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { AlertCircle, type LucideIcon } from 'lucide-react';

/**
 * The auth form's input primitive: leading icon, floating label, spring focus
 * ring, and an error state that shakes *and* speaks rather than just turning red.
 *
 * SECURITY: `onTyped` is intentionally argument-free. The page keeps the value
 * in its own form state as it always has; anything downstream of this component
 * (notably the mascot director) learns only that a keystroke happened.
 */

type FieldKind = 'input' | 'textarea' | 'select';

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  as?: FieldKind;
  type?: string;
  icon?: LucideIcon;
  error?: string | null;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  placeholder?: string;
  /** Rendered inside the field on the trailing edge — e.g. a visibility toggle. */
  trailing?: React.ReactNode;
  /** Bump to replay the error shake without changing the message. */
  shakeNonce?: number;
  /** Focus-within of the whole field, so `trailing` controls count as focus. */
  onFocusChange?: (focused: boolean) => void;
  /** Fired per keystroke, with no value attached. */
  onTyped?: () => void;
  /** `<option>`s, when `as="select"`. */
  children?: React.ReactNode;
};

export default function AuthField({
  label,
  name,
  value,
  onChange,
  as = 'input',
  type = 'text',
  icon: Icon,
  error,
  required,
  autoComplete,
  autoFocus,
  inputMode,
  placeholder,
  trailing,
  shakeNonce = 0,
  onFocusChange,
  onTyped,
  children,
}: Props) {
  const reactId = useId();
  const id = `auth-${name}-${reactId}`;
  const errorId = `${id}-error`;
  const [focused, setFocused] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reduceMotion = useReducedMotion();
  const shake = useAnimationControls();

  // Selects and textareas keep the label parked up top; only single-line inputs
  // get the placeholder-to-label lift.
  const alwaysFloating = as !== 'input';
  const floating = alwaysFloating || focused || autofilled || value.length > 0;

  /**
   * Browser autofill writes straight into the DOM without a React change event,
   * so a controlled field keeps `value === ''` while the box visibly holds a
   * username — the label stays parked on top of the text, and submitting sends
   * empty credentials. Push the DOM value back into the page's form state.
   */
  const syncFromDom = useCallback(() => {
    const el = inputRef.current;
    // Chrome's *pending* autofill styles the field but withholds the value until
    // the user commits, so an empty el.value here is expected, not a failure.
    if (!el || el.value === value) return;
    onChange({
      target: el,
      currentTarget: el,
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  }, [onChange, value]);

  /**
   * There is no autofill event. The documented workaround is that attaching an
   * animation to the autofill pseudo-class makes the browser fire
   * `animationstart` — see the keyframes in browser-normalize.css.
   */
  const handleAnimationStart = (e: React.AnimationEvent<HTMLInputElement>) => {
    if (e.animationName === 'wev-autofill-start') {
      setAutofilled(true);
      syncFromDom();
    } else if (e.animationName === 'wev-autofill-end') {
      setAutofilled(false);
    }
  };

  // Autofill that lands before this component mounts has no animation event left
  // to fire, so check the DOM once on mount as well.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let filled = false;
    for (const selector of [':autofill', ':-webkit-autofill']) {
      try {
        if (el.matches(selector)) filled = true;
      } catch {
        /* Engine does not know this spelling; the other one covers it. */
      }
    }
    if (filled) setAutofilled(true);
    if (el.value) syncFromDom();
    // Mount-only on purpose: every later change arrives via animationstart.
     
  }, []);

  useEffect(() => {
    if (!shakeNonce) return;
    if (reduceMotion) return;
    shake.start({ x: [0, -7, 6, -4, 3, 0] }, { duration: 0.42, ease: 'easeOut' });
  }, [shakeNonce, reduceMotion, shake]);

  const handleFocus = () => {
    setFocused(true);
    onFocusChange?.(true);
  };
  const handleBlur = () => {
    setFocused(false);
    onFocusChange?.(false);
  };
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    onChange(e);
    onTyped?.();
  };

  const shared = {
    id,
    name,
    value,
    required,
    autoComplete,
    autoFocus,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
  } as const;

  const padLeft = Icon ? 'pl-12' : 'pl-4';
  const padRight = trailing ? 'pr-12' : 'pr-4';
  const fieldBase = `w-full bg-transparent text-[15px] text-foreground outline-none ${padLeft} ${padRight}`;
  // `.auth-field-input` has legacy shorthand padding; inline side padding keeps
  // text clear of icons even when that stylesheet is loaded after Tailwind.
  const sidePadding = { paddingLeft: Icon ? '3rem' : '1rem', paddingRight: trailing ? '3rem' : '1rem' };

  return (
    <motion.div animate={shake} className="w-full">
      <div
        className={`auth-input-shell ${error ? 'is-error' : ''}`}
      >
        {Icon && (
          <Icon
            size={18}
            aria-hidden="true"
            className={`pointer-events-none absolute left-4 transition-colors duration-200 ${
              as === 'textarea' ? 'top-5' : 'top-1/2 -translate-y-1/2'
            } ${error ? 'text-red-500' : focused ? 'text-[var(--auth-primary)]' : 'text-[var(--auth-fg-muted)]'}`}
          />
        )}

        <label
          htmlFor={id}
          className={`pointer-events-none absolute origin-left font-medium transition-all duration-200 ${
            Icon ? 'left-12' : 'left-4'
          } ${
            floating
              ? 'top-[5px] text-[10.5px] leading-tight tracking-wide'
              : 'top-1/2 -translate-y-1/2 text-[13.5px]'
          } ${error ? 'text-red-500' : focused ? 'text-[var(--auth-primary)]' : 'text-[var(--auth-fg-muted)]'}`}
        >
          {label}
          {required && <span className="ml-0.5 text-[var(--auth-primary)]">*</span>}
        </label>

        {as === 'input' && (
          <input
            {...shared}
            ref={inputRef}
            type={type}
            inputMode={inputMode}
            onAnimationStart={handleAnimationStart}
            placeholder={focused ? placeholder : undefined}
            style={sidePadding}
            className={`${fieldBase} auth-field-input h-[2.875rem] pt-[1.25rem] pb-1 placeholder:text-[var(--auth-placeholder)]`}
          />
        )}
        {as === 'textarea' && (
          <textarea
            {...shared}
            placeholder={placeholder}
            style={sidePadding}
            className={`${fieldBase} min-h-28 resize-y pt-7 pb-3 placeholder:text-[var(--auth-placeholder)]`}
          />
        )}
        {as === 'select' && (
          <select {...shared} style={sidePadding} className={`${fieldBase} auth-field-input h-[3rem] appearance-none pt-[1.125rem] pb-1.5`}>
            {children}
          </select>
        )}

        {trailing && (
          <div
            className={`absolute right-1.5 ${as === 'textarea' ? 'top-3' : 'top-1/2 -translate-y-1/2'}`}
          >
            {trailing}
          </div>
        )}
      </div>

      {/* Icon + text, so the error never depends on colour alone. */}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={reduceMotion ? undefined : { opacity: 0, y: -4, height: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, height: 'auto' }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, height: 0 }}
            className="auth-input-error"
          >
            <AlertCircle size={13} aria-hidden="true" className="shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
