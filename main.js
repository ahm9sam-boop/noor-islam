import { $, h } from './lib-util.js';
import { icon } from './lib-icons.js';
import { applySettings, settings, setSetting } from './lib-settings.js';
import { errorBox, loading } from './lib-ui.js';

applySettings();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applySettings);

export const ROUTES = {
  '': { title: 'الرئيسية', mod: './page-home.js', icon: 'home' },
  quran: { title: 'القرآن الكريم', mod: './page-quran.js', icon: 'quran' },
  azkar: { title: 'الأذكار', mod: './page-azkar.js', icon: 'azkar' },
  tasbeeh: { title: 'المسبحة', mod: './page-tasbeeh.js', icon: 'tasbeeh' },
  duas: { title: 'الأدعية', mod: './page-duas.js', icon: 'dua' },
  hadith: { title: 'الأحاديث', mod: './page-hadith.js', icon: 'hadith' },
  prayer: { title: 'مواقيت الصلاة', mod: './page-prayer.js', icon: 'prayer' },
  qibla: { title: 'اتجاه القبلة', mod: './page-qibla.js', icon: 'qibla' },
  names: { title: 'أسماء الله الحسنى', mod: './page-names.js', icon: 'names' },
  calendar: { title: 'التقويم الهجري', mod: './page-calendar.js', icon: 'calendar' },
  ramadan: { title: 'رمضان', mod: './page-ramadan.js', icon: 'ramadan' },
  learn: { title: 'تعلّم', mod: './page-learn.js', icon: 'learn' },
  search: { title: 'البحث', mod: './page-search.js', icon: 'search', hidden: true },
  favorites: { title: 'المفضلة', mod: './page-favorites.js', icon: 'heart' },
  settings: { title: 'الإعدادات', mod: './page-settings.js', icon: 'settings', hidden: true },
  more: { title: 'المزيد', mod: './page-more.js', icon: 'menu', hidden: true },
  about: { title: 'عن الموقع ومصادره', mod: './page-info.js', icon: 'info', hidden: true },
  privacy: { title: 'سياسة الخصوصية', mod: './page-info.js', icon: 'info', hidden: true },
  terms: { title: 'شروط الاستخدام', mod: './page-info.js', icon: 'info', hidden: true },
  contact: { title: 'تواصل معنا', mod: './page-info.js', icon: 'info', hidden: true }
};
const BOTTOM = ['', 'quran', 'azkar', 'tasbeeh', 'more'];
const app = $('#app');
let dispose = null;

export function parseHash(hash = location.hash) {
  const [path, qs = ''] = hash.replace(/^#\/?/, '').split('?');
  const segs = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: segs[0] || '', params: segs.slice(1), query: Object.fromEntries(new URLSearchParams(qs)) };
}
export const go = (path) => { location.hash = path; };

function buildNav() {
  const side = $('#side-nav'), bottom = $('#bottom-nav');
  const link = (k, r, cls) => h('a', { href: `#/${k}`, class: cls, dataset: { r: k } }, icon(r.icon, 22), h('span', null, r.title));
  side.replaceChildren(...Object.entries(ROUTES).filter(([, r]) => !r.hidden).map(([k, r]) => link(k, r, 'nav-link')));
  side.append(link('settings', ROUTES.settings, 'nav-link'));
  bottom.replaceChildren(...BOTTOM.map((k) => link(k, ROUTES[k], 'nav-link')));
}
function markActive(name) {
  document.querySelectorAll('[data-r]').forEach((a) => {
    const on = a.dataset.r === name || (a.dataset.r === 'more' && !BOTTOM.includes(name));
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
}

async function route() {
  try { dispose?.(); } catch (e) { console.error(e); }
  dispose = null;
  const { name, params, query } = parseHash();
  const def = ROUTES[name] || ROUTES[''];
  const key = ROUTES[name] ? name : '';
  markActive(key);
  document.title = key ? `${def.title} | تطبيق القرآن الكريم والأحاديث الشريفة` : 'تطبيق القرآن الكريم والأحاديث الشريفة';
  app.setAttribute('aria-busy', 'true');
  app.replaceChildren(loading());
  try {
    const mod = await import(def.mod);
    const out = await mod.render({ name: key, params, query, go });
    const node = out?.node || out;
    dispose = out?.dispose || null;
    app.replaceChildren(node);
  } catch (e) {
    console.error(e);
    app.replaceChildren(errorBox(`تعذّر فتح الصفحة: ${e.message}`, route));
  } finally { app.removeAttribute('aria-busy'); }
  if (!query.keep) window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

function buildHeader() {
  const form = $('#search-form'), input = $('#search-input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v) go(`/search?q=${encodeURIComponent(v)}`);
  });
  const themeBtn = $('#theme-btn');
  const paint = () => { const dark = document.documentElement.dataset.theme === 'dark'; themeBtn.replaceChildren(icon(dark ? 'sun' : 'moon', 20)); themeBtn.setAttribute('aria-label', dark ? 'الوضع النهاري' : 'الوضع الليلي'); };
  themeBtn.addEventListener('click', () => { const dark = document.documentElement.dataset.theme === 'dark'; setSetting('theme', dark ? 'light' : 'dark'); paint(); });
  paint();
  $('#settings-btn').replaceChildren(icon('settings', 20));
  $('#search-icon').replaceChildren(icon('search', 18));
}

let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; dispatchEvent(new Event('noor:installable')); });
export const canInstall = () => !!installEvt;
export async function install() { if (!installEvt) return false; installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; return r.outcome === 'accepted'; }

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW:', e)));
}

buildNav(); buildHeader();
addEventListener('hashchange', route);
route();
void settings;
