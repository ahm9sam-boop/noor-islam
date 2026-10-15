import { h, toAr, normAr, highlight } from './lib-util.js';
import { ls } from './lib-store.js';
import { actions, loading, errorBox, notice, pageHeader, chips } from './lib-ui.js';
import * as api from './lib-api.js';
import { searchHadith, hadithCard } from './page-hadith.js';

const LIMIT = 30;

export async function render({ query, go }) {
  const q = (query.q || '').trim();
  const root = h('div', null, pageHeader('البحث الشامل', 'القرآن · الأحاديث · الأذكار والأدعية · أسماء الله الحسنى'));
  const input = h('input', { type: 'search', value: q, placeholder: 'اكتب كلمة…', 'aria-label': 'كلمة البحث', list: 'sugg', autocomplete: 'off' });
  const dl = h('datalist', { id: 'sugg' });
  root.append(h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); const v = input.value.trim(); if (v) { addRecent(v); go(`/search?q=${encodeURIComponent(v)}`); } } }, input, dl, h('button', { class: 'btn primary', type: 'submit' }, 'بحث')));

  // اقتراحات أثناء الكتابة: أسماء السور والتصنيفات والأسماء الحسنى + آخر عمليات البحث
  Promise.all([api.surahList().catch(() => []), api.adhkarData().catch(() => []), api.namesData().catch(() => [])]).then(([s, c, n]) => {
    const all = [...getRecent(), ...s.map((x) => x.name), ...c.map((x) => x.category), ...n.map((x) => x.name)];
    dl.replaceChildren(...[...new Set(all)].slice(0, 500).map((v) => h('option', { value: v })));
  });

  if (!normAr(q)) {
    const rec = getRecent();
    root.append(rec.length ? h('div', { class: 'card' }, h('h3', null, 'آخر عمليات البحث'), h('div', { class: 'chips' }, ...rec.map((r) => h('a', { class: 'chip', href: `#/search?q=${encodeURIComponent(r)}` }, r)))) : h('p', { class: 'state' }, 'اكتب كلمة للبحث. يتجاهل البحث التشكيل ويوحّد الهمزات والتاء المربوطة.'));
    return root;
  }
  addRecent(q);

  let filter = 'all';
  const sections = {};
  const bar = chips([['all', 'الكل'], ['quran', 'آيات'], ['hadith', 'أحاديث'], ['adhkar', 'أذكار وأدعية'], ['names', 'أسماء الله']], filter, (v) => { filter = v; Object.entries(sections).forEach(([k, el]) => { el.hidden = !(v === 'all' || v === k); }); }, 'تصفية النتائج');
  root.append(bar);
  const mk = (key, title) => { const el = h('section', null, h('h2', null, title), loading('جارٍ البحث…')); sections[key] = el; root.append(el); return el; };
  const sQ = mk('quran', 'آيات من القرآن الكريم'), sH = mk('hadith', 'أحاديث'), sA = mk('adhkar', 'أذكار وأدعية'), sN = mk('names', 'أسماء الله الحسنى');
  const fill = (el, title, count, nodes, empty) => el.replaceChildren(h('h2', null, `${title} `, h('span', { class: 'badge' }, toAr(count))), ...(count ? nodes : [h('p', { class: 'muted' }, empty)]));

  api.searchQuran(q).then((res) => {
    const nodes = res.slice(0, LIMIT).map((r) => h('article', { class: 'dhikr' }, h('span', { class: 'badge green' }, 'آية'), h('p', { class: 'verse' }, highlight(r.text, q)),
      h('div', { class: 'row between' }, h('a', { href: `#/quran/s/${r.surah}/a/${r.ayah}` }, `القرآن الكريم — ${r.surahName} — الآية ${toAr(r.ayah)}`),
        actions({ text: `${r.text}\n\n(${r.surahName} — الآية ${toAr(r.ayah)})`, fav: { key: `ayah:${r.surah}:${r.ayah}`, type: 'ayah', title: `${r.surahName} ${toAr(r.ayah)}`, text: r.text, source: 'القرآن الكريم', href: `#/quran/s/${r.surah}/a/${r.ayah}` } }))));
    if (res.length > LIMIT) nodes.push(h('p', { class: 'muted' }, `عُرضت أول ${toAr(LIMIT)} من ${toAr(res.length)} — ضيّق البحث.`));
    fill(sQ, 'آيات من القرآن الكريم', res.length, nodes, 'لا توجد آيات مطابقة.');
    if (res.length && !res[0].text.includes('\u0651') ) sQ.append(h('p', { class: 'source' }, 'نص النتائج بالإملاء المبسّط من الخادم؛ افتح الآية لرؤيتها بالرسم العثماني.'));
  }).catch((e) => sQ.replaceChildren(h('h2', null, 'آيات'), errorBox(e.message)));

  searchHadith(q).then(({ out, searched }) => {
    if (!searched) return sH.replaceChildren(h('h2', null, 'أحاديث'), notice('لم تُنزَّل كتب الحديث بعد، والبحث في الأحاديث يتم على جهازك. نزّل كتابًا من صفحة الأحاديث.'), h('a', { class: 'btn', href: '#/hadith' }, 'صفحة الأحاديث'));
    fill(sH, 'أحاديث', out.length, out.slice(0, LIMIT).map(({ x, book, meta }) => hadithCard(x, book, meta, { query: q })), `لا نتائج في الكتب المنزّلة (${toAr(searched)}).`);
  });

  api.adhkarData().then((cats) => {
    const nq = normAr(q); const res = [];
    cats.forEach((c) => c.items.forEach((it) => { if (normAr(it.text).includes(nq) || normAr(c.category).includes(nq)) res.push({ c, it }); }));
    fill(sA, 'أذكار وأدعية', res.length, res.slice(0, LIMIT).map(({ c, it }) => h('article', { class: 'dhikr' }, h('span', { class: 'badge' }, 'ذكر/دعاء'), h('p', { class: 'dua-text' }, highlight(it.text, q)),
      h('div', { class: 'row between' }, h('a', { href: `#/azkar/${c.id}` }, `حصن المسلم — ${c.category}`), actions({ text: `${it.text}\n\n(${c.category} — حصن المسلم)`, fav: { key: `dhikr:${c.id}:${it.id}`, type: 'dhikr', title: c.category, text: it.text, source: 'حصن المسلم', href: `#/azkar/${c.id}` } })))), 'لا نتائج.');
  }).catch((e) => sA.replaceChildren(h('h2', null, 'أذكار وأدعية'), errorBox(e.message)));

  api.namesData().then((names) => {
    const nq = normAr(q); const res = names.filter((n) => normAr(n.name).includes(nq) || normAr(n.transliteration).includes(nq) || n.en.toLowerCase().includes(nq));
    fill(sN, 'أسماء الله الحسنى', res.length, res.map((n) => h('article', { class: 'dhikr' }, h('span', { class: 'badge gold' }, 'اسم'), h('p', { class: 'surah-name' }, highlight(n.name, q)), h('p', { class: 'muted' }, `${n.transliteration} — ${n.en}`), h('a', { href: '#/names' }, 'أسماء الله الحسنى'))), 'لا نتائج.');
  }).catch((e) => sN.replaceChildren(h('h2', null, 'أسماء الله'), errorBox(e.message)));
  return root;
}
const getRecent = () => ls.get('recentSearches', []);
function addRecent(v) { const l = [v, ...getRecent().filter((x) => x !== v)].slice(0, 10); ls.set('recentSearches', l); }
