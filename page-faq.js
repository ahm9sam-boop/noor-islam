import { h, normAr } from './lib-util.js';
import { pageHeader, notice, sourceLine } from './lib-ui.js';
import { FAQ, FAQ_SRC } from './data-faq.js';

export function render() {
  const list = h('div');
  const input = h('input', { type: 'search', placeholder: 'ابحث في الأسئلة…', 'aria-label': 'بحث في الأسئلة', oninput: () => paint() });
  function paint() {
    const k = normAr(input.value.trim());
    const rows = FAQ.filter((f) => !k || normAr(f.q + ' ' + f.a).includes(k));
    list.replaceChildren(...(rows.length ? rows.map((f) => h('details', { class: 'card' }, h('summary', null, h('b', null, f.q), h('span', { class: 'muted small' }, `  ·  ${f.c}`)), h('p', { class: 'prose' }, f.a))) : [h('p', { class: 'muted' }, 'لا توجد نتائج. اسأل دار الإفتاء من الزر أعلاه.')]));
  }
  paint();
  return h('div', null, pageHeader('أسئلة دينية', 'أسئلة شائعة بإجابات مختصرة مع الدليل'),
    notice('هذه إجابات مختصرة في الأساسيات وليست فتاوى. لحالتك الخاصة اسأل جهة الإفتاء الرسمية.'),
    h('div', { class: 'row' }, h('a', { class: 'btn gold', href: 'https://www.dar-alifta.org', target: '_blank', rel: 'noopener' }, 'اسأل دار الإفتاء المصرية (موقعها الرسمي)')),
    h('div', { class: 'row' }, input), list, sourceLine(FAQ_SRC));
}
