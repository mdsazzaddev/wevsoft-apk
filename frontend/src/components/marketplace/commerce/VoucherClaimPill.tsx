import React, { useState } from 'react';
import { Tag, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store';
import { useMarketplaceLang } from './useMarketplaceLang';
import { useStorefrontConfig } from './useStorefrontConfig';

const VOUCHER_ID = 'new-user-100';
const storageKey = `wevmall_voucher_claimed_${VOUCHER_ID}`;

function readClaimed(): boolean {
  try {
    return localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

export default function VoucherClaimPill() {
  const token = useStore((s) => s.token);
  const { t } = useMarketplaceLang();
  const widgets = useStorefrontConfig()?.widgets;
  const [claimed, setClaimed] = useState(readClaimed);
  const [loading, setLoading] = useState(false);

  if (!token || widgets?.voucherPillEnabled === false) return null;

  async function handleClaim() {
    if (claimed || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/vouchers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ voucherId: VOUCHER_ID }),
      });
      if (res.ok) {
        try {
          localStorage.setItem(storageKey, 'true');
        } catch {
          /* ignore storage errors */
        }
        setClaimed(true);
        toast.success(t('Voucher claimed!', 'ভাউচার সংগ্রহ হয়েছে!'));
      } else {
        toast.error(t('Could not claim voucher', 'ভাউচার সংগ্রহ করা যায়নি'));
      }
    } catch {
      toast.error(t('Could not claim voucher', 'ভাউচার সংগ্রহ করা যায়নি'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Tag size={18} className="shrink-0" />
        <p className="text-sm font-semibold truncate">
          {t(widgets?.voucherText || 'Claim ৳100 Voucher - New User Exclusive!', widgets?.voucherTextBn || '৳১০০ ভাউচার সংগ্রহ করুন - নতুন ব্যবহারকারীদের জন্য!')}
        </p>
      </div>
      <button
        type="button"
        onClick={handleClaim}
        disabled={claimed || loading}
        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white text-orange-600 px-4 py-1.5 text-xs font-bold hover:bg-white/90 disabled:opacity-80 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : claimed ? (
          <>
            <Check size={14} /> {t('Claimed!', 'সংগৃহীত!')}
          </>
        ) : (
          t('Claim Now', 'এখনই নিন')
        )}
      </button>
    </div>
  );
}
