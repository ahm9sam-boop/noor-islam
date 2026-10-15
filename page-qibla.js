import { h, toAr } from './lib-util.js';
import { icon } from './lib-icons.js';
import { settings } from './lib-settings.js';
import { notice, pageHeader } from './lib-ui.js';
import { toast } from './lib-util.js';
import { resolveCity } from './lib-api.js';
import { askLocation } from './lib-prayer.js';

const KAABA = { lat: 21.4225, lng: 39.8262 }; // إحداثيات الكعبة المشرفة

export function qiblaBearing(lat, lng) {
  const r = (d) => (d * Math.PI) / 180;
  const φ1 = r(lat), φ2 = r(KAABA.lat), Δλ = r(KAABA.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
export function distanceKm(lat, lng) {
  const r = (d) => (d * Math.PI) / 180, R = 6371;
  const dφ = r(KAABA.lat - lat), dλ = r(KAABA.lng - lng);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(r(lat)) * Math.cos(r(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function render() {
  const root = h('div', null, pageHeader('اتجاه القبلة', 'حساب الاتجاه من إحداثياتك إلى الكعبة المشرفة'));
  const info = h('div', { class: 'card' }, h('p', { class: 'muted' }, 'اختر طريقة تحديد مكانك.'));
  const needle = h('div', { class: 'needle' });
  const dial = h('div', { class: 'dial' }, h('span', { class: 'north' }, 'ش'));
  const compass = h('div', { class: 'compass', role: 'img', 'aria-label': 'بوصلة القبلة' }, dial, needle, h('span', { class: 'kaaba', 'aria-hidden': 'true' }, '🕋'));
  let bearing = null, heading = null, listening = false;

  const paint = () => {
    if (bearing == null) return;
    const rot = heading == null ? bearing : (bearing - heading + 360) % 360;
    needle.style.setProperty('transform', `rotate(${rot}deg)`);
    dial.style.setProperty('transform', `rotate(${heading == null ? 0 : -heading}deg)`);
  };
  const onOrient = (e) => {
    const hd = e.webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null);
    if (hd != null) { heading = hd; paint(); }
  };
  async function startCompass() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const p = await DeviceOrientationEvent.requestPermission();
        if (p !== 'granted') return toast('لم يُسمح باستخدام حساس الاتجاه');
      }
      if (listening) return;
      addEventListener('deviceorientationabsolute', onOrient, true);
      addEventListener('deviceorientation', onOrient, true);
      listening = true; toast('حرّك الهاتف قليلًا ليبدأ التوجيه');
      setTimeout(() => { if (heading == null) toast('لا يوجد حساس بوصلة متاح؛ استخدم الدرجة المكتوبة وبوصلة خارجية'); }, 4000);
    } catch { toast('تعذّر تفعيل البوصلة على هذا الجهاز'); }
  }
  function show(lat, lng, label) {
    bearing = qiblaBearing(lat, lng);
    info.replaceChildren(h('h3', null, label), h('p', null, `اتجاه القبلة: ${toAr(bearing.toFixed(1))}° من الشمال الحقيقي (في اتجاه عقارب الساعة).`),
      h('p', { class: 'muted' }, `المسافة التقريبية إلى الكعبة: ${toAr(Math.round(distanceKm(lat, lng)))} كم`),
      h('button', { class: 'btn primary', type: 'button', onclick: startCompass }, icon('qibla', 18), 'تشغيل البوصلة بحساس الجهاز'));
    paint();
  }

  const city = h('input', { type: 'text', placeholder: 'المدينة (بالإنجليزية)', 'aria-label': 'المدينة', value: settings.place?.city || '' });
  const country = h('input', { type: 'text', placeholder: 'الدولة (بالإنجليزية)', 'aria-label': 'الدولة', value: settings.place?.country || '' });
  const lat = h('input', { type: 'number', step: 'any', placeholder: 'خط العرض', 'aria-label': 'خط العرض', style: undefined });
  const lng = h('input', { type: 'number', step: 'any', placeholder: 'خط الطول', 'aria-label': 'خط الطول' });
  root.append(
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      try { const c = await askLocation(); show(c.lat, c.lng, 'موقعك الحالي'); } catch (e) { toast(e.message); }
    } }, icon('qibla', 18), 'استخدم موقعي (بإذنك)')),
    h('form', { class: 'row', onsubmit: async (e) => {
      e.preventDefault();
      try { const r = await resolveCity(city.value.trim(), country.value.trim()); show(r.lat, r.lng, `${city.value.trim()}، ${country.value.trim()}`); }
      catch { toast('تعذّر العثور على المدينة؛ تأكد من الإملاء بالإنجليزية'); }
    } }, city, country, h('button', { class: 'btn', type: 'submit' }, 'احسب')),
    h('form', { class: 'row', onsubmit: (e) => { e.preventDefault(); if (lat.value === '' || lng.value === '' || Math.abs(+lat.value) > 90 || Math.abs(+lng.value) > 180) return toast('إحداثيات غير صحيحة'); show(+lat.value, +lng.value, 'إحداثيات يدوية'); } }, lat, lng, h('button', { class: 'btn', type: 'submit' }, 'احسب من الإحداثيات')),
    info, compass,
    h('div', { class: 'card' }, h('h3', null, 'معايرة البوصلة'),
      h('p', null, 'أبعد الهاتف عن المعادن والمغناطيس، ثم حرّكه في الهواء على شكل رقم ٨ عدة مرات. أمسك الهاتف أفقيًا وثابتًا أثناء القراءة.')),
    h('div', { class: 'card' }, h('h3', null, 'إن لم تعمل البوصلة'),
      h('p', null, 'استخدم الدرجة المكتوبة أعلاه مع بوصلة الهاتف المدمجة (تطبيق البوصلة)، أو اسأل أهل المنطقة أو المسجد القريب عن اتجاه القبلة.')),
    notice('دقة البوصلة تعتمد على حساسات جهازك ومحيطك، وقد تختلف عدة درجات. في المسجد اتبع المحراب المعتمد، وعند الشك فاجتهد في تحري الجهة.'));
  return { node: root, dispose: () => { removeEventListener('deviceorientationabsolute', onOrient, true); removeEventListener('deviceorientation', onOrient, true); } };
}
