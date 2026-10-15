import { h, toAr, toast } from './lib-util.js';
import { settings, setSetting, resetSettings } from './lib-settings.js';
import { ls, idb } from './lib-store.js';
import { chips, notice, pageHeader } from './lib-ui.js';
import { canInstall, install } from './main.js';
import { clearMemCache } from './lib-api.js';

export function render() {
  const root = h('div', null, pageHeader('الإعدادات', 'تُحفظ على هذا الجهاز فقط'));
  root.append(h('div', { class: 'card' }, h('h3', null, 'المظهر'),
    chips([['auto', 'تلقائي'], ['light', 'نهاري'], ['dark', 'ليلي']], settings.theme, (v) => setSetting('theme', v), 'المظهر'),
    h('div', { class: 'row' }, h('label', { for: 'scale' }, 'حجم الواجهة: '),
      h('input', { id: 'scale', type: 'range', min: 0.85, max: 1.5, step: 0.05, value: settings.scale, oninput: (e) => setSetting('scale', +e.target.value) }))));
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
  root.append(notice('لا يوجد حساب ولا تتبّع. كل ما تحفظه يبقى في متصفحك.'));
  return root;
}
