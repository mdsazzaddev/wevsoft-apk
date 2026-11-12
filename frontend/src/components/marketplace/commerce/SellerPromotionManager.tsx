import React, { useState } from 'react';
import { Zap, Gift, CheckCircle, X } from 'lucide-react';

export default function SellerPromotionManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<string | null>(null);

  const promotions = [
    { id: 1, title: 'Eid Mega Sale', type: 'Mega Campaign', period: 'Sep 10 - Sep 20, 2026', status: 'Enrolling', icon: Gift },
    { id: 2, title: 'Weekend Flash Deals', type: 'Flash Deal', period: 'Every Fri & Sat', status: 'Enrolling', icon: Zap },
  ];

  const dummyProducts = [
    { id: 101, name: 'Wireless Noise Cancelling Headphones', price: 4500, stock: 24, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200' },
    { id: 102, name: 'Smart Fitness Watch Series 7', price: 3200, stock: 15, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=200' },
    { id: 103, name: 'Premium Mechanical Keyboard', price: 5600, stock: 8, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=200' },
  ];

  const handleEnrollClick = (promoTitle: string) => {
    setSelectedPromo(promoTitle);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-card border-border rounded-lg border p-6 text-foreground shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Platform Promotions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Boost your sales by enrolling your products in active platform campaigns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((promo) => (
          <div key={promo.id} className="border border-border rounded-lg p-5 hover:border-primary/50 transition-colors bg-background">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <promo.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{promo.title}</h3>
                  <span className="text-xs text-muted-foreground">{promo.type}</span>
                </div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full font-medium">
                {promo.status}
              </span>
            </div>
            
            <div className="text-sm mb-4 text-muted-foreground flex flex-col gap-1">
              <span>Campaign Period: {promo.period}</span>
            </div>
            
            <button
              onClick={() => handleEnrollClick(promo.title)}
              className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-md transition-colors border border-border text-sm"
            >
              Enroll Products
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-lg">Enroll in {selectedPromo}</h3>
                <p className="text-sm text-muted-foreground">Select products to offer at discounted prices.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {dummyProducts.map((product) => (
                  <div key={product.id} className="border border-border rounded-md overflow-hidden bg-background group cursor-pointer hover:border-primary transition-colors relative">
                    <div className="aspect-square bg-muted relative">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white/90 text-background flex items-center justify-center shadow-sm">
                          <CheckCircle className="w-5 h-5 text-gray-300 group-hover:text-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-medium line-clamp-2 mb-1">{product.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-primary">৳{product.price}</span>
                        <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
              <span className="text-sm text-muted-foreground">0 products selected</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-[#d6601b] transition-colors"
                >
                  Confirm Enrollment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
