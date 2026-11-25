import { h, toAr } from './lib-util.js';
import { pageHeader, notice, sourceLine } from './lib-ui.js';
import { QISAS, QISAS_SRC } from './data-qisas.js';

// قصص الأنبياء: تعمل دون إنترنت (النص مضمّن في التطبيق).
export function render({ params }) {
  const i = parseInt(params[0], 10);
  if (i >= 1 && i <= QISAS.length) {
    const c = QISAS[i - 1];
    return h('div', null, pageHeader(c.t, `موضعها في القرآن: ${c.s}`, h('a', { class: 'btn', href: '#/qisas' }, 'كل القصص')),
      h('div', { class: 'card' }, ...c.p.map((t) => h('p', { class: 'prose' }, t))),
      h('div', { class: 'row' },
        i > 1 ? h('a', { class: 'btn', href: `#/qisas/${i - 1}` }, 'السابقة') : '',
        i < QISAS.length ? h('a', { class: 'btn gold', href: `#/qisas/${i + 1}` }, 'التالية') : ''),
      sourceLine(QISAS_SRC));
  }
  return h('div', null, pageHeader('قصص الأنبياء', 'قصص مكتوبة بلغة مبسطة من القرآن والسنة'),
    notice('القصص مأخوذة مما ثبت في القرآن والسنة. للتوسع اقرأ الآيات المذكورة في كل قصة.'),
    h('div', { class: 'grid wide' }, ...QISAS.map((c, k) => h('a', { class: 'surah-item', href: `#/qisas/${k + 1}` }, h('span', { class: 'muted small' }, toAr(k + 1)), h('div', { class: 'surah-name' }, c.t)))),
    sourceLine(QISAS_SRC));
}
