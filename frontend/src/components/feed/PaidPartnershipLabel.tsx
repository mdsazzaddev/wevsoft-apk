import { Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePartnershipLabel } from '../../lib/paidPartnership';
import { trLabel } from '../settings/languagePickerShared';

/** Feed meta chip: "Paid partnership with <brand>" for approved branded content (or self-declared disclosure). */
export default function PaidPartnershipLabel({ post }: { post: any }) {
  const { t } = useTranslation();
  const label = usePartnershipLabel(post?.id);
  const declared = Boolean(post?.isPaidPartnership || post?.contentDisclosureType === 'paid_partnership' || post?.publishSettings?.isPaidPartnership);
  if (!label && !declared) return null;
  const brand = label?.brand;
  const bare = trLabel(t, 'PaidPartnership', 'Paid partnership');
  const withName = (name: string) => {
    const raw = t('PaidPartnershipWith', { name });
    return raw === 'PaidPartnershipWith' ? `Paid partnership with ${name}` : raw;
  };
  return (
    <span className="inline-flex min-w-0 items-center gap-1 truncate font-semibold text-foreground/80" title={bare}>
      <Handshake className="h-3 w-3 shrink-0" aria-hidden />
      {brand?.name ? (
        <>
          {(() => {
            const full = withName(brand.name);
            const idx = full.lastIndexOf(brand.name);
            if (idx < 0) return full;
            const before = full.slice(0, idx);
            const after = full.slice(idx + brand.name.length);
            return (
              <>
                {before}
                {brand.username ? (
                  <a href={`/u/${brand.username}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                    {brand.name}
                  </a>
                ) : (
                  brand.name
                )}
                {after}
              </>
            );
          })()}
        </>
      ) : (
        bare
      )}
    </span>
  );
}
