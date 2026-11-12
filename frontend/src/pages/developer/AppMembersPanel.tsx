import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Trash2, UserPlus } from 'lucide-react';
import api from '../../lib/api';
import { useDeveloperFeatures, type DeveloperApp } from './devApi';
import { SectionCard, btnPrimary, btnSecondary, inputCls } from './devUi';

// Phase 3 W3: per-app members (DEV_APP_MEMBERS). Admin/owner only; the API enforces it too.
type Role = 'viewer' | 'developer' | 'admin';
interface Member {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
  user: { id: string; username?: string | null; name?: string | null } | null;
}

const UI = {
  en: {
    title: 'App members',
    desc: 'Give one person access to this app only. Their role here overrides their team role.',
    placeholder: 'Username or email',
    add: 'Add',
    remove: 'Remove',
    empty: 'No per-app members yet.',
    roles: { viewer: 'Viewer', developer: 'Editor', admin: 'Admin' },
    added: 'Member added',
    removed: 'Member removed',
    failed: 'Could not save member',
  },
  bn: {
    title: 'অ্যাপ সদস্য',
    desc: 'শুধু এই অ্যাপে একজনকে অ্যাক্সেস দিন। এখানকার রোল তাঁর টিম রোলের উপরে প্রযোজ্য হবে।',
    placeholder: 'ইউজারনেম বা ইমেইল',
    add: 'যোগ করুন',
    remove: 'সরান',
    empty: 'এখনো কোনো অ্যাপ সদস্য নেই।',
    roles: { viewer: 'দর্শক', developer: 'এডিটর', admin: 'অ্যাডমিন' },
    added: 'সদস্য যোগ হয়েছে',
    removed: 'সদস্য সরানো হয়েছে',
    failed: 'সদস্য সংরক্ষণ করা যায়নি',
  },
} as const;

const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.data?.error || e?.message || fallback;

export default function AppMembersPanel({ app }: { app: DeveloperApp }) {
  const features = useDeveloperFeatures();
  const { i18n } = useTranslation();
  const t = UI[(i18n.resolvedLanguage || i18n.language || 'en').startsWith('bn') ? 'bn' : 'en'];
  const qc = useQueryClient();
  const key = ['developerApp', app.id, 'members'] as const;
  const canManage = app.role === 'owner' || app.role === 'admin';
  const enabled = features.appMembers !== false && canManage;
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<Role>('viewer');

  const { data } = useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => (await api.get(`/developer/apps/${app.id}/members`)).data as { members: Member[] },
  });
  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: key });
  };
  const add = useMutation({
    mutationFn: () => api.post(`/developer/apps/${app.id}/members`, { identifier, role }),
    onSuccess: () => {
      setIdentifier('');
      done(t.added);
    },
    onError: (e) => toast.error(errMsg(e, t.failed)),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; role: Role }) => api.put(`/developer/apps/${app.id}/members/${v.id}`, { role: v.role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(errMsg(e, t.failed)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/developer/apps/${app.id}/members/${id}`),
    onSuccess: () => done(t.removed),
    onError: (e) => toast.error(errMsg(e, t.failed)),
  });

  if (!enabled) return null;
  const members = data?.members ?? [];
  const roleSelect = (value: Role, onChange: (r: Role) => void, testId: string) => (
    <select className={inputCls} value={value} data-testid={testId} onChange={(e) => onChange(e.target.value as Role)}>
      {(['viewer', 'developer', 'admin'] as Role[]).map((r) => (
        <option key={r} value={r}>
          {t.roles[r]}
        </option>
      ))}
    </select>
  );

  return (
    <SectionCard title={t.title} description={t.desc}>
      <div data-testid="app-members" className="space-y-4">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (identifier.trim()) add.mutate();
          }}
        >
          <input className={`${inputCls} flex-1 min-w-[12rem]`} placeholder={t.placeholder} value={identifier} onChange={(e) => setIdentifier(e.target.value)} data-testid="app-member-identifier" />
          {roleSelect(role, setRole, 'app-member-role')}
          <button type="submit" className={btnPrimary} disabled={add.isPending || !identifier.trim()} data-testid="app-member-add">
            <UserPlus className="w-4 h-4" /> {t.add}
          </button>
        </form>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2" data-testid="app-member-row">
                <span className="flex-1 text-sm">{m.user?.name || m.user?.username || m.userId}</span>
                {roleSelect(m.role, (r) => update.mutate({ id: m.id, role: r }), 'app-member-row-role')}
                <button type="button" className={btnSecondary} onClick={() => remove.mutate(m.id)} data-testid="app-member-remove">
                  <Trash2 className="w-4 h-4" /> {t.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}