/**
 * Compact audience-targeting control (FB Graph `targeting` / `feed_targeting`).
 * Button shows a summary chip ("18-35 · BD · Bangla"); click opens a small popover editor.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Plus, X } from 'lucide-react';
import {
  AGE_MAX, AGE_MIN, cleanTargeting, COUNTRIES, countryName, LANGUAGES, languageName, NO_TARGETING, targetingSummary,
  type PostTargeting, type TargetingValue,
} from '../../lib/postTargeting';

const sel = 'h-8 rounded-[9px] border border-[#dfe5ee] bg-white px-2 text-[12px] text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
const chip = 'inline-flex h-6 items-center gap-1 rounded-full bg-[#eef3ff] px-2 text-[11px] font-medium text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200';
const lbl = 'mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300';

export default function TargetingButton({ value, onChange, disabled, align = 'right', size = 'sm', className = '', placeholder = 'Targeting' }: {
  value: TargetingValue; onChange: (v: TargetingValue) => void; disabled?: boolean; align?: 'left' | 'right'; size?: 'sm' | 'md'; className?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const summary = targetingSummary(value);
  const h = size === 'sm' ? 'h-8 text-[10.5px]' : 'h-9 text-[12px]';
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" disabled={disabled} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title={summary ? `${value.mode === 'feed' ? 'Feed preference' : 'Restricted to'}: ${summary}` : 'Audience targeting (optional)'}
        className={`flex w-full min-w-0 items-center gap-1.5 rounded-[9px] border px-2 font-medium disabled:cursor-not-allowed disabled:opacity-60 ${h} ${summary ? 'border-[#9dbcf5] bg-[#f4f8ff] text-[#1d4ed8] dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200' : 'border-[#dfe5ee] bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'}`}>
        <Crosshair className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{summary ? `${value.mode === 'feed' ? '★ ' : ''}${summary}` : placeholder}</span>
      </button>
      {open && (
        <div onClick={(e) => e.stopPropagation()} className={`absolute top-full z-50 mt-1.5 w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-800 shadow-xl dark:border-white/10 dark:bg-[#151823] dark:text-slate-100 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="mb-2 flex items-center text-[13px] font-bold">Audience targeting<button type="button" aria-label="Close" onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
          <TargetingFields value={value} onChange={onChange} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/** Age, location, gender and language fields shared by the button popover and the batch Audience tab. */
export function TargetingFields({ value, onChange, onDone }: { value: TargetingValue; onChange: (v: TargetingValue) => void; onDone?: () => void }) {
  const t: PostTargeting = value.t ?? {};
  const set = (patch: Partial<PostTargeting>) => onChange({ ...value, t: cleanTargeting({ ...t, ...patch }) });
  const countries = t.geo_locations?.countries ?? [];
  const cities = t.geo_locations?.cities ?? [];
  const setGeo = (c: string[], ci: { name: string }[]) => set({ geo_locations: { countries: c, cities: ci } });
  const [cq, setCq] = useState('');
  const [city, setCity] = useState('');
  const matches = useMemo(() => {
    const q = cq.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => !countries.includes(c.code) && (c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)).slice(0, 6) : [];
  }, [cq, countries]);
  const addCity = () => { const n = city.trim(); if (n && !cities.some((c) => c.name.toLowerCase() === n.toLowerCase())) setGeo(countries, [...cities, { name: n }]); setCity(''); };
  const gender = t.genders?.length === 1 ? t.genders[0] : 0;
  const ages = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

  return (
    <div>
      <div className="mb-1 flex overflow-hidden rounded-[9px] border border-[#dfe5ee] dark:border-white/10">
        {(['restrict', 'feed'] as const).map((m) => (
          <button key={m} type="button" onClick={() => onChange({ ...value, mode: m })} className={`h-8 flex-1 text-[11.5px] font-medium ${value.mode === m ? 'bg-[#dfeaff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>{m === 'restrict' ? 'Restrict who sees it' : 'Feed preference'}</button>
        ))}
      </div>
      <p className="mb-2.5 text-[10.5px] leading-snug text-slate-500">{value.mode === 'restrict' ? 'Only matching people can see the post. Everyone else, and logged-out visitors, get "not available". Your team always sees it.' : 'Everyone can still see the post; matching people see it higher in their feed.'}</p>

      <span className={lbl}>Age</span>
      <div className="mb-2.5 flex items-center gap-2">
        <select aria-label="Minimum age" value={t.age_min ?? AGE_MIN} onChange={(e) => { const v = Number(e.target.value); set({ age_min: v, age_max: t.age_max && t.age_max < v ? v : t.age_max }); }} className={`${sel} flex-1`}>{ages.slice(0, -1).map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <span className="text-slate-400">–</span>
        <select aria-label="Maximum age" value={t.age_max ?? AGE_MAX} onChange={(e) => { const v = Number(e.target.value); set({ age_max: v, age_min: t.age_min && t.age_min > v ? v : t.age_min }); }} className={`${sel} flex-1`}>{ages.slice(1).map((a) => <option key={a} value={a}>{a === AGE_MAX ? '65+' : a}</option>)}</select>
      </div>

      <span className={lbl}>Locations</span>
      <div className="relative mb-1.5">
        <input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Add a country…" className={`${sel} w-full`} />
        {matches.length > 0 && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#1b1f2b]">
            {matches.map((c) => <button key={c.code} type="button" onClick={() => { setGeo([...countries, c.code], cities); setCq(''); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5"><span className="w-6 text-[10.5px] font-bold text-slate-400">{c.code}</span>{c.name}</button>)}
          </div>
        )}
      </div>
      <div className="mb-1.5 flex gap-1.5">
        <input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } }} placeholder="City or region (e.g. Dhaka)" className={`${sel} min-w-0 flex-1`} />
        <button type="button" onClick={addCity} aria-label="Add city" className={`${sel} grid w-8 place-items-center px-0`}><Plus className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1">
        {countries.map((c) => <span key={c} className={chip} title={countryName(c)}>{countryName(c)}<button type="button" aria-label={`Remove ${c}`} onClick={() => setGeo(countries.filter((x) => x !== c), cities)}><X className="h-3 w-3" /></button></span>)}
        {cities.map((c) => <span key={c.name} className={chip}>{c.name}<button type="button" aria-label={`Remove ${c.name}`} onClick={() => setGeo(countries, cities.filter((x) => x.name !== c.name))}><X className="h-3 w-3" /></button></span>)}
        {!countries.length && !cities.length && <span className="text-[10.5px] text-slate-400">Anywhere</span>}
      </div>

      <span className={lbl}>Gender</span>
      <div className="mb-2.5 flex overflow-hidden rounded-[9px] border border-[#dfe5ee] dark:border-white/10">
        {[[0, 'All'], [1, 'Men'], [2, 'Women']].map(([g, l]) => <button key={g} type="button" onClick={() => set({ genders: g ? [g as number] : [] })} className={`h-8 flex-1 text-[11.5px] font-medium ${gender === g ? 'bg-[#dfeaff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200' : 'text-slate-600 dark:text-slate-300'}`}>{l}</button>)}
      </div>

      <span className={lbl}>Languages</span>
      <div className="mb-3 flex flex-wrap gap-1">
        {LANGUAGES.slice(0, 8).map((l) => { const on = t.locales?.includes(l.code); return <button key={l.code} type="button" onClick={() => set({ locales: on ? t.locales!.filter((x) => x !== l.code) : [...(t.locales ?? []), l.code] })} className={on ? chip : 'inline-flex h-6 items-center rounded-full border border-[#dfe5ee] px-2 text-[11px] text-slate-600 dark:border-white/10 dark:text-slate-300'}>{l.name}</button>; })}
        <select aria-label="More languages" value="" onChange={(e) => e.target.value && set({ locales: [...new Set([...(t.locales ?? []), e.target.value])] })} className="h-6 rounded-full border border-[#dfe5ee] bg-white px-1.5 text-[11px] text-slate-600 dark:border-white/10 dark:bg-transparent">
          <option value="">More…</option>{LANGUAGES.slice(8).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        {(t.locales ?? []).filter((c) => !LANGUAGES.slice(0, 8).some((l) => l.code === c)).map((c) => <span key={c} className={chip}>{languageName(c)}<button type="button" aria-label={`Remove ${c}`} onClick={() => set({ locales: t.locales!.filter((x) => x !== c) })}><X className="h-3 w-3" /></button></span>)}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 dark:border-white/[0.06]">
        <span className="text-[10.5px] text-slate-500">People missing a restricted field (e.g. no birthday) won't match.</span>
        <button type="button" onClick={() => onChange(NO_TARGETING)} className="ml-auto h-7 rounded-lg px-2 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">Clear</button>
        {onDone && <button type="button" onClick={onDone} className="h-7 rounded-lg bg-[#1d63ed] px-3 text-[11.5px] font-semibold text-white hover:bg-blue-700">Done</button>}
      </div>
    </div>
  );
}
