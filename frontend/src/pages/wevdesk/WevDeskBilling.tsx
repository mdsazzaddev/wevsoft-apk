/** WevDesk → Billing & plan. No WevDesk billing backend exists: every Space is on Free and nothing is charged. */

import { Receipt } from 'lucide-react';
import { CREATOR_HUB_NAME, PERSONAL_CREATOR_HUB_PATH } from '../../lib/creatorHub';
import { useDesk } from './deskContext';
import { money, useDeskData } from './deskData';
import { DeskButton, EmptyNote, PageHeader, Pill, Row, SOON, StatTile } from './deskUi';

const PLANS = [
  { name: 'Free', current: true, points: ['Unified inbox for WevChat', 'Content calendar', 'Insights & reviews', 'Developer Console access'] },
  { name: 'Pro', current: false, points: ['AI agents for support & sales', 'Workflows', 'Cross-posting to connected platforms', 'More AI credits'] },
  { name: 'Business', current: false, points: ['Bookings & invoices', 'Team roles at scale', 'Priority support', 'Custom AI knowledge base'] },
];

export default function WevDeskBilling() {
  const { managePath, can } = useDesk();
  const { money: mon, canMoney } = useDeskData();
  const e = mon.data?.earnings;
  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1400px]">
      <PageHeader
        icon={Receipt}
        title="Billing & plan"
        subtitle="WevDesk plans are not on sale yet. Your Space is on Free and nothing is charged. Pricing will be announced before paid plans open."
        badge={<Pill>Free</Pill>}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Current plan" value="Free" sub="No charges" />
        <StatTile label="AI credits" value="0" sub="Credit packs coming soon" />
        <StatTile label="Next invoice" value="—" sub="Nothing due" />
        <StatTile label="Space earnings" value={canMoney ? money(e?.availableBalance, e?.currency) : '—'} sub={canMoney ? 'Available balance (Monetization)' : 'No access'} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <section key={p.name} className={`wd-card p-[18px] flex flex-col ${p.current ? 'ring-2 ring-[var(--wd-teal)]' : ''}`}>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-[16px] font-semibold">{p.name}</h2>
              {p.current ? <Pill>Current</Pill> : <Pill tone="grey">Coming soon</Pill>}
            </div>
            <p className="mt-1 text-[12px] text-[var(--wd-muted)]">{p.current ? '৳0 — free forever' : 'Pricing to be announced'}</p>
            <ul className="mt-3 space-y-1.5 flex-1">
              {p.points.map((pt) => (
                <li key={pt} className="text-[12.5px] text-[var(--wd-text-2)]">• {pt}</li>
              ))}
            </ul>
            <div className="mt-4">{p.current ? <DeskButton disabled>Your plan</DeskButton> : <DeskButton disabled title={SOON}>Upgrade</DeskButton>}</div>
          </section>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="wd-card p-[18px]">
          <h2 className="text-[15px] font-semibold">Invoices</h2>
          <div className="mt-3"><EmptyNote title="No invoices">You have never been charged for WevDesk.</EmptyNote></div>
        </section>
        <section className="wd-card p-[18px]">
          <h2 className="text-[15px] font-semibold">Payment method</h2>
          <Row tall label="bKash · Nagad · Card"><DeskButton disabled title={SOON}>Add</DeskButton></Row>
          {can('monetization.view') && <Row tall label="Payouts & earnings for this Space"><DeskButton to={managePath('monetization')}>Monetization</DeskButton></Row>}
          <Row tall label="Creator plans for your personal account"><DeskButton to={PERSONAL_CREATOR_HUB_PATH}>{CREATOR_HUB_NAME}</DeskButton></Row>
        </section>
      </div>
    </div>
  );
}
