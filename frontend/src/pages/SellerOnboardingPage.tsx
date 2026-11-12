import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Store, MapPin, Phone, Mail, Wallet, CheckCircle, ArrowRight, ChevronLeft, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { listingCategoryNames, useMarketplaceCategories } from '../components/marketplace/commerce/utils';

export default function SellerOnboardingPage() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const liveCategories = useMarketplaceCategories();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shopName: '',
    shopCategory: 'General',
    description: '',
    contactPhone: '',
    contactEmail: user?.email || '',
    address: '',
    city: 'Dhaka',
    country: 'Bangladesh',
    payoutMethod: 'bKash',
    mobilePaymentNumber: '',
    sellerType: 'Individual',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/v1/marketplace/seller-system/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(data.message || 'Shop created successfully!');
        navigate('/seller/dashboard');
      } else {
        toast.error(data.error || 'Failed to create shop');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-[#F57224]/10 rounded-full mb-4 border border-[#F57224]/20">
            <Store className="w-8 h-8 text-[#F57224]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Become a Seller</h1>
          <p className="mt-2 text-muted-foreground">Open your shop on Wevsoft Mall in three quick steps.</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full" />
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#F57224] rounded-full transition-all duration-500`} style={{ width: `${((step - 1) / 2) * 100}%` }} />
            
            {[1, 2, 3].map((num) => (
              <div key={num} className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                step >= num ? 'bg-[#F57224] border-[#F57224] text-white' : 'bg-background border-border text-muted-foreground'
              }`}>
                {step > num ? <CheckCircle className="w-6 h-6" /> : <span className="font-semibold">{num}</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm font-medium text-muted-foreground">
            <span>Shop</span>
            <span>Address</span>
            <span>Payout</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: Shop Details */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#F57224]" />
                  Shop Information
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Shop Name *</label>
                  <input required name="shopName" value={formData.shopName} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="e.g. Wevsoft Official Store"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select aria-label="Category" name="shopCategory" value={formData.shopCategory} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                    >
                      {listingCategoryNames(liveCategories, formData.shopCategory).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Seller Type</label>
                    <select aria-label="Seller type" name="sellerType" value={formData.sellerType} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Business">Registered Business</option>
                      <option value="Brand">Official Brand</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all resize-none"
                    placeholder="Tell buyers what you sell..."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Contact Info */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#F57224]" />
                  Contact & Location
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Phone className="w-4 h-4"/> Phone *</label>
                    <input required type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                      placeholder="+880 1..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Mail className="w-4 h-4"/> Email *</label>
                    <input required type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                      placeholder="shop@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Address *</label>
                  <input required name="address" value={formData.address} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                    placeholder="House, Street, Area"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input required name="city" value={formData.city} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input required name="country" value={formData.country} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                      disabled
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Payout Info */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Payout Configuration
                </h2>
                <div className="bg-[#F57224]/5 border border-[#F57224]/20 rounded-xl p-4 mb-4 text-sm text-[#F57224]">
                  We need your payout details to transfer your earnings safely. You can change this later.
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile Payment Method</label>
                  <select name="payoutMethod" value={formData.payoutMethod} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Account Number</label>
                  <input name="mobilePaymentNumber" value={formData.mobilePaymentNumber} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                    placeholder="e.g. 01700000000 (Optional)"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)}
                  className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div /> // Spacer
              )}
              
              <button type="submit" disabled={loading}
                className="px-8 py-3 rounded-xl bg-[#F57224] text-white hover:bg-[#e3651a] transition-colors font-medium flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {step === 3 ? (loading ? 'Creating Shop...' : 'Complete Setup') : 'Continue'}
                {step !== 3 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
