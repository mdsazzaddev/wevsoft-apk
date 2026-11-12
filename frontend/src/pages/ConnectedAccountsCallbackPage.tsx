import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConnectedAccountsCallbackPage() {
  const [searchParams] = useSearchParams();
  const token = useStore((s) => s.token);
  const [status, setStatus] = useState<'loading' | 'selection' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [sessionToken, setSessionToken] = useState('');
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [finalizing, setFinalizing] = useState(false);

  const code = searchParams.get('code');
  const platform = searchParams.get('state');

  useEffect(() => {
    if (!code || !platform) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setStatus('error');
      setErrorMsg('Missing authorization code or platform state.');
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await fetch(`/api/settings/connected-accounts/${platform}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        
        if (res.ok) {
          if (data.requireSelection) {
            setSessionToken(data.sessionToken);
            setAvailablePages(data.availablePages || []);
            setSelectedPageIds((data.availablePages || []).map((p: any) => p.id));
            setStatus('selection');
          } else {
            setStatus('success');
            setTimeout(() => window.close(), 1500);
          }
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to connect account.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('Network error while verifying connection.');
      }
    };

    exchangeToken();
  }, [code, platform, token]);

  const handleTogglePage = (id: string) => {
    setSelectedPageIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleFinalize = async () => {
    if (selectedPageIds.length === 0) {
      toast.error('Please select at least one page to connect');
      return;
    }

    setFinalizing(true);
    try {
      const res = await fetch(`/api/settings/connected-accounts/${platform}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionToken, selectedPageIds })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus('success');
        setTimeout(() => window.close(), 1500);
      } else {
        toast.error(data.error || 'Failed to save selected pages');
        setStatus('error');
        setErrorMsg(data.error || 'Failed to finalize connection');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl overflow-hidden p-6 text-center">
        
        {status === 'loading' && (
          <div className="py-8 flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-bold">Connecting...</h2>
            <p className="text-muted-foreground mt-2">Please wait while we verify your account.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Connection Failed</h2>
            <p className="text-muted-foreground mt-2 mb-6">{errorMsg}</p>
            <button 
              onClick={() => window.close()}
              className="px-6 py-2 rounded-xl bg-muted text-foreground font-semibold hover:bg-muted/80"
            >
              Close Window
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8 flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-4 text-white">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Successfully Connected!</h2>
            <p className="text-muted-foreground mt-2">You can now close this window.</p>
            <p className="text-xs text-muted-foreground mt-4">Closing automatically...</p>
          </div>
        )}

        {status === 'selection' && (
          <div className="text-left">
            <h2 className="text-xl font-bold mb-2">Select Pages to Connect</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We found multiple pages under your {platform} account. Choose which ones you want to manage with WevSoft.
            </p>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {availablePages.map(page => (
                <div 
                  key={page.id}
                  onClick={() => handleTogglePage(page.id)}
                  className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedPageIds.includes(page.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    selectedPageIds.includes(page.id) 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground/30'
                  }`}>
                    {selectedPageIds.includes(page.id) && <Check className="w-3.5 h-3.5" />}
                  </div>
                  
                  {page.avatarUrl ? (
                    <img src={page.avatarUrl} alt={page.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {page.name.charAt(0)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{page.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{page.category || 'Page'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => window.close()}
                className="flex-1 py-2.5 rounded-xl border font-semibold hover:bg-muted"
                disabled={finalizing}
              >
                Cancel
              </button>
              <button 
                onClick={handleFinalize}
                disabled={finalizing || selectedPageIds.length === 0}
                className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect {selectedPageIds.length} Page{selectedPageIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
