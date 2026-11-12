// Cámaras de Percy que toman fotos reales: puntos que brillan sobre las piezas del modelo
// y un visor con obturador, flash y revelado. Las fotos vienen de curated.js (API de la NASA).
import * as THREE from 'three';
import { PHOTOS } from './curated.js';

const CAMERAS = [
  { node: 'Mastcam_Z_cams', key: 'mastcam', name: 'Mastcam-Z', desc: 'Los “ojos” con zoom del mástil' },
  { node: 'NavCams', key: 'navcam', name: 'Navcam', desc: 'Cámaras para planear por dónde manejar' },
  { node: 'hazcams_front', key: 'hazcam', name: 'Hazcam delantera', desc: 'Vigila los peligros frente a las ruedas' },
  { node: 'WATSON', key: 'watson', name: 'WATSON', desc: 'Lupa al final del brazo, para ver rocas de cerca' },
];
const REVEAL_MS = 2600;
const SHUTTER_MS = 320;

const CSS = `
.pc-layer { position: fixed; inset: 0; pointer-events: none; z-index: 4; }
.pc-dot { position: absolute; left: 0; top: 0; width: 26px; height: 26px; margin: -13px 0 0 -13px; padding: 0; border: 0;
  background: none; cursor: pointer; pointer-events: auto; border-radius: 50%; }
.pc-dot::before { content: ""; position: absolute; inset: 8px; border-radius: 50%; background: #fff4e0;
  box-shadow: 0 0 6px 2px #ffd29a, 0 0 16px 5px rgba(255, 170, 90, .65); }
.pc-dot::after { content: ""; position: absolute; inset: 4px; border-radius: 50%; border: 1.5px solid rgba(255, 220, 170, .8);
  animation: pc-pulse 2.2s ease-out infinite; }
.pc-dot:hover::before, .pc-dot:focus-visible::before { background: #fff; box-shadow: 0 0 8px 3px #fff0d8, 0 0 22px 8px rgba(255, 180, 100, .8); }
.pc-dot:focus-visible { outline: none; }
.pc-dot[hidden] { display: none; }
@keyframes pc-pulse { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.9); opacity: 0; } }
.pc-label { position: absolute; left: 50%; bottom: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap;
  padding: 5px 9px 6px; border-radius: 4px; background: rgba(28, 13, 6, .88); border: 1px solid rgba(255, 179, 107, .35);
  font: 11px/1.35 ui-monospace, Consolas, monospace; color: #f3dcc4; text-align: left; opacity: 0; pointer-events: none;
  transition: opacity .15s; }
.pc-label b { display: block; color: #ffb36b; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
.pc-dot:hover .pc-label, .pc-dot:focus-visible .pc-label { opacity: 1; }

.pv { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; background: rgba(12, 5, 2, .78);
  font: 12px/1.45 ui-monospace, Consolas, monospace; color: #f3dcc4; }
.pv[hidden] { display: none; }
.pv-blade { position: absolute; left: 0; right: 0; height: 50%; background: #070302; z-index: 3; pointer-events: none;
  transform: scaleY(0); }
.pv-blade.top { top: 0; transform-origin: top; } .pv-blade.bottom { bottom: 0; transform-origin: bottom; }
.pv.snap .pv-blade { animation: pv-shutter ${SHUTTER_MS}ms ease-in-out; }
@keyframes pv-shutter { 0%, 100% { transform: scaleY(0); } 45%, 55% { transform: scaleY(1); } }
.pv-flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 4; pointer-events: none; }
.pv.snap .pv-flash { animation: pv-flash 650ms ease-out ${SHUTTER_MS * 0.55}ms; }
@keyframes pv-flash { 0% { opacity: 0; } 8% { opacity: .95; } 100% { opacity: 0; } }

.pv-card { position: relative; width: min(78vw, 1040px); max-height: calc(100vh - 48px); display: grid; gap: 10px;
  padding: 12px 12px 14px; background: #1c0d06; border: 1px solid rgba(255, 179, 107, .3); border-radius: 6px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, .6); }
.pv-frame { position: relative; background: #000; border-radius: 3px; overflow: hidden; cursor: zoom-in;
  aspect-ratio: 4 / 3; max-height: calc(100vh - 170px); }
.pv-frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
.pv-frame img.reveal { animation: pv-develop ${REVEAL_MS}ms cubic-bezier(.2, .7, .3, 1) both; }
@keyframes pv-develop {
  0% { filter: brightness(3.2) contrast(.35) saturate(0) blur(16px); }
  35% { filter: brightness(1.9) contrast(.6) saturate(.3) blur(7px); }
  70% { filter: brightness(1.2) contrast(.9) saturate(.85) blur(1.5px); }
  100% { filter: none; } }
.pv-wait { position: absolute; inset: 0; display: grid; place-items: center; color: #9c7f66; letter-spacing: .1em; text-transform: uppercase; }
.pv-wait[hidden] { display: none; }
.pv-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; }
.pv-cam { color: #ffb36b; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: 13px; }
.pv-when { color: #fff1e2; font-variant-numeric: tabular-nums; }
.pv-title { font-family: system-ui, sans-serif; font-size: 15px; color: #fff1e2; flex-basis: 100%; }
.pv-help { display: flex; flex-wrap: wrap; gap: 4px 14px; color: #9c7f66; font-size: 11px; }
.pv-help kbd { color: #ffb36b; font: inherit; font-weight: 700; }
.pv-help a { color: inherit; text-decoration: underline; text-decoration-color: rgba(255,179,107,.35); text-underline-offset: 2px; }
.pv-help a:hover { color: #ffb36b; }
.pv-count { margin-left: auto; font-variant-numeric: tabular-nums; }
.pv-close { position: absolute; top: 6px; right: 8px; width: 30px; height: 30px; border: 0; background: none; color: #c9a88a;
  font: 22px/1 system-ui, sans-serif; cursor: pointer; z-index: 2; }
.pv-close:hover, .pv-close:focus-visible { color: #fff; outline: none; }

/* Ampliada: la foto ocupa toda la pantalla */
.pv.zoom .pv-card { width: 100vw; max-height: none; height: 100vh; padding: 0; border: 0; border-radius: 0; background: #000; }
.pv.zoom .pv-frame { aspect-ratio: auto; max-height: none; height: 100vh; cursor: zoom-out; border-radius: 0; }
.pv.zoom .pv-meta, .pv.zoom .pv-help { position: absolute; left: 16px; right: 16px; z-index: 1;
  text-shadow: 0 1px 3px #000; pointer-events: none; }
.pv.zoom .pv-meta { top: 12px; } .pv.zoom .pv-help { bottom: 12px; }
.pv.zoom .pv-help a { pointer-events: auto; }
@media (prefers-reduced-motion: reduce) {
  .pv.snap .pv-blade, .pv.snap .pv-flash, .pc-dot::after { animation: none; }
  .pv-frame img.reveal { animation-duration: 1ms; } }
`;

const daysAgo = iso => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
};

// Clic de obturador sintetizado (sin archivos de audio)
let audio = null;
function shutterSound() {
  try {
    audio ??= new AudioContext();
    const len = audio.sampleRate * 0.09, buf = audio.createBuffer(1, len, audio.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / audio.sampleRate;
      ch[i] = (Math.random() * 2 - 1) * (Math.exp(-t * 90) + 0.6 * Math.exp(-Math.max(0, t - 0.045) * 120) * (t > 0.045));
    }
    const src = audio.createBufferSource(), gain = audio.createGain();
    src.buffer = buf; gain.gain.value = 0.25;
    src.connect(gain).connect(audio.destination);
    src.start();
  } catch { /* sin audio: la foto se toma igual */ }
}

export function createCameraPhotos(rover, camera) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Centro de cada pieza, en coordenadas del rover (así sigue al rover cuando se mueve)
  rover.updateMatrixWorld(true);
  const inv = rover.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const spots = CAMERAS.map(cam => {
    const node = rover.userData.cameras?.find(o => o.name === cam.node) ?? rover.getObjectByName(cam.node);
    if (!node) { console.warn(`[fotos] no encontré la pieza ${cam.node} en el modelo`); return null; }
    const local = box.setFromObject(node).getCenter(new THREE.Vector3()).applyMatrix4(inv);
    return { ...cam, local };
  }).filter(Boolean);

  const layer = document.createElement('div');
  layer.className = 'pc-layer';
  for (const s of spots) {
    s.el = document.createElement('button');
    s.el.className = 'pc-dot';
    s.el.dataset.camera = s.key;
    s.el.setAttribute('aria-label', `${s.name}: tomar una foto`);
    s.el.innerHTML = `<span class="pc-label"><b>${s.name}</b>${s.desc}</span>`;
    s.el.addEventListener('click', e => { e.stopPropagation(); open(s.key); });
    layer.appendChild(s.el);
  }

  const viewer = document.createElement('div');
  viewer.className = 'pv';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.innerHTML = `
    <div class="pv-card">
      <button class="pv-close" aria-label="Volver al juego">×</button>
      <div class="pv-frame"><img alt=""><div class="pv-wait">revelando…</div></div>
      <div class="pv-meta"><span class="pv-cam"></span><span class="pv-when"></span><span class="pv-title"></span></div>
      <div class="pv-help"><span><kbd>clic</kbd> ampliar</span><span><kbd>←</kbd> <kbd>→</kbd> más fotos</span>
        <span><kbd>Esc</kbd> volver al juego</span><a class="pv-link" target="_blank" rel="noopener">ver en la NASA</a>
        <span class="pv-count"></span></div>
    </div>
    <div class="pv-blade top"></div><div class="pv-blade bottom"></div><div class="pv-flash"></div>`;
  document.body.append(layer, viewer);
  const $ = s => viewer.querySelector(s);
  const img = $('.pv-frame img');

  const state = { key: null, index: 0, revealed: false };
  let token = 0;

  function show(key, index) {
    const list = PHOTOS[key];
    const photo = list[(index + list.length) % list.length];
    const cam = CAMERAS.find(c => c.key === key);
    state.key = key;
    state.index = list.indexOf(photo);
    state.revealed = false;
    const my = ++token;
    // Obturador y flash
    viewer.classList.remove('snap');
    void viewer.offsetWidth;
    viewer.classList.add('snap');
    shutterSound();
    $('.pv-cam').textContent = `${cam.name} · ${photo.instrument.replaceAll('_', ' ')}`;
    $('.pv-when').textContent = `sol ${photo.sol} · ${daysAgo(photo.taken)}`;
    $('.pv-title').textContent = photo.title;
    $('.pv-link').href = photo.link;
    $('.pv-count').textContent = `${state.index + 1} / ${list.length}`;
    img.classList.remove('reveal');
    img.style.visibility = 'hidden';
    $('.pv-wait').hidden = false;
    const loaded = new Promise((ok, fail) => {
      const pre = new Image();
      pre.onload = ok;
      pre.onerror = () => fail(new Error(`no cargó ${photo.src}`));
      pre.src = photo.src;
    });
    const shut = new Promise(r => setTimeout(r, SHUTTER_MS * 0.5));
    Promise.all([loaded, shut]).then(() => {
      if (my !== token) return;
      img.src = photo.src;
      img.alt = `${cam.name}, sol ${photo.sol}: ${photo.title}`;
      img.style.visibility = '';
      $('.pv-wait').hidden = true;
      void img.offsetWidth;
      img.classList.add('reveal');
      setTimeout(() => { if (my === token) state.revealed = true; }, REVEAL_MS);
      // Deja lista la siguiente
      new Image().src = list[(state.index + 1) % list.length].src;
    }).catch(e => {
      if (my !== token) return;
      $('.pv-wait').textContent = 'No se pudo traer la foto de la NASA';
      console.error('[fotos]', e.message);
    });
  }

  function open(key) {
    viewer.hidden = false;
    viewer.classList.remove('zoom');
    layer.hidden = true;
    show(key, 0);
    $('.pv-close').focus({ preventScroll: true });
  }
  function close() {
    token++;
    viewer.hidden = true;
    viewer.classList.remove('zoom', 'snap');
    layer.hidden = false;
    state.key = null;
  }

  $('.pv-frame').addEventListener('click', () => viewer.classList.toggle('zoom'));
  $('.pv-close').addEventListener('click', close);

  // Mientras el visor está abierto, el teclado es suyo: las flechas no manejan el rover ni T oculta el panel
  addEventListener('keydown', e => {
    if (viewer.hidden) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(state.key, state.index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(state.key, state.index - 1); }
  }, { capture: true });

  // Mastcam-Z y Navcam comparten la cabeza del mástil (en el modelo están a ~10 cm): si dos puntos caen
  // a menos de MIN_GAP píxeles en pantalla, se separan para que cada uno se pueda señalar y pulsar
  const MIN_GAP = 30;
  const v = new THREE.Vector3();
  function update() {
    if (layer.hidden) return;
    for (const s of spots) {
      v.copy(s.local).applyMatrix4(rover.matrixWorld).project(camera);
      s.visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      s.x = (v.x + 1) * 0.5 * innerWidth;
      s.y = (1 - v.y) * 0.5 * innerHeight;
    }
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i], b = spots[j];
        if (!a.visible || !b.visible) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= MIN_GAP) continue;
        if (d < 1) { dx = 0; dy = 1; } else { dx /= d; dy /= d; } // encimados: el primero arriba
        const push = (MIN_GAP - Math.max(d, 1)) / 2;
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
      }
    }
    for (const s of spots) {
      s.el.hidden = !s.visible;
      if (s.visible) s.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
  }

  return { update, open, close, state, isOpen: () => !viewer.hidden };
}
