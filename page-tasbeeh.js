import { h, toAr, dayKey } from './lib-util.js';
import { icon } from './lib-icons.js';
import { settings, setSetting } from './lib-settings.js';
import { ls } from './lib-store.js';
import { chips, pageHeader, vibrate } from './lib-ui.js';
import { toast } from './lib-util.js';

const PRESETS = ['سُبْحَانَ ٱللَّهِ', 'ٱلْحَمْدُ لِلَّهِ', 'ٱللَّهُ أَكْبَرُ', 'لَا إِلَـٰهَ إِلَّا ٱللَّهُ', 'أَسْتَغْفِرُ ٱللَّهَ', 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ', 'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ', 'سُبْحَانَ ٱللَّهِ ٱلْعَظِيمِ', 'ٱللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ'];
const newSession = (name) => ({ id: Date.now().toString(36), name, dhikr: PRESETS[0], target: 33, count: 0, rounds: 0, total: 0, created: dayKey() });

function load() {
  const d = ls.get('tasbeeh', null);
  if (d?.sessions?.length) return d;
  const s = newSession('الجلسة ١');
  return { sessions: [s], active: s.id, history: [] };
}
let audioCtx;
function tick() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 660; g.gain.value = 0.05; o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.04);
  } catch { /* الصوت غير مدعوم */ }
}

export function render() {
  const st = load();
  const save = () => ls.set('tasbeeh', st);
  const cur = () => st.sessions.find((s) => s.id === st.active) || st.sessions[0];
  const root = h('div', null, pageHeader('المسبحة الإلكترونية', 'تعمل دون إنترنت بعد أول تحميل، ويُحفظ العدد تلقائيًا على جهازك'));

  const sessionSel = h('select', { 'aria-label': 'الجلسة', onchange: () => { st.active = sessionSel.value; save(); paint(); } });
  const nameIn = h('input', { type: 'text', placeholder: 'اسم جلسة جديدة', 'aria-label': 'اسم الجلسة', size: 14 });
  const newBtn = h('button', { class: 'btn', type: 'button', onclick: () => {
    const s = newSession(nameIn.value.trim() || `الجلسة ${toAr(st.sessions.length + 1)}`);
    st.sessions.push(s); st.active = s.id; nameIn.value = ''; save(); paint();
  } }, icon('plus', 16), 'جلسة جديدة');

  const dhikrBox = h('div', { class: 'chips scroll-x', role: 'group', 'aria-label': 'نوع الذكر' });
  const custom = h('input', { type: 'text', placeholder: 'ذكر آخر تكتبه', 'aria-label': 'ذكر مخصص', size: 18, onchange: () => { const v = custom.value.trim(); if (v) { cur().dhikr = v.slice(0, 80); save(); paint(); } } });
  const curLabel = h('div', { class: 'cur', 'aria-live': 'polite' });
  const num = h('span', null, '٠');
  const tap = h('button', { class: 'tapbtn', type: 'button', 'aria-label': 'سبّح' }, num);
  const rounds = h('b', null, '٠'), total = h('b', null, '٠');
  const targetBox = h('div');

  const paint = () => {
    const s = cur();
    sessionSel.replaceChildren(...st.sessions.map((x) => h('option', { value: x.id, selected: x.id === s.id }, `${x.name}`)));
    dhikrBox.replaceChildren(...PRESETS.map((d) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(d === s.dhikr), onclick: () => { s.dhikr = d; s.count = 0; save(); paint(); } }, d)));
    curLabel.textContent = s.dhikr;
    num.textContent = toAr(s.count);
    rounds.textContent = toAr(s.rounds); total.textContent = toAr(s.total);
    tap.style.setProperty('--p', s.target ? (s.count / s.target) * 100 : 100);
    targetBox.replaceChildren(chips([[33, '٣٣'], [99, '٩٩'], [100, '١٠٠'], [1000, '١٠٠٠'], [0, 'بلا حد']], s.target, (v) => { s.target = v; s.count = 0; save(); paint(); }, 'الهدف'));
  };

  tap.addEventListener('click', () => {
    const s = cur();
    s.count++; s.total++;
    let v = 8;
    if (s.target && s.count >= s.target) { s.rounds++; s.count = 0; v = [30, 60, 30]; toast(`أتممت ${toAr(s.target)} — تقبّل الله منك`); }
    if (settings.haptic) vibrate(v);
    if (settings.sound) tick();
    save(); paint();
  });

  const targetCustom = h('input', { type: 'number', min: 1, max: 100000, placeholder: 'هدف مخصص', 'aria-label': 'هدف مخصص', style: undefined, onchange: () => { const v = Math.max(1, Math.min(100000, +targetCustom.value || 0)); if (v) { cur().target = v; cur().count = 0; save(); paint(); } } });

  const finish = h('button', { class: 'btn', type: 'button', onclick: () => {
    const s = cur();
    if (!s.total) return toast('لا يوجد عدّ لحفظه');
    st.history.unshift({ id: Date.now().toString(36), name: s.name, dhikr: s.dhikr, total: s.total, rounds: s.rounds, date: dayKey() });
    s.count = 0; s.rounds = 0; s.total = 0; save(); paint(); drawHistory(); toast('حُفظت الجلسة في السجل');
  } }, icon('check', 16), 'إنهاء وحفظ في السجل');
  const reset = h('button', { class: 'btn', type: 'button', onclick: () => { const s = cur(); s.count = 0; s.rounds = 0; s.total = 0; save(); paint(); } }, icon('reset', 16), 'تصفير');
  const del = h('button', { class: 'btn', type: 'button', onclick: () => {
    if (st.sessions.length < 2) return toast('لا يمكن حذف آخر جلسة');
    if (!confirm('حذف هذه الجلسة؟')) return;
    st.sessions = st.sessions.filter((x) => x.id !== st.active); st.active = st.sessions[0].id; save(); paint();
  } }, icon('trash', 16), 'حذف الجلسة');

  const toggles = h('div', { class: 'row' },
    h('label', null, h('input', { type: 'checkbox', checked: settings.haptic, onchange: (e) => setSetting('haptic', e.target.checked) }), ' اهتزاز عند الضغط (إن دعمه جهازك)'),
    h('label', null, h('input', { type: 'checkbox', checked: settings.sound, onchange: (e) => setSetting('sound', e.target.checked) }), ' صوت خفيف'));

  const hist = h('div', { class: 'card' });
  const drawHistory = () => {
    hist.replaceChildren(h('h3', null, 'سجل الجلسات'));
    if (!st.history.length) { hist.append(h('p', { class: 'muted' }, 'لا توجد جلسات محفوظة بعد.')); return; }
    st.history.slice(0, 30).forEach((x) => hist.append(h('div', { class: 'row between' },
      h('span', null, `${x.date} · ${x.name} · ${x.dhikr}`), h('b', null, toAr(x.total)))));
    hist.append(h('button', { class: 'btn', type: 'button', onclick: () => { if (confirm('مسح السجل؟')) { st.history = []; save(); drawHistory(); } } }, 'مسح السجل'));
  };

  root.append(
    h('div', { class: 'row' }, sessionSel, nameIn, newBtn),
    dhikrBox, h('div', { class: 'row' }, custom),
    h('div', { class: 'counter' }, curLabel, tap, h('div', { class: 'stats' }, h('div', null, 'الجولات ', rounds), h('div', null, 'إجمالي الجلسة ', total))),
    h('div', { class: 'row', style: undefined }, h('span', null, 'الهدف:'), targetBox, targetCustom),
    h('div', { class: 'row' }, reset, finish, del), toggles, hist);
  paint(); drawHistory();
  return root;
}

