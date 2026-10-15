import { h, toAr, dmy, gregLabel, pad2 } from './lib-util.js';
import { icon } from './lib-icons.js';
import { settings, setSetting } from './lib-settings.js';
import { errorBox, loading, notice, pageHeader, chips } from './lib-ui.js';
import { toast } from './lib-util.js';
import { cached, getTimings, getMonthTimings, prayerMethods } from './lib-api.js';
import { PRAYER_LIST, fmt12, fmtDur, nextPrayer, secsOf, askLocation, savePlace, placeLabel, placeKey, METHOD_AR } from './lib-prayer.js';

export async function render() {
  const root = h('div', null, pageHeader('مواقيت الصلاة', 'تُحسب من خدمة AlAdhan حسب مدينتك وطريقة الحساب التي تختارها'));
  let timer = null; let offset = 0; let view = 'day'; let month = new Date();
  const dispose = () => clearInterval(timer);

  /* اختيار المكان */
  const city = h('input', { type: 'text', placeholder: 'المدينة (بالإنجليزية) مثل Cairo', 'aria-label': 'المدينة', value: settings.place?.city || '' });
  const country = h('input', { type: 'text', placeholder: 'الدولة (بالإنجليزية) مثل Egypt', 'aria-label': 'الدولة', value: settings.place?.country || '' });
  const out = h('div');
  const geoBtn = h('button', { class: 'btn', type: 'button', onclick: async () => {
    geoBtn.disabled = true;
    try { const c = await askLocation(); savePlace({ lat: c.lat, lng: c.lng, label: 'موقعي الحالي' }); await draw(); }
    catch (e) { toast(e.message); }
    geoBtn.disabled = false;
  } }, icon('qibla', 18), 'استخدم موقعي (بإذنك)');
  const form = h('form', { class: 'row', onsubmit: (e) => {
    e.preventDefault();
    if (!city.value.trim() || !country.value.trim()) return toast('اكتب المدينة والدولة');
    savePlace({ city: city.value.trim(), country: country.value.trim(), label: `${city.value.trim()}، ${country.value.trim()}` }); draw();
  } }, city, country, h('button', { class: 'btn primary', type: 'submit' }, 'عرض المواقيت'), geoBtn);

  /* الإعدادات */
  const methodSel = h('select', { 'aria-label': 'طريقة الحساب', onchange: () => { setSetting('method', +methodSel.value); draw(); } }, h('option', { value: settings.method }, METHOD_AR[settings.method] || `طريقة ${settings.method}`));
  prayerMethods().then((ms) => methodSel.replaceChildren(...ms.map((m) => h('option', { value: m.id, selected: m.id === settings.method }, METHOD_AR[m.id] || m.name)))).catch(() => {});
  const schoolSel = h('select', { 'aria-label': 'المذهب لحساب العصر', onchange: () => { setSetting('school', +schoolSel.value); draw(); } },
    h('option', { value: 0, selected: settings.school === 0 }, 'العصر: الجمهور (ظل المثل)'), h('option', { value: 1, selected: settings.school === 1 }, 'العصر: الحنفي (ظل المثلين)'));
  const tabs = chips([['day', 'اليوم'], ['month', 'تقويم الشهر']], view, (v) => { view = v; draw(); }, 'العرض');
  root.append(form, h('div', { class: 'row' }, methodSel, schoolSel), tabs, out,
    notice('تختلف المواقيت بين الهيئات وطرق الحساب بفروق دقائق؛ اعتمد ما تعتمده دار الإفتاء أو المسجد في بلدك. لا تُعرض مواقيت ثابتة؛ كل الأرقام محسوبة لمكانك.'));

  async function draw() {
    clearInterval(timer);
    const place = settings.place;
    if (!place) { out.replaceChildren(h('div', { class: 'state' }, 'اختر مدينتك أو اسمح بتحديد موقعك لعرض المواقيت.')); return; }
    out.replaceChildren(loading());
    try { view === 'day' ? await drawDay(place) : await drawMonth(place); }
    catch (e) { out.replaceChildren(errorBox('تعذّر جلب المواقيت. تأكد من كتابة المدينة والدولة بالإنجليزية ومن الاتصال بالإنترنت.', draw)); }
  }

  async function drawDay(place) {
    const date = new Date(); date.setDate(date.getDate() + offset);
    const key = `t:${placeKey(place)}:${dmy(date)}:${settings.method}:${settings.school}`;
    const data = await cached(key, () => getTimings(place, dmy(date), settings.method, settings.school), { ttlH: 48 });
    const secs = secsOf(data.timings); const tz = data.meta.timezone; const hj = data.date.hijri;
    const nav = h('div', { class: 'row between' },
      h('button', { class: 'btn', type: 'button', onclick: () => { offset--; draw(); } }, 'اليوم السابق'),
      h('div', { style: undefined }, h('b', null, gregLabel(date)), h('div', { class: 'muted small' }, `${hj.weekday?.ar || ''} ${toAr(hj.day)} ${hj.month?.ar || ''} ${toAr(hj.year)} هـ — ${placeLabel(place)}`)),
      h('button', { class: 'btn', type: 'button', onclick: () => { offset++; draw(); } }, 'اليوم التالي'));
    const grid = h('div', { class: 'prayer-grid' });
    const cells = PRAYER_LIST.map(([k, n]) => { const c = h('div', { class: 'prayer-cell', dataset: { k } }, h('span', null, n), h('b', null, fmt12(secs[k]))); grid.append(c); return c; });
    const cd = h('div', { class: 'card' }, h('div', { class: 'muted' }, 'الصلاة القادمة'), h('div', { class: 'countdown', 'aria-live': 'off' }), h('div', { class: 'small muted', id: 'nxt' }));
    out.replaceChildren(nav, offset === 0 ? cd : h('span'), grid, notifBlock(secs, tz));
    if (offset === 0) {
      const tick = () => {
        const nx = nextPrayer(secs, tz);
        cd.querySelector('.countdown').textContent = fmtDur(nx.diff);
        cd.querySelector('#nxt').textContent = `${nx.name} — ${fmt12(secs[nx.key])}`;
        cells.forEach((c) => c.classList.toggle('next', c.dataset.k === nx.key));
      };
      tick(); timer = setInterval(tick, 1000);
    }
  }

  async function drawMonth(place) {
    const y = month.getFullYear(), m = month.getMonth() + 1;
    const days = await cached(`tm:${placeKey(place)}:${y}-${m}:${settings.method}:${settings.school}`, () => getMonthTimings(place, y, m, settings.method, settings.school), { ttlH: 24 * 20 });
    const todayStr = dmy(new Date());
    const head = h('tr', null, h('th', null, 'اليوم'), h('th', null, 'هجري'), ...PRAYER_LIST.map(([, n]) => h('th', null, n)));
    const rows = days.map((d) => h('tr', { class: d.date.gregorian.date === todayStr ? 'today' : '' }, h('td', null, toAr(d.date.gregorian.day)), h('td', null, `${toAr(d.date.hijri.day)} ${d.date.hijri.month?.ar || ''}`),
      ...PRAYER_LIST.map(([k]) => h('td', null, fmt12(secsOf(d.timings)[k])))));
    out.replaceChildren(
      h('div', { class: 'row between' },
        h('button', { class: 'btn', type: 'button', onclick: () => { month = new Date(y, m - 2, 1); draw(); } }, 'الشهر السابق'),
        h('b', null, new Intl.DateTimeFormat('ar-EG-u-ca-gregory', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))),
        h('button', { class: 'btn', type: 'button', onclick: () => { month = new Date(y, m, 1); draw(); } }, 'الشهر التالي')),
      h('div', { class: 't-wrap' }, h('table', { class: 't' }, h('thead', null, head), h('tbody', null, ...rows))));
  }

  /* تنبيهات الصلاة: تعمل فقط والصفحة مفتوحة (لا يوجد خادم إشعارات). */
  let timeouts = [];
  function notifBlock(secs, tz) {
    const supported = 'Notification' in window;
    const box = h('div', { class: 'card' }, h('h3', null, 'تنبيهات الصلاة'));
    if (!supported) { box.append(h('p', { class: 'muted' }, 'متصفحك لا يدعم الإشعارات.')); return box; }
    const cb = h('input', { type: 'checkbox', checked: settings.notify && Notification.permission === 'granted', onchange: async () => {
      if (cb.checked) { const p = await Notification.requestPermission(); if (p !== 'granted') { cb.checked = false; return toast('لم يُسمح بالإشعارات'); } }
      setSetting('notify', cb.checked); schedule();
    } });
    function schedule() {
      timeouts.forEach(clearTimeout); timeouts = [];
      if (!(settings.notify && Notification.permission === 'granted')) return;
      const now = new Date(); const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      PRAYER_LIST.filter(([k]) => k !== 'Sunrise').forEach(([k, n]) => {
        const wait = (secs[k] - nowSec) * 1000;
        if (wait > 0 && tz) timeouts.push(setTimeout(() => new Notification(`حان وقت صلاة ${n}`, { body: placeLabel(settings.place), lang: 'ar', dir: 'rtl' }), wait));
      });
    }
    box.append(h('label', null, cb, ' نبّهني عند دخول وقت الصلاة'), h('p', { class: 'muted small' }, 'التنبيهات تعمل ما دام الموقع مفتوحًا في المتصفح؛ التنبيه والتطبيق مغلق يحتاج خدمة إشعارات من خادمك (غير مفعّلة هنا).'));
    schedule();
    return box;
  }

  draw();
  void pad2;
  return { node: root, dispose: () => { dispose(); timeouts.forEach(clearTimeout); } };
}
