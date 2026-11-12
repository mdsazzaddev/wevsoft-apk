import React, { useEffect, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevOwnerProfile } from '../../../lib/automationApi';

const EMPTY_PROFILE: WevOwnerProfile = {
  fullName: null,
  businessName: null,
  role: null,
  contactInfo: null,
  aboutText: null,
  faqText: null,
};

export const OwnerProfileEditor: React.FC = () => {
  const [profile, setProfile] = useState<WevOwnerProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    automationApi
      .getOwnerProfile()
      .then(setProfile)
      .catch(() => setProfile(EMPTY_PROFILE))
      .finally(() => setLoading(false));
  }, []);

  const patch = (update: Partial<WevOwnerProfile>) => setProfile((prev) => ({ ...prev, ...update }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await automationApi.updateOwnerProfile(profile);
      setProfile(updated);
      toast.success('Profile saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <User size={16} />
          </div>
          <p className="text-xs text-muted-foreground">
            Shared across every agent with "Use My Profile Info" enabled — gives replies real context about who they represent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <input
              value={profile.fullName || ''}
              onChange={(e) => patch({ fullName: e.target.value })}
              className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Business Name</label>
            <input
              value={profile.businessName || ''}
              onChange={(e) => patch({ businessName: e.target.value })}
              className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">Role / Title</label>
          <input
            value={profile.role || ''}
            onChange={(e) => patch({ role: e.target.value })}
            placeholder="e.g. Freelance graphic designer"
            className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">About</label>
          <textarea
            value={profile.aboutText || ''}
            onChange={(e) => patch({ aboutText: e.target.value })}
            rows={4}
            placeholder="A short bio agents can draw on when introducing you or answering questions about you."
            className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">Frequently Asked Questions</label>
          <p className="text-xs text-muted-foreground/70 mb-1.5">One Q&A per line — agents will reference these to answer common questions consistently.</p>
          <textarea
            value={profile.faqText || ''}
            onChange={(e) => patch({ faqText: e.target.value })}
            rows={6}
            placeholder={'Q: What are your rates?\nA: Starting at $50/hr, depends on scope.'}
            className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
          />
        </div>
      </div>

      <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Save Profile
        </button>
      </div>
    </div>
  );
};
