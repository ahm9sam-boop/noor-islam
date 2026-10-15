import { h, toAr, normAr } from './lib-util.js';
import { actions, loading, errorBox, notice, pageHeader, chips, sourceLine } from './lib-ui.js';
import { adhkarData, getAyah } from './lib-api.js';
import { dhikrCard } from './page-azkar.js';

/* المراجع القرآنية فقط (سورة:آية) — النص نفسه يُجلب من مصدر القرآن ولا يُكتب يدويًا. */
export const QURAN_DUAS = [
  { t: 'general', refs: ['2:201'] }, { t: 'forgive', refs: ['2:286'] }, { t: 'guidance', refs: ['3:8'] }, { t: 'forgive', refs: ['3:147'] },
  { t: 'forgive', refs: ['3:193'] }, { t: 'forgive', refs: ['7:23'] }, { t: 'guidance', refs: ['7:126'] }, { t: 'knowledge', refs: ['20:25', '20:26', '20:27', '20:28'] },
  { t: 'knowledge', refs: ['20:114'] }, { t: 'distress', refs: ['21:83'] }, { t: 'distress', refs: ['21:87'] }, { t: 'rizq', refs: ['28:24'] },
  { t: 'family', refs: ['25:74'] }, { t: 'parents', refs: ['17:24'] }, { t: 'parents', refs: ['14:41'] }, { t: 'parents', refs: ['71:28'] },
  { t: 'family', refs: ['46:15'] }, { t: 'family', refs: ['3:38'] }, { t: 'knowledge', refs: ['18:10'] }, { t: 'guidance', refs: ['12:101'] },
  { t: 'forgive', refs: ['23:118'] }, { t: 'general', refs: ['59:10'] }
];
const Q_TOPICS = [['all', 'الكل'], ['general', 'عامة'], ['forgive', 'استغفار وتوبة'], ['parents', 'الوالدان'], ['family', 'الأسرة والذرية'], ['knowledge', 'علم وتوفيق'], ['distress', 'كرب وشدة'], ['rizq', 'رزق وحاجة'], ['guidance', 'ثبات وهداية']];

/* تصنيفات السنة: تُطابق أسماء أبواب «حصن المسلم» بالكلمات المفتاحية. */
const S_TOPICS = [
  ['all', 'الكل', []], ['distress', 'تفريج الكرب والهم', ['الكرب', 'الهم', 'الحزن']], ['forgive', 'الاستغفار والتوبة', ['الاستغفار', 'التوبة']],
  ['sick', 'الشفاء والمريض', ['المريض', 'الوجع']], ['travel', 'السفر', ['السفر', 'الركوب']], ['family', 'الزواج والأسرة', ['تزوج', 'زواج', 'المولود']],
  ['debt', 'قضاء الدين والرزق', ['الدين', 'الرزق']], ['sleep', 'النوم والاستيقاظ', ['النوم', 'الاستيقاظ', 'الفزع']], ['am', 'الصباح والمساء', ['الصباح', 'المساء']],
  ['rain', 'المطر والرياح', ['المطر', 'الريح', 'الرعد', 'الاستسقاء']], ['dead', 'الميت والمقابر', ['الميت', 'القبر', 'الجنازة', 'التعزية', 'القبور']], ['istikhara', 'الاستخارة', ['الاستخارة']]
];

export async function render() {
  const root = h('div', null, pageHeader('الأدعية', 'أدعية القرآن الكريم، وأدعية السنة من «حصن المسلم»'),
    notice('لا يُنسب دعاء إلى النبي ﷺ إلا ما ورد في المصدر المذكور تحته. الدعاء عبادة وليس وصفة مضمونة لنتيجة بعينها.'));
  let tab = 'quran';
  const body = h('div');
  const tabs = chips([['quran', 'من القرآن الكريم'], ['sunnah', 'من السنة (حصن المسلم)']], tab, (v) => { tab = v; show(); }, 'نوع الأدعية');
  root.append(tabs, body);

  function show() { tab === 'quran' ? showQuran() : showSunnah(); }

  function showQuran(topic = 'all') {
    const list = h('div', null, loading());
    body.replaceChildren(chips(Q_TOPICS, topic, (v) => showQuran(v), 'تصنيف'), list);
    const items = QURAN_DUAS.filter((d) => topic === 'all' || d.t === topic);
    Promise.all(items.map(async (d) => {
      const ayahs = await Promise.all(d.refs.map((r) => getAyah(r)));
      return { d, ayahs };
    })).then((rows) => {
      list.replaceChildren(...rows.map(({ d, ayahs }) => {
        const text = ayahs.map((a) => a.text).join(' ');
        const a0 = ayahs[0];
        const last = ayahs[ayahs.length - 1];
        const where = ayahs.length > 1 ? `سورة ${a0.surah.name} — الآيات ${toAr(a0.numberInSurah)}–${toAr(last.numberInSurah)}` : `سورة ${a0.surah.name} — الآية ${toAr(a0.numberInSurah)}`;
        return h('article', { class: 'dhikr' }, h('p', { class: 'dua-text' }, text),
          h('div', { class: 'dhikr-top' }, h('span', { class: 'muted small' }, h('span', { class: 'badge green' }, 'قرآن كريم'), ' ', where),
            actions({ text: `${text}\n\n(${where})`, fav: { key: `dua:q:${d.refs.join(',')}`, type: 'dua', title: where, text, source: where, href: `#/quran/s/${a0.surah.number}/a/${a0.numberInSurah}` } })));
      }));
      list.append(sourceLine('نص الآيات من AlQuran Cloud (نص Tanzil العثماني). اختيار الآيات لتصنيفها بحسب موضوع الدعاء فيها.'));
    }).catch(() => list.replaceChildren(errorBox('تعذّر تحميل الآيات. تحقق من الاتصال أو نزّل المصحف من صفحة القرآن.', () => showQuran(topic))));
  }

  async function showSunnah(topic = 'all') {
    const list = h('div', null, loading());
    body.replaceChildren(chips(S_TOPICS.map(([k, l]) => [k, l]), topic, (v) => showSunnah(v), 'تصنيف'), list);
    try {
      const cats = await adhkarData();
      const kws = S_TOPICS.find((x) => x[0] === topic)?.[2] || [];
      const hits = topic === 'all' ? cats : cats.filter((c) => kws.some((k) => normAr(c.category).includes(normAr(k))));
      if (!hits.length) { list.replaceChildren(h('p', { class: 'state' }, 'لا توجد أدعية بهذا التصنيف في مصدر السنة المستخدم. انظر تبويب «من القرآن الكريم».')); return; }
      list.replaceChildren();
      hits.slice(0, topic === 'all' ? 40 : 100).forEach((c) => {
        list.append(h('h3', { style: undefined }, c.category));
        c.items.slice(0, topic === 'all' ? 2 : 50).forEach((it) => list.append(dhikrCard(it, c, { counter: false })));
        if (topic === 'all' && c.items.length > 2) list.append(h('a', { class: 'btn', href: `#/azkar/${c.id}` }, `عرض كل ${toAr(c.items.length)} في هذا الباب`));
      });
      list.append(sourceLine('كتاب «حصن المسلم» (بيانات rn0x/Adhkar-json). درجة الحديث غير واردة في بيانات المصدر؛ لا تُعرض درجة من عندنا.'));
    } catch { list.replaceChildren(errorBox('تعذّر تحميل الأدعية من المصدر.', () => showSunnah(topic))); }
  }
  show();
  return root;
}
void normAr;
