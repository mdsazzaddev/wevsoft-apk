import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contentAuthorLabel,
  isSpaceAuthored,
  personAuthorId,
  personProfilePath,
  resolveContentAuthor,
  type ResolvedContentAuthor,
  type ResolvedSpaceAuthor,
  type ResolvedUserAuthor,
} from './content-author.js';

/**
 * Assert the branch and narrow in one step, so a test that expected a Space and got
 * a person fails on the branch rather than on a confusing undefined field.
 */
function asSpace(author: ResolvedContentAuthor): ResolvedSpaceAuthor {
  assert.equal(author.kind, 'space');
  return author as ResolvedSpaceAuthor;
}

function asUser(author: ResolvedContentAuthor): ResolvedUserAuthor {
  assert.equal(author.kind, 'user');
  return author as ResolvedUserAuthor;
}

const SPACE_CARD = {
  id: 'space-1',
  handle: 'dhakacycles',
  name: 'Dhaka Cycles',
  avatar: null,
  accentColor: null,
  spaceType: 'BUSINESS',
  verificationStatus: 'VERIFIED',
};

/** What the server actually ships for a Space's post: no `user`, no `userId`. */
const SPACE_POST = { id: 'p1', authorKind: 'space', spaceId: 'space-1', space: SPACE_CARD };

const PERSON = {
  id: 'user-1',
  name: 'Tanvir Ahmed',
  username: 'tanvir_bd',
  profileSlug: null,
  avatar: null,
  role: 'user',
  verified: false,
};

const PERSON_POST = { id: 'p2', authorKind: 'user', userId: 'user-1', user: PERSON };

// ---------------------------------------------------------------------------
// isSpaceAuthored
// ---------------------------------------------------------------------------

test('a row is Space-authored when authorKind says so', () => {
  assert.equal(isSpaceAuthored(SPACE_POST), true);
});

test('a bare spaceId is enough, so a payload cached before authorKind existed still fails closed', () => {
  assert.equal(isSpaceAuthored({ spaceId: 'space-1' }), true);
  assert.equal(isSpaceAuthored({ spaceId: 'space-1', user: PERSON }), true);
});

test('personal and empty rows are not Space-authored', () => {
  assert.equal(isSpaceAuthored(PERSON_POST), false);
  assert.equal(isSpaceAuthored({}), false);
  assert.equal(isSpaceAuthored(null), false);
  assert.equal(isSpaceAuthored(undefined), false);
});

// ---------------------------------------------------------------------------
// resolveContentAuthor - the Space branch
// ---------------------------------------------------------------------------

test('a Space post names the Space, links to its public path, and carries its own type label', () => {
  const a = asSpace(resolveContentAuthor(SPACE_POST));
  assert.equal(a.id, 'space-1');
  assert.equal(a.name, 'Dhaka Cycles');
  assert.equal(a.handle, 'dhakacycles');
  assert.equal(a.at, '@dhakacycles');
  assert.equal(a.href, '/space/@dhakacycles');
  assert.equal(a.initials, 'DC');
  assert.equal(a.verified, true);
  assert.equal(a.typeLabel, 'Business');
  assert.equal(a.unavailable, false);
});

/**
 * The regression this module exists to prevent.
 *
 * A stale cache, or a surface whose query skipped `applySpaceAuthor`, can hand us a
 * Space row that still has `user` attached. The resolver must ignore it: naming that
 * person would map the Space back to whichever team member pressed publish.
 */
test('a Space row that still carries `user` never names that person', () => {
  const leaky = { ...SPACE_POST, userId: 'user-1', user: PERSON };
  const a = asSpace(resolveContentAuthor(leaky));
  assert.equal(a.name, 'Dhaka Cycles');
  assert.equal(a.id, 'space-1');
  assert.notEqual(a.name, PERSON.name);
  assert.notEqual(a.id, PERSON.id);
  assert.equal(JSON.stringify(a).includes(PERSON.name), false);
  assert.equal(JSON.stringify(a).includes(PERSON.id), false);
});

test('an unresolvable Space renders anonymously rather than falling back to the actor', () => {
  const a = asSpace(resolveContentAuthor({ authorKind: 'space', spaceId: 'space-1', space: null, user: PERSON }));
  assert.equal(a.unavailable, true);
  assert.equal(a.name, 'WevSpace');
  assert.equal(a.id, null);
  assert.equal(a.href, null);
  assert.equal(a.at, null);
  assert.equal(a.initials, 'W');
  assert.equal(a.verified, false);
});

test('a Space with a handle but no name falls back to the handle, not to a blank', () => {
  const a = asSpace(resolveContentAuthor({ spaceId: 's', space: { id: 's', handle: 'wevbikes', name: null } }));
  assert.equal(a.name, 'wevbikes');
  assert.equal(a.at, '@wevbikes');
  assert.equal(a.unavailable, false);
});

test('a Space missing its handle has nothing safe to link to', () => {
  const a = asSpace(resolveContentAuthor({ spaceId: 's', space: { id: 's', name: 'No Handle' } }));
  assert.equal(a.name, 'No Handle');
  assert.equal(a.href, null);
  assert.equal(a.at, null);
  assert.equal(a.unavailable, true);
});

test('the accent is the Space override when set and the theme default otherwise', () => {
  assert.equal(asSpace(resolveContentAuthor(SPACE_POST)).accent, '#2563eb');
  const custom = asSpace(resolveContentAuthor({ spaceId: 's', space: { ...SPACE_CARD, accentColor: '#ff5722' } }));
  assert.equal(custom.accent, '#ff5722');
});

test('only VERIFIED and OFFICIAL earn the badge', () => {
  const verifiedFor = (verificationStatus: string | null) =>
    asSpace(resolveContentAuthor({ spaceId: 's', space: { ...SPACE_CARD, verificationStatus } })).verified;
  assert.equal(verifiedFor('VERIFIED'), true);
  assert.equal(verifiedFor('OFFICIAL'), true);
  assert.equal(verifiedFor('PENDING'), false);
  assert.equal(verifiedFor('UNVERIFIED'), false);
  assert.equal(verifiedFor(null), false);
});

// ---------------------------------------------------------------------------
// resolveContentAuthor - the person branch
// ---------------------------------------------------------------------------

test('a personal post names the person and links to their profile', () => {
  const a = asUser(resolveContentAuthor(PERSON_POST));
  assert.equal(a.id, 'user-1');
  assert.equal(a.name, 'Tanvir Ahmed');
  assert.equal(a.handle, 'tanvir_bd');
  assert.equal(a.at, '@tanvir_bd');
  assert.equal(a.href, '/u/tanvir_bd');
  assert.equal(a.isAdmin, false);
  assert.equal(a.user, PERSON);
});

test('the viewer looking at their own post is sent to /profile', () => {
  assert.equal(asUser(resolveContentAuthor(PERSON_POST, 'user-1')).href, '/profile');
  assert.equal(asUser(resolveContentAuthor(PERSON_POST, 'someone-else')).href, '/u/tanvir_bd');
});

test('a person falls back to their username, then to a neutral label', () => {
  assert.equal(asUser(resolveContentAuthor({ user: { id: 'u', username: 'solo' } })).name, 'solo');
  assert.equal(asUser(resolveContentAuthor({ user: { id: 'u' } })).name, 'User');
  assert.equal(asUser(resolveContentAuthor({})).name, 'Unavailable account');
  assert.equal(asUser(resolveContentAuthor(null)).name, 'Unavailable account');
});

test('a row with only userId still identifies the person for post-level controls', () => {
  const a = asUser(resolveContentAuthor({ userId: 'user-9' }));
  assert.equal(a.id, 'user-9');
  assert.equal(a.href, null);
  assert.equal(a.user, null);
  assert.equal(a.unavailable, true);
});

test('an unlinkable person is marked unavailable', () => {
  assert.equal(asUser(resolveContentAuthor({})).unavailable, true);
  assert.equal(asUser(resolveContentAuthor(PERSON_POST)).unavailable, false);
});

test('the admin pill follows the role, not the verified flag', () => {
  assert.equal(asUser(resolveContentAuthor({ user: { id: 'u', role: 'admin' } })).isAdmin, true);
  assert.equal(asUser(resolveContentAuthor({ user: { id: 'u', role: 'moderator' } })).isAdmin, false);
  assert.equal(asUser(resolveContentAuthor({ user: { id: 'u', verified: true } })).verified, true);
});

// ---------------------------------------------------------------------------
// personProfilePath
// ---------------------------------------------------------------------------

test('profileSlug wins over username, which wins over the raw id', () => {
  assert.equal(personProfilePath({ id: 'u', username: 'name', profileSlug: 'slug' }), '/u/slug');
  assert.equal(personProfilePath({ id: 'u', username: 'name' }), '/u/name');
  assert.equal(personProfilePath({ id: 'u' }), '/u/u');
});

test('there is no profile path without a person or a slug', () => {
  assert.equal(personProfilePath(null), null);
  assert.equal(personProfilePath(undefined), null);
  assert.equal(personProfilePath({}), null);
});

test('the self case is /profile even when a slug exists', () => {
  assert.equal(personProfilePath({ id: 'u', profileSlug: 'slug' }, 'u'), '/profile');
  assert.equal(personProfilePath({ id: 'u', profileSlug: 'slug' }, 'other'), '/u/slug');
});

// ---------------------------------------------------------------------------
// personAuthorId - the guard for mute / block / restrict / hide-creator
// ---------------------------------------------------------------------------

test('there is no person to act on for a Space post, even one that leaked a user', () => {
  assert.equal(personAuthorId(SPACE_POST), null);
  assert.equal(personAuthorId({ ...SPACE_POST, userId: 'user-1', user: PERSON }), null);
  assert.equal(personAuthorId({ spaceId: 'space-1', user: PERSON }), null);
});

test('a personal post yields the person id, preferring the loaded user over the raw column', () => {
  assert.equal(personAuthorId(PERSON_POST), 'user-1');
  assert.equal(personAuthorId({ userId: 'user-7' }), 'user-7');
  assert.equal(personAuthorId({ user: { id: null }, userId: 'user-7' }), 'user-7');
  assert.equal(personAuthorId({}), null);
  assert.equal(personAuthorId(null), null);
});

// ---------------------------------------------------------------------------
// contentAuthorLabel - share sheets and confirm dialogs
// ---------------------------------------------------------------------------

test('the share label names the Space, never the publishing team member', () => {
  assert.equal(contentAuthorLabel(SPACE_POST), 'Dhaka Cycles');
  assert.equal(contentAuthorLabel({ ...SPACE_POST, user: PERSON }), 'Dhaka Cycles');
  assert.equal(contentAuthorLabel({ authorKind: 'space', spaceId: 's', space: null, user: PERSON }), 'WevSpace');
  assert.equal(contentAuthorLabel(PERSON_POST), 'Tanvir Ahmed');
  assert.equal(contentAuthorLabel(null), 'Unavailable account');
});

test('officialTeam (masked staff) author renders as non-link WevSoft Team', () => {
  const a = asUser(resolveContentAuthor({ user: { id: 's1', name: 'WevSoft Team', officialTeam: true } }, 'viewer'));
  assert.equal(a.name, 'WevSoft Team');
  assert.equal(a.href, null);
  assert.equal(a.at, null);
  assert.equal(a.avatar, null);
  assert.equal(a.isAdmin, false);
  assert.equal(a.unavailable, false);
});
