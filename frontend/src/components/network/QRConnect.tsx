import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Scan, Camera, Sparkles, Copy, Check, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

export const QRConnect: React.FC = () => {
  const user = useStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'my-qr' | 'scanner'>('my-qr');
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);

  const profileUrl = `${window.location.origin}/u/${user?.username || 'wevsoft'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success('Wevsoft Profile Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      toast.success('QR Code Scanned! Connection request sent.');
    }, 2000);
  };

  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <QrCode size={20} className="text-purple-400" />
          <h3 className="text-lg font-extrabold text-foreground">Wevsoft QR Connect</h3>
        </div>

        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-border">
          <button
            onClick={() => setActiveTab('my-qr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'my-qr'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode size={14} />
            <span>My Code</span>
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Scan size={14} />
            <span>Scan Code</span>
          </button>
        </div>
      </div>

      {/* Tab 1: My QR Code */}
      {activeTab === 'my-qr' ? (
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="relative group p-6 bg-gradient-to-br from-purple-900/40 via-black to-cyan-900/40 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-500/20 flex flex-col items-center">
            {/* SVG QR Code Simulation */}
            <div className="w-52 h-52 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full text-gray-900 fill-current">
                {/* Outer corners */}
                <rect x="5" y="5" width="25" height="25" rx="4" />
                <rect x="9" y="9" width="17" height="17" rx="2" fill="white" />
                <rect x="13" y="13" width="9" height="9" rx="1" />

                <rect x="70" y="5" width="25" height="25" rx="4" />
                <rect x="74" y="9" width="17" height="17" rx="2" fill="white" />
                <rect x="78" y="13" width="9" height="9" rx="1" />

                <rect x="5" y="70" width="25" height="25" rx="4" />
                <rect x="9" y="74" width="17" height="17" rx="2" fill="white" />
                <rect x="13" y="78" width="9" height="9" rx="1" />

                {/* Random Matrix Pattern */}
                <rect x="35" y="10" width="8" height="8" />
                <rect x="45" y="15" width="12" height="6" />
                <rect x="10" y="35" width="15" height="8" />
                <rect x="30" y="30" width="40" height="40" rx="4" fill="#6d28d9" />
                <rect x="75" y="40" width="15" height="15" />
                <rect x="40" y="75" width="20" height="10" />
                <rect x="65" y="70" width="20" height="20" />
              </svg>
              {/* Wevsoft Center Badge */}
              <div className="absolute w-12 h-12 bg-black border-2 border-purple-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-lg">
                Wevsoft
              </div>
            </div>

            {/* Profile Tag */}
            <div className="mt-4 text-center">
              <h4 className="font-extrabold text-base text-foreground">{user?.name}</h4>
              <p className="text-xs text-purple-400 font-mono">@{user?.username || 'wevsoft_user'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button
              onClick={() => toast.success('QR Code saved to photos!')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-extrabold shadow-md hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Save Image</span>
            </button>
          </div>
        </div>
      ) : (
        /* Tab 2: Camera Scanner Simulator */
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="relative w-full max-w-[340px] aspect-square rounded-3xl bg-black border-2 border-purple-500/40 overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Camera Viewfinder Simulation */}
            <div className="absolute inset-8 border-2 border-dashed border-cyan-400 rounded-2xl flex items-center justify-center">
              {scanning ? (
                <motion.div
                  animate={{ y: [-80, 80, -80] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-full h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 shadow-lg shadow-cyan-400/80"
                />
              ) : (
                <Camera size={36} className="text-muted-foreground/40 animate-pulse" />
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-center">
              <span className="text-[10px] font-mono text-cyan-400 bg-black/60 px-3 py-1 rounded-full border border-cyan-500/30">
                {scanning ? 'SCANNING Wevsoft CODE...' : 'ALIGN QR CODE WITHIN FRAME'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSimulateScan}
            disabled={scanning}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs font-extrabold shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Scan size={16} />
            <span>{scanning ? 'Scanning...' : 'Simulate Camera Scan'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
