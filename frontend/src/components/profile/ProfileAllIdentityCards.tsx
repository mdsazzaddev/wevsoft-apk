/**
 * Owner/visitor All-tab intro stack: Personal → Details → Contact.
 * Compact read-only cards that deep-link into the About tab sections.
 */
import type { ComponentType, ReactNode } from 'react';
import {
  Briefcase, Cake, Calendar, GraduationCap, Heart, Home, Mail, MapPin,
  MessageCircle, Phone, User, Globe,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';

type AboutJump = 'intro' | 'personal' | 'contact' | 'work' | 'education';

type Props = {
  profile: any;
  isOwner?: boolean;
  onSeeAbout: (section?: AboutJump) => void;
  onEdit?: () => void;
};

function parseSocialLinks(raw: unknown): Record<string, string> {
  if (raw && typeof raw === 'object') return raw as Record<string, string>;
  if (typeof raw !== 'string' || !raw || raw === 'null') return {};
  try {
    return (JSON.parse(raw) as Record<string, string>) || {};
  } catch {
    return {};
  }
}

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground/70" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export default function ProfileAllIdentityCards({
  profile,
  isOwner = false,
  onSeeAbout,
  onEdit,
}: Props) {
  const { t, i18n } = useTranslation();
  const isBn = String(i18n.language || '').toLowerCase().startsWith('bn');

  const intro = String(profile?.intro || profile?.bio || '').trim();
  const pronouns = String(profile?.pronouns || '').trim();
  const work = String(profile?.work || profile?.designation || '').trim();
  const location = String(profile?.location || '').trim();
  const hometown = String(profile?.hometown || '').trim();
  const gender = String(profile?.gender || '').trim();
  const relationship = String(profile?.relationshipStatus || '').trim();
  const education = [
    profile?.universityName,
    profile?.collegeName,
    profile?.schoolName,
  ].map((v) => String(v || '').trim()).find(Boolean) || '';
  const dobRaw = profile?.dob ? new Date(profile.dob) : null;
  const dob = dobRaw && isValid(dobRaw) ? format(dobRaw, isBn ? 'd MMM yyyy' : 'MMM d, yyyy') : '';
  const joined = profile?.createdAt && isValid(new Date(profile.createdAt))
    ? format(new Date(profile.createdAt), 'MMM yyyy')
    : '';

  const social = parseSocialLinks(profile?.socialLinks);
  const website = String(social.website || '').trim();
  const email = String(profile?.email || '').trim();
  const mobile = String(profile?.mobile || profile?.phone || '').trim();
  const whatsapp = String(profile?.whatsapp || '').trim();
  const academicEmail = String(profile?.academicEmail || '').trim();

  // Extra phones/emails from About extras (local until backend aboutExtras ships).
  let extraEmails: string[] = [];
  let extraPhones: string[] = [];
  try {
    const raw = typeof window !== 'undefined' && profile?.id
      ? localStorage.getItem(`wev:about-extras:${profile.id}`)
      : null;
    if (raw) {
      const extras = JSON.parse(raw) as { emails?: Array<{ title?: string }>; phones?: Array<{ title?: string }> };
      extraEmails = (extras.emails || []).map((e) => String(e.title || '').trim()).filter(Boolean);
      extraPhones = (extras.phones || []).map((p) => String(p.title || '').trim()).filter(Boolean);
    }
  } catch {
    /* ignore */
  }

  const genderLabel =
    gender === 'male' ? (isBn ? 'পুরুষ' : 'Male')
      : gender === 'female' ? (isBn ? 'নারী' : 'Female')
        : gender === 'other' ? (isBn ? 'অন্যান্য' : 'Other')
          : gender;

  const hasDetails = !!(work || education || location || hometown || gender || relationship || dob || joined);
  const hasContact = !!(email || mobile || whatsapp || academicEmail || website || extraEmails.length || extraPhones.length);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-3">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          {t('profile.all.personal', { defaultValue: isBn ? 'ব্যক্তিগত তথ্য' : 'Personal information' })}
        </h2>
        {/* Bio already shows in PersonalProfileChrome — avoid duplicate here. */}
        {!intro && isOwner ? (
          <button type="button" onClick={onEdit || (() => onSeeAbout('intro'))} className="text-sm font-medium text-primary hover:underline">
            {t('profile.addBio')}
          </button>
        ) : null}
        {pronouns ? (
          <p className={`${!intro && isOwner ? 'mt-2 ' : ''}flex items-center gap-2 text-sm text-muted-foreground`}>
            <User size={14} className="shrink-0 text-muted-foreground/70" />
            {pronouns}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onSeeAbout('intro')}
          className="mt-3 text-xs font-medium text-primary underline-offset-2 transition-colors hover:underline"
        >
          {t('profile.seeFullAbout')}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {t('profile.all.details', { defaultValue: isBn ? 'বিস্তারিত' : 'Details' })}
          </h2>
          <button type="button" onClick={() => onSeeAbout('personal')} className="shrink-0 text-xs font-medium text-primary hover:underline">
            {isBn ? 'সব দেখুন' : 'See all'}
          </button>
        </div>
        {hasDetails ? (
          <div className="space-y-1.5">
            {work ? (
              <DetailRow icon={Briefcase}>
                <span className="text-muted-foreground">{isBn ? 'কাজ' : 'Work'} · </span>
                {work}
              </DetailRow>
            ) : null}
            {education ? (
              <DetailRow icon={GraduationCap}>
                <span className="text-muted-foreground">{isBn ? 'শিক্ষা' : 'Studied'} · </span>
                {education}
              </DetailRow>
            ) : null}
            {location ? (
              <DetailRow icon={MapPin}>
                <span className="text-muted-foreground">{isBn ? 'বাস করেন' : 'Lives in'} </span>
                {location}
              </DetailRow>
            ) : null}
            {hometown ? (
              <DetailRow icon={Home}>
                <span className="text-muted-foreground">{isBn ? 'নিজের শহর' : 'From'} </span>
                {hometown}
              </DetailRow>
            ) : null}
            {genderLabel ? (
              <DetailRow icon={User}>
                <span className="text-muted-foreground">{isBn ? 'লিঙ্গ' : 'Gender'} · </span>
                {genderLabel}
              </DetailRow>
            ) : null}
            {relationship ? (
              <DetailRow icon={Heart}>
                <span className="text-muted-foreground">{isBn ? 'সম্পর্ক' : 'Relationship'} · </span>
                {relationship}
              </DetailRow>
            ) : null}
            {dob ? (
              <DetailRow icon={Cake}>
                <span className="text-muted-foreground">{isBn ? 'জন্মদিন' : 'Birthday'} · </span>
                {dob}
              </DetailRow>
            ) : null}
            {joined ? (
              <DetailRow icon={Calendar}>
                {t('profile.joined', { date: joined })}
              </DetailRow>
            ) : null}
          </div>
        ) : null}
        {isOwner && (
          <div className={`${hasDetails ? 'mt-2 border-t border-border pt-2' : ''} flex flex-wrap gap-1.5`}>
            {!work && (
              <button type="button" onClick={() => onSeeAbout('work')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted">
                {isBn ? '+ কাজ' : '+ Work'}
              </button>
            )}
            {!location && (
              <button type="button" onClick={() => onSeeAbout('personal')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted">
                {isBn ? '+ স্থান' : '+ Place'}
              </button>
            )}
            {!genderLabel && (
              <button type="button" onClick={() => onSeeAbout('personal')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted">
                {isBn ? '+ লিঙ্গ' : '+ Gender'}
              </button>
            )}
            {!relationship && (
              <button type="button" onClick={() => onSeeAbout('personal')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted">
                {isBn ? '+ সম্পর্ক' : '+ Relationship'}
              </button>
            )}
            {!education && (
              <button type="button" onClick={() => onSeeAbout('education')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted">
                {isBn ? '+ শিক্ষা' : '+ Education'}
              </button>
            )}
            {!hometown && location && (
              <button type="button" onClick={() => onSeeAbout('personal')} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted">
                {isBn ? '+ নিজের শহর' : '+ Hometown'}
              </button>
            )}
          </div>
        )}
        {!isOwner && !hasDetails && (
          <p className="text-xs text-muted-foreground">{isBn ? 'দেখানোর মতো কিছু নেই' : 'Nothing to show yet.'}</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {t('profile.all.contact', { defaultValue: isBn ? 'যোগাযোগ' : 'Contact' })}
          </h2>
          <button type="button" onClick={() => onSeeAbout('contact')} className="shrink-0 text-xs font-medium text-primary hover:underline">
            {isBn ? 'সব দেখুন' : 'See all'}
          </button>
        </div>
        {hasContact ? (
          <div className="space-y-1.5">
            {email ? <DetailRow icon={Mail}>{email}</DetailRow> : null}
            {academicEmail ? <DetailRow icon={Mail}>{academicEmail}</DetailRow> : null}
            {extraEmails.map((addr) => (
              <DetailRow key={`e-${addr}`} icon={Mail}>{addr}</DetailRow>
            ))}
            {mobile ? <DetailRow icon={Phone}>{mobile}</DetailRow> : null}
            {whatsapp ? <DetailRow icon={MessageCircle}>{whatsapp}</DetailRow> : null}
            {extraPhones.map((num) => (
              <DetailRow key={`p-${num}`} icon={Phone}>{num}</DetailRow>
            ))}
            {website ? (
              <DetailRow icon={Globe}>
                <a
                  href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {website}
                </a>
              </DetailRow>
            ) : null}
          </div>
        ) : isOwner ? (
          <button type="button" onClick={() => onSeeAbout('contact')} className="text-sm font-medium text-primary hover:underline">
            {isBn ? 'যোগাযোগ যোগ করুন' : 'Add contact info'}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">{isBn ? 'দেখানোর মতো কিছু নেই' : 'Nothing to show yet.'}</p>
        )}
      </div>
    </>
  );
}
