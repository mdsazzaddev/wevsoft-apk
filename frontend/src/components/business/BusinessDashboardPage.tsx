import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { CRMLeadKanban } from './CRMLeadKanban';

export const BusinessDashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-6 md:p-8 space-y-8">
        
        <div>
          <h1 className="text-3xl font-black text-foreground mb-2">Business Dashboard</h1>
          <p className="text-muted-foreground">Overview of your workspace performance and active pipelines.</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-green-500 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12.5%
              </span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Leads</p>
            <h3 className="text-3xl font-black text-foreground">1,248</h3>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-green-500 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +8.2%
              </span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revenue (MRR)</p>
            <h3 className="text-3xl font-black text-foreground">$45,200</h3>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 rotate-180" />
                -2.4%
              </span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Conversion Rate</p>
            <h3 className="text-3xl font-black text-foreground">14.2%</h3>
          </div>
        </div>

        {/* Mock Chart Area */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-6">Traffic & Conversions</h3>
          <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2">
            {/* Simple CSS bars to mock a chart */}
            {[40, 60, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((height, i) => (
              <div key={i} className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-md relative group cursor-crosshair" style={{ height: `${height}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {height * 12}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Board embedded */}
        <div className="pt-4">
          <h3 className="font-bold text-lg mb-4">Active Pipeline</h3>
          <div className="h-[500px]">
            <CRMLeadKanban />
          </div>
        </div>
      </div>
    </div>
  );
};
