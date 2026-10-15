// طبقة الاتصال بمصادر البيانات. كل البيانات الدينية تأتي من هذه المصادر ولا تُكتب يدويًا.
// - القرآن: AlQuran Cloud (نص Tanzil العثماني) — https://api.alquran.cloud
// - الحديث: fawazahmed0/hadith-api عبر jsDelivr
// - الأذكار والأدعية: حصن المسلم (rn0x/Adhkar-json)
// - أسماء الله الحسنى: AlAdhan (مع بديل islamic.app)
// - المواقيت والتقويم: AlAdhan
import { idb } from './lib-store.js';
import { normAr } from './lib-util.js';

export const Q = 'https://api.alquran.cloud/v1';
export const A = 'https://api.aladhan.com/v1';
const HADITH_BASES = ['https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1', 'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1'];
const ADHKAR_URLS = ['https://cdn.jsdelivr.net/gh/rn0x/Adhkar-json@main/adhkar.json', 'https://raw.githubusercontent.com/rn0x/Adhkar-json/main/adhkar.json'];
const NAMES_URLS = [`${A}/asmaAlHusna`, 'https://api.islamic.app/v1/asma-al-husna'];

export async function getJSON(url, { timeout = 20000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
async function getFirst(urls, opts) {
  let last;
  for (const u of urls) { try { return await getJSON(u, opts); } catch (e) { last = e; } }
  throw last || new Error('تعذّر الاتصال');
}

/** كاش في الذاكرة + IndexedDB. ttl بالساعات (اختياري). يعيد البيانات القديمة لو فشل الاتصال. */
const mem = new Map();
export const clearMemCache = () => mem.clear();
export async function cached(key, loader, { ttlH = 24 * 30 } = {}) {
  if (mem.has(key)) return mem.get(key);
  const hit = await idb.get(key);
  const fresh = hit && Date.now() - hit.ts < ttlH * 36e5;
  if (fresh) { mem.set(key, hit.v); return hit.v; }
  try {
    const v = await loader();
    mem.set(key, v); idb.set(key, { ts: Date.now(), v });
    return v;
  } catch (e) {
    if (hit) { mem.set(key, hit.v); return hit.v; }
    throw e;
  }
}

/* ===================== القرآن ===================== */
async function q(path) {
  const j = await getJSON(Q + path);
  if (j.code !== 200 || j.data == null) throw new Error('استجابة غير صالحة من خادم القرآن');
  return j.data;
}

export const surahList = () => cached('q:surahs', async () => {
  const d = await q('/surah');
  if (!Array.isArray(d) || d.length !== 114) throw new Error('قائمة السور غير مكتملة');
  return d;
});

export const quranOfflineMeta = async () => (await idb.get('q:full'))?.meta || null;
async function fullQuran() { return (await idb.get('q:full'))?.v || null; }

function checkSequence(ayahs, meta) {
  if (!Array.isArray(ayahs) || !ayahs.length) throw new Error('لا توجد آيات');
  if (meta && ayahs.length !== meta.numberOfAyahs) throw new Error('عدد الآيات لا يطابق بيانات السورة');
  ayahs.forEach((a, i) => {
    if (a.numberInSurah !== i + 1 || typeof a.text !== 'string' || !a.text.trim()) throw new Error('ترقيم الآيات غير سليم');
  });
}

/** يرجع {number,name,ayahs[]} بعد التحقق من سلامة النص وترقيم الآيات. لا يعرض نصًا غير مُتحقق منه. */
export async function getSurah(n) {
  const meta = (await surahList().catch(() => null))?.find((s) => s.number === n) || null;
  const full = await fullQuran();
  if (full) {
    const s = full.surahs.find((x) => x.number === n);
    if (s) { checkSequence(s.ayahs, meta); return s; }
  }
  const d = await cached(`q:s:${n}`, async () => {
    const x = await q(`/surah/${n}/quran-uthmani`);
    checkSequence(x.ayahs, meta);
    return x;
  }, { ttlH: 24 * 365 });
  return d;
}

export async function getPage(p) {
  const full = await fullQuran();
  if (full) {
    const ayahs = [];
    for (const s of full.surahs) for (const a of s.ayahs) if (a.page === p) ayahs.push({ ...a, surah: { number: s.number, name: s.name } });
    if (ayahs.length) return { number: p, ayahs };
  }
  return cached(`q:p:${p}`, async () => {
    const x = await q(`/page/${p}/quran-uthmani`);
    if (!x.ayahs?.length || x.ayahs.some((a) => a.page !== p || !a.surah || typeof a.text !== 'string')) throw new Error('بيانات الصفحة غير سليمة');
    return x;
  }, { ttlH: 24 * 365 });
}

export async function getAyah(ref, edition = 'quran-uthmani') {
  const full = edition === 'quran-uthmani' && (await fullQuran());
  if (full && String(ref).includes(':')) {
    const [s, a] = String(ref).split(':').map(Number);
    const sur = full.surahs.find((x) => x.number === s);
    const ay = sur?.ayahs[a - 1];
    if (ay) return { ...ay, surah: { number: s, name: sur.name } };
  }
  return cached(`q:a:${ref}:${edition}`, () => q(`/ayah/${ref}/${edition}`), { ttlH: 24 * 365 });
}

export async function getSurahEdition(n, edition) {
  return cached(`q:se:${n}:${edition}`, () => q(`/surah/${n}/${edition}`), { ttlH: 24 * 365 });
}
export const getAudioSurah = (n, reciter) => cached(`q:au:${n}:${reciter}`, async () => {
  const d = await q(`/surah/${n}/${reciter}`);
  if (!d.ayahs?.every((a) => typeof a.audio === 'string')) throw new Error('لا توجد ملفات صوتية لهذا القارئ');
  return d;
}, { ttlH: 24 * 30 });

export const editions = (type, language) => cached(`q:ed:${type}:${language || ''}`, async () => {
  const d = await q(`/edition?format=text&type=${type}${language ? `&language=${language}` : ''}`);
  return d.map(({ identifier, language: l, name, englishName }) => ({ identifier, language: l, name, englishName }));
});
export const audioEditions = () => cached('q:ed:audio', async () => {
  const d = await q('/edition?format=audio&language=ar&type=versebyverse');
  return d.map(({ identifier, name, englishName }) => ({ identifier, name, englishName }));
});

/** تنزيل المصحف كاملًا للاستخدام دون اتصال مع التحقق: ١١٤ سورة و٦٢٣٦ آية بترقيم متسلسل. */
export async function downloadFullQuran(onStatus = () => {}) {
  onStatus('جارٍ تنزيل المصحف…');
  const d = await q('/quran/quran-uthmani');
  if (!d.surahs || d.surahs.length !== 114) throw new Error('عدد السور غير صحيح');
  let total = 0;
  d.surahs.forEach((s, i) => {
    if (s.number !== i + 1) throw new Error('ترتيب السور غير صحيح');
    checkSequence(s.ayahs, null);
    total += s.ayahs.length;
  });
  if (total !== 6236) throw new Error('إجمالي الآيات لا يساوي ٦٢٣٦');
  const slim = { surahs: d.surahs.map((s) => ({ number: s.number, name: s.name, englishName: s.englishName, revelationType: s.revelationType, ayahs: s.ayahs })) };
  const ok = await idb.set('q:full', { v: slim, meta: { ts: Date.now(), ayahs: total } });
  if (!ok) throw new Error('تعذّر الحفظ على الجهاز (مساحة التخزين أو الخصوصية)');
  return true;
}
export async function deleteFullQuran() { await idb.del('q:full'); }

/** بحث في القرآن: محليًا لو نُزّل المصحف، وإلا عبر الخادم. */
export async function searchQuran(kw) {
  const nq = normAr(kw);
  if (!nq) return [];
  const full = await fullQuran();
  if (full) {
    const out = [];
    for (const s of full.surahs) for (const a of s.ayahs) if (normAr(a.text).includes(nq)) out.push({ surah: s.number, surahName: s.name, ayah: a.numberInSurah, text: a.text });
    return out;
  }
  let d;
  for (const ed of ['quran-simple-clean', 'quran-simple']) {
    try { d = await q(`/search/${encodeURIComponent(nq)}/all/${ed}`); break; } catch { /* جرّب الخيار التالي */ }
  }
  if (!d) throw new Error('تعذّر البحث. تحقق من الاتصال أو نزّل المصحف للبحث دون إنترنت.');
  return (d.matches || []).map((m) => ({ surah: m.surah.number, surahName: m.surah.name, ayah: m.numberInSurah, text: m.text }));
}

/* ===================== الحديث ===================== */
export const HADITH_BOOKS = [
  { id: 'nawawi', ar: 'الأربعون النووية', small: true },
  { id: 'qudsi', ar: 'الأحاديث القدسية (أربعون)', small: true },
  { id: 'bukhari', ar: 'صحيح البخاري', mb: 6 },
  { id: 'muslim', ar: 'صحيح مسلم', mb: 6 },
  { id: 'abudawud', ar: 'سنن أبي داود', mb: 5 },
  { id: 'tirmidhi', ar: 'جامع الترمذي', mb: 4 },
  { id: 'nasai', ar: 'سنن النسائي', mb: 5 },
  { id: 'ibnmajah', ar: 'سنن ابن ماجه', mb: 4 },
  { id: 'malik', ar: 'موطأ مالك', mb: 2 }
];

async function fetchEdition(name) {
  let last;
  for (const base of HADITH_BASES) {
    for (const ext of ['.min.json', '.json']) {
      try {
        const j = await getJSON(`${base}/editions/${name}${ext}`, { timeout: 90000 });
        if (!Array.isArray(j.hadiths) || !j.hadiths.length) throw new Error('كتاب فارغ');
        return j;
      } catch (e) { last = e; }
    }
  }
  throw last || new Error('تعذّر تنزيل الكتاب');
}
export async function hadithBookLocal(book) { return (await idb.get(`h:${book}`))?.v || null; }
export async function loadHadithBook(book) {
  const key = `h:${book}`;
  const hit = await idb.get(key);
  if (hit?.v) return hit.v;
  const j = await fetchEdition(`ara-${book}`);
  const slim = { metadata: j.metadata, hadiths: j.hadiths.filter((x) => x && typeof x.text === 'string' && x.text.trim()) };
  await idb.set(key, { ts: Date.now(), v: slim });
  return slim;
}
export async function deleteHadithBook(book) { await idb.del(`h:${book}`); }
/** حديث واحد بدون تنزيل الكتاب كاملًا. */
export async function fetchHadith(book, n) {
  const hit = await hadithBookLocal(book);
  if (hit) { const x = hit.hadiths.find((y) => y.hadithnumber === n); if (x) return { metadata: hit.metadata, hadith: x }; }
  const j = await cached(`h1:${book}:${n}`, () => getFirst(HADITH_BASES.map((b) => `${b}/editions/ara-${book}/${n}.min.json`).concat(HADITH_BASES.map((b) => `${b}/editions/ara-${book}/${n}.json`))), { ttlH: 24 * 365 });
  const x = j.hadiths?.[0];
  if (!x || typeof x.text !== 'string') throw new Error('الحديث غير متوفر في المصدر');
  return { metadata: j.metadata, hadith: x };
}

/* ===== ترجمة مصطلحات الدرجات من بيانات المصدر (لا تُنشأ درجات جديدة) ===== */
const GRADERS = {
  'Al-Albani': 'الألباني', 'Muhammad Muhyi Al-Din Abdul Hamid': 'محمد محيي الدين عبد الحميد',
  'Shuaib Al Arnaut': 'شعيب الأرناؤوط', 'Zubair Ali Zai': 'زبير علي زئي', 'Bashar Awad Maarouf': 'بشار عواد معروف',
  'Ahmad Muhammad Shakir': 'أحمد شاكر', 'Salim al-Hilali': 'سليم الهلالي', 'Abu Ghuddah': 'أبو غدة',
  'Muhammad Fouad Abd al-Baqi': 'محمد فؤاد عبد الباقي'
};
const GRADES = {
  'Sahih': 'صحيح', 'Hasan': 'حسن', 'Daif': 'ضعيف', 'Very Daif': 'ضعيف جدًا', 'Hasan Sahih': 'حسن صحيح',
  'Sahih Lighairihi': 'صحيح لغيره', 'Hasan Lighairihi': 'حسن لغيره', 'Isnaad Sahih': 'إسناده صحيح', 'Isnaad Hasan': 'إسناده حسن',
  'Isnaad Daif': 'إسناده ضعيف', 'Shadh': 'شاذ', 'Munkar': 'منكر', 'Mursal': 'مرسل', 'Maudu': 'موضوع', 'Mawdu': 'موضوع',
  'Sahih Muquf': 'صحيح موقوف', 'Sahih Maqtu': 'صحيح مقطوع', 'Hasan Muquf': 'حسن موقوف', 'Daif Muquf': 'ضعيف موقوف'
};
export function gradeLabel(g) {
  if (GRADES[g.grade]) return { by: GRADERS[g.name] || g.name, grade: GRADES[g.grade] };
  const t = String(g.grade).replace(/Sahih Bukhari/g, 'صحيح البخاري').replace(/Sahih Muslim/g, 'صحيح مسلم');
  return { by: GRADERS[g.name] || g.name, grade: t };
}
export function sectionName(meta, n) { return meta?.section?.[n] || ''; }

/* ===================== الأذكار والأدعية (حصن المسلم) ===================== */
export const adhkarData = () => cached('adhkar', async () => {
  const j = await getFirst(ADHKAR_URLS);
  if (!Array.isArray(j) || !j.length) throw new Error('بيانات الأذكار غير صالحة');
  return j
    .filter((c) => c && c.category && Array.isArray(c.array))
    .map((c) => ({
      id: c.id, category: String(c.category).trim(),
      items: c.array.filter((x) => x && typeof x.text === 'string' && x.text.trim())
        .map((x) => ({ id: x.id, text: x.text.trim(), count: Math.max(1, parseInt(x.count, 10) || 1) }))
    }))
    .filter((c) => c.items.length);
});

/* ===================== أسماء الله الحسنى ===================== */
export const namesData = () => cached('names', async () => {
  const j = await getFirst(NAMES_URLS);
  const arr = j.data;
  if (!Array.isArray(arr) || arr.length !== 99) throw new Error('بيانات الأسماء غير مكتملة');
  return arr.map((x, i) => ({
    number: x.number || i + 1, name: x.name, transliteration: x.transliteration,
    en: x.en?.meaning || (typeof x.en === 'string' ? x.en : '')
  }));
});
/** نقطة ربط اختيارية: ضع data/names-ar.json بصيغة [{number, meaning}] لعرض معانٍ عربية من مصدر تثق به. */
export async function namesArabicMeanings() {
  try { const r = await fetch('names-ar.json'); if (!r.ok) return null; const j = await r.json(); return Array.isArray(j) ? j : null; } catch { return null; }
}

/* ===================== المواقيت والتقويم (AlAdhan) ===================== */
async function a(path) {
  const j = await getJSON(A + path);
  if (j.code !== 200 || j.data == null) throw new Error(j.data || 'استجابة غير صالحة من خادم المواقيت');
  return j.data;
}
function locQuery(place) {
  return place.lat != null && place.lng != null
    ? { coords: true, qs: `latitude=${place.lat}&longitude=${place.lng}` }
    : { coords: false, qs: `city=${encodeURIComponent(place.city)}&country=${encodeURIComponent(place.country)}` };
}
export async function getTimings(place, dmyStr, method, school) {
  const { coords, qs } = locQuery(place);
  const d = await a(`/${coords ? 'timings' : 'timingsByCity'}/${dmyStr}?${qs}&method=${method}&school=${school}`);
  return validateDay(d);
}
export async function getMonthTimings(place, year, month, method, school) {
  const { coords, qs } = locQuery(place);
  const path = coords
    ? `/calendar?${qs}&method=${method}&school=${school}&month=${month}&year=${year}`
    : `/calendarByCity/${year}/${month}?${qs}&method=${method}&school=${school}`;
  const d = await a(path);
  if (!Array.isArray(d) || !d.length) throw new Error('لا توجد بيانات للشهر');
  return d.map(validateDay);
}
export async function getHijriMonthTimings(place, hYear, hMonth, method, school) {
  const { coords, qs } = locQuery(place);
  const path = coords
    ? `/hijriCalendar/${hYear}/${hMonth}?${qs}&method=${method}&school=${school}`
    : `/hijriCalendarByCity/${hYear}/${hMonth}?${qs}&method=${method}&school=${school}`;
  const d = await a(path);
  if (!Array.isArray(d) || !d.length) throw new Error('لا توجد بيانات للشهر الهجري');
  return d.map(validateDay);
}
function validateDay(d) {
  const t = d?.timings;
  if (!t || !['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].every((k) => /\d{1,2}:\d{2}/.test(String(t[k])))) throw new Error('مواقيت غير صالحة من المصدر');
  return d;
}
export const prayerMethods = () => cached('a:methods', async () => {
  const d = await a('/methods');
  return Object.values(d).filter((m) => m && typeof m.id === 'number').map((m) => ({ id: m.id, name: m.name }));
});
/** "04:35 (EET)" -> ثواني من منتصف الليل */
export function hmToSec(s) {
  const m = String(s).match(/(\d{1,2}):(\d{2})/);
  return m ? +m[1] * 3600 + +m[2] * 60 : NaN;
}
/** إحداثيات مدينة من AlAdhan (تُستخدم للقبلة). */
export async function resolveCity(city, country) {
  const d = await getTimings({ city, country }, dmyToday(), 5, 0);
  return { lat: d.meta.latitude, lng: d.meta.longitude, tz: d.meta.timezone };
}
function dmyToday() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; }
