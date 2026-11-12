/**
 * Products / Services tab. Reads GET /api/spaces/:id/offerings and gives anyone
 * with the `offerings.manage` permission real create / edit / delete controls —
 * the server re-checks the permission on every write.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package, Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_LIMITS,
  SPACE_OFFERING_KINDS,
  formatSpacePrice,
  type SpaceOfferingKind,
} from '@wevsoft/shared/wevspace';
import {
  createOffering,
  deleteOffering,
  fetchOfferings,
  updateOffering,
  type SpaceOffering,
} from '../../lib/wevspaceApi';
import { resolveAvatarUrl } from '../UserAvatar';
import SpaceImagePicker from './SpaceImagePicker';

interface Props {
  spaceId: string;
  canManage?: boolean;
  accent: string;
  className?: string;
}

interface FormState {
  id: string | null;
  kind: SpaceOfferingKind;
  title: string;
  description: string;
  price: string;
  currency: string;
  priceNote: string;
  url: string;
  image: string | null;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  kind: 'PRODUCT',
  title: '',
  description: '',
  price: '',
  currency: 'BDT',
  priceNote: '',
  url: '',
  image: null,
  isActive: true,
};

export default function SpaceOfferingsPanel({ spaceId, canManage = false, accent, className = '' }: Props) {
  const [offerings, setOfferings] = useState<SpaceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOfferings(spaceId);
      setOfferings(res.offerings || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load items');
      setOfferings([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const openNew = () => setForm({ ...EMPTY_FORM });

  const openEdit = (offering: SpaceOffering) =>
    setForm({
      id: offering.id,
      kind: (offering.kind as SpaceOfferingKind) || 'PRODUCT',
      title: offering.title,
      description: offering.description || '',
      price: offering.price === null || offering.price === undefined ? '' : String(offering.price),
      currency: offering.currency || 'BDT',
      priceNote: offering.priceNote || '',
      url: offering.url || '',
      image: offering.image || null,
      isActive: offering.isActive !== false,
    });

  const save = async () => {
    if (!form || saving) return;
    if (form.title.trim().length < 2) {
      toast.error('Give this item a title');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.price.trim(),
        currency: form.currency.trim() || 'BDT',
        priceNote: form.priceNote.trim(),
        url: form.url.trim(),
        image: form.image,
        isActive: form.isActive,
      };
      if (form.id) await updateOffering(form.id, payload);
      else await createOffering(spaceId, payload);
      toast.success(form.id ? 'Item updated' : 'Item added');
      setForm(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save this item');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (offering: SpaceOffering) => {
    if (!window.confirm(`Remove “${offering.title}” from this WevSpace?`)) return;
    setDeletingId(offering.id);
    try {
      await deleteOffering(offering.id);
      setOfferings((current) => current.filter((o) => o.id !== offering.id));
      toast.success('Item removed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove this item');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={className}>
      {canManage && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-muted-foreground">
            {offerings.length} {offerings.length === 1 ? 'item' : 'items'}
          </p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity"
            style={{ background: accent }}
          >
            <Plus size={14} /> Add item
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-3xl p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : offerings.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-3xl p-10 text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
            <ShoppingBag size={20} />
          </span>
          <p className="mt-3 font-black text-sm">Nothing listed yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {canManage
              ? 'Add the products, services or packages this WevSpace offers. Each one can carry a price, a note and a link.'
              : 'This WevSpace has not listed any products or services yet.'}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={openNew}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity"
            >
              <Plus size={14} /> Add your first item
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offering) => {
            const image = resolveAvatarUrl(offering.image);
            const kindLabel =
              SPACE_OFFERING_KINDS.find((k) => k.id === offering.kind)?.label || 'Item';
            return (
              <div
                key={offering.id}
                className={`bg-card border border-border rounded-3xl overflow-hidden flex flex-col ${
                  offering.isActive === false ? 'opacity-60' : ''
                }`}
              >
                <div className="aspect-[4/3] bg-muted grid place-items-center">
                  {image ? (
                    <img src={image} alt={offering.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={26} className="text-muted-foreground" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide"
                      style={{ background: `${accent}1a`, color: accent }}
                    >
                      {kindLabel}
                    </span>
                    {offering.isActive === false && (
                      <span className="px-2 py-0.5 rounded-lg bg-muted text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-black text-sm">{offering.title}</h3>
                  {offering.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{offering.description}</p>
                  )}
                  <p className="mt-2 text-sm font-black">
                    {formatSpacePrice(offering.price, offering.currency, offering.priceNote)}
                  </p>

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    {offering.url && (
                      <a
                        href={offering.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex-1 text-center px-3 py-2 rounded-xl text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity"
                        style={{ background: accent }}
                      >
                        View
                      </a>
                    )}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(offering)}
                          aria-label={`Edit ${offering.title}`}
                          className="p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === offering.id}
                          onClick={() => void remove(offering)}
                          aria-label={`Remove ${offering.title}`}
                          className="p-2 rounded-xl bg-muted text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                        >
                          {deletingId === offering.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor — a centred dialog on desktop, a bottom sheet on mobile */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-black text-base">{form.id ? 'Edit item' : 'Add item'}</h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Close"
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <SpaceImagePicker
                spaceId={spaceId}
                label="Image"
                shape="cover"
                value={form.image}
                onChange={(image) => setForm((f) => (f ? { ...f, image } : f))}
              />

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">Type</span>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => (f ? { ...f, kind: e.target.value as SpaceOfferingKind } : f))}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                >
                  {SPACE_OFFERING_KINDS.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">Title</span>
                <input
                  type="text"
                  value={form.title}
                  maxLength={SPACE_LIMITS.offeringTitle.max}
                  onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">Description</span>
                <textarea
                  value={form.description}
                  rows={3}
                  maxLength={SPACE_LIMITS.offeringDescription.max}
                  onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none resize-none"
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block col-span-2">
                  <span className="block text-xs font-extrabold mb-1.5">Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => (f ? { ...f, price: e.target.value } : f))}
                    placeholder="Leave empty to hide"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-extrabold mb-1.5">Currency</span>
                  <input
                    type="text"
                    value={form.currency}
                    maxLength={3}
                    onChange={(e) => setForm((f) => (f ? { ...f, currency: e.target.value.toUpperCase() } : f))}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none uppercase"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">Price note</span>
                <input
                  type="text"
                  value={form.priceNote}
                  maxLength={40}
                  onChange={(e) => setForm((f) => (f ? { ...f, priceNote: e.target.value } : f))}
                  placeholder="per month, starting from, negotiable…"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-extrabold mb-1.5">Link</span>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => (f ? { ...f, url: e.target.value } : f))}
                  placeholder="https://"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">Visible on the Space</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm((f) => (f ? { ...f, isActive: !f.isActive } : f))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.isActive ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      form.isActive ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2.5 rounded-2xl bg-muted text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {form.id ? 'Save changes' : 'Add item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
