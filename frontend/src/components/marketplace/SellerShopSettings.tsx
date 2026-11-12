import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Store, Award, Users, Star, Clock, Package, TrendingUp, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { marketFetch, uploadMarketplaceMedia } from './commerce/utils';

const LEVEL_STYLE: Record<string, string> = {
  Bronze: 'from-amber-700/30 to-amber-900/20 border-amber-600/40 text-amber-300',
  Silver: 'from-slate-400/25 to-slate-600/20 border-slate-400/40 text-slate-200',
  Gold: 'from-yellow-500/25 to-amber-600/20 border-yellow-500/40 text-yellow-300',
  Platinum: 'from-cyan-400/25 to-sky-600/20 border-cyan-400/40 text-cyan-200',
  Diamond: 'from-fuchsia-500/25 to-violet-600/20 border-fuchsia-400/40 text-fuchsia-200',
};

interface Props {
  sellerProfile?: any;
  onRefreshProfile?: () => void;
}

export const SellerShopSettings: React.FC<Props> = ({ sellerProfile, onRefreshProfile }) => {
  const token = useStore((s) => s.token);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<any>(null);
  const [loadingLevel, setLoadingLevel] = useState(true);
  const [levelError, setLevelError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const parseTags = (raw: unknown): string => {
    if (!raw) return '';
    if (Array.isArray(raw)) return raw.join(', ');
    try {
      const parsed = JSON.parse(String(raw));
      return Array.isArray(parsed) ? parsed.join(', ') : String(raw);
    } catch {
      return String(raw);
    }
  };

  const parseSocial = (raw: unknown) => {
    if (!raw) return { facebook: '', instagram: '', youtube: '', website: '' };
    if (typeof raw === 'object') return { facebook: '', instagram: '', youtube: '', website: '', ...(raw as any) };
    try {
      return { facebook: '', instagram: '', youtube: '', website: '', ...JSON.parse(String(raw)) };
    } catch {
      return { facebook: '', instagram: '', youtube: '', website: '' };
    }
  };

  const [form, setForm] = useState({
    shopName: sellerProfile?.shopName || '',
    logo: sellerProfile?.logo || '',
    banner: sellerProfile?.banner || '',
    description: sellerProfile?.description || '',
    shopCategory: sellerProfile?.shopCategory || '',
    shopTags: parseTags(sellerProfile?.shopTags),
    city: sellerProfile?.city || '',
    country: sellerProfile?.country || '',
    sellerBio: sellerProfile?.sellerBio || '',
    contactPhone: sellerProfile?.contactPhone || '',
    contactEmail: sellerProfile?.contactEmail || '',
    social: parseSocial(sellerProfile?.socialLinks),
  });

  useEffect(() => {
    if (!token) return;
    marketFetch('/api/marketplace/seller/level', token)
      .then((d) => {
        setLevel(d);
        setLevelError(null);
      })
      .catch(() => setLevelError('Could not load your seller level right now.'))
      .finally(() => setLoadingLevel(false));
  }, [token]);

  const save = async () => {
    if (!form.shopName.trim()) return toast.error('Shop name is required');
    setSaving(true);
    try {
      await marketFetch('/api/marketplace/seller/shop', token, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          shopTags: form.shopTags.split(',').map((t) => t.trim()).filter(Boolean),
          socialLinks: form.social,
        }),
      });
      toast.success('Shop profile saved');
      onRefreshProfile?.();
    } catch (e: any) {
      toast.error(e.message || 'Could not save the shop profile');
    } finally {
      setSaving(false);
    }
  };

  const handleMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size exceeds 10MB limit');
      return;
    }

    if (target === 'logo') setUploadingLogo(true);
    else setUploadingBanner(true);

    try {
      const url = await uploadMarketplaceMedia(file, token);
      setForm((prev) => ({ ...prev, [target]: url }));
      toast.success(`${target === 'logo' ? 'Shop logo' : 'Shop banner'} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${target}`);
    } finally {
      if (target === 'logo') setUploadingLogo(false);
      else setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const field = (label: string, key: keyof typeof form, placeholder = '', textarea = false) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</label>
      {textarea ? (
        <textarea
          value={String(form[key] ?? '')}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-cyan-500"
        />
      ) : (
        <input
          value={String(form[key] ?? '')}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-cyan-500"
        />
      )}
    </div>
  );

  const stats = level?.stats || {};
  const statTiles = [
    { icon: Package, label: 'Products', value: stats.totalProducts ?? 0 },
    { icon: TrendingUp, label: 'Sales', value: stats.totalSales ?? 0 },
    { icon: Users, label: 'Followers', value: stats.totalFollowers ?? 0 },
    { icon: Star, label: 'Reviews', value: stats.totalReviews ?? 0 },
    { icon: Award, label: 'Rating', value: Number(stats.rating || 0).toFixed(1) },
    { icon: Clock, label: 'Response', value: stats.responseTimeMins ? `${stats.responseTimeMins}m` : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-card border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Shop profile</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Everything buyers see on your public shop page and on every listing card.
              </p>
            </div>
          </div>
          {loadingLevel ? (
            <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
          ) : level ? (
            <div
              className={`px-4 py-2 rounded-full bg-gradient-to-r border font-bold text-xs ${
                LEVEL_STYLE[level.level] || LEVEL_STYLE.Bronze
              }`}
            >
              {level.level} Seller · Grade {level.trustGrade}
            </div>
          ) : null}
        </div>

        {levelError && <p className="mt-4 text-xs text-amber-400">{levelError}</p>}

        {level && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
              {statTiles.map((s) => (
                <div key={s.label} className="p-3 rounded-2xl bg-muted/50 border border-border/60">
                  <s.icon className="w-4 h-4 text-muted-foreground mb-1.5" />
                  <div className="text-lg font-bold text-foreground leading-none">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            {level.nextLevel && (
              <p className="text-[11px] text-muted-foreground mt-4">
                Next level: <b className="text-foreground">{level.nextLevel}</b>. Levels combine total sales, seller rating,
                and trust score — keep all three climbing.
              </p>
            )}
          </>
        )}
      </div>

      <div className="p-6 rounded-3xl bg-card border border-border space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Shop name', 'shopName', 'e.g. Dhaka Gadget House')}
          {field('Shop category', 'shopCategory', 'e.g. Electronics')}
          {/* Shop Logo upload & preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Shop Logo
            </label>
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e, 'logo')}
            />
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div
                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl border border-border overflow-hidden bg-card flex items-center justify-center shrink-0 cursor-pointer relative group"
              >
                {form.logo ? (
                  <>
                    <img src={form.logo} alt="Shop logo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                      Change
                    </div>
                  </>
                ) : (
                  <Store className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-cyan-400 border border-border flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{form.logo ? 'Change Logo' : 'Upload Logo'}</span>
                    </>
                  )}
                </button>
                <input
                  value={form.logo}
                  onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))}
                  placeholder="Or enter logo URL (https://…)"
                  className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Shop Banner upload & preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Shop Banner
            </label>
            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e, 'banner')}
            />
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div
                onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                className="w-24 h-16 rounded-2xl border border-border overflow-hidden bg-card flex items-center justify-center shrink-0 cursor-pointer relative group"
              >
                {form.banner ? (
                  <>
                    <img src={form.banner} alt="Shop banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                      Change
                    </div>
                  </>
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <button
                  type="button"
                  disabled={uploadingBanner}
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-cyan-400 border border-border flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingBanner ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{form.banner ? 'Change Banner' : 'Upload Banner'}</span>
                    </>
                  )}
                </button>
                <input
                  value={form.banner}
                  onChange={(e) => setForm((p) => ({ ...p, banner: e.target.value }))}
                  placeholder="Or enter banner URL (https://…)"
                  className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
          {field('City', 'city', 'Dhaka')}
          {field('Country', 'country', 'Bangladesh')}
          {field('Contact phone', 'contactPhone', '+8801…')}
          {field('Contact email', 'contactEmail', 'shop@example.com')}
        </div>
        {field('Shop tags (comma separated)', 'shopTags', 'phones, accessories, warranty')}
        {field('Shop description', 'description', 'What your shop sells and what makes it different.', true)}
        {field('Seller bio', 'sellerBio', 'A short personal introduction buyers will see.', true)}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Social links
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['facebook', 'instagram', 'youtube', 'website'] as const).map((k) => (
              <input
                key={k}
                value={form.social[k] || ''}
                onChange={(e) => setForm((p) => ({ ...p, social: { ...p.social, [k]: e.target.value } }))}
                placeholder={`${k[0].toUpperCase()}${k.slice(1)} URL`}
                className="px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-cyan-500"
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-foreground font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all"
          >
            {saving ? 'Saving…' : 'Save shop profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerShopSettings;
