import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { useOverlayBack } from '../hooks/useOverlayBack';

interface ReportModalProps {
  targetId: string;
  targetType: string;
  onClose: () => void;
}

export default function ReportModal({ targetId, targetType, onClose }: ReportModalProps) {
  useOverlayBack(true, onClose);
  const token = useStore((s) => s.token);
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const isListing = targetType === 'product' || targetType === 'listing' || targetType === 'seller';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetId, targetType, reason, description })
      });
      if (res.ok) {
        toast.success('Report submitted successfully');
        onClose();
      } else {
        toast.error('Failed to submit report');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-bold flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} /> Report Content
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2">
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="hate">Hate Speech</option>
              <option value="violence">Violence</option>
              <option value="nudity">Nudity / Sexual Content</option>
              <option value="scam">Scam / Fraud</option>
              <option value="copyright">Copyright Violation</option>
              {isListing && (
                <>
                  <option value="fake">Fake Product</option>
                  <option value="duplicate">Duplicate Product</option>
                  <option value="offensive">Offensive Content</option>
                  <option value="wrong_category">Wrong Category</option>
                </>
              )}
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description (Optional)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 min-h-[100px]"
              placeholder="Provide more details (optional)..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 hover:bg-muted rounded-xl font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors">
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
