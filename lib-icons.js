// أيقونات SVG خفيفة (stroke) بدون مكتبات خارجية.
const NS = 'http://www.w3.org/2000/svg';
const c = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const PATHS = {
  home: 'M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  quran: 'M5 4h13a1 1 0 0 1 1 1v14H7a2 2 0 0 0-2 2zM5 4v15M9 8h6M9 11h6',
  azkar: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  tasbeeh: [c(12, 4, 2), c(18, 8, 2), c(18, 15, 2), c(12, 20, 2), c(6, 15, 2), c(6, 8, 2)].join(''),
  dua: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
  hadith: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  prayer: c(12, 12, 9) + 'M12 7v5l3 2',
  qibla: c(12, 12, 9) + 'M15.5 8.5l-2 5-5 2 2-5z',
  names: 'M12 3l2.5 5.5 5.5.8-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  ramadan: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5zM17 4v4M15 6h4',
  learn: 'M3 9l9-5 9 5-9 5zM7 12v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5',
  search: c(11, 11, 7) + 'M20 20l-4-4',
  heart: 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z',
  star: 'M12 3l2.5 5.5 5.5.8-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.8z',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  next: 'M6 5l9 7-9 7zM18 5v14',
  prev: 'M18 5l-9 7 9 7zM6 5v14',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  share: c(6, 12, 2.5) + c(18, 6, 2.5) + c(18, 18, 2.5) + 'M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10' + c(16, 7, 2) + c(8, 17, 2),
  menu: 'M4 7h16M4 12h16M4 17h16',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sun: c(12, 12, 4) + 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  check: 'M5 12l5 5 9-10',
  info: c(12, 12, 9) + 'M12 11v6M12 7.5v.5',
  repeat: 'M4 11V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M9 5l7 7-7 7',
  reset: 'M4 4v6h6M5.5 14a7 7 0 1 0 1.5-7.5L4 10',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  plus: 'M12 5v14M5 12h14',
  mosque: 'M12 3c2 2 3 3.5 3 5.5H9C9 6.5 10 5 12 3zM6 21V12h12v9M3 21h18M9 21v-4a3 3 0 0 1 6 0v4M4 8v4M20 8v4'
};

export function icon(name, size = 22) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', PATHS[name] || PATHS.info);
  svg.append(p);
  return svg;
}
