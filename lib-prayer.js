// منطق مواقيت الصلاة المشترك (الصفحة الرئيسية، الصلاة، رمضان).
import { settings, setSetting } from './lib-settings.js';
import { cached, getTimings, hmToSec } from './lib-api.js';
import { dmy, toAr, pad2, h } from './lib-util.js';

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

/** مدن مصر المتاحة في قائمة الاختيار (القاهرة هي الافتراضية). */
export const CITIES = [
  { n: 'القاهرة', lat: 30.0444, lng: 31.2357 },
  { n: 'الإسكندرية', lat: 31.2001, lng: 29.9187 },
  { n: 'الجيزة', lat: 30.0131, lng: 31.2089 },
  { n: 'الزقازيق', lat: 30.5877, lng: 31.502 },
  { n: 'فاقوس', lat: 30.7283, lng: 31.7961 },
  { n: 'بنها', lat: 30.466, lng: 31.1848 },
  { n: 'المنصورة', lat: 31.0409, lng: 31.3785 },
  { n: 'طنطا', lat: 30.7865, lng: 31.0004 },
  { n: 'دمنهور', lat: 31.0341, lng: 30.4682 },
  { n: 'كفر الشيخ', lat: 31.1107, lng: 30.9388 },
  { n: 'شبين الكوم', lat: 30.553, lng: 31.01 },
  { n: 'دمياط', lat: 31.4165, lng: 31.8133 },
  { n: 'بورسعيد', lat: 31.2653, lng: 32.3019 },
  { n: 'الإسماعيلية', lat: 30.5965, lng: 32.2715 },
  { n: 'السويس', lat: 29.9668, lng: 32.5498 },
  { n: 'العريش', lat: 31.1316, lng: 33.7984 },
  { n: 'مرسى مطروح', lat: 31.3543, lng: 27.2373 },
  { n: 'الفيوم', lat: 29.3084, lng: 30.8428 },
  { n: 'بني سويف', lat: 29.0661, lng: 31.0994 },
  { n: 'المنيا', lat: 28.1099, lng: 30.7503 },
  { n: 'أسيوط', lat: 27.1783, lng: 31.1859 },
  { n: 'سوهاج', lat: 26.5591, lng: 31.6948 },
  { n: 'قنا', lat: 26.1551, lng: 32.716 },
  { n: 'الأقصر', lat: 25.6872, lng: 32.6396 },
  { n: 'أسوان', lat: 24.0889, lng: 32.8998 },
  { n: 'الغردقة', lat: 27.2579, lng: 33.8116 },
  { n: 'شرم الشيخ', lat: 27.9158, lng: 34.33 }
];
export const DEFAULT_PLACE = { lat: 30.0444, lng: 31.2357, label: 'القاهرة، مصر', tz: 'Africa/Cairo' };
export function citySelect(onChange) {
  const cur = settings.place;
  const match = CITIES.find((x) => cur && cur.lat != null && Math.abs(cur.lat - x.lat) < 0.001 && Math.abs(cur.lng - x.lng) < 0.001);
  const sel = h('select', { 'aria-label': 'المدينة', onchange: () => {
    const x = CITIES.find((y) => y.n === sel.value);
    if (!x) return;
    savePlace({ lat: x.lat, lng: x.lng, label: `${x.n}، مصر`, tz: 'Africa/Cairo' });
    onChange?.();
  } });
  if (!match) sel.append(h('option', { value: '', selected: true }, cur ? placeLabel(cur) : 'اختر مدينتك'));
  CITIES.forEach((x) => sel.append(h('option', { value: x.n, selected: match === x }, x.n)));
  return sel;
}
