import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, Search, Filter, Edit3, Trash2, Sparkles, Check, X, Loader2, Eye, Tag, AlertCircle, Upload, Image as ImageIcon, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { listingCategoryNames, useMarketplaceCategories, uploadMarketplaceMedia } from './commerce/utils';
import ProductSpecBuilder from './commerce/ProductSpecBuilder';

interface SellerProductsManagerProps {
  onOpenAiTools: () => void;
}

export const SellerProductsManager: React.FC<SellerProductsManagerProps> = ({ onOpenAiTools }) => {
  const token = useStore((s) => s.token);
  const liveCategories = useMarketplaceCategories();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New Product Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1499');
  const [discountPrice, setDiscountPrice] = useState('');
  const [category, setCategory] = useState('Electronics & Gadgets');
  const [stockQuantity, setStockQuantity] = useState('15');
  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const [sku, setSku] = useState(`SKU-${Date.now().toString().slice(-6)}`);
  const [warranty, setWarranty] = useState('1 Year Official Warranty');
  const [returnPolicy, setReturnPolicy] = useState('7 Days Free Return');
  const [shippingInfo, setShippingInfo] = useState('Wevsoft Express 24-48h Delivery');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const [subtitle, setSubtitle] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [specs, setSpecs] = useState<any[]>([]);

  // Variants array state
  const [variantName, setVariantName] = useState('Color');
  const [variantOptions, setVariantOptions] = useState('Black, White, Blue');
  const [variantsList, setVariantsList] = useState<any[]>([
    { name: 'Color', options: ['Black', 'White', 'Blue'] }
  ]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/products?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      toast.error('Failed to load seller products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchProducts();
  }, [filterStatus]);

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        toast.error(`"${f.name}" is not an image file`);
        return;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 15MB limit`);
        return;
      }
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const url = await uploadMarketplaceMedia(file, token);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setImages((prev) => {
          const next = [...prev, ...uploadedUrls];
          if (!coverImage) {
            setCoverImage(next[0]);
          }
          return next;
        });
        toast.success(`Uploaded ${uploadedUrls.length} product image${uploadedUrls.length > 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const removedUrl = prev[indexToRemove];
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (coverImage === removedUrl) {
        setCoverImage(next[0] || '');
      }
      return next;
    });
  };

  const handleSetCover = (url: string) => {
    setCoverImage(url);
    toast.success('Cover image updated');
  };

  const handleAddVariant = () => {
    if (!variantName.trim() || !variantOptions.trim()) return;
    const opts = variantOptions.split(',').map(s => s.trim()).filter(Boolean);
    setVariantsList([...variantsList, { name: variantName, options: opts }]);
    setVariantName('');
    setVariantOptions('');
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter product title');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one product photo');
      return;
    }

    const activeCover = coverImage || images[0] || '';

    try {
      const res = await fetch('/api/v1/marketplace/seller-system/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          category,
          stockQuantity: Number(stockQuantity),
          sku,
          warranty,
          returnPolicy,
          shippingInfo,
          images: images,
          galleryJson: JSON.stringify(images),
          coverImage: activeCover,
          subtitle,
          subcategory,
          specsJson: JSON.stringify(specs),
          variants: variantsList,
          approvalStatus: 'PUBLISHED'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('🎉 Product published to WevMall!');
        setShowModal(false);
        fetchProducts();
        // reset form
        setTitle('');
        setDescription('');
        setImages([]);
        setCoverImage('');
      } else {
        toast.error(data.error || 'Failed to add product');
      }
    } catch (err) {
      toast.error('Network error while publishing product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product listing?')) return;
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Product deleted');
        fetchProducts();
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Package size={22} className="text-purple-400" />
            Product Inventory Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage SKU variants, stock quantities, and Escrow warranty details
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiTools}
            className="px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-xs font-bold flex items-center gap-2"
          >
            <Sparkles size={16} />
            AI Listing Writer
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold shadow-lg hover:from-purple-500 hover:to-indigo-500 flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add New Product
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
            placeholder="Search by title, SKU, or category..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'PUBLISHED', 'PENDING', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterStatus === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table / Cards */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={28} className="animate-spin text-purple-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border rounded-3xl space-y-3">
          <Package size={40} className="mx-auto text-muted-foreground opacity-50" />
          <p className="text-sm font-bold text-foreground">No products found in your inventory</p>
          <p className="text-xs text-muted-foreground">Create your first product listing to start selling across Bangladesh!</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
          >
            Add New Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const images = p.images && typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [];
            const thumbnail = Array.isArray(images) && images[0] ? images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

            return (
              <div key={p.id} className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-3 hover:border-purple-500/50 transition-all shadow-sm">
                <div className="flex gap-3">
                  <img src={thumbnail} alt={p.title} className="w-20 h-20 rounded-xl object-cover border border-border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                        {p.category || 'General'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        {p.approvalStatus || 'PUBLISHED'}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-foreground truncate mt-1">{p.title}</h4>
                    <p className="text-xs text-muted-foreground">SKU: {p.sku || p.id.slice(0, 8)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground">Price: </span>
                    <span className="font-extrabold text-foreground">৳{p.price}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock: </span>
                    <span className="font-bold text-foreground">{p.stockQuantity || 10} units</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                    {p.warranty || '1 Year Official Warranty'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Product Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card dark:bg-zinc-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl max-w-2xl w-full relative space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-purple-400" />
                  <h3 className="text-lg font-extrabold text-foreground">Create Product Listing</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">Product Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Sony RX100 VII 4K Camera"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    >
                      {listingCategoryNames(liveCategories, category).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product Images & Gallery */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-purple-400" />
                        Product Photos & Gallery *
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Upload real product photos. Click any photo to select it as the cover photo.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={uploadingImages}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {uploadingImages ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          <span>Upload Photos</span>
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUploadImages}
                    />
                  </div>

                  {images.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 pt-1">
                      {images.map((img, idx) => {
                        const isCover = (coverImage ? img === coverImage : idx === 0);
                        return (
                          <div
                            key={idx}
                            className={`group relative aspect-square rounded-xl overflow-hidden border-2 bg-muted/30 cursor-pointer transition-all ${
                              isCover ? 'border-purple-500 shadow-md ring-2 ring-purple-500/30' : 'border-border hover:border-purple-400/50'
                            }`}
                            onClick={() => handleSetCover(img)}
                          >
                            <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                            {isCover && (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow">
                                <Star size={9} fill="white" /> Cover
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(idx);
                              }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors"
                              title="Remove image"
                            >
                              <X size={11} />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              {isCover ? 'Active Cover' : 'Set Cover'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadingImages && fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                    >
                      <Upload size={24} className="mx-auto text-muted-foreground mb-1.5 opacity-60" />
                      <p className="text-xs font-bold text-foreground">Click to upload product images</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Supports PNG, JPG, WebP up to 15MB each. Multi-image selection supported.</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Description *</label>
                    <button
                      type="button"
                      onClick={onOpenAiTools}
                      className="text-[11px] text-purple-400 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Sparkles size={12} />
                      Write with Gemini AI
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter item specs, features, and warranty highlights..."
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">Price (BDT ৳) *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Stock Quantity *</label>
                    <input
                      type="number"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">SKU Number</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">Official Warranty</label>
                    <input
                      type="text"
                      value={warranty}
                      onChange={(e) => setWarranty(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Return Policy</label>
                    <input
                      type="text"
                      value={returnPolicy}
                      onChange={(e) => setReturnPolicy(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">Subtitle</label>
                    <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Subcategory</label>
                    <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g. Mobile Phones" className="w-full mt-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-sm" />
                  </div>
                </div>
                <ProductSpecBuilder category={category} subcategory={subcategory} value={specs} onChange={setSpecs} />

                {/* Variants Config */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">SKU Variants (Color, Size, etc.)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="Variant (e.g. Size)"
                      className="w-1/3 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border text-xs"
                    />
                    <input
                      type="text"
                      value={variantOptions}
                      onChange={(e) => setVariantOptions(e.target.value)}
                      placeholder="Options (comma separated: S, M, L, XL)"
                      className="w-2/3 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-border text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 text-xs font-bold hover:bg-purple-600/30 shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {variantsList.map((v, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-bold">
                        {v.name}: {v.options.join(', ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-extrabold shadow-lg hover:from-purple-500 hover:to-indigo-500"
                  >
                    Publish Listing
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
