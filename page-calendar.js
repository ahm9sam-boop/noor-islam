import { h, toAr, hijriParts, hijriLabel, gregLabel, hijriMonthName } from './lib-util.js';
import { notice, pageHeader } from './lib-ui.js';

/** مناسبات معروفة بتاريخها الهجري (شهر، يوم). لا تُدرج مناسبات مختلف في تاريخها. */
export const OCCASIONS = [
  [1, 1, 'رأس السنة الهجرية'], [1, 10, 'يوم عاشوراء'], [9, 1, 'بداية رمضان (بالحساب)'], [10, 1, 'عيد الفطر'],
  [12, 9, 'يوم عرفة'], [12, 10, 'عيد الأضحى'], [12, 11, 'أيام التشريق'], [12, 12, 'أيام التشريق'], [12, 13, 'أيام التشريق']
];
export const occasionOf = (m, d) => OCCASIONS.find((o) => o[0] === m && o[1] === d)?.[2] || '';
const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return noon(x); };

export function firstOfMonth(date) { let d = noon(date); while (hijriParts(d).d !== 1) d = addDays(d, -1); return d; }
export function monthDays(first) {
  const m = hijriParts(first).m, out = [];
  let d = first;
  while (hijriParts(d).m === m) { out.push(d); d = addDays(d, 1); if (out.length > 31) break; }
  return out;
}
export function upcoming(limit = 6, span = 420) {
  const out = []; const start = noon(new Date());
  for (let i = 0; i < span && out.length < limit; i++) {
    const d = addDays(start, i), p = hijriParts(d), o = occasionOf(p.m, p.d);
    if (o) out.push({ d, p, o });
  }
  return out;
}

export function render() {
  const root = h('div', null, pageHeader('التقويم الهجري', 'تقويم أم القرى (حسابي) مع الموافق الميلادي'));
  let first = firstOfMonth(new Date());
  const head = h('div', { class: 'row between' }); const grid = h('div', { class: 'cal' }); const up = h('div', { class: 'card' });
  const draw = () => {
    const days = monthDays(first), p0 = hijriParts(first);
    head.replaceChildren(
      h('button', { class: 'btn', type: 'button', onclick: () => { first = firstOfMonth(addDays(first, -1)); draw(); } }, 'الشهر السابق'),
      h('div', { style: undefined }, h('b', null, `${hijriMonthName(first)} ${toAr(p0.y)} هـ`), h('div', { class: 'muted small' }, `${gregLabel(days[0])} → ${gregLabel(days[days.length - 1])}`)),
      h('button', { class: 'btn', type: 'button', onclick: () => { first = addDays(days[days.length - 1], 1); draw(); } }, 'الشهر التالي'));
    const names = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const cells = names.map((n) => h('div', { class: 'dh' }, n));
    const lead = (first.getDay() + 1) % 7;
    for (let i = 0; i < lead; i++) cells.push(h('div'));
    const today = new Date().toDateString();
    days.forEach((d) => {
      const p = hijriParts(d), o = occasionOf(p.m, p.d);
      cells.push(h('div', { class: `cell${d.toDateString() === today ? ' today' : ''}${o ? ' event' : ''}` }, h('b', null, toAr(p.d)), h('small', null, `${toAr(d.getDate())}/${toAr(d.getMonth() + 1)}`), o ? h('em', null, o) : null));
    });
    grid.replaceChildren(...cells);
  };
  up.append(h('h3', null, 'المناسبات القادمة (تقديرية)'));
  upcoming().forEach(({ d, o }) => up.append(h('div', { class: 'row between' }, h('span', null, o), h('span', { class: 'muted' }, gregLabel(d)))));
  root.append(h('div', { class: 'card' }, h('b', null, `اليوم: ${hijriLabel()}`), h('div', { class: 'muted' }, gregLabel())), head, grid, up,
    notice('التواريخ محسوبة بتقويم أم القرى. بدايات الشهور (رمضان والعيدين خصوصًا) قد تختلف بيومٍ بحسب رؤية الهلال في كل بلد، فاعتمد إعلان الجهة الشرعية في بلدك؛ لا تُعدّ المناسبات القادمة مؤكدة.'));
  draw();
  return root;
}
