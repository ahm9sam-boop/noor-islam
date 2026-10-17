import { h, toast, copyText } from './lib-util.js';
import { icon } from './lib-icons.js';
import { notice, pageHeader } from './lib-ui.js';
import { APP_VERSION } from './config.js';

const MSG = 'نور الإسلام: القرآن الكريم والأذكار والمسبحة ومواقيت الصلاة والقبلة في تطبيق واحد مجاني وبلا حساب.';
const appUrl = () => location.origin + (location.pathname || '/').replace(/index\.html$/, '');
const same = (a, b) => { if (a.byteLength !== b.byteLength) return false; const x = new Uint8Array(a), y = new Uint8Array(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; return true; };

async function nativeShare() {
  const data = { title: 'نور الإسلام', text: MSG, url: appUrl() };
  if (navigator.share) {
    try { await navigator.share(data); } catch (e) { if (e.name !== 'AbortError') await copyText(`${MSG}\n${data.url}`); }
  } else { await copyText(`${MSG}\n${data.url}`); toast('المشاركة المباشرة غير مدعومة هنا، فنُسخ الرابط'); }
}

/** يجلب كل ملفات التطبيق من الخادم متجاوزًا كاش المتصفح، ويستبدل المخزَّن إن اختلف. */
async function refreshFiles() {
  const names = (await caches.keys()).filter((k) => k.startsWith('noor-shell-'));
  if (!names.length) throw new Error('لا توجد نسخة مخزنة بعد؛ افتح التطبيق مع الإنترنت مرة ثم أعد المحاولة.');
  const cache = await caches.open(names[0]);
  const reqs = await cache.keys();
  let changed = 0, failed = 0;
  for (const req of reqs) {
    try {
      const res = await fetch(req.url, { cache: 'reload' });
      if (!res.ok) { failed++; continue; }
      const fresh = await res.clone().arrayBuffer();
      const old = await cache.match(req);
      if (!old || !same(fresh, await old.arrayBuffer())) { await cache.put(req, res); changed++; }
    } catch { failed++; }
  }
  return { changed, failed, total: reqs.length };
}

export function render() {
  const url = appUrl();
  const root = h('div', null, pageHeader('شارك التطبيق', 'ساهم في نشر الخير: أرسل التطبيق لمن تحب'));

  /* المشاركة */
  const enc = encodeURIComponent(`${MSG}\n${url}`);
  root.append(h('div', { class: 'card' }, h('h3', null, 'شارك الرابط'),
    h('p', { class: 'muted', dir: 'ltr', style: undefined }, url),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'button', onclick: nativeShare }, icon('share', 18), 'شارك التطبيق'),
      h('button', { class: 'btn', type: 'button', onclick: () => copyText(url) }, icon('copy', 18), 'نسخ الرابط'),
      h('a', { class: 'btn', href: `https://wa.me/?text=${enc}`, target: '_blank', rel: 'noopener noreferrer' }, 'واتساب'),
      h('a', { class: 'btn', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(MSG)}`, target: '_blank', rel: 'noopener noreferrer' }, 'تيليجرام')),
    url.startsWith('http') ? null : notice('الرابط لن يعمل لغيرك قبل نشر الموقع على الإنترنت.', 'warn')));
  root.append(h('div', { class: 'card' }, h('h3', null, 'كيف يثبّته من أرسلته له؟'),
    h('ul', null, h('li', null, 'أندرويد (Chrome): القائمة ⋮ ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'),
      h('li', null, 'آيفون (Safari): زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».'))));

  /* التحديث */
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, `إصدار التطبيق: ${APP_VERSION}`);
  const reloadBtn = h('button', { class: 'btn gold', type: 'button', hidden: true, onclick: () => location.reload() }, 'إعادة تشغيل التطبيق الآن');
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, icon('reset', 18), 'تحقق من التحديثات وحدّث');
  const fullBtn = h('button', { class: 'btn', type: 'button' }, 'تحديث كامل (إعادة تحميل كل ملفات التطبيق)');
  const busy = (b) => { checkBtn.disabled = fullBtn.disabled = b; };

  checkBtn.addEventListener('click', async () => {
    if (!navigator.onLine) return void (status.textContent = 'لا يوجد اتصال بالإنترنت الآن.');
    busy(true); status.textContent = 'جارٍ الفحص…'; reloadBtn.hidden = true;
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      if (reg) await reg.update().catch(() => {});
      const r = await refreshFiles();
      if (r.failed && !r.changed) status.textContent = 'تعذّر الفحص؛ تأكد من الاتصال وحاول مرة أخرى.';
      else if (r.changed) { status.textContent = `تم تنزيل التحديث (${r.changed} ملف). أعد تشغيل التطبيق لتفعيله.`; reloadBtn.hidden = false; }
      else status.textContent = `أنت على آخر إصدار (${APP_VERSION}).`;
    } catch (e) { status.textContent = e.message; }
    busy(false);
  });

  fullBtn.addEventListener('click', async () => {
    if (!navigator.onLine) return void (status.textContent = 'التحديث الكامل يحتاج اتصالًا بالإنترنت.');
    if (!confirm('سيُعاد تحميل كل ملفات التطبيق من الإنترنت. مفضلتك وإعداداتك والمصحف والكتب المنزّلة لن تُحذف. متابعة؟')) return;
    busy(true); status.textContent = 'جارٍ التحديث الكامل…';
    try {
      const urls = [];
      for (const k of (await caches.keys()).filter((x) => x.startsWith('noor-shell-'))) for (const r of await (await caches.open(k)).keys()) urls.push(r.url);
      await Promise.all(urls.map((u) => fetch(u, { cache: 'reload' }).catch(() => {})));
      for (const k of await caches.keys()) if (k.startsWith('noor-')) await caches.delete(k);
      const reg = await navigator.serviceWorker?.getRegistration?.();
      await reg?.unregister();
      location.reload();
    } catch (e) { status.textContent = `تعذّر التحديث الكامل: ${e.message}`; busy(false); }
  });

  root.append(h('div', { class: 'card' }, h('h3', null, 'تحديث التطبيق'),
    h('p', null, 'يفحص وجود إصدار أحدث ويحمّله، ويشمل الصفحات والتصميم والأيقونات داخل التطبيق.'),
    h('div', { class: 'row' }, checkBtn, fullBtn), status, reloadBtn,
    notice('أيقونة التطبيق على الشاشة الرئيسية يديرها نظام الهاتف وليس الموقع، فلا يمكن تغييرها من هنا. في أندرويد (Chrome) تتحدّث الأيقونة والاسم تلقائيًا خلال يوم أو أكثر بعد نشر التغيير، وفي الآيفون تحتاج إلى حذف التطبيق وإضافته من جديد.')));
  return root;
}
