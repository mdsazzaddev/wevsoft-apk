import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MERGED_NAV_LABELS, SECTION_TAB_GROUPS, primaryActiveFor, tabGroupFor } from './navTabs';
import { PLATFORM_NAV } from './platformNav';

// Redirect / route table: every pre-consolidation path still resolves to the same page.
const OLD_PATHS: [string, string, number][] = [
  ['/developer/security', 'access', 0],
  ['/developer/apps/abc/access', 'access', 0],
  ['/developer/permissions', 'access', 1],
  ['/developer/scopes?x=1#top', 'access', 2],
  ['/developer/webhooks', 'webhooks', 0],
  ['/developer/callbacks', 'webhooks', 1],
  ['/developer/webhook-schemas/', 'webhooks', 2],
];

test('old paths keep working and map to their tab', () => {
  for (const [path, group, active] of OLD_PATHS) {
    const hit = tabGroupFor(path);
    assert.ok(hit, path);
    assert.equal(hit.group.id, group, path);
    assert.equal(hit.active, active, path);
  }
  assert.equal(tabGroupFor('/developer/usage'), null);
  assert.equal(tabGroupFor('/developer/apps/abc/webhooks'), null); // app-detail tab, not this strip
});

test('every tab path is still a registered route', () => {
  const routes = readFileSync('developer/src/DeveloperRoutes.tsx', 'utf8');
  const navTargets = new Set(PLATFORM_NAV.map((n) => (n.item.target.kind === 'route' ? n.item.target.to : '')));
  for (const g of SECTION_TAB_GROUPS) for (const t of g.tabs) {
    assert.ok(routes.includes(`path="${t.to}"`) || navTargets.has(t.to), t.to);
  }
});

test('primary sidebar item is active on every tab of its group', () => {
  assert.equal(primaryActiveFor('/developer/webhooks', '/developer/callbacks'), true);
  assert.equal(primaryActiveFor('/developer/security', '/developer/scopes'), true);
  assert.equal(primaryActiveFor('/developer/webhooks', '/developer/scopes'), false);
});

test('merged labels are not primaries', () => {
  const primaries = SECTION_TAB_GROUPS.map((g) => g.primary);
  for (const l of MERGED_NAV_LABELS) assert.ok(!primaries.includes(l), l);
});
