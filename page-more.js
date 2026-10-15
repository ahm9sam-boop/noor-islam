import { h } from './lib-util.js';
import { icon } from './lib-icons.js';
import { pageHeader } from './lib-ui.js';
import { ROUTES } from './main.js';

export function render() {
  const items = Object.entries(ROUTES).filter(([k, r]) => !r.hidden || ['settings', 'about', 'privacy', 'terms', 'contact'].includes(k) ).filter(([k]) => k !== '' && k !== 'more');
  return h('div', null, pageHeader('المزيد', 'كل أقسام الموقع'),
    h('div', { class: 'grid' }, ...items.map(([k, r]) => h('a', { class: 'quick', href: `#/${k}` }, icon(r.icon, 28), r.title))));
}
