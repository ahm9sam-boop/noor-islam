import { h, toAr, gregLabel, hijriLabel, daySeed, toast } from './lib-util.js';
import { icon } from './lib-icons.js';
import { settings } from './lib-settings.js';
import { ls } from './lib-store.js';
import { favs } from './lib-favorites.js';
import { actions, loading, errorBox, notice } from './lib-ui.js';
import { getAyah, adhkarData } from './lib-api.js';
import { PRAYER_LIST, fmt12, fmtDur, nextPrayer, todayFor, askLocation, savePlace, placeLabel } from './lib-prayer.js';
import { dailyHadith, hadithCard } from './page-hadith.js';
import { QURAN_DUAS } from './page-duas.js';
import { dhikrCard } from './page-azkar.js';

// مراجع آيات عن الطمأنينة؛ النص يُجلب من مصدر القرآن (لا يُكتب هنا).
const CALM_REFS = ['13:28', '94:6', '65:3', '2:152', '2:186', '3:139', '9:40', '48:4', '20:46', '16:128'];

const QUICK = [['quran', 'القرآن الكريم', 'quran'], ['azkar', 'الأذكار', 'azkar'], ['tasbeeh', 'المسبحة', 'tasbeeh'], ['duas', 'الأدعية', 'dua'],
  ['hadith', 'الأحاديث', 'hadith'], ['prayer', 'مواقيت الصلاة', 'prayer'], ['qibla', 'اتجاه القبلة', 'qibla'], ['names', 'أسماء الله الحسنى', 'names']];

function slot(title, body) { return h('section', { class: 'card' }, h('h3', null, title), body || loading()); }
const ayahNode = (a, label) => {
  const where = `${a.surah.name} — الآية ${toAr(a.numberInSurah)}`;
  return h('div', null, h('p', { class: 'verse' }, a.text), h('p', { class: 'source' }, `${label ? label + ' · ' : ''}${where}`),
    h('div', { class: 'row between' }, h('a', { href: `#/quran/s/${a.surah.number}/a/${a.numberInSurah}` }, 'افتح في المصحف'),
      actions({ text: `${a.text}\n\n(${where})`, fav: { key: `ayah:${a.surah.number}:${a.numberInSurah}`, type: 'ayah', title: where, text: a.text, source: 'القرآن الكريم', href: `#/quran/s/${a.surah.number}/a/${a.numberInSurah}` } })));
};

export function render({ go }) {
  const root = h('div');
  let timer = null;
  const seed = daySeed();

  /* التحية والتاريخ */
  const calm = h('p', { class: 'dua-text', style: undefined, 'aria-live': 'polite' });
  const hero = h('div', { class: 'hero' }, h('h1', null, 'السلام عليكم ورحمة الله وبركاته'),
    h('div', { class: 'dates' }, h('span', null, hijriLabel()), h('span', null, gregLabel())), calm);
  root.append(hero);
  getAyah(CALM_REFS[seed % CALM_REFS.length]).then((a) => { calm.textContent = a.text; calm.after(h('small', { class: 'source', style: undefined }, `رسالة اليوم — ${a.surah.name} (${toAr(a.numberInSurah)})`)); }).catch(() => calm.remove());

  /* بحث شامل */
  const si = h('input', { type: 'search', placeholder: 'ابحث في القرآن والأحاديث والأذكار والأسماء…', 'aria-label': 'بحث شامل' });
  root.append(h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (si.value.trim()) go(`/search?q=${encodeURIComponent(si.value.trim())}`); } }, si, h('button', { class: 'btn primary', type: 'submit' }, icon('search', 18), 'بحث')));

  /* وصول سريع */
  root.append(h('div', { class: 'grid' }, ...QUICK.map(([k, t, i]) => h('a', { class: 'quick', href: `#/${k}` }, icon(i, 30), t))));

  /* متابعة القراءة */
  const lr = ls.get('lastRead', null);
  if (lr && settings.saveReading) root.append(h('a', { class: 'card', href: `#/quran/s/${lr.surah}/a/${lr.ayah}`, style: undefined }, h('h3', null, 'تابع القراءة'), h('p', null, `سورة ${lr.name || lr.surah} — الآية ${toAr(lr.ayah)}`)));

  /* مواقيت الصلاة */
  const prayerBody = h('div');
  const prayerCard = h('section', { class: 'card' }, h('h3', null, 'مواقيت الصلاة'), prayerBody);
  root.append(prayerCard);
  const askForPlace = () => {
    const city = h('input', { type: 'text', placeholder: 'المدينة (بالإنجليزية)', 'aria-label': 'المدينة' });
    const country = h('input', { type: 'text', placeholder: 'الدولة (بالإنجليزية)', 'aria-label': 'الدولة' });
    prayerBody.replaceChildren(h('p', { class: 'muted' }, 'اختر مدينتك لعرض المواقيت الحقيقية. لا نطلب موقعك إلا بإذنك.'),
      h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (!city.value.trim() || !country.value.trim()) return toast('اكتب المدينة والدولة'); savePlace({ city: city.value.trim(), country: country.value.trim(), label: `${city.value.trim()}، ${country.value.trim()}` }); loadPrayer(); } },
        city, country, h('button', { class: 'btn primary', type: 'submit' }, 'عرض'),
        h('button', { class: 'btn', type: 'button', onclick: async () => { try { const c = await askLocation(); savePlace({ lat: c.lat, lng: c.lng, label: 'موقعي الحالي' }); loadPrayer(); } catch (e) { toast(e.message); } } }, 'استخدم موقعي')));
  };
  async function loadPrayer() {
    clearInterval(timer);
    if (!settings.place) return askForPlace();
    prayerBody.replaceChildren(loading());
    try {
      const { secs, tz } = await todayFor(settings.place);
      const grid = h('div', { class: 'prayer-grid' }); const cells = PRAYER_LIST.map(([k, n]) => { const c = h('div', { class: 'prayer-cell', dataset: { k } }, h('span', null, n), h('b', null, fmt12(secs[k]))); grid.append(c); return c; });
      const cd = h('div', { class: 'countdown' }), lbl = h('div', { class: 'muted' });
      prayerBody.replaceChildren(h('div', { class: 'row between' }, h('div', null, lbl, cd), h('a', { class: 'btn', href: '#/prayer' }, 'التفاصيل')), grid, h('p', { class: 'source' }, `${placeLabel(settings.place)} · الحساب بواسطة AlAdhan`));
      const tick = () => { const nx = nextPrayer(secs, tz); cd.textContent = fmtDur(nx.diff); lbl.textContent = `الصلاة القادمة: ${nx.name}`; cells.forEach((c) => c.classList.toggle('next', c.dataset.k === nx.key)); };
      tick(); timer = setInterval(tick, 1000);
    } catch { prayerBody.replaceChildren(errorBox('تعذّر جلب المواقيت (تحقق من الاتصال أو اسم المدينة).', loadPrayer), h('button', { class: 'btn', type: 'button', onclick: askForPlace }, 'تغيير المدينة')); }
  }
  loadPrayer();

  /* آية اليوم */
  const ayahBody = h('div', null, loading());
  root.append(slot('آية اليوم', ayahBody));
  getAyah(((seed * 7919) % 6236) + 1).then((a) => ayahBody.replaceChildren(ayahNode(a, 'اختيار ثابت لليوم'))).catch(() => ayahBody.replaceChildren(errorBox('تعذّر تحميل الآية (يحتاج إنترنت).')));

  /* حديث اليوم */
  const hadBody = h('div', null, loading());
  root.append(slot('حديث اليوم', hadBody));
  dailyHadith().then(({ x, meta, book }) => hadBody.replaceChildren(hadithCard(x, book, meta))).catch(() => hadBody.replaceChildren(errorBox('تعذّر تحميل الحديث من المصدر.')));

  /* ذكر اليوم + دعاء اليوم */
  const dhikrBody = h('div', null, loading());
  root.append(slot('ذكر اليوم', dhikrBody));
  adhkarData().then((cats) => {
    const pool = cats.filter((c) => /التسبيح|الاستغفار|الصباح/.test(c.category)).flatMap((c) => c.items.map((it) => ({ c, it })));
    const pick = pool[seed % pool.length] || { c: cats[0], it: cats[0].items[0] };
    dhikrBody.replaceChildren(dhikrCard(pick.it, pick.c), h('a', { href: `#/azkar/${pick.c.id}` }, 'كل أذكار هذا الباب'));
  }).catch(() => dhikrBody.replaceChildren(errorBox('تعذّر تحميل الأذكار.')));

  const duaBody = h('div', null, loading());
  root.append(slot('دعاء اليوم', duaBody));
  const dua = QURAN_DUAS[seed % QURAN_DUAS.length];
  Promise.all(dua.refs.map((r) => getAyah(r))).then((as) => {
    const text = as.map((a) => a.text).join(' '); const a0 = as[0];
    const where = `${a0.surah.name} — ${as.length > 1 ? `الآيات ${toAr(a0.numberInSurah)}–${toAr(as[as.length - 1].numberInSurah)}` : `الآية ${toAr(a0.numberInSurah)}`}`;
    duaBody.replaceChildren(h('p', { class: 'verse' }, text), h('p', { class: 'source' }, `دعاء من القرآن الكريم · ${where}`),
      actions({ text: `${text}\n\n(${where})`, fav: { key: `dua:q:${dua.refs.join(',')}`, type: 'dua', title: where, text, source: where, href: `#/duas` } }));
  }).catch(() => duaBody.replaceChildren(errorBox('تعذّر تحميل الدعاء.')));

  /* المفضلة */
  const f = favs().slice(0, 4);
  root.append(h('section', { class: 'card' }, h('h3', null, 'المفضلة'),
    f.length ? h('div', null, ...f.map((x) => h('p', null, h('a', { href: x.href || '#/favorites' }, x.title))), h('a', { class: 'btn', href: '#/favorites' }, 'عرض الكل'))
      : h('p', { class: 'muted' }, 'اضغط أيقونة القلب بجانب أي آية أو حديث أو دعاء ليظهر هنا.')));
  root.append(notice('المحتوى للتذكير والتعلّم وليس فتوى. الآيات والأحاديث والأذكار تُجلب من مصادرها الموثّقة (انظر «عن الموقع ومصادره»).'));
  return { node: root, dispose: () => clearInterval(timer) };
}
