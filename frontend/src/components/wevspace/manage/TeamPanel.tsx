/**
 * Team & permissions (MP2 §3, §4).
 *
 * Three things this screen has to get right:
 *  - the owner is not a team member. Their row is separate, above the list, and
 *    carries no controls, because nothing here can change ownership (§3).
 *  - an invitation has a life: sent → accepted, declined, revoked or expired.
 *    Those endings are kept apart rather than collapsed into "not a member", so
 *    the history reads correctly and a lapsed invite can be re-sent (§4).
 *  - a role is a starting point, not a cage. The matrix shows what the role
 *    already grants (locked) next to what has been added for this person, and
 *    says which extras came along implicitly — an "export analytics" grant that
 *    silently also lets someone read analytics would be a nasty surprise.
 *
 * `can()` here only decides what to render. Every action is re-checked server
 * side, including the two rules the UI mirrors: only the owner may hand out or
 * touch an ADMIN, and nobody removes their own access with the remove button —
 * that is what Leave is for.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Clock,
  Crown,
  LogOut,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ASSIGNABLE_SPACE_ROLES,
  SPACE_INVITE_TTL_DAYS,
  SPACE_MEMBER_ROLES,
  SPACE_MEMBER_STATUS_LABELS,
  SPACE_PERMISSIONS,
  SPACE_PERMISSION_GROUPS,
  SPACE_PERMISSION_LABELS,
  expandPermissions,
  permissionsForRole,
  spacePublicPath,
  spaceRoleDef,
  type SpaceMemberRole,
  type SpaceMemberStatus,
  type SpacePermission,
} from '@wevsoft/shared/wevspace';
import {
  fetchTeam,
  inviteTeamMember,
  leaveSpace,
  removeTeamMember,
  resendTeamInvite,
  revokeTeamInvite,
  updateTeamMember,
} from '../../../lib/wevspaceManageApi';
import type { SpaceConfirmation } from '../../../lib/wevspaceApi';
import { useStore } from '../../../store';
import { ConfirmIdentitySheet, isConfirmCancelled, useIdentityConfirmation } from './ConfirmIdentitySheet';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  Field,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonRow,
  Pill,
  SegmentedTabs,
  Select,
  Sheet,
  StatTile,
  TextArea,
  TextInput,
  confirmAction,
  dateOnly,
  num,
  relativeTime,
  statusTone,
  usePanelData,
} from './manageUi';

const TABS = [
  { id: 'active', label: 'On the team' },
  { id: 'invited', label: 'Invitations' },
  { id: 'past', label: 'Past' },
] as const;
type TeamTab = (typeof TABS)[number]['id'];

const NOTE_MAX = 280;

/** An expired invite still belongs with the invitations — it can be re-sent. */
const TAB_STATUSES: Record<TeamTab, readonly string[]> = {
  active: ['ACTIVE'],
  invited: ['PENDING', 'EXPIRED'],
  past: ['REMOVED', 'DECLINED', 'REVOKED'],
};

function roleLabel(role: unknown): string {
  return spaceRoleDef(role)?.label || String(role || 'Team member');
}

export default function TeamPanel() {
const { spaceId, space, handle, accent, isOwner, role: myRole, can, refresh } = useManage();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const navigate = useNavigate();

  const [tab, setTab] = useState<TeamTab>('active');
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const team = usePanelData(() => fetchTeam(spaceId), [spaceId]);

  const members: any[] = team.data?.members || [];
  const owner = team.data?.owner;
  const canInvite = !!team.data?.canInvite;
  const canChangeRoles = !!team.data?.canChangeRoles;
  const canRemove = !!team.data?.canRemove;

  const counts = useMemo(() => {
    const tally = { active: 0, invited: 0, past: 0 } as Record<TeamTab, number>;
    for (const member of members) {
      for (const key of Object.keys(TAB_STATUSES) as TeamTab[]) {
        if (TAB_STATUSES[key].includes(String(member.status))) tally[key] += 1;
      }
    }
    return tally;
  }, [members]);

  const visible = useMemo(
    () => members.filter((member) => TAB_STATUSES[tab].includes(String(member.status))),
    [members, tab],
  );

  const afterChange = useCallback(async () => {
    await team.reload();
    await refresh();
  }, [team, refresh]);

  // Removing an admin is challenged by the server (MP4 §10). Every action routes
  // through here, so an action that is not gated simply never sees a prompt — the
  // server decides, and this panel follows.
  const confirmation = useIdentityConfirmation();

  const act = async (id: string, run: (confirm?: SpaceConfirmation) => Promise<unknown>, done: string) => {
    setBusyId(id);
    try {
      await confirmation.run(run);
      toast.success(done);
      await afterChange();
    } catch (error: any) {
      if (!isConfirmCancelled(error)) toast.error(error?.message || 'That did not work');
    } finally {
      setBusyId(null);
    }
  };

  const inviteAgain = (member: any) => {
    const identifier = member.user?.username || member.user?.id;
    if (!identifier) return;
    void act(
      member.id,
      () => inviteTeamMember(spaceId, { username: identifier, role: member.role as SpaceMemberRole }),
      `Invited ${member.user?.name || 'them'} again`,
    );
  };

  const leave = async () => {
    if (
      !confirmAction(
        `Leave ${space?.name || 'this Space'}?\n\nYou lose access to this dashboard straight away. Anything you posted or replied to as the Space stays where it is, and the owner can invite you back.`,
      )
    ) {
      return;
    }
    setLeaving(true);
    try {
      await leaveSpace(spaceId);
      toast.success(`You left ${space?.name || 'this Space'}`);
      navigate(spacePublicPath(handle));
    } catch (error: any) {
      toast.error(error?.message || 'Could not leave this Space');
      setLeaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} accent={accent} />
      <PanelHeader
        title="Team & permissions"
        blurb="Who helps run this Space, what each person can do, and every invitation you have sent."
        actions={
          canInvite ? (
            <ActionButton tone="accent" accent={accent} onClick={() => setInviting(true)}>
              <UserPlus size={14} /> Invite someone
            </ActionButton>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="On the team" value={num(counts.active)} icon={<Users size={15} />} accent={accent} />
        <StatTile
          label="Invitations open"
          value={num(members.filter((m) => m.status === 'PENDING').length)}
          hint={`Each one lasts ${SPACE_INVITE_TTL_DAYS} days`}
          icon={<Mail size={15} />}
          accent={accent}
        />
        <StatTile label="Past members" value={num(counts.past)} accent={accent} />
        <StatTile
          label="Your role"
          value={roleLabel(myRole)}
          hint={isOwner ? 'Full control' : spaceRoleDef(myRole)?.blurb}
          icon={<ShieldCheck size={15} />}
          accent={accent}
        />
      </div>

      {/* The owner sits outside the team list on purpose (§3): nothing on this screen
          can change who owns the Space. Handing it over lives in Settings, where it is
          an offer the other account has to accept (MP4 §10). */}
      <Card>
        <CardTitle>Owner</CardTitle>
        <PersonRow
          person={owner}
          accent={accent}
          meta={owner?.username ? `@${owner.username} · created this Space` : 'Created this Space'}
          right={
            <>
              {user?.id && owner?.id === user.id && <Pill accent={accent}>You</Pill>}
              <Pill tone={statusTone('ACTIVE')}>
                <Crown size={10} /> Owner
              </Pill>
            </>
          }
        />
        <p className="mt-3 text-[11px] text-muted-foreground">
          Deleting the Space and moving money stay with the owner and cannot be granted to anybody else.
        </p>
      </Card>

      <SegmentedTabs options={TABS} value={tab} onChange={setTab} accent={accent} counts={counts} />

      {team.loading && !team.data ? (
        <PanelSkeleton rows={3} />
      ) : team.error ? (
        <PanelError message={team.error} onRetry={team.reload} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={tab === 'invited' ? <Mail size={18} /> : <Users size={18} />}
          title={
            tab === 'active'
              ? 'Nobody else on the team yet'
              : tab === 'invited'
                ? 'No open invitations'
                : 'No past members'
          }
          blurb={
            tab === 'active'
              ? 'Invite someone and pick what they may do. You can change it later, or take it back.'
              : tab === 'invited'
                ? 'Invitations you send appear here until they are accepted, declined or they run out.'
                : 'People who left, were removed, or never accepted will be listed here.'
          }
          action={
            canInvite && tab !== 'past' ? (
              <ActionButton tone="accent" accent={accent} onClick={() => setInviting(true)}>
                <UserPlus size={14} /> Invite someone
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              accent={accent}
              isMe={!!user?.id && member.user?.id === user.id}
              busy={busyId === member.id}
              canChangeRoles={canChangeRoles}
              canRemove={canRemove}
              canInvite={canInvite}
              onEdit={() => setEditing(member)}
              onResend={() => void act(member.id, () => resendTeamInvite(member.id), 'Invitation sent again')}
              onRevoke={() => {
                if (!confirmAction(`Withdraw the invitation to ${member.user?.name || 'this person'}?`)) return;
                void act(member.id, () => revokeTeamInvite(member.id), 'Invitation withdrawn');
              }}
              onRemove={() => {
                if (
                  !confirmAction(
                    `Remove ${member.user?.name || 'this person'} from the team?\n\nThey lose access to this dashboard immediately. Content they published as ${space?.name || 'the Space'} stays, and their history here is kept.`,
                  )
                ) {
                  return;
                }
                void act(member.id, (confirm) => removeTeamMember(member.id, confirm), 'Removed from the team');
              }}
              onInviteAgain={() => inviteAgain(member)}
            />
          ))}
        </div>
      )}

      {/* Only shown to somebody who actually has a membership to give up. */}
      {!isOwner && myRole && (
        <Card>
          <CardTitle>Your own access</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            You are {roleLabel(myRole).toLowerCase()} on {space?.name || 'this Space'}. Leaving is the only way to end
            your own access — the remove button is for other people.
          </p>
          <div className="mt-3">
            <ActionButton tone="danger" busy={leaving} onClick={() => void leave()}>
              <LogOut size={14} /> Leave this Space
            </ActionButton>
          </div>
        </Card>
      )}

      {inviting && (
        <InviteSheet
          spaceId={spaceId}
          spaceName={space?.name || 'this Space'}
          accent={accent}
          isOwner={isOwner}
          onClose={() => setInviting(false)}
          onDone={() => void afterChange()}
        />
      )}

      {editing && (
        <AccessSheet
          member={editing}
          accent={accent}
          isOwner={isOwner}
          canChangeRoles={canChangeRoles}
          onClose={() => setEditing(null)}
          onDone={() => void afterChange()}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Rows
// ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  accent,
  isMe,
  busy,
  canChangeRoles,
  canRemove,
  canInvite,
  onEdit,
  onResend,
  onRevoke,
  onRemove,
  onInviteAgain,
}: {
  member: any;
  accent: string;
  isMe: boolean;
  busy: boolean;
  canChangeRoles: boolean;
  canRemove: boolean;
  canInvite: boolean;
  onEdit: () => void;
  onResend: () => void;
  onRevoke: () => void;
  onRemove: () => void;
  onInviteAgain: () => void;
}) {
  const status = String(member.status);
  const extras: string[] = Array.isArray(member.permissions) ? member.permissions : [];
  const isAdminRow = member.role === 'ADMIN';

  const meta = (() => {
    if (status === 'ACTIVE') {
      return `${roleLabel(member.role)} · joined ${relativeTime(member.acceptedAt || member.invitedAt)}`;
    }
    if (status === 'PENDING') {
      return `Invited as ${roleLabel(member.role)} · expires ${relativeTime(member.expiresAt)}`;
    }
    if (status === 'EXPIRED') return `Invitation ran out ${relativeTime(member.expiresAt)}`;
    if (status === 'DECLINED') return `Declined ${relativeTime(member.declinedAt)}`;
    if (status === 'REVOKED') {
      return `Invitation withdrawn${member.revokedBy?.name ? ` by ${member.revokedBy.name}` : ''}`;
    }
    if (status === 'REMOVED') return `Left the team ${relativeTime(member.removedAt)}`;
    return roleLabel(member.role);
  })();

  return (
    <Card className="p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <PersonRow
            person={member.user}
            accent={accent}
            meta={meta}
            right={
              <>
                {isMe && <Pill accent={accent}>You</Pill>}
                {isAdminRow && <Pill tone={statusTone('APPROVED')}>Admin</Pill>}
                <Pill tone={statusTone(status)}>
                  {SPACE_MEMBER_STATUS_LABELS[status as SpaceMemberStatus] || status}
                </Pill>
              </>
            }
          />
          {extras.length > 0 && status === 'ACTIVE' && (
            <p className="mt-2 pl-[48px] text-[11px] text-muted-foreground">
              Plus {extras.length} extra {extras.length === 1 ? 'permission' : 'permissions'} beyond{' '}
              {roleLabel(member.role).toLowerCase()}.
            </p>
          )}
          {member.inviteNote && (status === 'PENDING' || status === 'EXPIRED') && (
            <p className="mt-2 pl-[48px] text-[11px] text-muted-foreground italic">“{member.inviteNote}”</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
          {status === 'ACTIVE' && canChangeRoles && !isMe && (
            <ActionButton size="sm" busy={busy} onClick={onEdit}>
              Edit access
            </ActionButton>
          )}
          {status === 'ACTIVE' && canRemove && !isMe && (
            <IconButton
              label={`Remove ${member.user?.name || 'this person'}`}
              tone="danger"
              busy={busy}
              onClick={onRemove}
            >
              <UserMinus size={14} />
            </IconButton>
          )}
          {(status === 'PENDING' || status === 'EXPIRED') && canInvite && (
            <ActionButton size="sm" busy={busy} onClick={onResend}>
              <RotateCcw size={12} /> {status === 'EXPIRED' ? 'Send again' : 'Remind'}
            </ActionButton>
          )}
          {status === 'PENDING' && canRemove && (
            <IconButton label="Withdraw invitation" tone="danger" busy={busy} onClick={onRevoke}>
              <X size={14} />
            </IconButton>
          )}
          {(status === 'REMOVED' || status === 'DECLINED' || status === 'REVOKED') && canInvite && (
            <ActionButton size="sm" busy={busy} onClick={onInviteAgain}>
              <UserPlus size={12} /> Invite again
            </ActionButton>
          )}
        </div>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Permission matrix
// ──────────────────────────────────────────────────────────────

/**
 * What this person will actually be able to do. Rows fall into three states and
 * each says so, because a locked checkbox with no explanation reads like a bug:
 *  - part of the role: locked on, change the role to change it;
 *  - added for this person: the only thing that is editable here;
 *  - comes with something else: locked on, with the reason named.
 */
function PermissionMatrix({
  role,
  extras,
  onChange,
  accent,
  readOnly = false,
}: {
  role: SpaceMemberRole;
  extras: SpacePermission[];
  onChange: (next: SpacePermission[]) => void;
  accent: string;
  readOnly?: boolean;
}) {
  const baseline = useMemo(() => new Set(permissionsForRole(role)), [role]);
  const fromExtras = useMemo(() => expandPermissions(extras), [extras]);

  const toggle = (permission: SpacePermission) => {
    onChange(
      extras.includes(permission) ? extras.filter((key) => key !== permission) : [...extras, permission],
    );
  };

  return (
    <div className="space-y-3">
      {SPACE_PERMISSION_GROUPS.map((group) => (
        <div key={group.id} className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{group.label}</p>
          <div className="mt-1.5 divide-y divide-border/60">
            {group.permissions.map((raw) => {
              const permission = raw as SpacePermission;
              const inRole = baseline.has(permission);
              const chosen = extras.includes(permission);
              const implied = !inRole && !chosen && fromExtras.has(permission);
              const locked = readOnly || inRole || implied;
              return (
                <label
                  key={permission}
                  className={`flex items-center gap-2.5 py-2 ${locked ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={inRole || chosen || implied}
                    disabled={locked}
                    onChange={() => toggle(permission)}
                    className="w-4 h-4 shrink-0 rounded"
                    style={{ accentColor: accent }}
                  />
                  <span className="min-w-0 flex-1 text-xs font-bold">{SPACE_PERMISSION_LABELS[permission]}</span>
                  {inRole && <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-muted-foreground">In role</span>}
                  {implied && <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Comes with</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RolePicker({
  value,
  onChange,
  isOwner,
}: {
  value: SpaceMemberRole;
  onChange: (next: SpaceMemberRole) => void;
  isOwner: boolean;
}) {
  return (
    <Field label="Role" hint={spaceRoleDef(value)?.blurb}>
      <Select value={value} onChange={(event) => onChange(event.target.value as SpaceMemberRole)}>
        {ASSIGNABLE_SPACE_ROLES.map((id) => {
          const def = SPACE_MEMBER_ROLES.find((entry) => entry.id === id);
          const adminBlocked = id === 'ADMIN' && !isOwner;
          return (
            <option key={id} value={id} disabled={adminBlocked}>
              {def?.label}
              {adminBlocked ? ' — owner only' : ''}
            </option>
          );
        })}
      </Select>
    </Field>
  );
}

/** Extras the new role already covers are pointless; drop them on every change. */
function trimExtras(role: SpaceMemberRole, extras: SpacePermission[]): SpacePermission[] {
  const baseline = new Set(permissionsForRole(role));
  return extras.filter((permission) => !baseline.has(permission));
}

// ──────────────────────────────────────────────────────────────
// Sheets
// ──────────────────────────────────────────────────────────────

function InviteSheet({
  spaceId,
  spaceName,
  accent,
  isOwner,
  onClose,
  onDone,
}: {
  spaceId: string;
  spaceName: string;
  accent: string;
  isOwner: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<SpaceMemberRole>('EDITOR');
  const [note, setNote] = useState('');
  const [extras, setExtras] = useState<SpacePermission[]>([]);
  const [showMatrix, setShowMatrix] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const who = identifier.trim().replace(/^@/, '');
    if (!who) {
      setError('Who do you want to invite?');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await inviteTeamMember(spaceId, {
        username: who,
        role,
        permissions: extras.length ? extras : undefined,
        note: note.trim() || undefined,
      });
      toast.success('Invitation sent');
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not send that invitation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      wide
      title="Invite someone to the team"
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => void submit()} full>
            Send invitation
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Their Wevsoft account"
          hint="A @username or the email address on their account. They must already have an account."
          error={error}
        >
          <TextInput
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="@username or email"
            autoFocus
          />
        </Field>

        <RolePicker value={role} onChange={(next) => { setRole(next); setExtras((list) => trimExtras(next, list)); }} isOwner={isOwner} />

        <Field label="Note (optional)" hint="Included in the invitation so they know why." count={`${note.length}/${NOTE_MAX}`}>
          <TextArea
            value={note}
            rows={2}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            placeholder={`Help me run ${spaceName}`}
          />
        </Field>

        <div className="rounded-2xl border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold">Extra permissions</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {extras.length
                  ? `${extras.length} added on top of ${roleLabel(role).toLowerCase()}.`
                  : `${roleLabel(role)} already covers most of what they need.`}
              </p>
            </div>
            <ActionButton size="sm" onClick={() => setShowMatrix((value) => !value)}>
              {showMatrix ? 'Hide' : 'Adjust'}
            </ActionButton>
          </div>
          {showMatrix && (
            <div className="mt-3">
              <PermissionMatrix
                role={role}
                extras={extras}
                onChange={(next) => setExtras(trimExtras(role, next))}
                accent={accent}
              />
            </div>
          )}
        </div>

        <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Clock size={13} className="mt-0.5 shrink-0" />
          The invitation stays open for {SPACE_INVITE_TTL_DAYS} days. Nothing changes for them until they accept, and
          they can decline.
        </p>
      </div>
    </Sheet>
  );
}

function AccessSheet({
  member,
  accent,
  isOwner,
  canChangeRoles,
  onClose,
  onDone,
}: {
  member: any;
  accent: string;
  isOwner: boolean;
  canChangeRoles: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const initialRole: SpaceMemberRole = (member.role as SpaceMemberRole) || 'EDITOR';
  const [role, setRole] = useState<SpaceMemberRole>(initialRole);
  const [extras, setExtras] = useState<SpacePermission[]>(() =>
    trimExtras(initialRole, Array.isArray(member.permissions) ? (member.permissions as SpacePermission[]) : []),
  );
  const [busy, setBusy] = useState(false);
  const confirmation = useIdentityConfirmation();

  const effective = useMemo(() => permissionsForRole(role, extras).length, [role, extras]);
  const changed =
    role !== initialRole ||
    JSON.stringify([...extras].sort()) !==
      JSON.stringify([...trimExtras(initialRole, Array.isArray(member.permissions) ? member.permissions : [])].sort());

  const save = async () => {
    setBusy(true);
    try {
      await confirmation.run((confirm) => updateTeamMember(member.id, { role, permissions: extras }, confirm));
      toast.success(`${member.user?.name || 'Their'} access updated`);
      onDone();
      onClose();
    } catch (error: any) {
      if (!isConfirmCancelled(error)) toast.error(error?.message || 'Could not save that change');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} accent={accent} />
    <Sheet
      wide
      title={`Access for ${member.user?.name || 'this teammate'}`}
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            tone="accent"
            accent={accent}
            busy={busy}
            disabled={!canChangeRoles || !changed}
            onClick={() => void save()}
            full
          >
            Save changes
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <PersonRow
          person={member.user}
          accent={accent}
          meta={`On the team since ${dateOnly(member.acceptedAt || member.invitedAt)}`}
        />

        <RolePicker
          value={role}
          onChange={(next) => {
            setRole(next);
            setExtras((list) => trimExtras(next, list));
          }}
          isOwner={isOwner}
        />

        <div>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="text-xs font-extrabold">What they can do</span>
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
              {effective} of {SPACE_PERMISSIONS.length} permissions
            </span>
          </div>
          <PermissionMatrix
            role={role}
            extras={extras}
            onChange={(next) => setExtras(trimExtras(role, next))}
            accent={accent}
            readOnly={!canChangeRoles}
          />
        </div>

        {!isOwner && member.role === 'ADMIN' && (
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Only the owner can change an admin. Saving will be refused.
          </p>
        )}
      </div>
    </Sheet>
    </>
  );
}
