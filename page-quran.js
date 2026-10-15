import { h, toAr, normAr, debounce, copyText, shareText, toast, dayKey } from './lib-util.js';
import { icon } from './lib-icons.js';
import { settings, setSetting } from './lib-settings.js';
import { ls } from './lib-store.js';
import { favBtn, iconBtn, loading, errorBox, notice, openSheet, pageHeader, chips, vibrate } from './lib-ui.js';
import * as api from './lib-api.js';

const PAGES = 604; // عدد صفحات مصحف المدينة في مصدر البيانات
const BSM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

export async function render({ params, go }) {
  const [kind, a, , b] = params; // quran/s/2/a/5  |  quran/p/50  |  quran/khatm
  if (kind === 's' && +a >= 1 && +a <= 114) return readerView({ mode: 's', n: +a, ayah: b ? +b : null, go });
  if (kind === 'p' && +a >= 1 && +a <= PAGES) return readerView({ mode: 'p', n: +a, go });
  if (kind === 'khatm') return khatmView();
  return listView(go);
}

/* ---------- حفظ آخر موضع (بموافقة المستخدم) ---------- */
const lastRead = () => ls.get('lastRead', null);
function saveLast(v) { if (settings.saveReading === true) ls.set('lastRead', { ...v, ts: Date.now() }); }
function consentBar() {
  if (settings.saveReading !== null) return null;
  const bar = h('div', { class: 'notice' }, icon('info', 18), h('span', null, 'هل تسمح بحفظ آخر موضع قراءة على هذا الجهاز فقط ليسهل عليك المتابعة؟ لا تُرسل أي بيانات إلى خادم.'));
  bar.append(
    h('button', { class: 'btn primary', type: 'button', onclick: () => { setSetting('saveReading', true); bar.remove(); } }, 'نعم، احفظ'),
    h('button', { class: 'btn', type: 'button', onclick: () => { setSetting('saveReading', false); bar.remove(); } }, 'لا شكرًا'));
  return bar;
}

/* ---------- العلامات المرجعية ---------- */
const bookmarks = () => ls.get('qbookmarks', []);
function addBookmark(surah, ayah, surahName) {
  const list = bookmarks();
  if (list.some((x) => x.surah === surah && x.ayah === ayah)) return toast('العلامة موجودة بالفعل');
  list.unshift({ surah, ayah, name: surahName, ts: Date.now() });
  ls.set('qbookmarks', list); toast('أُضيفت علامة مرجعية');
}

/* ===================== قائمة السور ===================== */
async function listView(go) {
  const root = h('div', null, pageHeader('القرآن الكريم', 'النص العثماني من مصدر موثّق مع التحقق من ترقيم الآيات'));
  const cb = consentBar(); if (cb) root.append(cb);

  const lr = lastRead();
  if (lr) {
    root.append(h('a', { class: 'card', href: `#/quran/s/${lr.surah}/a/${lr.ayah}`, style: undefined }, h('h3', null, 'تابع القراءة'),
      h('p', null, `سورة ${lr.name || lr.surah} — الآية ${toAr(lr.ayah)}`)));
  }

  const tools = h('div', { class: 'row' },
    h('a', { class: 'btn', href: '#/quran/p/1' }, icon('quran', 18), 'تصفّح بالصفحات'),
    h('a', { class: 'btn', href: '#/quran/khatm' }, icon('check', 18), 'ختمة القرآن'),
    h('a', { class: 'btn', href: '#/search' }, icon('search', 18), 'بحث في الآيات'));
  const jump = h('input', { type: 'text', placeholder: 'اذهب إلى آية، مثال: 2:255', 'aria-label': 'الانتقال إلى آية', inputmode: 'numeric', size: 16 });
  const jumpForm = h('form', { class: 'row', onsubmit: (e) => {
    e.preventDefault();
    const m = jump.value.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).match(/^(\d{1,3})\s*[:\/\s]\s*(\d{1,3})$/);
    if (!m || +m[1] < 1 || +m[1] > 114) return toast('اكتب رقم السورة ثم رقم الآية، مثل 2:255');
    go(`/quran/s/${m[1]}/a/${m[2]}`);
  } }, jump, h('button', { class: 'btn primary', type: 'submit' }, 'اذهب'));
  root.append(tools, jumpForm);

  const bm = bookmarks();
  if (bm.length) {
    const card = h('div', { class: 'card' }, h('h3', null, 'العلامات المرجعية'));
    bm.forEach((x) => {
      const row = h('div', { class: 'row between' },
        h('a', { href: `#/quran/s/${x.surah}/a/${x.ayah}` }, `سورة ${x.name || x.surah} — الآية ${toAr(x.ayah)}`),
        iconBtn('trash', 'حذف العلامة', () => {
          ls.set('qbookmarks', bookmarks().filter((y) => !(y.surah === x.surah && y.ayah === x.ayah)));
          row.remove(); if (!card.querySelector('.row')) card.remove();
        }));
      card.append(row);
    });
    root.append(card);
  }

  root.append(await offlineCard());

  const search = h('input', { type: 'search', placeholder: 'ابحث عن سورة بالاسم أو الرقم…', 'aria-label': 'ابحث عن سورة' });
  const box = h('div', { class: 'grid wide' }, loading());
  root.append(h('div', { class: 'row' }, search), box);
  try {
    const list = await api.surahList();
    const paint = () => {
      const q = normAr(search.value);
      const items = list.filter((s) => !q || String(s.number) === q || normAr(s.name).includes(q) || s.englishName.toLowerCase().includes(q));
      box.replaceChildren(...items.map((s) => h('a', { class: 'surah-item', href: `#/quran/s/${s.number}` },
        h('div', { class: 'surah-no' }, h('span', null, toAr(s.number))),
        h('div', null, h('div', { class: 'surah-name' }, s.name),
          h('div', { class: 'muted small' }, `${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${toAr(s.numberOfAyahs)} آية · ${s.englishName}`)))));
      if (!items.length) box.replaceChildren(h('p', { class: 'state' }, 'لا توجد نتائج'));
    };
    search.addEventListener('input', debounce(paint, 150)); paint();
  } catch (e) {
    box.replaceChildren(errorBox('تعذّر تحميل قائمة السور. تحقق من الاتصال. ملاحظة: بعد تنزيل المصحف يعمل القرآن دون إنترنت.', () => location.reload()));
  }
  return root;
}

async function offlineCard() {
  const card = h('div', { class: 'card' }, h('h3', null, 'القراءة دون إنترنت'));
  const status = h('p', { class: 'muted' });
  const btn = h('button', { class: 'btn', type: 'button' });
  const paint = async () => {
    const m = await api.quranOfflineMeta();
    status.textContent = m ? `المصحف محفوظ على جهازك (${toAr(m.ayahs)} آية). النص يعمل دون اتصال؛ الصوت والتفسير والترجمة يحتاجان إنترنت.` : 'نزّل نص المصحف كاملًا (حجمه نحو ١–٢ ميجابايت) ليعمل القرآن والبحث دون إنترنت.';
    btn.replaceChildren(icon(m ? 'trash' : 'download', 18), m ? 'حذف النسخة المحفوظة' : 'تنزيل المصحف');
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        if (m) { await api.deleteFullQuran(); toast('تم الحذف'); }
        else { await api.downloadFullQuran((s) => { status.textContent = s; }); toast('تم تنزيل المصحف والتحقق منه'); }
      } catch (e) { toast(`تعذّر: ${e.message}`); }
      btn.disabled = false; paint();
    };
  };
  card.append(status, btn); paint();
  return card;
}

/* ===================== القارئ ===================== */
async function readerView({ mode, n, ayah, go }) {
  const root = h('div');
  const body = h('div', { class: 'reader', 'aria-live': 'polite' }, loading('جارٍ تحميل النص…'));
  const head = h('div', { class: 'row between' });
  root.append(head);
  const cb = consentBar(); if (cb) root.append(cb);
  root.append(body);

  const state = { data: null, trans: null, audio: null, player: null, meta: null, surahs: [] };
  let disposed = false;
  const cleanup = () => { disposed = true; state.player?.destroy(); };

  try {
    state.surahs = await api.surahList().catch(() => []);
    state.data = mode === 's' ? await api.getSurah(n) : await api.getPage(n);
  } catch (e) {
    body.replaceChildren(errorBox(`تعذّر عرض النص (لن يُعرض نص غير مُتحقَّق منه): ${e.message}`, () => location.reload()));
    return { node: root, dispose: cleanup };
  }
  const surahMeta = (num) => state.surahs.find((s) => s.number === num);
  const first = state.data.ayahs[0];
  const surahNo = mode === 's' ? n : (first.surah?.number || 1);

  /* رأس القارئ والتنقل */
  const prev = mode === 's' ? n - 1 : n - 1, next = n + 1, max = mode === 's' ? 114 : PAGES;
  const base = mode === 's' ? '#/quran/s/' : '#/quran/p/';
  head.append(
    h('a', { class: 'btn', href: '#/quran' }, icon('back', 16), 'السور'),
    h('div', { class: 'row' },
      h('a', { class: 'btn', href: `#/quran/${mode === 's' ? 'p/' + (first.page || 1) : 's/' + surahNo}` }, mode === 's' ? 'بالصفحات' : 'بالسورة'),
      h('button', { class: 'btn', type: 'button', onclick: () => openSettingsSheet(rerender) }, icon('settings', 18), 'العرض')));

  const rerender = () => paintBody();

  function paintBody() {
    const ayahs = state.data.ayahs;
    const layout = settings.translation ? 'list' : settings.qLayout;
    const frag = document.createDocumentFragment();
    let flow = null;
    const closeFlow = () => { flow = null; };
    for (const ay of ayahs) {
      const sInfo = ay.surah || { number: state.data.number, name: state.data.name };
      let text = ay.text;
      if (ay.numberInSurah === 1) {
        closeFlow();
        frag.append(h('div', { class: 'banner' }, h('span', null, sInfo.name)));
        if (sInfo.number !== 1 && sInfo.number !== 9) {
          frag.append(h('div', { class: 'bsm' }, BSM));
          const parts = text.split(' ');
          if (normAr(parts[0]) === 'بسم') text = parts.slice(4).join(' ');
        }
      }
      const span = h('span', { class: 'ayah', tabindex: 0, role: 'button', 'aria-label': `الآية ${ay.numberInSurah}`, dataset: { s: sInfo.number, a: ay.numberInSurah }, onclick: () => openAyahSheet(sInfo, ay, text), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAyahSheet(sInfo, ay, text); } } }, text);
      const num = h('span', { class: 'num' }, toAr(ay.numberInSurah));
      if (layout === 'mushaf') {
        if (!flow) { flow = h('p', { class: 'flow' }); frag.append(flow); }
        flow.append(span, num, ' ');
      } else {
        const row = h('div', { class: 'ayah-row' }, h('p', { class: 'flow' }, span, num));
        const tr = state.trans?.get(`${sInfo.number}:${ay.numberInSurah}`);
        if (tr) row.append(h('p', { class: 'trans' }, tr));
        frag.append(row);
      }
    }
    if (mode === 'p') frag.append(h('p', { class: 'muted', style: undefined }, `صفحة ${toAr(n)} من ${toAr(PAGES)} · الجزء ${toAr(first.juz)}`));
    body.replaceChildren(frag);
  }

  async function loadTranslation() {
    state.trans = null;
    if (!settings.translation) return;
    try {
      const nums = [...new Set(state.data.ayahs.map((x) => (x.surah?.number || state.data.number)))];
      const map = new Map();
      for (const sn of nums) {
        const d = await api.getSurahEdition(sn, settings.translation);
        d.ayahs.forEach((x) => map.set(`${sn}:${x.numberInSurah}`, x.text));
      }
      state.trans = map;
    } catch { toast('تعذّر تحميل الترجمة'); }
  }

  /* نافذة الآية */
  function openAyahSheet(sInfo, ay, text) {
    const meta = surahMeta(sInfo.number);
    const ref = `${sInfo.number}:${ay.numberInSurah}`;
    const cite = `${text}\n\n(${sInfo.name} — الآية ${toAr(ay.numberInSurah)})`;
    const out = h('div');
    const sheet = openSheet(`${sInfo.name} — الآية ${toAr(ay.numberInSurah)}`, out);
    out.append(h('p', { class: 'ar-text' }, text));
    out.append(h('div', { class: 'row' },
      iconBtn('copy', 'نسخ الآية مع اسم السورة ورقمها', () => copyText(cite)),
      iconBtn('share', 'مشاركة', () => shareText(cite)),
      favBtn({ key: `ayah:${ref}`, type: 'ayah', title: `${sInfo.name} ${toAr(ay.numberInSurah)}`, text, source: 'القرآن الكريم', href: `#/quran/s/${sInfo.number}/a/${ay.numberInSurah}` }),
      iconBtn('bookmark', 'علامة مرجعية هنا', () => addBookmark(sInfo.number, ay.numberInSurah, sInfo.name))));
    if (mode === 's') {
      out.append(h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => { sheet.close(); startPlayer(ay.numberInSurah - 1); } }, icon('play', 16), 'استمع من هنا'),
        h('button', { class: 'btn', type: 'button', onclick: () => { state.rangeStart = ay.numberInSurah - 1; toast('بداية التكرار: هذه الآية'); } }, 'ابدأ التكرار من هنا'),
        h('button', { class: 'btn', type: 'button', onclick: () => { state.rangeEnd = ay.numberInSurah - 1; toast('نهاية التكرار: هذه الآية'); } }, 'انتهِ هنا')));
    }
    // التفسير
    const tafBox = h('div', { class: 'card' }, h('h3', null, 'التفسير'));
    const tafSel = h('select', { 'aria-label': 'اختر التفسير' });
    const tafOut = h('p', null, 'اختر تفسيرًا لعرضه.');
    api.editions('tafsir', 'ar').catch(() => [{ identifier: 'ar.muyassar', name: 'التفسير الميسر' }, { identifier: 'ar.jalalayn', name: 'تفسير الجلالين' }]).then((eds) => {
      tafSel.replaceChildren(h('option', { value: '' }, 'اختر…'), ...eds.map((e) => h('option', { value: e.identifier, selected: e.identifier === settings.tafsir }, e.name)));
      if (settings.tafsir && eds.some((e) => e.identifier === settings.tafsir)) loadTaf();
    });
    const tafSrc = h('p', { class: 'source' });
    async function loadTaf() {
      tafSrc.textContent = '';
      if (!tafSel.value) return;
      tafOut.replaceChildren(loading());
      try {
        const d = await api.getAyah(ref, tafSel.value);
        tafOut.textContent = d.text;
        tafSrc.textContent = `المصدر: ${tafSel.selectedOptions[0].textContent} (عبر AlQuran Cloud) — نص تفسيري وليس نص القرآن.`;
        setSetting('tafsir', tafSel.value);
      } catch { tafOut.replaceChildren(errorBox('تعذّر تحميل التفسير (يحتاج إنترنت).', loadTaf)); }
    }
    tafSel.addEventListener('change', loadTaf);
    tafBox.append(tafSel, tafOut, tafSrc);
    out.append(tafBox);
    void meta;
  }

  /* مشغّل التلاوة (آية بآية مع تكرار) */
  async function startPlayer(startIdx = 0) {
    if (mode !== 's') return toast('التلاوة متاحة في عرض السورة');
    try {
      const d = await api.getAudioSurah(n, settings.reciter);
      state.player?.destroy();
      state.player = makePlayer(d.ayahs.map((x) => x.audio), startIdx);
    } catch (e) { toast(`تعذّر تشغيل الصوت: ${e.message}`); }
  }
  function makePlayer(urls, startIdx) {
    const au = new Audio(); au.preload = 'auto';
    let i = startIdx, reps = 1, left = 1, playing = false;
    const rs = () => state.rangeStart ?? 0, re = () => state.rangeEnd ?? urls.length - 1;
    const bar = h('div', { class: 'player', role: 'region', 'aria-label': 'مشغّل التلاوة' });
    const label = h('b', { style: undefined });
    const playBtn = iconBtn('pause', 'إيقاف مؤقت', toggle);
    const repSel = h('select', { 'aria-label': 'عدد مرات التكرار', onchange: () => { reps = +repSel.value; left = reps || 1; } },
      ...[[1, 'بدون تكرار'], [3, '٣ مرات'], [5, '٥ مرات'], [10, '١٠ مرات'], [0, 'تكرار مستمر']].map(([v, t]) => h('option', { value: v }, t)));
    bar.append(iconBtn('prev', 'الآية السابقة', () => go_(i - 1)), playBtn, iconBtn('next', 'الآية التالية', () => go_(i + 1)), label, repSel, iconBtn('close', 'إغلاق المشغّل', destroy));
    document.body.append(bar);
    function mark() {
      document.querySelectorAll('.ayah.playing').forEach((x) => x.classList.remove('playing'));
      const el = document.querySelector(`.ayah[data-a="${i + 1}"]`);
      el?.classList.add('playing'); el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      label.textContent = `${state.data.name || ''} — آية ${toAr(i + 1)}`;
    }
    function go_(k) { i = Math.max(0, Math.min(urls.length - 1, k)); left = reps || 1; play(); }
    function play() { au.src = urls[i]; au.play().then(() => { playing = true; playBtn.replaceChildren(icon('pause', 20)); }).catch(() => { playing = false; playBtn.replaceChildren(icon('play', 20)); }); mark(); }
    function toggle() { if (au.paused) { au.play(); playBtn.replaceChildren(icon('pause', 20)); } else { au.pause(); playBtn.replaceChildren(icon('play', 20)); } }
    au.addEventListener('ended', () => {
      if (i < re()) { i++; play(); return; }
      if (reps === 0) { i = rs(); play(); return; }
      if (left > 1) { left--; i = rs(); play(); return; }
      playing = false; playBtn.replaceChildren(icon('play', 20));
    });
    au.addEventListener('error', () => toast('تعذّر تحميل الصوت (تحقق من الإنترنت)'));
    function destroy() { au.pause(); au.src = ''; bar.remove(); document.querySelectorAll('.ayah.playing').forEach((x) => x.classList.remove('playing')); state.player = null; }
    play(); void playing;
    return { destroy };
  }

  /* تنقل سابق/تالي */
  const pager = h('div', { class: 'row between' },
    prev >= 1 ? h('a', { class: 'btn', href: base + prev }, icon('back', 16), mode === 's' ? 'السورة السابقة' : 'الصفحة السابقة') : h('span'),
    next <= max ? h('a', { class: 'btn primary', href: base + next }, mode === 's' ? 'السورة التالية' : 'الصفحة التالية') : h('span'));
  const extras = h('div', { class: 'row' });
  if (mode === 's') extras.append(h('button', { class: 'btn gold', type: 'button', onclick: () => startPlayer(state.rangeStart ?? 0) }, icon('play', 16), 'استمع للسورة'));
  if (mode === 'p') extras.append(h('button', { class: 'btn', type: 'button', onclick: () => markKhatm(n) }, icon('check', 16), 'سجّلت قراءتي حتى هذه الصفحة'));
  root.append(extras, pager);

  await loadTranslation();
  paintBody();

  // الانتقال إلى آية محددة + حفظ الموضع
  if (ayah) { const el = body.querySelector(`.ayah[data-a="${ayah}"]`); el?.classList.add('marked'); el?.scrollIntoView({ block: 'center' }); }
  const meta = surahMeta(surahNo);
  const track = debounce(() => {
    if (settings.saveReading !== true || disposed) return;
    const el = [...body.querySelectorAll('.ayah')].find((x) => x.getBoundingClientRect().bottom > 140);
    if (el) saveLast({ surah: +el.dataset.s, ayah: +el.dataset.a, name: surahMeta(+el.dataset.s)?.name || state.data.name, page: first.page });
  }, 700);
  addEventListener('scroll', track, { passive: true });
  saveLast({ surah: surahNo, ayah: ayah || 1, name: meta?.name || state.data.name, page: first.page });

  return { node: root, dispose: () => { removeEventListener('scroll', track); cleanup(); } };
}

/* ---------- إعدادات العرض ---------- */
const FONTS = ['Amiri Quran', 'Scheherazade New', 'Amiri'];
async function openSettingsSheet(onChange) {
  const body = h('div');
  const sheet = openSheet('إعدادات العرض', body);
  void sheet;
  body.append(
    h('div', { class: 'row' }, h('label', null, 'الخط: '), (() => {
      const s = h('select', { onchange: () => { setSetting('qFont', s.value); onChange(); } }, ...FONTS.map((f) => h('option', { value: f, selected: f === settings.qFont }, f)));
      return s;
    })()),
    h('div', { class: 'row' }, h('span', null, 'حجم الخط:'),
      h('button', { class: 'btn', type: 'button', 'aria-label': 'تصغير الخط', onclick: () => { setSetting('qSize', Math.max(20, settings.qSize - 2)); onChange(); } }, 'أ−'),
      h('button', { class: 'btn', type: 'button', 'aria-label': 'تكبير الخط', onclick: () => { setSetting('qSize', Math.min(60, settings.qSize + 2)); onChange(); } }, 'أ+')),
    h('div', { class: 'row' }, h('span', null, 'شكل العرض:'), chips([['mushaf', 'مصحف متصل'], ['list', 'آية بآية']], settings.qLayout, (v) => { setSetting('qLayout', v); onChange(); }, 'شكل العرض')));
  const recSel = h('select', { 'aria-label': 'القارئ', onchange: () => setSetting('reciter', recSel.value) }, h('option', { value: settings.reciter }, settings.reciter));
  api.audioEditions().then((eds) => recSel.replaceChildren(...eds.map((e) => h('option', { value: e.identifier, selected: e.identifier === settings.reciter }, e.name)))).catch(() => {});
  body.append(h('div', { class: 'row' }, h('label', null, 'القارئ: '), recSel));
  const trSel = h('select', { 'aria-label': 'الترجمة', onchange: () => { setSetting('translation', trSel.value); onChange(); location.reload(); } }, h('option', { value: '' }, 'بدون ترجمة'));
  api.editions('translation').then((eds) => {
    const names = new Intl.DisplayNames(['ar'], { type: 'language' });
    const groups = {};
    eds.forEach((e) => (groups[e.language] ||= []).push(e));
    trSel.replaceChildren(h('option', { value: '' }, 'بدون ترجمة'), ...Object.entries(groups).sort().map(([lang, list]) =>
      h('optgroup', { label: (() => { try { return names.of(lang); } catch { return lang; } })() }, ...list.map((e) => h('option', { value: e.identifier, selected: e.identifier === settings.translation }, e.englishName || e.name)))));
  }).catch(() => trSel.append(h('option', { disabled: true }, 'تعذّر تحميل قائمة الترجمات')));
  body.append(h('div', { class: 'row' }, h('label', null, 'ترجمة المعاني: '), trSel), notice('الترجمات والتفاسير تُعرض كما وردت من مصدرها، وهي ليست نص القرآن.'));
}

/* ===================== الختمة ===================== */
function markKhatm(page) {
  const k = ls.get('khatm', null);
  if (!k) return toast('ابدأ ختمة أولًا من صفحة «ختمة القرآن»');
  k.read = Math.max(k.read || 0, page); ls.set('khatm', k); toast(`سُجّل: قرأت حتى صفحة ${toAr(page)}`);
}
function khatmView() {
  const root = h('div', null, pageHeader('ختمة القرآن', 'خطة بسيطة لمتابعة وردك اليومي (تُحفظ على جهازك فقط)'));
  const box = h('div');
  const paint = () => {
    const k = ls.get('khatm', null);
    box.replaceChildren();
    if (!k) {
      const days = h('input', { type: 'number', min: 1, max: 365, value: 30, 'aria-label': 'عدد الأيام' });
      box.append(h('div', { class: 'card' }, h('h3', null, 'ابدأ ختمة جديدة'), h('div', { class: 'row' }, h('span', null, 'أريد أن أختم خلال'), days, h('span', null, 'يومًا'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { const d = Math.max(1, Math.min(365, +days.value || 30)); ls.set('khatm', { start: dayKey(), days: d, read: 0 }); paint(); } }, 'ابدأ')),
        h('p', { class: 'muted' }, `المصحف ${toAr(PAGES)} صفحة؛ سنحسب لك الورد اليومي.`)));
      return;
    }
    const elapsed = Math.max(1, Math.floor((new Date(dayKey()) - new Date(k.start)) / 864e5) + 1);
    const perDay = Math.ceil(PAGES / k.days);
    const expected = Math.min(PAGES, perDay * Math.min(elapsed, k.days));
    const pct = Math.round((k.read / PAGES) * 100);
    const inp = h('input', { type: 'number', min: 0, max: PAGES, value: k.read, 'aria-label': 'آخر صفحة قرأتها' });
    box.append(h('div', { class: 'card' },
      h('h3', null, `اليوم ${toAr(Math.min(elapsed, k.days))} من ${toAr(k.days)}`),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: undefined, class: 'bar' })),
      h('p', null, `قرأت حتى صفحة ${toAr(k.read)} من ${toAr(PAGES)} (${toAr(pct)}٪). وردك اليومي ${toAr(perDay)} صفحات، والمفترض اليوم الوصول إلى صفحة ${toAr(expected)}.`),
      k.read >= PAGES ? h('p', null, 'أتممت الختمة — تقبّل الله منك.') : null,
      h('div', { class: 'row' }, h('label', null, 'آخر صفحة قرأتها:'), inp,
        h('button', { class: 'btn primary', type: 'button', onclick: () => { k.read = Math.max(0, Math.min(PAGES, +inp.value || 0)); ls.set('khatm', k); paint(); } }, 'تسجيل'),
        h('a', { class: 'btn', href: `#/quran/p/${Math.min(PAGES, Math.max(1, k.read + 1))}` }, 'تابع القراءة')),
      h('button', { class: 'btn', type: 'button', onclick: () => { if (confirm('حذف الختمة الحالية؟')) { ls.del('khatm'); paint(); } } }, 'إلغاء الختمة')));
    box.querySelector('.bar').style.setProperty('width', `${pct}%`);
  };
  paint(); root.append(box);
  return root;
}
void vibrate; void chips;
