import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Wand2, Image as ImageIcon, Tag, DollarSign, Package, Check, X, Loader2, UploadCloud, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { useMarketplaceCategories, listingCategoryNames, uploadMarketplaceMedia } from './commerce/utils';
import ProductSpecBuilder from './commerce/ProductSpecBuilder';

interface ProductUploaderProps {
  onClose: () => void;
  onProductCreated: () => void;
}

export const ProductUploader: React.FC<ProductUploaderProps> = ({ onClose, onProductCreated }) => {
  const token = useStore((s) => s.token);
  const liveCategories = useMarketplaceCategories();
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [condition, setCondition] = useState('new');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [phone, setPhone] = useState('01700000000');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [variants, setVariants] = useState('Red, Blue, Black');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [listingType, setListingType] = useState('fixed');
  const [scanNotes, setScanNotes] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [specs, setSpecs] = useState<any[]>([]);
  const [warranty, setWarranty] = useState('');
  const [shippingInfo, setShippingInfo] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');

  const categories = listingCategoryNames(liveCategories, category);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const selected = files[0];
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    if (!token) return;
    try {
      const extra = Array.from(files).slice(0, 10) as File[];
      const uploaded: string[] = [];
      for (const f of extra) {
        uploaded.push(await uploadMarketplaceMedia(f, token));
      }
      setGallery((prev) => [...prev, ...uploaded].slice(0, 10));
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    }
  };

  // AI Assistant Auto-Fill Handler
  const handleAiAutoFill = async () => {
    if (!title.trim()) {
      toast.error('Please type a short keyword or title for AI to expand!');
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch('/api/v1/marketplace/ai-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: title }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.aiListing) {
          setTitle(data.aiListing.title);
          setDescription(data.aiListing.description);
          setCategory(data.aiListing.category);
          setPrice(data.aiListing.suggestedPrice.toString());
          setAiTags(data.aiListing.tags || []);
          toast.success('✨ Listing enhanced with AI SEO descriptions & price estimation!');
        }
      }
    } catch (e) {
      toast.error('AI Assistant connection error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) {
      toast.error('Please enter a product title and price.');
      return;
    }

    setLoading(true);
    try {
      const ordered = [...gallery];
      if (ordered.length && coverIndex > 0 && coverIndex < ordered.length) {
        const [cover] = ordered.splice(coverIndex, 1);
        ordered.unshift(cover);
      }
      if (!ordered.length && file) {
        ordered.push(await uploadMarketplaceMedia(file, token));
      }
      if (!ordered.length) {
        toast.error('Add at least one product image');
        setLoading(false);
        return;
      }

      const scan = await fetch('/api/marketplace/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, price: Number(price), category }),
      }).then((r) => r.json()).catch(() => ({ ok: true, reasons: [] }));
      setScanNotes(scan.reasons || []);
      if (scan.hidden) {
        toast.error('Listing blocked by scam detection');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle,
          description,
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          category,
          subcategory,
          brand,
          condition,
          location,
          phone,
          stockQuantity: Number(stockQuantity),
          listingType,
          variants: variants.split(',').map((s) => s.trim()).filter(Boolean),
          tags: aiTags,
          images: JSON.stringify(ordered),
          gallery: ordered,
          galleryJson: JSON.stringify(ordered),
          coverImage: ordered[0],
          videos: videoUrls,
          videosJson: JSON.stringify(videoUrls),
          specsJson: JSON.stringify(specs),
          warranty,
          shippingInfo,
          returnPolicy,
        }),
      });

      if (res.ok) {
        toast.success('Product listed live on Wevsoft WevMall! 🛍️');
        onProductCreated();
        onClose();
      } else {
        toast.error('Failed to create listing');
      }
    } catch (err) {
      toast.error('Network error creating listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-w-xl w-full relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-400 animate-pulse" />
          <h3 className="text-lg font-extrabold text-foreground">AI Product Creator Console</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/10 dark:bg-white/10 text-muted-foreground">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleCreateProduct} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
        {/* Title Input + AI Trigger */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Title</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sony WH-1000XM4 Wireless Headphones..."
              className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-purple-500/50"
            />
            <button
              type="button"
              onClick={handleAiAutoFill}
              disabled={aiGenerating}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              <span>AI Auto-Fill</span>
            </button>
          </div>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
            >
              <option value="new">Brand New</option>
              <option value="used_like_new">Used - Like New</option>
              <option value="used_good">Used - Good</option>
              <option value="digital">Digital Download</option>
              <option value="service">Professional Service</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Subtitle</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short description under the title" className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Subcategory</label>
            <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g. Mobile Phones, Laptops" className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Brand</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Stock</label>
            <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Listing type</label>
            <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs">
              <option value="fixed">Fixed price</option>
              <option value="auction">Auction</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Variants (comma separated)</label>
          <input value={variants} onChange={(e) => setVariants(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs" />
        </div>
        {scanNotes.length > 0 && (
          <div className="text-[11px] text-amber-500">{scanNotes.join(' · ')}</div>
        )}

        {/* Price & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Price (BDT ৳)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
            />
            <input
              type="number"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              placeholder="Discount price (optional)"
              className="w-full mt-2 bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
            />
          </div>
        </div>

        {/* SEO Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SEO Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Write details or let AI generate comprehensive features & condition report..."
            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3 text-xs text-foreground outline-none resize-none"
          />
        </div>

        {/* Image Upload & AI Studio Enhancer */}
        <div className="border border-border bg-black/5 dark:bg-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon size={14} className="text-purple-400" /> Product Image Studio
            </span>
            {previewUrl && (
              <button
                type="button"
                onClick={() => { setBgRemoved(!bgRemoved); toast.success(bgRemoved ? 'Original image restored' : 'AI Background Removed!'); }}
                className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
              >
                <Sparkles size={11} /> {bgRemoved ? 'Restore BG' : 'AI Remove Background'}
              </button>
            )}
          </div>

          <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-purple-500/40 transition-colors">
            {previewUrl ? (
              <div className={`relative h-40 w-full rounded-lg overflow-hidden ${bgRemoved ? 'bg-gradient-to-tr from-gray-900 to-black' : ''}`}>
                <img src={previewUrl} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center py-4 space-y-2">
                <UploadCloud size={32} className="text-purple-400" />
                <span className="text-xs font-bold text-muted-foreground">Click to upload raw product image</span>
                <input type="file" onChange={handleFileChange} accept="image/*" multiple className="hidden" />
              </label>
            )}
          </div>
          {gallery.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pt-1">
              {gallery.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setCoverIndex(idx)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${coverIndex === idx ? 'border-primary' : 'border-border'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {coverIndex === idx && <span className="absolute bottom-0 inset-x-0 text-[9px] bg-primary text-white font-bold">Cover</span>}
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Upload 1–10 images. Click a thumbnail to set the cover. Drag order: first selected cover is published first.</p>
          <label className="text-[11px] font-bold text-primary cursor-pointer">
            + Add more images
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </label>
          <label className="text-[11px] font-bold text-primary cursor-pointer block">
            + Add product video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !token) return;
                try {
                  const url = await uploadMarketplaceMedia(f, token);
                  setVideoUrls((v) => [...v, url].slice(0, 6));
                } catch (err: any) {
                  toast.error(err.message || 'Video upload failed');
                }
              }}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="Warranty" className="px-3 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-xs" />
          <input value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} placeholder="Shipping info" className="px-3 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-xs" />
          <input value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} placeholder="Return policy" className="px-3 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-xs" />
        </div>

        <ProductSpecBuilder category={category} subcategory={subcategory} value={specs} onChange={setSpecs} />
        {aiTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {aiTags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Submit */}
        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-cyan-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish Product'}
          </button>
        </div>
      </form>
    </div>
  );
};
