import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, Upload,
  FileText, User, RefreshCw, ChevronRight, HelpCircle, ArrowUpRight, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import ContactCodeVerify from './ContactCodeVerify';
import { uploadMarketplaceMedia } from './commerce/utils';

const VERIFICATION_LADDER = ['Basic Seller', 'Verified Seller', 'Trusted Seller', 'Premium Seller'];

interface SellerVerificationSettingsProps {
  sellerProfile?: any;
  onRefreshProfile?: () => void;
}

export const SellerVerificationSettings: React.FC<SellerVerificationSettingsProps> = ({
  sellerProfile,
  onRefreshProfile
}) => {
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState<'NID' | 'PASSPORT' | 'DRIVING_LICENSE' | 'TRADE_LICENSE' | 'BUSINESS_REG'>(
    sellerProfile?.verificationDocument?.docType || sellerProfile?.verificationDocument?.doc_type || 'NID'
  );
  const [docNumber, setDocNumber] = useState(
    sellerProfile?.verificationDocument?.docNumber || sellerProfile?.verificationDocument?.doc_number || ''
  );
  const [frontImage, setFrontImage] = useState<string>(
    sellerProfile?.verificationDocument?.frontImage || sellerProfile?.verificationDocument?.front_image || ''
  );
  const [backImage, setBackImage] = useState<string>(
    sellerProfile?.verificationDocument?.backImage || sellerProfile?.verificationDocument?.back_image || ''
  );
  const [selfieImage, setSelfieImage] = useState<string>(
    sellerProfile?.verificationDocument?.selfieImage || sellerProfile?.verificationDocument?.selfie_image || ''
  );
  const [addressInput, setAddressInput] = useState<string>(sellerProfile?.address || '');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [uploadingField, setUploadingField] = useState<'front' | 'back' | 'selfie' | null>(null);

  const status = sellerProfile?.verificationStatus || 'Unverified Seller';

  const getStatusBadge = () => {
    if (status === 'Verified Seller') {
      return (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4" />
          Verified Seller
        </div>
      );
    }
    if (status === 'Pending Review') {
      return (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-semibold text-xs">
          <Clock className="w-4 h-4" />
          Pending Admin Review
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-xs">
        <AlertTriangle className="w-4 h-4" />
        Unverified Seller
      </div>
    );
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: 'front' | 'back' | 'selfie',
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF document');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit');
      return;
    }

    setUploadingField(field);
    try {
      const uploadedUrl = await uploadMarketplaceMedia(file, token);
      setter(uploadedUrl);
      toast.success(`${label} uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || `Failed to upload ${label}`);
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleSubmitDocuments = async () => {
    if (!frontImage && !docNumber) {
      toast.error('Please upload at least the front side of your ID document');
      return;
    }
    setLoading(true);
    try {
      // API call to update verification documents
      const res = await fetch('/api/v1/marketplace/seller-system/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...sellerProfile,
          verificationStatus: 'Pending Review',
          verificationDocument: {
            docType,
            docNumber,
            frontImage,
            backImage,
            selfieImage
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Identity documents submitted for verification!');
        if (onRefreshProfile) onRefreshProfile();
      } else {
        toast.error(data.error || 'Failed to submit documents');
      }
    } catch (error) {
      toast.error('Network error during submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status Header Card */}
      <div className="p-6 rounded-3xl bg-card border border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Seller Identity Verification</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Verify your identity to earn the blue verified badge and unlock higher payout limits.
            </p>
          </div>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ContactCodeVerify token={token} phoneVerified={Boolean(sellerProfile?.otpVerified)} emailVerified={Boolean(sellerProfile?.emailVerified)} onDone={() => onRefreshProfile?.()} />
        {(
          [
            ['National ID', sellerProfile?.nidVerified ? 'Verified' : 'Not verified', '/api/marketplace/verify/nid', { nid: docNumber }],
          ] as const
        ).map(([label, state, url, body]) => (
          <div key={label} className="p-4 rounded-2xl bg-card border border-border">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm font-bold text-foreground mt-1">{String(state)}</div>
            {state !== 'Verified' && (
              <button
                type="button"
                className="mt-2 text-[11px] font-bold text-cyan-400"
                onClick={async () => {
                  const res = await fetch(String(url), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                  });
                  const j = await res.json().catch(() => ({}));
                  if (res.ok) {
                    toast.success(j.message || `${label} submitted`);
                    onRefreshProfile?.();
                  } else toast.error(j.error || 'Verification failed');
                }}
              >
                Verify now
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="text-xs text-muted-foreground">Selfie verification</div>
          <div className="text-sm font-bold text-foreground mt-1">
            {sellerProfile?.selfieVerified ? 'Verified' : 'Pending'}
          </div>
          {!sellerProfile?.selfieVerified && (
            <button
              type="button"
              className="mt-2 text-[11px] font-bold text-cyan-400"
              onClick={async () => {
                const imageUrl = selfieImage;
                if (!imageUrl) { toast.error('Upload a selfie first'); return; }
                const res = await fetch('/api/marketplace/verify/selfie', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ imageUrl }),
                });
                if (res.ok) {
                  toast.success('Selfie submitted');
                  onRefreshProfile?.();
                } else toast.error('Selfie verification failed');
              }}
            >
              Submit selfie
            </button>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="text-xs text-muted-foreground">Address verification</div>
          <div className="text-sm font-bold text-foreground mt-1">
            {sellerProfile?.addressVerified ? 'Verified' : 'Pending'}
          </div>
          {!sellerProfile?.addressVerified && (
            <div className="flex gap-2 mt-2">
              <input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Street, area, city"
                className="flex-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs"
              />
              <button
                type="button"
                className="text-[11px] font-bold text-cyan-400"
                onClick={async () => {
                  const res = await fetch('/api/marketplace/verify/address', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ address: addressInput }),
                  });
                  if (res.ok) {
                    toast.success('Address verified');
                    onRefreshProfile?.();
                  } else toast.error('Enter your full address');
                }}
              >
                Verify
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-foreground">Verification level</h4>
          {sellerProfile?.trustScore != null && (
            <span className="text-xs text-muted-foreground">
              Trust score {Number(sellerProfile.trustScore).toFixed(0)} / 100
              {sellerProfile?.trustGrade ? ` · Grade ${sellerProfile.trustGrade}` : ''}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {VERIFICATION_LADDER.map((level, i) => {
            const currentIndex = VERIFICATION_LADDER.indexOf(sellerProfile?.verificationLevel || 'Basic Seller');
            const reached = i <= currentIndex;
            return (
              <div
                key={level}
                className={`px-3 py-2 rounded-xl border text-center text-[11px] font-bold ${
                  reached
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-muted/40 border-border text-muted-foreground'
                }`}
              >
                {level}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Phone, email and National ID unlock <b>Verified Seller</b>. Adding a selfie and a trust score of 65+ unlocks{' '}
          <b>Trusted Seller</b>. Address verification, approved KYC and a trust score of 80+ unlock <b>Premium Seller</b>.
        </p>
      </div>

      {status === 'Verified Seller' ? (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-xl font-bold text-foreground">You Are a Verified Seller!</h4>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your identity has been confirmed. Your shop displays the Blue Verified Badge to all buyers across the marketplace.
          </p>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-card border border-border space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h4 className="text-base font-bold text-foreground">Upload / Update Verification Documents</h4>
              <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, PDF (Max 5MB per file)</p>
            </div>
            <span className="text-xs text-cyan-400 font-semibold">Step 1 of 1</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Document Type
              </label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:border-cyan-500"
              >
                <option value="NID">National ID Card (NID)</option>
                <option value="PASSPORT">Valid Passport</option>
                <option value="DRIVING_LICENSE">Driving License</option>
                <option value="TRADE_LICENSE">Trade License (Business Seller)</option>
                <option value="BUSINESS_REG">Business Registration Certificate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Document ID Number (Optional)
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                placeholder="e.g. 1995123456789"
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={frontInputRef}
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFileUpload(e, setFrontImage, 'front', 'Front Side')}
          />
          <input
            type="file"
            ref={backInputRef}
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFileUpload(e, setBackImage, 'back', 'Back Side')}
          />
          <input
            type="file"
            ref={selfieInputRef}
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFileUpload(e, setSelfieImage, 'selfie', 'Selfie with ID')}
          />

          {/* Upload preview boxes */}
          <div className="grid grid-cols-3 gap-4">
            {/* Front side */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Front Side (Required)</p>
              {frontImage ? (
                <div
                  className="h-28 rounded-xl overflow-hidden border border-border cursor-pointer relative group"
                  onClick={() => !uploadingField && frontInputRef.current?.click()}
                >
                  <img src={frontImage} alt="front" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                    Click to replace
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingField && frontInputRef.current?.click()}
                  className="h-28 rounded-xl bg-card border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                >
                  <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-[11px] text-muted-foreground">Click to attach</span>
                </div>
              )}
              <button
                type="button"
                disabled={uploadingField !== null}
                onClick={() => frontInputRef.current?.click()}
                className="w-full py-2 rounded-xl bg-muted hover:bg-muted text-xs font-semibold text-cyan-400 border border-border flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {uploadingField === 'front' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  frontImage ? 'Change Image' : 'Upload Front'
                )}
              </button>
            </div>

            {/* Back side */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Back Side (Optional)</p>
              {backImage ? (
                <div
                  className="h-28 rounded-xl overflow-hidden border border-border cursor-pointer relative group"
                  onClick={() => !uploadingField && backInputRef.current?.click()}
                >
                  <img src={backImage} alt="back" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                    Click to replace
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingField && backInputRef.current?.click()}
                  className="h-28 rounded-xl bg-card border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                >
                  <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-[11px] text-muted-foreground">Click to attach</span>
                </div>
              )}
              <button
                type="button"
                disabled={uploadingField !== null}
                onClick={() => backInputRef.current?.click()}
                className="w-full py-2 rounded-xl bg-muted hover:bg-muted text-xs font-semibold text-cyan-400 border border-border flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {uploadingField === 'back' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  backImage ? 'Change Image' : 'Upload Back'
                )}
              </button>
            </div>

            {/* Selfie */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Selfie with ID (Optional)</p>
              {selfieImage ? (
                <div
                  className="h-28 rounded-xl overflow-hidden border border-border cursor-pointer relative group"
                  onClick={() => !uploadingField && selfieInputRef.current?.click()}
                >
                  <img src={selfieImage} alt="selfie" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
                    Click to replace
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploadingField && selfieInputRef.current?.click()}
                  className="h-28 rounded-xl bg-card border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                >
                  <User className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-[11px] text-muted-foreground">Click to attach</span>
                </div>
              )}
              <button
                type="button"
                disabled={uploadingField !== null}
                onClick={() => selfieInputRef.current?.click()}
                className="w-full py-2 rounded-xl bg-muted hover:bg-muted text-xs font-semibold text-cyan-400 border border-border flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {uploadingField === 'selfie' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  selfieImage ? 'Change Image' : 'Upload Selfie'
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmitDocuments}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-foreground font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all"
            >
              Submit for Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
