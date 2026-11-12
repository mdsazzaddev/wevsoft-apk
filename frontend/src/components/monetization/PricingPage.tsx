import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

export const PricingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: isAnnual ? 12 : 15,
      description: 'Perfect for individuals and freelancers.',
      features: ['Unlimited messaging', '5GB Storage', 'Basic AI Copilot', 'Community access'],
      highlight: false
    },
    {
      id: 'business',
      name: 'Business',
      price: isAnnual ? 29 : 39,
      description: 'For growing teams that need more power.',
      features: ['Everything in Pro', '50GB Storage', 'Advanced AI Voice Agents', 'Team Workspaces', 'Priority Support'],
      highlight: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: isAnnual ? 99 : 129,
      description: 'Custom solutions for large organizations.',
      features: ['Everything in Business', 'Unlimited Storage', 'Custom AI Models', 'SSO & Advanced Security', 'Dedicated Success Manager'],
      highlight: false
    }
  ];

  return (
    <div className="flex flex-col items-center py-20 px-6 bg-background overflow-y-auto">
      <div className="text-center max-w-2xl mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Choose the plan that's right for you or your team. Switch or cancel anytime.
        </p>

        <div className="flex items-center justify-center gap-4">
          <span className={`font-semibold ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" checked={isAnnual} onChange={e => setIsAnnual(e.target.checked)} className="sr-only peer" />
            <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
          <span className={`font-semibold flex items-center gap-2 ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annually <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] uppercase tracking-wider rounded-full">Save 20%</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className={`relative flex flex-col p-8 rounded-3xl border transition-all ${
              plan.highlight 
                ? 'bg-card border-primary shadow-xl shadow-primary/10 scale-105 z-10' 
                : 'bg-card/50 border-border hover:border-primary/50'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                Most Popular
              </div>
            )}
            
            <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">{plan.description}</p>
            
            <div className="mb-8">
              <span className="text-5xl font-black text-foreground">${plan.price}</span>
              <span className="text-muted-foreground font-medium">/mo</span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-foreground/90">
                  <div className="p-1 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full py-4 rounded-xl font-bold transition-transform active:scale-95 ${
                plan.highlight 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Get {plan.name}
            </button>
          </div>
        ))}
      </div>

      <PaymentModal 
        isOpen={!!selectedPlan} 
        onClose={() => setSelectedPlan(null)} 
        planId={selectedPlan || ''} 
      />
    </div>
  );
};
