import React from 'react';
import { Star } from 'lucide-react';

export function RatingStars({
  value = 0,
  count,
  size = 14,
}: {
  value?: number;
  count?: number;
  size?: number;
}) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex items-center gap-1 text-xs">
      <div className="flex items-center gap-0.5 text-primary">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < Math.round(v) ? 'fill-current' : 'text-zinc-600'}
          />
        ))}
      </div>
      <span className="text-zinc-400 font-medium">
        {v.toFixed(1)}
        {typeof count === 'number' ? ` (${count})` : ''}
      </span>
    </div>
  );
}

export function PriceTag({
  price,
  discountPrice,
  className = 'text-xl',
}: {
  price?: number | null;
  discountPrice?: number | null;
  className?: string;
}) {
  const hasDiscount = discountPrice != null && discountPrice > 0 && discountPrice < Number(price || 0);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-extrabold tracking-tight text-[#e8c547] ${className}`}>
        ৳{Number(hasDiscount ? discountPrice : price || 0).toLocaleString('en-BD')}
      </span>
      {hasDiscount && (
        <span className="text-[10px] text-zinc-500 line-through">
          ৳{Number(price || 0).toLocaleString('en-BD')}
        </span>
      )}
    </div>
  );
}

export function SellerBadge({
  name,
  verified,
  phoneVerified,
  nidVerified,
  kycVerified,
}: {
  name?: string;
  verified?: boolean;
  phoneVerified?: boolean;
  nidVerified?: boolean;
  kycVerified?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate">
      <span className="truncate">{name || 'Seller'}</span>
      {verified && (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase">
          Verified
        </span>
      )}
      {phoneVerified && (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 font-bold text-[9px] uppercase">
          Phone
        </span>
      )}
      {nidVerified && (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 font-bold text-[9px] uppercase">
          NID
        </span>
      )}
      {kycVerified && !verified && (
        <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 font-bold text-[9px] uppercase">
          KYC
        </span>
      )}
    </div>
  );
}
