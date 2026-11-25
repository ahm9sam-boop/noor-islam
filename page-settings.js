import { h, toAr, toast } from './lib-util.js';
import { settings, setSetting, resetSettings } from './lib-settings.js';
import { ls, idb } from './lib-store.js';
import { chips, notice, pageHeader } from './lib-ui.js';
import { canInstall, install } from './main.js';
import { clearMemCache } from './lib-api.js';
import { citySelect } from './lib-prayer.js';
import { hasNative, getRem, setRem, nativeStatus, askPerms } from './lib-native.js';


function remCard() {
  const r = getRem();
  const c = h('div', { class: 'card' }, h('h3', null, 'التذكيرات والإشعارات'));
  if (!hasNative()) { c.append(h('p', { class: 'muted small' }, 'التذكيرات تعمل داخل تطبيق الأندرويد فقط.')); return c; }
  const cb = (label, key, sub) => h('label', null, h('input', { type: 'checkbox', checked: sub ? r.prayers[key] : r[key], onchange: (e) => { if (sub) setRem({ prayers: { ...getRem().prayers, [key]: e.target.checked } }); else setRem({ [key]: e.target.checked }); } }), ` ${label}`);
  const time = (key) => h('input', { type: 'time', value: r[key], onchange: (e) => setRem({ [key]: e.target.value || r[key] }) });
  const sal = h('select', { onchange: (e) => { const v = e.target.value; if (v === 'c') { const m = parseInt(prompt('كل كم دقيقة؟ (٥ أو أكثر)', '20'), 10); if (m >= 5) setRem({ salMin: m }); } else setRem({ salMin: +v }); } },
    ...[[0, 'إيقاف'], [5, 'كل ٥ دقائق'], [10, 'كل ١٠ دقائق'], [15, 'كل ١٥ دقيقة'], [30, 'كل ٣٠ دقيقة'], [60, 'كل ساعة'], ['c', 'مخصص…']].map(([v, t]) => h('option', { value: v, selected: r.salMin === v || (v === 'c' && ![0, 5, 10, 15, 30, 60].includes(r.salMin)) }, v === 'c' && r.salMin && ![0, 5, 10, 15, 30, 60].includes(r.salMin) ? `كل ${r.salMin} دقيقة` : t)));
  c.append(cb('تفعيل التذكيرات', 'on'),
    h('p', { class: 'muted small' }, 'تصلك الإشعارات حتى والتطبيق مغلق. اسمح بالإشعارات وبالتنبيهات الدقيقة عند الطلب.'),
    h('button', { class: 'btn', type: 'button', onclick: () => { askPerms(); setTimeout(() => toast(nativeStatus().notif ? (nativeStatus().exact ? 'الأذونات مفعّلة' : 'فعّل "المنبهات والتذكيرات" للتوقيت الدقيق') : 'اسمح بالإشعارات'), 1500); } }, 'ضبط الأذونات'),
    h('h4', null, 'مواقيت الصلاة'), ...['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((k) => [cb({ Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' }[k], k, true), h('br')]).flat(),
    h('h4', null, 'الصلاة على النبي ﷺ'), h('div', { class: 'row' }, sal),
    cb('نطق "صلِّ على محمد" بصوت مع الإشعار', 'speak'),
    h('p', { class: 'muted small' }, 'لا يصلك تذكير بالصلاة على النبي ليلًا (من ١١ مساءً حتى ٦ صباحًا). النطق يحتاج صوت عربي في الهاتف.'),
    h('h4', null, 'الأذكار والورد'), cb('أذكار الصباح والمساء', 'adhkar'),
    h('div', { class: 'row' }, 'الصباح ', time('morningAt'), ' المساء ', time('eveningAt')),
    cb('تذكير بالورد من القرآن', 'quran'), h('div', { class: 'row' }, time('quranAt')),
    cb('آية اليوم (إشعار صباحي)', 'ayah'), h('div', { class: 'row' }, time('ayahAt')),
    h('p', { class: 'muted small' }, 'ويدجت آية اليوم: اضغط مطولًا على الشاشة الرئيسية ثم الأدوات ثم اختر التطبيق.'));
  return c;
}

export function render() {
  const root = h('div', null, pageHeader('الإعدادات', 'تُحفظ على هذا الجهاز فقط'));
  root.append(h('div', { class: 'card' }, h('h3', null, 'المظهر'),
    (() => {
      const cols = { brown: '#6b3f23', green: '#0f4c3a', blue: '#14407a', purple: '#4a2a73', night: '#0a1020' };
      const names = { brown: 'بني', green: 'أخضر', blue: 'أزرق', purple: 'بنفسجي', night: 'ليلي' };
      const row = h('div', { class: 'palette-row', role: 'group', 'aria-label': 'لون التطبيق' });
      const paint = () => row.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === settings.palette)));
      Object.keys(cols).forEach((k) => row.append(h('button', { type: 'button', class: 'swatch', 'data-k': k, title: names[k], 'aria-label': names[k], style: `background:${cols[k]}`, onclick: () => { setSetting('palette', k); paint(); } })));
      paint(); return row;
    })(),
    h('div', { class: 'row' }, h('label', { for: 'scale' }, 'حجم الواجهة: '),
      h('input', { id: 'scale', type: 'range', min: 0.85, max: 1.5, step: 0.05, value: settings.scale, oninput: (e) => setSetting('scale', +e.target.value) }))));
  root.append(h('div', { class: 'card' }, h('h3', null, 'المدينة (لمواقيت الصلاة والقبلة)'), citySelect(() => toast('تم تغيير المدينة')),
    h('p', { class: 'muted small' }, 'الافتراضي القاهرة. لمدينة غير موجودة استخدم صفحة مواقيت الصلاة.')));
  root.append(remCard());
  root.append(h('div', { class: 'card' }, h('h3', null, 'المسبحة'),
    h('label', null, h('input', { type: 'checkbox', checked: settings.haptic, onchange: (e) => setSetting('haptic', e.target.checked) }), ' اهتزاز عند الضغط'), h('br'),
    h('label', null, h('input', { type: 'checkbox', checked: settings.sound, onchange: (e) => setSetting('sound', e.target.checked) }), ' صوت خفيف')));
  root.append(h('div', { class: 'card' }, h('h3', null, 'القراءة'),
    h('label', null, h('input', { type: 'checkbox', checked: settings.saveReading === true, onchange: (e) => { setSetting('saveReading', e.target.checked); if (!e.target.checked) ls.del('lastRead'); } }), ' احفظ آخر موضع قراءة على هذا الجهاز'),
    h('p', { class: 'muted small' }, 'طريقة حساب المواقيت وموقعك تُضبط من صفحة مواقيت الصلاة.')));

  const storageBox = h('p', { class: 'muted small' }, 'جارٍ حساب المساحة…');
  navigator.storage?.estimate?.().then((e) => { storageBox.textContent = `المساحة المستخدمة: ${toAr((e.usage / 1048576).toFixed(1))} ميجابايت من ${toAr(Math.round(e.quota / 1048576))}`; }).catch(() => { storageBox.textContent = ''; });
  const inst = h('button', { class: 'btn gold', type: 'button', onclick: async () => { (await install()) ? toast('تم التثبيت') : toast('التثبيت غير متاح الآن'); } }, 'تثبيت التطبيق على هاتفك');
  inst.hidden = !canInstall(); addEventListener('noor:installable', () => { inst.hidden = false; });
  root.append(h('div', { class: 'card' }, h('h3', null, 'التثبيت والبيانات'), inst, storageBox,
    h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: async () => {
      if (!confirm('سيُحذف كل ما على هذا الجهاز: المفضلة، العلامات، الختمة، المسبحة، الكتب المنزّلة والإعدادات. متابعة؟')) return;
      ls.clearAll(); await idb.clear(); clearMemCache(); resetSettings();
      try { for (const k of await caches.keys()) if (k.startsWith('noor-data')) await caches.delete(k); } catch { /* ignore */ }
      toast('تم حذف البيانات'); setTimeout(() => location.reload(), 600);
    } }, 'حذف كل بياناتي من هذا الجهاز'))));
  root.append(notice('لا يوجد حساب. كل ما تحفظه يبقى في متصفحك.'));
  return root;
}
