import { h, toAr, normAr, highlight, daySeed } from './lib-util.js';
import { icon } from './lib-icons.js';
import { actions, loading, errorBox, notice, pageHeader } from './lib-ui.js';
import { toast } from './lib-util.js';
import * as api from './lib-api.js';

const bookInfo = (id) => api.HADITH_BOOKS.find((b) => b.id === id);

/** بطاقة حديث: النص + المصدر + الرقم + الدرجة من بيانات المصدر فقط. */
export function hadithCard(x, bookId, meta, { query = '' } = {}) {
  const b = bookInfo(bookId);
  const sec = x.reference?.book != null ? api.sectionName(meta, x.reference.book) : '';
  const where = `${b.ar} — رقم ${toAr(x.hadithnumber)}${sec ? ` — ${sec}` : ''}`;
  const card = h('article', { class: 'dhikr' }, h('p', { class: 'dua-text', style: undefined }, query ? highlight(x.text, query) : x.text));
  const grades = (x.grades || []).map(api.gradeLabel);
  card.append(h('p', { class: 'source' }, `المصدر: ${where}`));
  card.append(h('p', { class: 'source' }, grades.length ? ['الدرجة (بحسب بيانات المصدر): ', grades.map((g) => `${g.grade} — ${g.by}`).join('، ')] : 'الدرجة: لم ترد في بيانات المصدر لهذا الحديث.'));
  card.append(h('div', { class: 'row between' }, h('span'), actions({ text: `${x.text}\n\n(${where})`, fav: { key: `hadith:${bookId}:${x.hadithnumber}`, type: 'hadith', title: where, text: x.text, source: where, href: `#/hadith/${bookId}/${x.hadithnumber}` } })));
  return card;
}

/** حديث اليوم: من «الأربعين النووية» (٤٢ حديثًا) بترتيب ثابت يتغير يوميًا. */
export async function dailyHadith() {
  const d = await api.loadHadithBook('nawawi');
  const x = d.hadiths[daySeed() % d.hadiths.length];
  return { x, meta: d.metadata, book: 'nawawi' };
}

/** بحث في الكتب المنزّلة على الجهاز فقط. */
export async function searchHadith(query) {
  const nq = normAr(query);
  const out = [];
  let searched = 0;
  for (const b of api.HADITH_BOOKS) {
    const d = await api.hadithBookLocal(b.id);
    if (!d) continue;
    searched++;
    for (const x of d.hadiths) if (normAr(x.text).includes(nq)) out.push({ x, book: b.id, meta: d.metadata });
  }
  return { out, searched };
}

const TOPICS = ['الأخلاق', 'الصلاة', 'الصيام', 'الصدقة', 'الوالدين', 'الرحمة', 'الصبر', 'التوبة', 'الاستغفار', 'العلم', 'الجار'];

export async function render({ params }) {
  const [book, num] = params;
  if (book && bookInfo(book)) return bookView(book, num ? +num : null);
  return indexView();
}

async function indexView() {
  const root = h('div', null, pageHeader('الأحاديث النبوية', 'من مصادر السنة المعتمدة؛ النص والرقم والدرجة كما وردت في بيانات المصدر'),
    notice('لا يُعرض حديث دون مصدر ورقم، ولا تُوضع درجة من عندنا. الشرح المبسط غير متوفر حاليًا لعدم وجود مصدر موثّق مدمج (انظر صفحة «عن الموقع»).'));
  const search = h('input', { type: 'search', placeholder: 'ابحث في الكتب المنزّلة على جهازك…', 'aria-label': 'بحث في الأحاديث' });
  const results = h('div');
  const run = async (q) => {
    if (!normAr(q)) return;
    results.replaceChildren(loading('جارٍ البحث…'));
    const { out, searched } = await searchHadith(q);
    if (!searched) return results.replaceChildren(h('p', { class: 'state' }, 'نزّل كتابًا واحدًا على الأقل (مثل الأربعين النووية) ثم ابحث فيه.'));
    results.replaceChildren(h('p', { class: 'muted' }, `${toAr(out.length)} نتيجة في ${toAr(searched)} كتاب/كتب منزّلة`), ...out.slice(0, 30).map(({ x, book, meta }) => hadithCard(x, book, meta, { query: q })));
    if (out.length > 30) results.append(h('p', { class: 'muted' }, 'عُرضت أول ٣٠ نتيجة؛ ضيّق البحث لنتائج أدق.'));
  };
  root.append(h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); run(search.value); } }, search, h('button', { class: 'btn primary', type: 'submit' }, 'بحث')),
    h('div', { class: 'chips scroll-x', 'aria-label': 'مواضيع (بحث بالكلمة)' }, ...TOPICS.map((t) => h('button', { type: 'button', class: 'chip', onclick: () => { search.value = t; run(t); } }, t))),
    h('p', { class: 'muted small' }, 'الأزرار أعلاه بحث بكلمة الموضوع داخل نص الأحاديث وليست تصنيفًا علميًا.'), results);

  const grid = h('div', { class: 'grid wide' });
  for (const b of api.HADITH_BOOKS) {
    const local = await api.hadithBookLocal(b.id);
    const card = h('div', { class: 'card' }, h('h3', null, b.ar),
      h('p', { class: 'muted small' }, local ? `محفوظ على الجهاز (${toAr(local.hadiths.length)} حديث)` : (b.small ? 'صغير الحجم، يُحمَّل عند الفتح' : `يمكن التصفح حديثًا بحديث، أو تنزيله كاملًا (نحو ${toAr(b.mb)} ميجابايت)`)));
    const row = h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/hadith/${b.id}` }, 'تصفّح'));
    if (!b.small || local) {
      const dl = h('button', { class: 'btn', type: 'button' }, icon(local ? 'trash' : 'download', 16), local ? 'حذف' : 'تنزيل للبحث والاستخدام دون إنترنت');
      dl.onclick = async () => {
        dl.disabled = true;
        try { if (local) await api.deleteHadithBook(b.id); else { dl.textContent = 'جارٍ التنزيل…'; await api.loadHadithBook(b.id); } toast('تم'); location.reload(); }
        catch (e) { toast(`تعذّر: ${e.message}`); dl.disabled = false; }
      };
      row.append(dl);
    }
    card.append(row); grid.append(card);
  }
  root.append(h('h2', null, 'الكتب'), grid);
  return root;
}

async function bookView(id, num) {
  const b = bookInfo(id);
  const root = h('div', null, pageHeader(b.ar, 'تصفّح حسب الأبواب أو بالرقم', h('a', { class: 'btn', href: '#/hadith' }, 'كل الكتب')));
  const body = h('div', null, loading());
  root.append(body);
  const local = b.small ? await api.loadHadithBook(id).catch(() => null) : await api.hadithBookLocal(id);

  if (!local) {
    // كتاب كبير غير منزّل: عرض حديث واحد بالرقم
    let n = num || 1;
    const input = h('input', { type: 'number', min: 1, value: n, 'aria-label': 'رقم الحديث' });
    const out = h('div');
    const show = async (k) => {
      n = Math.max(1, k); input.value = n; out.replaceChildren(loading());
      try { const r = await api.fetchHadith(id, n); out.replaceChildren(hadithCard(r.hadith, id, r.metadata)); }
      catch { out.replaceChildren(errorBox('تعذّر جلب الحديث: الرقم غير موجود أو لا يوجد اتصال.', () => show(n))); }
    };
    body.replaceChildren(notice('هذا الكتاب غير منزّل. تتصفح حديثًا بحديث؛ نزّله من صفحة الكتب للبحث والتصفح بالأبواب دون إنترنت.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => show(n - 1) }, 'السابق'), input,
        h('button', { class: 'btn primary', type: 'button', onclick: () => show(+input.value || 1) }, 'اذهب'), h('button', { class: 'btn', type: 'button', onclick: () => show(n + 1) }, 'التالي')), out);
    show(n);
    return root;
  }

  const meta = local.metadata; const all = local.hadiths;
  const secs = Object.keys(meta?.section || {}).filter((k) => k !== '0');
  const sel = h('select', { 'aria-label': 'الباب' }, h('option', { value: '' }, 'كل الأحاديث'), ...secs.map((k) => h('option', { value: k }, `${toAr(k)}. ${meta.section[k]}`)));
  const jump = h('input', { type: 'number', min: 1, placeholder: 'رقم الحديث', 'aria-label': 'رقم الحديث', size: 8 });
  const list = h('div'); const pager = h('div', { class: 'row between' });
  let page = 0; const PER = 15; let cur = all;
  const draw = () => {
    const slice = cur.slice(page * PER, page * PER + PER);
    list.replaceChildren(...slice.map((x) => hadithCard(x, id, meta)));
    pager.replaceChildren(
      h('button', { class: 'btn', type: 'button', disabled: page === 0, onclick: () => { page--; draw(); window.scrollTo(0, 0); } }, 'السابق'),
      h('span', { class: 'muted' }, `${toAr(page + 1)} / ${toAr(Math.max(1, Math.ceil(cur.length / PER)))}`),
      h('button', { class: 'btn', type: 'button', disabled: (page + 1) * PER >= cur.length, onclick: () => { page++; draw(); window.scrollTo(0, 0); } }, 'التالي'));
  };
  const filter = () => { cur = sel.value ? all.filter((x) => String(x.reference?.book) === sel.value) : all; page = 0; draw(); };
  sel.addEventListener('change', filter);
  jump.addEventListener('change', () => {
    const k = all.findIndex((x) => x.hadithnumber === +jump.value);
    if (k < 0) return toast('الرقم غير موجود في هذا الكتاب');
    sel.value = ''; cur = all; page = Math.floor(k / PER); draw();
  });
  if (num) { const k = all.findIndex((x) => x.hadithnumber === num); if (k >= 0) page = Math.floor(k / PER); }
  body.replaceChildren(h('div', { class: 'row' }, secs.length > 1 ? sel : null, jump), list, pager);
  draw();
  return root;
}

