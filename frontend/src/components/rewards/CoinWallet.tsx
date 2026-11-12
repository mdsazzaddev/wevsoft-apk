import React from 'react';
import { Coins, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';

export interface CoinTx {
  id: string;
  amount: number;
  type: string;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

interface CoinWalletProps {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions: CoinTx[];
  loading: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const CoinWallet: React.FC<CoinWalletProps> = ({
  balance,
  lifetimeEarned,
  lifetimeSpent,
  transactions,
  loading,
}) => {
  return (
    <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-amber-500" />
        <h2 className="text-lg font-extrabold text-foreground">ewvsoftcoin</h2>
      </div>

      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/20 border border-amber-500/30">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Balance
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Coins size={28} className="text-amber-500" />
          <span className="text-3xl font-extrabold text-foreground">{balance.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowDownRight size={13} /> Earned {lifetimeEarned.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <ArrowUpRight size={13} /> Spent {lifetimeSpent.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Transaction History
        </h3>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No transactions yet. Buy ewvsoftcoin or complete missions to earn.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {transactions.map((tx) => {
              const isEarn = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{tx.reason}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-extrabold ${
                        isEarn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isEarn ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      bal {tx.balanceAfter.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
