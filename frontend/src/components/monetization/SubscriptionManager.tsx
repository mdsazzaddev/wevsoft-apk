import React from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';

export const SubscriptionManager: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-primary" />
        Billing & Subscription
      </h2>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
              Business Plan
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] uppercase tracking-wider rounded-full border border-green-500/20">Active</span>
            </h3>
            <p className="text-sm text-muted-foreground">$29.00 / month • Next billing date: Nov 24, 2023</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
              Change Plan
            </button>
          </div>
        </div>

        <div className="p-6 bg-muted/20">
          <h4 className="font-semibold text-sm text-foreground mb-4">Payment Method</h4>
          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 bg-muted rounded flex items-center justify-center font-bold text-xs border border-border">
                VISA
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Visa ending in 4242</p>
                <p className="text-xs text-muted-foreground">Expires 12/25</p>
              </div>
            </div>
            <button className="text-sm font-semibold text-primary hover:underline">Update</button>
          </div>
        </div>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-red-500 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Cancel Subscription
          </h4>
          <p className="text-sm text-red-500/80">You will lose access to premium features at the end of your billing cycle.</p>
        </div>
        <button className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shrink-0">
          Cancel Plan
        </button>
      </div>
    </div>
  );
};
