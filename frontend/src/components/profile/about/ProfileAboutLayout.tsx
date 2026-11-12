/**
 * Facebook-style About: sticky left nav (desktop) / chip row (mobile) and a
 * right pane with the selected section. Deep link: ?tab=about&section=work.
 *
 * Persistence: fields that already exist on PUT /api/profile are saved to the
 * backend (bio, gender, dob, relationshipStatus, hometown, location, socialLinks,
 * school/college/university, interests (= hobbies), mobile, whatsapp,
 * academicEmail, pronouns, work headline, per-item audience in privacySettings).
 * Everything else goes through useAboutExtras (localStorage, see TODO there).
 */
import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import {
  Info, Tag, User, Link2, Users, Gift, Briefcase, GraduationCap, Smile, Heart, Plane, Phone, ShieldCheck, Type,
  MapPin, Home, Cake, Globe, Mail, MessageCircle, BookOpen, School, Volume2, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { Card, Button, cn } from '../../ui';
import { useMarketplaceLang } from '../../marketplace/commerce/useMarketplaceLang';
import { useAboutExtras, newAboutId, type AboutExtras, type AboutListItem } from './useAboutExtras';
import {
  AboutSection, AboutSubheading, AboutAddRow, AboutEmpty, AboutRow, AboutInlineForm,
  type FieldSpec,
} from './AboutPrimitives';
import {
  aboutItemVisibleToVisitor,
  parseAboutAudience,
  serializeAboutAudience,
  type AboutAudiencePayload,
} from './aboutAudience.logic';

export const ABOUT_SECTIONS = [
  'intro', 'category', 'personal', 'links', 'communities', 'offers', 'work', 'education',
  'hobbies', 'interests', 'travel', 'contact', 'privacy', 'names',
] as const;
export type AboutSectionId = (typeof ABOUT_SECTIONS)[number];

const NAV: Record<AboutSectionId, { icon: LucideIcon; en: string; bn: string }> = {
  intro: { icon: Info, en: 'Intro', bn: 'পরিচিতি' },
  category: { icon: Tag, en: 'Category', bn: 'ক্যাটাগরি' },
  personal: { icon: User, en: 'Personal details', bn: 'ব্যক্তিগত তথ্য' },
  links: { icon: Link2, en: 'Links', bn: 'লিংক' },
  communities: { icon: Users, en: 'Communities', bn: 'কমিউনিটি' },
  offers: { icon: Gift, en: 'Offers', bn: 'অফার' },
  work: { icon: Briefcase, en: 'Work', bn: 'কাজ' },
  education: { icon: GraduationCap, en: 'Education', bn: 'শিক্ষা' },
  hobbies: { icon: Smile, en: 'Hobbies', bn: 'শখ' },
  interests: { icon: Heart, en: 'Interests', bn: 'আগ্রহ' },
  travel: { icon: Plane, en: 'Travel', bn: 'ভ্রমণ' },
  contact: { icon: Phone, en: 'Contact info', bn: 'যোগাযোগের তথ্য' },
  privacy: { icon: ShieldCheck, en: 'Privacy and legal info', bn: 'প্রাইভেসি ও আইনি তথ্য' },
  names: { icon: Type, en: 'Names', bn: 'নাম' },
};

function parseJsonObject(raw: unknown): Record<string, any> {
  if (raw && typeof raw === 'object') return raw as Record<string, any>;
  if (typeof raw !== 'string' || !raw || raw === 'null') return {};
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}
const splitList = (raw: unknown): string[] =>
  typeof raw === 'string' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];

interface Props {
  profile: any;
  isOwner: boolean;
  onSave?: (patch: Record<string, unknown>) => Promise<void> | void;
}

export default function ProfileAboutLayout({ profile, isOwner, onSave }: Props) {
  const { t } = useMarketplaceLang();
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('section') as AboutSectionId | null;
  const active: AboutSectionId = fromUrl && (ABOUT_SECTIONS as readonly string[]).includes(fromUrl) ? fromUrl : 'intro';
  const select = (id: AboutSectionId) => {
    const next = new URLSearchParams(params);
    next.set('tab', 'about');
    next.set('section', id);
    setParams(next, { replace: true });
  };

  const { extras, update } = useAboutExtras(String(profile?.id || 'me'));
  const privacy = useMemo(() => parseJsonObject(profile?.privacySettings), [profile?.privacySettings]);
  const audienceOf = (k: string): AboutAudiencePayload => parseAboutAudience(privacy[`about_${k}`]);
  const setAudience = (k: string) => (payload: AboutAudiencePayload) =>
    void onSave?.({
      privacySettings: JSON.stringify({
        ...privacy,
        [`about_${k}`]: serializeAboutAudience(payload),
      }),
    });
  /** Visitors without relation graph only see Public items. */
  const visible = (k: string) => aboutItemVisibleToVisitor(privacy[`about_${k}`], isOwner);

  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);
  const saveBackend = async (patch: Record<string, unknown>) => {
    await onSave?.(patch);
    close();
  };

  const rowProps = (k: string) => ({
    isOwner,
    audience: audienceOf(k),
    onAudience: isOwner && onSave ? setAudience(k) : undefined,
  });

  /** A backend-backed single value: row, add row, or inline form. */
  const single = (
    k: string, icon: LucideIcon, value: string | null | undefined, opts: {
      addLabel: string; sub?: string; field: FieldSpec; render?: (v: string) => React.ReactNode;
      save: (v: string) => Record<string, unknown>;
    },
  ) => {
    if (editing === k) {
      return (
        <AboutInlineForm key={k} fields={[opts.field]} initial={{ [opts.field.name]: value || '' }} onCancel={close}
          onSave={(v) => saveBackend(opts.save((v[opts.field.name] || '').trim()))} />
      );
    }
    if (value) {
      if (!visible(k)) return null;
      return (
        <AboutRow key={k} icon={icon} value={opts.render ? opts.render(value) : value} sub={opts.sub} {...rowProps(k)}
          onEdit={isOwner ? () => setEditing(k) : undefined}
          onDelete={isOwner ? () => void saveBackend(opts.save('')) : undefined} />
      );
    }
    return isOwner ? <AboutAddRow key={k} label={opts.addLabel} onClick={() => setEditing(k)} /> : null;
  };

  /** A local (extras) list of title/subtitle items. */
  const list = (
    k: keyof AboutExtras, icon: LucideIcon, addLabel: string, emptyText: string, fields: [FieldSpec, FieldSpec?],
  ) => {
    const items = ((extras[k] as AboutListItem[] | undefined) || []);
    const shown = items.filter((it) => visible(`${String(k)}_${it.id}`));
    const save = (id: string | null) => (v: Record<string, string>) => {
      const title = (v.title || '').trim();
      if (!title) return close();
      const item = { id: id || newAboutId(), title, subtitle: (v.subtitle || '').trim() || undefined };
      update({ [k]: id ? items.map((it) => (it.id === id ? item : it)) : [...items, item] } as Partial<AboutExtras>);
      close();
    };
    const specs = fields.filter(Boolean) as FieldSpec[];
    return (
      <>
        {shown.map((it) =>
          editing === `${String(k)}:${it.id}` ? (
            <AboutInlineForm key={it.id} fields={specs} initial={{ title: it.title, subtitle: it.subtitle || '' }} onCancel={close} onSave={save(it.id)} />
          ) : (
            <AboutRow key={it.id} icon={icon} value={it.title} sub={it.subtitle} {...rowProps(`${String(k)}_${it.id}`)}
              onEdit={() => setEditing(`${String(k)}:${it.id}`)}
              onDelete={() => update({ [k]: items.filter((x) => x.id !== it.id) } as Partial<AboutExtras>)} />
          ),
        )}
        {editing === `${String(k)}:new` && <AboutInlineForm fields={specs} onCancel={close} onSave={save(null)} />}
        {isOwner && editing !== `${String(k)}:new` && <AboutAddRow label={addLabel} onClick={() => setEditing(`${String(k)}:new`)} />}
        {!isOwner && shown.length === 0 && emptyText ? <AboutEmpty text={emptyText} /> : null}
      </>
    );
  };

  /** Comma tag list: hobbies (backend `interests`), interests/languages (local). */
  const tags = (k: string, values: string[], addLabel: string, emptyText: string, persist: (next: string[]) => void) => (
    <>
      {values.length > 0 && visible(k) && (
        <div className="flex flex-wrap gap-2 px-1 py-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
              {v}
              {isOwner && (
                <button type="button" aria-label={t('Remove', 'সরান') + ' ' + v} onClick={() => persist(values.filter((x) => x !== v))} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
              )}
            </span>
          ))}
        </div>
      )}
      {editing === k ? (
        <AboutInlineForm fields={[{ name: 'v', label: addLabel, placeholder: t('Separate with commas', 'কমা দিয়ে আলাদা করুন') }]} onCancel={close}
          onSave={(v) => { persist([...values, ...splitList(v.v)].filter((x, i, a) => a.indexOf(x) === i)); close(); }} />
      ) : isOwner ? (
        <AboutAddRow label={addLabel} onClick={() => setEditing(k)} />
      ) : values.length === 0 ? (
        <AboutEmpty text={emptyText} />
      ) : null}
    </>
  );

  const socialLinks = parseJsonObject(profile?.socialLinks) as Record<string, string>;
  const dob = profile?.dob ? new Date(profile.dob) : null;
  const nothing = t('Nothing to show', 'দেখানোর মতো কিছু নেই');

  const renderSection = (id: AboutSectionId): React.ReactNode => {
    switch (id) {
      case 'intro':
        return (
          <AboutSection title={t('Intro', 'পরিচিতি')}>
            {single('bio', Info, profile?.bio, {
              addLabel: t('Add a bio', 'বায়ো যোগ করুন'),
              field: { name: 'bio', label: t('Bio', 'বায়ো'), type: 'textarea' },
              render: (v) => <span className="wev-profile-bio block text-[15px] leading-relaxed text-foreground">{v}</span>,
              save: (v) => ({ bio: v }),
            })}
            {!isOwner && !profile?.bio && <AboutEmpty text={nothing} />}
          </AboutSection>
        );
      case 'category':
        return (
          <AboutSection title={t('Category', 'ক্যাটাগরি')}>
            {editing === 'category' ? (
              <AboutInlineForm fields={[{ name: 'c', label: t('Category', 'ক্যাটাগরি'), placeholder: t('e.g. Digital creator', 'যেমন: ডিজিটাল ক্রিয়েটর') }]}
                initial={{ c: extras.category || '' }} onCancel={close} onSave={(v) => { update({ category: v.c.trim() || undefined }); close(); }} />
            ) : extras.category && visible('category') ? (
              <AboutRow icon={Tag} value={extras.category} sub={t('Profile category', 'প্রোফাইল ক্যাটাগরি')} {...rowProps('category')}
                onEdit={() => setEditing('category')} onDelete={() => update({ category: undefined })} />
            ) : isOwner ? (
              <AboutAddRow label={t('Add a category', 'ক্যাটাগরি যোগ করুন')} onClick={() => setEditing('category')} />
            ) : <AboutEmpty text={nothing} />}
          </AboutSection>
        );
      case 'personal':
        return (
          <AboutSection title={t('Personal details', 'ব্যক্তিগত তথ্য')}>
            {single('workHeadline', Briefcase, profile?.work, {
              addLabel: t('Add workplace', 'কর্মস্থল যোগ করুন'),
              sub: t('Work', 'কাজ'),
              field: {
                name: 'w',
                label: t('Position at company', 'কোম্পানিতে পদ'),
                placeholder: t('e.g. Designer at WevSoft', 'যেমন: WevSoft-এ ডিজাইনার'),
              },
              save: (v) => ({ work: v }),
            })}
            {single('gender', User, profile?.gender, {
              addLabel: t('Add gender', 'লিঙ্গ যোগ করুন'), sub: t('Gender', 'লিঙ্গ'),
              field: { name: 'gender', label: t('Gender', 'লিঙ্গ'), type: 'select', options: [
                { value: 'male', label: t('Male', 'পুরুষ') }, { value: 'female', label: t('Female', 'নারী') }, { value: 'other', label: t('Other', 'অন্যান্য') }] },
              render: (v) => ({ male: t('Male', 'পুরুষ'), female: t('Female', 'নারী'), other: t('Other', 'অন্যান্য') } as Record<string, string>)[v] || v,
              save: (v) => ({ gender: v }),
            })}
            {single('dob', Cake, dob && isValid(dob) ? format(dob, 'yyyy-MM-dd') : '', {
              addLabel: t('Add birthday', 'জন্মদিন যোগ করুন'), sub: t('Birthday', 'জন্মদিন'),
              field: { name: 'dob', label: t('Birthday', 'জন্মদিন'), type: 'date' },
              render: (v) => format(new Date(v), 'd MMMM yyyy'),
              save: (v) => ({ dob: v || null }),
            })}
            {single('relationship', Heart, profile?.relationshipStatus, {
              addLabel: t('Add relationship status', 'সম্পর্কের অবস্থা যোগ করুন'), sub: t('Relationship status', 'সম্পর্কের অবস্থা'),
              field: { name: 'r', label: t('Relationship', 'সম্পর্ক'), type: 'select', options: [
                ['Single', 'সিঙ্গেল'], ['In a relationship', 'সম্পর্কে আছি'], ['Engaged', 'বাগদত্ত'], ['Married', 'বিবাহিত'], ["It's complicated", 'জটিল'], ['Divorced', 'ডিভোর্সড'], ['Widowed', 'বিধবা/বিপত্নীক'],
              ].map(([en, bn]) => ({ value: en, label: t(en, bn) })) },
              save: (v) => ({ relationshipStatus: v }),
            })}
            {single('location', MapPin, profile?.location, {
              addLabel: t('Add current city / place', 'বর্তমান শহর / স্থান যোগ করুন'), sub: t('Lives in', 'বাস করেন'),
              field: { name: 'l', label: t('Current city / place', 'বর্তমান শহর / স্থান') }, save: (v) => ({ location: v }),
            })}
            {single('hometown', Home, profile?.hometown, {
              addLabel: t('Add hometown', 'নিজের শহর যোগ করুন'), sub: t('From', 'নিজের শহর'),
              field: { name: 'h', label: t('Hometown', 'নিজের শহর') }, save: (v) => ({ hometown: v }),
            })}
            <AboutSubheading>{t('Languages', 'ভাষা')}</AboutSubheading>
            {tags('languages', extras.languages || [], t('Add a language', 'ভাষা যোগ করুন'), nothing, (next) => update({ languages: next }))}
          </AboutSection>
        );
      case 'links': {
        const entries = Object.entries(socialLinks).filter(([, v]) => typeof v === 'string' && v);
        const saveLinks = (next: Record<string, string>) => saveBackend({ socialLinks: JSON.stringify(next) });
        return (
          <AboutSection title={t('Links', 'লিংক')}>
            {entries.map(([name, url]) =>
              editing === `link:${name}` ? (
                <AboutInlineForm key={name} fields={[{ name: 'url', label: name, type: 'url' }]} initial={{ url }} onCancel={close}
                  onSave={(v) => saveLinks({ ...socialLinks, [name]: v.url.trim() })} />
              ) : visible(`link_${name}`) ? (
                <AboutRow key={name} icon={name === 'website' ? Globe : ExternalLink}
                  value={<a href={/^https?:\/\//.test(url) ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{url}</a>}
                  sub={name.charAt(0).toUpperCase() + name.slice(1)} {...rowProps(`link_${name}`)}
                  onEdit={() => setEditing(`link:${name}`)}
                  onDelete={() => { const n = { ...socialLinks }; delete n[name]; void saveLinks(n); }} />
              ) : null,
            )}
            {editing === 'link:new' ? (
              <AboutInlineForm
                fields={[
                  { name: 'kind', label: t('Type', 'ধরন'), type: 'select', options: ['website', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'github', 'tiktok'].map((k) => ({ value: k, label: k.charAt(0).toUpperCase() + k.slice(1) })) },
                  { name: 'url', label: 'URL', type: 'url', placeholder: 'https://' },
                ]}
                onCancel={close}
                onSave={(v) => (v.kind && v.url ? saveLinks({ ...socialLinks, [v.kind]: v.url.trim() }) : close())}
              />
            ) : isOwner ? (
              <AboutAddRow label={t('Add a link', 'লিংক যোগ করুন')} onClick={() => setEditing('link:new')} />
            ) : entries.length === 0 ? <AboutEmpty text={nothing} /> : null}
          </AboutSection>
        );
      }
      case 'communities':
        return (
          <AboutSection title={t('Communities', 'কমিউনিটি')}>
            {list('communities', Users, t('Add a community', 'কমিউনিটি যোগ করুন'), nothing, [
              { name: 'title', label: t('Community name', 'কমিউনিটির নাম') },
              { name: 'subtitle', label: t('Your role', 'আপনার ভূমিকা'), placeholder: t('e.g. Member, Admin', 'যেমন: মেম্বার, অ্যাডমিন') },
            ])}
          </AboutSection>
        );
      case 'offers':
        return (
          <AboutSection title={t('Offers', 'অফার')}>
            {list('offers', Gift, t('Add an offer', 'অফার যোগ করুন'), nothing, [
              { name: 'title', label: t('What do you offer?', 'আপনি কী অফার করেন?'), placeholder: t('e.g. Logo design', 'যেমন: লোগো ডিজাইন') },
              { name: 'subtitle', label: t('Details', 'বিস্তারিত') },
            ])}
          </AboutSection>
        );
      case 'work':
        return (
          <AboutSection title={t('Work', 'কাজ')}>
            {single('workHeadline', Briefcase, profile?.work, {
              addLabel: t('Add a workplace', 'কর্মস্থল যোগ করুন'), sub: t('Current work (shown on your intro)', 'বর্তমান কাজ (ইন্ট্রোতে দেখায়)'),
              field: { name: 'w', label: t('Position at company', 'কোম্পানিতে পদ'), placeholder: t('e.g. Designer at WevSoft', 'যেমন: WevSoft-এ ডিজাইনার') },
              save: (v) => ({ work: v }),
            })}
            <AboutSubheading>{t('Past work', 'আগের কাজ')}</AboutSubheading>
            {list('work', Briefcase, t('Add past work', 'আগের কাজ যোগ করুন'), nothing, [
              { name: 'title', label: t('Company', 'কোম্পানি') },
              { name: 'subtitle', label: t('Position and years', 'পদ ও সময়কাল'), placeholder: t('e.g. Intern · 2023–2024', 'যেমন: ইন্টার্ন · ২০২৩–২০২৪') },
            ])}
          </AboutSection>
        );
      case 'education': {
        const slot = (k: string, icon: LucideIcon, nameKey: string, subKey: string | null, yearKey: string, en: string, bn: string) => {
          const name = profile?.[nameKey] as string | undefined;
          if (editing === k) {
            const f: FieldSpec[] = [{ name: 'n', label: t(en, bn) }];
            if (subKey) f.push({ name: 's', label: t('Department / subject', 'বিভাগ / বিষয়') });
            f.push({ name: 'y', label: t('Year', 'বছর') });
            return (
              <AboutInlineForm key={k} fields={f} initial={{ n: name || '', s: subKey ? profile?.[subKey] || '' : '', y: profile?.[yearKey] || '' }} onCancel={close}
                onSave={(v) => saveBackend({ [nameKey]: v.n.trim(), ...(subKey ? { [subKey]: (v.s || '').trim() } : {}), [yearKey]: (v.y || '').trim() })} />
            );
          }
          if (name) {
            if (!visible(k)) return null;
            const sub = [subKey ? profile?.[subKey] : null, profile?.[yearKey]].filter(Boolean).join(' · ');
            return (
              <AboutRow key={k} icon={icon} value={name} sub={sub || t(en, bn)} {...rowProps(k)}
                onEdit={() => setEditing(k)}
                onDelete={() => void saveBackend({ [nameKey]: '', ...(subKey ? { [subKey]: '' } : {}), [yearKey]: '' })} />
            );
          }
          return isOwner ? <AboutAddRow key={k} label={t(`Add ${en.toLowerCase()}`, `${bn} যোগ করুন`)} onClick={() => setEditing(k)} /> : null;
        };
        const any = profile?.universityName || profile?.collegeName || profile?.schoolName;
        return (
          <AboutSection title={t('Education', 'শিক্ষা')}>
            {slot('university', GraduationCap, 'universityName', 'uniDepartment', 'gradYear', 'University', 'বিশ্ববিদ্যালয়')}
            {slot('college', BookOpen, 'collegeName', 'department', 'hscYear', 'College', 'কলেজ')}
            {slot('school', School, 'schoolName', null, 'sscYear', 'School', 'স্কুল')}
            {!isOwner && !any && <AboutEmpty text={nothing} />}
          </AboutSection>
        );
      }
      case 'hobbies':
        return (
          <AboutSection title={t('Hobbies', 'শখ')}>
            {tags('hobbies', splitList(profile?.interests), t('Add hobbies', 'শখ যোগ করুন'), nothing,
              (next) => void onSave?.({ interests: next.join(', ') }))}
          </AboutSection>
        );
      case 'interests':
        return (
          <AboutSection title={t('Interests', 'আগ্রহ')}>
            {tags('interests', extras.interests || [], t('Add interests', 'আগ্রহ যোগ করুন'), nothing, (next) => update({ interests: next }))}
          </AboutSection>
        );
      case 'travel':
        return (
          <AboutSection title={t('Travel', 'ভ্রমণ')}>
            {list('travel', Plane, t('Add a place you visited', 'ঘুরে আসা জায়গা যোগ করুন'), nothing, [
              { name: 'title', label: t('Place', 'জায়গা'), placeholder: t('e.g. Cox\'s Bazar', 'যেমন: কক্সবাজার') },
              { name: 'subtitle', label: t('When', 'কখন'), placeholder: t('e.g. December 2025', 'যেমন: ডিসেম্বর ২০২৫') },
            ])}
          </AboutSection>
        );
      case 'contact': {
        const extraEmails = extras.emails || [];
        const extraPhones = extras.phones || [];
        const hasVisibleContact =
          (profile?.email && visible('email')) ||
          visible('mobile') ||
          visible('whatsapp') ||
          visible('academicEmail') ||
          extraEmails.some((it) => visible(`emails_${it.id}`)) ||
          extraPhones.some((it) => visible(`phones_${it.id}`));
        return (
          <AboutSection title={t('Contact info', 'যোগাযোগের তথ্য')}>
            <AboutSubheading>{t('Email', 'ইমেইল')}</AboutSubheading>
            {profile?.email && visible('email') && (
              <AboutRow
                icon={Mail}
                value={profile.email}
                sub={t('Account email (change it in Settings)', 'অ্যাকাউন্ট ইমেইল (সেটিংসে পরিবর্তন করুন)')}
                {...rowProps('email')}
              />
            )}
            {single('academicEmail', Mail, profile?.academicEmail, {
              addLabel: t('Add academic email', 'একাডেমিক ইমেইল যোগ করুন'),
              sub: t('Academic email', 'একাডেমিক ইমেইল'),
              field: { name: 'a', label: t('Academic email', 'একাডেমিক ইমেইল'), type: 'email' },
              save: (v) => ({ academicEmail: v }),
            })}
            {list('emails', Mail, t('Add another email', 'আরেকটি ইমেইল যোগ করুন'), '', [
              { name: 'title', label: t('Email', 'ইমেইল'), type: 'email', placeholder: 'name@example.com' },
              {
                name: 'subtitle',
                label: t('Label', 'লেবেল'),
                placeholder: t('e.g. Work, Personal', 'যেমন: কাজ, ব্যক্তিগত'),
              },
            ])}

            <AboutSubheading>{t('Phone', 'ফোন')}</AboutSubheading>
            {single('mobile', Phone, profile?.mobile || profile?.phone, {
              addLabel: t('Add mobile number', 'মোবাইল নম্বর যোগ করুন'),
              sub: t('Mobile', 'মোবাইল'),
              field: { name: 'm', label: t('Mobile', 'মোবাইল'), type: 'tel' },
              save: (v) => ({ mobile: v }),
            })}
            {single('whatsapp', MessageCircle, profile?.whatsapp, {
              addLabel: t('Add WhatsApp', 'হোয়াটসঅ্যাপ যোগ করুন'),
              sub: 'WhatsApp',
              field: { name: 'w', label: 'WhatsApp', type: 'tel' },
              save: (v) => ({ whatsapp: v }),
            })}
            {list('phones', Phone, t('Add another phone number', 'আরেকটি ফোন নম্বর যোগ করুন'), '', [
              { name: 'title', label: t('Phone number', 'ফোন নম্বর'), type: 'tel', placeholder: '+8801…' },
              {
                name: 'subtitle',
                label: t('Label', 'লেবেল'),
                placeholder: t('e.g. Home, Work, Other', 'যেমন: বাড়ি, কাজ, অন্য'),
              },
            ])}

            {!isOwner && !hasVisibleContact && <AboutEmpty text={nothing} />}
          </AboutSection>
        );
      }
      case 'privacy':
        return (
          <AboutSection title={t('Privacy and legal info', 'প্রাইভেসি ও আইনি তথ্য')}>
            <p className="px-1 py-2 text-[15px] text-muted-foreground">
              {t('Each detail on this page has its own audience. Tap the icon to multi-select Public, Friends, Close friends, Followers, Only me, specific people, or Hide from. Visitors without access only see Public details.',
                'এই পেজের প্রতিটি তথ্যের আলাদা অডিয়েন্স আছে। আইকনে চাপ দিয়ে পাবলিক, বন্ধু, ক্লোজ ফ্রেন্ডস, ফলোয়ার, শুধু আমি, নির্দিষ্ট মানুষ বা Hide from একসাথে বেছে নিন। অ্যাক্সেস ছাড়া ভিজিটর শুধু পাবলিক তথ্য দেখে।')}
            </p>
            <AboutRow icon={ShieldCheck} value={<Link to="/settings?opt=sec_privacy_controls" className="text-primary hover:underline">{t('Privacy settings', 'প্রাইভেসি সেটিংস')}</Link>} sub={t('Who can see your profile, posts and friends', 'কে আপনার প্রোফাইল, পোস্ট ও বন্ধু দেখতে পারবে')} />
            <AboutRow icon={Users} value={<Link to="/settings?opt=sec_wevspaces_visibility" className="text-primary hover:underline">{t('WevSpaces on your profile', 'প্রোফাইলে WevSpaces')}</Link>} sub={t('Settings › Privacy', 'সেটিংস › প্রাইভেসি')} />
            <AboutRow icon={Info} value={t('Profile created', 'প্রোফাইল তৈরি')} sub={profile?.createdAt && isValid(new Date(profile.createdAt)) ? format(new Date(profile.createdAt), 'd MMMM yyyy') : '—'} />
          </AboutSection>
        );
      case 'names':
        return (
          <AboutSection title={t('Names', 'নাম')}>
            {single('pronouns', Type, profile?.pronouns, {
              addLabel: t('Add pronouns', 'সর্বনাম যোগ করুন'), sub: t('Pronouns', 'সর্বনাম'),
              field: { name: 'p', label: t('Pronouns', 'সর্বনাম'), placeholder: 'he/him, she/her, they/them' }, save: (v) => ({ pronouns: v }),
            })}
            {editing === 'pronunciation' ? (
              <AboutInlineForm fields={[{ name: 'p', label: t('How to say your name', 'আপনার নাম কীভাবে উচ্চারণ করবে'), placeholder: t('e.g. SAZ-zad', 'যেমন: সাজ-জাদ') }]}
                initial={{ p: extras.pronunciation || '' }} onCancel={close} onSave={(v) => { update({ pronunciation: v.p.trim() || undefined }); close(); }} />
            ) : extras.pronunciation && visible('pronunciation') ? (
              <AboutRow icon={Volume2} value={extras.pronunciation} sub={t('Name pronunciation', 'নামের উচ্চারণ')} {...rowProps('pronunciation')}
                onEdit={() => setEditing('pronunciation')} onDelete={() => update({ pronunciation: undefined })} />
            ) : isOwner ? (
              <AboutAddRow label={t('Add name pronunciation', 'নামের উচ্চারণ যোগ করুন')} onClick={() => setEditing('pronunciation')} />
            ) : null}
            <AboutSubheading>{t('Other names', 'অন্যান্য নাম')}</AboutSubheading>
            {list('otherNames', User, t('Add a nickname or other name', 'ডাকনাম বা অন্য নাম যোগ করুন'), nothing, [
              { name: 'title', label: t('Name', 'নাম') },
              { name: 'subtitle', label: t('Type', 'ধরন'), placeholder: t('e.g. Nickname, Maiden name', 'যেমন: ডাকনাম') },
            ])}
          </AboutSection>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Mobile: chip row */}
      <nav aria-label={t('About sections', 'অ্যাবাউট সেকশন')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden [scrollbar-width:none]">
        {ABOUT_SECTIONS.map((id) => {
          const N = NAV[id];
          return (
            <button key={id} type="button" onClick={() => select(id)} aria-current={active === id ? 'page' : undefined}
              className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                active === id ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-surface-hover')}>
              <N.icon size={15} strokeWidth={2} aria-hidden /> {t(N.en, N.bn)}
            </button>
          );
        })}
      </nav>

      {/* Desktop: sticky left nav */}
      <Card className="hidden self-start p-2 md:sticky md:top-20 md:block">
        <h2 className="px-2 pb-2 pt-1 text-xl font-bold text-foreground">{t('About', 'অ্যাবাউট')}</h2>
        <nav aria-label={t('About sections', 'অ্যাবাউট সেকশন')} className="space-y-0.5">
          {ABOUT_SECTIONS.map((id) => {
            const N = NAV[id];
            return (
              <button key={id} type="button" onClick={() => select(id)} aria-current={active === id ? 'page' : undefined}
                className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[15px] transition-colors',
                  active === id ? 'bg-primary/10 font-semibold text-primary' : 'font-medium text-foreground hover:bg-surface-hover')}>
                <N.icon size={18} strokeWidth={2} aria-hidden className={active === id ? 'text-primary' : 'text-muted-foreground'} />
                {t(N.en, N.bn)}
              </button>
            );
          })}
        </nav>
      </Card>

      <Card className="min-h-[320px] p-4">
        {renderSection(active)}
        {isOwner && !onSave && (
          <p className="mt-3 text-xs text-muted-foreground">{t('Saving is unavailable here.', 'এখানে সেভ করা যাচ্ছে না।')}</p>
        )}
        {isOwner && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => select(ABOUT_SECTIONS[(ABOUT_SECTIONS.indexOf(active) + 1) % ABOUT_SECTIONS.length])}>
              {t('Next section', 'পরের সেকশন')} ›
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
