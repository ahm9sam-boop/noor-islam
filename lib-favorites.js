import { ls } from './lib-store.js';

let list = ls.get('favs', []) || [];
const subs = new Set();

export const favs = () => list.slice();
export const isFav = (key) => list.some((f) => f.key === key);
export const onFavsChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };

/** item: {key, type, title, text, source, href} — يرجع true لو أُضيف، false لو أُزيل. */
export function toggleFav(item) {
  const i = list.findIndex((f) => f.key === item.key);
  if (i >= 0) list.splice(i, 1); else list.unshift({ ...item, ts: Date.now() });
  ls.set('favs', list);
  subs.forEach((f) => f());
  return i < 0;
}
export function clearFavs() { list = []; ls.set('favs', list); subs.forEach((f) => f()); }
