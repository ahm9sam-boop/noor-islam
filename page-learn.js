import { h, toAr, normAr } from './lib-util.js';
import { icon } from './lib-icons.js';
import { loading, errorBox, notice, pageHeader, unavailable, sourceLine } from './lib-ui.js';
import { getAyah, fetchHadith, HADITH_BOOKS } from './lib-api.js';
import { hadithCard } from './page-hadith.js';

/* نصوص الآيات والأحاديث تُجلب من المصادر وتُتحقق (الأحاديث بعبارة مفتاحية)، أما الشرح فعبارات عامة موسومة «معلومات عامة». */
const PAGES = [
  ['pillars', 'أركان الإسلام'], ['iman', 'أركان الإيمان'], ['wudu', 'الوضوء'], ['prayer', 'الصلاة (مختصر عام)'],
  ['fasting', 'أحكام الصيام الأساسية'], ['prophets', 'قصص الأنبياء في القرآن'], ['seerah', 'السيرة النبوية'], ['qa', 'أسئلة وأجوبة']
];

async function verse(ref) {
  try {
    const a = await getAyah(ref);
    return h('div', { class: 'card' }, h('p', { class: 'verse' }, a.text), h('p', { class: 'source' }, `سورة ${a.surah.name} — الآية ${toAr(a.numberInSurah)}`), h('a', { href: `#/quran/s/${a.surah.number}/a/${a.numberInSurah}` }, 'افتح في المصحف'));
  } catch { return errorBox(`تعذّر تحميل الآية ${ref}.`); }
}
/** حديث من الأربعين النووية مع التحقق من أنه الحديث المقصود قبل عرضه. */
async function nawawi(n, mustContain) {
  try {
    const r = await fetchHadith('nawawi', n);
    if (!normAr(r.hadith.text).includes(normAr(mustContain))) return unavailable('تعذّر التحقق من الحديث', 'رقم الحديث في المصدر لا يطابق المتوقع، فلم نعرضه لتجنب الخطأ.');
    return hadithCard(r.hadith, 'nawawi', r.metadata);
  } catch { return errorBox('تعذّر تحميل الحديث من المصدر.'); }
}
const list = (items) => h('ol', null, ...items.map((t) => h('li', null, t)));
const general = () => notice('معلومات عامة مختصرة وليست فتوى؛ تفاصيل الأحكام تختلف بين المذاهب، فارجع لأهل العلم في بلدك.');

const BUILD = {
  async pillars() {
    return [await nawawi(3, 'بني الاسلام'), general(),
      h('h3', null, 'الأركان الخمسة'), list(['شهادة أن لا إله إلا الله وأن محمدًا رسول الله', 'إقامة الصلاة', 'إيتاء الزكاة', 'صوم رمضان', 'حج البيت لمن استطاع إليه سبيلًا']),
      h('h3', null, 'من القرآن'), await verse('47:19'), await verse('4:103'), await verse('9:103'), await verse('2:183'), await verse('3:97')];
  },
  async iman() {
    return [await nawawi(2, 'جبريل'), general(), h('h3', null, 'الأركان الستة'), list(['الإيمان بالله', 'وملائكته', 'وكتبه', 'ورسله', 'واليوم الآخر', 'والقدر خيره وشره']),
      h('h3', null, 'من القرآن'), await verse('2:285'), await verse('4:136')];
  },
  async wudu() {
    return [general(), h('p', null, 'أصل الوضوء في قوله تعالى:'), await verse('5:6'),
      h('h3', null, 'الفروض المنصوص عليها في الآية'), list(['غسل الوجه', 'غسل اليدين إلى المرفقين', 'مسح الرأس', 'غسل الرجلين إلى الكعبين']),
      h('p', { class: 'muted' }, 'تفاصيل السنن (كالتسمية والمضمضة والاستنشاق) وترتيبها وما يعدّه كل مذهب فرضًا أو سنة تختلف؛ راجع أهل العلم.')];
  },
  async prayer() {
    return [general(), h('p', null, 'قال تعالى:'), await verse('4:103'), await verse('20:14'),
      h('h3', null, 'عدد ركعات الفرائض'), list(['الفجر: ركعتان', 'الظهر: أربع', 'العصر: أربع', 'المغرب: ثلاث', 'العشاء: أربع']),
      h('h3', null, 'خطوات الصلاة بإيجاز'), list(['النية والاستقبال', 'تكبيرة الإحرام', 'قراءة الفاتحة وما تيسر', 'الركوع ثم الرفع منه', 'السجود ثم الجلوس بين السجدتين ثم السجدة الثانية', 'التشهد (بعد الركعتين وفي آخر الصلاة)', 'التسليم']),
      h('p', { class: 'muted' }, 'الأذكار والهيئات التفصيلية تختلف بين المذاهب؛ تعلّمها من معلّم موثوق أو من كتب الفقه المعتمدة.')];
  },
  async fasting() {
    return [general(), await verse('2:183'), await verse('2:185'), await verse('2:187'),
      h('p', { class: 'muted' }, 'تفاصيل المفطرات والرخص (كالمريض والمسافر) والقضاء والفدية تختلف بين العلماء؛ اسأل أهل العلم عن حالتك.')];
  },
  async prophets() {
    const items = [['يوسف عليه السلام', 12], ['نوح عليه السلام', 71], ['هود عليه السلام', 11], ['إبراهيم عليه السلام', 14], ['يونس عليه السلام', 10], ['مريم وزكريا وعيسى عليهم السلام', 19], ['موسى عليه السلام', 20], ['موسى وفرعون', 28], ['أصحاب الكهف وذو القرنين', 18]];
    return [notice('هذه مواضع بارزة لقصص الأنبياء في القرآن للقراءة المباشرة من المصحف. القصص التفصيلية خارج القرآن تحتاج مصدرًا موثقًا غير مضمَّن هنا.'),
      h('div', { class: 'grid wide' }, ...items.map(([t, n]) => h('a', { class: 'surah-item', href: `#/quran/s/${n}` }, h('div', { class: 'surah-name' }, t), h('span', { class: 'muted small' }, `سورة رقم ${toAr(n)}`))))];
  },
  async seerah() {
    return [unavailable('السيرة النبوية', 'لا يتضمن الموقع نصًا للسيرة لأننا لم نضف مصدرًا موثقًا مرخّصًا لها بعد، ولن نكتب أحداثًا أو تواريخ من الذاكرة.',
      'نقطة الربط: ضع ملفًا data/seerah.json (انظر README) أو اربط مصدرك المعتمد.')];
  },
  async qa() {
    return [unavailable('أسئلة وأجوبة', 'لا نولّد فتاوى آلية. للمسائل الشرعية راجع جهة إفتاء رسمية أو عالمًا موثوقًا.', 'مثال لجهة رسمية: دار الإفتاء المصرية (dar-alifta.org).')];
  }
};

export async function render({ params }) {
  const slug = params[0];
  if (!slug) {
    return h('div', null, pageHeader('تعلّم', 'مواد تعريفية مع التمييز بين النص الشرعي والمعلومات العامة'),
      h('div', { class: 'grid wide' }, ...PAGES.map(([k, t]) => h('a', { class: 'surah-item', href: `#/learn/${k}` }, icon('learn', 24), h('div', { class: 'surah-name' }, t)))));
  }
  const title = PAGES.find((p) => p[0] === slug)?.[1];
  if (!title || !BUILD[slug]) return errorBox('الصفحة غير موجودة.');
  const root = h('div', null, pageHeader(title, null, h('a', { class: 'btn', href: '#/learn' }, 'كل المواد')), loading());
  BUILD[slug]().then((nodes) => { root.replaceChildren(pageHeader(title, null, h('a', { class: 'btn', href: '#/learn' }, 'كل المواد')), ...nodes.flat(), sourceLine('الآيات: AlQuran Cloud · الأحاديث: hadith-api (الأربعون النووية)')); })
    .catch((e) => root.replaceChildren(errorBox(e.message)));
  void HADITH_BOOKS;
  return root;
}
