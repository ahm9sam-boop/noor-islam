// مكوّنات واجهة مشتركة.
import { h, copyText, shareText, toast } from './lib-util.js';
import { icon } from './lib-icons.js';
import { isFav, toggleFav, onFavsChange } from './lib-favorites.js';

export function iconBtn(name, label, onclick, extra = {}) {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onclick, ...extra }, icon(name, 20));
}

export function favBtn(item) {
  const b = h('button', { type: 'button', class: 'icon-btn fav', title: 'المفضلة' });
  const paint = () => {
    const on = isFav(item.key);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة');
    b.replaceChildren(icon('heart', 20));
    b.classList.toggle('on', on);
  };
  b.addEventListener('click', () => { toast(toggleFav(item) ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة'); paint(); });
  onFavsChange(paint);
  paint();
  return b;
}

/** شريط إجراءات: نسخ + مشاركة + مفضلة (+ أزرار إضافية). */
export function actions({ text, fav, extra = [] }) {
  return h('div', { class: 'actions' },
    iconBtn('copy', 'نسخ', () => copyText(text)),
    iconBtn('share', 'مشاركة', () => shareText(text)),
    fav ? favBtn(fav) : null,
    ...extra);
}

export const loading = (msg = 'جارٍ التحميل…') => h('div', { class: 'state', role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), msg);

export function errorBox(msg, retry) {
  return h('div', { class: 'state error', role: 'alert' },
    h('p', null, msg),
    retry ? h('button', { type: 'button', class: 'btn', onclick: retry }, 'أعد المحاولة') : null);
}
/** حالة "غير متوفر": تُستخدم عندما لا يوجد مصدر موثّق بدل اختلاق محتوى. */
export function unavailable(title, body, hint) {
  return h('div', { class: 'state unavailable' }, h('h3', null, title), h('p', null, body), hint ? h('p', { class: 'muted small' }, hint) : null);
}
export const notice = (msg, kind = 'info') => h('p', { class: `notice ${kind}` }, icon('info', 18), h('span', null, msg));

export function pageHeader(title, sub, ...right) {
  return h('header', { class: 'page-head' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'muted' }, sub) : null), right.length ? h('div', { class: 'page-head-actions' }, ...right) : null);
}

/** مجموعة أزرار اختيار (chips). */
export function chips(options, value, onChange, label = '') {
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': label });
  const paint = (v) => [...wrap.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  options.forEach(([v, text]) => wrap.append(h('button', { type: 'button', class: 'chip', dataset: { v: String(v) }, onclick: () => { paint(v); onChange(v); } }, text)));
  paint(value);
  return wrap;
}

export function sourceLine(text) { return h('p', { class: 'source' }, 'المصدر: ', text); }

/** نافذة سفلية/منبثقة بسيطة وقابلة للوصول. تعيد {close}. */
export function openSheet(title, body) {
  const prev = document.activeElement;
  const dlg = h('dialog', { class: 'sheet', 'aria-label': title });
  const close = () => { dlg.close(); };
  dlg.append(h('div', { class: 'sheet-head' }, h('h2', null, title), iconBtn('close', 'إغلاق', close)), h('div', { class: 'sheet-body' }, body));
  dlg.addEventListener('close', () => { dlg.remove(); prev?.focus?.(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { close, dialog: dlg };
}

export function vibrate(p) { try { navigator.vibrate?.(p); } catch { /* ignore */ } }
