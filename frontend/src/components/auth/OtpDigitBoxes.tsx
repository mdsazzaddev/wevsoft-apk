import React, { useEffect, useId, useRef } from 'react';

type Props = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  error?: string | null;
  name?: string;
  className?: string;
};

function onlyDigits(raw: string, max: number) {
  return String(raw || '').replace(/\D/g, '').slice(0, max);
}

/**
 * 6-box OTP input matching the Wevsoft email digit style:
 * soft blue border, white→pale-blue gradient, blue monospace digits.
 * Paste / SMS autofill / deep-link fill distribute across boxes.
 */
export default function OtpDigitBoxes({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  label = 'Verification code',
  error,
  name = 'otp',
  className = '',
}: Props) {
  const reactId = useId();
  const digits = onlyDigits(value, length).padEnd(length, ' ').slice(0, length).split('');
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!autoFocus) return;
    const firstEmpty = Math.min(onlyDigits(value, length).length, length - 1);
    refs.current[firstEmpty]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, length]);

  const setAt = (index: number, char: string) => {
    const cur = onlyDigits(value, length).split('');
    while (cur.length < length) cur.push('');
    cur[index] = char;
    onChange(onlyDigits(cur.join('').replace(/\s/g, ''), length));
  };

  const fillFrom = (index: number, text: string) => {
    const incoming = onlyDigits(text, length);
    if (!incoming) return;
    // Full-code paste/autofill always starts at box 0.
    const start = incoming.length >= length ? 0 : index;
    const cur = onlyDigits(value, length).split('');
    while (cur.length < length) cur.push('');
    if (incoming.length >= length) {
      for (let i = 0; i < length; i++) cur[i] = incoming[i]!;
    } else {
      for (let i = 0; i < incoming.length && start + i < length; i++) {
        cur[start + i] = incoming[i]!;
      }
    }
    const next = onlyDigits(cur.join(''), length);
    onChange(next);
    const focusIdx = Math.min(Math.max(next.length, 0), length - 1);
    requestAnimationFrame(() => refs.current[focusIdx]?.focus());
  };

  return (
    <div className={`otp-digit-field flex flex-col gap-2.5 ${className}`.trim()}>
      {label ? (
        <label className="otp-digit-label text-xs font-semibold text-muted-foreground" htmlFor={`${reactId}-0`}>
          {label}
        </label>
      ) : null}
      {/* Hidden field helps iOS/Android SMS / password-manager OTP autofill */}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        name={name}
        value={onlyDigits(value, length)}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => fillFrom(0, e.target.value)}
      />
      <div className="otp-digit-row flex w-full justify-center gap-2 sm:gap-2.5" role="group" aria-label={label}>
        {Array.from({ length }, (_, i) => {
          const d = digits[i]?.trim() || '';
          return (
            <input
              key={i}
              id={`${reactId}-${i}`}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={[
                'otp-digit-box aspect-square h-12 w-12 shrink-0 text-center font-mono text-[1.375rem] font-bold outline-none transition sm:h-[52px] sm:w-[52px] sm:text-[1.5rem]',
                'rounded-2xl border-[1.5px]',
                error
                  ? 'border-destructive text-destructive focus:ring-[3px] focus:ring-destructive/20'
                  : 'border-[#93c5fd] text-[#1d4ed8] caret-[#1d4ed8] focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#2563eb]/25',
                disabled ? 'opacity-55 cursor-not-allowed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                error
                  ? undefined
                  : {
                      background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
                      boxShadow: '0 1px 2px rgba(37,99,235,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
                    }
              }
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              disabled={disabled}
              aria-label={`${label} digit ${i + 1}`}
              value={d}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.length > 1) {
                  fillFrom(i, raw);
                  return;
                }
                const digit = onlyDigits(raw, 1);
                setAt(i, digit);
                if (digit && i < length - 1) {
                  requestAnimationFrame(() => refs.current[i + 1]?.focus());
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  if (d) {
                    setAt(i, '');
                  } else if (i > 0) {
                    setAt(i - 1, '');
                    requestAnimationFrame(() => refs.current[i - 1]?.focus());
                  }
                  e.preventDefault();
                  return;
                }
                if (e.key === 'ArrowLeft' && i > 0) {
                  e.preventDefault();
                  refs.current[i - 1]?.focus();
                }
                if (e.key === 'ArrowRight' && i < length - 1) {
                  e.preventDefault();
                  refs.current[i + 1]?.focus();
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                fillFrom(0, e.clipboardData.getData('text') || '');
              }}
              onFocus={(e) => e.target.select()}
            />
          );
        })}
      </div>
      {error ? (
        <p className="otp-digit-error m-0 text-xs font-semibold text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
