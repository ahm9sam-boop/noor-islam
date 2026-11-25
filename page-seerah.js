import { h, toAr } from './lib-util.js';
import { pageHeader, notice, sourceLine } from './lib-ui.js';
import { SEERAH, SEERAH_SRC } from './data-seerah.js';

// السيرة النبوية: تعمل دون إنترنت (النص مضمّن في التطبيق).
export function render({ params }) {
  const i = parseInt(params[0], 10);
  if (i >= 1 && i <= SEERAH.length) {
    const c = SEERAH[i - 1];
    return h('div', null, pageHeader(c.t, `الفصل ${toAr(i)} من ${toAr(SEERAH.length)}`, h('a', { class: 'btn', href: '#/seerah' }, 'كل الفصول')),
      h('div', { class: 'card' }, ...c.p.map((t) => h('p', { class: 'prose' }, t))),
      h('div', { class: 'row' },
        i > 1 ? h('a', { class: 'btn', href: `#/seerah/${i - 1}` }, 'السابق') : '',
        i < SEERAH.length ? h('a', { class: 'btn gold', href: `#/seerah/${i + 1}` }, 'التالي') : ''),
      sourceLine(SEERAH_SRC));
  }
  return h('div', null, pageHeader('السيرة النبوية', 'من المولد إلى الوفاة، بلغة مبسطة'),
    notice('ملخص مبسّط من كتب السيرة المعتمدة. التواريخ تقريبية كما وردت في الكتب.'),
    h('div', { class: 'grid wide' }, ...SEERAH.map((c, k) => h('a', { class: 'surah-item', href: `#/seerah/${k + 1}` }, h('span', { class: 'muted small' }, toAr(k + 1)), h('div', { class: 'surah-name' }, c.t)))),
    sourceLine(SEERAH_SRC));
}
