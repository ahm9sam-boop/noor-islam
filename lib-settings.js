import { ls } from './lib-store.js';

const DEFAULTS = {
  theme: 'auto',            // auto | light | dark
  scale: 1,                 // تكبير الواجهة
  qFont: 'Amiri Quran',     // خط المصحف
  qSize: 30,                // حجم خط المصحف بالبكسل
  qLayout: 'mushaf',        // mushaf | list
  reciter: 'ar.alafasy',
  translation: '',          // معرّف الترجمة أو فارغ
  tafsir: 'ar.muyassar',
  haptic: true,             // اهتزاز المسبحة
  sound: false,             // صوت المسبحة
  method: 5,                // طريقة حساب المواقيت (5 = الهيئة المصرية العامة للمساحة)
  school: 0,                // 0 شافعي/جمهور، 1 حنفي
  place: null,              // {label, city, country, lat, lng}
  saveReading: null,        // null = لم يُسأل بعد، true/false = موافقة المستخدم
  notify: false
};

export const settings = { ...DEFAULTS, ...(ls.get('settings', {}) || {}) };

export function applySettings() {
  const r = document.documentElement;
  let t = settings.theme;
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  r.dataset.theme = t;
  r.style.fontSize = `${Math.round(settings.scale * 100)}%`;
  r.style.setProperty('--qfs', `${settings.qSize}px`);
  r.style.setProperty('--qfont', `'${settings.qFont}', 'Amiri Quran', 'Scheherazade New', serif`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === 'dark' ? '#0b1512' : '#0f4c3a';
}

export function setSetting(k, v) {
  settings[k] = v;
  ls.set('settings', settings);
  applySettings();
}

export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  ls.set('settings', settings);
  applySettings();
}
