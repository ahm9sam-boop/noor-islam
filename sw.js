// Service Worker — نور الإسلام
// - الملفات الأساسية: تُخزَّن عند التثبيت وتُخدم من الكاش (cache-first) مع تحديث بالخلفية.
// - بيانات الـ API: stale-while-revalidate لطلبات GET فقط (القرآن/الأحاديث/الأذكار/المواقيت).
// - الصوت لا يُخزَّن (طلبات Range وحقوق الاستخدام).
// - عند فشل التنقل: صفحة offline.html.
const VERSION = 'v3';
const SHELL = `noor-shell-${VERSION}`;
const DATA = `noor-data-${VERSION}`;
const FONTS = `noor-fonts-${VERSION}`;

const SHELL_FILES = [
  './',
  'index.html',
  'offline.html',
  'manifest.webmanifest',
  'styles.css',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'config.js',
  'lib-api.js',
  'lib-favorites.js',
  'lib-icons.js',
  'lib-prayer.js',
  'lib-settings.js',
  'lib-store.js',
  'lib-ui.js',
  'lib-util.js',
  'main.js',
  'page-azkar.js',
  'page-calendar.js',
  'page-duas.js',
  'page-favorites.js',
  'page-hadith.js',
  'page-home.js',
  'page-info.js',
  'page-learn.js',
  'page-more.js',
  'page-names.js',
  'page-prayer.js',
  'page-qibla.js',
  'page-quran.js',
  'page-ramadan.js',
  'page-search.js',
  'page-settings.js',
  'page-share.js',
  'page-tasbeeh.js'
];
const API_HOSTS = ['api.alquran.cloud', 'api.aladhan.com', 'cdn.jsdelivr.net', 'raw.githubusercontent.com', 'api.islamic.app'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, DATA, FONTS]);
    for (const k of await caches.keys()) if (!keep.has(k) && k.startsWith('noor-')) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || new Response(JSON.stringify({ code: 503, status: 'offline', data: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(async () => (await caches.match('index.html')) || (await caches.match('offline.html'))));
    return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || (req.destination === 'document' ? caches.match('offline.html') : Response.error());
    })());
    return;
  }
  if (API_HOSTS.includes(url.hostname)) { e.respondWith(staleWhileRevalidate(req, DATA)); return; }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(staleWhileRevalidate(req, FONTS)); }
});
