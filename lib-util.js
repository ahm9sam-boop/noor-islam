// أدوات عامة: بناء عناصر DOM بأمان (بدون innerHTML)، تطبيع النص العربي، التواريخ.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return el;
}

/** h('div', {class:'x', onclick: fn}, 'نص', childNode) — كل النصوص تُضاف كـ text node (آمن من XSS). */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (['value', 'checked', 'disabled', 'hidden', 'selected'].includes(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  return append(el, kids);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ---------- الأرقام والنصوص العربية ---------- */
export const toAr = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;
const CHAR_MAP = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };

/** تطبيع للبحث: إزالة التشكيل وتوحيد الهمزات والألف المقصورة والتاء المربوطة. */
export function normAr(s) { return normMap(s).n; }

function normMap(s) {
  const str = String(s ?? '');
  let n = '';
  const map = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (TASHKEEL.test(c)) continue;
    const m = CHAR_MAP[c] ?? c.toLowerCase();
    for (const ch of m) { n += ch; map.push(i); }
  }
  return { n, map, str };
}

/** يرجع DocumentFragment فيه النص مع تمييز الكلمات المطابقة (يتجاهل التشكيل). */
export function highlight(text, query) {
  const frag = document.createDocumentFragment();
  const q = normAr(query);
  const { n, map, str } = normMap(text);
  if (!q) { frag.append(str); return frag; }
  let last = 0, from = 0;
  for (;;) {
    const i = n.indexOf(q, from);
    if (i < 0) break;
    const s = map[i];
    let e = map[i + q.length - 1] + 1;
    while (e < str.length && TASHKEEL.test(str[e])) e++;
    if (s < last) { from = i + 1; continue; }
    frag.append(str.slice(last, s));
    frag.append(h('mark', null, str.slice(s, e)));
    last = e; from = i + q.length;
  }
  frag.append(str.slice(last));
  return frag;
}

/* ---------- التواريخ ---------- */
export const pad2 = (n) => String(n).padStart(2, '0');
export const dmy = (d) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export function dayOfYear(d = new Date()) {
  return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 864e5);
}
/** رقم ثابت لليوم (نفسه لكل الأجهزة) لاختيار محتوى اليوم. */
export const daySeed = (d = new Date()) => d.getFullYear() * 400 + dayOfYear(d);

export function hijriParts(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { d: +p.day, m: +p.month, y: parseInt(p.year, 10) };
}
export const hijriLabel = (date = new Date()) =>
  new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
export const gregLabel = (date = new Date()) =>
  new Intl.DateTimeFormat('ar-EG-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
export const hijriMonthName = (date) =>
  new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura', { month: 'long' }).format(date);

/* ---------- حافظة / مشاركة / إشعار ---------- */
let toastTimer;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite', class: 'toast' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = h('textarea', { 'aria-hidden': 'true' }); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
  toast('تم النسخ');
}
export async function shareText(text, title = 'نور الإسلام') {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  await copyText(text);
  toast('تم النسخ — الصقه في أي تطبيق للمشاركة');
}
