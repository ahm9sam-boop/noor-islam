import { h, toAr, hijriParts, gregLabel } from './lib-util.js';
import { settings } from './lib-settings.js';
import { ls } from './lib-store.js';
import { errorBox, loading, notice, pageHeader } from './lib-ui.js';
import { getHijriMonthTimings } from './lib-api.js';
import { cached } from './lib-api.js';
import { fmt12, secsOf, placeKey, placeLabel } from './lib-prayer.js';

const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return noon(x); };

export async function render() {
  const root = h('div', null, pageHeader('رمضان', 'إمساكية بحسب مدينتك ومتابعة الأعمال (اختيارية)'));
  const now = hijriParts(new Date());
  const inRamadan = now.m === 9;
  const year = inRamadan || now.m < 9 ? now.y : now.y + 1;

  // تقدير بداية رمضان القادمة بالحساب
  let start = null;
  for (let i = 0; i < 420; i++) { const d = addDays(noon(new Date()), i), p = hijriParts(d); if (p.m === 9 && p.d === 1) { start = d; break; } }
  if (inRamadan) root.append(h('div', { class: 'card' }, h('h3', null, `نحن في اليوم ${toAr(now.d)} من رمضان ${toAr(now.y)} هـ (بحساب أم القرى)`)));
  else if (start) {
    const days = Math.round((start - noon(new Date())) / 864e5);
    root.append(h('div', { class: 'card' }, h('h3', null, `رمضان ${toAr(year)} هـ المتوقع بعد ${toAr(days)} يومًا`), h('p', { class: 'muted' }, `الموافق تقريبًا ${gregLabel(start)} — يُحدَّد فعليًا برؤية الهلال في بلدك.`)));
  }
  root.append(notice('مواعيد رمضان تعتمد على رؤية الهلال، فلا تُعدّ هذه التواريخ مؤكدة. الإمساكية تُحسب من خدمة AlAdhan بحسب طريقة الحساب في الإعدادات.'),
    h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/quran/khatm' }, 'ختمة القرآن'), h('a', { class: 'btn', href: '#/prayer' }, 'تغيير المدينة وطريقة الحساب')));

  const place = settings.place;
  const table = h('div');
  root.append(h('h2', null, 'الإمساكية'), table);
  if (!place) table.append(h('div', { class: 'state' }, 'اختر مدينتك من ', h('a', { href: '#/prayer' }, 'صفحة المواقيت'), ' لعرض الإمساكية.'));
  else {
    table.append(loading());
    try {
      const days = await cached(`ram:${placeKey(place)}:${year}:${settings.method}:${settings.school}`, () => getHijriMonthTimings(place, year, 9, settings.method, settings.school), { ttlH: 24 * 20 });
      const today = new Date().toDateString();
      const rows = days.map((d) => {
        const s = secsOf(d.timings);
        const [dd, mm, yy] = d.date.gregorian.date.split('-').map(Number);
        const isToday = new Date(yy, mm - 1, dd).toDateString() === today;
        return h('tr', { class: isToday ? 'today' : '' }, h('td', null, toAr(d.date.hijri.day)), h('td', null, `${toAr(dd)}/${toAr(mm)}`), h('td', null, s.Imsak ? fmt12(s.Imsak) : '—'), h('td', null, fmt12(s.Fajr)), h('td', null, fmt12(s.Maghrib)));
      });
      table.replaceChildren(h('p', { class: 'muted' }, `المكان: ${placeLabel(place)} — الإمساك لانتهاء السحور احتياطًا، والفجر وقت الأذان، والمغرب وقت الإفطار.`),
        h('div', { class: 't-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ...['رمضان', 'ميلادي', 'الإمساك', 'الفجر', 'الإفطار (المغرب)'].map((t) => h('th', null, t)))), h('tbody', null, ...rows))));
    } catch { table.replaceChildren(errorBox('تعذّر تحميل الإمساكية. تأكد من الاتصال وصحة المدينة.', () => location.reload())); }
  }

  /* متابعة الأعمال اليومية (اختياري، محليًا) */
  const KEY = `ramadan:${year}`; const data = ls.get(KEY, {});
  const items = [['fast', 'الصيام'], ['quran', 'ورد القرآن'], ['qiyam', 'القيام'], ['charity', 'صدقة']];
  const trackBox = h('div', { class: 'card' }, h('h3', null, 'متابعة أعمالي (اختياري)'), h('p', { class: 'muted small' }, 'تُحفظ على جهازك فقط، ولا يراها أحد.'));
  const rows = [];
  for (let d = 1; d <= 30; d++) rows.push(h('tr', { class: inRamadan && d === now.d ? 'today' : '' }, h('td', null, toAr(d)), ...items.map(([k]) => h('td', null, h('input', { type: 'checkbox', 'aria-label': `${items.find((x) => x[0] === k)[1]} — يوم ${d}`, checked: !!data[d]?.[k], onchange: (e) => { (data[d] ||= {})[k] = e.target.checked; ls.set(KEY, data); } })))));
  trackBox.append(h('div', { class: 't-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'اليوم'), ...items.map(([, t]) => h('th', null, t)))), h('tbody', null, ...rows))));
  root.append(trackBox);
  return root;
}
