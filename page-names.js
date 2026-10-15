import { h, toAr, normAr, debounce, highlight } from './lib-util.js';
import { actions, loading, errorBox, notice, pageHeader } from './lib-ui.js';
import { namesData, namesArabicMeanings } from './lib-api.js';

export async function render() {
  const root = h('div', null, pageHeader('أسماء الله الحسنى', 'الأسماء من مصدر بيانات خارجي، والمعاني كما وردت فيه'));
  const grid = h('div', { class: 'grid wide' }, loading());
  const search = h('input', { type: 'search', placeholder: 'ابحث بالاسم أو الرقم أو المعنى…', 'aria-label': 'بحث في الأسماء' });
  root.append(h('div', { class: 'row' }, search), grid);
  let names, ar;
  try { [names, ar] = await Promise.all([namesData(), namesArabicMeanings()]); }
  catch { grid.replaceChildren(errorBox('تعذّر تحميل الأسماء من المصدر.', () => location.reload())); return root; }
  const arMap = new Map((ar || []).map((x) => [x.number, x.meaning]));
  root.insertBefore(notice(arMap.size ? 'المعاني العربية من ملف data/names-ar.json الذي أضفته.' : 'المعنى المعروض بالإنجليزية كما ورد في المصدر. لإضافة شرح عربي موثّق ضع ملف data/names-ar.json (انظر README) ولن نكتب شرحًا من عندنا.'), grid);
  const paint = () => {
    const q = search.value.trim();
    const nq = normAr(q);
    const hits = names.filter((n) => !nq || String(n.number) === nq || normAr(n.name).includes(nq) || normAr(n.transliteration).includes(nq) || n.en.toLowerCase().includes(nq) || (arMap.get(n.number) && normAr(arMap.get(n.number)).includes(nq)));
    grid.replaceChildren(...hits.map((n) => {
      const meaning = arMap.get(n.number) || n.en;
      const text = `${n.name}${meaning ? ` — ${meaning}` : ''}`;
      return h('article', { class: 'card' }, h('div', { class: 'row between' }, h('span', { class: 'badge gold' }, toAr(n.number)), h('span', { class: 'muted small' }, n.transliteration)),
        h('p', { class: 'surah-name' }, highlight(n.name, q)), h('p', { class: 'muted', dir: arMap.get(n.number) ? 'rtl' : 'ltr' }, meaning || 'لا يوجد معنى في المصدر'),
        actions({ text: `${text}\n\n(من أسماء الله الحسنى)`, fav: { key: `name:${n.number}`, type: 'name', title: n.name, text: meaning ? `${n.name} — ${meaning}` : n.name, source: 'أسماء الله الحسنى', href: '#/names' } }));
    }));
    if (!hits.length) grid.replaceChildren(h('p', { class: 'state' }, 'لا توجد نتائج'));
  };
  search.addEventListener('input', debounce(paint, 150)); paint();
  return root;
}
