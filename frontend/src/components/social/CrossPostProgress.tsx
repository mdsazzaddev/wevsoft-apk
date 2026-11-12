import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

type CrossPostJob = {
  platform: string;
  jobId: string;
  strategy: 'client-direct' | 'server-relay';
  uploadUrl?: string; // For client-direct
};

type ProgressState = {
  status: 'pending' | 'uploading' | 'success' | 'failed';
  progress: number;
  error?: string;
};

const PLATFORM_META: Record<string, { name: string; icon: string }> = {
  google: { name: 'Google', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg' },
  facebook: { name: 'Facebook', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg' },
  twitter: { name: 'X (Twitter)', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/twitter/twitter-original.svg' },
  linkedin: { name: 'LinkedIn', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg' },
  tiktok: { name: 'TikTok', icon: 'https://cdn.iconscout.com/icon/free/png-512/free-tiktok-2270636-1891163.png?f=webp&w=256' },
  youtube: { name: 'YouTube', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/youtube/youtube-original.svg' },
};

export default function CrossPostProgress({ 
  jobs, 
  token,
  onClose,
  wevsoftPostId
}: { 
  jobs: CrossPostJob[];
  token: string;
  onClose: () => void;
  wevsoftPostId: string;
}) {
  const [progress, setProgress] = useState<Record<string, ProgressState>>(
    jobs.reduce((acc, job) => ({
      ...acc,
      [job.platform]: { status: 'pending', progress: 0 }
    }), {})
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    jobs.forEach(job => startJob(job));
     
  }, [jobs]);

  const updateProgress = (platform: string, state: Partial<ProgressState>) => {
    setProgress(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...state }
    }));
  };

  const startJob = async (job: CrossPostJob) => {
    updateProgress(job.platform, { status: 'uploading', progress: 0 });

    if (job.strategy === 'client-direct' && job.uploadUrl) {
      // Mock client-direct resumable upload
      // In reality, this would use XMLHttpRequest to track upload.onprogress
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 20;
        if (currentProgress >= 100) {
          clearInterval(interval);
          completeClientDirect(job.jobId, job.platform, 'success');
        } else {
          updateProgress(job.platform, { progress: Math.min(Math.round(currentProgress), 99) });
        }
      }, 500);
    } else if (job.strategy === 'server-relay') {
      // Poll server for status
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/posts/cross-post/${job.jobId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.status === 'success') {
            clearInterval(poll);
            updateProgress(job.platform, { status: 'success', progress: 100 });
          } else if (data.status === 'failed') {
            clearInterval(poll);
            updateProgress(job.platform, { status: 'failed', error: data.error });
          } else {
            // Fake progress for UI feedback during server-relay
            setProgress(prev => {
              const current = prev[job.platform].progress;
              return {
                ...prev,
                [job.platform]: { ...prev[job.platform], progress: Math.min(current + 10, 95) }
              };
            });
          }
        } catch {
          // Ignore network errors during polling
        }
      }, 1000);
    }
  };

  const completeClientDirect = async (jobId: string, platform: string, status: 'success' | 'failed') => {
    updateProgress(platform, { progress: 100 });
    try {
      await fetch(`/api/posts/cross-post/${jobId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      updateProgress(platform, { status });
    } catch {
      updateProgress(platform, { status: 'failed', error: 'Network error completing job' });
    }
  };

  const allDone = Object.values(progress).every(p => p.status === 'success' || p.status === 'failed');

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold mb-2">Publishing to external platforms...</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Your Wevsoft post (ID: {wevsoftPostId}) is live. We are now streaming it to your connected accounts.
        </p>

        <div className="space-y-4">
          {jobs.map((job) => {
            const meta = PLATFORM_META[job.platform] || { name: job.platform, icon: '' };
            const state = progress[job.platform];

            return (
              <div key={job.platform} className="bg-muted/30 p-4 rounded-xl border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={meta.icon} alt={meta.name} className="w-6 h-6" />
                    <span className="font-semibold">{meta.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.status === 'pending' && <span className="text-xs text-muted-foreground">Waiting...</span>}
                    {state.status === 'uploading' && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs font-bold text-primary">{state.progress}%</span>
                      </>
                    )}
                    {state.status === 'success' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                        <CheckCircle2 className="w-4 h-4" /> Published
                      </span>
                    )}
                    {state.status === 'failed' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                        <XCircle className="w-4 h-4" /> Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${state.status === 'failed' ? 'bg-destructive' : state.status === 'success' ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${state.progress}%` }}
                  />
                </div>

                {state.status === 'failed' && (
                  <div className="mt-3 flex items-center justify-between bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> {state.error || 'Upload failed'}
                    </span>
                    <button 
                      onClick={() => startJob(job)}
                      className="flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button 
            onClick={onClose}
            disabled={!allDone}
            className="px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            {allDone ? 'Done' : 'Please Wait...'}
          </button>
        </div>
      </div>
    </div>
  );
}
