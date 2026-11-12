/**
 * Products & services (MP2 §17).
 *
 * The catalog editor already exists as `SpaceOfferingsPanel` and is what the
 * public tab renders, so this section wraps it instead of building a second
 * editor — MP1's "reuse existing components, do not duplicate" and §32's rule
 * against parallel systems. What the dashboard adds around it is context the
 * public tab has no reason to show: whether the feature is switched on, who is
 * allowed to edit, and where the catalog appears.
 */

import { ExternalLink, PackageOpen, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MAX_SPACE_OFFERINGS,
  SPACE_OFFERING_KINDS,
  spaceDashboardPath,
  spacePublicPath,
} from '@wevsoft/shared/wevspace';
import SpaceOfferingsPanel from '../SpaceOfferingsPanel';
import { useManage } from './ManageContext';
import { Card, CardTitle, PanelHeader } from './manageUi';

export default function ProductsPanel() {
  const { spaceId, space, handle, accent, features, can } = useManage();
  const canManage = can('offerings.manage');
  const featureOff = features?.offerings === false;

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Products & services"
        blurb={`Everything ${space?.name || 'this Space'} offers, in the order visitors see it.`}
        actions={
          <a
            href={`${spacePublicPath(handle)}?tab=offerings`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={13} /> View public tab
          </a>
        }
      />

      {featureOff && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-2xl bg-muted shrink-0 text-muted-foreground">
              <PackageOpen size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold">The Products & services tab is switched off.</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                You can still edit the catalog here — nothing is deleted — but visitors will not see it until the feature is
                back on in{' '}
                <Link to={spaceDashboardPath(handle, 'settings')} replace className="font-extrabold underline">
                  Settings
                </Link>
                .
              </p>
            </div>
          </div>
        </Card>
      )}

      {!canManage && (
        <Card>
          <p className="text-xs font-bold">You can see the catalog but not change it.</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Editing needs the “Manage products and services” permission. Whoever owns this Space can grant it under Team.
          </p>
        </Card>
      )}

      {/* The real editor. Same component, same data and same validation as the
          public tab uses, so what is edited here is exactly what ships. */}
      <SpaceOfferingsPanel spaceId={spaceId} canManage={canManage} accent={accent} />

      <Card>
        <CardTitle>How this list works</CardTitle>
        <ul className="space-y-1.5 text-[11px] text-muted-foreground">
          <li className="flex gap-2">
            <ShoppingBag size={13} className="mt-0.5 shrink-0" />
            <span>
              An item can be {SPACE_OFFERING_KINDS.map((kind) => kind.label.toLowerCase()).join(', ')} — the kind only
              changes how it is labelled, not what you can fill in.
            </span>
          </li>
          <li className="flex gap-2">
            <ShoppingBag size={13} className="mt-0.5 shrink-0" />
            <span>
              Switching an item off keeps it here and hides it from visitors. Up to {MAX_SPACE_OFFERINGS} items per Space.
            </span>
          </li>
          <li className="flex gap-2">
            <ShoppingBag size={13} className="mt-0.5 shrink-0" />
            <span>
              Wevsoft does not take payment for these. A price is a label, and the link you add is where the sale actually
              happens.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
