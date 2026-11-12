import React, { useState } from 'react';
import { Coins, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store';
import { useMarketplaceLang } from './useMarketplaceLang';

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore storage errors */
  }
}

export default function DailyCheckInBanner() {
  const token = useStore((s) => s.token);
  const { t, formatNum } = useMarketplaceLang();
  const today = todayKey();
  const [hidden, setHidden] = useState(
    () => safeGet('wevmall_checkin_date') === today || safeGet(`wevmall_checkin_dismissed_${today}`) === 'true',
  );
  const [loading, setLoading] = useState(false);

  if (!token || hidden) return null;

  async function handleCheckIn() {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/daily-checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        safeSet('wevmall_checkin_date', today);
        setHidden(true);
        const coins = Number(data?.coinsAwarded || 0);
        if (coins > 0) {
          toast.success(t(`+${coins} coins earned!`, `+${formatNum(coins)} কয়েন অর্জিত হয়েছে!`));
        } else {
          toast(t('Already checked in today', 'আজ ইতিমধ্যে চেক-ইন করেছেন'));
        }
      } else {
        toast.error(t('Check-in failed', 'চেক-ইন ব্যর্থ হয়েছে'));
      }
    } catch {
      toast.error(t('Check-in failed', 'চেক-ইন ব্যর্থ হয়েছে'));
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    safeSet(`wevmall_checkin_dismissed_${today}`, 'true');
    setHidden(true);
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0 text-foreground">
        <Coins size={16} className="text-primary shrink-0" />
        <span className="truncate">
          {t('Daily Check-in: Earn 10 Coins today!', 'দৈনিক চেক-ইন: আজ ১০ কয়েন অর্জন করুন!')}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-bold hover:bg-primary/90 disabled:opacity-70 transition-colors"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          {t('Check In', 'চেক-ইন করুন')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('Dismiss', 'বন্ধ করুন')}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
