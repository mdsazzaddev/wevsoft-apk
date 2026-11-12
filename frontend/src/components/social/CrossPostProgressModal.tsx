import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export interface CrossPostJobState {
  platform: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'failed';
  progress?: number; // 0 to 100
  error?: string;
}

export function CrossPostProgressModal({
  jobs,
  isOpen,
  onClose,
}: {
  jobs: CrossPostJobState[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const isDone = jobs.length > 0 && jobs.every((j) => j.status === 'success' || j.status === 'failed');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl bg-background shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <h2 className="text-lg font-bold mb-4 text-center">Cross-Posting</h2>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.platform} className="bg-muted/30 p-3 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize text-sm">{job.platform}</span>
                    {job.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {job.status === 'failed' && <XCircle className="w-5 h-5 text-rose-500" />}
                    {(job.status === 'pending' || job.status === 'uploading' || job.status === 'processing') && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    )}
                  </div>
                  {(job.status === 'uploading' || job.status === 'processing') && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${job.progress || (job.status === 'processing' ? 100 : 0)}%` }}
                      />
                    </div>
                  )}
                  {job.status === 'failed' && job.error && (
                    <p className="text-xs text-rose-500 mt-1">{job.error}</p>
                  )}
                  {job.status === 'uploading' && (
                    <p className="text-xs text-muted-foreground mt-1 text-right">{job.progress || 0}%</p>
                  )}
                  {job.status === 'processing' && (
                    <p className="text-xs text-muted-foreground mt-1 text-right">Processing...</p>
                  )}
                </div>
              ))}
            </div>

            {isDone && (
              <div className="mt-6">
                <Button onClick={onClose} className="w-full rounded-xl">
                  Done
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
