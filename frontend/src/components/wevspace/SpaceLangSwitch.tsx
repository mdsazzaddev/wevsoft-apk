import { Languages } from 'lucide-react';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

/**
 * Compact EN / বাং switch for WevSpaces. Writes the shared `wevmall_lang`
 * setting through useMarketplaceLang, so marketplace and Spaces stay in sync.
 *  - hero: on the primary gradient (/spaces)
 *  - overlay: floating over a cover photo (single Space)
 *  - surface: on cards / app chrome (manage dashboard)
 */
export default function SpaceLangSwitch({
  variant = 'surface',
  className = '',
}: {
  variant?: 'hero' | 'overlay' | 'surface';
  className?: string;
}) {
  const { t, lang, setLang } = useMarketplaceLang();
  const shell =
    variant === 'hero'
      ? 'bg-primary-foreground/15 text-primary-foreground backdrop-blur-sm'
      : variant === 'overlay'
        ? 'bg-black/30 text-white shadow-sm backdrop-blur-sm'
        : 'bg-muted text-foreground';
  const on =
    variant === 'hero' ? 'bg-primary-foreground text-primary' : variant === 'overlay' ? 'bg-white text-black' : 'bg-card text-foreground shadow-sm';
  const off = variant === 'surface' ? 'text-muted-foreground hover:text-foreground' : 'hover:bg-white/20';
  return (
    <div
      role="radiogroup"
      aria-label={t('Language', 'ভাষা')}
      className={`shrink-0 inline-flex items-center gap-0.5 rounded-full p-1 text-xs font-semibold ${shell} ${className}`}
    >
      <Languages size={14} className="mx-1 opacity-80" aria-hidden="true" />
      {([['en', 'EN'], ['bn', 'বাং']] as const).map(([code, label]) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          aria-label={code === 'en' ? 'English' : 'বাংলা'}
          onClick={() => setLang(code)}
          className={`min-w-[36px] min-h-[32px] rounded-full px-2.5 transition-colors touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${lang === code ? on : off}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
