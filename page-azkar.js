import { h, toAr, normAr, debounce } from './lib-util.js';
import { icon } from './lib-icons.js';
import { actions, loading, errorBox, notice, pageHeader, vibrate } from './lib-ui.js';
import { adhkarData } from './lib-api.js';

/** اختصارات: أول تصنيف من حصن المسلم يحتوي كل الكلمات المفتاحية في اسمه. */
export const FEATURED = [
  ['أذكار الصباح والمساء', ['الصباح']], ['أذكار النوم', ['النوم']], ['الاستيقاظ من النوم', ['الاستيقاظ']],
  ['بعد الصلاة', ['السلام', 'الصلاة']], ['دخول المنزل', ['دخول', 'المنزل']], ['دخول المسجد', ['دخول', 'المسجد']],
  ['الطعام والشراب', ['الطعام']], ['الوضوء', ['الوضوء']], ['السفر', ['السفر']], ['الكرب والهم', ['الكرب']], ['الاستغفار والتوبة', ['الاستغفار']],
  ['فضل التسبيح والتحميد', ['فضل', 'التسبيح']], ['الصلاة على النبي ﷺ', ['الصلاة', 'النبي']]
];
export const findCat = (cats, kws) => cats.find((c) => kws.every((k) => normAr(c.category).includes(normAr(k))));

const progress = new Map(); // key -> المتبقي (يُحفظ طوال الجلسة)

export function dhikrCard(item, cat, { counter = true } = {}) {
  const key = `${cat.id}:${item.id}`;
  let left = progress.has(key) ? progress.get(key) : item.count;
  const badge = h('button', { type: 'button', class: 'counter-btn', 'aria-label': 'اضغط لتسجيل مرة من التكرار' });
  const card = h('article', { class: 'dhikr' });
  const paint = () => {
    badge.textContent = left === 0 ? 'تم ✓' : `${toAr(left)}×`;
    card.classList.toggle('done', left === 0);
  };
  badge.addEventListener('click', () => { if (left > 0) { left--; progress.set(key, left); vibrate(left === 0 ? [20, 40, 20] : 8); paint(); } });
  paint();
  const cite = `${item.text}\n\n(${cat.category} — حصن المسلم، التكرار: ${toAr(item.count)})`;
  card.append(
    h('p', { class: 'dua-text' }, item.text),
    h('div', { class: 'dhikr-top' },
      h('span', { class: 'muted small' }, `التكرار الوارد: ${toAr(item.count)} · المصدر: حصن المسلم`),
      h('div', { class: 'row', style: undefined }, counter ? badge : null,
        actions({ text: cite, fav: { key: `dhikr:${cat.id}:${item.id}`, type: 'dhikr', title: cat.category, text: item.text, source: 'حصن المسلم', href: `#/azkar/${cat.id}` } }))));
  return card;
}

export async function render({ params }) {
  const root = h('div', null, pageHeader('الأذكار', 'من كتاب «حصن المسلم» — اضغط على العدّاد لتسجيل كل مرة'));
  let cats;
  try { cats = await adhkarData(); }
  catch (e) { root.append(errorBox('تعذّر تحميل الأذكار من المصدر. تحقق من الاتصال (تُحفظ نسخة على الجهاز بعد أول تحميل).', () => location.reload())); return root; }

  const id = params[0];
  if (id) {
    const cat = cats.find((c) => String(c.id) === id);
    if (!cat) { root.append(errorBox('التصنيف غير موجود.')); return root; }
    root.replaceChildren(pageHeader(cat.category, `${toAr(cat.items.length)} من الأذكار`, h('a', { class: 'btn', href: '#/azkar' }, 'كل التصنيفات')));
    cat.items.forEach((it) => root.append(dhikrCard(it, cat)));
    root.append(notice('العدد الوارد هو المذكور في المصدر. درجة الأحاديث غير مذكورة في بيانات هذا المصدر؛ راجع كتب التخريج عند الحاجة.'));
    return root;
  }

  const quick = h('div', { class: 'grid' });
  FEATURED.forEach(([label, kws]) => { const c = findCat(cats, kws); if (c) quick.append(h('a', { class: 'quick', href: `#/azkar/${c.id}` }, icon('azkar', 26), label)); });
  const search = h('input', { type: 'search', placeholder: 'ابحث في تصنيفات الأذكار…', 'aria-label': 'بحث في التصنيفات' });
  const list = h('div', { class: 'grid wide' });
  const paint = () => {
    const q = normAr(search.value);
    const hits = cats.filter((c) => !q || normAr(c.category).includes(q) || c.items.some((i) => normAr(i.text).includes(q)));
    list.replaceChildren(...hits.map((c) => h('a', { class: 'surah-item', href: `#/azkar/${c.id}` }, h('div', null, h('div', { class: 'surah-name' }, c.category), h('div', { class: 'muted small' }, `${toAr(c.items.length)} ذكر`)))));
    if (!hits.length) list.replaceChildren(h('p', { class: 'state' }, 'لا توجد نتائج'));
  };
  search.addEventListener('input', debounce(paint, 150)); paint();
  root.append(quick, h('h2', { style: undefined }, 'كل التصنيفات'), h('div', { class: 'row' }, search), list);
  return root;
}
void loading;
