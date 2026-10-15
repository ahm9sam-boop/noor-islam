import { h, copyText, shareText, toast } from './lib-util.js';
import { icon } from './lib-icons.js';
import { favs, toggleFav, clearFavs } from './lib-favorites.js';
import { iconBtn, pageHeader, chips } from './lib-ui.js';

const TYPES = [['all', 'الكل'], ['ayah', 'آيات'], ['hadith', 'أحاديث'], ['dua', 'أدعية'], ['dhikr', 'أذكار'], ['name', 'أسماء الله']];
const LABEL = { ayah: 'آية', hadith: 'حديث', dua: 'دعاء', dhikr: 'ذكر', name: 'اسم' };

export function render() {
  const root = h('div', null, pageHeader('المفضلة', 'محفوظة على جهازك فقط'));
  let type = 'all';
  const list = h('div');
  const draw = () => {
    const items = favs().filter((f) => type === 'all' || f.type === type);
    list.replaceChildren(...(items.length ? items.map((f) => h('article', { class: 'dhikr' },
      h('span', { class: 'badge green' }, LABEL[f.type] || f.type), h('p', { class: f.type === 'ayah' ? 'verse' : 'dua-text' }, f.text),
      h('p', { class: 'source' }, `المصدر: ${f.source || f.title}`),
      h('div', { class: 'row' }, f.href ? h('a', { class: 'btn', href: f.href }, 'فتح') : null,
        iconBtn('copy', 'نسخ', () => copyText(`${f.text}\n\n(${f.source || f.title})`)), iconBtn('share', 'مشاركة', () => shareText(`${f.text}\n\n(${f.source || f.title})`)),
        iconBtn('trash', 'إزالة', () => { toggleFav(f); draw(); })))) : [h('p', { class: 'state' }, 'لا توجد عناصر محفوظة. اضغط أيقونة القلب بجانب أي آية أو حديث أو دعاء لحفظه هنا.')]));
  };
  root.append(chips(TYPES, type, (v) => { type = v; draw(); }, 'النوع'), list,
    h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => { copyText(JSON.stringify(favs(), null, 2)); } }, icon('copy', 16), 'نسخ نسخة احتياطية (JSON)'),
      h('button', { class: 'btn', type: 'button', onclick: () => { if (confirm('حذف كل المفضلة؟')) { clearFavs(); draw(); toast('تم الحذف'); } } }, icon('trash', 16), 'حذف الكل')));
  draw();
  return root;
}
