import { h } from './lib-util.js';
import { icon } from './lib-icons.js';
import { pageHeader } from './lib-ui.js';
import { ROUTES } from './main.js';

const MSG = 'تطبيق القرآن الكريم والأحاديث الشريفة: القرآن كاملاً بدون إنترنت، الأذكار، مواقيت الصلاة، القبلة وأكثر. حمّله من هنا:';
async function shareApp() {
  let link = 'https://ahm9sam-boop.github.io/noor-islam/';
  const native = typeof window.NoorNative !== 'undefined' && window.NoorNative && window.NoorNative.share;
  if (native) { try { const r = await fetch('./share.json?t=' + Date.now(), { cache: 'no-store' }); link = (await r.json()).link || link; } catch { link = 'https://drive.google.com/file/d/1NUjjoOhU44BtG62N0akg6IGsBroB1B0Y/view?usp=drivesdk'; } window.NoorNative.share(MSG + '\n' + link); return; }
  if (navigator.share) { try { await navigator.share({ title: 'تطبيق القرآن الكريم والأحاديث الشريفة', text: MSG, url: link }); } catch { /* cancelled */ } }
  else if (navigator.clipboard) { try { await navigator.clipboard.writeText(MSG + '\n' + link); alert('تم نسخ الرابط'); } catch { /* ignore */ } }
}

export function render() {
  const items = Object.entries(ROUTES).filter(([k, r]) => !r.hidden || ['settings', 'about', 'privacy', 'terms', 'contact'].includes(k) ).filter(([k]) => k !== '' && k !== 'more');
  return h('div', null, pageHeader('المزيد', 'كل أقسام الموقع'),
    h('button', { class: 'quick', style: 'width:100%;margin-bottom:12px;font:inherit;cursor:pointer', onclick: shareApp }, '📤 شارك التطبيق'),
    h('div', { class: 'grid' }, ...items.map(([k, r]) => h('a', { class: 'quick', href: `#/${k}` }, icon(r.icon, 28), r.title))));
}
