import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Store, Building2, User, CreditCard, ArrowRight, Check, X,
  Loader2, Phone, Mail, MapPin, Building, Lock, Upload, FileText, CheckCircle2,
  AlertCircle, ChevronRight, ChevronDown, Globe, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { SearchableLocationSelect } from './SearchableLocationSelect';
import { listingCategoryNames, useMarketplaceCategories } from './commerce/utils';

interface SellerOnboardingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SellerOnboardingModal: React.FC<SellerOnboardingModalProps> = ({ onClose, onSuccess }) => {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const liveCategories = useMarketplaceCategories();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State: Seller Type, Basic Shop & Payout Info
  const [sellerType, setSellerType] = useState<'Individual' | 'Business' | 'Brand'>('Individual');
  const [displayName, setDisplayName] = useState(user?.name || 'Wevsoft Seller');
  const [shopName, setShopName] = useState(`${user?.name || 'My'}'s Official Shop`);
  const [shopCategory, setShopCategory] = useState('Electronics & Gadgets');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('01700000000');
  const [otpCode, setOtpCode] = useState('1234');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(true);
  const [payoutMethod, setPayoutMethod] = useState<'bKash' | 'Nagad' | 'Bank'>('bKash');
  const [mobilePaymentNumber, setMobilePaymentNumber] = useState('01700000000');
  const [bankAccountName, setBankAccountName] = useState(user?.name || '');
  const [bankName, setBankName] = useState('BRAC Bank Ltd.');
  const [bankAccountNumber, setBankAccountNumber] = useState('1501204850001');

  // Step 2 State: Cascading Address System (Dynamic API Database)
  const [countries, setCountries] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [upazilas, setUpazilas] = useState<any[]>([]);
  const [unions, setUnions] = useState<any[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedUpazilaId, setSelectedUpazilaId] = useState('');
  const [selectedUnionId, setSelectedUnionId] = useState('');

  const [villageArea, setVillageArea] = useState('Dhanmondi Residential Area');
  const [roadStreet, setRoadStreet] = useState('Road 27, Block K');
  const [houseNumber, setHouseNumber] = useState('House 45, Floor 4');
  const [postalCode, setPostalCode] = useState('1209');

  // Step 3 State: Optional Verification Documents
  const [docType, setDocType] = useState<'NID' | 'PASSPORT' | 'DRIVING_LICENSE' | 'TRADE_LICENSE' | 'BUSINESS_REG'>('NID');
  const [docNumber, setDocNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string>('');
  const [backImage, setBackImage] = useState<string>('');
  const [selfieImage, setSelfieImage] = useState<string>('');
  const [isSkippingVerification, setIsSkippingVerification] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load Countries on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await fetch('/api/v1/locations/countries');
      const data = await res.json();
      if (data.success && data.countries.length > 0) {
        setCountries(data.countries);
        setSelectedCountryId(data.countries[0].id);
      } else {
        // Auto-seed Bangladesh if empty
        const seedRes = await fetch('/api/v1/locations/seed-default', { method: 'POST' });
        const seedData = await seedRes.json();
        if (seedData.success) {
          const res2 = await fetch('/api/v1/locations/countries');
          const data2 = await res2.json();
          if (data2.success && data2.countries.length > 0) {
            setCountries(data2.countries);
            setSelectedCountryId(data2.countries[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching countries:', e);
    }
  };

  // Fetch Divisions when country changes
  useEffect(() => {
    if (!selectedCountryId) return;
    fetch(`/api/v1/locations/divisions?country_id=${selectedCountryId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.divisions.length > 0) {
          setDivisions(data.divisions);
          setSelectedDivisionId(data.divisions[0].id);
        } else {
          setDivisions([]);
          setSelectedDivisionId('');
        }
      })
      .catch(e => console.error(e));
  }, [selectedCountryId]);

  // Fetch Districts when division changes
  useEffect(() => {
    if (!selectedDivisionId) return;
    fetch(`/api/v1/locations/districts?division_id=${selectedDivisionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.districts.length > 0) {
          setDistricts(data.districts);
          setSelectedDistrictId(data.districts[0].id);
        } else {
          setDistricts([]);
          setSelectedDistrictId('');
        }
      })
      .catch(e => console.error(e));
  }, [selectedDivisionId]);

  // Fetch Upazilas when district changes
  useEffect(() => {
    if (!selectedDistrictId) return;
    fetch(`/api/v1/locations/upazilas?district_id=${selectedDistrictId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.upazilas.length > 0) {
          setUpazilas(data.upazilas);
          setSelectedUpazilaId(data.upazilas[0].id);
        } else {
          setUpazilas([]);
          setSelectedUpazilaId('');
        }
      })
      .catch(e => console.error(e));
  }, [selectedDistrictId]);

  // Fetch Unions when upazila changes
  useEffect(() => {
    if (!selectedUpazilaId) return;
    fetch(`/api/v1/locations/unions?upazila_id=${selectedUpazilaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.unions.length > 0) {
          setUnions(data.unions);
          setSelectedUnionId(data.unions[0].id);
        } else {
          setUnions([]);
          setSelectedUnionId('');
        }
      })
      .catch(e => console.error(e));
  }, [selectedUpazilaId]);

  const handleSendOtp = () => {
    setOtpSent(true);
    toast.success(`OTP sent to ${contactPhone} (Demo Code: 1234)`);
  };

  const handleVerifyOtp = () => {
    if (otpCode === '1234' || otpCode.length === 4) {
      setOtpVerified(true);
      toast.success('Phone verified successfully!');
    } else {
      toast.error('Invalid OTP code. Use 1234 for demo.');
    }
  };

  const simulateImageUpload = (setter: React.Dispatch<React.SetStateAction<string>>, label: string) => {
    setter(`https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80`);
    toast.success(`${label} uploaded successfully`);
  };

  const handleCompleteRegistration = async (skipVerification: boolean) => {
    if (!selectedCountryId || !selectedDivisionId || !selectedDistrictId || !villageArea) {
      toast.error('Please fill in required address fields');
      return;
    }
    setLoading(true);
    setIsSkippingVerification(skipVerification);

    try {
      const selectedCountryName = countries.find(c => c.id === selectedCountryId)?.name || 'Bangladesh';
      const selectedDivisionName = divisions.find(d => d.id === selectedDivisionId)?.name || 'Dhaka';
      const selectedDistrictName = districts.find(d => d.id === selectedDistrictId)?.name || 'Dhaka';
      const selectedUpazilaName = upazilas.find(u => u.id === selectedUpazilaId)?.name || '';

      const fullAddressString = `${villageArea}, ${roadStreet}, ${selectedUpazilaName}, ${selectedDistrictName}, ${selectedDivisionName}, ${selectedCountryName}`;

      const res = await fetch('/api/v1/marketplace/seller-system/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName,
          shopName,
          shopCategory,
          sellerType,
          contactPhone,
          contactEmail,
          country: selectedCountryName,
          city: selectedDistrictName,
          address: fullAddressString,
          otpVerified,
          payoutMethod,
          mobilePaymentNumber: payoutMethod !== 'Bank' ? mobilePaymentNumber : undefined,
          bankAccountName: payoutMethod === 'Bank' ? bankAccountName : undefined,
          bankName: payoutMethod === 'Bank' ? bankName : undefined,
          bankAccountNumber: payoutMethod === 'Bank' ? bankAccountNumber : undefined,
          // New verification status logic
          verificationStatus: skipVerification ? 'Unverified Seller' : 'Pending Review',
          verificationDocument: skipVerification ? null : {
            docType,
            docNumber,
            frontImage: frontImage || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
            backImage,
            selfieImage
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        if (skipVerification) {
          setSuccessBanner(
            'Your shop has been created successfully. You can upload verification documents later to receive a Verified Seller badge and access additional marketplace features.'
          );
        } else {
          setSuccessBanner(
            'Your shop and verification documents have been submitted! Your verification status is now Pending Review. You can start managing products immediately.'
          );
        }
      } else {
        toast.error(data.error || 'Failed to create seller profile');
      }
    } catch (error) {
      toast.error('Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Become a Wevsoft WevMall Seller</h2>
              <p className="text-xs text-slate-400">Expand your business across the Wevsoft Ecosystem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 pt-4 pb-2 bg-slate-900/30 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span className={step >= 1 ? 'text-cyan-400 flex items-center gap-1.5' : ''}>
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500 text-cyan-400 flex items-center justify-center text-[10px]">1</span>
              Shop & Payout Setup
            </span>
            <span className={step >= 2 ? 'text-cyan-400 flex items-center gap-1.5' : ''}>
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
              Complete Address
            </span>
            <span className={step === 3 ? 'text-cyan-400 flex items-center gap-1.5' : ''}>
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500 text-cyan-400 flex items-center justify-center text-[10px]">3</span>
              Optional Verification (KYC)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
              initial={{ width: '33%' }}
              animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {successBanner ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Welcome to Wevsoft WevMall!</h3>
              <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                {successBanner}
              </p>
              <div className="pt-3">
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700 transition-all"
                >
                  Enter Seller Dashboard
                </button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Seller Type Selection */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      1. Choose Your Seller Account Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'Individual', label: 'Individual', icon: User, desc: 'Personal craft, hobby & resale' },
                        { id: 'Business', label: 'Business Seller', icon: Store, desc: 'Registered shop & enterprise' },
                        { id: 'Brand', label: 'Official Brand', icon: Building2, desc: 'Trademarked company store' }
                      ].map(type => {
                        const Icon = type.icon;
                        const isSelected = sellerType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setSellerType(type.id as any)}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                                : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                            }`}
                          >
                            <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                            <h4 className="text-sm font-semibold text-white">{type.label}</h4>
                            <p className="text-xs text-slate-400 mt-1">{type.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shop Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Shop / Brand Name
                      </label>
                      <input
                        type="text"
                        value={shopName}
                        onChange={e => setShopName(e.target.value)}
                        placeholder="e.g. Wevsoft Tech Store"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Primary Category
                      </label>
                      <select
                        value={shopCategory}
                        onChange={e => setShopCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      >
                        {listingCategoryNames(liveCategories, shopCategory).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phone OTP Verification */}
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Mobile OTP Verification
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="01700000000"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm transition-colors"
                        >
                          Send OTP
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                          <Check className="w-4 h-4" /> OTP Sent
                        </span>
                      )}
                    </div>

                    {otpSent && !otpVerified && (
                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="text"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          placeholder="Enter 4-digit OTP"
                          maxLength={4}
                          className="w-44 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-center tracking-widest font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm"
                        >
                          Verify Code
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Payout Setup */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Payout & Banking Method
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['bKash', 'Nagad', 'Bank'] as const).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPayoutMethod(method)}
                          className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                            payoutMethod === method
                              ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                              : 'bg-slate-800/40 border-slate-700 text-slate-400'
                          }`}
                        >
                          {method === 'Bank' ? 'Bank Transfer' : `${method} Wallet`}
                        </button>
                      ))}
                    </div>

                    {payoutMethod !== 'Bank' ? (
                      <div>
                        <input
                          type="text"
                          value={mobilePaymentNumber}
                          onChange={e => setMobilePaymentNumber(e.target.value)}
                          placeholder={`${payoutMethod} Account Number`}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          placeholder="Bank Name"
                          className="px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white"
                        />
                        <input
                          type="text"
                          value={bankAccountNumber}
                          onChange={e => setBankAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className="px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300">
                      <strong className="text-white">Dynamic Global Address System:</strong> Select your country to load verified administrative divisions, districts, and upazilas automatically from our location database.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Country */}
                    <SearchableLocationSelect
                      label="Country"
                      required
                      placeholder="Search country..."
                      options={countries.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        local_name: c.local_name,
                        flag: c.flag,
                        code: c.code
                      }))}
                      value={selectedCountryId}
                      onChange={(val) => {
                        setSelectedCountryId(val);
                        setSelectedDivisionId('');
                        setSelectedDistrictId('');
                        setSelectedUpazilaId('');
                        setSelectedUnionId('');
                      }}
                    />

                    {/* Division */}
                    <SearchableLocationSelect
                      label="Division / State"
                      required
                      placeholder="Search division or state..."
                      disabled={divisions.length === 0}
                      options={divisions.map((d: any) => ({
                        id: d.id,
                        name: d.name,
                        local_name: d.local_name,
                        code: d.code
                      }))}
                      value={selectedDivisionId}
                      onChange={(val) => {
                        setSelectedDivisionId(val);
                        setSelectedDistrictId('');
                        setSelectedUpazilaId('');
                        setSelectedUnionId('');
                      }}
                    />

                    {/* District */}
                    <SearchableLocationSelect
                      label="District / City"
                      required
                      placeholder="Search district or city..."
                      disabled={districts.length === 0}
                      options={districts.map((d: any) => ({
                        id: d.id,
                        name: d.name,
                        local_name: d.local_name
                      }))}
                      value={selectedDistrictId}
                      onChange={(val) => {
                        setSelectedDistrictId(val);
                        setSelectedUpazilaId('');
                        setSelectedUnionId('');
                      }}
                    />

                    {/* Upazila / Thana */}
                    <SearchableLocationSelect
                      label="Upazila / Thana"
                      required
                      placeholder="Search upazila or thana..."
                      disabled={upazilas.length === 0}
                      options={upazilas.map((u: any) => ({
                        id: u.id,
                        name: u.name,
                        local_name: u.local_name
                      }))}
                      value={selectedUpazilaId}
                      onChange={(val) => {
                        setSelectedUpazilaId(val);
                        setSelectedUnionId('');
                      }}
                    />

                    {/* Union / Sub-Thana */}
                    <SearchableLocationSelect
                      label="Union / Sub-area (Optional)"
                      placeholder="Search union (Optional)..."
                      allowClear
                      disabled={unions.length === 0}
                      className="col-span-2"
                      options={unions.map((u: any) => ({
                        id: u.id,
                        name: u.name,
                        local_name: u.local_name
                      }))}
                      value={selectedUnionId}
                      onChange={(val) => setSelectedUnionId(val)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Village / Residential Area (Required)
                      </label>
                      <input
                        type="text"
                        value={villageArea}
                        onChange={e => setVillageArea(e.target.value)}
                        placeholder="e.g. Dhanmondi Residential Area"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Road / Street
                      </label>
                      <input
                        type="text"
                        value={roadStreet}
                        onChange={e => setRoadStreet(e.target.value)}
                        placeholder="e.g. Road 27, Block K"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        House / Building Number
                      </label>
                      <input
                        type="text"
                        value={houseNumber}
                        onChange={e => setHouseNumber(e.target.value)}
                        placeholder="e.g. House 45, Floor 4"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="e.g. 1209"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Identity Documents are Optional</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        You can upload your verification documents now to enter review for the <strong>Verified Seller Badge</strong>, or <strong>skip for now</strong> and complete registration as an <strong>Unverified Seller</strong>. You can upload documents at any time from <code>Settings → Verification</code>.
                      </p>
                    </div>
                  </div>

                  {/* Document Type Selection */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Select Document Type
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'NID', label: 'National ID' },
                        { id: 'PASSPORT', label: 'Passport' },
                        { id: 'DRIVING_LICENSE', label: 'Driving Lic.' },
                        { id: 'TRADE_LICENSE', label: 'Trade Lic.' },
                        { id: 'BUSINESS_REG', label: 'Business Reg' }
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDocType(d.id as any)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                            docType === d.id
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Document Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={e => setDocNumber(e.target.value)}
                      placeholder="e.g. NID-1995-12345678"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Document Image Upload Previews */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Front Image */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                      <p className="text-xs font-semibold text-slate-300 mb-2">1. Front Side</p>
                      {frontImage ? (
                        <div className="relative h-24 rounded-lg overflow-hidden border border-slate-600 mb-2">
                          <img src={frontImage} alt="front" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-24 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center mb-2">
                          <FileText className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => simulateImageUpload(setFrontImage, 'Front Image')}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700"
                      >
                        {frontImage ? 'Change' : 'Upload'}
                      </button>
                    </div>

                    {/* Back Image */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                      <p className="text-xs font-semibold text-slate-300 mb-2">2. Back Side</p>
                      {backImage ? (
                        <div className="relative h-24 rounded-lg overflow-hidden border border-slate-600 mb-2">
                          <img src={backImage} alt="back" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-24 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center mb-2">
                          <FileText className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => simulateImageUpload(setBackImage, 'Back Image')}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700"
                      >
                        {backImage ? 'Change' : 'Upload'}
                      </button>
                    </div>

                    {/* Selfie */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
                      <p className="text-xs font-semibold text-slate-300 mb-2">3. Selfie with Doc</p>
                      {selfieImage ? (
                        <div className="relative h-24 rounded-lg overflow-hidden border border-slate-600 mb-2">
                          <img src={selfieImage} alt="selfie" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-24 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center mb-2">
                          <User className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => simulateImageUpload(setSelfieImage, 'Selfie')}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700"
                      >
                        {selfieImage ? 'Change' : 'Upload'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Navigation */}
        {!successBanner && (
          <div className="px-8 py-5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!shopName.trim()) {
                      toast.error('Shop name is required');
                      return;
                    }
                    if (!otpVerified) {
                      toast.error('Please verify mobile OTP first');
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  Continue to Address <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCountryId || !selectedDivisionId || !selectedDistrictId || !selectedUpazilaId || !villageArea.trim()) {
                      toast.error('Please select Country, Division, District, Upazila, and enter Village/Area');
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  Continue to Verification <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {step === 3 && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleCompleteRegistration(true)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-colors"
                  >
                    Skip for Now & Complete
                  </button>

                  <button
                    type="button"
                    disabled={loading || (!frontImage && !docNumber)}
                    onClick={() => handleCompleteRegistration(false)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Submit & Become Seller
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
