import { CREATOR_HUB_NAME } from '../../../lib/creatorHub';
/**
 * PLACEHOLDER creator plan catalogue for the Creator Hub "Upgrade to Pro" page.
 *
 * As of 2026-09-28 there are NO real platform creator plans in Wevsoft:
 *  - `PremiumPlan` / `UserSubscription` exist in the Prisma schema, but the table is empty,
 *    no route reads it and no admin screen manages it.
 *  - `/api/monetization/*` (monetization.routes.ts) is a mock (writes a fake "completed"
 *    payment) and does not match the schema, so it must not be used for checkout.
 *  - `/api/subscriptions/*` + `SubscriptionPlan` are FAN subscriptions to a creator, not
 *    a creator's own platform plan.
 *
 * Everything below (plan names, prices, features, FAQ copy) is placeholder pricing to be
 * replaced by admin-managed plans (e.g. `PremiumPlan` rows served by an API). Keep all
 * unbacked plan data in this one file. While `CREATOR_PLANS_CHECKOUT_LIVE` is false the UI
 * never charges or pretends to charge: paid buttons show a "coming soon" state.
 */

export const CREATOR_PLANS_CHECKOUT_LIVE = true;

export type CreatorPlanId = 'free' | 'pro' | 'business';

export interface CreatorPlan {
  id: CreatorPlanId;
  name: string;
  tagline: string;
  /** Placeholder price per month, in `currency`. */
  monthly: number;
  /** Placeholder price per year (billed yearly), in `currency`. */
  yearly: number;
  currency: 'USD';
  popular?: boolean;
  features: string[];
}

export const CREATOR_PLANS: CreatorPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to start creating.',
    monthly: 0,
    yearly: 0,
    currency: 'USD',
    features: [
      'Posts, reels, stories & videos',
      'Creator dashboard & 7-day analytics',
      'Basic AI assistant',
      'Content planner',
      'Community & comments inbox',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For creators ready to grow faster.',
    monthly: 9.99,
    yearly: 95.9,
    currency: 'USD',
    popular: true,
    features: [
      'Everything in Free',
      'Advanced analytics (up to 90 days)',
      'AI Studio with more monthly credits',
      'Batch scheduling & templates',
      'Monetization tools & creator store',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For teams, brands and agencies.',
    monthly: 29.99,
    yearly: 287.9,
    currency: 'USD',
    features: [
      'Everything in Pro',
      'Team seats & roles',
      'Brand collaboration workspace',
      'Multi-WevSpace management',
      'Exportable reports',
      'Dedicated success manager',
    ],
  },
];

/** Placeholder comparison matrix. `true` = included, `false` = not included, string = limit text. */
export const CREATOR_PLAN_FEATURE_ROWS: Array<{ group: string; rows: Array<{ label: string; values: Record<CreatorPlanId, boolean | string> }> }> = [
  {
    group: 'Create',
    rows: [
      { label: 'Posts, reels, stories, videos', values: { free: true, pro: true, business: true } },
      { label: 'Batch scheduling', values: { free: false, pro: true, business: true } },
      { label: 'Templates library', values: { free: 'Basic', pro: 'Full', business: 'Full + brand kits' } },
      { label: 'AI Studio credits / month', values: { free: 'Starter', pro: 'Boosted', business: 'Highest' } },
    ],
  },
  {
    group: 'Grow',
    rows: [
      { label: 'Analytics history', values: { free: '7 days', pro: '90 days', business: '12 months' } },
      { label: 'Audience insights', values: { free: false, pro: true, business: true } },
      { label: 'Exportable reports', values: { free: false, pro: false, business: true } },
    ],
  },
  {
    group: 'Earn & collaborate',
    rows: [
      { label: 'Monetization tools', values: { free: 'Basic', pro: true, business: true } },
      { label: 'Creator store', values: { free: false, pro: true, business: true } },
      { label: 'Team seats', values: { free: false, pro: false, business: true } },
      { label: 'Support', values: { free: 'Community', pro: 'Priority', business: 'Dedicated' } },
    ],
  },
];

export const CREATOR_PRO_BENEFITS: Array<{ title: string; body: string; icon: 'sparkles' | 'chart' | 'layers' | 'dollar' | 'users' | 'shield' }> = [
  { title: 'AI that works for you', body: 'Draft captions, scripts and ideas in seconds with more AI Studio credits.', icon: 'sparkles' },
  { title: 'Deeper analytics', body: 'See what drives views, reach and followers over longer time ranges.', icon: 'chart' },
  { title: 'Batch & schedule', body: 'Plan a week of content in one sitting and publish on autopilot.', icon: 'layers' },
  { title: 'Earn more', body: 'Unlock monetization tools, your creator store and brand deals.', icon: 'dollar' },
  { title: 'Built for teams', body: 'Invite editors and managers with the right roles and permissions.', icon: 'users' },
  { title: 'Priority support', body: 'Get faster answers from the Wevsoft creator team.', icon: 'shield' },
];

export const CREATOR_PRO_FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'When will Creator Pro be available?',
    a: 'Paid creator plans are not live yet. Pricing on this page is a preview and may change before launch. Nothing is charged today.',
  },
  {
    q: 'Will I lose anything on the Free plan?',
    a: `No. Everything you use in ${CREATOR_HUB_NAME} today stays available on Free.`,
  },
  {
    q: 'Can I switch between monthly and yearly billing?',
    a: 'Yes. When plans launch you will be able to switch billing periods at any time; yearly billing is planned to cost less per month.',
  },
  {
    q: 'Does Pro apply to my WevSpaces too?',
    a: 'Business is planned to cover multiple WevSpaces and team seats. Pro covers your personal creator account.',
  },
  {
    q: 'How do I get early access?',
    a: 'Contact Wevsoft support from the Support page and mention Creator Pro early access.',
  },
];

export function formatPlanPrice(amount: number, currency: 'USD'): string {
  if (amount === 0) return currency === 'USD' ? '$0' : '0';
  return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
}