// منطق مواقيت الصلاة المشترك (الصفحة الرئيسية، الصلاة، رمضان).
import { settings, setSetting } from './lib-settings.js';
import { cached, getTimings, hmToSec } from './lib-api.js';
import { dmy, toAr, pad2 } from './lib-util.js';

export const PRAYER_LIST = [['Fajr', 'الفجر'], ['Sunrise', 'الشروق'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']];
const FIVE = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const placeKey = (p) => (p.lat != null ? `${(+p.lat).toFixed(2)},${(+p.lng).toFixed(2)}` : `${p.city}|${p.country}`.toLowerCase());
export const placeLabel = (p) => p?.label || (p?.city ? `${p.city}، ${p.country}` : 'موقعك الحالي');

export function fmt12(sec) {
  const s = ((sec % 86400) + 86400) % 86400;
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
  return `${toAr(hh % 12 || 12)}:${toAr(pad2(mm))} ${hh < 12 ? 'ص' : 'م'}`;
}
export function fmtDur(sec) {
  const s = Math.max(0, Math.floor(sec));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => toAr(pad2(v))).join(':');
}
export function nowSecInTz(tz) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => +parts.find((x) => x.type === t).value;
  return g('hour') * 3600 + g('minute') * 60 + g('second');
}
export function secsOf(timings) {
  const o = {};
  [...PRAYER_LIST.map((x) => x[0]), 'Imsak'].forEach((k) => { if (timings[k]) o[k] = hmToSec(timings[k]); });
  return o;
}
/** الصلاة القادمة (من الخمس) والوقت المتبقي، بتوقيت مكان المستخدم المحدد. */
export function nextPrayer(secs, tz) {
  const now = nowSecInTz(tz);
  for (const k of FIVE) if (secs[k] > now) return { key: k, name: PRAYER_LIST.find((x) => x[0] === k)[1], diff: secs[k] - now };
  return { key: 'Fajr', name: 'الفجر', diff: secs.Fajr + 86400 - now };
}

/** مواقيت اليوم (مع كاش للعمل دون إنترنت عند توفر نسخة اليوم). */
export async function todayFor(place) {
  const d = new Date();
  const key = `t:${placeKey(place)}:${dmy(d)}:${settings.method}:${settings.school}`;
  const data = await cached(key, () => getTimings(place, dmy(d), settings.method, settings.school), { ttlH: 48 });
  return { data, secs: secsOf(data.timings), tz: data.meta.timezone };
}

/** طلب الموقع — لا يُستدعى إلا بعد ضغط المستخدم على زر صريح. */
export function askLocation() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('المتصفح لا يدعم تحديد الموقع'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => rej(new Error(e.code === 1 ? 'لم تسمح بالوصول إلى الموقع. يمكنك كتابة المدينة يدويًا.' : 'تعذّر تحديد الموقع')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
}
export const savePlace = (p) => setSetting('place', p);

export const METHOD_AR = { 1: 'جامعة العلوم الإسلامية بكراتشي', 2: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', 3: 'رابطة العالم الإسلامي', 4: 'جامعة أم القرى بمكة المكرمة', 5: 'الهيئة المصرية العامة للمساحة' };
