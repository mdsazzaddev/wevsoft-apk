import React, { useState, useEffect } from 'react';
import { ShoppingBag, Truck, CheckCircle2, Clock, AlertCircle, Search, Filter, Phone, Mail, Edit3, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

export const SellerOrdersManager: React.FC = () => {
  const token = useStore((s) => s.token);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? '/api/v1/marketplace/seller-system/orders'
        : `/api/v1/marketplace/seller-system/orders?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string, trackingNumber?: string) => {
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          trackingNumber: trackingNumber || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`✓ Order status updated to ${newStatus}`);
        fetchOrders();
      } else {
        toast.error('Failed to update status');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const handleResolveReturn = async (id: string, decision: 'approve' | 'deny') => {
    try {
      const res = await fetch(`/api/marketplace/orders/${id}/return/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(decision === 'approve' ? 'Return approved — refunded' : 'Return denied');
        fetchOrders();
      } else {
        toast.error(data.error || 'Failed to resolve return');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'NEW':
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">New Order</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">Processing</span>;
      case 'SHIPPED':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">Shipped</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Delivered</span>;
      case 'RETURN_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">Return requested</span>;
      case 'REFUNDED':
        return <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">Refunded</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <ShoppingBag size={22} className="text-purple-400" />
            Order Fulfillment & Tracking
          </h2>
          <p className="text-xs text-muted-foreground">
            Amazon Seller Central state machine: accept orders, print shipping labels, and track COD/bKash payments
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === st
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={28} className="animate-spin text-purple-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border rounded-3xl space-y-2">
          <Truck size={40} className="mx-auto text-muted-foreground opacity-50" />
          <p className="text-sm font-bold text-foreground">No orders in this status queue</p>
          <p className="text-xs text-muted-foreground">When customers purchase from your storefront, new orders will appear here immediately.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const prodTitle = order.product?.title || 'Wevsoft Verified Product';
            const buyerName = order.buyer?.name || 'Verified Customer';
            const tracking = order.trackingNumber || 'Not Shipped Yet';

            return (
              <div key={order.id} className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-3 hover:border-purple-500/40 transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-foreground">
                      Order #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-[11px] text-muted-foreground">
                      • {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Payment:</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                      {order.paymentMethod || 'bKash'} • ৳{Number(order.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Product details */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border">
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground">{prodTitle}</h4>
                    <p className="text-xs text-muted-foreground">
                      Qty: {order.quantity || 1} • Buyer: {buyerName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === 'NEW' || order.status === 'PENDING' ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm"
                      >
                        Accept & Process
                      </button>
                    ) : order.status === 'PROCESSING' ? (
                      <button
                        onClick={() => {
                          const track = window.prompt('Enter Courier Tracking Number (e.g. WEV-EX-9481):', `WEV-EX-${Date.now().toString().slice(-4)}`);
                          if (track !== null) handleUpdateStatus(order.id, 'SHIPPED', track);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm flex items-center gap-1.5"
                      >
                        <Truck size={14} />
                        Ship Order
                      </button>
                    ) : order.status === 'SHIPPED' ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                      >
                        Mark Delivered ✓
                      </button>
                    ) : String(order.status).toUpperCase() === 'RETURN_REQUESTED' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveReturn(order.id, 'approve')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                        >
                          Approve refund
                        </button>
                        <button
                          onClick={() => handleResolveReturn(order.id, 'deny')}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm"
                        >
                          Deny return
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {order.returnReason && (
                  <p className="text-xs text-rose-500 font-medium">Return reason: {order.returnReason}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1">
                  <div>
                    <span>Shipping Address: {order.shippingAddress || 'Dhaka, Bangladesh'}</span>
                  </div>
                  <div>
                    <span>Tracking: </span>
                    <span className="font-mono text-foreground font-bold">{tracking}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
