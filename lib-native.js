// جسر التطبيق الأصلي (أندرويد): التذكيرات وألوان الشريط. يعمل فقط داخل التطبيق.
import { settings, setSetting } from './lib-settings.js';
import { getMonthTimings, getAyah, cached } from './lib-api.js';
import { placeKey } from './lib-prayer.js';
import { daySeed, dayKey, pad2 } from './lib-util.js';

export const hasNative = () => typeof window.NoorNative !== 'undefined' && !!window.NoorNative;
export const REM_DEFAULTS = { on: false, prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }, salMin: 5, salFrom: 6, salTo: 23, speak: true, adhkar: true, morningAt: '05:30', eveningAt: '17:30', quran: false, quranAt: '21:00', ayah: true, ayahAt: '08:00' };
export const getRem = () => ({ ...REM_DEFAULTS, ...(settings.rem || {}), prayers: { ...REM_DEFAULTS.prayers, ...((settings.rem || {}).prayers || {}) } });
export const setRem = (patch) => { setSetting('rem', { ...getRem(), ...patch }); syncNative(); };
export const nativeStatus = () => { try { return JSON.parse(window.NoorNative.status()); } catch { return { notif: false, exact: false }; } };
export const askPerms = () => { try { window.NoorNative.requestPerms(); } catch { /* ignore */ } };

const PN = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
function tzOff(ts, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ts));
  const g = (t) => +p.find((x) => x.type === t).value;
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(ts / 1000) * 1000;
}
function tzEpoch(y, m, d, hh, mm, tz) { const g = Date.UTC(y, m - 1, d, hh, mm); return g - tzOff(g - tzOff(g, tz), tz); }
const hm = (s) => { const m = String(s).match(/(\d{1,2}):(\d{2})/); return m ? [+m[1], +m[2]] : null; };
const local = (y, m, d, s) => { const x = hm(s) || [0, 0]; return new Date(y, m - 1, d, x[0], x[1]).getTime(); };

let busy = false;
export async function syncNative() {
  if (!hasNative() || busy) return;
  busy = true;
  try {
    const r = getRem();
    if (!r.on) { window.NoorNative.sync(JSON.stringify({ on: false })); return; }
    const ev = [], ayahs = {};
    const now = Date.now();
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
    const place = settings.place, tz = place?.tz || 'Africa/Cairo';
    const months = {};
    for (const d of days) {
      const y = d.getFullYear(), m = d.getMonth() + 1, key = `${y}-${m}`;
      if (!months[key]) { try { months[key] = await cached(`m:${placeKey(place)}:${key}:${settings.method}:${settings.school}`, () => getMonthTimings(place, y, m, settings.method, settings.school), { ttlH: 24 * 10 }); } catch { months[key] = []; } }
      const y2 = d.getFullYear(), m2 = d.getMonth() + 1, dd = d.getDate();
      const t = months[key]?.[dd - 1]?.timings;
      if (t) for (const k of Object.keys(PN)) if (r.prayers[k] && hm(t[k])) { const [h, mi] = hm(t[k]); ev.push({ t: tzEpoch(y2, m2, dd, h, mi, tz), k: 'prayer', ti: `حان الآن وقت صلاة ${PN[k]}`, b: 'حيّ على الصلاة، حيّ على الفلاح', r: '#/prayer' }); }
      if (r.adhkar) {
        ev.push({ t: local(y2, m2, dd, r.morningAt), k: 'adhkar', ti: 'أذكار الصباح', b: 'ابدأ يومك بذكر الله', r: '#/azkar' });
        ev.push({ t: local(y2, m2, dd, r.eveningAt), k: 'adhkar', ti: 'أذكار المساء', b: 'اختم يومك بذكر الله', r: '#/azkar' });
      }
      if (r.quran) ev.push({ t: local(y2, m2, dd, r.quranAt), k: 'quran', ti: 'وردك من القرآن', b: 'اقرأ ولو صفحة اليوم', r: '#/quran' });
      if (r.ayah) {
        const n = ((daySeed(d) * 7919) % 6236) + 1;
        try {
          const a = await getAyah(n);
          const txt = `${a.text}\n(${a.surah.name} - ${a.numberInSurah})`;
          ayahs[dayKey(d)] = txt;
          ev.push({ t: local(y2, m2, dd, r.ayahAt), k: 'ayah', ti: 'آية اليوم', b: txt, r: '#/' });
        } catch { /* offline: skip */ }
      }
    }
    window.NoorNative.sync(JSON.stringify({ on: true, salMin: r.salMin, salFrom: r.salFrom, salTo: r.salTo, speak: r.speak, events: ev.filter((e) => e.t > now), ayahs }));
  } catch (e) { console.warn('sync', e); } finally { busy = false; }
}
void pad2;
