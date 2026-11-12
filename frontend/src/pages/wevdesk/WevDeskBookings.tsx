/** WevDesk → Bookings: services (real Space offerings), weekly hours (real), bookings (no backend yet). */

import { CalendarCheck } from 'lucide-react';
import { WEEK_DAYS, formatSpacePrice } from '@wevsoft/shared/wevspace';
import { useDesk } from './deskContext';
import { useDeskData } from './deskData';
import { DeskButton, EmptyNote, PageHeader, Pill, Row, SOON, StatTile, Toggle } from './deskUi';

export default function WevDeskBookings() {
  const { space, managePath } = useDesk();
  const { offerings } = useDeskData();
  const services = (offerings.data?.offerings || []).filter((o) => o.kind === 'SERVICE' || o.kind === 'PACKAGE');
  const hours = space.businessHours && typeof space.businessHours === 'object' ? (space.businessHours as Record<string, { open: string; close: string; closed: boolean }>) : null;
  const openDays = hours ? WEEK_DAYS.filter((d) => hours[d.id] && !hours[d.id].closed).length : 0;

  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1400px]">
      <PageHeader
        icon={CalendarCheck}
        title="Bookings"
        subtitle="Let customers book your services. Services and opening hours come from your Space; online booking itself is not built yet, so no bookings are taken."
        badge={<Pill tone="grey">Online booking coming soon</Pill>}
        actions={<DeskButton to={managePath('products')}>Add service</DeskButton>}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Today" value="0" sub="No bookings yet" />
        <StatTile label="This week" value="0" sub="No bookings yet" />
        <StatTile label="Services" value={services.length} sub={services.length ? 'Services & packages listed' : 'Add one in Products'} />
        <StatTile label="Open days" value={hours ? openDays : '—'} sub={hours ? 'From your business hours' : 'Hours not set'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="wd-card p-[18px] lg:col-span-2">
          <h2 className="text-[15px] font-semibold">Upcoming bookings</h2>
          <div className="mt-3">
            <EmptyNote title="No bookings yet">When online booking launches, customer bookings for your services appear here with reminders by WevChat.</EmptyNote>
          </div>
          <h2 className="mt-5 text-[15px] font-semibold">Services & pricing</h2>
          <div className="mt-2">
            {offerings.isLoading ? (
              <p className="text-[12px] text-[var(--wd-muted)]">Loading…</p>
            ) : services.length === 0 ? (
              <EmptyNote title="No services listed">Add a Service or Package in Products — it shows on your Space and here.</EmptyNote>
            ) : (
              services.map((s) => (
                <Row key={s.id} label={<span><b className="font-medium">{s.title}</b>{s.description ? <span className="text-[var(--wd-muted)]"> · {s.description.slice(0, 60)}</span> : null}</span>}>
                  <span className="text-[12px] font-medium">{formatSpacePrice(s.price, s.currency, s.priceNote)}</span>
                </Row>
              ))
            )}
          </div>
        </section>
        <section className="wd-card p-[18px]">
          <div className="flex items-center">
            <h2 className="flex-1 text-[15px] font-semibold">Availability</h2>
            <DeskButton to={managePath('settings')}>Edit hours</DeskButton>
          </div>
          <div className="mt-2">
            {hours ? (
              WEEK_DAYS.map((d) => {
                const h = hours[d.id];
                return (
                  <Row key={d.id} label={d.label}>
                    <span className="text-[12px] text-[var(--wd-text-2)]">{!h || h.closed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                  </Row>
                );
              })
            ) : (
              <EmptyNote title="Hours not set">Set weekly hours in Space settings.</EmptyNote>
            )}
          </div>
          <div className="mt-3">
            <Row tall label="Reminders by WevChat"><Toggle disabled title={SOON} /></Row>
            <Row tall label="Take payment when booking"><Toggle disabled title={SOON} /></Row>
          </div>
        </section>
      </div>
    </div>
  );
}
