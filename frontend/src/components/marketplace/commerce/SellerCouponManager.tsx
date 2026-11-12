import React, { useState } from 'react';
import { Ticket, Plus, Edit, Trash2, X } from 'lucide-react';

export default function SellerCouponManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coupons, setCoupons] = useState([
    { id: 1, code: 'SUMMER20', type: 'percentage', value: 20, minOrder: 1000, validFrom: '2026-06-01', validUntil: '2026-08-31', status: 'active' },
    { id: 2, code: 'FLAT500', type: 'fixed', value: 500, minOrder: 3000, validFrom: '2026-05-01', validUntil: '2026-05-31', status: 'expired' },
  ]);

  return (
    <div className="bg-card border-border rounded-lg border p-6 text-foreground shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Shop Coupons
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your store discounts and vouchers.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-[#d6601b] text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Min Order</th>
              <th className="px-4 py-3 font-medium">Validity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{coupon.code}</td>
                <td className="px-4 py-3">
                  {coupon.type === 'percentage' ? `${coupon.value}%` : `৳${coupon.value}`}
                </td>
                <td className="px-4 py-3">৳{coupon.minOrder}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {coupon.validFrom} to {coupon.validUntil}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${coupon.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {coupon.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-lg">Create New Coupon</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Coupon Code</label>
                <input type="text" placeholder="e.g. SUMMER20" className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type</label>
                  <select className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input type="number" placeholder="20" className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Order Amount (৳)</label>
                <input type="number" placeholder="1000" className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valid From</label>
                  <input type="date" className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valid Until</label>
                  <input type="date" className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-[#d6601b] transition-colors"
              >
                Save Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
